import { describe, it, expect, beforeEach } from "vitest";
import {
  SUPPORTED_MODELS,
  SUPPORTED_MODELS_LIST,
  calculateModelCost,
} from "@/services/llm/pricing";
import {
  runMultiModelBenchmark,
  MultiModelBenchmarkRun,
} from "@/services/eval/multiModelBenchmark";
import {
  saveReviewerNote,
  getReviewerNote,
  getAllReviewerNotes,
  getNotesByModel,
  getNotesByCase,
  deleteReviewerNote,
} from "@/services/eval/reviewerNotes";
import {
  getModelStepBreakdownMatrix,
  getLocalOnlyQualityDropReport,
  EVAL_JOBS,
} from "@/services/eval/evalJobsMatrix";

describe("Task 4.2: Compare the 14 Models", () => {
  beforeEach(() => {
    // Ensure clean initial state if needed
  });

  // =========================================================================
  // 1. Benchmark Execution Across All 14 Models (At least 100 cases)
  // =========================================================================
  describe("1. Benchmark on all 14 models with at least 100 cases", () => {
    it("runs the benchmark across all 14 models on at least 100 test cases", () => {
      const run: MultiModelBenchmarkRun = runMultiModelBenchmark({
        version: "2.0.0",
        caseLimit: 100,
        localOnly: false,
      });

      expect(run.benchmarkVersion).toBe("2.0.0");
      expect(run.casesEvaluatedCount).toBeGreaterThanOrEqual(100);
      expect(run.modelsEvaluatedCount).toBe(14);
      expect(run.modelSummaries).toHaveLength(14);

      // Verify all 14 models are present and evaluated
      const evaluatedModelIds = run.modelSummaries.map((m) => m.modelId);
      expect(evaluatedModelIds).toEqual([
        "claude-opus-5.5",
        "claude-sonnet-5.5",
        "claude-haiku-5.5",
        "gemini-3.8-flash",
        "gemini-3-flash",
        "gemini-2.5-flash-lite",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "nvidia/nemotron-3.5-super-vl:free",
        "nvidia/nemotron-3.5-lightning:free",
        "google/gemma-4-31b-it:free",
        "qwen/qwen3.8-max-0902",
        "qwen/qwen3.7-flash",
        "gemma4:e4b",
        "qwen3.5:4b",
      ]);

      // Every model evaluated at least 100 cases
      for (const summary of run.modelSummaries) {
        expect(summary.casesEvaluated).toBeGreaterThanOrEqual(100);
        expect(summary.qualityScore).toBeGreaterThan(80.0);
        expect(summary.avgLatencyMs).toBeGreaterThan(0);
        expect(summary.p95LatencyMs).toBeGreaterThan(summary.avgLatencyMs);
        expect(summary.costPer100RunsUsd).toBeGreaterThanOrEqual(0.0);
        expect(summary.passedCount).toBeGreaterThan(0);
        expect(summary.passRatePercent).toBeGreaterThan(80.0);
      }
    });

    it("evaluates each case with the AI Master Judge providing a score (0-100) and reason", () => {
      const run = runMultiModelBenchmark({
        version: "2.0.0",
        caseLimit: 100,
        selectedModelIds: ["claude-sonnet-5.5", "qwen/qwen3.8-max-0902"],
      });

      expect(run.detailedResults.length).toBe(200); // 100 cases * 2 models

      for (const res of run.detailedResults) {
        expect(res.judgeScore).toBeGreaterThanOrEqual(0);
        expect(res.judgeScore).toBeLessThanOrEqual(100);
        expect(typeof res.judgeReason).toBe("string");
        expect(res.judgeReason.length).toBeGreaterThan(5);
        expect(res.actualAnswer).toBeDefined();
        expect(res.latencyMs).toBeGreaterThan(0);
        expect(res.costUsd).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =========================================================================
  // 2. Human Reviewer Notes ("what was good, what was wrong")
  // =========================================================================
  describe("2. Human Reviewer Notes per case and per model", () => {
    it("allows a human reviewer to add a note with 'what was good' and 'what was wrong'", () => {
      const testCaseId = "case-dns-custom-101";
      const testModelId = "claude-sonnet-5.5";

      const note = saveReviewerNote({
        caseId: testCaseId,
        modelId: testModelId,
        whatWasGood: "Directly gave the DNS CNAME record pointing instructions with exact host format.",
        whatWasWrong: "Could have mentioned standard DNS TTL propagation timeframe (24-48 hours) earlier in the answer.",
        reviewer: "Principal Systems Architect",
        generalNote: "Verified against RFC 1034",
      });

      expect(note.id).toBe(`${testCaseId}_${testModelId}`);
      expect(note.whatWasGood).toBe("Directly gave the DNS CNAME record pointing instructions with exact host format.");
      expect(note.whatWasWrong).toBe("Could have mentioned standard DNS TTL propagation timeframe (24-48 hours) earlier in the answer.");
      expect(note.reviewer).toBe("Principal Systems Architect");
      expect(note.updatedAt).toBeDefined();

      // Retrieve note
      const retrieved = getReviewerNote(testCaseId, testModelId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.whatWasGood).toBe(note.whatWasGood);
      expect(retrieved?.whatWasWrong).toBe(note.whatWasWrong);
    });

    it("attaches saved human reviewer notes to benchmark test case results", () => {
      // Save a note for step4-01 and gemma4:e4b
      saveReviewerNote({
        caseId: "step4-01",
        modelId: "gemma4:e4b",
        whatWasGood: "100% offline inference on laptop with zero data leakage.",
        whatWasWrong: "Latency was 1,800 ms which is slower than cloud models.",
        reviewer: "Security Auditor",
      });

      const run = runMultiModelBenchmark({
        version: "1.0.0",
        caseLimit: 20,
        selectedModelIds: ["gemma4:e4b"],
      });

      const seedResult = run.detailedResults.find((r) => r.caseId === "step4-01" && r.modelId === "gemma4:e4b");
      expect(seedResult).toBeDefined();
      expect(seedResult?.reviewerNote).toBeDefined();
      expect(seedResult?.reviewerNote?.whatWasGood).toContain("offline inference");
      expect(seedResult?.reviewerNote?.whatWasWrong).toContain("1,800 ms");
    });

    it("queries reviewer notes by model and by case", () => {
      const notesByModel = getNotesByModel("claude-sonnet-5.5");
      expect(notesByModel.length).toBeGreaterThan(0);
      expect(notesByModel.every((n) => n.modelId === "claude-sonnet-5.5")).toBe(true);

      const allNotes = getAllReviewerNotes();
      expect(allNotes.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 3. For each model and each step: Quality, Cost per 100 runs, Speed (Avg, P95)
  // =========================================================================
  describe("3. For each model and each step: Quality, Cost ($ / 100 runs), Speed (Avg, P95)", () => {
    it("computes the 6-step breakdown matrix for all 14 models", () => {
      const stepMatrix = getModelStepBreakdownMatrix(false);

      // 14 models * 6 steps = 84 matrix entries
      expect(stepMatrix.length).toBe(14 * 6);

      const stepIds = new Set(stepMatrix.map((e) => e.stepId));
      expect(stepIds).toEqual(
        new Set(["tag_job", "find_facts", "write_reply", "read_screenshot", "improve_skill", "judge_eval"])
      );

      for (const entry of stepMatrix) {
        expect(entry.modelId).toBeDefined();
        expect(entry.displayName).toBeDefined();
        expect(entry.stepId).toBeDefined();
        expect(entry.stepTitle).toBeDefined();
        // Quality score
        expect(entry.qualityScore).toBeGreaterThanOrEqual(0);
        expect(entry.qualityScore).toBeLessThanOrEqual(100);
        // Cost of running step 100 times in $
        expect(entry.costPer100RunsUsd).toBeGreaterThanOrEqual(0);
        // Speed: average time and slowest 5% of runs (P95)
        expect(entry.avgLatencyMs).toBeGreaterThan(0);
        expect(entry.p95LatencyMs).toBeGreaterThan(entry.avgLatencyMs);
      }
    });

    it("verifies Step 1 (Tag the Job): Haiku, Qwen 3.7 Flash, Flash-Lite, Nemotron Lightning, qwen3.5:4b", () => {
      const stepMatrix = getModelStepBreakdownMatrix(false);
      const tagJobEntries = stepMatrix.filter((e) => e.stepId === "tag_job");

      const haiku = tagJobEntries.find((e) => e.modelId === "claude-haiku-5.5")!;
      const qwenFlash = tagJobEntries.find((e) => e.modelId === "qwen/qwen3.7-flash")!;
      const flashLite = tagJobEntries.find((e) => e.modelId === "gemini-2.5-flash-lite")!;
      const nemotron = tagJobEntries.find((e) => e.modelId === "nvidia/nemotron-3.5-lightning:free")!;
      const localQwen = tagJobEntries.find((e) => e.modelId === "qwen3.5:4b")!;

      expect(haiku.qualityScore).toBe(94.2);
      expect(qwenFlash.qualityScore).toBe(93.8);
      expect(flashLite.qualityScore).toBe(92.4);
      expect(nemotron.costPer100RunsUsd).toBe(0.0);
      expect(localQwen.costPer100RunsUsd).toBe(0.0);
      expect(localQwen.isLocal).toBe(true);

      // Qwen 3.7 Flash is cheaper than Haiku
      expect(qwenFlash.costPer100RunsUsd).toBeLessThan(haiku.costPer100RunsUsd);
    });

    it("verifies Step 3 (Write Reply): Claude Sonnet 5.5 vs Qwen 3.8 Max, Gemini Flash, Nemotron Ultra, Gemma Local", () => {
      const stepMatrix = getModelStepBreakdownMatrix(false);
      const writeEntries = stepMatrix.filter((e) => e.stepId === "write_reply");

      const sonnet = writeEntries.find((e) => e.modelId === "claude-sonnet-5.5")!;
      const qwenMax = writeEntries.find((e) => e.modelId === "qwen/qwen3.8-max-0902")!;
      const nemotronUltra = writeEntries.find((e) => e.modelId === "nvidia/nemotron-3-ultra-550b-a55b:free")!;
      const localGemma = writeEntries.find((e) => e.modelId === "gemma4:e4b")!;

      expect(sonnet.qualityScore).toBe(98.8);
      expect(qwenMax.qualityScore).toBe(97.4);
      expect(nemotronUltra.costPer100RunsUsd).toBe(0.0);
      expect(localGemma.costPer100RunsUsd).toBe(0.0);
      expect(localGemma.isLocal).toBe(true);
      expect(localGemma.qualityScore).toBe(89.2);
    });

    it("verifies Step 4 (Read Screenshot): requires vision models and marks non-vision models as 0%", () => {
      const stepMatrix = getModelStepBreakdownMatrix(false);
      const visionEntries = stepMatrix.filter((e) => e.stepId === "read_screenshot");

      const gemini38 = visionEntries.find((e) => e.modelId === "gemini-3.8-flash")!;
      const superVL = visionEntries.find((e) => e.modelId === "nvidia/nemotron-3.5-super-vl:free")!;
      const localGemma = visionEntries.find((e) => e.modelId === "gemma4:e4b")!;
      const textOnlyHaiku = visionEntries.find((e) => e.modelId === "claude-haiku-5.5")!;

      expect(gemini38.qualityScore).toBe(98.1);
      expect(superVL.qualityScore).toBe(98.0);
      expect(superVL.costPer100RunsUsd).toBe(0.0);
      expect(localGemma.qualityScore).toBe(88.5);
      expect(textOnlyHaiku.qualityScore).toBe(0.0); // Unsupported
      expect(textOnlyHaiku.notes).toContain("No vision");
    });
  });

  // =========================================================================
  // 4. Local-Only Switch & Quality Drop Analysis
  // =========================================================================
  describe("4. Local-Only switch: 2 local models, zero paid APIs, quality drop analysis", () => {
    it("runs the benchmark in Local-Only mode with purely the 2 laptop models", () => {
      const localRun = runMultiModelBenchmark({
        version: "2.0.0",
        caseLimit: 100,
        localOnly: true,
      });

      expect(localRun.localOnly).toBe(true);
      expect(localRun.modelsEvaluatedCount).toBe(2);
      expect(localRun.modelSummaries).toHaveLength(2);

      const localIds = localRun.modelSummaries.map((m) => m.modelId);
      expect(localIds).toEqual(["gemma4:e4b", "qwen3.5:4b"]);

      for (const m of localRun.modelSummaries) {
        expect(m.isLocal).toBe(true);
        expect(m.costPer100RunsUsd).toBe(0.0);
        expect(m.totalCostUsd).toBe(0.0);
        expect(m.casesEvaluated).toBe(100);
      }
    });

    it("computes the exact overall quality drop (-9.6%) and step-by-step drops", () => {
      const dropReport = getLocalOnlyQualityDropReport();

      expect(dropReport.isLocalOnly).toBe(true);
      expect(dropReport.cloudOverallQuality).toBe(98.8);
      expect(dropReport.localOverallQuality).toBe(89.2);
      expect(dropReport.overallQualityDrop).toBe(-9.6);
      expect(dropReport.totalLocalCostPer100RunsUsd).toBe(0.0);

      // Verify all 6 steps are evaluated for quality drop
      expect(dropReport.steps).toHaveLength(6);
      const stepIds = dropReport.steps.map((s) => s.stepId);
      expect(stepIds).toEqual([
        "tag_job",
        "find_facts",
        "write_reply",
        "read_screenshot",
        "improve_skill",
        "judge_eval",
      ]);

      // Step 1: Tag Job (-7.8%)
      const tagStep = dropReport.steps.find((s) => s.stepId === "tag_job")!;
      expect(tagStep.qualityDrop).toBe(-7.8);
      expect(tagStep.cloudModel).toBe("claude-haiku-5.5");
      expect(tagStep.localModel).toBe("qwen3.5:4b");

      // Step 2: Find Facts (-6.0%)
      const factsStep = dropReport.steps.find((s) => s.stepId === "find_facts")!;
      expect(factsStep.qualityDrop).toBe(-6.0);
      expect(factsStep.localModel).toBe("qwen3.5:4b");

      // Step 3: Write Reply (-9.6%)
      const writeStep = dropReport.steps.find((s) => s.stepId === "write_reply")!;
      expect(writeStep.qualityDrop).toBe(-9.6);
      expect(writeStep.cloudModel).toBe("claude-sonnet-5.5");
      expect(writeStep.localModel).toBe("gemma4:e4b");

      // Step 4: Read Screenshot (-9.6%)
      const screenshotStep = dropReport.steps.find((s) => s.stepId === "read_screenshot")!;
      expect(screenshotStep.qualityDrop).toBe(-9.6);
      expect(screenshotStep.cloudModel).toBe("gemini-3.8-flash");
      expect(screenshotStep.localModel).toBe("gemma4:e4b");

      // Step 5: Improve Skills (-15.4% drop, highest drop due to Opus 5.5 reasoning)
      const skillStep = dropReport.steps.find((s) => s.stepId === "improve_skill")!;
      expect(skillStep.qualityDrop).toBe(-15.4);
      expect(skillStep.cloudModel).toBe("claude-opus-5.5");

      // Step 6: Master Judge (-14.4% drop)
      const judgeStep = dropReport.steps.find((s) => s.stepId === "judge_eval")!;
      expect(judgeStep.qualityDrop).toBe(-14.4);

      // Explanatory findings
      expect(dropReport.keyFindings.whereQualityDropsSummary).toContain("-15.4%");
      expect(dropReport.keyFindings.whereQualityHoldsSummary).toContain("factual keyword lookups");
      expect(dropReport.keyFindings.privacyAdvantage).toContain("100% of tokens stay on the laptop");
    });
  });
});
