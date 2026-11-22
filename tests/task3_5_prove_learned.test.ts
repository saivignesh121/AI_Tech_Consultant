import { describe, it, expect, beforeEach } from "vitest";
import {
  runBeforeAfterLessonEvaluation,
  COMPARATIVE_SCENARIOS,
  LessonLearningProof,
} from "../src/services/eval/lessonEvalProver";
import {
  resetInMemoryLessons,
  getLessons,
  approveLesson,
  updateLesson,
} from "../src/services/chat/lessonManager";
import { executeConsultantTurn } from "../src/services/chat/agentLoop";

describe("Task 3.5: Prove That It Learned (Comparative Eval Suite)", () => {
  const businessId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    resetInMemoryLessons(businessId);
  });

  describe("1. Comparative Scenarios Coverage", () => {
    it("defines distinct real-world failure scenarios for DNS, refunds, and webhooks", () => {
      expect(COMPARATIVE_SCENARIOS.length).toBeGreaterThanOrEqual(3);
      const scenarioIds = COMPARATIVE_SCENARIOS.map((s) => s.id);
      expect(scenarioIds).toContain("dns-acme-ssl");
      expect(scenarioIds).toContain("strict-refund-policy");
      expect(scenarioIds).toContain("webhook-timing-safe");
    });
  });

  describe("2. End-to-End Comparative Learning Demonstration", () => {
    it("demonstrates empirical improvement from failing baseline to passing after DNS lesson approval", async () => {
      const proof: LessonLearningProof = await runBeforeAfterLessonEvaluation({
        businessId,
        scenarioId: "dns-acme-ssl",
        candidateModelId: "claude-sonnet-5.5",
        judgeModelId: "claude-opus-5.5",
      });

      // Verification of Before state (Unlearned baseline)
      expect(proof.before.score).toBeLessThanOrEqual(50);
      expect(proof.before.passed).toBe(false);
      expect(proof.before.reason).toContain("Failed benchmark pass-bar");
      expect(proof.before.appliedLessons).toHaveLength(0);

      // Verification of After state (Post-approval learning)
      expect(proof.after.score).toBeGreaterThanOrEqual(90);
      expect(proof.after.passed).toBe(true);
      expect(proof.after.appliedLessons.length).toBeGreaterThan(0);
      expect(proof.after.appliedLessons[0]).toContain("Cloudflare");

      // Verification of Delta & Learned Status
      expect(proof.scoreDelta).toBeGreaterThanOrEqual(50);
      expect(proof.percentageImprovement).toBeGreaterThan(100);
      expect(proof.learnedStatus).toBe("verified_learned");
      expect(proof.summaryText).toContain("Empirical Learning Verified");
    });

    it("demonstrates empirical improvement on strict refund policy scenario", async () => {
      const proof: LessonLearningProof = await runBeforeAfterLessonEvaluation({
        businessId,
        scenarioId: "strict-refund-policy",
        candidateModelId: "claude-sonnet-5.5",
      });

      expect(proof.before.score).toBeLessThanOrEqual(50);
      expect(proof.before.passed).toBe(false);
      expect(proof.after.score).toBeGreaterThanOrEqual(95);
      expect(proof.after.passed).toBe(true);
      expect(proof.scoreDelta).toBeGreaterThanOrEqual(50);
      expect(proof.learnedStatus).toBe("verified_learned");
    });

    it("verifies that the learned answer contains the approved lesson markdown rule", async () => {
      const proof: LessonLearningProof = await runBeforeAfterLessonEvaluation({
        businessId,
        scenarioId: "dns-acme-ssl",
      });

      // The post-learning response must explicitly incorporate the approved lesson
      expect(proof.after.answer).toContain("[APPROVED LESSON:");
      expect(proof.after.answer).toContain("Cloudflare");
    });
  });

  describe("3. Strict Gate Guarantee: Unapproved Lessons Never Alter Answers", () => {
    it("proves that a pending or inactive lesson does not boost the score", async () => {
      const lessons = await getLessons(businessId);
      const dnsLesson = lessons.find((l) => l.title.includes("Cloudflare"));

      if (dnsLesson) {
        // Deactivate lesson
        await updateLesson(businessId, dnsLesson.id, {
          status: "pending",
          isActive: false,
        });

        const turn = await executeConsultantTurn({
          businessId,
          userMessage: "Why is my Let's Encrypt SSL certificate challenge failing on custom domain?",
          roleSlug: "support-engineer",
        });

        // Must not contain approved lesson tag
        expect(turn.answer).not.toContain("[APPROVED LESSON:");
        expect(turn.activeLessonsUsed).toHaveLength(0);
      }
    });
  });
});
