import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, users, memberships } from "@/db/schema/business";
import { hashPassword, createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, businessName } = body;

    // 1. Input Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Full name must be at least 2 characters." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (!businessName || typeof businessName !== "string" || businessName.trim().length < 2) {
      return NextResponse.json({ error: "Business name must be at least 2 characters." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanBizName = businessName.trim();

    // 2. Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // 3. Generate unique business slug
    let baseSlug = cleanBizName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = "biz";
    
    // Check for collision
    const existingSlug = await db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, baseSlug))
      .limit(1);

    const slug = existingSlug.length > 0 ? `${baseSlug}-${crypto.randomBytes(2).toString("hex")}` : baseSlug;

    // 4. Hash password with argon2
    const passwordHash = await hashPassword(password);

    // 5. Execute in single database transaction
    const result = await db.transaction(async (tx) => {
      // 5a. Create Business
      const [newBiz] = await tx
        .insert(businesses)
        .values({
          name: cleanBizName,
          slug,
          readinessScore: 0,
        })
        .returning();

      // 5b. Create User
      const [newUser] = await tx
        .insert(users)
        .values({
          email: cleanEmail,
          name: cleanName,
          passwordHash,
          businessId: newBiz.id,
          role: "owner",
        })
        .returning();

      // 5c. Create Owner Membership
      await tx
        .insert(memberships)
        .values({
          userId: newUser.id,
          businessId: newBiz.id,
          role: "owner",
        });

      return { newBiz, newUser };
    });

    // 6. Create PostgreSQL Session
    const { token, expiresAt } = await createSession(result.newUser.id, result.newBiz.id);

    // 7. Set HttpOnly, Secure Session Cookie and redirect to Go Live setup wizard (/onboarding)
    const response = NextResponse.json({
      success: true,
      redirectUrl: "/onboarding",
      business: {
        id: result.newBiz.id,
        name: result.newBiz.name,
        slug: result.newBiz.slug,
      },
      user: {
        id: result.newUser.id,
        email: result.newUser.email,
        name: result.newUser.name,
      },
      message: `Welcome to AI Tech Consultant! Workspace ${result.newBiz.name} initialized.`,
    });

    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set("session_token", token, {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      expires: expiresAt,
    });

    response.cookies.set("active_tenant_slug", result.newBiz.slug, {
      path: "/",
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Registration failed", details: String(error) },
      { status: 500 }
    );
  }
}
