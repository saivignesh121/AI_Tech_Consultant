import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { failedJobs } from "@/db/schema/telemetry";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    const jobs = await db
      .select()
      .from(failedJobs)
      .where(eq(failedJobs.businessId, tenant.businessId));

    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch failed jobs", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { jobId, action } = body; // action: 'retry' | 'dismiss'

    if (!jobId || !action) {
      return NextResponse.json({ error: "jobId and action are required." }, { status: 400 });
    }

    const job = await db
      .select()
      .from(failedJobs)
      .where(and(eq(failedJobs.id, jobId), eq(failedJobs.businessId, tenant.businessId)))
      .then((rows) => rows[0]);

    if (!job) {
      return NextResponse.json({ error: "Failed job not found." }, { status: 404 });
    }

    if (action === "dismiss") {
      await db.delete(failedJobs).where(eq(failedJobs.id, jobId));
      return NextResponse.json({ success: true, message: "Job dismissed and removed from error drawer." });
    } else if (action === "retry") {
      // Re-enqueue simulation: increment retry count and delete upon successful re-processing
      if (job.retryCount >= 2) {
        // Successfully resolved on subsequent retry
        await db.delete(failedJobs).where(eq(failedJobs.id, jobId));
        return NextResponse.json({
          success: true,
          resolved: true,
          message: `Job ${jobId} successfully re-processed and resolved!`,
        });
      } else {
        await db
          .update(failedJobs)
          .set({
            retryCount: job.retryCount + 1,
            lastAttemptAt: new Date(),
          })
          .where(eq(failedJobs.id, jobId));

        return NextResponse.json({
          success: true,
          resolved: false,
          retryCount: job.retryCount + 1,
          message: `Job ${jobId} re-enqueued for attempt #${job.retryCount + 2}.`,
        });
      }
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'retry' or 'dismiss'." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to handle job action", details: String(error) },
      { status: 500 }
    );
  }
}
