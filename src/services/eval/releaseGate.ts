/**
 * Strict Production Release Gate
 * Task 4.5: Blocks deployment of any prompt, role, skill, or model if benchmark score falls below last version.
 */

export interface ReleaseGateCheckParams {
  entityType: "prompt" | "role" | "skill" | "model";
  entityName: string;
  previousVersionScore: number;
  newVersionScore: number;
  minimumPassThreshold?: number; // default: 80%
}

export interface ReleaseGateResult {
  canRelease: boolean;
  scoreDelta: number;
  reason: string;
  timestamp: string;
}

export function evaluateReleaseGate(params: ReleaseGateCheckParams): ReleaseGateResult {
  const minThreshold = params.minimumPassThreshold ?? 80.0;
  const delta = Number((params.newVersionScore - params.previousVersionScore).toFixed(2));

  // Condition 1: Absolute minimum bar check
  if (params.newVersionScore < minThreshold) {
    return {
      canRelease: false,
      scoreDelta: delta,
      reason: `Blocked by Release Gate: New version score (${params.newVersionScore}%) is below the minimum threshold (${minThreshold}%).`,
      timestamp: new Date().toISOString(),
    };
  }

  // Condition 2: Regression check against previous active version
  if (params.newVersionScore < params.previousVersionScore) {
    return {
      canRelease: false,
      scoreDelta: delta,
      reason: `Blocked by Release Gate: Regression detected. Score dropped by ${Math.abs(delta)}% (from ${params.previousVersionScore}% to ${params.newVersionScore}%).`,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    canRelease: true,
    scoreDelta: delta,
    reason: `Release Gate Passed: Score improved or matched previous version (+${delta}%). Ready for production.`,
    timestamp: new Date().toISOString(),
  };
}
