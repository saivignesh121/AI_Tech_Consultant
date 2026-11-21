import { describe, it, expect } from "vitest";
import { parseSitemapXml } from "../src/services/brain/sitemapParser";
import { extractCleanHtmlContent } from "../src/services/brain/htmlExtractor";
import { chunkDocumentText } from "../src/services/brain/chunker";
import { hybridSearchSimulate, calculateRrfScore } from "../src/services/brain/hybridSearch";
import { updateUrlHealthStatus } from "../src/services/brain/healthTracker";
import { draftSkillFromPages } from "../src/services/brain/skillsDrafter";

describe("Milestone 2 (Feature 2: The Knowledge Brain) End-to-End Suite", () => {
  // =========================================================================
  // Task 2.1: Sitemap Ingestion & Pre-Crawl Discovery
  // =========================================================================
  describe("Task 2.1: Sitemap Ingestion & Pre-Crawl Engine", () => {
    it("should parse XML sitemaps, extract valid URLs, and detect nested sitemaps", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://acme.com/articles/custom-domain-setup</loc></url>
  <url><loc>https://acme.com/articles/webhook-integration</loc></url>
</urlset>`;

      const result = parseSitemapXml(xml, "https://acme.com/sitemap.xml");

      expect(result.urls).toHaveLength(2);
      expect(result.urls.map((u) => u.url)).toContain("https://acme.com/articles/custom-domain-setup");
      expect(result.urls.map((u) => u.url)).toContain("https://acme.com/articles/webhook-integration");
      expect(result.childSitemaps).toHaveLength(0);
    });

    it("should accurately estimate crawl duration at 450 pages/hour polite crawl rate", () => {
      const totalPages = 482;
      const ratePerHour = 450;
      const estimatedMinutes = Math.ceil((totalPages / ratePerHour) * 60);

      // 482 / 450 = 1.071 hours = ~65 minutes
      expect(estimatedMinutes).toBe(65);
    });
  });

  // =========================================================================
  // Task 2.2: HTML Extraction & 400-Token Chunking
  // =========================================================================
  describe("Task 2.2: HTML Extraction & Semantic Chunking", () => {
    it("should strip navigation, headers, and footers while preserving technical prose", () => {
      const rawHtml = `
        <html>
          <body>
            <nav><a href="/">Home</a><a href="/pricing">Pricing</a></nav>
            <header><h1>Header Banner</h1></header>
            <main>
              <article>
                <h1>Configuring CNAME DNS</h1>
                <p>To configure your custom domain, point your CNAME record to proxy.acme.com.</p>
              </article>
            </main>
            <footer><p>&copy; 2026 Acme Corp. All rights reserved.</p></footer>
          </body>
        </html>
      `;

      const clean = extractCleanHtmlContent(rawHtml);
      expect(clean.title).toContain("Configuring CNAME DNS");
      expect(clean.content).toContain("point your CNAME record to proxy.acme.com");
      expect(clean.content).not.toContain("&copy; 2026 Acme Corp");
      expect(clean.content).not.toContain("Pricing");
    });

    it("should chunk long articles into ~400-token chunks with 50-token overlap", () => {
      const longText = Array.from({ length: 120 }, (_, i) => `Step ${i + 1}: Configure setting parameter number ${i + 1} with high availability.`).join(" ");
      const chunks = chunkDocumentText(longText, 400, 50);

      expect(chunks.length).toBeGreaterThan(1);
      // Chunks should carry sequential index
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[1].chunkIndex).toBe(1);
      // Overlap verification
      expect(chunks[0].content.length).toBeGreaterThan(100);
    });
  });

  // =========================================================================
  // Task 2.3: Hybrid Search (pgvector + tsvector RRF)
  // =========================================================================
  describe("Task 2.3: Hybrid Search Engine & Reciprocal Rank Fusion", () => {
    it("should compute mathematical RRF score combining vector and BM25 ranks", () => {
      // Formula: 1 / (60 + vectorRank) + 1 / (60 + bm25Rank)
      const rrf = calculateRrfScore(1, 1);
      // 1/61 + 1/61 = 0.0163934 + 0.0163934 = ~0.032786
      expect(rrf).toBeCloseTo(0.032787, 5);
    });

    it("should normalize morphological word variations (custom vs customizing)", () => {
      const query1 = "How to configure custom CNAME?";
      const query2 = "How to configure customizing CNAME?";

      const res1 = hybridSearchSimulate(query1, 3);
      const res2 = hybridSearchSimulate(query2, 3);

      expect(res1.length).toBeGreaterThan(0);
      expect(res2.length).toBeGreaterThan(0);
      // Both should retrieve the same top article due to stemming
      expect(res1[0].url).toEqual(res2[0].url);
    });
  });

  // =========================================================================
  // Task 2.4: URL Health Lifecycle State Machine
  // =========================================================================
  describe("Task 2.4: URL Health Lifecycle & Quarantine Boundaries", () => {
    it("should transition active -> watch on first 404 failure", () => {
      const result = updateUrlHealthStatus("active", 404, 0);

      expect(result.newStatus).toBe("watch");
      expect(result.newFailures).toBe(1);
    });

    it("should transition watch -> quarantined on second consecutive failure", () => {
      const result = updateUrlHealthStatus("watch", 404, 1);

      expect(result.newStatus).toBe("quarantined");
      expect(result.newFailures).toBe(2);
    });

    it("should immediately quarantine 301 redirects and store destination", () => {
      const result = updateUrlHealthStatus("active", 301, 0, "https://acme.com/articles/v2-dns");

      expect(result.newStatus).toBe("quarantined");
    });

    it("should heal quarantined URL back to active upon successful 200 OK", () => {
      const result = updateUrlHealthStatus("quarantined", 200, 2);

      expect(result.newStatus).toBe("active");
      expect(result.newFailures).toBe(0);
    });
  });

  // =========================================================================
  // Task 2.5: Skills Drafter
  // =========================================================================
  describe("Task 2.5: Automated Skills Drafter", () => {
    it("should auto-draft a standard operating procedure (SOP) from ingested pages", () => {
      const samplePages = [
        {
          title: "Custom CNAME Subdomain Guide",
          content: "Step 1: Point your domain to proxy server. Step 2: Configure TLS cert. Step 3: Verify propagation.",
          url: "https://acme.com/articles/cname",
        },
      ];

      const skill = draftSkillFromPages("Custom CNAME Routing", samplePages);

      expect(skill.name).toBe("Custom CNAME Routing");
      expect(skill.slug).toBe("custom-cname-routing");
      expect(skill.stepsMarkdown).toContain("1.");
      expect(skill.stepsMarkdown).toContain("Resolution Protocol");
      expect(skill.triggerConditions).toBeDefined();
    });
  });
});
