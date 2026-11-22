import { describe, it, expect, beforeEach } from "vitest";
import {
  convertFeedbackToTestCase,
  getAllFeedbackTestCases,
  getFeedbackTestCaseById,
  clearFeedbackTestCases,
  FeedbackPayload,
} from "@/services/eval/feedbackTestGenerator";
import {
  evaluateReleaseGate,
  evaluatePromptReleaseGate,
  evaluateRoleReleaseGate,
  evaluateSkillReleaseGate,
  evaluateModelReleaseGate,
  getReleaseGateAuditLogs,
  clearReleaseGateLogs,
} from "@/services/eval/releaseGate";
import {
  TASK_SCORING_STANDARDS,
  RULES_VS_JUDGE_BOUNDARIES,
  ANTI_SATURATION_POLICIES,
} from "@/services/eval/releaseGateDecisions";

describe("Task 4.4 & Task 4.5: Real Feedback Becomes New Tests & The Release Gate", () => {
  beforeEach(() => {
    clearFeedbackTestCases();
    clearReleaseGateLogs();
  });

  // =========================================================================
  // TASK 4.4: REAL FEEDBACK BECOMES NEW TESTS
  // =========================================================================
  describe("Task 4.4: Real Feedback Becomes New Tests", () => {
    it("converts a thumbs-down critique into a new hard benchmark test case", async () => {
      const payload: FeedbackPayload = {
        chatMessageId: "msg-101",
        question: "Can I configure a CNAME record directly on my root apex domain (example.com)?",
        aiAnswer: "Yes, simply create a CNAME record with name '@' pointing to your application.",
        feedbackType: "thumbs_down",
        reason:
          "This is wrong. RFC 1912 forbids CNAME at the apex root domain because it overrides MX and SOA records. Use ALIAS or Cloudflare CNAME flattening instead.",
        correctedAnswer:
          "No. RFC 1912 prohibits CNAME records on the apex root domain. You must use an ALIAS/ANAME record or CNAME flattening.",
      };

      const testCase = await convertFeedbackToTestCase(payload);

      expect(testCase.id).toMatch(/^feedback-/);
      expect(testCase.source).toBe("real_feedback");
      expect(testCase.feedbackType).toBe("thumbs_down");
      expect(testCase.difficulty).toBe("hard");
      expect(testCase.weight).toBe(1.5);
      expect(testCase.question).toBe(payload.question);
      expect(testCase.expectedAnswer).toBe(payload.correctedAnswer);
      expect(testCase.feedbackReason).toContain("RFC 1912 forbids CNAME");
      expect(testCase.originalAiAnswer).toBe(payload.aiAnswer);
    });

    it("synthesizes expectedAnswer from human reason if explicit correctedAnswer is omitted", async () => {
      const payload: FeedbackPayload = {
        question: "What is your refund policy for annual enterprise subscriptions?",
        aiAnswer: "All subscriptions are strictly non-refundable under all circumstances.",
        feedbackType: "thumbs_down",
        reason:
          "Enterprise contracts include a 30-day money-back satisfaction guarantee per master service agreement section 4.2.",
      };

      const testCase = await convertFeedbackToTestCase(payload);

      expect(testCase.expectedAnswer).toContain(payload.reason);
      expect(testCase.expectedAnswer).toContain("Avoid previous flawed answer");
      expect(testCase.source).toBe("real_feedback");
    });

    it("converts a thumbs-up endorsement into a verified positive benchmark test case", async () => {
      const payload: FeedbackPayload = {
        question: "How do I securely verify incoming Stripe webhook signatures in Node.js?",
        aiAnswer:
          "Compute the HMAC-SHA256 signature and compare using crypto.timingSafeEqual to prevent side-channel timing attacks [1].",
        feedbackType: "thumbs_up",
        reason: "Accurate implementation citing crypto.timingSafeEqual to prevent side-channel timing attacks.",
      };

      const testCase = await convertFeedbackToTestCase(payload);

      expect(testCase.feedbackType).toBe("thumbs_up");
      expect(testCase.expectedAnswer).toBe(payload.aiAnswer);
      expect(testCase.difficulty).toBe("standard");
      expect(testCase.weight).toBe(1.0);
    });

    it("auto-categorizes questions into relevant domains", async () => {
      const dnsTest = await convertFeedbackToTestCase({
        question: "Cloudflare DNS orange cloud proxy error 521",
        aiAnswer: "Reboot server",
        feedbackType: "thumbs_down",
        reason: "Error 521 means origin server refused connection; check port 443 listening.",
      });
      expect(dnsTest.category).toBe("DNS & Domains");

      const legalTest = await convertFeedbackToTestCase({
        question: "I demand a refund or my lawyer will file a lawsuit tomorrow",
        aiAnswer: "Here is 10% discount",
        feedbackType: "thumbs_down",
        reason: "Must escalate immediately to human legal triage",
      });
      expect(legalTest.category).toBe("Escalation & Safety");
      expect(legalTest.expectedAction).toBe("send_to_human");
    });

    it("retrieves all feedback test cases and can find by ID", async () => {
      const test = await convertFeedbackToTestCase({
        question: "Query test retrieval",
        aiAnswer: "Answer 1",
        feedbackType: "thumbs_up",
        reason: "Good answer",
      });

      const all = getAllFeedbackTestCases();
      expect(all.length).toBeGreaterThanOrEqual(1);

      const found = getFeedbackTestCaseById(test.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(test.id);
    });
  });

  // =========================================================================
  // TASK 4.5: A RELEASE GATE
  // =========================================================================
  describe("Task 4.5: The Release Gate Enforcer", () => {
    it("BLOCKS release when candidate score falls below baseline (Regression)", () => {
      const gate = evaluateReleaseGate({
        entityType: "prompt",
        entityName: "master_consultant_prompt",
        candidateScore: 94.2,
        baselineScore: 96.8,
      });

      expect(gate.canRelease).toBe(false);
      expect(gate.allowed).toBe(false);
      expect(gate.status).toBe("BLOCKED");
      expect(gate.scoreDelta).toBe(-2.6);
      expect(gate.reason).toContain("Blocked by Release Gate: Regression detected");
      expect(gate.reason).toContain("Candidate score dropped by 2.6%");
    });

    it("BLOCKS release when candidate score is below minimum pass threshold (80.0%)", () => {
      const gate = evaluateReleaseGate({
        entityType: "role",
        entityName: "experimental_junior_consultant",
        candidateScore: 78.5,
        baselineScore: 75.0, // Improved over old baseline, but below absolute quality bar
        minimumPassThreshold: 80.0,
      });

      expect(gate.canRelease).toBe(false);
      expect(gate.status).toBe("BLOCKED");
      expect(gate.reason).toContain("below the minimum required pass threshold (80%)");
    });

    it("PASSES release when candidate score matches or improves over baseline", () => {
      const gate = evaluateReleaseGate({
        entityType: "skill",
        entityName: "refund_escalation_protocol",
        candidateScore: 98.8,
        baselineScore: 96.5,
      });

      expect(gate.canRelease).toBe(true);
      expect(gate.allowed).toBe(true);
      expect(gate.status).toBe("PASSED");
      expect(gate.scoreDelta).toBe(2.3);
      expect(gate.reason).toContain("Release Gate Passed");
      expect(gate.reason).toContain("Approved for production release");
    });

    it("BLOCKS release if any category sub-score regresses, even if overall score matches", () => {
      const gate = evaluateReleaseGate({
        entityType: "prompt",
        entityName: "qa_answer_prompt",
        candidateScore: 97.0,
        baselineScore: 97.0,
        baselineCategoryScores: {
          "Citations & Grounding": 98.0,
          "Safety & Escalation": 99.0,
        },
        candidateCategoryScores: {
          "Citations & Grounding": 100.0, // +2%
          "Safety & Escalation": 94.0,   // -5% (REGRESSED)
        },
      });

      expect(gate.canRelease).toBe(false);
      expect(gate.status).toBe("BLOCKED");
      expect(gate.regressedCategories).toBeDefined();
      expect(gate.regressedCategories?.length).toBe(1);
      expect(gate.regressedCategories?.[0]).toContain("Safety & Escalation: dropped from 99% to 94%");
    });

    it("supports specialized evaluators for Prompts, Roles, Skills, and Models", () => {
      const promptGate = evaluatePromptReleaseGate("system_prompt", 99.0, 96.0);
      expect(promptGate.entityType).toBe("prompt");
      expect(promptGate.allowed).toBe(true);

      const roleGate = evaluateRoleReleaseGate("support_engineer", 92.0, 95.0);
      expect(roleGate.entityType).toBe("role");
      expect(roleGate.allowed).toBe(false);

      const skillGate = evaluateSkillReleaseGate("ssl_setup", 99.5, 99.0);
      expect(skillGate.entityType).toBe("skill");
      expect(skillGate.allowed).toBe(true);

      const modelGate = evaluateModelReleaseGate("step_write_reply", 90.0, 98.8);
      expect(modelGate.entityType).toBe("model");
      expect(modelGate.allowed).toBe(false);
    });

    it("records release gate audit history", () => {
      evaluateReleaseGate("prompt", "prompt_a", 98.0, 95.0);
      evaluateReleaseGate("role", "role_b", 92.0, 96.0);

      const logs = getReleaseGateAuditLogs(5);
      expect(logs.length).toBe(2);
      expect(logs[0].entityName).toBe("role_b");
      expect(logs[0].status).toBe("BLOCKED");
      expect(logs[1].entityName).toBe("prompt_a");
      expect(logs[1].status).toBe("PASSED");
    });
  });

  // =========================================================================
  // THE THREE ARCHITECTURAL DECISIONS ("YOU DECIDE")
  // =========================================================================
  describe("The Three Architectural Decisions (Task 4.5)", () => {
    it("defines explicit scoring standards for all 6 eval tasks", () => {
      const requiredTasks = [
        "tag_job",
        "find_facts",
        "write_reply",
        "read_screenshot",
        "improve_skill",
        "judge_eval",
      ];

      for (const t of requiredTasks) {
        const standard = TASK_SCORING_STANDARDS[t];
        expect(standard).toBeDefined();
        expect(standard.criteria.length).toBeGreaterThan(0);
        expect(standard.minimumPassScore).toBeGreaterThanOrEqual(90.0);
        expect(standard.scoringFormula).toBeTruthy();
        expect(standard.sampleCheck).toBeTruthy();
      }
    });

    it("defines clear rules vs AI judge boundaries with rationale and cost/latency profiles", () => {
      expect(RULES_VS_JUDGE_BOUNDARIES.length).toBeGreaterThanOrEqual(4);

      const ruleDomains = RULES_VS_JUDGE_BOUNDARIES.filter((b) => b.evaluator === "Deterministic Rule");
      const judgeDomains = RULES_VS_JUDGE_BOUNDARIES.filter((b) => b.evaluator === "AI Master Judge");

      expect(ruleDomains.length).toBeGreaterThanOrEqual(2);
      expect(judgeDomains.length).toBeGreaterThanOrEqual(2);

      // Verify deterministic rules run at $0.00
      ruleDomains.forEach((r) => {
        expect(r.costLatencyProfile).toContain("$0.00");
      });
    });

    it("defines anti-saturation policies to prevent test set from becoming too easy over time", () => {
      expect(ANTI_SATURATION_POLICIES.length).toBe(4);

      const mechanisms = ANTI_SATURATION_POLICIES.map((p) => p.mechanism);
      expect(mechanisms.some((m) => m.includes("Continuous Real Feedback Ingestion"))).toBe(true);
      expect(mechanisms.some((m) => m.includes("Adversarial Injection"))).toBe(true);
      expect(mechanisms.some((m) => m.includes("Dynamic Difficulty Weighting"))).toBe(true);
      expect(mechanisms.some((m) => m.includes("Immutable Benchmark Version"))).toBe(true);
    });
  });
});
