/**
 * Official Model Pricing Table — Checked 12 Nov 2026
 * Prices in USD per 1 Million Tokens (Input / Output)
 * Task 4.2 & Feature 4: 14 Supported Models, Fallbacks, and 6 Eval Jobs
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
  compareAgainst?: string[];
  fallbacks?: string[];
  downloadSizeGB?: string;
  pricingNote?: string;
  eligibleJobs?: string[];
}

export const SUPPORTED_MODELS: Record<string, ModelPricing> = {
  // 1. Claude Opus 5.5
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
    primaryJob: "Improve skills, write lessons, master judge (default)",
    compareAgainst: ["Opus is top score; every other model measured against it"],
    pricingNote: "Top score benchmark; gold standard for skill optimization and judge evaluation.",
    eligibleJobs: ["improve_skill", "judge_eval"],
  },

  // 2. Claude Sonnet 5.5
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
    compareAgainst: [
      "qwen/qwen3.8-max-0902",
      "gemini-3.8-flash",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
    ],
    pricingNote: "Primary production consultant writing model.",
    eligibleJobs: ["write_reply"],
  },

  // 3. Claude Haiku 5.5
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
    primaryJob: "Tag the job for the router, find facts, short simple replies",
    compareAgainst: [
      "qwen/qwen3.7-flash",
      "gemini-2.5-flash-lite",
      "nvidia/nemotron-3.5-lightning:free",
    ],
    pricingNote: "Prompts up to 100,000 tokens cost $0.10 / $0.50. Longer prompts cost $0.50 / $2.50.",
    eligibleJobs: ["tag_job", "find_facts"],
  },

  // 4. Gemini 3.8 Flash
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
    compareAgainst: [
      "claude-sonnet-5.5",
      "nvidia/nemotron-3.5-super-vl:free",
    ],
    pricingNote: "Introductory price ($0.75 / $3.75). Rises to $1.50 / $7.50 on 1 Jan 2027.",
    eligibleJobs: ["write_reply", "read_screenshot"],
  },

  // 5. Gemini 3 Flash
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
    compareAgainst: [
      "gemini-3.8-flash",
      "claude-sonnet-5.5",
    ],
    pricingNote: "Cost-effective vision and general writing tier.",
    eligibleJobs: ["write_reply", "read_screenshot"],
  },

  // 6. Gemini 2.5 Flash-Lite
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
    compareAgainst: [
      "claude-haiku-5.5",
      "qwen/qwen3.7-flash",
    ],
    pricingNote: "Ultra low-cost routing and fact finding tier.",
    eligibleJobs: ["tag_job", "find_facts"],
  },

  // 7. Nemotron 3 Ultra 550B (OpenRouter Free)
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
    compareAgainst: [
      "claude-sonnet-5.5",
      "qwen/qwen3.8-max-0902",
    ],
    fallbacks: [
      "google/gemma-4-31b-it:free",
      "qwen/qwen3.8-max-0902",
      "claude-sonnet-5.5",
    ],
    pricingNote: "Free tier OpenRouter model. Auto-fallback configured if busy.",
    eligibleJobs: ["write_reply", "judge_eval"],
  },

  // 8. Nemotron 3.5 Super VL (OpenRouter Free)
  "nvidia/nemotron-3.5-super-vl:free": {
    id: "nvidia/nemotron-3.5-super-vl:free",
    displayName: "Nemotron 3.5 Super VL",
    provider: "openrouter",
    inputPer1M: 0.0,
    outputPer1M: 0.0,
    supportsVision: true,
    isFree: true,
    isLocal: false,
    primaryJob: "Read screenshots (it reads images)",
    compareAgainst: [
      "gemini-3.8-flash",
      "gemma4:e4b",
    ],
    fallbacks: [
      "gemini-3-flash",
      "gemini-3.8-flash",
      "gemma4:e4b",
    ],
    pricingNote: "Free multimodal vision model on OpenRouter.",
    eligibleJobs: ["read_screenshot"],
  },

  // 9. Nemotron 3.5 Lightning (OpenRouter Free)
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
    compareAgainst: [
      "claude-haiku-5.5",
      "qwen/qwen3.7-flash",
    ],
    fallbacks: [
      "qwen/qwen3.7-flash",
      "gemini-2.5-flash-lite",
      "claude-haiku-5.5",
    ],
    pricingNote: "Fast zero-cost job tagging.",
    eligibleJobs: ["tag_job"],
  },

  // 10. Gemma 4 31B (OpenRouter Free)
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
    compareAgainst: [
      "gemma4:e4b",
    ],
    fallbacks: [
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "gemini-3-flash",
      "gemma4:e4b",
    ],
    pricingNote: "Large 31B parameter model compared against laptop local sibling.",
    eligibleJobs: ["write_reply"],
  },

  // 11. Qwen 3.8 Max (OpenRouter Paid)
  "qwen/qwen3.8-max-0902": {
    id: "qwen/qwen3.8-max-0902",
    displayName: "Qwen 3.8 Max",
    provider: "openrouter",
    inputPer1M: 2.0,
    outputPer1M: 6.0,
    supportsVision: false,
    isFree: false,
    isLocal: false,
    primaryJob: "Support replies and consultant-style writing",
    compareAgainst: [
      "claude-sonnet-5.5",
    ],
    pricingNote: "Output costs $6.00/1M vs Sonnet $10.00/1M (40% lower output cost).",
    eligibleJobs: ["write_reply"],
  },

  // 12. Qwen 3.7 Flash (OpenRouter Paid)
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
    primaryJob: "Very cheap job tagging for the router",
    compareAgainst: [
      "claude-haiku-5.5",
    ],
    pricingNote: "Prompts up to 32,000 tokens cost $0.03 / $0.13 per 1M.",
    eligibleJobs: ["tag_job"],
  },

  // 13. gemma4:e4b (Laptop Ollama)
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
    compareAgainst: [
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3.5-super-vl:free",
    ],
    downloadSizeGB: "7–10 GB",
    pricingNote: "Zero cloud cost ($0). Runs offline via Ollama at localhost:11434.",
    eligibleJobs: ["write_reply", "read_screenshot"],
  },

  // 14. qwen3.5:4b (Laptop Ollama)
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
    compareAgainst: [
      "claude-haiku-5.5",
      "nvidia/nemotron-3.5-lightning:free",
    ],
    downloadSizeGB: "3–4 GB",
    pricingNote: "Zero cloud cost ($0). 4-bit quantized local model on localhost:11434.",
    eligibleJobs: ["tag_job", "find_facts"],
  },
};

/**
 * Fallback routing map for OpenRouter free models
 * Task: "Free models can be busy at peak hours or be removed. App must keep a list of 2 or 3 fallback models."
 */
export const FREE_MODEL_FALLBACKS: Record<string, string[]> = {
  "nvidia/nemotron-3-ultra-550b-a55b:free": [
    "google/gemma-4-31b-it:free",
    "qwen/qwen3.8-max-0902",
    "claude-sonnet-5.5",
  ],
  "nvidia/nemotron-3.5-super-vl:free": [
    "gemini-3-flash",
    "gemini-3.8-flash",
    "gemma4:e4b",
  ],
  "nvidia/nemotron-3.5-lightning:free": [
    "qwen/qwen3.7-flash",
    "gemini-2.5-flash-lite",
    "claude-haiku-5.5",
  ],
  "google/gemma-4-31b-it:free": [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "gemini-3-flash",
    "gemma4:e4b",
  ],
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

/**
 * Array view of all 14 supported models.
 */
export const SUPPORTED_MODELS_LIST: ModelPricing[] = Object.values(SUPPORTED_MODELS);

/**
 * Calculates exact model cost (alias for calculateModelCost).
 */
export const calculateExactModelCost = calculateModelCost;

/**
 * Returns download size for laptop local models.
 */
export function getModelDownloadSize(modelId: string): string | undefined {
  return SUPPORTED_MODELS[modelId]?.downloadSizeGB;
}

