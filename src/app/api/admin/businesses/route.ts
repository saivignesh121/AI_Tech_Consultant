import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { businesses, users, memberships } from "@/db/schema/business";
import { modelCallLogs, failedJobs } from "@/db/schema/telemetry";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    // Verify Platform Admin role
    if (tenant.userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Platform Admin privileges required." },
        { status: 403 }
      );
    }

    // 1. Fetch all tenant businesses (metadata only - strict zero-leakage guarantee)
    const allBusinesses = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        readinessScore: businesses.readinessScore,
        status: businesses.status,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .orderBy(desc(businesses.createdAt));

    // 2. Fetch usage & cost aggregation per business
    const usageData = await db
      .select({
        businessId: modelCallLogs.businessId,
        callCount: sql<number>`count(*)::int`,
        totalSpend: sql<number>`coalesce(sum(cost_usd::numeric), 0)::float`,
      })
      .from(modelCallLogs)
      .groupBy(modelCallLogs.businessId);

    const usageMap = new Map<string, { calls: number; spend: number }>();
    for (const u of usageData) {
      usageMap.set(u.businessId, { calls: u.callCount, spend: u.totalSpend });
    }

    // Combine business rows with aggregate telemetry
    const businessList = allBusinesses.map((b) => {
      const stats = usageMap.get(b.id) || { calls: 0, spend: 0 };
      return {
        ...b,
        totalCalls: stats.calls,
        totalSpendUsd: Number(stats.spend.toFixed(4)),
      };
    });

    // 3. Fetch failed background jobs across the fleet
    const recentFailedJobs = await db
      .select({
        id: failedJobs.id,
        businessId: failedJobs.businessId,
        queueName: failedJobs.queueName,
        retryCount: failedJobs.retryCount,
        lastAttemptAt: failedJobs.lastAttemptAt,
        errorStack: failedJobs.errorStack,
      })
      .from(failedJobs)
      .orderBy(desc(failedJobs.lastAttemptAt))
      .limit(20);

    // Fleet Summary
    const totalCalls = businessList.reduce((acc, b) => acc + b.totalCalls, 0);
    const totalSpendUsd = businessList.reduce((acc, b) => acc + b.totalSpendUsd, 0);
    const suspendedCount = businessList.filter((b) => b.status === "suspended").length;

    return NextResponse.json({
      success: true,
      businesses: businessList,
      failedJobs: recentFailedJobs,
      fleetSummary: {
        totalBusinesses: businessList.length,
        activeBusinesses: businessList.length - suspendedCount,
        suspendedBusinesses: suspendedCount,
        totalCalls,
        totalSpendUsd: Number(totalSpendUsd.toFixed(4)),
        failedJobCount: recentFailedJobs.length,
      },
    });
  } catch (error) {
    console.error("Admin fleet error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve platform fleet data", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();

    if (tenant.userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Platform Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, businessId } = body;

    if (action === "toggle_suspend") {
      if (!businessId) {
        return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
      }

      const existing = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
      }

      const nextStatus = existing[0].status === "suspended" ? "active" : "suspended";

      await db
        .update(businesses)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(businesses.id, businessId));

      return NextResponse.json({
        success: true,
        businessId,
        status: nextStatus,
        message: `Business ${existing[0].name} is now ${nextStatus}.`,
      });
    }

    if (action === "seed_demo") {
      // Seed Acme Corporation and Beta Dynamics if they don't exist
      const acmeExists = await db
        .select()
        .from(businesses)
        .where(eq(businesses.slug, "acme-corp"))
        .limit(1);

      if (acmeExists.length === 0) {
        const [acme] = await db
          .insert(businesses)
          .values({
            id: "11111111-1111-4111-8111-111111111111",
            name: "Acme Corporation",
            slug: "acme-corp",
            readinessScore: 82,
            status: "active",
          })
          .returning();

        const [acmeUser] = await db
          .insert(users)
          .values({
            id: "aaaaaaaa-1111-4111-8111-111111111111",
            businessId: acme.id,
            email: "alex@acme.com",
            name: "Alex Vance",
            role: "owner",
          })
          .returning();

        await db.insert(memberships).values({
          userId: acmeUser.id,
          businessId: acme.id,
          role: "owner",
        });
      }

      const betaExists = await db
        .select()
        .from(businesses)
        .where(eq(businesses.slug, "beta-dynamics"))
        .limit(1);

      if (betaExists.length === 0) {
        const [beta] = await db
          .insert(businesses)
          .values({
            id: "22222222-2222-4222-8222-222222222222",
            name: "Beta Dynamics",
            slug: "beta-dynamics",
            readinessScore: 65,
            status: "active",
          })
          .returning();

        const [betaUser] = await db
          .insert(users)
          .values({
            id: "bbbbbbbb-2222-4222-8222-222222222222",
            businessId: beta.id,
            email: "sarah@beta-tech.com",
            name: "Sarah Connor",
            role: "owner",
          })
          .returning();

        await db.insert(memberships).values({
          userId: betaUser.id,
          businessId: beta.id,
          role: "owner",
        });
      }

      return NextResponse.json({
        success: true,
        message: "Demo businesses (Acme Corporation & Beta Dynamics) seeded successfully.",
      });
    }

    return NextResponse.json({ error: "Unsupported admin action" }, { status: 400 });
  } catch (error) {
    console.error("Admin action failed:", error);
    return NextResponse.json(
      { error: "Admin operation failed", details: String(error) },
      { status: 500 }
    );
  }
}
