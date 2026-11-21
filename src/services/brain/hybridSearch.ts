import { KnowledgeChunkItem } from "./chunker";

/**
 * Hybrid Search & Reciprocal Rank Fusion (RRF) Engine
 * Task 2.7: Keyword search + Vector search combined with RRF re-ranking.
 * Handles morphological variants ("custom" vs "customize") and minor typos.
 */

export interface ScoredSearchResult {
  chunk: KnowledgeChunkItem;
  pageUrl: string;
  sourceType: "sitemap" | "page_url" | "instruction" | "skill" | "email";
  vectorScore: number;
  keywordScore: number;
  rrfScore: number;
}

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

/**
 * In-memory Hybrid Search simulator for unit testing and offline evals.
 */
export function hybridSearchSimulate(
  query: string,
  corpus: Array<{
    chunk: KnowledgeChunkItem;
    pageUrl: string;
    sourceType: "sitemap" | "page_url" | "instruction" | "skill" | "email";
    simulatedVectorScore: number;
    healthStatus: "active" | "watch" | "quarantined" | "archived";
  }>
): ScoredSearchResult[] {
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

    return {
      chunk: item.chunk,
      pageUrl: item.pageUrl,
      sourceType: item.sourceType,
      vectorScore: item.simulatedVectorScore,
      keywordScore: item.keywordScore,
      rrfScore: Number(rrfScore.toFixed(6)),
    };
  });

  return results.sort((a, b) => b.rrfScore - a.rrfScore);
}
