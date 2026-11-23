import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getTenantContext: async () => actual.DEFAULT_TENANT,
  };
});

import {
  hybridSearchSimulate,
  executeVectorOnlySearch,
  executeKeywordOnlySearch,
  searchKnowledgeBrain,
  runHybridVsMeaningOnlyEval,
  computeRRFScore,
  normalizeToken,
  areTokensEquivalent,
  getAttributionBadge,
  DEFAULT_CORPUS,
  type CorpusItem,
} from "../src/services/brain/hybridSearch";
import { POST, GET } from "../src/app/api/brain/query/route";
import { NextRequest } from "next/server";

describe("Feature 2: The Knowledge Brain — Task 2.7 & Task 2.8", () => {
  // Test corpus with all 5 types and a quarantined page
  const testCorpus: CorpusItem[] = [
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
    {
      chunk: {
        chunkIndex: 1,
        heading: "Webhook Signature Verification",
        content: "Verify HMAC SHA-256 signatures on incoming webhook deliveries using your shared signing secret. Return 401 Unauthorized if invalid.",
      },
      pageUrl: "https://support.example.com/articles/webhook-configuration",
      sourceType: "page_url",
      simulatedVectorScore: 0.91,
      healthStatus: "active",
    },
    {
      chunk: {
        chunkIndex: 2,
        heading: "Refund Escalation Policy",
        content: "Never promise a refund. Send every refund question to the Billing team for human review and approval.",
      },
      pageUrl: "internal://instructions/refund-escalation",
      sourceType: "instruction",
      simulatedVectorScore: 0.94,
      healthStatus: "active",
    },
    {
      chunk: {
        chunkIndex: 3,
        heading: "DNS & Custom CNAME Setup SOP",
        content: "1. Log into your DNS provider registrar. 2. Create CNAME app -> proxy.example.com. 3. Turn off orange cloud during validation. 4. Verify with dig.",
      },
      pageUrl: "internal://skills/dns-setup",
      sourceType: "skill",
      simulatedVectorScore: 0.92,
      healthStatus: "active",
    },
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
    {
      chunk: {
        chunkIndex: 5,
        heading: "Quarantined Deprecated Page",
        content: "Do not use this deprecated endpoint.",
      },
      pageUrl: "https://support.example.com/articles/deprecated-endpoint",
      sourceType: "sitemap",
      simulatedVectorScore: 0.99, // High vector score, but MUST be excluded
      healthStatus: "quarantined",
    },
  ];

  describe("Task 2.7: Search that Finds the Right Knowledge", () => {
    it("combines dense vector and sparse keyword search with Reciprocal Rank Fusion (RRF)", () => {
      const query = "How do I configure custom CNAME subdomains?";
      const results = hybridSearchSimulate(query, testCorpus, 5);

      expect(results.length).toBeGreaterThan(0);
      const topResult = results[0];
      expect(topResult.url).toBe("https://support.example.com/articles/custom-cname-setup");
      expect(topResult.attributionBadge).toBe("[sitemap]");
      expect(topResult.rrfScore).toBeGreaterThan(0);
      expect(topResult.vectorRank).toBeDefined();
      expect(topResult.bm25Rank).toBeDefined();

      // Verify mathematical formula: RRF = 1/(60 + r_vec) + 1/(60 + r_bm25)
      const expectedRrf = computeRRFScore(topResult.vectorRank || 1, topResult.bm25Rank || 1);
      expect(topResult.rrfScore).toBeCloseTo(expectedRrf, 4);
    });

    it("verifies Done-When criterion: evals prove Hybrid Search beats Meaning-Only Search", () => {
      const evalResult = runHybridVsMeaningOnlyEval(testCorpus);

      expect(evalResult.totalQueries).toBe(6);
      expect(evalResult.hybridBeatsMeaningOnly).toBe(true);
      expect(evalResult.hybridMRR).toBeGreaterThanOrEqual(evalResult.meaningOnlyMRR);
      expect(evalResult.mrrImprovementPercent).toBeGreaterThan(0);

      // Verify that for technical exact keywords, Hybrid outperforms Vector-only
      const technicalCase = evalResult.benchmarkDetails.find((d) =>
        d.query.includes("HMAC-SHA256")
      );
      expect(technicalCase).toBeDefined();
      expect(technicalCase!.hybridRank).toBeLessThan(technicalCase!.meaningOnlyRank);
      expect(technicalCase!.hybridWon).toBe(true);
    });

    it("demonstrates morphological invariance: words that mean the same thing return the identical top result", () => {
      const q1 = hybridSearchSimulate("custom domain setup", testCorpus);
      const q2 = hybridSearchSimulate("customize domain setup", testCorpus);
      const q3 = hybridSearchSimulate("customizing domain setup", testCorpus);

      expect(q1[0].url).toBe("https://support.example.com/articles/custom-cname-setup");
      expect(q2[0].url).toBe(q1[0].url);
      expect(q3[0].url).toBe(q1[0].url);
      expect(q1[0].heading).toBe(q2[0].heading);
      expect(q2[0].heading).toBe(q3[0].heading);
    });

    it("demonstrates typo tolerance invariance: small spelling mistakes return the identical top result", () => {
      const canonical = hybridSearchSimulate("custom CNAME subdomain setup", testCorpus);
      // "custm" has 1 char deletion, "subdoamin" has 1 char transposition
      const withTypos = hybridSearchSimulate("custm CNAME subdoamin setup", testCorpus);

      expect(canonical[0].url).toBe("https://support.example.com/articles/custom-cname-setup");
      expect(withTypos[0].url).toBe(canonical[0].url);
      expect(withTypos[0].heading).toBe(canonical[0].heading);
    });

    it("verifies token normalization and Levenshtein distance matching", () => {
      expect(normalizeToken("customize")).toBe("custom");
      expect(normalizeToken("customizing")).toBe("custom");
      expect(normalizeToken("custm")).toBe("custom"); // Canonical stem map
      expect(normalizeToken("subdoamin")).toBe("subdomain"); // Canonical stem map
      expect(normalizeToken("cloudflar")).toBe("cloudflare");

      expect(areTokensEquivalent("custom", "customize")).toBe(true);
      expect(areTokensEquivalent("subdomain", "subdoamin")).toBe(true);
      expect(areTokensEquivalent("cloudflare", "cloudflar")).toBe(true);
      expect(areTokensEquivalent("refund", "refnd")).toBe(true);
      expect(areTokensEquivalent("completely", "different")).toBe(false);
    });

    it("strictly excludes Quarantined and Archived pages from all retrieval modes", () => {
      const hybridResults = hybridSearchSimulate("Deprecated endpoint", testCorpus);
      const vectorResults = executeVectorOnlySearch("Deprecated endpoint", testCorpus);
      const keywordResults = executeKeywordOnlySearch("Deprecated endpoint", testCorpus);

      const containsQuarantinedHybrid = hybridResults.some((r) =>
        r.pageUrl.includes("deprecated-endpoint")
      );
      const containsQuarantinedVector = vectorResults.some((r) =>
        r.pageUrl.includes("deprecated-endpoint")
      );
      const containsQuarantinedKeyword = keywordResults.some((r) =>
        r.pageUrl.includes("deprecated-endpoint")
      );

      expect(containsQuarantinedHybrid).toBe(false);
      expect(containsQuarantinedVector).toBe(false);
      expect(containsQuarantinedKeyword).toBe(false);
    });

    it("provides the unified searchKnowledgeBrain function supporting all three modes", () => {
      const hybrid = searchKnowledgeBrain("custom domain", testCorpus, 3, "hybrid");
      const vector = searchKnowledgeBrain("custom domain", testCorpus, 3, "vector_only");
      const keyword = searchKnowledgeBrain("custom domain", testCorpus, 3, "keyword_only");

      expect(hybrid.length).toBeLessThanOrEqual(3);
      expect(vector.length).toBeLessThanOrEqual(3);
      expect(keyword.length).toBeLessThanOrEqual(3);

      expect(vector[0].bm25Rank).toBe(999);
      expect(keyword[0].vectorRank).toBe(999);
      expect(hybrid[0].vectorRank).toBeLessThan(999);
      expect(hybrid[0].bm25Rank).toBeLessThan(999);
    });
  });

  describe("Task 2.8: A Clean API for Ask & Teach Chat and Eval Lab", () => {
    it("POST /api/brain/query executes hybrid search and returns full citation attribution", async () => {
      const req = new NextRequest("http://localhost:3000/api/brain/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "How do I configure custom CNAME subdomains?",
          limit: 5,
          mode: "hybrid",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verify custom telemetry response headers
      expect(res.headers.get("X-Knowledge-Engine")).toBe("pgvector-tsvector-rrf");
      expect(res.headers.get("X-Search-Mode")).toBe("hybrid");
      expect(res.headers.get("X-Tenant-Business-Id")).toBeDefined();

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.durationMs).toBeGreaterThan(0);

      const first = data.results[0];
      expect(first.citationIndex).toBe(1);
      expect(first.attributionBadge).toBeDefined();
      expect(first.attributionBadge.startsWith("[")).toBe(true);
      expect(first.rrfScore).toBeGreaterThan(0);
      expect(first.vectorRank).toBeDefined();
      expect(first.bm25Rank).toBeDefined();
    });

    it("POST /api/brain/query with action='eval_benchmark' returns automated eval benchmark results", async () => {
      const req = new NextRequest("http://localhost:3000/api/brain/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "eval_benchmark",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("eval_benchmark");
      expect(data.evalResult).toBeDefined();
      expect(data.evalResult.hybridBeatsMeaningOnly).toBe(true);
      expect(data.evalResult.mrrImprovementPercent).toBeGreaterThan(0);
      expect(data.evalResult.benchmarkDetails.length).toBeGreaterThan(0);
    });

    it("POST /api/brain/query masks personal data (PII) before searching", async () => {
      const req = new NextRequest("http://localhost:3000/api/brain/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Contact user at 415-555-0199 or 742 Evergreen Terrace for CNAME support",
          limit: 3,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      // Verify PII is masked in returned query telemetry
      expect(data.query).not.toContain("415-555-0199");
      expect(data.query).not.toContain("742 Evergreen Terrace");
      expect(data.query).toContain("[REDACTED_PHONE]");
      expect(data.query).toContain("[REDACTED_ADDRESS]");
    });

    it("POST /api/brain/query validates payload and returns 400 for empty or invalid query", async () => {
      const req = new NextRequest("http://localhost:3000/api/brain/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Missing or invalid 'query'");
    });

    it("GET /api/brain/query supports query parameters for rapid developer testing", async () => {
      const req = new NextRequest("http://localhost:3000/api/brain/query?query=custom+domain&mode=hybrid&limit=2", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(2);
      expect(data.mode).toBe("hybrid");
    });

    it("GET /api/brain/query?action=eval_benchmark runs the evaluation suite", async () => {
      const req = new NextRequest("http://localhost:3000/api/brain/query?action=eval_benchmark", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("eval_benchmark");
      expect(data.evalResult.hybridBeatsMeaningOnly).toBe(true);
    });

    it("GET /api/brain/query?view=spec returns complete OpenAPI 3.1 specification", async () => {
      const req = new NextRequest("http://localhost:3000/api/brain/query?view=spec", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.openapi).toBe("3.1.0");
      expect(data.info.title).toContain("Knowledge Brain Retrieval API");
      expect(data.paths["/api/brain/query"]).toBeDefined();
      expect(data.paths["/api/brain/query"].post).toBeDefined();
      expect(data.paths["/api/brain/query"].get).toBeDefined();
      expect(data.components.schemas.KnowledgeSearchResultItem).toBeDefined();
    });

    it("verifies attribution badge formatting for all 5 knowledge types", () => {
      expect(getAttributionBadge("sitemap")).toBe("[sitemap]");
      expect(getAttributionBadge("page_url")).toBe("[page_url]");
      expect(getAttributionBadge("instruction")).toBe("[instruction]");
      expect(getAttributionBadge("skill")).toBe("[skill]");
      expect(getAttributionBadge("past_email")).toBe("[past_email]");
      expect(getAttributionBadge("email")).toBe("[past_email]");
      expect(getAttributionBadge("unknown")).toBe("[sitemap]");
    });
  });
});
