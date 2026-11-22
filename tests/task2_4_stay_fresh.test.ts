import { describe, it, expect, beforeEach } from "vitest";
import {
  computeContentHash,
  executeRefreshRun,
  getHealthPolicy,
  setHealthPolicy,
  getPendingUrls,
  getArchivedKnowledgeBase,
  recoverArchivedPage,
  getRefreshRuns,
  getChangeHistory,
  getFreshnessDashboardMetrics,
  resetInMemoryFreshness,
  type CrawledPageCheckInput,
} from "../src/services/brain/freshnessChecker";
import {
  evaluateUrlHealth,
  isEligibleForSearch,
  DEFAULT_HEALTH_POLICY,
  type HealthPolicy,
} from "../src/services/brain/healthTracker";
import { hybridSearchSimulate, DEFAULT_CORPUS } from "../src/services/brain/hybridSearch";

describe("Feature 2: The Knowledge Brain - Task 2.4: Stay Fresh & URL Health Lifecycle", () => {
  const BIZ_A = "11111111-1111-1111-1111-111111111111";
  const BIZ_B = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    resetInMemoryFreshness();
  });

  describe("1. Recheck Schedule & Frequency Options", () => {
    it("should allow picking valid recheck schedules (daily, weekly, 15 days, 30 days)", () => {
      const validSchedules = ["daily", "weekly", "15_days", "30_days"] as const;

      for (const schedule of validSchedules) {
        const policy = setHealthPolicy(BIZ_A, { recheckSchedule: schedule });
        expect(policy.recheckSchedule).toBe(schedule);
        expect(getHealthPolicy(BIZ_A).recheckSchedule).toBe(schedule);
      }
    });
  });

  describe("2. Content Hash & Zero-Waste Re-Embedding", () => {
    it("should compute deterministic SHA-256 content hashes", () => {
      const content = "Configuring Cloudflare DNS A and CNAME records.";
      const hash1 = computeContentHash(content);
      const hash2 = computeContentHash(content);
      const diffHash = computeContentHash(content + " New update.");

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).not.toBe(diffHash);
    });

    it("should index new pages on first read with content hash attached", async () => {
      const inputs: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/cname-setup",
          title: "Custom CNAME Setup",
          content: "Point CNAME to cluster proxy.",
          httpStatus: 200,
        },
      ];

      const run = await executeRefreshRun(BIZ_A, inputs);

      expect(run.pagesProcessed).toBe(1);
      expect(run.pagesEmbedded).toBe(1); // Embedded on initial creation
      expect(run.urlsList[0].changeType).toBe("new");
      expect(run.urlsList[0].contentHash).toBeDefined();

      const changes = getChangeHistory(BIZ_A);
      expect(changes).toHaveLength(1);
      expect(changes[0].changeType).toBe("created");
    });

    it("should skip re-chunking and re-embedding when content hash is unchanged (0 wasted tokens)", async () => {
      const inputs: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/webhook-guide",
          title: "Webhook Signature Guide",
          content: "Always verify HMAC SHA-256 signatures with your secret.",
          httpStatus: 200,
        },
      ];

      // Initial Ingestion Run
      const run1 = await executeRefreshRun(BIZ_A, inputs);
      expect(run1.pagesEmbedded).toBe(1);

      // Recheck Run with IDENTICAL content
      const run2 = await executeRefreshRun(BIZ_A, inputs);
      expect(run2.pagesProcessed).toBe(1);
      expect(run2.pagesEmbedded).toBe(0); // Zero tokens wasted!
      expect(run2.urlsList[0].changeType).toBe("unchanged");

      const changes = getChangeHistory(BIZ_A);
      // No new change history entry created for unchanged content
      expect(changes).toHaveLength(1);
    });

    it("should detect content changes, re-chunk and update embeddings when hash changes", async () => {
      const initial: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/refund-policy",
          title: "Refund Policy",
          content: "Refunds can be requested within 14 days.",
          httpStatus: 200,
        },
      ];

      await executeRefreshRun(BIZ_A, initial);

      // Subsequent recheck with UPDATED content
      const updated: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/refund-policy",
          title: "Refund Policy",
          content: "Refunds can be requested within 30 days via Billing team only.",
          httpStatus: 200,
        },
      ];

      const run2 = await executeRefreshRun(BIZ_A, updated);
      expect(run2.pagesProcessed).toBe(1);
      expect(run2.pagesEmbedded).toBe(1); // Embeddings recomputed!
      expect(run2.urlsList[0].changeType).toBe("updated");

      const changes = getChangeHistory(BIZ_A);
      expect(changes.length).toBeGreaterThanOrEqual(2);
      expect(changes[0].changeType).toBe("updated");
      expect(changes[0].oldContentHash).not.toBe(changes[0].newContentHash);
    });
  });

  describe("3. URL Health Levels & Lifecycle State Machine", () => {
    it("should move URL to Watch and increment failure counter on HTTP 404 or missing page", async () => {
      const inputs: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/broken-page",
          title: "Broken Page",
          httpStatus: 404,
        },
      ];

      const run = await executeRefreshRun(BIZ_A, inputs);
      expect(run.pagesFailed).toBe(1);
      expect(run.pagesPending).toBe(1);
      expect(run.urlsList[0].healthStatus).toBe("watch");
      expect(run.urlsList[0].consecutiveFailures).toBe(1);
    });

    it("should follow 301 Permanent Redirect, quarantine old URL, and record redirect URL", async () => {
      const inputs: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/v1-docs",
          title: "V1 Docs",
          httpStatus: 301,
          redirectUrl: "https://support.example.com/v2-docs",
        },
      ];

      const run = await executeRefreshRun(BIZ_A, inputs);
      expect(run.urlsList[0].healthStatus).toBe("quarantined");
      expect(run.urlsList[0].changeType).toBe("redirected");
      expect(run.urlsList[0].redirectUrl).toBe("https://support.example.com/v2-docs");
    });

    it("should enforce user-controlled X refreshes threshold before applying quarantine/archive action", async () => {
      // User sets X = 2 and actionRule = 'quarantine'
      setHealthPolicy(BIZ_A, { failureThresholdX: 2, actionRule: "quarantine" });

      const failingInput: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/deprecated-feature",
          httpStatus: 404,
        },
      ];

      // Refresh 1: Failures = 1 -> Status is 'watch'
      const run1 = await executeRefreshRun(BIZ_A, failingInput);
      expect(run1.urlsList[0].consecutiveFailures).toBe(1);
      expect(run1.urlsList[0].healthStatus).toBe("watch");

      // Refresh 2: Failures = 2 >= X -> Status moves to 'quarantined'
      const run2 = await executeRefreshRun(BIZ_A, failingInput);
      expect(run2.urlsList[0].consecutiveFailures).toBe(2);
      expect(run2.urlsList[0].healthStatus).toBe("quarantined");
    });

    it("should recover back to Active and reset failures to 0 when a page works again (HTTP 200)", async () => {
      // Step 1: Page fails twice and gets quarantined
      setHealthPolicy(BIZ_A, { failureThresholdX: 2, actionRule: "quarantine" });
      const failInput: CrawledPageCheckInput[] = [
        { url: "https://support.example.com/flaky-service", httpStatus: 404 },
      ];
      await executeRefreshRun(BIZ_A, failInput);
      await executeRefreshRun(BIZ_A, failInput);

      // Verify currently quarantined
      const pendingBefore = await getPendingUrls(BIZ_A);
      expect(pendingBefore.some((p) => p.url.includes("flaky-service"))).toBe(true);

      // Step 2: Page recovers (returns HTTP 200 in next refresh)
      const recoverInput: CrawledPageCheckInput[] = [
        {
          url: "https://support.example.com/flaky-service",
          title: "Flaky Service Restored",
          content: "Service restored to normal operation.",
          httpStatus: 200,
        },
      ];

      const runRecovered = await executeRefreshRun(BIZ_A, recoverInput);
      expect(runRecovered.urlsList[0].healthStatus).toBe("active");
      expect(runRecovered.urlsList[0].consecutiveFailures).toBe(0);
      expect(runRecovered.urlsList[0].changeType).toBe("recovered");

      // Verify change history records recovery
      const changes = getChangeHistory(BIZ_A);
      expect(changes[0].changeType).toBe("recovered");
    });
  });

  describe("4. Pending URLs Review Panel (Task 2.4 requirement)", () => {
    it("should return pending URLs and their consecutive failure counts before action is taken", async () => {
      setHealthPolicy(BIZ_A, { failureThresholdX: 3, actionRule: "quarantine" });

      await executeRefreshRun(BIZ_A, [
        { url: "https://support.example.com/page-failing-1", httpStatus: 404 },
        { url: "https://support.example.com/page-healthy", httpStatus: 200, content: "Healthy" },
      ]);

      const pending = await getPendingUrls(BIZ_A);
      expect(pending).toHaveLength(1);
      expect(pending[0].url).toBe("https://support.example.com/page-failing-1");
      expect(pending[0].consecutiveFailures).toBe(1);
      expect(pending[0].healthStatus).toBe("watch");
      expect(pending[0].pendingAction).toBe("watch");
    });
  });

  describe("5. Search Exclusion Guarantee: Quarantined & Archived URLs Never Appear in Answers", () => {
    it("should exclude quarantined and archived pages from search results", () => {
      expect(isEligibleForSearch("active")).toBe(true);
      expect(isEligibleForSearch("watch")).toBe(true);
      expect(isEligibleForSearch("quarantined")).toBe(false);
      expect(isEligibleForSearch("archived")).toBe(false);

      const corpus = [
        {
          chunk: { chunkIndex: 0, heading: "Active Guide", content: "Active and valid instructions." },
          pageUrl: "https://support.example.com/active-guide",
          sourceType: "sitemap" as const,
          simulatedVectorScore: 0.9,
          healthStatus: "active" as const,
        },
        {
          chunk: { chunkIndex: 1, heading: "Quarantined 404 Guide", content: "Dead link content." },
          pageUrl: "https://support.example.com/quarantined-guide",
          sourceType: "sitemap" as const,
          simulatedVectorScore: 0.99, // high similarity score must be ignored
          healthStatus: "quarantined" as const,
        },
        {
          chunk: { chunkIndex: 2, heading: "Archived Guide", content: "Historical archived content." },
          pageUrl: "https://support.example.com/archived-guide",
          sourceType: "sitemap" as const,
          simulatedVectorScore: 0.98, // high similarity score must be ignored
          healthStatus: "archived" as const,
        },
      ];

      const results = hybridSearchSimulate("guide instructions", corpus);
      expect(results).toHaveLength(1);
      expect(results[0].pageUrl).toBe("https://support.example.com/active-guide");
    });
  });

  describe("6. Archived Knowledge Base & 1-Click Recovery", () => {
    it("should preserve archived pages in Archived Knowledge Base without permanent deletion", async () => {
      setHealthPolicy(BIZ_A, { failureThresholdX: 1, actionRule: "quarantine" });

      await executeRefreshRun(BIZ_A, [
        { url: "https://support.example.com/retired-feature", httpStatus: 404 },
      ]);

      const archivedBase = await getArchivedKnowledgeBase(BIZ_A);
      expect(archivedBase.length).toBeGreaterThanOrEqual(1);
      expect(archivedBase[0].url).toBe("https://support.example.com/retired-feature");
      expect(archivedBase[0].healthStatus).toBe("quarantined");
    });

    it("should allow recovering archived page back to Active in 1 click", async () => {
      setHealthPolicy(BIZ_A, { failureThresholdX: 1, actionRule: "quarantine" });

      await executeRefreshRun(BIZ_A, [
        { url: "https://support.example.com/to-recover", httpStatus: 404 },
      ]);

      const archivedBefore = await getArchivedKnowledgeBase(BIZ_A);
      const targetId = archivedBefore[0].id;

      // Recover page
      const recovery = await recoverArchivedPage(BIZ_A, targetId);
      expect(recovery.success).toBe(true);
      expect(recovery.page.healthStatus).toBe("active");
      expect(recovery.page.consecutiveFailures).toBe(0);

      // Verify removed from quarantined/archived base
      const archivedAfter = await getArchivedKnowledgeBase(BIZ_A);
      expect(archivedAfter.find((p) => p.id === targetId)).toBeUndefined();
    });
  });

  describe("7. Refresh Run View & Metrics Reporting", () => {
    it("should report startedAt, finishedAt, and total URLs fetched at the bottom", async () => {
      const inputs: CrawledPageCheckInput[] = [
        { url: "https://support.example.com/page-1", content: "Content 1", httpStatus: 200 },
        { url: "https://support.example.com/page-2", content: "Content 2", httpStatus: 200 },
        { url: "https://support.example.com/page-3", httpStatus: 404 },
      ];

      const run = await executeRefreshRun(BIZ_A, inputs, { schedule: "weekly" });

      expect(run.schedule).toBe("weekly");
      expect(run.startedAt).toBeDefined();
      expect(run.finishedAt).toBeDefined();
      expect(run.totalUrlsFetched).toBe(3);
      expect(run.pagesProcessed).toBe(2);
      expect(run.pagesFailed).toBe(1);
      expect(run.urlsList).toHaveLength(3);

      const pastRuns = getRefreshRuns(BIZ_A);
      expect(pastRuns).toHaveLength(1);
      expect(pastRuns[0].totalUrlsFetched).toBe(3);

      const metrics = getFreshnessDashboardMetrics(BIZ_A);
      expect(metrics.pagesProcessed).toBe(3);
      expect(metrics.totalRuns).toBe(1);
    });
  });

  describe("8. Multi-Tenant Isolation", () => {
    it("should keep Business A and Business B refresh runs, health policies, and change histories strictly apart", async () => {
      setHealthPolicy(BIZ_A, { failureThresholdX: 2, recheckSchedule: "daily" });
      setHealthPolicy(BIZ_B, { failureThresholdX: 30, recheckSchedule: "monthly" as any });

      await executeRefreshRun(BIZ_A, [
        { url: "https://biz-a.com/article", content: "Biz A doc", httpStatus: 200 },
      ]);
      await executeRefreshRun(BIZ_B, [
        { url: "https://biz-b.com/article", content: "Biz B doc", httpStatus: 200 },
      ]);

      const runsA = getRefreshRuns(BIZ_A);
      const runsB = getRefreshRuns(BIZ_B);

      expect(runsA).toHaveLength(1);
      expect(runsB).toHaveLength(1);
      expect(runsA[0].urlsList[0].url).toContain("biz-a.com");
      expect(runsB[0].urlsList[0].url).toContain("biz-b.com");

      // Verify policies are strictly separate
      expect(getHealthPolicy(BIZ_A).failureThresholdX).toBe(2);
      expect(getHealthPolicy(BIZ_B).failureThresholdX).toBe(30);

      // Verify change histories are isolated
      const changesA = getChangeHistory(BIZ_A);
      const changesB = getChangeHistory(BIZ_B);
      expect(changesA[0].url).toBe("https://biz-a.com/article");
      expect(changesB[0].url).toBe("https://biz-b.com/article");
    });
  });
});
