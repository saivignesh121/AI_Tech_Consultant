import { describe, it, expect } from "vitest";
import benchmarkData from "../benchmark/benchmark_180.json";
import { evaluateAnswerWithJudge, calibrateJudgeAgainstHuman, HumanCalibrationCase } from "../src/services/eval/judge";
import { runModelMatrixEvaluation } from "../src/services/eval/benchmarkRunner";
import { routeModelCall, checkHaikuEligible, compareRouterVsSonnet } from "../src/services/llm/router";
import { evaluateReleaseGate } from "../src/services/eval/releaseGate";

describe("Feature 4: The Eval Lab, Model Comparison & Cost Router", () => {
  describe("Task 4.1: Benchmark Suite & AI Judge Calibration", () => {
    it("should load the official benchmark dataset with versioning and categories", () => {
      expect(benchmarkData.version).toBe("1.0.0");
      expect(benchmarkData.cases.length).toBeGreaterThanOrEqual(10);
      expect(benchmarkData.categories.knowledge_brain_screenshots).toBe(20);
      expect(benchmarkData.categories.ask_teach_trick_injections).toBe(10);
    });

    it("should evaluate candidate answers using the AI Judge", () => {
      const result = evaluateAnswerWithJudge({
        question: "Where is the SSL encryption toggle in Cloudflare?",
        expectedAnswer: "Under the SSL/TLS tab, select 'Full' encryption mode from the radio options.",
        actualAnswer: "Navigate to the SSL/TLS tab and choose Full encryption mode.",
        candidateModelId: "claude-sonnet-5.5",
      });

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it("should prevent a model from judging its own answers", () => {
      const result = evaluateAnswerWithJudge({
        question: "Test question",
        expectedAnswer: "Expected Answer",
        actualAnswer: "Expected Answer",
        candidateModelId: "claude-opus-5.5",
        judgeModelId: "claude-opus-5.5", // Attempts self-judging
      });

      expect(result.judgeModel).not.toBe("claude-opus-5.5");
      expect(result.judgeModel).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
    });

    it("should calibrate the AI Judge against 20 human-reviewed test cases achieving >= 90% agreement", () => {
      const calibrationCases: HumanCalibrationCase[] = Array.from({ length: 20 }, (_, i) => ({
        caseId: `calib-${i + 1}`,
        question: `Troubleshooting question ${i + 1}`,
        expectedAnswer: `Expected resolution steps for case ${i + 1}`,
        actualAnswer: i < 18
          ? `Expected resolution steps for case ${i + 1}`
          : `Completely incorrect unrelated text for case ${i + 1}`,
        humanScore: i < 18 ? 95 : 10,
        humanReason: i < 18 ? "Accurate grounded steps" : "Incorrect response",
        humanPassed: i < 18,
      }));

      const calibration = calibrateJudgeAgainstHuman(calibrationCases, "claude-opus-5.5");

      expect(calibration.totalCases).toBe(20);
      expect(calibration.agreedCases).toBeGreaterThanOrEqual(18);
      expect(calibration.agreementPercentage).toBeGreaterThanOrEqual(90.0);
      expect(calibration.passedThreshold).toBe(true);
    });
  });

  describe("Task 4.2: 14-Model Performance Matrix & Local-Only Mode", () => {
    it("should compute metrics for all 14 models: quality, latency (avg, p95), and cost per 100 runs", () => {
      const matrix = runModelMatrixEvaluation(false);
      expect(matrix).toHaveLength(14);

      for (const m of matrix) {
        expect(m.qualityScore).toBeGreaterThan(80);
        expect(m.avgLatencyMs).toBeGreaterThan(0);
        expect(m.p95LatencyMs).toBeGreaterThan(m.avgLatencyMs);
        expect(m.costPer100RunsUsd).toBeGreaterThanOrEqual(0);
      }

      const opus = matrix.find((m) => m.modelId === "claude-opus-5.5");
      const sonnet = matrix.find((m) => m.modelId === "claude-sonnet-5.5");
      expect(opus?.qualityScore).toBeGreaterThanOrEqual(sonnet?.qualityScore ?? 0);
    });

    it("should support Local-Only mode restricting execution purely to laptop Ollama models", () => {
      const localMatrix = runModelMatrixEvaluation(true);
      expect(localMatrix).toHaveLength(2);

      const localIds = localMatrix.map((m) => m.modelId);
      expect(localIds).toContain("gemma4:e4b");
      expect(localIds).toContain("qwen3.5:4b");

      // Verifies zero cloud cost
      for (const m of localMatrix) {
        expect(m.costPer100RunsUsd).toBe(0.0);
      }
    });
  });

  describe("Task 4.3: Model Cost Router", () => {
    it("should enforce the Haiku 100,000 token limit rule", () => {
      expect(checkHaikuEligible(50_000)).toBe(true);
      expect(checkHaikuEligible(100_000)).toBe(true);
      expect(checkHaikuEligible(100_001)).toBe(false);
    });

    it("should route cheap low-complexity tasks to Haiku or Flash models", () => {
      const decision = routeModelCall("find_facts", "Where is the billing page?", false);
      expect(decision.selectedModelId).toBe("claude-haiku-5.5");
      expect(decision.complexity).toBe("low");
    });

    it("should route high-reasoning skill improvement to Claude Opus 5.5", () => {
      const decision = routeModelCall("improve_skill", "Synthesize feedback notes into DNS skill", false);
      expect(decision.selectedModelId).toBe("claude-opus-5.5");
    });

    it("should prove router achieves comparable quality to Sonnet 5.5 at lower total cost", () => {
      const tasks = [
        { taskType: "find_facts", prompt: "Where is settings?" },
        { taskType: "find_facts", prompt: "What is my account ID?" },
        { taskType: "read_screenshot", prompt: "Describe image screenshot layout" },
        { taskType: "write_reply", prompt: "Explain how to set up DNS with detailed architecture" },
      ];

      const comparison = compareRouterVsSonnet(tasks);
      expect(comparison.routerCostUsd).toBeLessThan(comparison.sonnetAlwaysCostUsd);
      expect(comparison.percentSaved).toBeGreaterThan(20);
      expect(comparison.routerAvgQualityScore).toBeGreaterThanOrEqual(98.0);
    });
  });

  describe("Task 4.5: Release Gate Protection", () => {
    it("should block deployment when regression is detected", () => {
      const gate = evaluateReleaseGate({
        entityType: "prompt",
        entityName: "master_system",
        previousVersionScore: 95.0,
        newVersionScore: 88.0, // Regressed by 7%
      });

      expect(gate.canRelease).toBe(false);
      expect(gate.reason).toContain("Blocked by Release Gate: Regression detected");
      expect(gate.scoreDelta).toBe(-7.0);
    });

    it("should permit deployment when score matches or improves", () => {
      const gate = evaluateReleaseGate({
        entityType: "role",
        entityName: "support-engineer",
        previousVersionScore: 92.0,
        newVersionScore: 96.5, // Improved by 4.5%
      });

      expect(gate.canRelease).toBe(true);
      expect(gate.reason).toContain("Release Gate Passed");
      expect(gate.scoreDelta).toBe(4.5);
    });
  });
});
