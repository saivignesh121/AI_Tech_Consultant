import { calculateModelCost } from "../llm/pricing";

export interface CachingComparisonResult {
  taskCount: number;
  modelId: string;
  costWithoutCachingUsd: number;
  costWithCachingUsd: number;
  dollarsSavedUsd: number;
  percentSaved: number;
  totalTokensProcessed: number;
  breakdown: {
    cachingOff: {
      inputTokens: number;
      outputTokens: number;
      inputCostUsd: number;
      outputCostUsd: number;
    };
    cachingOn: {
      cachedReadTokens: number;
      uncachedInputTokens: number;
      outputTokens: number;
      inputCostUsd: number;
      outputCostUsd: number;
    };
  };
}

/**
 * Simulates running N tasks (default 100) with Prompt Caching OFF vs. ON,
 * proving exact dollar and percentage savings (Task 1.3).
 */
export function simulatePromptCachingSavings(
  modelId: string = "claude-sonnet-5.5",
  taskCount: number = 100,
  staticPromptTokens: number = 2500,
  dynamicPromptTokens: number = 200,
  outputTokensPerCall: number = 350
): CachingComparisonResult {
  const totalInputPerCall = staticPromptTokens + dynamicPromptTokens;

  // 1. Run with Caching OFF
  // Every call pays full standard input rate on all tokens
  let costWithoutCaching = 0;
  for (let i = 0; i < taskCount; i++) {
    costWithoutCaching += calculateModelCost(modelId, totalInputPerCall, outputTokensPerCall, 0);
  }

  // 2. Run with Caching ON
  // Call 1 pays for initial cache write on staticPromptTokens
  // Calls 2..N get 90% discount on staticPromptTokens (cachedReadTokens)
  let costWithCaching = 0;
  for (let i = 0; i < taskCount; i++) {
    if (i === 0) {
      // First call: initial write
      costWithCaching += calculateModelCost(modelId, totalInputPerCall, outputTokensPerCall, 0);
    } else {
      // Subsequent calls: staticPromptTokens are cached
      costWithCaching += calculateModelCost(
        modelId,
        totalInputPerCall,
        outputTokensPerCall,
        staticPromptTokens
      );
    }
  }

  const dollarsSaved = Math.max(0, costWithoutCaching - costWithCaching);
  const percentSaved = costWithoutCaching > 0 ? (dollarsSaved / costWithoutCaching) * 100 : 0;

  return {
    taskCount,
    modelId,
    costWithoutCachingUsd: Number(costWithoutCaching.toFixed(6)),
    costWithCachingUsd: Number(costWithCaching.toFixed(6)),
    dollarsSavedUsd: Number(dollarsSaved.toFixed(6)),
    percentSaved: Number(percentSaved.toFixed(2)),
    totalTokensProcessed: (totalInputPerCall + outputTokensPerCall) * taskCount,
    breakdown: {
      cachingOff: {
        inputTokens: totalInputPerCall * taskCount,
        outputTokens: outputTokensPerCall * taskCount,
        inputCostUsd: Number(((totalInputPerCall * taskCount / 1_000_000) * 2.0).toFixed(6)),
        outputCostUsd: Number(((outputTokensPerCall * taskCount / 1_000_000) * 10.0).toFixed(6)),
      },
      cachingOn: {
        cachedReadTokens: staticPromptTokens * (taskCount - 1),
        uncachedInputTokens: staticPromptTokens + dynamicPromptTokens * taskCount,
        outputTokens: outputTokensPerCall * taskCount,
        inputCostUsd: Number((
          (staticPromptTokens / 1_000_000 * 2.0) +
          (staticPromptTokens * (taskCount - 1) / 1_000_000 * 0.2) +
          (dynamicPromptTokens * taskCount / 1_000_000 * 2.0)
        ).toFixed(6)),
        outputCostUsd: Number(((outputTokensPerCall * taskCount / 1_000_000) * 10.0).toFixed(6)),
      },
    },
  };
}
