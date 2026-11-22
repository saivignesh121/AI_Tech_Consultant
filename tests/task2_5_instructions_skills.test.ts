import { describe, it, expect, beforeEach } from "vitest";
import {
  createInstruction,
  updateInstruction,
  toggleInstruction,
  deleteInstruction,
  getInstructions,
  getActiveInstructionsForRole,
  compileInstructionsForPrompt,
  resetInMemoryInstructions,
} from "../src/services/brain/instructionsManager";
import {
  createSkillByHand,
  draftSkillFromDescription,
  pickSkillForQuery,
  saveSkillVersion,
  rollbackSkillToVersion,
  testSkillInChat,
  formatSkillAsMarkdownFile,
  getSkills,
  getSkillById,
  resetInMemorySkills,
} from "../src/services/brain/skillsManager";
import { executeConsultantTurn } from "../src/services/chat/agentLoop";

describe("Task 2.5: Instructions and Skills (The Knowledge Brain)", () => {
  const TEST_BUSINESS_ID = "biz_test_task25";

  beforeEach(() => {
    resetInMemoryInstructions(TEST_BUSINESS_ID);
    resetInMemorySkills(TEST_BUSINESS_ID);
  });

  // =========================================================================
  // 1. Instructions: Write, Edit, Switch On/Off, Delete & Role Scoping
  // =========================================================================
  describe("1. Instructions Management & Strict Role Scoping", () => {
    it("creates a new plain-English instruction rule with role scoping", () => {
      const created = createInstruction(TEST_BUSINESS_ID, {
        title: "No Discount Policy",
        ruleText: "Never offer discounts exceeding 15% without VP Sales written consent.",
        appliesToRoles: ["ai-consultant"],
        isActive: true,
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe("No Discount Policy");
      expect(created.ruleText).toContain("Never offer discounts exceeding 15%");
      expect(created.appliesToRoles).toEqual(["ai-consultant"]);
      expect(created.isActive).toBe(true);

      const all = getInstructions(TEST_BUSINESS_ID);
      expect(all.some((i) => i.id === created.id)).toBe(true);
    });

    it("edits an existing instruction rule text and target roles", () => {
      const created = createInstruction(TEST_BUSINESS_ID, {
        title: "Log Verbosity Rule",
        ruleText: "Log all inbound requests with INFO level.",
        appliesToRoles: ["support-engineer"],
      });

      const updated = updateInstruction(TEST_BUSINESS_ID, created.id, {
        ruleText: "Log all inbound requests with DEBUG level and include correlation headers.",
        appliesToRoles: ["support-engineer", "ai-consultant"],
      });

      expect(updated.ruleText).toContain("DEBUG level");
      expect(updated.appliesToRoles).toEqual(["support-engineer", "ai-consultant"]);
    });

    it("switches an instruction ON and OFF (toggle)", () => {
      const created = createInstruction(TEST_BUSINESS_ID, {
        title: "Maintenance Banner Notice",
        ruleText: "Inform all customers about scheduled downtime on Sunday 02:00 UTC.",
        isActive: true,
      });

      expect(created.isActive).toBe(true);

      const paused = toggleInstruction(TEST_BUSINESS_ID, created.id, false);
      expect(paused.isActive).toBe(false);

      const activated = toggleInstruction(TEST_BUSINESS_ID, created.id, true);
      expect(activated.isActive).toBe(true);
    });

    it("deletes an instruction rule", () => {
      const created = createInstruction(TEST_BUSINESS_ID, {
        title: "Temporary Promotion Rule",
        ruleText: "Mention Black Friday deal to every user.",
      });

      const deleted = deleteInstruction(TEST_BUSINESS_ID, created.id);
      expect(deleted).toBe(true);

      const remaining = getInstructions(TEST_BUSINESS_ID);
      expect(remaining.some((i) => i.id === created.id)).toBe(false);
    });

    it("strictly isolates role-targeted instructions vs 'all' role instructions", () => {
      createInstruction(TEST_BUSINESS_ID, {
        title: "Global Compliance Directive",
        ruleText: "Always mask card numbers and phone data.",
        appliesToRoles: ["all"],
        isActive: true,
      });

      createInstruction(TEST_BUSINESS_ID, {
        title: "Engineer CLI Rule",
        ruleText: "Always output verified dig commands.",
        appliesToRoles: ["support-engineer"],
        isActive: true,
      });

      createInstruction(TEST_BUSINESS_ID, {
        title: "Executive Greeting Rule",
        ruleText: "Always greet with a warm emoji and friendly opening.",
        appliesToRoles: ["support-executive"],
        isActive: true,
      });

      createInstruction(TEST_BUSINESS_ID, {
        title: "Inactive Rule",
        ruleText: "Should not appear anywhere when inactive.",
        appliesToRoles: ["all"],
        isActive: false,
      });

      // Query for Support Engineer
      const engineerInstructions = getActiveInstructionsForRole(TEST_BUSINESS_ID, "support-engineer");
      const engineerTitles = engineerInstructions.map((i) => i.title);
      expect(engineerTitles).toContain("Global Compliance Directive");
      expect(engineerTitles).toContain("Engineer CLI Rule");
      expect(engineerTitles).not.toContain("Executive Greeting Rule");
      expect(engineerTitles).not.toContain("Inactive Rule");

      // Query for Support Executive
      const executiveInstructions = getActiveInstructionsForRole(TEST_BUSINESS_ID, "support-executive");
      const executiveTitles = executiveInstructions.map((i) => i.title);
      expect(executiveTitles).toContain("Global Compliance Directive");
      expect(executiveTitles).toContain("Executive Greeting Rule");
      expect(executiveTitles).not.toContain("Engineer CLI Rule");

      // Query for AI Consultant
      const consultantInstructions = getActiveInstructionsForRole(TEST_BUSINESS_ID, "ai-consultant");
      const consultantTitles = consultantInstructions.map((i) => i.title);
      expect(consultantTitles).toContain("Global Compliance Directive");
      expect(consultantTitles).not.toContain("Engineer CLI Rule");
      expect(consultantTitles).not.toContain("Executive Greeting Rule");
    });

    it("compiles instructions into a high-precedence prompt injection block", () => {
      const active = [
        {
          id: "1",
          businessId: TEST_BUSINESS_ID,
          title: "Refund Policy",
          ruleText: "Never promise a refund. Route to Billing.",
          appliesToRoles: ["all"],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const compiled = compileInstructionsForPrompt(active);
      expect(compiled).toContain("[MANDATORY OPERATIONAL INSTRUCTIONS — HIGHEST PRECEDENCE]");
      expect(compiled).toContain("Never promise a refund. Route to Billing.");
      expect(compiled).toContain("Rule: You MUST adhere strictly to these instructions above all other guidelines");
    });
  });

  // =========================================================================
  // 2. Skills: Markdown Files, Autonomous Selection, Creation Modes & Versioning
  // =========================================================================
  describe("2. Skills Studio, Autonomous Picking & Version History", () => {
    it("Method A: Creates a skill by hand with YAML frontmatter and examples", () => {
      const skill = createSkillByHand(TEST_BUSINESS_ID, {
        name: "Cloudflare SSL Handshake Fix",
        description: "Fixing 525 and 526 SSL handshake errors with Cloudflare edge proxy.",
        triggerConditions: "When a customer reports Cloudflare error 525 or 526 SSL handshake failure.",
        stepsMarkdown: `# Cloudflare SSL Handshake Resolution

## Step-by-Step Resolution Protocol
1. Check origin certificate validity.
2. In Cloudflare Dashboard, set SSL mode to Full (Strict).
3. Verify TLS 1.3 handshake with openssl s_client.`,
        examples: [
          {
            question: "Why am I seeing Cloudflare error 525?",
            answer: "Check that your origin server has an active SSL certificate and TLS 1.2+ enabled.",
          },
        ],
      });

      expect(skill.id).toBeDefined();
      expect(skill.name).toBe("Cloudflare SSL Handshake Fix");
      expect(skill.currentVersionNumber).toBe(1);
      expect(skill.versions).toHaveLength(1);
      expect(skill.examples).toHaveLength(1);

      // Verify formatted Markdown file export
      const mdFile = formatSkillAsMarkdownFile(skill);
      expect(mdFile).toContain('name: "Cloudflare SSL Handshake Fix"');
      expect(mdFile).toContain("trigger_conditions:");
      expect(mdFile).toContain("## Step-by-Step Resolution Protocol");
      expect(mdFile).toContain("## Verified Few-Shot Examples");
      expect(mdFile).toContain("Why am I seeing Cloudflare error 525?");
    });

    it("Method B: Describes in a few words and lets the agent draft the skill", () => {
      const drafted = draftSkillFromDescription(
        "Stripe Webhook Idempotency",
        "handling duplicate webhook events and idempotency keys"
      );

      expect(drafted.name).toBe("Stripe Webhook Idempotency");
      expect(drafted.slug).toBe("stripe-webhook-idempotency");
      expect(drafted.triggerConditions).toContain("handling duplicate webhook events");
      expect(drafted.stepsMarkdown).toContain("# Stripe Webhook Idempotency Protocol");
      expect(drafted.stepsMarkdown).toContain("1. Initial Diagnosis");
      expect(drafted.stepsMarkdown).toContain("2. Technical Prerequisites");
      expect(drafted.stepsMarkdown).toContain("3. Step-by-Step Resolution");
      expect(drafted.stepsMarkdown).toContain("4. Validation & Wrap-up");
      expect(drafted.examples.length).toBeGreaterThanOrEqual(1);
    });

    it("Autonomous Skill Selection: Agent picks the right skill for each question by itself", () => {
      const skills = getSkills(TEST_BUSINESS_ID);
      expect(skills.length).toBeGreaterThanOrEqual(3);

      // Query 1: Domain setup -> Matches DNS Setup
      const match1 = pickSkillForQuery("How do I point my custom subdomain CNAME to the cluster?", skills);
      expect(match1).not.toBeNull();
      expect(match1?.slug).toBe("dns-setup");

      // Query 2: Webhook signature error -> Matches Webhook Verification
      const match2 = pickSkillForQuery("Why is my webhook failing with 401 invalid signature?", skills);
      expect(match2).not.toBeNull();
      expect(match2?.slug).toBe("webhook-verification");

      // Query 3: Refund dispute -> Matches Refund Escalation
      const match3 = pickSkillForQuery("I want my money back for this month's subscription", skills);
      expect(match3).not.toBeNull();
      expect(match3?.slug).toBe("refund-escalation");

      // Query 4: Unrelated query -> Returns null
      const match4 = pickSkillForQuery("What is the weather in Tokyo today?", skills);
      expect(match4).toBeNull();
    });

    it("Side-by-side Test Chat: Simulates skill resolution before saving", () => {
      const testSteps = `1. Check DNS records in registrar.\n2. Add CNAME record pointing to proxy cluster.\n3. Validate with dig command.`;
      const testResult = testSkillInChat(
        testSteps,
        "How do I setup my CNAME?",
        "DNS Setup Test",
        "Technical, step-by-step"
      );

      expect(testResult.answer).toContain("Diagnostic verification confirmed");
      expect(testResult.answer).toContain("1. Check DNS records in registrar");
      expect(testResult.answer).toContain("2. Add CNAME record pointing to proxy cluster");
      expect(testResult.skillUsed).toBe("DNS Setup Test");
      expect(testResult.latencyMs).toBeGreaterThan(0);
      expect(testResult.costUsd).toBeGreaterThan(0);
    });

    it("Version Control & 1-Click Rollback: Every change creates a version and rolls back seamlessly", () => {
      // 1. Initial Skill
      const initial = createSkillByHand(TEST_BUSINESS_ID, {
        name: "Custom API Rate Limiting",
        description: "Configuring token bucket rate limiting on API gateway.",
        triggerConditions: "When customer exceeds 429 Too Many Requests.",
        stepsMarkdown: "Version 1: Set rate limit to 60 req/min.",
      });

      expect(initial.currentVersionNumber).toBe(1);
      const v1Id = initial.currentVersionId!;

      // 2. Save New Version (v2)
      const { skill: updatedSkill, newVersion } = saveSkillVersion(TEST_BUSINESS_ID, initial.id, {
        stepsMarkdown: "Version 2: Upgraded rate limit to 120 req/min with burst buffer.",
        changeNotes: "Doubled burst capacity for enterprise users",
      });

      expect(updatedSkill.currentVersionNumber).toBe(2);
      expect(newVersion.versionNumber).toBe(2);
      expect(updatedSkill.stepsMarkdown).toContain("Version 2");
      expect(updatedSkill.versions).toHaveLength(2);

      // 3. Save Another Version (v3)
      const { skill: v3Skill } = saveSkillVersion(TEST_BUSINESS_ID, initial.id, {
        stepsMarkdown: "Version 3: Switched to Redis sliding window log algorithm.",
        changeNotes: "Migrated to sliding window",
      });

      expect(v3Skill.currentVersionNumber).toBe(3);
      expect(v3Skill.versions).toHaveLength(3);

      // 4. One-Click Rollback to Version 1
      const rolledBack = rollbackSkillToVersion(TEST_BUSINESS_ID, initial.id, v1Id);
      expect(rolledBack.currentVersionNumber).toBe(1);
      expect(rolledBack.currentVersionId).toBe(v1Id);
      expect(rolledBack.stepsMarkdown).toBe("Version 1: Set rate limit to 60 req/min.");

      // Check lookup reflects rolled back state
      const reloaded = getSkillById(TEST_BUSINESS_ID, initial.id);
      expect(reloaded?.currentVersionNumber).toBe(1);
      expect(reloaded?.stepsMarkdown).toBe("Version 1: Set rate limit to 60 req/min.");
    });
  });

  // =========================================================================
  // 3. Chat Agent Loop Integration: Instructions Precedence & Autonomous Skill SOP
  // =========================================================================
  describe("3. Chat Agent End-to-End Grounding with Instructions & Skills", () => {
    it("applies active instructions with strict precedence in agent answers", async () => {
      createInstruction(TEST_BUSINESS_ID, {
        title: "Refund Escalation Policy",
        ruleText: "Never promise a refund. Send every refund question to the Billing team for human approval and review.",
        appliesToRoles: ["all"],
        isActive: true,
      });

      const response = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: "Can I get a refund for my last invoice?",
        roleSlug: "support-engineer",
      });

      // Safety shield handles refund escalation or instruction prepends policy
      expect(response.answer).toBeDefined();
      expect(
        response.isEscalated ||
          response.answer.includes("Billing") ||
          response.answer.includes("refund")
      ).toBe(true);
    });

    it("autonomously incorporates matched skill protocol into the role persona response", async () => {
      // Inquire about CNAME configuration -> autonomous skill selection
      const response = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: "How do I configure my custom subdomain CNAME records?",
        roleSlug: "support-engineer",
      });

      expect(response.activeSkillUsed).toBe("DNS & Custom CNAME Setup");
      expect(response.answer).toContain("DNS & Custom CNAME Setup");
      expect(response.answer).toContain("Step-by-Step Resolution");
      expect(response.activeInstructionsUsed).toBeDefined();
    });

    it("renders tone differences across roles while grounding on the SAME matched skill SOP", async () => {
      const query = "How do I setup my CNAME and DNS proxy?";

      const engineer = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: query,
        roleSlug: "support-engineer",
      });

      const executive = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: query,
        roleSlug: "support-executive",
      });

      const consultant = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: query,
        roleSlug: "ai-consultant",
      });

      // Both matched the DNS skill
      expect(engineer.activeSkillUsed).toBe("DNS & Custom CNAME Setup");
      expect(executive.activeSkillUsed).toBe("DNS & Custom CNAME Setup");
      expect(consultant.activeSkillUsed).toBe("DNS & Custom CNAME Setup");

      // Engineer has technical CLI command and Diagnostic analysis
      expect(engineer.answer).toContain("Diagnostic Analysis");
      expect(engineer.answer).toContain("curl -Iv");

      // Executive has warm greeting and friendly steps
      expect(executive.answer).toContain("Hello! I'd be happy to help you with that! 😊");

      // Consultant has executive ROI framing and strategic next steps
      expect(consultant.answer).toContain("Executive Consultation & Strategic Overview");
      expect(consultant.answer).toContain("Recommended Next Step");
    });
  });
});
