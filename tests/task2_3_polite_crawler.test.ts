import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_CRAWL_CONFIG,
  getCrawlProgress,
  updateCrawlProgress,
  pauseCrawl,
  resumeCrawl,
  generateScreenshotUnderstanding,
  processBatchStep,
  resetInMemoryIndex,
  type CrawlProgressState,
} from "../src/services/brain/politeCrawler";
import { extractPageContent } from "../src/services/brain/htmlExtractor";
import { chunkPageContent } from "../src/services/brain/chunker";

describe("Feature 2: The Knowledge Brain - Task 2.3: Read Every Page Once, Politely", () => {
  const TEST_BIZ_ID = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    resetInMemoryIndex(TEST_BIZ_ID);
    // Reset progress tracker before each test
    updateCrawlProgress(TEST_BIZ_ID, {
      status: "idle",
      totalUrls: 0,
      processedUrls: 0,
      failedUrls: 0,
      skippedUrls: 0,
      progressPercent: 0,
      currentUrl: null,
      imagesDiscovered: 0,
      chunksCreated: 0,
      startedAt: null,
      elapsedSeconds: 0,
      estimatedSecondsLeft: 0,
      formattedTimeLeft: "0 mins left",
      recentActivity: [],
    });
  });

  describe("1. Polite Crawling Configuration & Rate Limits", () => {
    it("should enforce polite rate limit: 450 pages/hr and 8-second batch delay", () => {
      expect(DEFAULT_CRAWL_CONFIG.pagesPerHour).toBe(450);
      expect(DEFAULT_CRAWL_CONFIG.delayBetweenBatchesMs).toBe(8000);
      expect(DEFAULT_CRAWL_CONFIG.batchSize).toBe(5);
      expect(DEFAULT_CRAWL_CONFIG.maxRetries).toBe(3);

      const pagesPerDay = DEFAULT_CRAWL_CONFIG.pagesPerHour * 24;
      expect(pagesPerDay).toBe(10800);
    });

    it("should calculate remaining time based on polite rate", () => {
      const state = updateCrawlProgress(TEST_BIZ_ID, {
        status: "running",
        totalUrls: 100,
        processedUrls: 20,
        startedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute elapsed
      });

      const updated = getCrawlProgress(TEST_BIZ_ID);
      expect(updated.status).toBe("running");
      expect(updated.progressPercent).toBe(20);
      // 80 pages left * (3600 / 450 = 8s) = 640s = ~11 mins left
      expect(updated.estimatedSecondsLeft).toBeGreaterThan(600);
      expect(updated.formattedTimeLeft).toContain("mins left");
    });
  });

  describe("2. Pause, Resume & Interruption Resumption (Read Every Page Once)", () => {
    it("should pause and resume crawl without losing progress", () => {
      updateCrawlProgress(TEST_BIZ_ID, {
        status: "running",
        totalUrls: 50,
        processedUrls: 25,
      });

      const paused = pauseCrawl(TEST_BIZ_ID);
      expect(paused.status).toBe("paused");
      expect(paused.processedUrls).toBe(25);

      const resumed = resumeCrawl(TEST_BIZ_ID);
      expect(resumed.status).toBe("running");
      expect(resumed.processedUrls).toBe(25);
    });

    it("should enforce 'Read every page once' idempotency by skipping previously indexed pages", async () => {
      const urls = [
        "https://support.example.com/articles/custom-cname-setup",
      ];

      // Step 1: Ingest once
      const step1 = await processBatchStep(TEST_BIZ_ID, urls);
      expect(step1.processedInBatch + step1.skippedInBatch).toBe(1);

      // Step 2: Rerun on the same URLs - must be skipped without re-reading
      const step2 = await processBatchStep(TEST_BIZ_ID, urls);
      expect(step2.skippedInBatch).toBe(1);
      expect(step2.processedInBatch).toBe(0);

      const progress = getCrawlProgress(TEST_BIZ_ID);
      expect(progress.skippedUrls).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Understand the Images (Multimodal Screenshots & Page Attribution)", () => {
    it("should extract screenshots with alt text and section headings from HTML", () => {
      const sampleHtml = `
        <html>
          <head><title>Cloudflare SSL Setup Guide</title></head>
          <body>
            <h1>Cloudflare SSL Configuration</h1>
            <p>Ensure your encryption mode is configured as shown below.</p>
            <h2>Step 2: Encryption Mode</h2>
            <figure>
              <img src="https://cdn.example.com/ssl-full-strict.png" alt="Cloudflare SSL TLS settings showing Full Strict radio option selected" />
              <figcaption>Figure: Full Strict SSL Mode</figcaption>
            </figure>
          </body>
        </html>
      `;

      const extracted = extractPageContent(sampleHtml, "https://support.example.com/ssl-setup");
      expect(extracted.images).toHaveLength(1);
      expect(extracted.images[0].src).toBe("https://cdn.example.com/ssl-full-strict.png");
      expect(extracted.images[0].alt).toContain("Full Strict");
    });

    it("should generate rich visual screenshot understanding captions referencing the exact page and section", () => {
      const image = {
        src: "https://cdn.example.com/dns-cname.png",
        alt: "DNS management screen showing proxy CNAME record",
        contextHeading: "DNS Routing Setup",
      };

      const understanding = generateScreenshotUnderstanding(
        image,
        "Custom Domain Setup",
        "https://support.example.com/articles/custom-domain"
      );

      expect(understanding).toContain("Visual screenshot on page \"Custom Domain Setup\"");
      expect(understanding).toContain("under section \"DNS Routing Setup\"");
      expect(understanding).toContain("DNS management screen showing proxy CNAME record");
      expect(understanding).toContain("Visual instruction reference");
    });

    it("should attach screenshot URLs and captions to semantic knowledge chunks", () => {
      const sampleHtml = `
        <html>
          <head><title>Stripe Gateway Integration</title></head>
          <body>
            <h1>Stripe Payments</h1>
            <p>Configure your webhook signing secret in your dashboard.</p>
            <img src="https://cdn.example.com/stripe-webhook-key.png" alt="Stripe webhook signing secret field" />
          </body>
        </html>
      `;

      const extracted = extractPageContent(sampleHtml, "https://support.example.com/stripe");
      const chunks = chunkPageContent(extracted, 450, 50);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].imageUrl).toBe("https://cdn.example.com/stripe-webhook-key.png");
      expect(chunks[0].imageCaption).toBeDefined();
    });
  });

  describe("4. Background Batch Processing with Retries & Live Activity Stream", () => {
    it("should update progress and record live activity items with chunks and screenshot counts", async () => {
      const testUrls = [
        "https://support.example.com/articles/test-article-polite-1",
        "https://support.example.com/articles/test-article-polite-2",
      ];

      const batchResult = await processBatchStep(TEST_BIZ_ID, testUrls);
      expect(batchResult.processedInBatch + batchResult.skippedInBatch).toBe(2);

      const progress = getCrawlProgress(TEST_BIZ_ID);
      expect(progress.recentActivity.length).toBeGreaterThan(0);

      const latest = progress.recentActivity[0];
      expect(latest.url).toBeDefined();
      expect(["ok", "skipped", "failed"]).toContain(latest.status);
    });
  });
});
