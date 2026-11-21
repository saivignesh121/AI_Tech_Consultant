import { NextResponse } from "next/server";
import { enqueueJob } from "@/jobs/queue";

/**
 * Public Knowledge Brain Ingestion Trigger API
 * Task 2.8 & Task 2.2: Enqueues polite sitemap/URL scraping jobs.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, sitemapUrl, crawlSchedule = "daily" } = body;

    if (!businessId || !sitemapUrl) {
      return NextResponse.json(
        { error: "Both 'businessId' and 'sitemapUrl' are required" },
        { status: 400 }
      );
    }

    // Enqueue background crawl job with automatic retries (Task 1.5)
    const jobId = await enqueueJob("sitemap-crawler", businessId, {
      sitemapUrl,
      crawlSchedule,
    });

    return NextResponse.json({
      success: true,
      message: "Sitemap ingestion job scheduled successfully",
      jobId,
      businessId,
      sitemapUrl,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
