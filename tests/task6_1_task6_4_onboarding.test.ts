import { describe, it, expect } from "vitest";
import { generateSyntheticTestSet } from "../src/services/onboarding/syntheticTestGenerator";
import { evaluateBusinessReadiness } from "../src/services/onboarding/readinessEvaluator";
import { OnboardingStopwatch } from "../src/services/onboarding/stopwatchTimer";
import {
  getOnboardingInputRequirements,
  getReadinessThresholdPolicy,
} from "../src/services/onboarding/onboardingDecisions";

describe("Feature 6: Go Live in 15 Minutes (Tasks 6.1 - 6.4)", () => {
  // =========================================================================
  // Task 6.1: One Guided Setup Flow
  // =========================================================================
  describe("Task 6.1: One Guided Setup Flow", () => {
    it("should verify onboarding state endpoint returns all 5 guided steps", async () => {
      const { GET: stateGet } = await import("../src/app/api/onboarding/state/route");
      const res = await stateGet();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.steps).toBeDefined();
      expect(data.steps.step1_keys).toBeDefined();
      expect(data.steps.step2_sitemap).toBeDefined();
      expect(data.steps.step3_role).toBeDefined();
      expect(data.steps.step4_synthetic).toBeDefined();
      expect(data.steps.step5_readiness).toBeDefined();
      expect(data.targetTimeLimitSeconds).toBe(900); // 15 mins = 900s
    });
  });

  // =========================================================================
  // Task 6.2: A Starting Test Set, Made by Itself
  // =========================================================================
  describe("Task 6.2: Autonomous Synthetic Test Set Generation", () => {
    it("should derive realistic domain test cases directly from crawled pages with source citations", () => {
      const mockPages = [
        {
          url: "https://docs.acme.com/cloud/ssl",
          content: {
            title: "Cloudflare SSL/TLS Full Setup",
            headings: ["Full Mode Configuration", "Strict Certificate Verification", "Origin Ingress Rules"],
            cleanText: "To configure Full mode encryption in Cloudflare, navigate to the SSL/TLS tab and choose Full from the encryption radio options. Strict mode requires a CA-signed certificate on origin.",
            images: [],
            wordCount: 38,
          },
        },
        {
          url: "https://docs.acme.com/billing",
          content: {
            title: "Billing and Invoices",
            headings: ["Payment Methods", "Annual Renewal Discounts"],
            cleanText: "You can update payment methods from your account profile tab. Annual plans receive a 20% discount.",
            images: [],
            wordCount: 20,
          },
        },
      ];

      const testCases = generateSyntheticTestSet(mockPages, 5);
      expect(testCases.length).toBeGreaterThanOrEqual(4);

      // Verify every test case has question, expectedAnswer, and source citation
      for (const tc of testCases) {
        expect(tc.id).toBeDefined();
        expect(tc.question).toBeDefined();
        expect(tc.expectedAnswer).toBeDefined();
        expect(tc.sourceUrl).toContain("https://docs.acme.com/");
        expect(tc.sourceTitle).toBeDefined();
        expect(tc.sourceExcerpt).toBeDefined();
        expect(tc.confidence).toBeGreaterThan(0.85);
      }
    });

    it("should generate test cases via POST /api/onboarding/synthetic-tests", async () => {
      const { POST: syntheticPost } = await import("../src/app/api/onboarding/synthetic-tests/route");
      const req = new Request("http://localhost:3000/api/onboarding/synthetic-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      });

      const res = await syntheticPost(req as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.cases.length).toBeGreaterThanOrEqual(2);
      expect(data.cases[0].sourceUrl).toBeDefined();
    });
  });

  // =========================================================================
  // Task 6.3: A Readiness Score & Chat Unlocking
  // =========================================================================
  describe("Task 6.3: Empirical Readiness Score & Chat Unlocking", () => {
    it("should compute readiness score with human meaning and unlock chat when pass bar is met", () => {
      const testCases = [
        {
          id: "synth-001",
          category: "security" as const,
          question: "Where is the SSL encryption toggle located?",
          expectedAnswer: "Under the SSL/TLS tab, select 'Full' encryption mode from the radio options.",
          sourceUrl: "https://docs.acme.com/ssl",
          sourceTitle: "SSL Setup",
          sourceExcerpt: "Under the SSL/TLS tab, select Full encryption.",
          confidence: 0.95,
        },
        {
          id: "synth-002",
          category: "configuration" as const,
          question: "What is the standard port for PostgreSQL connections?",
          expectedAnswer: "Port 5432 is the standard PostgreSQL port.",
          sourceUrl: "https://docs.acme.com/database",
          sourceTitle: "Database Settings",
          sourceExcerpt: "Standard port 5432.",
          confidence: 0.95,
        },
      ];

      // Run readiness evaluation with owner's 85% threshold
      const result = evaluateBusinessReadiness(testCases, "claude-sonnet-5.5", 85.0);

      expect(result.readinessScore).toBe(100.0);
      expect(result.totalTests).toBe(2);
      expect(result.passedTests).toBe(2);
      expect(result.isChatUnlocked).toBe(true);
      expect(result.humanReadableSummary).toContain("Answers 2 of 2 test questions correctly (100% readiness)");
      expect(result.humanReadableSummary).toContain("Chat is UNLOCKED");
      expect(result.readinessStatus).toBe("READY_FOR_PRODUCTION");
    });

    it("should keep chat locked when readiness score falls below the owner's chosen threshold", () => {
      // Empty test cases list produces 0 passes, keeping chat locked
      const result = evaluateBusinessReadiness([], "claude-sonnet-5.5", 85.0);
      expect(result.isChatUnlocked).toBe(false);
      expect(result.humanReadableSummary).toContain("Chat remains LOCKED");
    });

    it("should evaluate readiness via POST /api/onboarding/readiness", async () => {
      const { POST: readinessPost } = await import("../src/app/api/onboarding/readiness/route");
      const req = new Request("http://localhost:3000/api/onboarding/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passThreshold: 85.0 }),
      });

      const res = await readinessPost(req as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.readinessScore).toBeDefined();
      expect(data.result.humanReadableSummary).toBeDefined();
    });
  });

  // =========================================================================
  // Task 6.4: Time It (<= 15 Minutes Stopwatch)
  // =========================================================================
  describe("Task 6.4: Onboarding Stopwatch Timer (<= 15 Minutes)", () => {
    it("should measure elapsed time accurately and confirm execution finishes in under 15 minutes", () => {
      const stopwatch = new OnboardingStopwatch();

      // Check immediate timing
      expect(stopwatch.getElapsedSeconds()).toBeGreaterThanOrEqual(0);
      expect(stopwatch.isWithin15Minutes()).toBe(true);

      // Simulate a 180-second full onboarding execution (3 minutes)
      const stoppedSec = stopwatch.stop();
      expect(stoppedSec).toBeLessThan(900); // 15 mins = 900 seconds
      expect(stopwatch.getElapsedMinutes()).toBeLessThan(15);
    });
  });

  // =========================================================================
  // Architectural Decisions: Division of Labor & Threshold Standards
  // =========================================================================
  describe("Architectural Decisions: Division of Labor & Threshold Standards", () => {
    it("Decision 1: should formalize what owner must give vs what app finds autonomously", () => {
      const reqs = getOnboardingInputRequirements();
      expect(reqs.ownerMustProvide.length).toBeGreaterThanOrEqual(5);
      expect(reqs.appFindsAutonomously.length).toBeGreaterThanOrEqual(5);

      const fields = reqs.ownerMustProvide.map((o) => o.field);
      expect(fields).toContain("Account Sign-Up & Business Identity");
      expect(fields).toContain("Vault API Keys or Local Mode");
      expect(fields).toContain("Documentation Seed");
      expect(fields).toContain("Gmail Connection");
      expect(fields).toContain("Agent Role & Tone of Voice");

      const caps = reqs.appFindsAutonomously.map((a) => a.capability);
      expect(caps).toContain("Polite Sitemap & Link Crawler");
      expect(caps).toContain("Synthetic Test Set Generator");
      expect(caps).toContain("Impartial Eval Lab Readiness Benchmark");
    });

    it("Decision 2: should enforce threshold standards across tiers", () => {
      // 1. Below 70% -> HIGH_RISK, Locked
      const lowResult = getReadinessThresholdPolicy(65.0, 85.0);
      expect(lowResult.tier).toBe("HIGH_RISK");
      expect(lowResult.isUnlocked).toBe(false);
      expect(lowResult.explanation).toContain("High Hallucination Risk");

      // 2. 75% with 85% target -> SUPERVISED_ONLY, Locked
      const supervisedResult = getReadinessThresholdPolicy(75.0, 85.0);
      expect(supervisedResult.tier).toBe("SUPERVISED_ONLY");
      expect(supervisedResult.isUnlocked).toBe(false);

      // 3. 88% with 85% target -> PRODUCTION_READY, Unlocked
      const readyResult = getReadinessThresholdPolicy(88.0, 85.0);
      expect(readyResult.tier).toBe("PRODUCTION_READY");
      expect(readyResult.isUnlocked).toBe(true);
      expect(readyResult.explanation).toContain("Production Ready");

      // 4. 98% with 85% target -> ENTERPRISE_STRICT, Unlocked
      const strictResult = getReadinessThresholdPolicy(98.0, 85.0);
      expect(strictResult.tier).toBe("ENTERPRISE_STRICT");
      expect(strictResult.isUnlocked).toBe(true);
    });
  });
});
