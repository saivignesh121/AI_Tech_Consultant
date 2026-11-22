import { describe, it, expect, beforeEach } from "vitest";
import {
  getEmailThreads,
  updateThreadNote,
  updateMessageNote,
  analyzeNotesAndProposeSkillImprovement,
  getSkillImprovementProposals,
  approveSkillImprovement,
  rejectSkillImprovement,
  getDoneWhenDemonstration,
  resetEmailSkillsOptimizer,
} from "../src/services/brain/emailSkillsOptimizer";
import { getSkills, getSkillById, resetInMemorySkills } from "../src/services/brain/skillsManager";
import { executeConsultantTurn } from "../src/services/chat/agentLoop";

describe("Task 2.6: Past Emails Make the Skills Better (The Knowledge Brain)", () => {
  const TEST_BUSINESS_ID = "biz_test_task26";

  beforeEach(() => {
    resetEmailSkillsOptimizer(TEST_BUSINESS_ID);
    resetInMemorySkills(TEST_BUSINESS_ID);
  });

  // =========================================================================
  // 1. Fetching Past Email Threads & Messages from Connected Gmail
  // =========================================================================
  describe("1. Fetch Past Email Threads & Every Message in It", () => {
    it("fetches synced email threads with full message histories and metadata", () => {
      const threads = getEmailThreads(TEST_BUSINESS_ID);
      expect(threads.length).toBeGreaterThanOrEqual(2);

      const dnsThread = threads.find((t) => t.subject.includes("CNAME setup"));
      expect(dnsThread).toBeDefined();
      expect(dnsThread?.gmailThreadId).toContain("gmail-thread");
      expect(dnsThread?.messages.length).toBeGreaterThanOrEqual(2);

      // Verify individual message fields
      const firstMsg = dnsThread?.messages[0];
      expect(firstMsg?.fromAddress).toContain("@");
      expect(firstMsg?.toAddress).toContain("@");
      expect(firstMsg?.bodyText).toContain("staging subdomain");
      expect(firstMsg?.sentAt).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Writing Notes on the Whole Thread and on Any Single Message
  // =========================================================================
  describe("2. Human Teaching Notes on Whole Threads and Individual Messages", () => {
    it("allows a person to write and save a teaching note on the whole thread", () => {
      const threads = getEmailThreads(TEST_BUSINESS_ID);
      const targetThread = threads[0];

      const updated = updateThreadNote(
        TEST_BUSINESS_ID,
        targetThread.id,
        "General guidance: Customer needs priority onboarding support."
      );

      expect(updated.notes).toBe("General guidance: Customer needs priority onboarding support.");

      const reloaded = getEmailThreads(TEST_BUSINESS_ID).find((t) => t.id === targetThread.id);
      expect(reloaded?.notes).toBe("General guidance: Customer needs priority onboarding support.");
    });

    it("allows a person to write and save a teaching note on any single message in a thread", () => {
      const threads = getEmailThreads(TEST_BUSINESS_ID);
      const targetThread = threads[0];
      const targetMsg = targetThread.messages[1];

      const benchmarkNote =
        "This reply was too long. For DNS questions, always give the 3 steps first.";

      const result = updateMessageNote(
        TEST_BUSINESS_ID,
        targetThread.id,
        targetMsg.id,
        benchmarkNote
      );

      expect(result.message.notes).toBe(benchmarkNote);

      const reloadedThread = getEmailThreads(TEST_BUSINESS_ID).find((t) => t.id === targetThread.id);
      const reloadedMsg = reloadedThread?.messages.find((m) => m.id === targetMsg.id);
      expect(reloadedMsg?.notes).toBe(benchmarkNote);
    });
  });

  // =========================================================================
  // 3. Strong Model (Claude Opus 5.5) Skill Optimization from Teaching Notes
  // =========================================================================
  describe("3. Claude Opus 5.5 Evaluates Notes and Proposes Skill Improvements", () => {
    it("analyzes teaching notes, matches target skill, and generates a structured improvement proposal", () => {
      // Ensure benchmark note is recorded
      const threads = getEmailThreads(TEST_BUSINESS_ID);
      updateMessageNote(
        TEST_BUSINESS_ID,
        threads[0].id,
        threads[0].messages[1].id,
        "This reply was too long. For DNS questions, always give the 3 steps first."
      );

      const proposal = analyzeNotesAndProposeSkillImprovement(TEST_BUSINESS_ID, {
        modelId: "claude-opus-5.5",
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.modelUsed).toBe("claude-opus-5.5");
      expect(proposal.targetSkillSlug).toBe("dns-setup");
      expect(proposal.status).toBe("pending_human_review");

      // Verify diff summary and notes used attribution
      expect(proposal.diffSummary).toContain("Prioritized the 3 primary action steps directly at the top");
      expect(proposal.originatingNotes.length).toBeGreaterThanOrEqual(1);
      expect(proposal.originatingNotes[0].noteText).toContain("For DNS questions, always give the 3 steps first");

      // Verify proposed steps place 3 steps first
      expect(proposal.proposedStepsMarkdown).toContain("## Quick 3-Step Action Protocol (Always Given First):");
      expect(proposal.proposedStepsMarkdown).toContain("1. Add CNAME Record");
      expect(proposal.proposedStepsMarkdown).toContain("2. Toggle Proxy Status");
      expect(proposal.proposedStepsMarkdown).toContain("3. Verify Resolution");
    });
  });

  // =========================================================================
  // 4. Human Approval Gate: No Skill Change Until Human Approves
  // =========================================================================
  describe("4. Human Approval Gate & Version Incrementation in Settings", () => {
    it("does NOT apply proposed skill change to active skills while pending human approval", () => {
      const initialSkill = getSkillById(TEST_BUSINESS_ID, "dns-setup");
      expect(initialSkill?.currentVersionNumber).toBe(1);

      // Generate proposal
      const proposal = analyzeNotesAndProposeSkillImprovement(TEST_BUSINESS_ID);
      expect(proposal.status).toBe("pending_human_review");

      // Skill in Settings must remain at version 1 with original steps
      const skillWhilePending = getSkillById(TEST_BUSINESS_ID, "dns-setup");
      expect(skillWhilePending?.currentVersionNumber).toBe(1);
      expect(skillWhilePending?.stepsMarkdown).not.toContain("Quick 3-Step Action Protocol (Always Given First)");
    });

    it("marks proposal as rejected when human disapproves", () => {
      const proposal = analyzeNotesAndProposeSkillImprovement(TEST_BUSINESS_ID);
      const rejected = rejectSkillImprovement(TEST_BUSINESS_ID, proposal.id);

      expect(rejected.status).toBe("rejected");

      const skillAfterRejection = getSkillById(TEST_BUSINESS_ID, "dns-setup");
      expect(skillAfterRejection?.currentVersionNumber).toBe(1);
    });

    it("commits new version (v2) in Settings when human approves, allowing user editing", () => {
      const proposal = analyzeNotesAndProposeSkillImprovement(TEST_BUSINESS_ID);

      const approvalResult = approveSkillImprovement(
        TEST_BUSINESS_ID,
        proposal.id,
        "usr_human_approver"
      );

      expect(approvalResult.proposal.status).toBe("approved");
      expect(approvalResult.newVersionNumber).toBe(2);
      expect(approvalResult.updatedSkill.currentVersionNumber).toBe(2);

      // Check that the skill in Settings now has Version 2 active
      const skillInSettings = getSkillById(TEST_BUSINESS_ID, "dns-setup");
      expect(skillInSettings?.currentVersionNumber).toBe(2);
      expect(skillInSettings?.stepsMarkdown).toContain("Quick 3-Step Action Protocol (Always Given First)");
      expect(skillInSettings?.versions).toHaveLength(2);
      expect(skillInSettings?.versions[0].changeNotes).toContain("Approved from email teaching note");
    });
  });

  // =========================================================================
  // 5. Done-When Demonstration: Note -> Skill Change -> Better Answer
  // =========================================================================
  describe("5. Done-When Demonstration (Note -> Skill Change -> Better Answer)", () => {
    it("proves that one note causes a skill change, and produces a measurably better customer answer", async () => {
      const demo = getDoneWhenDemonstration(TEST_BUSINESS_ID);

      // 1. The Note
      expect(demo.note).toContain("This reply was too long. For DNS questions, always give the 3 steps first.");
      expect(demo.sourceThread).toBeDefined();

      // 2. The Skill Change It Caused
      expect(demo.skillName).toBe("DNS & Custom CNAME Setup");
      expect(demo.skillChangeDiff).toContain("Prioritized the 3 primary action steps directly at the top");

      // 3. One New Answer That Is Better Because of It
      expect(demo.beforeAnswer).toContain("Diagnostic Analysis & Technical Diagnostic Step-by-Step Resolution");
      expect(demo.beforeAnswer).toContain("To configure your custom domain, point your CNAME record to proxy cluster");
      // The before answer has verbose preliminaries and is long
      expect(demo.beforeAnswer.length).toBeGreaterThan(500);

      // The better answer directly gives the 3 steps first
      expect(demo.betterAnswer).toContain("Here are your 3 direct steps first:");
      expect(demo.betterAnswer).toContain("1. Add CNAME Record");
      expect(demo.betterAnswer).toContain("2. Toggle Proxy Status");
      expect(demo.betterAnswer).toContain("3. Verify Resolution");

      // Verify the explanation grounds the quality improvement
      expect(demo.whyBetter).toContain("leads directly with the 3 prioritized steps");
    });

    it("verifies chat agent applies the approved skill version in live execution", async () => {
      // 1. Before approval: answer uses Version 1
      const query = "How do I configure my custom subdomain CNAME records?";
      const turnBefore = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: query,
        roleSlug: "support-engineer",
      });

      expect(turnBefore.activeSkillUsed).toBe("DNS & Custom CNAME Setup");

      // 2. Approve proposal: upgrades skill to Version 2
      const proposals = getSkillImprovementProposals(TEST_BUSINESS_ID);
      approveSkillImprovement(TEST_BUSINESS_ID, proposals[0].id, "usr_admin");

      // 3. After approval: chat agent grounds on Version 2 steps
      const turnAfter = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: query,
        roleSlug: "support-engineer",
      });

      expect(turnAfter.activeSkillUsed).toBe("DNS & Custom CNAME Setup");
      expect(turnAfter.answer).toContain("Quick 3-Step Action Protocol (Always Given First)");
    });
  });
});
