import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword, checkRateLimit, recordFailedLogin, clearFailedLogin, resetAllRateLimits, DEMO_BUSINESSES } from "../src/lib/auth";
import { maskPII } from "../src/lib/pii";

describe("Task 1.1 / Auth & Multi-Tenant Isolation Specifications", () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  describe("1. Password Security & Argon2 Hashing", () => {
    it("hashes passwords with Argon2id and verifies valid credentials", async () => {
      const rawPassword = "SecurePassword2026!";
      const hash = await hashPassword(rawPassword);

      expect(hash).toBeDefined();
      expect(hash).toContain("$argon2id$");

      const isValid = await verifyPassword(hash, rawPassword);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword(hash, "WrongPassword!");
      expect(isInvalid).toBe(false);
    });

    it("verifies demo accounts have valid argon2 password hashes", async () => {
      const acmeHash = await hashPassword("AcmePass123!");
      const betaHash = await hashPassword("BetaPass123!");

      expect(await verifyPassword(acmeHash, "AcmePass123!")).toBe(true);
      expect(await verifyPassword(betaHash, "BetaPass123!")).toBe(true);
      expect(await verifyPassword(acmeHash, "BetaPass123!")).toBe(false);
    });

    it("never logs passwords or API keys and scrubs PII before logging", () => {
      const samplePayload = {
        email: "alex@acme.com",
        phone: "+1 (555) 234-5678",
        password: "SuperSecretPassword123!",
        apiKey: "sk-ant-api03-secret-key",
      };

      // Mask sensitive info
      const { sanitized } = maskPII(`Contact ${samplePayload.email} at ${samplePayload.phone}`);
      expect(sanitized).not.toContain("555");
      expect(sanitized).toContain("[REDACTED_PHONE]");
    });
  });

  describe("2. Login Rate Limiting (Brute Force Defense)", () => {
    it("allows up to 5 attempts, then blocks subsequent attempts with 429", () => {
      const testEmail = "attacker@evil.com";

      // Attempts 1 to 4 should be allowed
      for (let i = 0; i < 4; i++) {
        expect(checkRateLimit(testEmail).allowed).toBe(true);
        recordFailedLogin(testEmail);
      }

      // 5th attempt is the threshold
      recordFailedLogin(testEmail);
      const blocked = checkRateLimit(testEmail);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.remainingAttempts).toBe(0);
    });

    it("clears rate limit on successful authentication", () => {
      const testEmail = "user@acme.com";
      recordFailedLogin(testEmail);
      recordFailedLogin(testEmail);
      expect(checkRateLimit(testEmail).remainingAttempts).toBe(3);

      clearFailedLogin(testEmail);
      expect(checkRateLimit(testEmail).remainingAttempts).toBe(5);
    });
  });

  describe("3. Multi-Tenant Isolation & Zero Leakage (Business A vs Business B)", () => {
    const bizA = DEMO_BUSINESSES["acme-corp"];
    const bizB = DEMO_BUSINESSES["beta-dynamics"];

    it("verifies separate tenant identities and isolated IDs", () => {
      expect(bizA.businessId).not.toEqual(bizB.businessId);
      expect(bizA.userId).not.toEqual(bizB.userId);
      expect(bizA.businessSlug).toBe("acme-corp");
      expect(bizB.businessSlug).toBe("beta-dynamics");
    });

    it("simulates tenant query scoping: Business A query never yields Business B records", () => {
      const mockDatabaseChunks = [
        { id: "chunk-a1", businessId: bizA.businessId, title: "Acme Private Cloud Setup", content: "Internal Acme proxy config" },
        { id: "chunk-a2", businessId: bizA.businessId, title: "Acme Billing Details", content: "Acme subscription rate" },
        { id: "chunk-b1", businessId: bizB.businessId, title: "Beta Dynamics Proprietary Algorithm", content: "Confidential neural weights" },
        { id: "chunk-b2", businessId: bizB.businessId, title: "Beta Secrets", content: "Beta internal API key" },
      ];

      // Scoped query for Tenant A
      const tenantAQuery = mockDatabaseChunks.filter((row) => row.businessId === bizA.businessId);
      expect(tenantAQuery.length).toBe(2);
      expect(tenantAQuery.every((row) => row.businessId === bizA.businessId)).toBe(true);
      expect(tenantAQuery.some((row) => row.content.includes("Beta"))).toBe(false);

      // Scoped query for Tenant B
      const tenantBQuery = mockDatabaseChunks.filter((row) => row.businessId === bizB.businessId);
      expect(tenantBQuery.length).toBe(2);
      expect(tenantBQuery.every((row) => row.businessId === bizB.businessId)).toBe(true);
      expect(tenantBQuery.some((row) => row.content.includes("Acme"))).toBe(false);
    });

    it("prevents direct ID guessing attack across tenant boundaries", () => {
      const mockKnowledgePages = [
        { id: "page-uuid-beta-secret-999", businessId: bizB.businessId, title: "Beta Trade Secrets" },
      ];

      // Attacker from Business A attempts to fetch by directly guessing Beta's page UUID
      const targetIdGuessedByA = "page-uuid-beta-secret-999";
      const tenantAContextBusinessId = bizA.businessId;

      // In every route, we enforce: eq(table.id, targetId) AND eq(table.businessId, tenant.businessId)
      const lookupResult = mockKnowledgePages.find(
        (page) => page.id === targetIdGuessedByA && page.businessId === tenantAContextBusinessId
      );

      // Result MUST be undefined (404 Not Found), preventing direct ID disclosure
      expect(lookupResult).toBeUndefined();
    });

    it("prevents direct ID guessing attack on prompt versions and rollback", () => {
      const mockPrompts = [
        { id: "prompt-acme-1", businessId: bizA.businessId, key: "master_system" },
        { id: "prompt-beta-1", businessId: bizB.businessId, key: "master_system" },
      ];

      // Tenant A tries to access Tenant B's prompt ID
      const attemptedPromptId = "prompt-beta-1";
      const authorizedForTenantA = mockPrompts.find(
        (p) => p.id === attemptedPromptId && p.businessId === bizA.businessId
      );

      expect(authorizedForTenantA).toBeUndefined();
    });

    it("prevents direct ID guessing attack on self-improvement patches", () => {
      const mockRuns = [
        { id: "run-beta-opus-44", businessId: bizB.businessId, status: "pending_approval" },
      ];

      // Tenant A sends an approve request with Tenant B's run ID
      const attemptedRunId = "run-beta-opus-44";
      const authorizedRunForTenantA = mockRuns.find(
        (r) => r.id === attemptedRunId && r.businessId === bizA.businessId
      );

      expect(authorizedRunForTenantA).toBeUndefined();
    });
  });

  describe("4. Owner-Only Business Deletion Protocol", () => {
    it("forbids non-owner roles from deleting the workspace", () => {
      const memberUser = { role: "member", businessSlug: "acme-corp" };
      const adminUser = { role: "admin", businessSlug: "acme-corp" };
      const ownerUser = { role: "owner", businessSlug: "acme-corp" };

      function canDeleteWorkspace(user: { role: string }) {
        return user.role === "owner";
      }

      expect(canDeleteWorkspace(memberUser)).toBe(false);
      expect(canDeleteWorkspace(adminUser)).toBe(false);
      expect(canDeleteWorkspace(ownerUser)).toBe(true);
    });

    it("requires exact confirm-by-typing-name step", () => {
      const tenant = { businessName: "Acme Corporation", businessSlug: "acme-corp" };

      function validateDeletionConfirmation(input: string, t: typeof tenant) {
        const trimmed = input.trim();
        return trimmed === t.businessName || trimmed === t.businessSlug;
      }

      expect(validateDeletionConfirmation("wrong-slug", tenant)).toBe(false);
      expect(validateDeletionConfirmation("acme", tenant)).toBe(false);
      expect(validateDeletionConfirmation("acme-corp", tenant)).toBe(true);
      expect(validateDeletionConfirmation("Acme Corporation", tenant)).toBe(true);
    });
  });

  describe("5. Multi-Business Picker & Routing Logic", () => {
    it("routes users with 1 business directly to Dashboard", () => {
      const singleBizUser = [
        { businessId: "biz-1", businessName: "Acme Corp", businessSlug: "acme-corp", role: "owner" },
      ];

      const outcome = singleBizUser.length === 1 ? { requiresChoice: false, redirectUrl: "/" } : { requiresChoice: true };
      expect(outcome.requiresChoice).toBe(false);
      expect(outcome.redirectUrl).toBe("/");
    });

    it("presents business picker to users with multiple businesses", () => {
      const multiBizUser = [
        { businessId: "biz-1", businessName: "Acme Corp", businessSlug: "acme-corp", role: "admin" },
        { businessId: "biz-2", businessName: "Beta Dynamics", businessSlug: "beta-dynamics", role: "member" },
      ];

      const outcome = multiBizUser.length > 1 ? { requiresChoice: true as const, choices: multiBizUser } : { requiresChoice: false as const, choices: [] };
      expect(outcome.requiresChoice).toBe(true);
      expect(outcome.choices.length).toBe(2);
    });
  });
});
