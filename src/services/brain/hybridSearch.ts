import { KnowledgeChunkItem } from "./chunker";

/**
 * Hybrid Search & Reciprocal Rank Fusion (RRF) Engine
 * Task 2.1 & Task 2.7: Keyword search + Vector search combined with RRF re-ranking.
 * Handles morphological variants ("custom" vs "customize") and minor typos.
 * Attribution Rule: Every answer/result shows which type of knowledge it used:
 * [sitemap], [page_url], [instruction], [skill], [past_email]
 */

export type KnowledgeType = "sitemap" | "page_url" | "instruction" | "skill" | "past_email" | "email";

export function getAttributionBadge(type: string): string {
  switch (type) {
    case "page_url":
      return "[page_url]";
    case "instruction":
      return "[instruction]";
    case "skill":
      return "[skill]";
    case "past_email":
    case "email":
      return "[past_email]";
    case "sitemap":
    default:
      return "[sitemap]";
  }
}

export interface ScoredSearchResult {
  chunk: KnowledgeChunkItem;
  pageUrl: string;
  sourceType: KnowledgeType;
  attributionBadge: string;
  vectorScore: number;
  keywordScore: number;
  rrfScore: number;
  // Metadata for UI presentation
  title?: string;
  url?: string;
  heading?: string;
  snippet?: string;
  vectorRank?: number;
  bm25Rank?: number;
  matchedTerms?: string[];
}

export interface CorpusItem {
  chunk: KnowledgeChunkItem;
  pageUrl: string;
  sourceType: KnowledgeType;
  simulatedVectorScore: number;
  healthStatus: "active" | "watch" | "quarantined" | "archived";
}

export const DEFAULT_CORPUS: CorpusItem[] = [
  // 1. Sitemap (Knowledge Type 1)
  {
    chunk: {
      chunkIndex: 0,
      heading: "Custom CNAME Subdomains & SSL Setup",
      content: "To configure your custom domain, point your CNAME record to the proxy cluster. Ensure Cloudflare proxy status is set properly during certificate issuance.",
    },
    pageUrl: "https://support.example.com/articles/custom-cname-setup",
    sourceType: "sitemap",
    simulatedVectorScore: 0.95,
    healthStatus: "active",
  },
  // 2. Standalone Page URL (Knowledge Type 2)
  {
    chunk: {
      chunkIndex: 1,
      heading: "Webhook Signature Verification",
      content: "Verify HMAC SHA-256 signatures on incoming webhook deliveries using your shared signing secret.",
    },
    pageUrl: "https://support.example.com/articles/webhook-configuration",
    sourceType: "page_url",
    simulatedVectorScore: 0.91,
    healthStatus: "active",
  },
  // 3. Human Instruction (Knowledge Type 3)
  {
    chunk: {
      chunkIndex: 2,
      heading: "Refund Escalation Policy",
      content: "Never promise a refund. Send every refund question to the Billing team for human approval and review.",
    },
    pageUrl: "internal://instructions/refund-escalation",
    sourceType: "instruction",
    simulatedVectorScore: 0.94,
    healthStatus: "active",
  },
  // 4. Standard Operating Procedure / Skill (Knowledge Type 4)
  {
    chunk: {
      chunkIndex: 3,
      heading: "DNS & Custom CNAME Setup SOP",
      content: "1. Log into your DNS provider. 2. Create CNAME app -> proxy.example.com. 3. Turn off orange cloud during validation. 4. Verify with dig.",
    },
    pageUrl: "internal://skills/dns-setup",
    sourceType: "skill",
    simulatedVectorScore: 0.92,
    healthStatus: "active",
  },
  // 5. Past Email Thread (Knowledge Type 5)
  {
    chunk: {
      chunkIndex: 4,
      heading: "Re: Need assistance with CNAME setup for staging subdomain",
      content: "Customer forgot to select Full (Strict) SSL mode in Cloudflare. Always remind customers to switch from Flexible to Full (Strict).",
    },
    pageUrl: "gmail://threads/thread-gmail-001",
    sourceType: "past_email",
    simulatedVectorScore: 0.89,
    healthStatus: "active",
  },
  // Quarantined page (Must be filtered out)
  {
    chunk: {
      chunkIndex: 5,
      heading: "Deprecated V1 API",
      content: "Legacy REST endpoint is no longer supported.",
    },
    pageUrl: "https://support.example.com/articles/legacy-v1-api-deprecated",
    sourceType: "sitemap",
    simulatedVectorScore: 0.99,
    healthStatus: "quarantined",
  },
];

/**
 * Normalizes text and reduces English word variants (e.g. "custom", "customize", "customizing" -> "custom").
 */
export function normalizeToken(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/(?:izing|ized|izes|ize|ation|ations|ing|ly|ed|es|s)$/, "");
}

/**
 * Simple lexical BM25-style keyword scoring with fuzzy synonym/stem normalization.
 */
export function calculateKeywordScore(query: string, content: string): number {
  const queryTokens = query.split(/\s+/).map(normalizeToken).filter((t) => t.length > 1);
  const contentTokens = content.split(/\s+/).map(normalizeToken).filter(Boolean);

  if (queryTokens.length === 0 || contentTokens.length === 0) return 0;

  const contentSet = new Set(contentTokens);
  let matches = 0;

  for (const q of queryTokens) {
    if (contentSet.has(q)) {
      matches++;
    }
  }

  return matches / queryTokens.length;
}

/**
 * Computes Reciprocal Rank Fusion (RRF) between dense rank and sparse rank:
 * RRF Score = 1 / (k + denseRank) + 1 / (k + sparseRank)
 */
export function computeRRFScore(denseRank: number, sparseRank: number, k: number = 60): number {
  return 1 / (k + denseRank) + 1 / (k + sparseRank);
}

export const calculateRrfScore = computeRRFScore;

/**
 * In-memory Hybrid Search simulator for unit testing, offline evals, and sandbox UI.
 */
export function hybridSearchSimulate(
  query: string,
  corpusOrLimit?: CorpusItem[] | number,
  limitParam?: number
): ScoredSearchResult[] {
  const corpus = Array.isArray(corpusOrLimit) ? corpusOrLimit : DEFAULT_CORPUS;
  const limit = typeof corpusOrLimit === "number" ? corpusOrLimit : limitParam || 5;

  // 1. Strict Health Filtering: Quarantined & Archived pages NEVER appear
  const activeCorpus = corpus.filter(
    (item) => item.healthStatus === "active" || item.healthStatus === "watch"
  );

  // 2. Dense Vector Ranking
  const denseSorted = [...activeCorpus].sort(
    (a, b) => b.simulatedVectorScore - a.simulatedVectorScore
  );
  const denseRanks = new Map<KnowledgeChunkItem, number>();
  denseSorted.forEach((item, index) => denseRanks.set(item.chunk, index + 1));

  // 3. Sparse Keyword Ranking
  const withKeyword = activeCorpus.map((item) => ({
    ...item,
    keywordScore: calculateKeywordScore(query, item.chunk.heading + " " + item.chunk.content),
  }));
  const sparseSorted = [...withKeyword].sort((a, b) => b.keywordScore - a.keywordScore);
  const sparseRanks = new Map<KnowledgeChunkItem, number>();
  sparseSorted.forEach((item, index) => sparseRanks.set(item.chunk, index + 1));

  // 4. Reciprocal Rank Fusion
  const results: ScoredSearchResult[] = withKeyword.map((item) => {
    const denseRank = denseRanks.get(item.chunk) || 999;
    const sparseRank = sparseRanks.get(item.chunk) || 999;
    const rrfScore = computeRRFScore(denseRank, sparseRank);

    const queryTokens = query.split(/\s+/).map(normalizeToken).filter((t) => t.length > 1);
    const badge = getAttributionBadge(item.sourceType);

    return {
      chunk: item.chunk,
      pageUrl: item.pageUrl,
      sourceType: item.sourceType,
      attributionBadge: badge,
      vectorScore: item.simulatedVectorScore,
      keywordScore: item.keywordScore,
      rrfScore: Number(rrfScore.toFixed(6)),
      // UI attributes
      title: item.chunk.heading,
      url: item.pageUrl,
      heading: item.chunk.heading,
      snippet: item.chunk.content,
      vectorRank: denseRank,
      bm25Rank: sparseRank,
      matchedTerms: queryTokens,
    };
  });

  return results.sort((a, b) => b.rrfScore - a.rrfScore).slice(0, limit);
}
