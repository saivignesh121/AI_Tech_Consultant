/**
 * Official Model Pricing Table — Checked 12 Nov 2026
 * Prices in USD per 1 Million Tokens (Input / Output)
 */
export interface ModelPricing {
  id: string;
  displayName: string;
  provider: "claude" | "gemini" | "openrouter" | "ollama";
  inputPer1M: number;
  outputPer1M: number;
  cachedReadPer1M?: number;
  cachedWritePer1M?: number;
  maxTierThreshold?: number;
  highTierInputPer1M?: number;
  highTierOutputPer1M?: number;
  supportsVision: boolean;
  isFree: boolean;
  isLocal: boolean;
  primaryJob: string;
}

export const SUPPORTED_MODELS: Record<string, ModelPricing> = {
  // Claude Suite
  "claude-opus-5.5": {
    id: "claude-opus-5.5",
    displayName: "Claude Opus 5.5",
    provider: "claude",
    inputPer1M: 4.0,
    outputPer1M: 20.0,
    cachedReadPer1M: 0.4,
    cachedWritePer1M: 5.0,
    supportsVision: true,
    isFree: false,
    isLocal: false,
    primaryJob: "Improve skills, write lessons, master judge",
  },
  "claude-sonnet-5.5": {
    id: "claude-sonnet-5.5",
    displayName: "Claude Sonnet 5.5",
    provider: "claude",
    inputPer1M: 2.0,
    outputPer1M: 10.0,
    cachedReadPer1M: 0.2,
    cachedWritePer1M: 2.5,
    supportsVision: true,
    isFree: false,
    isLocal: false,
    primaryJob: "Main writer: support replies and consultant replies",
  },
  "claude-haiku-5.5": {
    id: "claude-haiku-5.5",
    displayName: "Claude Haiku 5.5",
    provider: "claude",
    inputPer1M: 0.1,
    outputPer1M: 0.5,
    maxTierThreshold: 100_000,
    highTierInputPer1M: 0.5,
    highTierOutputPer1M: 2.5,
    cachedReadPer1M: 0.01,
    supportsVision: false,
    isFree: false,
    isLocal: false,
    primaryJob: "Tag the job for router, find facts, short replies",
  },

  // Gemini Suite
  "gemini-3.8-flash": {
    id: "gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash",
    provider: "gemini",
    inputPer1M: 0.75,
    outputPer1M: 3.75,
    supportsVision: true,
    isFree: false,
    isLocal: false,
    primaryJob: "Writer, read screenshots",
  },
  "gemini-3-flash": {
    id: "gemini-3-flash",
    displayName: "Gemini 3 Flash",
    provider: "gemini",
    inputPer1M: 0.5,
    outputPer1M: 3.0,
    supportsVision: true,
    isFree: false,
    isLocal: false,
    primaryJob: "Cheaper writer, read screenshots",
  },
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash-Lite",
    provider: "gemini",
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    supportsVision: false,
    isFree: false,
    isLocal: false,
    primaryJob: "Tag the job, find facts",
  },

  // OpenRouter Free Suite
  "nvidia/nemotron-3-ultra-550b-a55b:free": {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    displayName: "Nemotron 3 Ultra 550B",
    provider: "openrouter",
    inputPer1M: 0.0,
    outputPer1M: 0.0,
    supportsVision: false,
    isFree: true,
    isLocal: false,
    primaryJob: "Writer at zero cost, second-opinion judge",
  },
  "nvidia/nemotron-3.5-super-vl:free": {
    id: "nvidia/nemotron-3.5-super-vl:free",
    displayName: "Nemotron 3.5 Super VL",
    provider: "openrouter",
    inputPer1M: 0.0,
    outputPer1M: 0.0,
    supportsVision: true,
    isFree: true,
    isLocal: false,
    primaryJob: "Read screenshots (vision model)",
  },
  "nvidia/nemotron-3.5-lightning:free": {
    id: "nvidia/nemotron-3.5-lightning:free",
    displayName: "Nemotron 3.5 Lightning",
    provider: "openrouter",
    inputPer1M: 0.0,
    outputPer1M: 0.0,
    supportsVision: false,
    isFree: true,
    isLocal: false,
    primaryJob: "Tag the job at zero cost",
  },
  "google/gemma-4-31b-it:free": {
    id: "google/gemma-4-31b-it:free",
    displayName: "Gemma 4 31B",
    provider: "openrouter",
    inputPer1M: 0.0,
    outputPer1M: 0.0,
    supportsVision: false,
    isFree: true,
    isLocal: false,
    primaryJob: "Writer (open weights)",
  },

  // OpenRouter Paid Suite
  "qwen/qwen3.8-max-0902": {
    id: "qwen/qwen3.8-max-0902",
    displayName: "Qwen 3.8 Max",
    provider: "openrouter",
    inputPer1M: 2.0,
    outputPer1M: 6.0,
    supportsVision: false,
    isFree: false,
    isLocal: false,
    primaryJob: "Support replies and consultant writing",
  },
  "qwen/qwen3.7-flash": {
    id: "qwen/qwen3.7-flash",
    displayName: "Qwen 3.7 Flash",
    provider: "openrouter",
    inputPer1M: 0.03,
    outputPer1M: 0.13,
    maxTierThreshold: 32_000,
    supportsVision: false,
    isFree: false,
    isLocal: false,
    primaryJob: "Very cheap job tagging for router",
  },

  // Local Ollama Models (Laptop localhost:11434)
  "gemma4:e4b": {
    id: "gemma4:e4b",
    displayName: "gemma4:e4b (Local)",
    provider: "ollama",
    inputPer1M: 0.0,
    outputPer1M: 0.0,
    supportsVision: true,
    isFree: true,
    isLocal: true,
    primaryJob: "Offline replies, read screenshots, private data",
  },
  "qwen3.5:4b": {
    id: "qwen3.5:4b",
    displayName: "qwen3.5:4b (Local)",
    provider: "ollama",
    inputPer1M: 0.0,
    outputPer1M: 0.0,
    supportsVision: false,
    isFree: true,
    isLocal: true,
    primaryJob: "Offline job tagging and fact finding",
  },
};

/**
 * Calculates the exact USD cost for a model invocation.
 */
export function calculateModelCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedReadTokens: number = 0
): number {
  const model = SUPPORTED_MODELS[modelId];
  if (!model || model.isFree || model.isLocal) {
    return 0.0;
  }

  // Handle Haiku 5.5 price tiering (>100k tokens costs $0.50 / $2.50)
  let inputRate = model.inputPer1M;
  let outputRate = model.outputPer1M;

  if (model.maxTierThreshold && inputTokens > model.maxTierThreshold) {
    if (model.highTierInputPer1M) inputRate = model.highTierInputPer1M;
    if (model.highTierOutputPer1M) outputRate = model.highTierOutputPer1M;
  }

  // Calculate non-cached input tokens
  const billableInputTokens = Math.max(0, inputTokens - cachedReadTokens);
  const inputCost = (billableInputTokens / 1_000_000) * inputRate;
  
  // Calculate cached read discount
  const cachedRate = model.cachedReadPer1M ?? inputRate * 0.1;
  const cachedCost = (cachedReadTokens / 1_000_000) * cachedRate;

  // Calculate output tokens
  const outputCost = (outputTokens / 1_000_000) * outputRate;

  const total = inputCost + cachedCost + outputCost;
  return Number(total.toFixed(6));
}

/**
 * Fast token count estimator (approx. 4 characters per token).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
