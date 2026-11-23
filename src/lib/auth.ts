import { cookies } from "next/headers";
import { db } from "../db";
import { businesses, users, memberships, sessions } from "../db/schema/business";
import { eq, and, gt } from "drizzle-orm";
import * as argon2 from "argon2";
import crypto from "crypto";

export type UserRole = "owner" | "admin" | "team" | "expert" | "member" | "customer";

export interface TenantContext {
  businessId: string;
  businessName: string;
  businessSlug: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
}

export const DEMO_BUSINESSES: Record<string, TenantContext> = {
  "acme-corp": {
    businessId: "11111111-1111-4111-8111-111111111111",
    businessName: "Acme Corporation",
    businessSlug: "acme-corp",
    userId: "aaaaaaaa-1111-4111-8111-111111111111",
    userEmail: "alex@acme.com",
    userRole: "owner",
  },
  "beta-dynamics": {
    businessId: "22222222-2222-4222-8222-222222222222",
    businessName: "Beta Dynamics",
    businessSlug: "beta-dynamics",
    userId: "bbbbbbbb-2222-4222-8222-222222222222",
    userEmail: "sarah@beta-tech.com",
    userRole: "owner",
  },
};

export const DEFAULT_TENANT = DEMO_BUSINESSES["acme-corp"];

// --- Password Hashing with Argon2 ---
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// --- Postgres Session Management ---
export async function createSession(userId: string, businessId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = `sess_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  try {
    await db.insert(sessions).values({
      id: token,
      userId,
      businessId,
      expiresAt,
    });
  } catch (err) {
    console.error("Failed to persist session to Postgres:", err);
  }

  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  try {
    await db.delete(sessions).where(eq(sessions.id, token));
  } catch (err) {
    console.error("Failed to delete session:", err);
  }
}

// --- Rate Limiting for Login Attempts (In-Memory Sliding Window) ---
interface RateLimitEntry {
  attempts: number;
  blockedUntil: number;
}

const loginRateLimits = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginRateLimits.get(identifier);

  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (entry.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    // Reset if block expired
    loginRateLimits.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - entry.attempts };
}

export function recordFailedLogin(identifier: string): void {
  const now = Date.now();
  const entry = loginRateLimits.get(identifier) || { attempts: 0, blockedUntil: 0 };
  entry.attempts += 1;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
  }

  loginRateLimits.set(identifier, entry);
}

export function clearFailedLogin(identifier: string): void {
  loginRateLimits.delete(identifier);
}

// Clear all rate limits (for testing purposes)
export function resetAllRateLimits(): void {
  loginRateLimits.clear();
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Resolves the authenticated business tenant context from the HttpOnly
 * session cookie backed by the Postgres `sessions` table.
 * Fails closed: without a valid session this throws `UnauthorizedError`
 * instead of falling back to a demo tenant.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) {
    throw new UnauthorizedError("Unauthorized: no valid session");
  }

  try {
    const now = new Date();
    const activeSessions = await db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        businessId: sessions.businessId,
        businessName: businesses.name,
        businessSlug: businesses.slug,
        userEmail: users.email,
        userRole: memberships.role,
      })
      .from(sessions)
      .innerJoin(businesses, eq(sessions.businessId, businesses.id))
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(
        memberships,
        and(
          eq(memberships.userId, sessions.userId),
          eq(memberships.businessId, sessions.businessId)
        )
      )
      .where(and(eq(sessions.id, sessionToken), gt(sessions.expiresAt, now)))
      .limit(1);

    if (activeSessions.length > 0) {
      const row = activeSessions[0];

      return {
        businessId: row.businessId,
        businessName: row.businessName,
        businessSlug: row.businessSlug,
        userId: row.userId,
        userEmail: row.userEmail,
        userRole: (row.userRole as UserRole) || "team",
      };
    }
  } catch (dbErr) {
    // A session-store failure must never grant access. Fail closed below.
    console.error("Session lookup failed:", dbErr);
  }

  throw new UnauthorizedError("Unauthorized: invalid or expired session");
}
