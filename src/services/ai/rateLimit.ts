import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash is the only rate-limit backend for connection mutations.
// Variable names are fixed by the deployment configuration.
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

const limiter =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(10, "10 m"),
        prefix: "ai-connections",
      })
    : null;

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; reason: "limited" | "unavailable" };

/** Max 10 save/retest calls per 10 minutes, per user AND per workspace. */
export async function allowConnectionMutation(
  userId: string,
  workspaceId: string
): Promise<RateLimitDecision> {
  // No backend => fail closed rather than silently allowing unlimited calls.
  if (!limiter) return { allowed: false, reason: "unavailable" };

  const [byUser, byWorkspace] = await Promise.all([
    limiter.limit(`user:${userId}`),
    limiter.limit(`workspace:${workspaceId}`),
  ]);
  return byUser.success && byWorkspace.success
    ? { allowed: true }
    : { allowed: false, reason: "limited" };
}
