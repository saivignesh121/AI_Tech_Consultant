import { describe, it, expect } from "vitest";
import benchmarkData from "../benchmark/benchmark_180.json";
import { runModelMatrixEvaluation } from "../src/services/eval/benchmarkRunner";
import { runHumanJudgeCalibration } from "../src/services/eval/judge";
import { simulateRouterComparison, routeModelCall, checkHaikuEligible, tagTaskComplexity } from "../src/services/llm/router";
import { evaluateReleaseGate } from "../src/services/eval/releaseGate";

describe("Milestone 4 (Feature 4: The Eval Lab) End-to-End Suite", () => {
  // =========================================================================
  // Task 4.1: Benchmark Suite (180 Tests)
  // =========================================================================
  describe("Task 4.1: Benchmark Suite Verification", () => {
    it("should load exactly 180 curated test cases across mandatory categories", () => {
      const cases = ((benchmarkData as any).cases || benchmarkData) as Array<{ id: string; category: string; question: string }>;
      expect(cases.length).toBe(180);

      const categories = new Set(cases.map((c) => c.category));
      expect(categories.has("Knowledge Brain (Help Pages)")).toBe(true);
      expect(categories.has("Ask & Teach Chat")).toBe(true);
      expect(categories.has("Escalations & Safety")).toBe(true);
    });
  });

  // =========================================================================
  // Task 4.2: 14-Model Comparison Matrix & AI Judge
  // =========================================================================
  describe("Task 4.2: 14-Model Matrix & Human Judge Calibration", () => {
    it("should evaluate all 14 models with latency, quality, and cost per 100 runs", () => {
      const matrix = runModelMatrixEvaluation(false);
      expect(matrix.length).toBe(14);

      for (const m of matrix) {
        expect(m.qualityScore).toBeGreaterThan(80);
        expect(m.avgLatencyMs).toBeGreaterThan(0);
        expect(m.p95LatencyMs).toBeGreaterThan(m.avgLatencyMs);
        expect(m.costPer100RunsUsd).toBeGreaterThanOrEqual(0);
      }
    });

    it("should filter to only local models when localOnly mode is active", () => {
      const localMatrix = runModelMatrixEvaluation(true);
      expect(localMatrix.length).toBe(2);
      expect(localMatrix.every((m) => m.isLocal)).toBe(true);
    });

    it("should achieve >= 85% human judge calibration agreement rate", () => {
      const calibration = runHumanJudgeCalibration();
      expect(calibration.totalCases).toBe(20);
      expect(calibration.agreementRatePercent).toBeGreaterThanOrEqual(85);
      expect(calibration.agreedCases).toBeGreaterThanOrEqual(17);
    });
  });

  // =========================================================================
  // Task 4.3: 3-Tier Model Cost Router (Proves 38.4% Cost Reduction)
  // =========================================================================
  describe("Task 4.3: 3-Tier Model Cost Router", () => {
    it("should enforce Haiku 100k cap rule (prompts > 100k never routed to Haiku)", () => {
      expect(checkHaikuEligible(50_000)).toBe(true);
      expect(checkHaikuEligible(100_000)).toBe(true);
      expect(checkHaikuEligible(100_001)).toBe(false);
      expect(checkHaikuEligible(250_000)).toBe(false);
    });

    it("should classify task complexity and tag task types accurately", () => {
      const low = tagTaskComplexity("find_facts", "What is DNS?");
      expect(low.complexity).toBe("low");

      const high = tagTaskComplexity("improve_skill", "Refine rule protocol");
      expect(high.complexity).toBe("high");
    });

    it("should prove 38.4% cost savings over Sonnet 5.5 baseline at equal quality", () => {
      const result = simulateRouterComparison(100);

      expect(result.totalTasks).toBe(100);
      expect(result.routerCostUsd).toBeLessThan(result.sonnetAlwaysCostUsd);
      expect(result.dollarsSavedUsd).toBeGreaterThan(0);
      expect(result.percentSaved).toBeCloseTo(38.4, 0); // ~38.4% reduction
      // Quality parity proof
      expect(result.routerAvgQualityScore).toBeGreaterThanOrEqual(98.0);
    });
  });

  // =========================================================================
  // Task 4.4: Release Gate Blocking Rule
  // =========================================================================
  describe("Task 4.4: Release Gate Blocking Enforcer", () => {
    it("should allow release when candidate score exceeds active baseline", () => {
      const gate = evaluateReleaseGate("prompt", "master_system", 98.8, 96.0);
      expect(gate.allowed).toBe(true);
      expect(gate.status).toBe("PASSED");
    });

    it("should block release when candidate score drops below active baseline", () => {
      const gate = evaluateReleaseGate("prompt", "master_system", 94.0, 96.0);
      expect(gate.allowed).toBe(false);
      expect(gate.status).toBe("BLOCKED");
      expect(gate.reason).toContain("Score drop");
    });
  });
});
