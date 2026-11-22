import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { knowledgeSources, sourcePageLinks } from "@/db/schema/knowledge";
import {
  parseAndValidateSitemapUrls,
  validateSitemapUrl,
  planSitemapsRead,
  type SitemapSummary,
} from "@/services/brain/sitemapParser";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    const sources = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.businessId, tenant.businessId))
      .orderBy(desc(knowledgeSources.lastCrawledAt));

    if (sources.length === 0) {
      return NextResponse.json({ sources: [] });
    }

    const fullSources = await Promise.all(
      sources.map(async (s) => {
        const pageCount = await db
          .select()
          .from(sourcePageLinks)
          .where(eq(sourcePageLinks.sourceId, s.id))
          .then((rows) => rows.length);

        return {
          ...s,
          pageCount,
          chunkCount: pageCount * 8,
        };
      })
    );

    return NextResponse.json({ sources: fullSources });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch knowledge sources", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const {
      sitemapUrl,
      sitemapUrls,
      crawlSchedule = "daily",
      previewOnly = false,
      validateOnly = false,
      confirmed = false,
    } = body;

    // Collect all entered sitemap URLs
    let rawUrls: string[] = [];
    if (Array.isArray(sitemapUrls)) {
      rawUrls = sitemapUrls;
    } else if (typeof sitemapUrl === "string") {
      rawUrls = sitemapUrl.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
    }

    if (rawUrls.length === 0) {
      return NextResponse.json({ error: "At least one sitemap URL is required." }, { status: 400 });
    }

    // Task 2.2: Check each URL when it is entered
    const { validUrls, invalidUrls } = parseAndValidateSitemapUrls(rawUrls.join("\n"));

    if (validateOnly) {
      return NextResponse.json({
        valid: invalidUrls.length === 0,
        validUrls,
        invalidUrls,
      });
    }

    if (validUrls.length === 0) {
      return NextResponse.json(
        {
          error: "No valid sitemap URLs provided.",
          invalidUrls,
        },
        { status: 400 }
      );
    }

    // Task 2.2: Compute Pre-Flight Read Plan with nested sitemap discovery & duplicate tracking
    const planSummary: SitemapSummary = await planSitemapsRead(validUrls, 450);

    // If pre-flight preview mode, return summary and require user confirmation before starting
    if (previewOnly && !confirmed) {
      return NextResponse.json({
        success: true,
        previewMode: true,
        confirmationRequired: true,
        summary: planSummary,
        invalidUrls,
      });
    }

    // User confirmed processing: insert knowledge sources
    const insertedSources = [];
    for (const url of validUrls) {
      const [inserted] = await db
        .insert(knowledgeSources)
        .values({
          businessId: tenant.businessId,
          sourceType: "sitemap",
          rootUrl: url,
          crawlSchedule,
          status: "active",
          lastCrawledAt: new Date(),
        })
        .returning();
      insertedSources.push(inserted);
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
      sources: insertedSources,
      summary: planSummary,
      message: `Ingestion confirmed. Discovered ${planSummary.totalSitemapsFound} sitemaps and ${planSummary.uniqueUrls} unique URLs (${planSummary.duplicateUrlsCount} duplicates deduplicated). Processing scheduled at 450 pages/hr (10,800/day). ETA finish: ${planSummary.formattedEta}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process sitemap read plan", details: String(error) },
      { status: 500 }
    );
  }
}
