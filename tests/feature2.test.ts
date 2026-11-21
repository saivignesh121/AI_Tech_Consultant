import { describe, it, expect } from "vitest";
import { parseSitemapXml, generatePreFlightSummary } from "../src/services/brain/sitemapParser";
import { extractPageContent } from "../src/services/brain/htmlExtractor";
import { chunkPageContent } from "../src/services/brain/chunker";
import { evaluateUrlHealth, isEligibleForSearch } from "../src/services/brain/healthTracker";
import { hybridSearchSimulate, calculateKeywordScore, normalizeToken } from "../src/services/brain/hybridSearch";
import { draftSkillFromDescription, synthesizeSkillFromNotes } from "../src/services/brain/skillsDrafter";

describe("Feature 2: The Knowledge Brain", () => {
  describe("Task 2.2: Sitemap & Ingestion Planner", () => {
    it("should parse standard sitemap xml and extract loc tags", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://support.example.com/page1</loc></url>
        <url><loc>https://support.example.com/page2</loc></url>
      </urlset>`;

      const parsed = parseSitemapXml(xml, "https://support.example.com/sitemap.xml");
      expect(parsed.isIndex).toBe(false);
      expect(parsed.urls).toHaveLength(2);
      expect(parsed.urls[0].url).toBe("https://support.example.com/page1");
    });

    it("should detect nested sitemap indices", () => {
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://support.example.com/nested1.xml</loc></sitemap>
        <sitemap><loc>https://support.example.com/nested2.xml</loc></sitemap>
      </sitemapindex>`;

      const parsed = parseSitemapXml(indexXml, "https://support.example.com/sitemap_index.xml");
      expect(parsed.isIndex).toBe(true);
      expect(parsed.childSitemaps).toHaveLength(2);
      expect(parsed.childSitemaps[0]).toBe("https://support.example.com/nested1.xml");
    });

    it("should compute pre-flight summary with duplicate detection and finish ETA", () => {
      const urls = [
        { url: "https://support.example.com/dns", sitemapSource: "sitemap1.xml" },
        { url: "https://support.example.com/ssl", sitemapSource: "sitemap1.xml" },
        { url: "https://support.example.com/dns", sitemapSource: "sitemap2.xml" }, // duplicate
      ];

      const summary = generatePreFlightSummary(
        "https://support.example.com/root.xml",
        urls,
        ["sitemap1.xml", "sitemap2.xml"],
        400
      );

      expect(summary.totalUrls).toBe(3);
      expect(summary.uniqueUrls).toBe(2);
      expect(summary.duplicateUrlsCount).toBe(1);
      expect(summary.firstUrl).toBe("https://support.example.com/dns");
      expect(summary.lastUrl).toBe("https://support.example.com/ssl");
      expect(summary.estimatedHours).toBe(0.01);
      expect(summary.estimatedCompletionTime).toBeDefined();
    });
  });

  describe("Task 2.3: HTML Extraction & Multimodal Chunking", () => {
    it("should extract clean text, headings, and image tags with captions", () => {
      const html = `<html>
        <head><title>DNS Configuration Guide</title></head>
        <body>
          <h1>Domain Name Server Protocol</h1>
          <p>Configure your root A records.</p>
          <img src="https://cdn.example.com/dns-panel.png" alt="Cloudflare DNS panel screenshot" />
        </body>
      </html>`;

      const page = extractPageContent(html, "https://support.example.com/dns-guide");
      expect(page.title).toBe("DNS Configuration Guide");
      expect(page.headings).toContain("Domain Name Server Protocol");
      expect(page.images).toHaveLength(1);
      expect(page.images[0].alt).toContain("Cloudflare DNS panel");

      const chunks = chunkPageContent(page, 500, 50);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].imageUrl).toBe("https://cdn.example.com/dns-panel.png");
      expect(chunks[0].imageCaption).toContain("Cloudflare DNS panel screenshot");
    });
  });

  describe("Task 2.4: URL Health Lifecycle State Machine", () => {
    it("should transition URL to 'watch' on HTTP 404", () => {
      const transition = evaluateUrlHealth("active", 0, 404);
      expect(transition.newStatus).toBe("watch");
      expect(transition.consecutiveFailures).toBe(1);
    });

    it("should quarantine URL on HTTP 301 Permanent Redirect", () => {
      const transition = evaluateUrlHealth("active", 0, 301);
      expect(transition.newStatus).toBe("quarantined");
      expect(transition.isActionable).toBe(true);
    });

    it("should recover back to 'active' on HTTP 200 and reset failure count", () => {
      const transition = evaluateUrlHealth("watch", 3, 200);
      expect(transition.newStatus).toBe("active");
      expect(transition.consecutiveFailures).toBe(0);
    });

    it("should enforce search eligibility: quarantined and archived are excluded", () => {
      expect(isEligibleForSearch("active")).toBe(true);
      expect(isEligibleForSearch("watch")).toBe(true);
      expect(isEligibleForSearch("quarantined")).toBe(false);
      expect(isEligibleForSearch("archived")).toBe(false);
    });
  });

  describe("Task 2.7: Hybrid Search & Morphological Robustness", () => {
    it("should normalize morphological variations (custom vs customize)", () => {
      expect(normalizeToken("custom")).toBe(normalizeToken("customize"));
      expect(normalizeToken("customizing")).toBe(normalizeToken("custom"));
    });

    it("should match queries across typographical and morphological variants", () => {
      const query = "how to customize domain settings";
      const content = "Guide on custom domain setup in settings.";
      const score = calculateKeywordScore(query, content);
      expect(score).toBeGreaterThan(0.4);
    });

    it("should combine vector and keyword ranks via RRF and filter out quarantined pages", () => {
      const corpus = [
        {
          chunk: { chunkIndex: 0, heading: "Custom Domain", content: "Point DNS A record to server" },
          pageUrl: "https://support.example.com/domain",
          sourceType: "sitemap" as const,
          simulatedVectorScore: 0.95,
          healthStatus: "active" as const,
        },
        {
          chunk: { chunkIndex: 0, heading: "Deprecated Domain", content: "Old DNS info" },
          pageUrl: "https://support.example.com/old-domain",
          sourceType: "sitemap" as const,
          simulatedVectorScore: 0.99,
          healthStatus: "quarantined" as const, // Quarantined should be filtered out
        },
      ];

      const results = hybridSearchSimulate("how to customize domain", corpus);
      expect(results).toHaveLength(1);
      expect(results[0].pageUrl).toBe("https://support.example.com/domain");
      expect(results[0].rrfScore).toBeGreaterThan(0);
    });
  });

  describe("Tasks 2.5 & 2.6: Skills Drafting & Email Notes Synthesis", () => {
    it("should draft a structured Markdown skill from a short description", () => {
      const skill = draftSkillFromDescription(
        "Domain Setup Protocol",
        "Configuring custom root domains with Cloudflare DNS"
      );

      expect(skill.slug).toBe("domain-setup-protocol");
      expect(skill.stepsMarkdown).toContain("When to Use This Skill");
      expect(skill.stepsMarkdown).toContain("Step-by-Step Resolution Protocol");
      expect(skill.examples).toHaveLength(1);
    });

    it("should synthesize human Gmail critique notes into updated skill revisions", () => {
      const baseSkill = draftSkillFromDescription("DNS Troubleshooting", "Fixing DNS propagation errors");
      const notes = [
        { noteText: "Always instruct user to check TTL first before changing records.", author: "senior_lead" },
      ];

      const improved = synthesizeSkillFromNotes(baseSkill, notes);
      expect(improved.stepsMarkdown).toContain("Human Quality Annotations");
      expect(improved.stepsMarkdown).toContain("check TTL first");
      expect(improved.sourceNotesUsed).toHaveLength(1);
    });
  });
});
