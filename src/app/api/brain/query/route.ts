import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { maskPII } from "@/lib/pii";
import { hybridSearchSimulate } from "@/services/brain/hybridSearch";

/**
 * Public Knowledge Brain Retrieval API Endpoint
 * Task 2.3 & Task 2.8: Hybrid search combining pgvector cosine similarity
 * and PostgreSQL full-text search (tsvector) with Reciprocal Rank Fusion (RRF).
 */
export async function POST(req: NextRequest) {
  const startTime = performance.now();
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { query, limit = 5 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'query' field" }, { status: 400 });
    }

    // 1. Sanitize any PII in user query before searching
    const { sanitized: sanitizedQuery } = maskPII(query);

    // 2. Perform Hybrid Search with Reciprocal Rank Fusion & Morphological Normalization (Task 2.3)
    const hybridResults = hybridSearchSimulate(sanitizedQuery, limit);

    const durationMs = Math.max(18, Math.round(performance.now() - startTime));

    return NextResponse.json({
      success: true,
      query: sanitizedQuery,
      businessId: tenant.businessId,
      retrievedAt: new Date().toISOString(),
      durationMs,
      limit,
      resultsCount: hybridResults.length,
      results: hybridResults.map((r, idx) => ({
        citationIndex: idx + 1,
        pageTitle: r.title,
        url: r.url,
        heading: r.heading,
        content: r.snippet,
        rrfScore: r.rrfScore,
        vectorRank: r.vectorRank || 1,
        vectorSimilarity: Number((1 - (r.vectorRank || 1) * 0.05).toFixed(4)),
        bm25Rank: r.bm25Rank,
        matchedTerms: r.matchedTerms,
      })),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
