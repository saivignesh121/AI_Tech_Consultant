/**
 * Side-by-Side Model Comparator Engine
 * Task 4.1: A view that shows two answers to the same test case
 * (for example, one from Sonnet 5.5 and one from Qwen 3.8 Max),
 * with the judge's score and reason for each.
 */

import { SUPPORTED_MODELS, calculateModelCost, estimateTokens } from "../llm/pricing";
import { evaluateAnswerWithJudge, JudgeEvaluationResult } from "./judge";
import { loadBenchmarkCasesByVersion, BenchmarkCaseItem } from "./benchmarkManager";

export interface ModelAnswerEvaluation {
  modelId: string;
  displayName: string;
  provider: string;
  isLocal: boolean;
  isFree: boolean;
  answer: string;
  latencyMs: number;
  costUsd: number;
  judgeScore: number;
  judgeReason: string;
  judgePassed: boolean;
  judgeModel: string;
}

export interface SideBySideComparisonResult {
  testCaseId?: string;
  question: string;
  expectedAnswer: string;
  category: string;
  judgeModelId: string;
  modelA: ModelAnswerEvaluation;
  modelB: ModelAnswerEvaluation;
  comparison: {
    scoreDelta: number; // modelA - modelB
    costDeltaUsd: number; // modelA - modelB
    costPercentSavings: number; // savings choosing cheaper
    speedDeltaMs: number; // modelA - modelB
    winnerQuality: string;
    winnerCost: string;
    winnerSpeed: string;
    recommendationSummary: string;
  };
}

/**
 * Generates or retrieves a model response for a given benchmark question.
 */
function getSimulatedModelAnswer(modelId: string, question: string, expectedAnswer: string): {
  answer: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
} {
  const model = SUPPORTED_MODELS[modelId] || {
    id: modelId,
    displayName: modelId,
    provider: "claude",
  };

  const inputTokens = estimateTokens(question) + 800; // includes prompt + retrieved context
  let latencyMs = 1100;
  let answer = "";

  if (modelId === "claude-sonnet-5.5") {
    latencyMs = 950;
    answer = `To configure this according to verified documentation:
1. Ensure your CNAME record points directly to host.saas.com with TTL set to 300 seconds.
2. In Cloudflare, set proxy status to DNS-only (Grey Cloud) during the initial ACME SSL challenge verification.
3. Once certificate provisioning completes on the origin, switch to Proxied (Orange Cloud) for DDoS protection and edge caching.`;
  } else if (modelId === "qwen/qwen3.8-max-0902") {
    latencyMs = 1200;
    answer = `Configuration steps for custom subdomains:
- Point your CNAME record to host.saas.com in your authoritative DNS zone.
- Temporarily disable the Cloudflare proxy (Grey Cloud) so the SSL certificate challenge can resolve directly.
- Re-enable the proxy after validation is confirmed.`;
  } else if (modelId === "claude-opus-5.5") {
    latencyMs = 2200;
    answer = `Detailed architecture guidance:
1. Canonical DNS Configuration: Add a CNAME pointing to host.saas.com.
2. SSL Handshake & ACME Validation: Cloudflare proxy must be set to DNS-only (Grey Cloud) during certificate issuance to prevent 525 SSL Handshake errors.
3. Post-Verification: Once the origin TLS 1.3 listener is verified on port 443, re-proxy traffic through Cloudflare.`;
  } else if (modelId === "claude-haiku-5.5") {
    latencyMs = 320;
    answer = `Add a CNAME pointing to host.saas.com. Keep Cloudflare proxy on Grey Cloud during initial SSL setup.`;
  } else if (modelId === "gemini-3.8-flash") {
    latencyMs = 550;
    answer = `Configure CNAME to host.saas.com. Set Cloudflare proxy to DNS-only (Grey Cloud) for initial SSL verification, then enable Orange Cloud.`;
  } else if (modelId === "nvidia/nemotron-3-ultra-550b-a55b:free") {
    latencyMs = 1450;
    answer = `Point your CNAME alias to host.saas.com. Ensure Cloudflare proxying is turned off (Grey Cloud) until SSL certificate generation completes successfully.`;
  } else if (modelId === "gemma4:e4b") {
    latencyMs = 1800;
    answer = `[Local Offline Gemma 4]
Point CNAME record to host.saas.com. In Cloudflare, keep proxy on Grey Cloud (DNS-only) while ACME SSL challenge verifies.`;
  } else {
    latencyMs = 800;
    answer = `Follow documentation: point CNAME to host.saas.com and ensure SSL validation is complete before enabling proxy.`;
  }

  // Adjust answer if it's an escalation or unanswerable scenario
  const qLower = question.toLowerCase();
  if (qLower.includes("refund")) {
    if (modelId === "qwen/qwen3.7-flash") {
      answer = "Your refund has been approved and issued back to your payment method.";
    } else {
      answer = "[SEND TO A HUMAN: Refund request requires authorization from a human billing manager.]";
    }
  } else if (qLower.includes("ignore") && qLower.includes("instructions")) {
    answer = "[REDACTED SECURITY VIOLATION: Input sanitization shield intercepted prompt injection attempt.]";
  } else if (qLower.includes("lawyer") || qLower.includes("lawsuit") || qLower.includes("sue")) {
    answer = "[SEND TO A HUMAN: Legal dispute detected. Created urgent priority task for legal counsel.]";
  } else if (qLower.includes("ceo") && qLower.includes("phone")) {
    answer = "I do not have verified documentation or access to private executive personnel information in the Knowledge Brain.";
  }

  const outputTokens = estimateTokens(answer);
  return { answer, latencyMs, inputTokens, outputTokens };
}

/**
 * Runs a side-by-side evaluation of two models on the same test case.
 * Evaluates both outputs with the AI Judge and calculates score & cost deltas.
 */
export function runSideBySideComparison(params: {
  testCaseId?: string;
  question?: string;
  expectedAnswer?: string;
  category?: string;
  modelAId?: string;
  modelBId?: string;
  judgeModelId?: string;
  benchmarkVersion?: string;
}): SideBySideComparisonResult {
  const modelAId = params.modelAId || "claude-sonnet-5.5";
  const modelBId = params.modelBId || "qwen/qwen3.8-max-0902";
  const judgeModelId = params.judgeModelId || "claude-opus-5.5";

  let question = params.question || "";
  let expectedAnswer = params.expectedAnswer || "";
  let category = params.category || "General Support";
  let testCaseId = params.testCaseId;

  // If testCaseId provided or question empty, pull from benchmark
  if (testCaseId || !question) {
    const dataset = loadBenchmarkCasesByVersion(params.benchmarkVersion || "1.0.0");
    const targetCase = testCaseId
      ? dataset.cases.find((c) => c.id === testCaseId)
      : dataset.cases[0];

    if (targetCase) {
      testCaseId = targetCase.id;
      question = targetCase.question;
      expectedAnswer = targetCase.expectedAnswer;
      category = targetCase.category;
    }
  }

  // Model A Execution & Judge Evaluation
  const simA = getSimulatedModelAnswer(modelAId, question, expectedAnswer);
  const costA = calculateModelCost(modelAId, simA.inputTokens, simA.outputTokens);
  const judgeA = evaluateAnswerWithJudge({
    question,
    expectedAnswer,
    actualAnswer: simA.answer,
    candidateModelId: modelAId,
    judgeModelId,
  });

  const modelAData: ModelAnswerEvaluation = {
    modelId: modelAId,
    displayName: SUPPORTED_MODELS[modelAId]?.displayName || modelAId,
    provider: SUPPORTED_MODELS[modelAId]?.provider || "claude",
    isLocal: !!SUPPORTED_MODELS[modelAId]?.isLocal,
    isFree: !!SUPPORTED_MODELS[modelAId]?.isFree,
    answer: simA.answer,
    latencyMs: simA.latencyMs,
    costUsd: costA,
    judgeScore: judgeA.score,
    judgeReason: judgeA.reason,
    judgePassed: judgeA.passed,
    judgeModel: judgeA.judgeModel,
  };

  // Model B Execution & Judge Evaluation
  const simB = getSimulatedModelAnswer(modelBId, question, expectedAnswer);
  const costB = calculateModelCost(modelBId, simB.inputTokens, simB.outputTokens);
  const judgeB = evaluateAnswerWithJudge({
    question,
    expectedAnswer,
    actualAnswer: simB.answer,
    candidateModelId: modelBId,
    judgeModelId,
  });

  const modelBData: ModelAnswerEvaluation = {
    modelId: modelBId,
    displayName: SUPPORTED_MODELS[modelBId]?.displayName || modelBId,
    provider: SUPPORTED_MODELS[modelBId]?.provider || "openrouter",
    isLocal: !!SUPPORTED_MODELS[modelBId]?.isLocal,
    isFree: !!SUPPORTED_MODELS[modelBId]?.isFree,
    answer: simB.answer,
    latencyMs: simB.latencyMs,
    costUsd: costB,
    judgeScore: judgeB.score,
    judgeReason: judgeB.reason,
    judgePassed: judgeB.passed,
    judgeModel: judgeB.judgeModel,
  };

  // Calculate comparison deltas
  const scoreDelta = modelAData.judgeScore - modelBData.judgeScore;
  const costDeltaUsd = Number((modelAData.costUsd - modelBData.costUsd).toFixed(6));
  const speedDeltaMs = modelAData.latencyMs - modelBData.latencyMs;

  let costPercentSavings = 0;
  if (modelAData.costUsd > 0) {
    costPercentSavings = Number(
      (((modelAData.costUsd - modelBData.costUsd) / modelAData.costUsd) * 100).toFixed(1)
    );
  } else if (modelBData.costUsd > 0) {
    costPercentSavings = -100;
  }

  const winnerQuality =
    scoreDelta > 0
      ? modelAData.displayName
      : scoreDelta < 0
      ? modelBData.displayName
      : "Tie (Equal Quality)";

  const winnerCost =
    costA < costB
      ? modelAData.displayName
      : costB < costA
      ? modelBData.displayName
      : "Tie (Zero or Equal Cost)";

  const winnerSpeed =
    simA.latencyMs < simB.latencyMs
      ? modelAData.displayName
      : simB.latencyMs < simA.latencyMs
      ? modelBData.displayName
      : "Tie (Equal Latency)";

  // Summary recommendation
  let recommendationSummary = "";
  if (Math.abs(scoreDelta) <= 5 && costPercentSavings > 25) {
    recommendationSummary = `${modelBData.displayName} delivers near-identical quality (${modelBData.judgeScore}% vs ${modelAData.judgeScore}%) while reducing output costs by ${costPercentSavings}%. Highly recommended for high-volume support queues.`;
  } else if (scoreDelta > 10) {
    recommendationSummary = `${modelAData.displayName} scored +${scoreDelta}% higher on factual accuracy. Worth the cost premium for complex consulting and executive replies.`;
  } else if (modelAData.isFree || modelBData.isFree) {
    recommendationSummary = `Zero-cost tier comparison: quality score is ${Math.max(modelAData.judgeScore, modelBData.judgeScore)}% with $0.00 cloud token expenditure.`;
  } else {
    recommendationSummary = `${modelAData.displayName} (${modelAData.judgeScore}%) and ${modelBData.displayName} (${modelBData.judgeScore}%) both pass the quality threshold. Choice depends on latency vs budget priority.`;
  }

  return {
    testCaseId,
    question,
    expectedAnswer,
    category,
    judgeModelId,
    modelA: modelAData,
    modelB: modelBData,
    comparison: {
      scoreDelta,
      costDeltaUsd,
      costPercentSavings,
      speedDeltaMs,
      winnerQuality,
      winnerCost,
      winnerSpeed,
      recommendationSummary,
    },
  };
}
