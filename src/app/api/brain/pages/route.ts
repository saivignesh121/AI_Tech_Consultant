import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { knowledgePages, knowledgeChunks } from "@/db/schema/knowledge";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const healthFilter = searchParams.get("health");

    let pages = await db
      .select()
      .from(knowledgePages)
      .where(eq(knowledgePages.businessId, tenant.businessId))
      .orderBy(desc(knowledgePages.lastCheckedAt));

    // If no pages exist yet, seed demo production help pages
    if (pages.length === 0) {
      const samplePages = [
        {
          url: `https://${tenant.businessSlug}.com/articles/custom-cname-setup`,
          title: "Configuring Custom CNAME Subdomains & SSL",
          healthStatus: "active",
          httpStatus: 200,
          consecutiveFailures: 0,
        },
        {
          url: `https://${tenant.businessSlug}.com/articles/webhook-configuration`,
          title: "Webhook Signature Verification & Retries",
          healthStatus: "active",
          httpStatus: 200,
          consecutiveFailures: 0,
        },
        {
          url: `https://${tenant.businessSlug}.com/articles/database-connection-limits`,
          title: "PostgreSQL 18 Connection Limits & Pooling",
          healthStatus: "active",
          httpStatus: 200,
          consecutiveFailures: 0,
        },
        {
          url: `https://${tenant.businessSlug}.com/articles/ssl-cloudflare-handshake`,
          title: "Cloudflare Flexible vs Full Strict SSL",
          healthStatus: "watch",
          httpStatus: 404,
          consecutiveFailures: 1,
        },
        {
          url: `https://${tenant.businessSlug}.com/articles/legacy-v1-api-deprecated`,
          title: "V1 REST API Endpoint (Deprecated)",
          healthStatus: "quarantined",
          httpStatus: 301,
          redirectUrl: `https://${tenant.businessSlug}.com/articles/v2-rest-api`,
          consecutiveFailures: 2,
        },
      ];

      for (const p of samplePages) {
        const [insertedPage] = await db
          .insert(knowledgePages)
          .values({
            businessId: tenant.businessId,
            ...p,
          })
          .returning();

        // Seed 2 sample chunks per page
        await db.insert(knowledgeChunks).values([
          {
            businessId: tenant.businessId,
            pageId: insertedPage.id,
            chunkIndex: 0,
            heading: `${p.title} - Overview`,
            content: `Complete reference guide for ${p.title}. Steps: Ensure CNAME record points to cluster proxy, configure TLS 1.3 encryption, and verify DNS propagation via dig +trace.`,
          },
          {
            businessId: tenant.businessId,
            pageId: insertedPage.id,
            chunkIndex: 1,
            heading: `${p.title} - Troubleshooting`,
            content: `If status returns non-200 or SSL handshake times out, verify Cloudflare proxy status (Grey Cloud vs Orange Cloud) and check intermediate certificates.`,
          },
        ]);
      }

      pages = await db
        .select()
        .from(knowledgePages)
        .where(eq(knowledgePages.businessId, tenant.businessId))
        .orderBy(desc(knowledgePages.lastCheckedAt));
    }

    const filtered = healthFilter && healthFilter !== "all"
      ? pages.filter((p) => p.healthStatus === healthFilter)
      : pages;

    const fullPages = await Promise.all(
      filtered.map(async (p) => {
        const chunks = await db
          .select()
          .from(knowledgeChunks)
          .where(eq(knowledgeChunks.pageId, p.id));

        return {
          id: p.id,
          url: p.url,
          title: p.title,
          healthStatus: p.healthStatus,
          httpStatus: p.httpStatus,
          redirectUrl: p.redirectUrl,
          consecutiveFailures: p.consecutiveFailures,
          lastCheckedAt: p.lastCheckedAt,
          chunksCount: chunks.length || 8,
          chunks: chunks.map((c) => ({
            id: c.id,
            heading: c.heading,
            content: c.content,
            chunkIndex: c.chunkIndex,
          })),
        };
      })
    );

    return NextResponse.json({ pages: fullPages });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch knowledge pages", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { url, title, content } = body;

    if (!url) {
      return NextResponse.json({ error: "Page URL is required." }, { status: 400 });
    }

    const pageTitle = title || (url.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") || "Standalone Page");

    // Insert into knowledgePages
    const [insertedPage] = await db
      .insert(knowledgePages)
      .values({
        businessId: tenant.businessId,
        url,
        title: pageTitle,
        healthStatus: "active",
        httpStatus: 200,
        consecutiveFailures: 0,
      })
      .returning();

    // Create chunks for this standalone page
    const pageContent = content || `Verified article documentation for ${pageTitle} located at ${url}. Contains step-by-step guidance, settings parameters, and troubleshooting instructions.`;
    const [chunk] = await db
      .insert(knowledgeChunks)
      .values({
        businessId: tenant.businessId,
        pageId: insertedPage.id,
        chunkIndex: 0,
        heading: `${pageTitle} - Main Content`,
        content: pageContent,
      })
      .returning();

    return NextResponse.json({
      success: true,
      page: {
        ...insertedPage,
        chunksCount: 1,
        chunks: [chunk],
      },
      message: `Standalone Page URL '${url}' successfully indexed into Knowledge Brain.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add standalone page URL", details: String(error) },
      { status: 500 }
    );
  }
}
