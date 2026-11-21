import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { modelCallLogs } from "@/db/schema/telemetry";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const taskType = searchParams.get("taskType");
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);

    const rows = await db
      .select()
      .from(modelCallLogs)
      .where(eq(modelCallLogs.businessId, tenant.businessId))
      .orderBy(desc(modelCallLogs.createdAt))
      .limit(limitParam);

    const filtered = taskType ? rows.filter((r) => r.taskType === taskType) : rows;

    // Calculate aggregated telemetry
    let totalSpend = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCached = 0;
    let totalDuration = 0;

    for (const r of rows) {
      totalSpend += parseFloat(r.costUsd);
      totalInput += r.inputTokens;
      totalOutput += r.outputTokens;
      totalCached += r.cachedReadTokens;
      totalDuration += r.durationMs;
    }

    const totalCalls = rows.length;
    const avgLatencyMs = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const cacheHitPercentage =
      totalInput > 0 ? Number(((totalCached / (totalInput + totalCached)) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      summary: {
        totalSpendUsd: Number(totalSpend.toFixed(6)),
        totalCalls,
        avgLatencyMs,
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
        totalCachedTokens: totalCached,
        cacheHitPercentage,
      },
      logs: filtered.map((l) => ({
        id: l.id,
        taskType: l.taskType,
        modelId: l.modelId,
        inputTokens: l.inputTokens,
        outputTokens: l.outputTokens,
        cachedReadTokens: l.cachedReadTokens,
        durationMs: l.durationMs,
        costUsd: l.costUsd,
        status: l.status,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch telemetry logs", details: String(error) },
      { status: 500 }
    );
  }
}
