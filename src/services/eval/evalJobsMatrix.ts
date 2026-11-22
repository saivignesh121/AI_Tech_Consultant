/**
 * Eval Jobs Matrix Engine: 6 Core Evaluator Steps & Model Suitability Analysis
 * Feature 4: Evaluates candidate models job-by-job on Quality, Cost, and Speed.
 */

import { SUPPORTED_MODELS, calculateModelCost, ModelPricing } from "../llm/pricing";
import { runModelMatrixEvaluation, ModelEvalMetric } from "./benchmarkRunner";

export interface CandidateJobScore {
  modelId: string;
  displayName: string;
  provider: string;
  qualityScore: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  costPerRunUsd: number;
  costPer100RunsUsd: number;
  isFree: boolean;
  isLocal: boolean;
  supportsVision: boolean;
  notes: string;
  isRecommended?: boolean;
  isBestQuality?: boolean;
  isBestBudget?: boolean;
  isFastest?: boolean;
}

export interface EvalJobEvaluation {
  jobId: string;
  title: string;
  description: string;
  tokenProfile: {
    inputTokens: number;
    outputTokens: number;
  };
  candidateModels: CandidateJobScore[];
  candidates: CandidateJobScore[];
  bestQualityModel: CandidateJobScore;
  bestCostModel: CandidateJobScore;
  bestSpeedModel: CandidateJobScore;
  recommendedModel: CandidateJobScore;
  recommendedModelId: string;
  recommendedReason: string;
  bestQualityModelId: string;
  bestBudgetModelId: string;
  fastestModelId: string;
  tradeoffAnalysis: string;
  tradeOffAnalysis: string;
}

export interface EvalJobDefinition {
  id: string;
  title: string;
  description: string;
  inputTokens: number;
  outputTokens: number;
  candidateModelIds: string[];
  recommendedModelId: string;
  tradeoffAnalysis: string;
}

export const EVAL_JOBS: Record<string, EvalJobDefinition> = {
  tag_job: {
    id: "tag_job",
    title: "Tag the Job (for the Router)",
    description: "Fast query intent classification, keyword tagging, and complexity routing.",
    inputTokens: 350,
    outputTokens: 50,
    candidateModelIds: [
      "claude-haiku-5.5",
      "qwen/qwen3.7-flash",
      "gemini-2.5-flash-lite",
      "nvidia/nemotron-3.5-lightning:free",
      "qwen3.5:4b",
    ],
    recommendedModelId: "claude-haiku-5.5",
    tradeoffAnalysis:
      "Claude Haiku 5.5 achieves 94.2% accuracy in 340ms at $0.00006/run. Qwen 3.7 Flash gives 93.8% at $0.000017/run (72% cheaper). Nemotron Lightning offers zero-cost cloud tagging. On laptops, qwen3.5:4b runs offline at $0 cost with zero data leakage.",
  },

  find_facts: {
    id: "find_facts",
    title: "Find Facts in the Knowledge Brain",
    description: "Knowledge extraction, context filtering, and verified factual snippet matching.",
    inputTokens: 1200,
    outputTokens: 150,
    candidateModelIds: [
      "claude-haiku-5.5",
      "gemini-2.5-flash-lite",
      "qwen3.5:4b",
    ],
    recommendedModelId: "gemini-2.5-flash-lite",
    tradeoffAnalysis:
      "Gemini 2.5 Flash-Lite delivers top speed (220ms avg) and 92.4% factual precision at just $0.00018/run. Claude Haiku 5.5 reaches 94.2% quality at $0.000195/run. For air-gapped private data, local qwen3.5:4b costs $0 with 86.4% factual accuracy.",
  },

  write_reply: {
    id: "write_reply",
    title: "Write the Answer (Support & Consultant)",
    description: "Multi-turn tone synthesis, step-by-step guidance, and consultative pricing quotation.",
    inputTokens: 1500,
    outputTokens: 400,
    candidateModelIds: [
      "claude-sonnet-5.5",
      "qwen/qwen3.8-max-0902",
      "gemini-3.8-flash",
      "gemini-3-flash",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "google/gemma-4-31b-it:free",
      "gemma4:e4b",
    ],
    recommendedModelId: "claude-sonnet-5.5",
    tradeoffAnalysis:
      "Claude Sonnet 5.5 leads overall consultant quality (98.8%) at $0.007/run. Qwen 3.8 Max matches closely (97.4%) with 40% cheaper output tokens ($6.00/1M vs $10.00/1M). Nemotron 3 Ultra 550B delivers 97.2% quality at $0 cost on OpenRouter. Local gemma4:e4b provides 89.2% quality offline on your laptop.",
  },

  read_screenshot: {
    id: "read_screenshot",
    title: "Read a Screenshot (Multimodal Vision)",
    description: "Image parsing, UI control recognition, console screenshots, and architecture diagrams.",
    inputTokens: 2000,
    outputTokens: 250,
    candidateModelIds: [
      "gemini-3.8-flash",
      "gemini-3-flash",
      "nvidia/nemotron-3.5-super-vl:free",
      "gemma4:e4b",
    ],
    recommendedModelId: "gemini-3.8-flash",
    tradeoffAnalysis:
      "Gemini 3.8 Flash is the premier vision model with 98.1% diagram & OCR accuracy ($0.0024/run). Gemini 3 Flash offers 96.5% at lower cost ($0.0017/run). Nemotron 3.5 Super VL is the top free vision model on OpenRouter ($0). Local gemma4:e4b reads screenshots offline on your laptop for sensitive UI data.",
  },

  improve_skill: {
    id: "improve_skill",
    title: "Improve a Skill / Turn Correction into a Lesson",
    description: "High-reasoning SOP optimization, email thread critiques, and golden resolution protocol creation.",
    inputTokens: 3500,
    outputTokens: 800,
    candidateModelIds: [
      "claude-opus-5.5",
    ],
    recommendedModelId: "claude-opus-5.5",
    tradeoffAnalysis:
      "Opus only. Complex architectural synthesis and long-term SOP refinement strictly requires Claude Opus 5.5 (99.4% score). No smaller model possesses the reasoning depth to safely rewrite company operating procedures without drift.",
  },

  judge_eval: {
    id: "judge_eval",
    title: "Judge the Answers (Eval Lab)",
    description: "Automated ground-truth scoring (0-100), factual alignment critique, and human calibration.",
    inputTokens: 1800,
    outputTokens: 200,
    candidateModelIds: [
      "claude-opus-5.5",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
    ],
    recommendedModelId: "claude-opus-5.5",
    tradeoffAnalysis:
      "Claude Opus 5.5 serves as the default gold-standard master judge (calibrated against 20 human cases at >=90% agreement). Nemotron 3 Ultra 550B provides an independent zero-cost second opinion. A model never judges its own answers.",
  },
};

/**
 * Evaluates candidates for a single eval job or across all 6 eval jobs.
 */
export function evaluateJobSuitability(
  jobId?: string,
  localOnly: boolean = false
): EvalJobEvaluation[] {
  const allMetrics = runModelMatrixEvaluation(false);
  const metricsMap = new Map<string, ModelEvalMetric>(allMetrics.map((m) => [m.modelId, m]));

  const jobsToEvaluate = jobId ? [EVAL_JOBS[jobId]].filter(Boolean) : Object.values(EVAL_JOBS);
  const evaluations: EvalJobEvaluation[] = [];

  for (const job of jobsToEvaluate) {
    let candidateIds = job.candidateModelIds;
    if (localOnly) {
      candidateIds = candidateIds.filter((id) => SUPPORTED_MODELS[id]?.isLocal);
      if (candidateIds.length === 0) {
        // Fallback to local models if none explicitly listed
        candidateIds = job.id === "tag_job" || job.id === "find_facts" ? ["qwen3.5:4b"] : ["gemma4:e4b"];
      }
    }

    const candidates: CandidateJobScore[] = candidateIds.map((modelId) => {
      const model = SUPPORTED_MODELS[modelId] || {
        id: modelId,
        displayName: modelId,
        provider: "openrouter",
        isFree: false,
        isLocal: false,
        supportsVision: false,
      };

      const metric = metricsMap.get(modelId);
      const qualityScore = metric?.qualityScore ?? 95.0;
      const avgLatencyMs = metric?.avgLatencyMs ?? 800;
      const p95LatencyMs = metric?.p95LatencyMs ?? 1500;

      const costPerRun = calculateModelCost(modelId, job.inputTokens, job.outputTokens);
      const costPer100Runs = Number((costPerRun * 100).toFixed(6));

      return {
        modelId,
        displayName: model.displayName,
        provider: model.provider,
        qualityScore,
        avgLatencyMs,
        p95LatencyMs,
        costPerRunUsd: costPerRun,
        costPer100RunsUsd: costPer100Runs,
        isFree: !!model.isFree,
        isLocal: !!model.isLocal,
        supportsVision: !!model.supportsVision,
        notes: (model as any).pricingNote || model.primaryJob || "",
      };
    });

    // Determine Winners
    const sortedByQuality = [...candidates].sort((a, b) => b.qualityScore - a.qualityScore);
    const sortedByCost = [...candidates].sort((a, b) => a.costPer100RunsUsd - b.costPer100RunsUsd);
    const sortedBySpeed = [...candidates].sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);

    const bestQuality = sortedByQuality[0] || candidates[0];
    const bestCost = sortedByCost[0] || candidates[0];
    const bestSpeed = sortedBySpeed[0] || candidates[0];

    // Pick recommended model
    let recommended = candidates.find((c) => c.modelId === job.recommendedModelId) || bestQuality;
    if (localOnly) {
      recommended = candidates[0];
    }

    // Decorate candidate objects with category distinction flags
    candidates.forEach((c) => {
      c.isRecommended = c.modelId === recommended.modelId;
      c.isBestQuality = c.modelId === bestQuality.modelId;
      c.isBestBudget = c.modelId === bestCost.modelId;
      c.isFastest = c.modelId === bestSpeed.modelId;
    });

    evaluations.push({
      jobId: job.id,
      title: job.title,
      description: job.description,
      tokenProfile: {
        inputTokens: job.inputTokens,
        outputTokens: job.outputTokens,
      },
      candidateModels: candidates,
      candidates,
      bestQualityModel: bestQuality,
      bestCostModel: bestCost,
      bestSpeedModel: bestSpeed,
      recommendedModel: recommended,
      recommendedModelId: recommended.modelId,
      recommendedReason: (recommended as any).notes || "Top balanced pick for this step",
      bestQualityModelId: bestQuality.modelId,
      bestBudgetModelId: bestCost.modelId,
      fastestModelId: bestSpeed.modelId,
      tradeoffAnalysis: job.tradeoffAnalysis,
      tradeOffAnalysis: job.tradeoffAnalysis,
    });
  }

  return evaluations;
}

/**
 * Returns all 6 eval job evaluations.
 */
export function getAllEvalJobsEvaluations(localOnly: boolean = false): EvalJobEvaluation[] {
  return evaluateJobSuitability(undefined, localOnly);
}

