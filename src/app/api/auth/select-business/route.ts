import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, memberships } from "@/db/schema/business";
import { createSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, businessId } = body;

    if (!userId || !businessId) {
      return NextResponse.json({ error: "userId and businessId are required." }, { status: 400 });
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

    const response = NextResponse.json({
      success: true,
      redirectUrl: "/",
      business: membership,
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

    response.cookies.set("active_tenant_slug", membership.businessSlug, {
      path: "/",
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to select business", details: String(error) },
      { status: 500 }
    );
  }
}
