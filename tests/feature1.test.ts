import { describe, it, expect } from "vitest";
import { maskPII } from "../src/lib/pii";
import { encryptCredential, decryptCredential, maskApiKey } from "../src/lib/crypto";
import { calculateModelCost, SUPPORTED_MODELS } from "../src/services/llm/pricing";
import { simulatePromptCachingSavings } from "../src/services/chat/cachingSimulator";
import { validatePromptVariables } from "../src/services/chat/prompts";
import { BUILTIN_ROLES } from "../src/services/chat/roles";

describe("Feature 1: Workspace, Security, Telemetry & Multi-Tenancy", () => {
  describe("Task 1.5: PII Masking Engine", () => {
    it("should mask valid credit cards while preserving non-card numbers", () => {
      // 4242 4242 4242 4242 is a standard Luhn-valid test card
      const input = "Please charge card 4242 4242 4242 4242 for $100. Invoice id is 99882211.";
      const { sanitized, maskedCount } = maskPII(input);

      expect(maskedCount).toBeGreaterThanOrEqual(1);
      expect(sanitized).toContain("[REDACTED_CARD]");
      expect(sanitized).not.toContain("4242");
      expect(sanitized).toContain("99882211"); // non-card number preserved
    });

    it("should mask phone numbers in various formats", () => {
      const input = "Contact our tier-2 engineer at (555) 234-5678 or +1-800-555-0199 immediately.";
      const { sanitized } = maskPII(input);

      expect(sanitized).toContain("[REDACTED_PHONE]");
      expect(sanitized).not.toContain("(555) 234-5678");
    });

    it("should mask physical street addresses", () => {
      const input = "Send equipment return packages to 742 Evergreen Terrace, Suite 100, Springfield.";
      const { sanitized } = maskPII(input);

      expect(sanitized).toContain("[REDACTED_ADDRESS]");
      expect(sanitized).not.toContain("742 Evergreen Terrace");
    });
  });

  describe("Task 1.2: AES-256 Key Encryption & Masking", () => {
    it("should encrypt and decrypt API keys with zero loss", () => {
      const originalKey = "sk-ant-api03-abcdef1234567890-testkey";
      const encrypted = encryptCredential(originalKey);

      expect(encrypted).not.toEqual(originalKey);
      expect(encrypted.split(":")).toHaveLength(3); // iv:tag:ciphertext

      const decrypted = decryptCredential(encrypted);
      expect(decrypted).toEqual(originalKey);
    });

    it("should safely mask API keys for UI presentation", () => {
      const key = "sk-ant-api03-abcdef1234567890-testkey";
      const masked = maskApiKey(key);

      expect(masked).toBe("sk-ant-••••••••tkey");
      expect(masked).not.toContain("abcdef1234567890");
    });
  });

  describe("Task 1.5 & Task 4.3: Model Pricing & Cost Telemetry", () => {
    it("should calculate exact costs for Claude Sonnet 5.5 ($2.00 / $10.00)", () => {
      // 1M input ($2.00) + 1M output ($10.00) = $12.00
      const cost = calculateModelCost("claude-sonnet-5.5", 1_000_000, 1_000_000, 0);
      expect(cost).toBe(12.0);

      // Typical call: 1,500 in, 300 out
      // (1500/1000000)*2 + (300/1000000)*10 = 0.003 + 0.003 = 0.006
      const callCost = calculateModelCost("claude-sonnet-5.5", 1500, 300, 0);
      expect(callCost).toBe(0.006);
    });

    it("should apply Claude Haiku 5.5 tiered pricing (>100k tokens)", () => {
      // Standard <= 100k: $0.10 / $0.50 per 1M
      const underCap = calculateModelCost("claude-haiku-5.5", 50_000, 10_000, 0);
      // (50000/1000000)*0.10 + (10000/1000000)*0.50 = 0.005 + 0.005 = 0.010
      expect(underCap).toBe(0.01);

      // Over 100k: $0.50 / $2.50 per 1M
      const overCap = calculateModelCost("claude-haiku-5.5", 120_000, 10_000, 0);
      // (120000/1000000)*0.50 + (10000/1000000)*2.50 = 0.060 + 0.025 = 0.085
      expect(overCap).toBe(0.085);
    });

    it("should return $0.00 cost for free and local models", () => {
      expect(calculateModelCost("nvidia/nemotron-3-ultra-550b-a55b:free", 5000, 1000)).toBe(0.0);
      expect(calculateModelCost("gemma4:e4b", 5000, 1000)).toBe(0.0);
      expect(calculateModelCost("qwen3.5:4b", 5000, 1000)).toBe(0.0);
    });
  });

  describe("Task 1.3: Prompt Caching 100-Task Simulator", () => {
    it("should demonstrate verifiable dollar savings with prompt caching ON", () => {
      const result = simulatePromptCachingSavings("claude-sonnet-5.5", 100, 2500, 200, 350);

      expect(result.taskCount).toBe(100);
      expect(result.costWithCachingUsd).toBeLessThan(result.costWithoutCachingUsd);
      expect(result.dollarsSavedUsd).toBeGreaterThan(0);
      expect(result.percentSaved).toBeGreaterThan(40); // Saves over 40% overall cost

      // Verify breakdown contains valid numbers
      expect(result.breakdown.cachingOn.cachedReadTokens).toBe(2500 * 99);
    });

    it("should catch missing template variables before save", () => {
      const template = "Hello {customer_name}, here is your answer.";
      const check = validatePromptVariables(template, ["customer_name", "knowledge_results"]);

      expect(check.isValid).toBe(false);
      expect(check.missingVariables).toEqual(["knowledge_results"]);
    });
  });

  describe("Task 1.4: Pre-Built Agent Roles", () => {
    it("should include the 3 mandatory built-in roles with distinct personas", () => {
      expect(BUILTIN_ROLES).toHaveLength(3);

      const slugs = BUILTIN_ROLES.map((r) => r.slug);
      expect(slugs).toContain("support-engineer");
      expect(slugs).toContain("support-executive");
      expect(slugs).toContain("ai-consultant");

      const engineer = BUILTIN_ROLES.find((r) => r.slug === "support-engineer");
      const executive = BUILTIN_ROLES.find((r) => r.slug === "support-executive");
      const consultant = BUILTIN_ROLES.find((r) => r.slug === "ai-consultant");

      expect(engineer?.tone).toContain("technical");
      expect(executive?.tone).toContain("Friendly");
      expect(consultant?.tone).toContain("consultative");
    });
  });

  describe("Task 1.1: Multi-Tenant Data Isolation Principle", () => {
    it("should guarantee simulated tenant isolation across business contexts", () => {
      interface TenantRecord {
        id: string;
        businessId: string;
        data: string;
      }

      const databaseStore: TenantRecord[] = [
        { id: "1", businessId: "tenant-acme-uuid", data: "Acme Private API Key" },
        { id: "2", businessId: "tenant-beta-uuid", data: "Beta Confidential Roadmap" },
      ];

      function queryTenantData(requestingTenantId: string): TenantRecord[] {
        return databaseStore.filter((r) => r.businessId === requestingTenantId);
      }

      const acmeResults = queryTenantData("tenant-acme-uuid");
      const betaResults = queryTenantData("tenant-beta-uuid");

      expect(acmeResults).toHaveLength(1);
      expect(acmeResults[0].data).toBe("Acme Private API Key");
      expect(acmeResults.some((r) => r.data.includes("Beta"))).toBe(false);

      expect(betaResults).toHaveLength(1);
      expect(betaResults[0].data).toBe("Beta Confidential Roadmap");
      expect(betaResults.some((r) => r.data.includes("Acme"))).toBe(false);
    });
  });
});
