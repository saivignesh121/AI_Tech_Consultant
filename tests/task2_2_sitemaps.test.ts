import { describe, it, expect } from "vitest";
import {
  validateSitemapUrl,
  parseAndValidateSitemapUrls,
  parseSitemapXml,
  isSitemapIndex,
  generatePreFlightSummary,
  planSitemapsRead,
  type DiscoveredUrl,
} from "../src/services/brain/sitemapParser";

describe("Feature 2: The Knowledge Brain - Task 2.2: Sitemaps & Pre-Flight Read Planner", () => {
  describe("1. Adding & Validating One or More Sitemap URLs", () => {
    it("should validate valid sitemap URLs with http/https protocols", () => {
      const valid1 = validateSitemapUrl("https://support.brilliantdirectories.com/support/sitemap.xml");
      expect(valid1.valid).toBe(true);
      expect(valid1.error).toBeUndefined();

      const valid2 = validateSitemapUrl("http://docs.example.com/sitemap_index.xml");
      expect(valid2.valid).toBe(true);
    });

    it("should reject invalid URLs on entry with actionable error feedback", () => {
      const invalidProtocol = validateSitemapUrl("ftp://support.example.com/sitemap.xml");
      expect(invalidProtocol.valid).toBe(false);
      expect(invalidProtocol.error).toContain("http:// or https://");

      const invalidDomain = validateSitemapUrl("https://localhost-no-dot/sitemap.xml");
      expect(invalidDomain.valid).toBe(false);
      expect(invalidDomain.error).toContain("valid domain");

      const malformed = validateSitemapUrl("not-a-url");
      expect(malformed.valid).toBe(false);
      expect(malformed.error).toContain("Invalid URL syntax");

      const empty = validateSitemapUrl("   ");
      expect(empty.valid).toBe(false);
      expect(empty.error).toContain("cannot be empty");
    });

    it("should parse and validate multiple sitemap URLs entered together (newline and comma separated)", () => {
      const multiInput = `
        https://support.brilliantdirectories.com/support/sitemap.xml
        https://docs.stripe.com/sitemap.xml, https://docs.github.com/sitemap.xml
        invalid-url-here
      `;

      const result = parseAndValidateSitemapUrls(multiInput);
      expect(result.validUrls).toHaveLength(3);
      expect(result.validUrls).toContain("https://support.brilliantdirectories.com/support/sitemap.xml");
      expect(result.validUrls).toContain("https://docs.stripe.com/sitemap.xml");
      expect(result.validUrls).toContain("https://docs.github.com/sitemap.xml");

      expect(result.invalidUrls).toHaveLength(1);
      expect(result.invalidUrls[0].url).toBe("invalid-url-here");
    });
  });

  describe("2. Nested Sitemaps Discovery", () => {
    it("should detect sitemap indices holding nested sitemaps", () => {
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap>
          <loc>https://support.example.com/sitemap_articles_part1.xml</loc>
        </sitemap>
        <sitemap>
          <loc>https://support.example.com/sitemap_articles_part2.xml</loc>
        </sitemap>
        <sitemap>
          <loc>https://support.example.com/sitemap_solutions.xml</loc>
        </sitemap>
      </sitemapindex>`;

      expect(isSitemapIndex(indexXml)).toBe(true);

      const parsed = parseSitemapXml(indexXml, "https://support.example.com/sitemap_index.xml");
      expect(parsed.isIndex).toBe(true);
      expect(parsed.childSitemaps).toHaveLength(3);
      expect(parsed.childSitemaps[0]).toBe("https://support.example.com/sitemap_articles_part1.xml");
      expect(parsed.childSitemaps[1]).toBe("https://support.example.com/sitemap_articles_part2.xml");
      expect(parsed.childSitemaps[2]).toBe("https://support.example.com/sitemap_solutions.xml");
      expect(parsed.urls).toHaveLength(0);
    });

    it("should extract leaf page URLs when parsing leaf urlsets", () => {
      const leafXml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://support.example.com/articles/custom-domain</loc></url>
        <url><loc>https://support.example.com/articles/billing-faq</loc></url>
      </urlset>`;

      expect(isSitemapIndex(leafXml)).toBe(false);

      const parsed = parseSitemapXml(leafXml, "https://support.example.com/sitemap_articles_part1.xml");
      expect(parsed.isIndex).toBe(false);
      expect(parsed.urls).toHaveLength(2);
      expect(parsed.urls[0].url).toBe("https://support.example.com/articles/custom-domain");
      expect(parsed.urls[0].sitemapSource).toBe("https://support.example.com/sitemap_articles_part1.xml");
    });
  });

  describe("3. Pre-Flight Summary Plan Before Starting", () => {
    const mockDiscoveredUrls: DiscoveredUrl[] = [
      // Sitemap A
      { url: "https://support.example.com/p1-intro", sitemapSource: "https://support.example.com/sitemap_a.xml" },
      { url: "https://support.example.com/p2-setup", sitemapSource: "https://support.example.com/sitemap_a.xml" },
      { url: "https://support.example.com/p3-common-faq", sitemapSource: "https://support.example.com/sitemap_a.xml" },
      // Sitemap B
      { url: "https://support.example.com/p3-common-faq", sitemapSource: "https://support.example.com/sitemap_b.xml" }, // Duplicate!
      { url: "https://support.example.com/p4-advanced-api", sitemapSource: "https://support.example.com/sitemap_b.xml" },
      { url: "https://support.example.com/p5-troubleshooting", sitemapSource: "https://support.example.com/sitemap_b.xml" },
    ];

    it("should compute grand totals: total sitemaps, total URLs, unique URLs, first and last URL overall", () => {
      const summary = generatePreFlightSummary(
        "https://support.example.com/root.xml",
        mockDiscoveredUrls,
        ["https://support.example.com/sitemap_a.xml", "https://support.example.com/sitemap_b.xml"],
        450
      );

      expect(summary.totalUrls).toBe(6);
      expect(summary.uniqueUrls).toBe(5);
      expect(summary.firstUrl).toBe("https://support.example.com/p1-intro");
      expect(summary.lastUrl).toBe("https://support.example.com/p5-troubleshooting");
    });

    it("should show per-nested sitemap breakdown: page count, first URL, last URL for each sitemap", () => {
      const summary = generatePreFlightSummary(
        "https://support.example.com/root.xml",
        mockDiscoveredUrls,
        ["https://support.example.com/sitemap_a.xml", "https://support.example.com/sitemap_b.xml"],
        450
      );

      const sitemapA = summary.nestedBreakdown.find((s) => s.sitemapUrl.includes("sitemap_a.xml"));
      expect(sitemapA).toBeDefined();
      expect(sitemapA?.pageCount).toBe(3);
      expect(sitemapA?.firstUrl).toBe("https://support.example.com/p1-intro");
      expect(sitemapA?.lastUrl).toBe("https://support.example.com/p3-common-faq");

      const sitemapB = summary.nestedBreakdown.find((s) => s.sitemapUrl.includes("sitemap_b.xml"));
      expect(sitemapB).toBeDefined();
      expect(sitemapB?.pageCount).toBe(3);
      expect(sitemapB?.firstUrl).toBe("https://support.example.com/p3-common-faq");
      expect(sitemapB?.lastUrl).toBe("https://support.example.com/p5-troubleshooting");
    });

    it("should compute throughput metrics: pages per hour (450), pages per day (10,800), and expected finish time", () => {
      const summary = generatePreFlightSummary(
        "https://support.example.com/root.xml",
        mockDiscoveredUrls,
        [],
        450
      );

      expect(summary.estimatedPagesPerHour).toBe(450);
      expect(summary.estimatedPagesPerDay).toBe(10800); // 450 * 24
      expect(summary.estimatedMinutes).toBeGreaterThanOrEqual(1);
      expect(summary.estimatedCompletionTime).toBeDefined();
      expect(summary.formattedEta).toBeDefined();
    });
  });

  describe("4. Duplicate URLs Detection & Source Mapping", () => {
    it("should mark duplicate URLs and show every sitemap where found", () => {
      const urlsWithDuplicates: DiscoveredUrl[] = [
        { url: "https://support.example.com/home", sitemapSource: "sitemap1.xml" },
        { url: "https://support.example.com/pricing", sitemapSource: "sitemap1.xml" },
        { url: "https://support.example.com/home", sitemapSource: "sitemap2.xml" }, // Dup 1
        { url: "https://support.example.com/home", sitemapSource: "sitemap3.xml" }, // Dup 1 (3 times!)
        { url: "https://support.example.com/faq", sitemapSource: "sitemap2.xml" },
        { url: "https://support.example.com/pricing", sitemapSource: "sitemap3.xml" }, // Dup 2
      ];

      const summary = generatePreFlightSummary(
        "root.xml",
        urlsWithDuplicates,
        ["sitemap1.xml", "sitemap2.xml", "sitemap3.xml"],
        450
      );

      expect(summary.duplicateUrlsCount).toBe(2);

      const homeDup = summary.duplicates.find((d) => d.url.includes("/home"));
      expect(homeDup).toBeDefined();
      expect(homeDup?.occurrences).toBe(3);
      expect(homeDup?.foundIn).toEqual(["sitemap1.xml", "sitemap2.xml", "sitemap3.xml"]);

      const pricingDup = summary.duplicates.find((d) => d.url.includes("/pricing"));
      expect(pricingDup).toBeDefined();
      expect(pricingDup?.occurrences).toBe(2);
      expect(pricingDup?.foundIn).toEqual(["sitemap1.xml", "sitemap3.xml"]);
    });
  });

  describe("5. End-to-End Simulation: planSitemapsRead for Brilliant Directories and Multi-Sitemaps", () => {
    it("should plan read for Brilliant Directories Solution Center detecting nested sitemaps & duplicates", async () => {
      const plan = await planSitemapsRead([
        "https://support.brilliantdirectories.com/support/sitemap.xml",
      ]);

      expect(plan.totalSitemapsFound).toBeGreaterThanOrEqual(2);
      expect(plan.nestedSitemaps).toContain(
        "https://support.brilliantdirectories.com/support/sitemap_solutions.xml"
      );
      expect(plan.nestedSitemaps).toContain(
        "https://support.brilliantdirectories.com/support/sitemap_articles.xml"
      );

      expect(plan.totalUrls).toBeGreaterThan(0);
      expect(plan.uniqueUrls).toBeGreaterThan(0);
      expect(plan.duplicateUrlsCount).toBeGreaterThan(0);

      // Verify cross-sitemap duplicate tracking
      const duplicate = plan.duplicates[0];
      expect(duplicate.foundIn.length).toBeGreaterThan(1);

      // Verify throughput & ETA
      expect(plan.estimatedPagesPerHour).toBe(450);
      expect(plan.estimatedPagesPerDay).toBe(10800);
      expect(plan.formattedEta).toBeDefined();
    });

    it("should support multiple input sitemaps simultaneously", async () => {
      const multiPlan = await planSitemapsRead([
        "https://support.brilliantdirectories.com/support/sitemap.xml",
        "https://docs.example.com/sitemap.xml",
      ]);

      expect(multiPlan.rootUrls).toHaveLength(2);
      expect(multiPlan.totalSitemapsFound).toBeGreaterThanOrEqual(3);
      expect(multiPlan.nestedBreakdown.length).toBeGreaterThanOrEqual(3);
    });
  });
});
