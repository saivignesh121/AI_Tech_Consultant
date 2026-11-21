import { NextResponse } from "next/server";
import { getTenantContext, DEMO_BUSINESSES } from "@/lib/auth";

export async function GET() {
  const currentTenant = await getTenantContext();
  const workspaces = Object.values(DEMO_BUSINESSES).map((t) => ({
    businessId: t.businessId,
    businessName: t.businessName,
    businessSlug: t.businessSlug,
    userEmail: t.userEmail,
    userRole: t.userRole,
  }));

  return NextResponse.json({
    currentTenant,
    workspaces,
  });
}
