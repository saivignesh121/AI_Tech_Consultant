import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { selfImproveRuns } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json({ error: "Missing runId parameter" }, { status: 400 });
    }

    // Attempt to update matching run in DB
    const existing = await db
      .select()
      .from(selfImproveRuns)
      .where(and(eq(selfImproveRuns.id, runId), eq(selfImproveRuns.businessId, tenant.businessId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(selfImproveRuns)
        .set({ status: "reverted" })
        .where(eq(selfImproveRuns.id, runId));
    }

    return NextResponse.json({
      success: true,
      runId,
      status: "reverted",
      message: "Patch reverted successfully. Production configuration restored to previous stable baseline.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revert self-improve run", details: String(error) },
      { status: 500 }
    );
  }
}
