import { describe, it, expect } from "vitest";
import { packEvalFailure } from "../src/services/self_improve/failurePacker";
import { executeOpusSelfImproveLoop } from "../src/services/self_improve/opusFixer";
import { compileWeeklyOwnerEmail } from "../src/lib/email";
import hiddenCheckSet from "../benchmark/hidden_check_set.json";

describe("Feature 5: The Autonomous Self-Improvement Loop", () => {
  describe("Task 5.1: Failure Packaging & Branch Isolation", () => {
    it("should safely pack failing case details onto an isolated git branch", () => {
      const pkg = packEvalFailure({
        caseId: "kb-dns-042",
        question: "What IP should my A record point to for Cloudflare proxying?",
        failingAnswer: "Point your A record to 127.0.0.1",
        expectedAnswer: "Point your A record to 54.214.12.8 per Solution Center.",
        judgeCritique: "Failed to cite correct IP.",
        activePromptVersion: "v1.2.0",
      });

      expect(pkg.runId).toContain("run-");
      expect(pkg.targetBranch).toContain("self-improve/fix-kb-dns-042");
      expect(pkg.failingQuestion).toContain("Cloudflare proxying");
      expect(pkg.expectedAnswer).toContain("54.214.12.8");
    });
  });

  describe("Task 5.2 & 5.3: Fix Execution, Hidden Validation & Hard Limits", () => {
    it("should verify successful run with 100% pass and zero regressions on hidden check set", async () => {
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
      expect(result.pullRequestUrl).toBeDefined();
      expect(result.reportMarkdown).toContain("SUCCESS");
    });

    it("should safely halt and quarantine when budget limit is hit without exceeding ceiling", async () => {
      const hardFailure = packEvalFailure({
        caseId: "kb-edge-999",
        question: "Ambiguous circular webhook question",
        failingAnswer: "Ambiguous answer",
        expectedAnswer: "Complex multi-vendor protocol",
        judgeCritique: "Did not resolve webhook circle.",
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
    });
  });

  describe("Task 5.4: Weekly Digest Email to Business Owner", () => {
    it("should compile weekly report with accuracy improvements, resolved failures, and monthly cost", () => {
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
    });
  });
});
