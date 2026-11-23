import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { businesses, memberships } from "@/db/schema/business";
import { createSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";

// The pending_login cookie is issued by /api/auth/login only for the
// multi-business picker. It carries the user id + expiry, signed with
// the existing ENCRYPTION_KEY. It is not a session and grants no tenant
// access by itself. Missing key => fail closed (no default/hardcoded key).
function verifyPendingLogin(value?: string): string | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAtRaw, signatureHex] = parts;
  if (!userId || !/^\d+$/.test(expiresAtRaw)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return null;

  const expected = createHmac("sha256", key)
    .update(`${userId}.${expiresAtRaw}`)
    .digest("hex");
  const provided = Buffer.from(signatureHex, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (
    provided.length !== expectedBuf.length ||
    !timingSafeEqual(provided, expectedBuf)
  ) {
    return null;
  }

  return userId;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required." }, { status: 400 });
    }

    // Identity comes only from the verified pending_login cookie. The
    // client-supplied userId in the body is deliberately ignored.
    const cookieStore = await cookies();
    const userId = verifyPendingLogin(cookieStore.get("pending_login")?.value);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Verify user membership in the requested business
    const [membership] = await db
      .select({
        role: memberships.role,
        businessId: businesses.id,
        businessName: businesses.name,
        businessSlug: businesses.slug,
      })
      .from(memberships)
      .innerJoin(businesses, eq(memberships.businessId, businesses.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.businessId, businessId)))
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You do not belong to this business workspace." },
        { status: 403 }
      );
    }

    // Create session in Postgres
    const { token, expiresAt } = await createSession(userId, membership.businessId);

    // Check readiness score (<85% goes to /onboarding, >=85% goes to role-appropriate dashboard)
    let readinessScore = 0;
    try {
      const [biz] = await db
        .select({ readinessScore: businesses.readinessScore })
        .from(businesses)
        .where(eq(businesses.id, membership.businessId))
        .limit(1);
      readinessScore = biz?.readinessScore ?? 0;
    } catch (_e) {
      readinessScore = 100;
    }

    let redirectUrl = "/";
    if (readinessScore < 85) {
      redirectUrl = "/onboarding";
    } else {
      if (membership.role === "expert") {
        redirectUrl = "/approvals";
      } else if (membership.role === "team" || membership.role === "member") {
        redirectUrl = "/chat";
      } else {
        redirectUrl = "/evals";
      }
    }

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      business: membership,
      readinessScore,
      message: `Workspace switched to ${membership.businessName}`,
    });

    const isSecure = process.env.COOKIE_SECURE === "true";

    response.cookies.set("session_token", token, {
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      expires: expiresAt,
    });

    response.cookies.set("business_id", membership.businessId, {
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      expires: expiresAt,
    });

    response.cookies.set("user_id", userId, {
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      expires: expiresAt,
    });

    response.cookies.set("user_role", membership.role, {
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      expires: expiresAt,
    });

    response.cookies.set("active_tenant_slug", membership.businessSlug, {
      path: "/",
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      expires: expiresAt,
    });

    // The pending_login credential is single-use: clear it on success so it
    // cannot be replayed to mint another session for this user.
    response.cookies.delete("pending_login");

    return response;
  } catch (error) {
    console.error("Failed to select business:", error);
    return NextResponse.json(
      { error: "Failed to select business" },
      { status: 500 }
    );
  }
}
