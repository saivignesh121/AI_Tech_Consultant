import { describe, it, expect, beforeEach } from "vitest";
import { compileWeeklyOwnerEmail } from "../src/lib/email";
import {
  classifyFailureForRepair,
  buildStandardOpusPrompt,
  verifyAntiCheatingGuards,
  ANTI_CHEATING_PILLARS,
} from "../src/services/self_improve/selfImproveDecisions";
import fs from "fs";
import path from "path";

describe("Feature 5: Tasks 5.3 & 5.4 (Report, Approve, Undo & Weekly Digest)", () => {
  // =========================================================================
  // Task 5.3: Report, Approve and Undo
  // =========================================================================
  describe("Task 5.3: Run Reports & 3 Real Runs", () => {
    it("should verify at least 3 real run reports exist, including one failure run", () => {
      const reportsDir = path.join(process.cwd(), "self_improve_reports");
      expect(fs.existsSync(reportsDir)).toBe(true);

      const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md"));
      expect(files.length).toBeGreaterThanOrEqual(3);

      // Verify Run 1: DNS routing fix (Success)
      const run1Content = fs.readFileSync(path.join(reportsDir, "run_001_dns_routing_fix.md"), "utf-8");
      expect(run1Content).toContain("Run #001 (SUCCESS)");
      expect(run1Content).toContain("What Failed Initially");
      expect(run1Content).toContain("What Claude Opus 5.5 Changed");
      expect(run1Content).toContain("100% (Passed)");
      expect(run1Content).toContain("2 rounds");
      expect(run1Content).toContain("$1.70 USD");

      // Verify Run 2: Refund edge case (Success)
      const run2Content = fs.readFileSync(path.join(reportsDir, "run_002_refund_edge_case.md"), "utf-8");
      expect(run2Content).toContain("Run #002 (SUCCESS)");
      expect(run2Content).toContain("What Failed Initially");
      expect(run2Content).toContain("What Claude Opus 5.5 Changed");
      expect(run2Content).toContain("100% (Passed");
      expect(run2Content).toContain("1 round");
      expect(run2Content).toContain("$0.85 USD");

      // Verify Run 3: Multi-vendor webhook conflict (Failure / Budget Limit Hit)
      const run3Content = fs.readFileSync(path.join(reportsDir, "run_003_failed_budget_exceeded.md"), "utf-8");
      expect(run3Content).toContain("FAILED - BUDGET LIMIT EXCEEDED");
      expect(run3Content).toContain("What Failed Initially");
      expect(run3Content).toContain("What Claude Opus 5.5 Attempted");
      expect(run3Content).toContain("5 / 5 max rounds");
      expect(run3Content).toContain("Total Cost");
      expect(run3Content).toContain("$4.85 USD");
      expect(run3Content).toContain("quarantined");
    });

    it("should verify 1-Click Approve updates both prompt and skill versions in Settings", async () => {
      // Mock POST /api/self-improve/approve
      const { POST: approvePost } = await import("../src/app/api/self-improve/approve/route");
      const req = new Request("http://localhost:3000/api/self-improve/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: "run-001" }),
      });

      const res = await approvePost(req as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("merged");
      expect(data.newPromptVersion).toBeDefined();
      expect(data.newSkillVersion).toBeDefined();
      expect(data.message).toContain("Production prompt updated");
      expect(data.message).toContain("skill");
    });

    it("should verify 1-Click Revert restores both prompt and skill versions", async () => {
      // Mock POST /api/self-improve/revert
      const { POST: revertPost } = await import("../src/app/api/self-improve/revert/route");
      const req = new Request("http://localhost:3000/api/self-improve/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: "run-001" }),
      });

      const res = await revertPost(req as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("reverted");
      expect(data.revertedPromptVersion).toBeDefined();
      expect(data.revertedSkillVersion).toBeDefined();
      expect(data.message).toContain("Patch reverted successfully");
    });
  });

  // =========================================================================
  // Task 5.4: Weekly Email to the Owner
  // =========================================================================
  describe("Task 5.4: Weekly Email to the Owner", () => {
    it("should compile a real weekly owner email with what got better, what failed, and cost audit", () => {
      const email = compileWeeklyOwnerEmail({
        businessName: "SaaS Flow Corp",
        accuracyScore: 98.4,
        accuracyDelta: 3.2,
        resolvedCount: 3,
        unresolvedCount: 1,
        monthlyCostUsd: 14.85,
        cachingSavingsUsd: 21.4,
        selfImproveCostUsd: 6.80,
      });

      // Verification of required email sections
      expect(email.subject).toContain("Weekly Report for SaaS Flow Corp");
      expect(email.htmlBody).toContain("98.4%");
      expect(email.htmlBody).toContain("+3.2% gain");
      expect(email.htmlBody).toContain("3 failing test cases fixed");
      expect(email.htmlBody).toContain("What Got Better This Week");
      expect(email.htmlBody).toContain("kb-dns-042");
      expect(email.htmlBody).toContain("chat-ref-019");
      expect(email.htmlBody).toContain("What Failed (Flagged for Human Review)");
      expect(email.htmlBody).toContain("kb-edge-999");
      expect(email.htmlBody).toContain("$14.85 USD");
      expect(email.htmlBody).toContain("$21.40 USD saved");

      // Plaintext body verification
      expect(email.textBody).toContain("AI TECH CONSULTANT WEEKLY EXECUTIVE DIGEST");
      expect(email.textBody).toContain("WHAT GOT BETTER THIS WEEK");
      expect(email.textBody).toContain("WHAT FAILED");
      expect(email.textBody).toContain("COST & EFFICIENCY AUDIT");
    });
  });

  // =========================================================================
  // Architectural Decisions: Triage, Prompt & Anti-Cheating
  // =========================================================================
  describe("Architectural Decisions: Triage, Prompt & Anti-Cheating", () => {
    it("Decision 1: should correctly classify factual errors to Opus and high-risk/ambiguous cases to humans", () => {
      // 1. Factual DNS error -> Opus
      const dnsResult = classifyFailureForRepair({
        caseId: "kb-dns-042",
        question: "What IP should my A record point to for Cloudflare proxying?",
        failingAnswer: "Point to 127.0.0.1",
        expectedAnswer: "Point to 54.214.12.8",
      });
      expect(dnsResult.sendToOpus).toBe(true);
      expect(dnsResult.destination).toBe("claude-opus-5.5");

      // 2. Legal threat -> Human Expert
      const legalResult = classifyFailureForRepair({
        caseId: "chat-legal-001",
        question: "My attorney is preparing a lawsuit unless you refund $50,000 immediately.",
        failingAnswer: "We will review your claim.",
      });
      expect(legalResult.sendToOpus).toBe(false);
      expect(legalResult.destination).toBe("human_expert");
      expect(legalResult.reason).toContain("Legal Shield");

      // 3. Financial dispute -> Human Expert
      const refundResult = classifyFailureForRepair({
        caseId: "chat-bill-002",
        question: "I demand a dispute charge refund after 6 months of usage.",
        failingAnswer: "Refunds are 30 days only.",
      });
      expect(refundResult.sendToOpus).toBe(false);
      expect(refundResult.destination).toBe("human_expert");
      expect(refundResult.reason).toContain("Financial Policy");

      // 4. Exhausted attempts (>= 3) -> Human Expert
      const ceilingResult = classifyFailureForRepair({
        caseId: "kb-edge-999",
        question: "Circular webhook issue",
        failingAnswer: "Failed answer",
        attemptsCount: 3,
      });
      expect(ceilingResult.sendToOpus).toBe(false);
      expect(ceilingResult.destination).toBe("human_expert");
      expect(ceilingResult.reason).toContain("Ceiling Limit");
    });

    it("Decision 2: should construct standardized 5-Part Prompt Architecture for Opus", () => {
      const prompt = buildStandardOpusPrompt({
        caseId: "kb-dns-042",
        branchName: "self-improve/fix-kb-dns-042-1732185600",
        question: "What A-record should I point to?",
        failingAnswer: "127.0.0.1",
        expectedAnswer: "54.214.12.8",
        critique: "Failed to cite correct IP.",
        systemPrompt: "You are an elite consultant.",
        relatedCode: [{ filePath: "skills/dns.md", content: "Route to 54.214.12.8" }],
      });

      expect(prompt).toContain("PART 1: SANDBOX CONSTRAINTS & REPOSITORY FENCING");
      expect(prompt).toContain("PART 2: FAILURE DIAGNOSTICS & HUMAN/JUDGE CRITIQUE");
      expect(prompt).toContain("PART 3: REPOSITORY CONTEXT & CODE GROUNDING");
      expect(prompt).toContain("PART 4: OBJECTIVE & HIDDEN EVALUATION NOTICE");
      expect(prompt).toContain("PART 5: UNIFIED DIFF OUTPUT SPECIFICATION");
    });

    it("Decision 3: should enforce Anti-Cheating guardrails and test immutability", () => {
      expect(ANTI_CHEATING_PILLARS.pillar1_immutable_test_infrastructure).toBeDefined();
      expect(ANTI_CHEATING_PILLARS.pillar2_segregated_hidden_check_set).toBeDefined();
      expect(ANTI_CHEATING_PILLARS.pillar3_whole_benchmark_regression_gate).toBeDefined();
      expect(ANTI_CHEATING_PILLARS.pillar4_calibrated_master_judge).toBeDefined();

      // Guardrail blocks edits to benchmark suites
      const checkCheating = verifyAntiCheatingGuards(["benchmark/benchmark_180.json"]);
      expect(checkCheating.compliant).toBe(false);
      expect(checkCheating.explanation).toContain("Anti-Cheating Guardrail Triggered");

      // Guardrail allows edits to prompts and skills
      const checkCompliant = verifyAntiCheatingGuards(["src/services/chat/prompts.ts", "skills/dns-troubleshooting.md"]);
      expect(checkCompliant.compliant).toBe(true);
      expect(checkCompliant.violations).toHaveLength(0);
    });
  });
});
