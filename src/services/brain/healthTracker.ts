/**
 * URL Health State Machine & Lifecycle Controller
 * Task 2.4: Active, Watch, Quarantined, Archived state transitions
 */

export type HealthStatus = "active" | "watch" | "quarantined" | "archived";

export interface HealthPolicy {
  watchThreshold: number; // consecutive failures to move to watch (default: 1)
  quarantineThreshold: number; // consecutive failures to move to quarantine (default: 2)
  archiveThreshold: number; // consecutive failures to move to archive (default: 15)
}

export const DEFAULT_HEALTH_POLICY: HealthPolicy = {
  watchThreshold: 1,
  quarantineThreshold: 2,
  archiveThreshold: 15,
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
      reason: "URL responded with HTTP 200 OK. Resetting failure counter.",
      isActionable: currentStatus !== "active",
    };
  }

  // Case 2: Permanent Redirect (301)
  if (httpStatus === 301 || httpStatus === 308) {
    return {
      previousStatus: currentStatus,
      newStatus: "quarantined",
      consecutiveFailures: currentFailures + 1,
      reason: "URL returned 301 Permanent Redirect. Old URL quarantined; redirect target followed.",
      isActionable: true,
    };
  }

  // Case 3: 404 Not Found or 500 Server Error
  const newFailures = currentFailures + 1;
  let newStatus: HealthStatus = currentStatus;

  if (newFailures >= policy.archiveThreshold) {
    newStatus = "archived";
  } else if (newFailures >= policy.quarantineThreshold) {
    newStatus = "quarantined";
  } else if (newFailures >= policy.watchThreshold) {
    newStatus = "watch";
  }

  return {
    previousStatus: currentStatus,
    newStatus,
    consecutiveFailures: newFailures,
    reason: `URL returned HTTP ${httpStatus}. Consecutive failures incremented to ${newFailures}.`,
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
