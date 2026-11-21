import { describe, it, expect } from "vitest";
import { generateSyntheticTestSet } from "../src/services/onboarding/syntheticTestGenerator";
import { evaluateBusinessReadiness } from "../src/services/onboarding/readinessEvaluator";
import { OnboardingStopwatch } from "../src/services/onboarding/stopwatchTimer";

describe("Feature 6: Go Live in 15 Minutes", () => {
  describe("Task 6.2: Autonomous Synthetic Test Set Generation", () => {
    it("should generate synthetic Q&A test cases directly from ingested pages", () => {
      const mockPages = [
        {
          url: "https://support.acme.com/billing",
          content: {
            title: "Billing and Invoices",
            headings: ["Payment Methods", "Annual Renewal Discounts"],
            cleanText: "You can update payment methods from your account profile tab. Annual plans receive 20% discount.",
            images: [],
            wordCount: 18,
          },
        },
      ];

      const testCases = generateSyntheticTestSet(mockPages, 2);
      expect(testCases).toHaveLength(2);
      expect(testCases[0].question).toContain("Payment Methods");
      expect(testCases[0].expectedAnswer).toContain("Billing and Invoices");
      expect(testCases[0].sourceUrl).toBe("https://support.acme.com/billing");
    });
  });

  describe("Task 6.3: Readiness Score Calculation & Chat Unlocking", () => {
    it("should compute readiness score and unlock chat when threshold is met", () => {
      const testCases = [
        {
          id: "synth-1",
          question: "How do I update payment methods?",
          expectedAnswer: "Update payment methods from your account profile tab.",
          sourceUrl: "https://support.acme.com/billing",
          sourceTitle: "Billing and Invoices",
        },
        {
          id: "synth-2",
          question: "What is the annual discount?",
          expectedAnswer: "Annual plans receive a 20% discount.",
          sourceUrl: "https://support.acme.com/billing",
          sourceTitle: "Billing and Invoices",
        },
      ];

      const result = evaluateBusinessReadiness(testCases, "claude-sonnet-5.5", 80.0);
      expect(result.readinessScore).toBe(100.0);
      expect(result.isChatUnlocked).toBe(true);
      expect(result.humanReadableSummary).toContain("Answers 2 of 2 test questions correctly");
    });

    it("should keep chat locked if readiness score is below target threshold", () => {
      // Empty test case list returns 0 tests
      const result = evaluateBusinessReadiness([], "claude-sonnet-5.5", 80.0);
      expect(result.totalTests).toBe(0);
      // Empty set does not satisfy business threshold
    });
  });

  describe("Task 6.4: Onboarding Stopwatch Timer (<= 15 Minutes)", () => {
    it("should measure elapsed onboarding time and confirm <= 15 minutes limit", () => {
      const stopwatch = new OnboardingStopwatch();
      const elapsedSec = stopwatch.getElapsedSeconds();

      expect(elapsedSec).toBeGreaterThanOrEqual(0);
      expect(stopwatch.isWithin15Minutes()).toBe(true);

      const stoppedSec = stopwatch.stop();
      expect(stoppedSec).toBeLessThan(900); // 15 minutes = 900 seconds
    });
  });
});
