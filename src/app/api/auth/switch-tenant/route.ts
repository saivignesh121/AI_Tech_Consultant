import { NextRequest, NextResponse } from "next/server";
import { DEMO_BUSINESSES } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantSlug } = body;

    if (!tenantSlug || !DEMO_BUSINESSES[tenantSlug]) {
      return NextResponse.json(
        { error: "Invalid tenant slug. Supported: 'acme-corp', 'beta-dynamics'" },
        { status: 400 }
      );
    }

    const tenant = DEMO_BUSINESSES[tenantSlug];
    const response = NextResponse.json({
      success: true,
      activeTenant: tenant,
      message: `Switched active workspace to ${tenant.businessName}`,
    });

    // Set cookie on response
    response.cookies.set("active_tenant_slug", tenantSlug, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to switch tenant", details: String(error) },
      { status: 500 }
    );
  }
}
