import { describe, it, expect } from "vitest";
import {
  SUPPORTED_MODELS,
  SUPPORTED_MODELS_LIST,
  FREE_MODEL_FALLBACKS,
  calculateExactModelCost,
  getModelDownloadSize,
} from "@/services/llm/pricing";
import {
  EVAL_JOBS,
  evaluateJobSuitability,
  getAllEvalJobsEvaluations,
} from "@/services/eval/evalJobsMatrix";
import {
  checkPrivacyBoundary,
  executeLocalModelInference,
  checkOllamaStatus,
  LOCAL_MODELS_CATALOG,
} from "@/services/llm/ollamaClient";
import {
  getHumanJudgeCalibrationResults,
  runModelMatrixEvaluation,
} from "@/services/eval/benchmarkRunner";

describe("Feature 4: The Eval Lab — 14 Models, 6 Eval Jobs & Laptop Local Models", () => {
  // =========================================================================
  // 1. Exact 14-Model Pricing & Specifications (Checked 12 Nov 2026)
  // =========================================================================
  describe("14 Models & Exact Pricing Table (12 Nov 2026 Rates)", () => {
    it("configures exactly the 14 specified models without additions or omissions", () => {
      expect(SUPPORTED_MODELS_LIST.length).toBe(14);
      const modelIds = SUPPORTED_MODELS_LIST.map((m) => m.id);

      expect(modelIds).toEqual([
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
    });

    it("verifies exact input and output rates per 1M tokens", () => {
      // 1. Claude Opus 5.5 ($4.00 / $20.00)
      const opus = SUPPORTED_MODELS["claude-opus-5.5"];
      expect(opus.inputPer1M).toBe(4.0);
      expect(opus.outputPer1M).toBe(20.0);

      // 2. Claude Sonnet 5.5 ($2.00 / $10.00)
      const sonnet = SUPPORTED_MODELS["claude-sonnet-5.5"];
      expect(sonnet.inputPer1M).toBe(2.0);
      expect(sonnet.outputPer1M).toBe(10.0);

      // 3. Claude Haiku 5.5 ($0.10 / $0.50 <=100k, $0.50 / $2.50 >100k)
      const haiku = SUPPORTED_MODELS["claude-haiku-5.5"];
      expect(haiku.inputPer1M).toBe(0.1);
      expect(haiku.outputPer1M).toBe(0.5);
      // Cost calculation with tier threshold (<=100k vs >100k)
      const haikuCostSmall = calculateExactModelCost("claude-haiku-5.5", 50000, 1000);
      const haikuCostLarge = calculateExactModelCost("claude-haiku-5.5", 150000, 1000);
      expect(haikuCostSmall).toBeCloseTo((50000 * 0.1 + 1000 * 0.5) / 1000000, 6);
      expect(haikuCostLarge).toBeCloseTo((150000 * 0.5 + 1000 * 2.5) / 1000000, 6);

      // 4. Gemini 3.8 Flash ($0.75 / $3.75 intro price; rises to $1.50 / $7.50 on 1 Jan 2027)
      const g38 = SUPPORTED_MODELS["gemini-3.8-flash"];
      expect(g38.inputPer1M).toBe(0.75);
      expect(g38.outputPer1M).toBe(3.75);

      // 5. Gemini 3 Flash ($0.50 / $3.00)
      const g3 = SUPPORTED_MODELS["gemini-3-flash"];
      expect(g3.inputPer1M).toBe(0.5);
      expect(g3.outputPer1M).toBe(3.0);

      // 6. Gemini 2.5 Flash-Lite ($0.10 / $0.40)
      const gLite = SUPPORTED_MODELS["gemini-2.5-flash-lite"];
      expect(gLite.inputPer1M).toBe(0.1);
      expect(gLite.outputPer1M).toBe(0.4);

      // 7-10. OpenRouter Free Tier ($0.00 / $0.00)
      const freeModels = [
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "nvidia/nemotron-3.5-super-vl:free",
        "nvidia/nemotron-3.5-lightning:free",
        "google/gemma-4-31b-it:free",
      ];
      freeModels.forEach((id) => {
        const m = SUPPORTED_MODELS[id];
        expect(m.inputPer1M).toBe(0);
        expect(m.outputPer1M).toBe(0);
      });

      // 11. Qwen 3.8 Max ($2.00 / $6.00)
      const qMax = SUPPORTED_MODELS["qwen/qwen3.8-max-0902"];
      expect(qMax.inputPer1M).toBe(2.0);
      expect(qMax.outputPer1M).toBe(6.0);

      // 12. Qwen 3.7 Flash ($0.03 / $0.13 <=32k)
      const qFlash = SUPPORTED_MODELS["qwen/qwen3.7-flash"];
      expect(qFlash.inputPer1M).toBe(0.03);
      expect(qFlash.outputPer1M).toBe(0.13);

      // 13-14. Laptop Local Ollama Models ($0.00 / $0.00)
      const localGemma = SUPPORTED_MODELS["gemma4:e4b"];
      const localQwen = SUPPORTED_MODELS["qwen3.5:4b"];
      expect(localGemma.isLocal).toBe(true);
      expect(localGemma.inputPer1M).toBe(0);
      expect(localQwen.isLocal).toBe(true);
      expect(localQwen.inputPer1M).toBe(0);
    });

    it("verifies accurate download sizes for laptop local models", () => {
      expect(getModelDownloadSize("gemma4:e4b")).toBe("7–10 GB");
      expect(getModelDownloadSize("qwen3.5:4b")).toBe("3–4 GB");
      expect(getModelDownloadSize("claude-sonnet-5.5")).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. OpenRouter Free Tier Fallback Resilience
  // =========================================================================
  describe("OpenRouter Free Model Fallbacks", () => {
    it("ensures each free model has 2 to 3 fallback models configured", () => {
      const freeModels = [
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "nvidia/nemotron-3.5-super-vl:free",
        "nvidia/nemotron-3.5-lightning:free",
        "google/gemma-4-31b-it:free",
      ];

      freeModels.forEach((id) => {
        const fallbacks = FREE_MODEL_FALLBACKS[id];
        expect(fallbacks).toBeDefined();
        expect(fallbacks.length).toBeGreaterThanOrEqual(2);
        expect(fallbacks.length).toBeLessThanOrEqual(3);

        // Verify fallback model IDs exist in supported models
        fallbacks.forEach((fbId) => {
          expect(SUPPORTED_MODELS[fbId]).toBeDefined();
        });
      });
    });

    it("verifies vision fallback for Nemotron 3.5 Super VL includes visual models", () => {
      const vlFallbacks = FREE_MODEL_FALLBACKS["nvidia/nemotron-3.5-super-vl:free"];
      expect(vlFallbacks).toContain("gemini-3.8-flash");
      expect(vlFallbacks).toContain("gemma4:e4b");
    });
  });

  // =========================================================================
  // 3. The 6 Eval Jobs Suitability & Winner Scorecards
  // =========================================================================
  describe("The 6 Eval Jobs Suitability Analysis", () => {
    it("evaluates all 6 required eval jobs", () => {
      const allJobs = getAllEvalJobsEvaluations();
      expect(allJobs.length).toBe(6);

      const jobIds = allJobs.map((j) => j.jobId);
      expect(jobIds).toEqual([
        "tag_job",
        "find_facts",
        "write_reply",
        "read_screenshot",
        "improve_skill",
        "judge_eval",
      ]);
    });

    it("Job 1 (tag_job): compares Haiku, Qwen 3.7 Flash, Flash-Lite, Nemotron Lightning, qwen3.5:4b", () => {
      const [evalResult] = evaluateJobSuitability("tag_job");
      const candidateIds = evalResult.candidates.map((c) => c.modelId);

      expect(candidateIds).toContain("claude-haiku-5.5");
      expect(candidateIds).toContain("qwen/qwen3.7-flash");
      expect(candidateIds).toContain("gemini-2.5-flash-lite");
      expect(candidateIds).toContain("nvidia/nemotron-3.5-lightning:free");
      expect(candidateIds).toContain("qwen3.5:4b");

      // Verifies scorecards
      expect(evalResult.bestQualityModelId).toBe("claude-haiku-5.5");
      expect(evalResult.bestBudgetModelId).toMatch(/nemotron-3.5-lightning|qwen3.5:4b/);
      expect(evalResult.recommendedModelId).toBe("claude-haiku-5.5");
      expect(evalResult.tradeOffAnalysis).toContain("72% cheaper");
    });

    it("Job 2 (find_facts): compares Haiku, Flash-Lite, qwen3.5:4b", () => {
      const [evalResult] = evaluateJobSuitability("find_facts");
      const candidateIds = evalResult.candidates.map((c) => c.modelId);

      expect(candidateIds).toContain("claude-haiku-5.5");
      expect(candidateIds).toContain("gemini-2.5-flash-lite");
      expect(candidateIds).toContain("qwen3.5:4b");

      expect(evalResult.fastestModelId).toBe("gemini-2.5-flash-lite");
      expect(evalResult.candidates.find((c) => c.modelId === "qwen3.5:4b")?.isLocal).toBe(true);
    });

    it("Job 3 (write_reply): compares Sonnet, Qwen 3.8 Max, Gemini 3.8 Flash, Gemini 3 Flash, Nemotron 3 Ultra, Gemma 4 31B, gemma4:e4b", () => {
      const [evalResult] = evaluateJobSuitability("write_reply");
      const candidateIds = evalResult.candidates.map((c) => c.modelId);

      expect(candidateIds).toContain("claude-sonnet-5.5");
      expect(candidateIds).toContain("qwen/qwen3.8-max-0902");
      expect(candidateIds).toContain("gemini-3.8-flash");
      expect(candidateIds).toContain("gemini-3-flash");
      expect(candidateIds).toContain("nvidia/nemotron-3-ultra-550b-a55b:free");
      expect(candidateIds).toContain("google/gemma-4-31b-it:free");
      expect(candidateIds).toContain("gemma4:e4b");

      expect(evalResult.bestQualityModelId).toBe("claude-sonnet-5.5");
      expect(evalResult.bestBudgetModelId).toMatch(/nemotron-3-ultra|gemma/);
      expect(evalResult.tradeOffAnalysis).toContain("Qwen 3.8 Max");
    });

    it("Job 4 (read_screenshot): compares Gemini 3.8 Flash, Gemini 3 Flash, Nemotron Super VL, gemma4:e4b", () => {
      const [evalResult] = evaluateJobSuitability("read_screenshot");
      const candidateIds = evalResult.candidates.map((c) => c.modelId);

      expect(candidateIds).toContain("gemini-3.8-flash");
      expect(candidateIds).toContain("gemini-3-flash");
      expect(candidateIds).toContain("nvidia/nemotron-3.5-super-vl:free");
      expect(candidateIds).toContain("gemma4:e4b");

      expect(evalResult.bestQualityModelId).toBe("gemini-3.8-flash");
      expect(evalResult.tradeOffAnalysis).toContain("diagram & OCR");
    });

    it("Job 5 (improve_skill): compares only Claude Opus 5.5", () => {
      const [evalResult] = evaluateJobSuitability("improve_skill");
      const candidateIds = evalResult.candidates.map((c) => c.modelId);

      expect(candidateIds).toEqual(["claude-opus-5.5"]);
      expect(evalResult.recommendedModelId).toBe("claude-opus-5.5");
      expect(evalResult.bestQualityModelId).toBe("claude-opus-5.5");
    });

    it("Job 6 (judge_eval): verifies master judge and enforces no self-judging", () => {
      const [evalResult] = evaluateJobSuitability("judge_eval");
      const candidateIds = evalResult.candidates.map((c) => c.modelId);

      expect(candidateIds).toContain("claude-opus-5.5");
      expect(candidateIds).toContain("nvidia/nemotron-3-ultra-550b-a55b:free");

      expect(evalResult.recommendedModelId).toBe("claude-opus-5.5");
      // Self-judging rule verification
      expect(evalResult.tradeOffAnalysis).toContain("never judges its own answers");
    });
  });

  // =========================================================================
  // 4. Laptop Local Models (Ollama) & Privacy Boundary
  // =========================================================================
  describe("Laptop Local Models & Privacy Boundary Guarantee", () => {
    it("manages the 2 local Ollama models in catalog", () => {
      expect(LOCAL_MODELS_CATALOG.length).toBe(2);

      const gemma = LOCAL_MODELS_CATALOG.find((m) => m.id === "gemma4:e4b")!;
      expect(gemma.downloadSizeGB).toBe("~7–10 GB");
      expect(gemma.pullCommand).toBe("ollama pull gemma4:e4b");
      expect(gemma.removeCommand).toBe("ollama rm gemma4:e4b");

      const qwen = LOCAL_MODELS_CATALOG.find((m) => m.id === "qwen3.5:4b")!;
      expect(qwen.downloadSizeGB).toBe("~3–4 GB");
      expect(qwen.pullCommand).toBe("ollama pull qwen3.5:4b");
      expect(qwen.removeCommand).toBe("ollama rm qwen3.5:4b");
    });

    it("blocks real customer PII from free cloud tiers and redirects to local Ollama", () => {
      // Synthetic benchmark on free tier is allowed
      const syntheticCheck = checkPrivacyBoundary(
        "nvidia/nemotron-3.5-lightning:free",
        true, // isSyntheticBenchmark
        false // containsPii
      );
      expect(syntheticCheck.allowed).toBe(true);

      // Real customer email or PII on free tier is strictly blocked
      const piiCheck = checkPrivacyBoundary(
        "nvidia/nemotron-3.5-lightning:free",
        false, // isSyntheticBenchmark (real email)
        true // containsPii
      );
      expect(piiCheck.allowed).toBe(false);
      expect(piiCheck.recommendedTarget).toMatch(/qwen3.5:4b|gemma4:e4b/);
      expect(piiCheck.reason).toContain("cannot be processed on free cloud tiers");
    });

    it("executes local on-device inference with zero cloud cost ($0.000000)", async () => {
      const result = await executeLocalModelInference(
        "gemma4:e4b",
        "Explain DNS CNAME configuration offline."
      );

      expect(result.isLocal).toBe(true);
      expect(result.costUsd).toBe(0);
      expect(result.privacyStatus).toContain("AIR-GAPPED LOCAL ZERO-LEAKAGE");
      expect(result.answer).toContain("Local Model Gemma 4 (e4b)");
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    it("checks Ollama daemon status at http://localhost:11434", async () => {
      const status = await checkOllamaStatus();
      expect(status.endpoint).toBe("http://localhost:11434");
      expect(status.privacyGuarantee).toContain("zero tokens leave your machine");
      expect(status.recommendedModels.length).toBe(2);
    });
  });

  // =========================================================================
  // 5. AI Judge Calibration (>= 90% Human Agreement)
  // =========================================================================
  describe("AI Judge 20-Case Calibration Protocol", () => {
    it("achieves at least 90% agreement against 20 human-graded test cases", () => {
      const calibration = getHumanJudgeCalibrationResults();

      expect(calibration.totalCases).toBe(20);
      expect(calibration.agreedCases).toBeGreaterThanOrEqual(18); // 18/20 = 90%
      expect(calibration.agreementRatePercent).toBeGreaterThanOrEqual(90);

      // Verify structure of calibration cases
      calibration.cases.forEach((c) => {
        expect(c.caseId).toBeDefined();
        expect(c.question).toBeDefined();
        expect(c.humanGrade).toBeGreaterThanOrEqual(0);
        expect(c.humanGrade).toBeLessThanOrEqual(100);
        expect(c.aiJudgeGrade).toBeGreaterThanOrEqual(0);
        expect(c.aiJudgeGrade).toBeLessThanOrEqual(100);
      });
    });
  });
});
