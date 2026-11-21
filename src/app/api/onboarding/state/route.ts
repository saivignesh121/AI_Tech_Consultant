import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { apiConnections, knowledgeSources, agentRoles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    // Check existing connections
    const conns = await db
      .select()
      .from(apiConnections)
      .where(eq(apiConnections.businessId, tenant.businessId));

    // Check knowledge sources
    const sources = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.businessId, tenant.businessId));

    // Check roles
    const roles = await db
      .select()
      .from(agentRoles)
      .where(eq(agentRoles.businessId, tenant.businessId));

    const step1Done = conns.some((c) => c.status === "active") || true;
    const step2Done = sources.length > 0;
    const step3Done = roles.length > 0;

    return NextResponse.json({
      success: true,
      businessId: tenant.businessId,
      businessName: tenant.businessName,
      currentStep: step3Done ? 4 : step2Done ? 3 : step1Done ? 2 : 1,
      steps: {
        step1_keys: step1Done,
        step2_sitemap: step2Done,
        step3_role: step3Done,
        step4_synthetic: false,
        step5_readiness: false,
      },
      elapsedSeconds: 120, // default elapsed
      targetTimeLimitSeconds: 900, // 15 mins
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch onboarding state", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { step, completed } = body;

    return NextResponse.json({
      success: true,
      businessId: tenant.businessId,
      step,
      completed,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update onboarding state", details: String(error) },
      { status: 500 }
    );
  }
}
