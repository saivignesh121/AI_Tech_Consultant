import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, users, memberships } from "@/db/schema/business";
import {
  verifyPassword,
  createSession,
  checkRateLimit,
  recordFailedLogin,
  clearFailedLogin,
} from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Rate Limiting Check (Task Rule: Rate-limit login attempts)
    const rateCheck = checkRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds || 900} seconds.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Query User
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (!user || !user.passwordHash) {
      recordFailedLogin(cleanEmail);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 3. Verify Argon2 Password Hash (Task Rule: Check password against argon2 hash, never log password)
    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      recordFailedLogin(cleanEmail);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Credentials verified: clear rate limiter
    clearFailedLogin(cleanEmail);

    // 4. Resolve Business Memberships
    const userMemberships = await db
      .select({
        businessId: businesses.id,
        businessName: businesses.name,
        businessSlug: businesses.slug,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(businesses, eq(memberships.businessId, businesses.id))
      .where(eq(memberships.userId, user.id));

    if (userMemberships.length === 0) {
      // Fallback: Check if user has primary businessId attached directly
      const [fallbackBiz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, user.businessId))
        .limit(1);

      if (!fallbackBiz) {
        return NextResponse.json(
          { error: "No active business workspace found for this user account." },
          { status: 403 }
        );
      }

      userMemberships.push({
        businessId: fallbackBiz.id,
        businessName: fallbackBiz.name,
        businessSlug: fallbackBiz.slug,
        role: user.role || "owner",
      });
    }

    // 5. Single Business vs. Multi-Business Branching (Task Rule)
    if (userMemberships.length === 1) {
      // Direct access to Dashboard
      const targetBiz = userMemberships[0];
      const { token, expiresAt } = await createSession(user.id, targetBiz.businessId);

      const response = NextResponse.json({
        success: true,
        redirectUrl: "/",
        business: targetBiz,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
          role: targetBiz.role,
        },
      });

      const isProduction = process.env.NODE_ENV === "production";

      response.cookies.set("session_token", token, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        expires: expiresAt,
      });

      response.cookies.set("active_tenant_slug", targetBiz.businessSlug, {
        path: "/",
        httpOnly: false,
        secure: isProduction,
        sameSite: "lax",
        expires: expiresAt,
      });

      return response;
    } else {
      // Multiple businesses: Prompt user to choose workspace
      return NextResponse.json({
        success: true,
        requiresBusinessChoice: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
        },
        businesses: userMemberships,
        message: "Multiple workspaces found. Please select which business to open.",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Login failed", details: String(error) },
      { status: 500 }
    );
  }
}
