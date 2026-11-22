import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, UserRole } from "@/lib/auth";
import { db } from "@/db";
import { memberships, users } from "@/db/schema/business";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role } = body;

    const validRoles: UserRole[] = ["owner", "team", "expert", "admin"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const tenant = await getTenantContext();

    // If tenant has a real userId, also update memberships/users table
    if (tenant.userId && tenant.businessId) {
      try {
        await db
          .update(memberships)
          .set({ role })
          .where(
            and(
              eq(memberships.userId, tenant.userId),
              eq(memberships.businessId, tenant.businessId)
            )
          );

        await db
          .update(users)
          .set({ role })
          .where(eq(users.id, tenant.userId));
      } catch (dbErr) {
        console.warn("Notice: DB role update skipped:", dbErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      role,
      message: `Active persona switched to ${role.toUpperCase()}`,
      activeTenant: {
        ...tenant,
        userRole: role,
      },
    });

    // Set cookie for instant testing across all endpoints
    response.cookies.set("active_test_role", role, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("Failed to switch role:", err);
    return NextResponse.json(
      { error: "Failed to switch role." },
      { status: 500 }
    );
  }
}
