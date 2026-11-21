import { describe, it, expect } from "vitest";
import { packEvalFailure } from "../src/services/self_improve/failurePacker";
import { executeOpusSelfImproveLoop } from "../src/services/self_improve/opusFixer";
import { compileWeeklyOwnerEmail } from "../src/lib/email";
import hiddenCheckSet from "../benchmark/hidden_check_set.json";

describe("Milestone 5 (Feature 5: Autonomous Self-Improvement Loop) End-to-End Suite", () => {
  // =========================================================================
  // Task 5.1: Failure Packaging & Git Branch Isolation
  // =========================================================================
  describe("Task 5.1: Failure Packaging & Git Branch Isolation", () => {
    it("should safely package failing test case and branch isolated git branch", () => {
      const failure = packEvalFailure({
        caseId: "kb-dns-042",
        question: "What IP should my A record point to for Cloudflare proxying?",
        failingAnswer: "Point your A record to 127.0.0.1",
        expectedAnswer: "Point your A record to 54.214.12.8 per Solution Center.",
        judgeCritique: "Answer cited localhost instead of standard IP 54.214.12.8.",
        activePromptVersion: "v1.2.0",
      });

      expect(failure.runId).toContain("run-");
      expect(failure.targetBranch).toContain("self-improve/fix-kb-dns-042");
      expect(failure.caseId).toBe("kb-dns-042");
      expect(failure.failingQuestion).toContain("Cloudflare proxying");
      expect(failure.expectedAnswer).toContain("54.214.12.8");
      expect(failure.activePromptVersion).toBe("v1.2.0");
    });
  });

  // =========================================================================
  // Task 5.2 & 5.3: Fix Execution, Hidden Validation & Hard Limits
  // =========================================================================
  describe("Task 5.2 & 5.3: Autonomous Opus Fix Loop & Hard Limits", () => {
    it("should execute successful Opus fix with 100% pass and zero regressions on hidden check set", async () => {
      const failure = packEvalFailure({
        caseId: "kb-dns-042",
        question: "What IP should my A record point to?",
        failingAnswer: "127.0.0.1",
        expectedAnswer: "54.214.12.8",
        judgeCritique: "Invalid IP address provided.",
      });

      const result = await executeOpusSelfImproveLoop(failure, {
        maxRounds: 5,
        maxBudgetUsd: 5.0,
      });

      expect(result.status).toBe("passed");
      expect(result.roundsExecuted).toBeLessThanOrEqual(5);
      expect(result.totalCostUsd).toBeLessThan(5.0);
      expect(result.failingCaseScoreBefore).toBe(40);
      expect(result.failingCaseScoreAfter).toBe(100);
      expect(result.hiddenCheckSetPassed).toBe(true);
      expect(result.reportMarkdown).toContain("SUCCESS");
      expect(result.branchName).toContain("self-improve/fix-kb-dns-042");
    });

    it("should safely halt and quarantine when $5.00 budget ceiling is reached without exceeding cap", async () => {
      const hardFailure = packEvalFailure({
        caseId: "kb-edge-999",
        question: "Ambiguous circular webhook question across 3 microservices",
        failingAnswer: "Ambiguous answer with incomplete routing logic",
        expectedAnswer: "Complex multi-vendor protocol requiring manual review",
        judgeCritique: "Did not resolve webhook circle within 5 rounds.",
      });

      const failedResult = await executeOpusSelfImproveLoop(hardFailure, {
        maxRounds: 5,
        maxBudgetUsd: 5.0,
        forceFailureScenario: true, // Demonstrating run 3
      });

      expect(failedResult.status).toBe("failed_limit");
      expect(failedResult.roundsExecuted).toBe(5);
      expect(failedResult.totalCostUsd).toBeLessThanOrEqual(5.0);
      expect(failedResult.failingCaseScoreAfter).toBeLessThan(80);
      expect(failedResult.reportMarkdown).toContain("FAILED (Ceiling Exceeded)");
      expect(failedResult.hiddenCheckSetPassed).toBe(false);
    });

    it("should verify hidden check set contains regression tests with zero overlap", () => {
      expect(hiddenCheckSet.cases.length).toBeGreaterThanOrEqual(3);
      for (const c of hiddenCheckSet.cases) {
        expect(c.id).toBeDefined();
        expect(c.question).toBeDefined();
        expect(c.expectedAnswer).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Task 5.4: Weekly Digest Email to Business Owner
  // =========================================================================
  describe("Task 5.4: Weekly Executive Digest Email Compilation", () => {
    it("should compile weekly report with accuracy gains, resolved failures, and monthly cost", () => {
      const email = compileWeeklyOwnerEmail({
        businessName: "Acme Corporation",
        accuracyScore: 98.4,
        accuracyDelta: 3.2,
        resolvedCount: 3,
        unresolvedCount: 1,
        monthlyCostUsd: 14.85,
        cachingSavingsUsd: 21.4,
      });

      expect(email.subject).toContain("Weekly Report for Acme Corporation");
      expect(email.htmlBody).toContain("98.4% (+3.2% gain)");
      expect(email.htmlBody).toContain("3 failing test cases fixed");
      expect(email.htmlBody).toContain("$14.85 USD");
      expect(email.htmlBody).toContain("$21.40 USD saved");
      expect(email.totalResolvedFailures).toBe(3);
    });
  });
});
