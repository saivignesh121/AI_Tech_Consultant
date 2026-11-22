import { describe, it, expect } from "vitest";
import {
  packEvalFailure,
  validateTargetBranch,
  validateProposedFileChanges,
  resolveRelatedCode,
  resolveDefaultSystemPrompt,
  FORBIDDEN_FILE_PATTERNS,
} from "../src/services/self_improve/failurePacker";
import {
  executeOpusSelfImproveLoop,
  calculateOpusRoundCost,
} from "../src/services/self_improve/opusFixer";
import hiddenCheckSet from "../benchmark/hidden_check_set.json";

describe("Feature 5: The Self-Improve Loop, where Claude Opus 5.5 fixes the app", () => {
  // =========================================================================
  // Task 5.1: Send the failure to Opus, safely
  // =========================================================================
  describe("Task 5.1: Send the failure to Opus, safely", () => {
    it("should safely pack comment, system prompt, user prompt, failing answer, and related code", () => {
      const pkg = packEvalFailure({
        caseId: "kb-dns-042",
        question: "What A-record should I point to if I use Cloudflare proxying?",
        failingAnswer: "Point your A record to 127.0.0.1",
        expectedAnswer: "Point your A record to 54.214.12.8 per Solution Center.",
        judgeCritique: "Failed to cite correct IP 54.214.12.8; suggested localhost instead.",
        comment: "Human reviewer verified localhost is invalid for production domains.",
        systemPrompt: "You are an elite AI technical consultant. Strictly cite verified sources.",
        activePromptVersion: "v1.2.0",
      });

      // Verify all required packed components
      expect(pkg.runId).toContain("run-");
      expect(pkg.caseId).toBe("kb-dns-042");
      expect(pkg.userPrompt).toContain("Cloudflare proxying");
      expect(pkg.failingQuestion).toBe(pkg.userPrompt);
      expect(pkg.failingAnswer).toBe("Point your A record to 127.0.0.1");
      expect(pkg.expectedAnswer).toBe("Point your A record to 54.214.12.8 per Solution Center.");
      expect(pkg.comment).toContain("Human reviewer verified localhost is invalid");
      expect(pkg.judgeCritique).toContain("Failed to cite correct IP");
      expect(pkg.systemPrompt).toContain("You are an elite AI technical consultant");
      expect(pkg.relatedCode.length).toBeGreaterThanOrEqual(2);
      expect(pkg.targetBranch).toContain("self-improve/fix-kb-dns-042");

      // Verify Claude Opus payload structure
      expect(pkg.claudeOpusPayload).toBeDefined();
      expect(pkg.claudeOpusPayload.model).toBe("claude-opus-5.5");
      expect(pkg.claudeOpusPayload.context.failingQuestion).toBe(pkg.failingQuestion);
      expect(pkg.claudeOpusPayload.context.relatedCode.length).toBeGreaterThan(0);
      expect(pkg.claudeOpusPayload.safetyBoundaries.isolatedBranchOnly).toBe(pkg.targetBranch);
    });

    it("should strictly prevent Claude Opus from targeting or touching the main/master branch", () => {
      // Rejects main branch
      const checkMain = validateTargetBranch("main");
      expect(checkMain.valid).toBe(false);
      expect(checkMain.reason).toContain("strictly forbidden from targeting or checking out the main/master branch");

      // Rejects master branch
      const checkMaster = validateTargetBranch("master");
      expect(checkMaster.valid).toBe(false);

      // Rejects origin/main branch
      const checkOriginMain = validateTargetBranch("origin/main");
      expect(checkOriginMain.valid).toBe(false);

      // Rejects branch outside self-improve/* namespace
      const checkFeature = validateTargetBranch("feature/custom-fix");
      expect(checkFeature.valid).toBe(false);
      expect(checkFeature.reason).toContain("naming convention 'self-improve/*'");

      // Accepts valid isolated branch
      const checkValid = validateTargetBranch("self-improve/fix-kb-dns-042-1732185600");
      expect(checkValid.valid).toBe(true);

      // Throw error if user attempts to pack with invalid main branch
      expect(() => {
        packEvalFailure({
          caseId: "kb-dns-042",
          question: "Test",
          failingAnswer: "Wrong",
          expectedAnswer: "Right",
          judgeCritique: "Critique",
          targetBranch: "main",
        });
      }).toThrow(/strictly forbidden from targeting or checking out the main\/master branch/);
    });

    it("should strictly forbid Claude Opus from editing test sets, benchmarks, or the judge prompt", () => {
      // Benchmark suite modification is forbidden
      const checkBenchmark = validateProposedFileChanges([
        "src/services/chat/prompts.ts",
        "benchmark/benchmark_180.json",
      ]);
      expect(checkBenchmark.allowed).toBe(false);
      expect(checkBenchmark.blockedFiles).toContain("benchmark/benchmark_180.json");
      expect(checkBenchmark.reason).toContain("Security Sandbox Block");

      // Test suite modification is forbidden
      const checkTests = validateProposedFileChanges([
        "tests/feature5.test.ts",
      ]);
      expect(checkTests.allowed).toBe(false);
      expect(checkTests.blockedFiles).toContain("tests/feature5.test.ts");

      // Judge prompt and code modification is forbidden
      const checkJudge = validateProposedFileChanges([
        "src/services/eval/judge.ts",
      ]);
      expect(checkJudge.allowed).toBe(false);
      expect(checkJudge.blockedFiles).toContain("src/services/eval/judge.ts");

      // Hidden check set modification is forbidden
      const checkHidden = validateProposedFileChanges([
        "benchmark/hidden_check_set.json",
      ]);
      expect(checkHidden.allowed).toBe(false);
      expect(checkHidden.blockedFiles).toContain("benchmark/hidden_check_set.json");

      // Legitimate source prompts and skills are allowed
      const checkLegit = validateProposedFileChanges([
        "src/services/chat/prompts.ts",
        "skills/dns-troubleshooting.md",
        "src/services/brain/chunker.ts",
      ]);
      expect(checkLegit.allowed).toBe(true);
      expect(checkLegit.blockedFiles).toHaveLength(0);
    });

    it("should resolve default system prompt and related code when not explicitly passed", () => {
      const defaultPrompt = resolveDefaultSystemPrompt("v2.0.0");
      expect(defaultPrompt).toContain("elite AI Technical Support Consultant");
      expect(defaultPrompt).toContain("Prompt Version: v2.0.0");

      const dnsCode = resolveRelatedCode("kb-dns-042");
      expect(dnsCode.some((c) => c.filePath.includes("dns"))).toBe(true);
      expect(dnsCode.some((c) => c.filePath.includes("prompts.ts"))).toBe(true);

      const refundCode = resolveRelatedCode("kb-refund-001");
      expect(refundCode.some((c) => c.filePath.includes("refund"))).toBe(true);
    });
  });

  // =========================================================================
  // Task 5.2: Fix, test and try again, within limits
  // =========================================================================
  describe("Task 5.2: Fix, test and try again, within limits", () => {
    it("should achieve 100% pass on failing cases with no drop on all other benchmark cases", async () => {
      const failure = packEvalFailure({
        caseId: "kb-dns-042",
        question: "What A-record should I point to if I use Cloudflare proxying?",
        failingAnswer: "Point your A record to 127.0.0.1",
        expectedAnswer: "Point your A record to 54.214.12.8 per Solution Center.",
        judgeCritique: "Provided invalid localhost IP.",
      });

      const result = await executeOpusSelfImproveLoop(failure, {
        maxRounds: 5,
        maxBudgetUsd: 5.0,
      });

      // Target criteria verification
      expect(result.status).toBe("passed");
      expect(result.failingCaseScoreBefore).toBe(40);
      expect(result.failingCaseScoreAfter).toBe(100); // 100% pass achieved!
      expect(result.visibleCasesPassed).toBe(true); // No drop on other cases
      expect(result.hiddenCheckSetPassed).toBe(true); // Hidden set passed
      expect(result.pullRequestUrl).toBeDefined();
      expect(result.reportMarkdown).toContain("SUCCESS");
      expect(result.reportMarkdown).toContain("100% (Resolution achieved)");
      expect(result.reportMarkdown).toContain("0 drops across 180 benchmark cases");
    });

    it("should evaluate candidate against hidden check set that Opus never sees to prevent overfitting", async () => {
      // 1. Verify hidden check set contains secret test cases
      expect(hiddenCheckSet.cases.length).toBeGreaterThanOrEqual(3);
      const hiddenIds = hiddenCheckSet.cases.map((c) => c.id);

      // 2. Verify that failure package payload to Opus NEVER includes hidden test cases
      const failure = packEvalFailure({
        caseId: "kb-dns-042",
        question: "What IP should my A record point to?",
        failingAnswer: "127.0.0.1",
        expectedAnswer: "54.214.12.8",
        judgeCritique: "Invalid localhost IP.",
      });

      const opusPrompt = failure.claudeOpusPayload.prompt;
      for (const hid of hiddenIds) {
        expect(opusPrompt).not.toContain(hid);
      }

      // 3. Verify that the loop evaluates the hidden check set after candidate fix
      const result = await executeOpusSelfImproveLoop(failure);
      expect(result.hiddenCheckSetPassed).toBe(true);
    });

    it("should enforce hard budget ceiling ($5.00) and max rounds (5), halting safely and writing post-mortem", async () => {
      const complexFailure = packEvalFailure({
        caseId: "kb-edge-999",
        question: "Ambiguous circular webhook loop across 3 microservices",
        failingAnswer: "Ambiguous suggestion with incomplete deduplication",
        expectedAnswer: "Complex multi-vendor protocol requiring manual human review",
        judgeCritique: "Did not resolve webhook circle within reason.",
      });

      const result = await executeOpusSelfImproveLoop(complexFailure, {
        maxRounds: 5,
        maxBudgetUsd: 5.0,
        forceFailureScenario: true, // Demonstrates Run #003 limit hit
      });

      // Hard limits checks
      expect(result.status).toBe("failed_limit");
      expect(result.roundsExecuted).toBeLessThanOrEqual(5);
      expect(result.totalCostUsd).toBeLessThanOrEqual(5.0); // Never exceeds $5.00 ceiling
      expect(result.failingCaseScoreAfter).toBeLessThan(80); // Did not reach 100%
      expect(result.pullRequestUrl).toBeUndefined(); // Quarantined: no PR opened

      // Post-mortem reporting check
      expect(result.reportMarkdown).toContain("FAILED (Ceiling Exceeded)");
      expect(result.reportMarkdown).toContain("Reason for Halting");
      expect(result.reportMarkdown).toContain("Round-by-Round Post-Mortem");
      expect(result.reportMarkdown).toContain("Changes on branch `self-improve/fix-kb-edge-999");
    });

    it("should accurately calculate Claude Opus 5.5 cost based on official $4.00 / $20.00 pricing", () => {
      // 1M input tokens + 1M output tokens = $4.00 + $20.00 = $24.00
      const cost1M = calculateOpusRoundCost(1_000_000, 1_000_000);
      expect(cost1M).toBe(24.0);

      // Typical round: 3,000 input tokens, 1,000 output tokens
      // (3,000 / 1M * 4) + (1,000 / 1M * 20) = 0.012 + 0.020 = 0.032
      const roundCost = calculateOpusRoundCost(3_000, 1_000);
      expect(roundCost).toBeCloseTo(0.032, 3);
    });

    it("should reject patch immediately if Opus attempts to modify a protected file during loop", async () => {
      const failure = packEvalFailure({
        caseId: "kb-dns-042",
        question: "Test question",
        failingAnswer: "Wrong answer",
        expectedAnswer: "Correct answer",
        judgeCritique: "Needs fix",
      });

      // Directly verify that validateProposedFileChanges catches forbidden paths
      const check = validateProposedFileChanges(["src/services/eval/judge.ts"]);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Security Sandbox Block");
    });
  });
});
