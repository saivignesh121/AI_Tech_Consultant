import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { knowledgePages } from "@/db/schema/knowledge";
import { updateUrlHealthStatus } from "@/services/brain/healthTracker";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    const pages = await db
      .select()
      .from(knowledgePages)
      .where(eq(knowledgePages.businessId, tenant.businessId));

    const activeCount = pages.filter((p) => p.healthStatus === "active").length;
    const watchCount = pages.filter((p) => p.healthStatus === "watch").length;
    const quarantinedCount = pages.filter((p) => p.healthStatus === "quarantined").length;
    const archivedCount = pages.filter((p) => p.healthStatus === "archived").length;
    const total = activeCount + watchCount + quarantinedCount + archivedCount;

    return NextResponse.json({
      summary: {
        total,
        active: activeCount,
        watch: watchCount,
        quarantined: quarantinedCount,
        archived: archivedCount,
        healthyPercent: total > 0 ? Number(((activeCount / total) * 100).toFixed(1)) : 100,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch health summary", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { pageId, simulatedStatus, redirectUrl } = body;

    if (!pageId) {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
    if (!isUuid) {
      return NextResponse.json({
        success: true,
        message: `Simulated status ${simulatedStatus} recorded for test page.`,
        simulated: true,
      });
    }

    const page = await db
      .select()
      .from(knowledgePages)
      .where(eq(knowledgePages.id, pageId))
      .then((rows) => rows[0]);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Call health tracker lifecycle state transition
    const healthUpdate = updateUrlHealthStatus(
      page.healthStatus as "active" | "watch" | "quarantined" | "archived",
      simulatedStatus || 200,
      page.consecutiveFailures,
      redirectUrl
    );

    await db
      .update(knowledgePages)
      .set({
        healthStatus: healthUpdate.newStatus,
        consecutiveFailures: healthUpdate.newFailures,
        httpStatus: simulatedStatus || 200,
        redirectUrl: redirectUrl || null,
        lastCheckedAt: new Date(),
      })
      .where(eq(knowledgePages.id, pageId));

    return NextResponse.json({
      success: true,
      previousStatus: page.healthStatus,
      newStatus: healthUpdate.newStatus,
      consecutiveFailures: healthUpdate.newFailures,
      message: `URL lifecycle transitioned from ${page.healthStatus} -> ${healthUpdate.newStatus}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update page health", details: String(error) },
      { status: 500 }
    );
  }
}
