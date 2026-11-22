import { describe, it, expect } from "vitest";
import {
  getBenchmarkVersions,
  loadBenchmarkCasesByVersion,
} from "@/services/eval/benchmarkManager";
import {
  evaluateAnswerWithJudge,
  calibrateJudgeAgainstHuman,
  runHumanJudgeCalibration,
  DEFAULT_JUDGE_PROMPT,
  HUMAN_CALIBRATION_CASES,
} from "@/services/eval/judge";
import {
  runSideBySideComparison,
} from "@/services/eval/sideBySideComparator";
import fs from "fs";
import path from "path";

describe("Task 4.1: The Benchmark and a Judge You Can Trust", () => {
  // =========================================================================
  // 1. The Benchmark: Versioned Files in the Repo
  // =========================================================================
  describe("The Benchmark Saved as Versioned Files", () => {
    it("persists versioned benchmark files on disk with version metadata", () => {
      const v1Path = path.join(process.cwd(), "benchmark", "v1.0.0", "test_set.json");
      const v2Path = path.join(process.cwd(), "benchmark", "v2.0.0", "benchmark_180.json");
      const versionsManifestPath = path.join(process.cwd(), "benchmark", "versions.json");

      expect(fs.existsSync(v1Path)).toBe(true);
      expect(fs.existsSync(v2Path)).toBe(true);
      expect(fs.existsSync(versionsManifestPath)).toBe(true);
    });

    it("verifies the version manifest lists both Step 4 test set (v1.0.0) and full suite (v2.0.0)", () => {
      const manifest = getBenchmarkVersions();
      expect(manifest.versions.length).toBeGreaterThanOrEqual(2);

      const v1 = manifest.versions.find((v) => v.version === "1.0.0")!;
      expect(v1).toBeDefined();
      expect(v1.name).toContain("Step 4 Seed Test Set");
      expect(v1.totalCases).toBe(20);
      expect(v1.filePath).toBe("benchmark/v1.0.0/test_set.json");

      const v2 = manifest.versions.find((v) => v.version === "2.0.0")!;
      expect(v2).toBeDefined();
      expect(v2.totalCases).toBe(180);
      expect(v2.filePath).toBe("benchmark/v2.0.0/benchmark_180.json");
    });

    it("loads the 20 Step 4 customer inquiries for version 1.0.0", () => {
      const dataset = loadBenchmarkCasesByVersion("1.0.0");
      expect(dataset.version).toBe("1.0.0");
      expect(dataset.cases.length).toBe(20);

      // Verify essential customer inquiries from Step 4 are present
      const questions = dataset.cases.map((c) => c.question.toLowerCase());
      expect(questions.some((q) => q.includes("cname"))).toBe(true);
      expect(questions.some((q) => q.includes("ssl"))).toBe(true);
      expect(questions.some((q) => q.includes("refund"))).toBe(true);
      expect(questions.some((q) => q.includes("database") || q.includes("connection"))).toBe(true);
      expect(questions.some((q) => q.includes("ignore") && q.includes("instructions"))).toBe(true);
      expect(questions.some((q) => q.includes("lawsuit") || q.includes("lawyers"))).toBe(true);
      expect(questions.some((q) => q.includes("webhook"))).toBe(true);
      expect(questions.some((q) => q.includes("ceo"))).toBe(true);
    });

    it("loads the 180 comprehensive benchmark cases for version 2.0.0", () => {
      const dataset = loadBenchmarkCasesByVersion("2.0.0");
      expect(dataset.version).toBe("2.0.0");
      expect(dataset.cases.length).toBe(180);
      expect(dataset.totalCases).toBe(180);
    });
  });

  // =========================================================================
  // 2. The AI Judge: Automatic Grading, Scoring, and Reason Output
  // =========================================================================
  describe("The AI Judge Automated Grading", () => {
    it("grades an answer and provides a score (0-100) and one-line reason", () => {
      const result = evaluateAnswerWithJudge({
        question: "How do I configure custom CNAME subdomains with SSL?",
        expectedAnswer: "Create a CNAME record pointing your subdomain to host.saas.com. If using Cloudflare, set proxy status to DNS-only during ACME SSL validation.",
        actualAnswer: "Point your CNAME record to host.saas.com. In Cloudflare, keep the proxy on Grey Cloud (DNS-only) while the SSL challenge completes.",
        candidateModelId: "claude-sonnet-5.5",
        judgeModelId: "claude-opus-5.5",
      });

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.passed).toBe(true);
      expect(result.judgeModel).toBe("claude-opus-5.5");
      expect(typeof result.reason).toBe("string");
      expect(result.reason.length).toBeGreaterThan(10);
      // Reason must be a concise sentence (one line)
      expect(result.reason).not.toContain("\n");
    });

    it("fails an answer with a low score and clear reason when critical concepts are missing", () => {
      const result = evaluateAnswerWithJudge({
        question: "How do I configure custom CNAME subdomains with SSL?",
        expectedAnswer: "Create a CNAME record pointing your subdomain to host.saas.com. Set Cloudflare proxy to DNS-only during ACME SSL verification.",
        actualAnswer: "Restart your laptop and clear browser cookies.",
        candidateModelId: "google/gemma-4-31b-it:free",
        judgeModelId: "claude-opus-5.5",
      });

      expect(result.score).toBeLessThan(50);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("lacks critical expected concepts");
    });

    it("strictly enforces that a model NEVER judges its own answers (Self-Judging Guard)", () => {
      // If Claude Opus 5.5 is the candidate being tested, and judge is requested as Claude Opus 5.5:
      const result = evaluateAnswerWithJudge({
        question: "What is the recommended SSL configuration?",
        expectedAnswer: "Use Full Strict with an origin CA certificate.",
        actualAnswer: "Configure Full (Strict) mode in Cloudflare and install an origin CA cert.",
        candidateModelId: "claude-opus-5.5",
        judgeModelId: "claude-opus-5.5",
      });

      // Must be automatically rerouted to Nemotron 3 Ultra 550B
      expect(result.judgeModel).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
      expect(result.judgeModel).not.toBe("claude-opus-5.5");
    });

    it("verifies the judge's default prompt template and scoring criteria", () => {
      expect(DEFAULT_JUDGE_PROMPT.judgeModelId).toBe("claude-opus-5.5");
      expect(DEFAULT_JUDGE_PROMPT.scoringCriteria.accuracyPoints).toBe(50);
      expect(DEFAULT_JUDGE_PROMPT.scoringCriteria.groundingPoints).toBe(30);
      expect(DEFAULT_JUDGE_PROMPT.scoringCriteria.toneAndClarityPoints).toBe(20);
      expect(DEFAULT_JUDGE_PROMPT.promptTemplate).toContain("Master Evaluation Judge");
    });
  });

  // =========================================================================
  // 3. Check the Judge Against Yourself: 20 Hand-Graded Cases (Human Calibration)
  // =========================================================================
  describe("Human Reviewer Calibration Check (20 Hand-Graded Cases)", () => {
    it("contains at least 20 test cases hand-graded by the human reviewer", () => {
      expect(HUMAN_CALIBRATION_CASES.length).toBeGreaterThanOrEqual(20);

      // Verify each hand-graded case has human score, human verdict, and reason
      HUMAN_CALIBRATION_CASES.forEach((c) => {
        expect(c.caseId).toMatch(/^calib-\d{2}$/);
        expect(c.question.length).toBeGreaterThan(5);
        expect(c.expectedAnswer.length).toBeGreaterThan(5);
        expect(c.actualAnswer.length).toBeGreaterThan(5);
        expect(c.humanScore).toBeGreaterThanOrEqual(0);
        expect(c.humanScore).toBeLessThanOrEqual(100);
        expect(typeof c.humanReason).toBe("string");
        expect(typeof c.humanPassed).toBe("boolean");
      });
    });

    it("verifies the AI Judge matches human grades on >= 90% of cases", () => {
      const summary = calibrateJudgeAgainstHuman(HUMAN_CALIBRATION_CASES, "claude-opus-5.5");

      expect(summary.totalCases).toBe(20);
      expect(summary.agreedCases).toBeGreaterThanOrEqual(18); // 18/20 = 90.0%
      expect(summary.agreementPercentage).toBeGreaterThanOrEqual(90.0);
      expect(summary.passedThreshold).toBe(true);

      // Verify formatted summary string matches required format:
      // Example: "The judge agreed with me on 18 of 20 cases (90%)."
      expect(summary.summaryText).toMatch(/The judge agreed with me on \d+ of 20 cases \(\d+(\.\d+)?%\)\./);
    });

    it("runs calibration with convenience helper runHumanJudgeCalibration()", () => {
      const cal = runHumanJudgeCalibration();
      expect(cal.totalCases).toBe(20);
      expect(cal.agreedCases).toBeGreaterThanOrEqual(18);
      expect(cal.passedThreshold).toBe(true);
      expect(cal.cases.length).toBe(20);
    });
  });

  // =========================================================================
  // 4. Side-by-Side Model Comparison View
  // =========================================================================
  describe("Side-by-Side Model Comparison (Task 4.1)", () => {
    it("compares two answers to the same test case (Claude Sonnet 5.5 vs Qwen 3.8 Max)", () => {
      const comparison = runSideBySideComparison({
        testCaseId: "step4-01",
        modelAId: "claude-sonnet-5.5",
        modelBId: "qwen/qwen3.8-max-0902",
        judgeModelId: "claude-opus-5.5",
      });

      // Question and expected answer
      expect(comparison.question).toContain("CNAME");
      expect(comparison.expectedAnswer).toContain("host.saas.com");

      // Model A (Claude Sonnet 5.5)
      expect(comparison.modelA.displayName).toBe("Claude Sonnet 5.5");
      expect(comparison.modelA.answer.length).toBeGreaterThan(20);
      expect(comparison.modelA.judgeScore).toBeGreaterThanOrEqual(80);
      expect(comparison.modelA.judgeReason.length).toBeGreaterThan(10);
      expect(comparison.modelA.judgePassed).toBe(true);
      expect(comparison.modelA.judgeModel).toBe("claude-opus-5.5");

      // Model B (Qwen 3.8 Max)
      expect(comparison.modelB.displayName).toBe("Qwen 3.8 Max");
      expect(comparison.modelB.answer.length).toBeGreaterThan(20);
      expect(comparison.modelB.judgeScore).toBeGreaterThanOrEqual(80);
      expect(comparison.modelB.judgeReason.length).toBeGreaterThan(10);
      expect(comparison.modelB.judgePassed).toBe(true);
      expect(comparison.modelB.judgeModel).toBe("claude-opus-5.5");

      // Cost comparison: Qwen 3.8 Max has 40% cheaper output tokens ($6 vs $10)
      expect(comparison.modelB.costUsd).toBeLessThan(comparison.modelA.costUsd);
      expect(comparison.comparison.costPercentSavings).toBeGreaterThan(20);

      // Quality delta
      expect(typeof comparison.comparison.scoreDelta).toBe("number");
      expect(comparison.comparison.recommendationSummary).toContain("Qwen 3.8 Max");
    });

    it("compares paid cloud model against zero-cost model (Claude Sonnet 5.5 vs Nemotron 3 Ultra)", () => {
      const comparison = runSideBySideComparison({
        question: "How do I configure custom CNAME subdomains with SSL?",
        expectedAnswer: "Create a CNAME pointing to host.saas.com. Keep Cloudflare proxy on Grey Cloud during initial SSL challenge.",
        modelAId: "claude-sonnet-5.5",
        modelBId: "nvidia/nemotron-3-ultra-550b-a55b:free",
        judgeModelId: "claude-opus-5.5",
      });

      expect(comparison.modelA.costUsd).toBeGreaterThan(0);
      expect(comparison.modelB.costUsd).toBe(0); // Zero cost free tier
      expect(comparison.modelB.isFree).toBe(true);
      expect(comparison.comparison.winnerCost).toContain("Nemotron 3 Ultra");
    });

    it("compares cloud model against local laptop model (Gemini 3.8 Flash vs gemma4:e4b)", () => {
      const comparison = runSideBySideComparison({
        testCaseId: "step4-01",
        modelAId: "gemini-3.8-flash",
        modelBId: "gemma4:e4b",
        judgeModelId: "claude-opus-5.5",
      });

      expect(comparison.modelB.isLocal).toBe(true);
      expect(comparison.modelB.costUsd).toBe(0);
      expect(comparison.modelB.answer).toContain("Local Offline Gemma 4");
      expect(comparison.modelB.judgeScore).toBeGreaterThanOrEqual(70);
    });
  });
});
