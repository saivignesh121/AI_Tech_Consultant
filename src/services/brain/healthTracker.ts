/**
 * URL Health State Machine & Lifecycle Controller
 * Task 2.4: Active, Watch, Quarantined, Archived state transitions
 */

export type HealthStatus = "active" | "watch" | "quarantined" | "archived";
export type ActionRule = "quarantine" | "archive" | "quarantine_then_archive";
export type RecheckSchedule = "daily" | "weekly" | "15_days" | "30_days";

export interface HealthPolicy {
  watchThreshold?: number; // consecutive failures to move to watch (default: 1)
  quarantineThreshold?: number; // consecutive failures to move to quarantine (default: 2)
  archiveThreshold?: number; // consecutive failures to move to archive (default: 15)
  failureThresholdX?: number; // user setting X (1, 2, 15, 30)
  actionRule?: ActionRule; // action rule after X
  recheckSchedule?: RecheckSchedule;
}

export const DEFAULT_HEALTH_POLICY: HealthPolicy = {
  watchThreshold: 1,
  quarantineThreshold: 2,
  archiveThreshold: 15,
  failureThresholdX: 2,
  actionRule: "quarantine_then_archive",
  recheckSchedule: "daily",
};

export interface HealthTransitionResult {
  previousStatus: HealthStatus;
  newStatus: HealthStatus;
  consecutiveFailures: number;
  reason: string;
  isActionable: boolean;
}

/**
 * Computes health level update given HTTP status code and consecutive failures.
 * Supports both classic thresholds and user-controlled X / actionRule policy.
 */
export function evaluateUrlHealth(
  currentStatus: HealthStatus,
  currentFailures: number,
  httpStatus: number,
  policy: HealthPolicy = DEFAULT_HEALTH_POLICY
): HealthTransitionResult {
  // Case 1: URL returns 200 OK or recovers
  if (httpStatus >= 200 && httpStatus < 300) {
    return {
      previousStatus: currentStatus,
      newStatus: "active",
      consecutiveFailures: 0,
      reason: "URL responded with HTTP 200 OK. Resetting failure counter to 0.",
      isActionable: currentStatus !== "active",
    };
  }

  // Case 2: Permanent Redirect (301 or 308)
  if (httpStatus === 301 || httpStatus === 308) {
    return {
      previousStatus: currentStatus,
      newStatus: "quarantined",
      consecutiveFailures: currentFailures + 1,
      reason: "URL returned 301 Permanent Redirect. Old URL quarantined; redirect target followed.",
      isActionable: true,
    };
  }

  // Case 3: 404 Not Found, 500 Server Error, or missing from sitemap
  const newFailures = currentFailures + 1;
  let newStatus: HealthStatus = currentStatus;

  const thresholdX = policy.failureThresholdX ?? policy.quarantineThreshold ?? 2;
  const actionRule = policy.actionRule ?? "quarantine_then_archive";

  if (actionRule === "archive") {
    if (newFailures >= thresholdX) {
      newStatus = "archived";
    } else {
      newStatus = "watch";
    }
  } else if (actionRule === "quarantine") {
    if (newFailures >= thresholdX) {
      newStatus = "quarantined";
    } else {
      newStatus = "watch";
    }
  } else {
    // quarantine_then_archive
    const archiveCutoff = policy.archiveThreshold ?? Math.max(thresholdX * 2, 4);
    if (newFailures >= archiveCutoff) {
      newStatus = "archived";
    } else if (newFailures >= thresholdX) {
      newStatus = "quarantined";
    } else {
      newStatus = "watch";
    }
  }

  return {
    previousStatus: currentStatus,
    newStatus,
    consecutiveFailures: newFailures,
    reason: `URL returned HTTP ${httpStatus}. Consecutive failures incremented to ${newFailures}. Status transitioned to ${newStatus}.`,
    isActionable: newStatus !== currentStatus,
  };
}

/**
 * Filter predicate verifying whether a URL is eligible for search retrieval.
 * Rule: Quarantined and Archived URLs NEVER appear in answers.
 */
export function isEligibleForSearch(healthStatus: HealthStatus): boolean {
  return healthStatus === "active" || healthStatus === "watch";
}


/**
 * Convenient alias for URL health status transitions.
 */
export function updateUrlHealthStatus(
  currentStatus: HealthStatus,
  httpStatus: number,
  currentFailures: number = 0,
  redirectUrl?: string
): {
  newStatus: HealthStatus;
  newFailures: number;
  redirectUrl?: string;
} {
  const res = evaluateUrlHealth(currentStatus, currentFailures, httpStatus);
  return {
    newStatus: res.newStatus,
    newFailures: res.consecutiveFailures,
    redirectUrl,
  };
}
