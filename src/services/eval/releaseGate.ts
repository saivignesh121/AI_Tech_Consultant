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
  allowed: boolean;
  status: "PASSED" | "BLOCKED";
  scoreDelta: number;
  reason: string;
  timestamp: string;
}

export function evaluateReleaseGate(
  paramsOrEntityType: ReleaseGateCheckParams | "prompt" | "role" | "skill" | "model",
  entityName?: string,
  newVersionScore?: number,
  previousVersionScore?: number
): ReleaseGateResult {
  let params: ReleaseGateCheckParams;
  if (typeof paramsOrEntityType === "string") {
    params = {
      entityType: paramsOrEntityType,
      entityName: entityName || "",
      newVersionScore: newVersionScore || 0,
      previousVersionScore: previousVersionScore || 0,
    };
  } else {
    params = paramsOrEntityType;
  }

  const minThreshold = params.minimumPassThreshold ?? 80.0;
  const delta = Number((params.newVersionScore - params.previousVersionScore).toFixed(2));
  const canRelease = params.newVersionScore >= minThreshold && params.newVersionScore >= params.previousVersionScore;
  const status: "PASSED" | "BLOCKED" = canRelease ? "PASSED" : "BLOCKED";

  let reason = `Release Gate Passed: Score improved or matched previous version (+${delta}%). Ready for production.`;
  if (params.newVersionScore < minThreshold) {
    reason = `Blocked by Release Gate: New version score (${params.newVersionScore}%) is below the minimum threshold (${minThreshold}%).`;
  } else if (params.newVersionScore < params.previousVersionScore) {
    reason = `Blocked by Release Gate: Regression detected (Score drop). Score dropped by ${Math.abs(delta)}% (from ${params.previousVersionScore}% to ${params.newVersionScore}%).`;
  }

  return {
    canRelease,
    allowed: canRelease,
    status,
    scoreDelta: delta,
    reason,
    timestamp: new Date().toISOString(),
  };
}
