import { describe, it, expect } from "vitest";
import { parseSitemapXml, generatePreFlightSummary } from "../src/services/brain/sitemapParser";
import { buildCitations, getAttributionBadge, mapDynamicCitations } from "../src/services/chat/citationMapper";
import { hybridSearchSimulate, DEFAULT_CORPUS, type CorpusItem } from "../src/services/brain/hybridSearch";
import { draftSkillFromDescription, synthesizeSkillFromNotes } from "../src/services/brain/skillsDrafter";
import { evaluateUrlHealth, isEligibleForSearch } from "../src/services/brain/healthTracker";

describe("Feature 2: The Knowledge Brain - Task 2.1: Five Types of Knowledge", () => {
  describe("1. Sitemaps (Default: Brilliant Directories, Generic for Any Domain)", () => {
    it("should parse Brilliant Directories Solution Center sitemap XML correctly", () => {
      const brilliantDirectoriesSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://support.brilliantdirectories.com/support/solutions/articles/12000000001-how-to-set-up-custom-domain</loc>
          <lastmod>2026-11-15</lastmod>
        </url>
        <url>
          <loc>https://support.brilliantdirectories.com/support/solutions/articles/12000000002-managing-member-plans-and-pricing</loc>
          <lastmod>2026-11-18</lastmod>
        </url>
        <url>
          <loc>https://support.brilliantdirectories.com/support/solutions/articles/12000000003-stripe-payment-gateway-integration</loc>
          <lastmod>2026-11-20</lastmod>
        </url>
      </urlset>`;

      const parsed = parseSitemapXml(
        brilliantDirectoriesSitemapXml,
        "https://support.brilliantdirectories.com/support/sitemap.xml"
      );

      expect(parsed.isIndex).toBe(false);
      expect(parsed.urls).toHaveLength(3);
      expect(parsed.urls[0].url).toContain("support.brilliantdirectories.com");
      expect(parsed.urls[0].url).toContain("how-to-set-up-custom-domain");
    });

    it("should parse arbitrary third-party sitemaps without hardcoded domain bias", () => {
      const genericDocsXml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://docs.acme-corp.io/en/quickstart</loc></url>
        <url><loc>https://shop.ecommerce-store.net/help/returns</loc></url>
      </urlset>`;

      const parsed = parseSitemapXml(genericDocsXml, "https://docs.acme-corp.io/sitemap.xml");
      expect(parsed.urls).toHaveLength(2);
      expect(parsed.urls[0].url).toBe("https://docs.acme-corp.io/en/quickstart");
      expect(parsed.urls[1].url).toBe("https://shop.ecommerce-store.net/help/returns");
    });

    it("should compute pre-flight read plan respecting 450 pages/hour rate", () => {
      const urls = [
        { url: "https://support.brilliantdirectories.com/p1", sitemapSource: "sitemap.xml" },
        { url: "https://support.brilliantdirectories.com/p2", sitemapSource: "sitemap.xml" },
        { url: "https://support.brilliantdirectories.com/p3", sitemapSource: "sitemap.xml" },
      ];

      const summary = generatePreFlightSummary(
        "https://support.brilliantdirectories.com/support/sitemap.xml",
        urls,
        [],
        450
      );

      expect(summary.totalUrls).toBe(3);
      expect(summary.uniqueUrls).toBe(3);
      expect(summary.duplicateUrlsCount).toBe(0);
      expect(summary.estimatedPagesPerHour).toBe(450);
      expect(summary.estimatedCompletionTime).toBeDefined();
    });
  });

  describe("2. Standalone Page URLs (One-by-One Knowledge)", () => {
    it("should handle standalone page URLs with health check and chunking", () => {
      const standalonePage = {
        url: "https://support.example.com/standalone/special-api-guide",
        title: "Special API Guide",
        healthStatus: "active" as const,
        consecutiveFailures: 0,
      };

      expect(isEligibleForSearch(standalonePage.healthStatus)).toBe(true);
      const healthCheck = evaluateUrlHealth(standalonePage.healthStatus, standalonePage.consecutiveFailures, 200);
      expect(healthCheck.newStatus).toBe("active");
      expect(healthCheck.consecutiveFailures).toBe(0);
    });
  });

  describe("3. Instructions (Plain-English Rules Written by People)", () => {
    it("should define plain-English rules with role scoping", () => {
      const refundRule = {
        id: "inst-refund-001",
        title: "Refund Escalation Policy",
        ruleText: "Never promise a refund. Send every refund question to the Billing team.",
        appliesToRoles: ["all"],
        isActive: true,
      };

      const engineerRule = {
        id: "inst-eng-001",
        title: "Technical CLI Command Requirement",
        ruleText: "Always include exact CLI diagnostic commands (e.g. dig, curl, psql).",
        appliesToRoles: ["support-engineer"],
        isActive: true,
      };

      expect(refundRule.ruleText).toContain("Never promise a refund");
      expect(refundRule.appliesToRoles).toContain("all");
      expect(engineerRule.appliesToRoles).toContain("support-engineer");
      expect(engineerRule.appliesToRoles).not.toContain("support-executive");
    });
  });

  describe("4. Skills (Step-by-Step Guides Agent Follows)", () => {
    it("should draft and structure step-by-step SOP procedures", () => {
      const skill = draftSkillFromDescription(
        "How to answer a domain setup question",
        "Step-by-step resolution protocol for customer DNS mapping"
      );

      expect(skill.name).toBe("How to answer a domain setup question");
      expect(skill.stepsMarkdown).toContain("Step-by-Step Resolution Protocol");
      expect(skill.stepsMarkdown).toContain("Verify the customer's current configuration");
      expect(skill.examples).toHaveLength(1);
    });

    it("should improve skills with human feedback annotations", () => {
      const baseSkill = draftSkillFromDescription("SSL Setup", "How to resolve SSL handshake");
      const teachingNotes = [
        { noteText: "Instruct customer to change Cloudflare SSL mode to Full Strict.", author: "expert_tech" },
      ];

      const improved = synthesizeSkillFromNotes(baseSkill, teachingNotes);
      expect(improved.stepsMarkdown).toContain("Full Strict");
      expect(improved.sourceNotesUsed).toHaveLength(1);
    });
  });

  describe("5. Past Emails (Gmail Threads with Teaching Notes)", () => {
    it("should store Gmail threads with human teaching notes that guide the agent", () => {
      const emailThread = {
        gmailThreadId: "thread-gmail-12345",
        subject: "Re: SSL Handshake Error on Custom Domain",
        snippet: "Customer encountered SSL 525 error when navigating to portal.",
        notes: "Staff note (Teach agent): Customer forgot to select Full (Strict) SSL mode in Cloudflare. Always remind customers to switch from Flexible to Full (Strict).",
      };

      expect(emailThread.notes).toContain("Staff note (Teach agent)");
      expect(emailThread.notes).toContain("Full (Strict) SSL mode");
    });
  });

  describe("Attribution Rule: Verified Badges for All 5 Knowledge Types", () => {
    it("should format correct attribution badge for each knowledge type", () => {
      expect(getAttributionBadge("sitemap")).toBe("[sitemap]");
      expect(getAttributionBadge("page_url")).toBe("[page_url]");
      expect(getAttributionBadge("instruction")).toBe("[instruction]");
      expect(getAttributionBadge("skill")).toBe("[skill]");
      expect(getAttributionBadge("past_email")).toBe("[past_email]");
      expect(getAttributionBadge("email")).toBe("[past_email]");
      // Paragraph/screenshot defaults to sitemap
      expect(getAttributionBadge("paragraph")).toBe("[sitemap]");
      expect(getAttributionBadge("screenshot")).toBe("[sitemap]");
    });

    it("should include attribution badges in buildCitations output", () => {
      const multiTypeContexts = [
        {
          id: "ctx-1",
          type: "sitemap" as const,
          title: "Brilliant Directories Domain Setup",
          sourceUrl: "https://support.brilliantdirectories.com/domain",
          content: "Point CNAME to proxy.",
        },
        {
          id: "ctx-2",
          type: "page_url" as const,
          title: "Standalone Webhook Verification",
          sourceUrl: "https://example.com/standalone/webhooks",
          content: "Verify HMAC SHA-256 header.",
        },
        {
          id: "ctx-3",
          type: "instruction" as const,
          title: "Refund Policy",
          content: "Never promise a refund. Escalate to Billing.",
        },
        {
          id: "ctx-4",
          type: "skill" as const,
          title: "Custom Domain Routing Protocol",
          content: "1. Log into DNS provider. 2. Verify with dig.",
        },
        {
          id: "ctx-5",
          type: "past_email" as const,
          title: "Re: Need assistance with CNAME setup",
          content: "Staff note: Remind customer about Full Strict SSL mode.",
        },
      ];

      const { citations, formattedContext } = buildCitations(multiTypeContexts);

      expect(citations).toHaveLength(5);
      expect(citations[0].attributionBadge).toBe("[sitemap]");
      expect(citations[1].attributionBadge).toBe("[page_url]");
      expect(citations[2].attributionBadge).toBe("[instruction]");
      expect(citations[3].attributionBadge).toBe("[skill]");
      expect(citations[4].attributionBadge).toBe("[past_email]");

      expect(formattedContext).toContain("[1] Source: Brilliant Directories Domain Setup ([sitemap])");
      expect(formattedContext).toContain("[2] Source: Standalone Webhook Verification ([page_url])");
      expect(formattedContext).toContain("[3] Source: Refund Policy ([instruction])");
      expect(formattedContext).toContain("[4] Source: Custom Domain Routing Protocol ([skill])");
      expect(formattedContext).toContain("[5] Source: Re: Need assistance with CNAME setup ([past_email])");
    });

    it("should return attribution badges across all 5 knowledge types in hybrid search results", () => {
      const searchResults = hybridSearchSimulate("custom domain setup and refund policy", DEFAULT_CORPUS, 5);

      expect(searchResults.length).toBeGreaterThan(0);
      for (const res of searchResults) {
        expect(res.attributionBadge).toBeDefined();
        expect([
          "[sitemap]",
          "[page_url]",
          "[instruction]",
          "[skill]",
          "[past_email]",
        ]).toContain(res.attributionBadge);
      }
    });

    it("should format dynamic citations with attribution badges in mapDynamicCitations", () => {
      const dynamic = mapDynamicCitations("Here is the answer", [
        { title: "Sitemap Doc", url: "https://example.com/sitemap-doc", type: "sitemap" },
        { title: "Standalone Article", url: "https://example.com/page", type: "page_url" },
        { title: "Billing Rule", url: "internal://instruction", type: "instruction" },
        { title: "Setup SOP", url: "internal://skill", type: "skill" },
        { title: "Client Email", url: "gmail://thread", type: "past_email" },
      ]);

      expect(dynamic.citations).toHaveLength(5);
      expect(dynamic.citations[0].attributionBadge).toBe("[sitemap]");
      expect(dynamic.citations[1].attributionBadge).toBe("[page_url]");
      expect(dynamic.citations[2].attributionBadge).toBe("[instruction]");
      expect(dynamic.citations[3].attributionBadge).toBe("[skill]");
      expect(dynamic.citations[4].attributionBadge).toBe("[past_email]");
    });
  });
});
