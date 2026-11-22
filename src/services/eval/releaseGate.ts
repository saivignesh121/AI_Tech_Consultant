/**
 * Strict Production Release Gate
 * Task 4.5: Hard automated enforcer:
 * A new prompt, role, skill or model cannot go live if any score falls below the last version.
 * This includes prompts and roles the business changes in Settings.
 */

export interface ReleaseGateCheckParams {
  entityType: "prompt" | "role" | "skill" | "model";
  entityName: string;
  previousVersionScore?: number;
  newVersionScore?: number;
  candidateScore?: number;
  baselineScore?: number;
  minimumPassThreshold?: number; // default: 80.0%
  candidateCategoryScores?: Record<string, number>;
  baselineCategoryScores?: Record<string, number>;
  candidateVersion?: string;
  baselineVersion?: string;
}

export interface ReleaseGateResult {
  canRelease: boolean;
  allowed: boolean;
  status: "PASSED" | "BLOCKED";
  scoreDelta: number;
  reason: string;
  entityType: "prompt" | "role" | "skill" | "model";
  entityName: string;
  candidateScore: number;
  baselineScore: number;
  regressedCategories?: string[];
  timestamp: string;
}

/**
 * In-memory audit history of release gate checks for administrative inspection.
 */
const RELEASE_GATE_AUDIT_LOGS: ReleaseGateResult[] = [];
const MAX_GATE_LOGS = 100;

/**
 * Evaluates whether a candidate change to a prompt, role, skill, or model
 * is safe to deploy or publish to production.
 *
 * Hard Blocking Rule:
 * 1. If candidate overall score < baseline score -> BLOCKED (Regression).
 * 2. If candidate overall score < minimum pass threshold (80.0%) -> BLOCKED (Low Quality).
 * 3. If any category sub-score falls below baseline category score -> BLOCKED (Category Regression).
 */
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
      entityName: entityName || "general_entity",
      candidateScore: newVersionScore ?? 0,
      baselineScore: previousVersionScore ?? 0,
    };
  } else {
    params = paramsOrEntityType;
  }

  const candidateScore = Number(
    (params.candidateScore ?? params.newVersionScore ?? 0).toFixed(2)
  );
  const baselineScore = Number(
    (params.baselineScore ?? params.previousVersionScore ?? 0).toFixed(2)
  );
  const minThreshold = params.minimumPassThreshold ?? 80.0;
  const delta = Number((candidateScore - baselineScore).toFixed(2));

  // Check category regressions if provided
  const regressedCategories: string[] = [];
  if (params.candidateCategoryScores && params.baselineCategoryScores) {
    for (const [cat, baseScore] of Object.entries(params.baselineCategoryScores)) {
      const candScore = params.candidateCategoryScores[cat] ?? 0;
      if (candScore < baseScore) {
        regressedCategories.push(
          `${cat}: dropped from ${baseScore}% to ${candScore}% (-${(baseScore - candScore).toFixed(1)}%)`
        );
      }
    }
  }

  // Hard blocking logic:
  // "A new prompt, role, skill or model cannot go live if any score falls below the last version."
  const isScoreRegressed = candidateScore < baselineScore;
  const isBelowMinThreshold = candidateScore < minThreshold;
  const hasCategoryRegression = regressedCategories.length > 0;

  const canRelease = !isScoreRegressed && !isBelowMinThreshold && !hasCategoryRegression;
  const status: "PASSED" | "BLOCKED" = canRelease ? "PASSED" : "BLOCKED";

  let reason = `Release Gate Passed: Candidate score improved or matched previous version (+${delta}%). Approved for production release.`;

  if (isBelowMinThreshold) {
    reason = `Blocked by Release Gate: Candidate version score (${candidateScore}%) is below the minimum required pass threshold (${minThreshold}%).`;
  } else if (isScoreRegressed) {
    reason = `Blocked by Release Gate: Regression detected (Score drop). Candidate score dropped by ${Math.abs(delta)}% (from ${baselineScore}% to ${candidateScore}%). Reversion required.`;
  } else if (hasCategoryRegression) {
    reason = `Blocked by Release Gate: Specific category score regressions detected: ${regressedCategories.join("; ")}. Overall score matched but sub-dimension regressed.`;
  }

  const result: ReleaseGateResult = {
    canRelease,
    allowed: canRelease,
    status,
    scoreDelta: delta,
    reason,
    entityType: params.entityType,
    entityName: params.entityName,
    candidateScore,
    baselineScore,
    regressedCategories: regressedCategories.length > 0 ? regressedCategories : undefined,
    timestamp: new Date().toISOString(),
  };

  logReleaseGateEvaluation(result);
  return result;
}

/**
 * Gate evaluator specifically for Prompt updates in Settings or via API.
 */
export function evaluatePromptReleaseGate(
  promptName: string,
  candidateScore: number,
  baselineScore: number,
  options?: Partial<ReleaseGateCheckParams>
): ReleaseGateResult {
  return evaluateReleaseGate({
    entityType: "prompt",
    entityName: promptName,
    candidateScore,
    baselineScore,
    ...options,
  });
}

/**
 * Gate evaluator specifically for Role updates in Settings or via API.
 */
export function evaluateRoleReleaseGate(
  roleName: string,
  candidateScore: number,
  baselineScore: number,
  options?: Partial<ReleaseGateCheckParams>
): ReleaseGateResult {
  return evaluateReleaseGate({
    entityType: "role",
    entityName: roleName,
    candidateScore,
    baselineScore,
    ...options,
  });
}

/**
 * Gate evaluator specifically for Skill synthesis or updates.
 */
export function evaluateSkillReleaseGate(
  skillName: string,
  candidateScore: number,
  baselineScore: number,
  options?: Partial<ReleaseGateCheckParams>
): ReleaseGateResult {
  return evaluateReleaseGate({
    entityType: "skill",
    entityName: skillName,
    candidateScore,
    baselineScore,
    ...options,
  });
}

/**
 * Gate evaluator specifically for Model assignment updates.
 */
export function evaluateModelReleaseGate(
  modelKey: string,
  candidateScore: number,
  baselineScore: number,
  options?: Partial<ReleaseGateCheckParams>
): ReleaseGateResult {
  return evaluateReleaseGate({
    entityType: "model",
    entityName: modelKey,
    candidateScore,
    baselineScore,
    ...options,
  });
}

/**
 * Logs a release gate evaluation to memory.
 */
export function logReleaseGateEvaluation(result: ReleaseGateResult): void {
  RELEASE_GATE_AUDIT_LOGS.unshift(result);
  if (RELEASE_GATE_AUDIT_LOGS.length > MAX_GATE_LOGS) {
    RELEASE_GATE_AUDIT_LOGS.pop();
  }
}

/**
 * Retrieves recent release gate audit records.
 */
export function getReleaseGateAuditLogs(limit: number = 20): ReleaseGateResult[] {
  return RELEASE_GATE_AUDIT_LOGS.slice(0, limit);
}

/**
 * Clears the release gate audit logs (useful for unit tests).
 */
export function clearReleaseGateLogs(): void {
  RELEASE_GATE_AUDIT_LOGS.length = 0;
}
