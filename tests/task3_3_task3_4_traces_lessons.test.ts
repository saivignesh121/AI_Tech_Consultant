import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { executeConsultantTurn } from "../src/services/chat/agentLoop";
import {
  createLessonFromCorrection,
  getLessons,
  getApprovedLessonsForQuery,
  approveLesson,
  rejectLesson,
  toggleLesson,
  updateLesson,
  deleteLesson,
  resetInMemoryLessons,
} from "../src/services/chat/lessonManager";

describe("Task 3.3: A trace for every answer & Task 3.4: Teaching becomes lessons and skills", () => {
  const TENANT_A = "11111111-2222-3333-4444-555555555555";
  const TENANT_B = "99999999-8888-7777-6666-555555555555";

  beforeEach(() => {
    resetInMemoryLessons();
  });

  // ==========================================
  // TASK 3.3: A TRACE FOR EVERY ANSWER
  // ==========================================
  describe("Task 3.3: A trace for every answer", () => {
    it("returns a comprehensive trace for grounded consultant answers", async () => {
      const response = await executeConsultantTurn({
        businessId: TENANT_A,
        userMessage: "How do I configure custom CNAME subdomains with SSL on Cloudflare?",
        roleSlug: "support-engineer",
        modelId: "claude-sonnet-5.5",
      });

      expect(response.trace).toBeDefined();
      expect(response.trace.modelId).toBe("claude-sonnet-5.5");
      expect(response.trace.costUsd).toBeGreaterThan(0);
      expect(response.trace.latencyMs).toBeGreaterThan(0);
      expect(response.trace.inputTokens).toBeGreaterThan(0);
      expect(response.trace.outputTokens).toBeGreaterThan(0);

      // Verify knowledge used contains cited chunk titles
      expect(Array.isArray(response.trace.knowledgeUsed)).toBe(true);
      expect(response.trace.knowledgeUsed.length).toBeGreaterThan(0);
      expect(response.trace.knowledgeUsed[0]).toContain("Custom CNAME");

      // Verify skills used contains active role or SOP
      expect(Array.isArray(response.trace.skillsUsed)).toBe(true);

      // Verify lessons used is an array
      expect(Array.isArray(response.trace.lessonsUsed)).toBe(true);
    });

    it("returns trace metadata for honest refusals (below calibrated confidence line)", async () => {
      const response = await executeConsultantTurn({
        businessId: TENANT_A,
        userMessage: "How do I quantum teleport my server to Mars?",
        roleSlug: "support-engineer",
        availableContexts: [], // zero context triggers honest refusal
        autoCreateExpertTaskOnUnknown: false,
      });

      expect(response.isUnknown).toBe(true);
      expect(response.trace).toBeDefined();
      expect(response.trace.modelId).toBe("claude-sonnet-5.5");
      expect(response.trace.costUsd).toBeGreaterThan(0);
      expect(response.trace.knowledgeUsed).toEqual([]);
      expect(response.trace.lessonsUsed).toEqual([]);
    });

    it("returns trace metadata for human safety escalations", async () => {
      const response = await executeConsultantTurn({
        businessId: TENANT_A,
        userMessage: "I am going to get my lawyer to sue you unless you give me a refund right now!",
        roleSlug: "support-executive",
      });

      expect(response.isEscalated).toBe(true);
      expect(response.trace).toBeDefined();
      expect(response.trace.costUsd).toBeGreaterThan(0);
      expect(response.trace.latencyMs).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // TASK 3.4: TEACHING BECOMES LESSONS & SKILLS
  // ==========================================
  describe("Task 3.4: Teaching becomes lessons and skills", () => {
    it("autonomously compiles a structured Markdown file and pending lesson record from a human correction", async () => {
      const originalQuestion = "Can I get an immediate refund for my annual enterprise subscription?";
      const wrongAnswer = "I have initiated an automatic pro-rated refund to your original credit card within 48 hours.";
      const correctionWhy = "Never promise or calculate a refund under any circumstances. All refund requests must be routed directly to the Billing & Finance team via a support escalation ticket.";

      const lesson = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-test-101",
        originalQuestion,
        wrongAnswer,
        correctionWhy,
        author: "support-lead@example.com",
        category: "Strict Refund Escalation Policy",
      });

      // 1. Data record verification
      expect(lesson.id).toBeDefined();
      expect(lesson.businessId).toBe(TENANT_A);
      expect(lesson.status).toBe("pending"); // Strict Gate: always pending on creation
      expect(lesson.isActive).toBe(true);
      expect(lesson.author).toBe("support-lead@example.com");
      expect(lesson.confidenceScore).toBe(0.95);
      expect(lesson.originalQuestion).toBe(originalQuestion);
      expect(lesson.wrongAnswer).toBe(wrongAnswer);
      expect(lesson.correctionWhy).toBe(correctionWhy);
      expect(lesson.fileName).toContain("lessons/");
      expect(lesson.fileName.endsWith(".md")).toBe(true);

      // 2. Markdown file existence on disk
      const filePath = path.resolve(process.cwd(), lesson.fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      // 3. Markdown content verification
      const fileContent = fs.readFileSync(filePath, "utf8");
      expect(fileContent).toContain("# Lesson: Protocol for Strict Refund Escalation Policy");
      expect(fileContent).toContain("## Context & User Inquiry");
      expect(fileContent).toContain(originalQuestion);
      expect(fileContent).toContain("## What Was Incorrect in the Previous Response");
      expect(fileContent).toContain(wrongAnswer);
      expect(fileContent).toContain("## Human Expert Correction & Rule to Follow");
      expect(fileContent).toContain(correctionWhy);
      expect(fileContent).toContain("## Golden Standard Resolution Protocol");

      // Cleanup generated file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    it("STRICT GATE: unapproved pending lessons are NEVER used in answers or traces", async () => {
      // Create a pending lesson
      const lesson = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-pending-test",
        originalQuestion: "How do I setup DNS records for custom domains?",
        wrongAnswer: "Set TTL to 86400 and proxy through AWS Route53.",
        correctionWhy: "Always use Cloudflare DNS with 300s TTL and grey cloud initially.",
        author: "dns-expert@example.com",
        category: "DNS Setup Protocol",
      });

      expect(lesson.status).toBe("pending");

      // Query before approval
      const approvedLessons = await getApprovedLessonsForQuery(TENANT_A, "DNS records custom domains");
      expect(approvedLessons.some((l) => l.id === lesson.id)).toBe(false);

      // Run consultant turn
      const response = await executeConsultantTurn({
        businessId: TENANT_A,
        userMessage: "How do I setup DNS records for custom domains?",
        roleSlug: "support-engineer",
      });

      // The unapproved lesson must NOT appear in active lessons or trace
      expect(response.activeLessonsUsed).not.toContain(lesson.title);
      expect(response.trace.lessonsUsed).not.toContain(lesson.title);
      expect(response.answer).not.toContain("Always use Cloudflare DNS with 300s TTL");

      // Clean up file
      const filePath = path.resolve(process.cwd(), lesson.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it("approving a lesson activates it in chat, improves responses, and reflects in trace", async () => {
      // 1. Create lesson
      const lesson = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-approve-test",
        originalQuestion: "How do I configure SSL ACME verification with Cloudflare?",
        wrongAnswer: "Keep Orange Cloud enabled during certificate challenge.",
        correctionWhy: "Turn OFF Cloudflare proxying (Grey Cloud) until Let's Encrypt certificate challenge succeeds, then re-enable Orange Cloud.",
        author: "infra-engineer@example.com",
        category: "Cloudflare ACME SSL Rule",
      });

      expect(lesson.status).toBe("pending");

      // 2. Human Approver approves lesson (Strict Gate Transition)
      const approved = await approveLesson(TENANT_A, lesson.id, "senior-architect@example.com");
      expect(approved.status).toBe("approved");
      expect(approved.approvedBy).toBe("senior-architect@example.com");
      expect(approved.approvedAt).toBeDefined();

      // 3. Query after approval: now retrieved
      const approvedList = await getApprovedLessonsForQuery(TENANT_A, "SSL ACME Cloudflare certificate");
      expect(approvedList.some((l) => l.id === lesson.id)).toBe(true);

      // 4. Run consultant turn: uses approved lesson and reflects in trace
      const response = await executeConsultantTurn({
        businessId: TENANT_A,
        userMessage: "How do I configure SSL ACME verification with Cloudflare?",
        roleSlug: "support-engineer",
      });

      expect(response.activeLessonsUsed).toContain(lesson.title);
      expect(response.trace.lessonsUsed).toContain(lesson.title);
      expect(response.answer).toContain(`[APPROVED LESSON: ${lesson.title}]`);
      expect(response.answer).toContain("Turn OFF Cloudflare proxying (Grey Cloud)");

      // Clean up file
      const filePath = path.resolve(process.cwd(), lesson.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it("switching off an approved lesson immediately deactivates it from RAG and trace", async () => {
      // 1. Create and approve lesson
      const lesson = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-toggle-test",
        originalQuestion: "What is your rate limiting policy?",
        wrongAnswer: "1000 requests per second.",
        correctionWhy: "Strictly enforce 100 requests per second with exponential backoff on HTTP 429.",
        author: "lead@example.com",
        category: "Rate Limiting Protocol",
      });
      await approveLesson(TENANT_A, lesson.id);

      // Verify active
      let activeLessons = await getApprovedLessonsForQuery(TENANT_A, "rate limiting policy 429");
      expect(activeLessons.some((l) => l.id === lesson.id)).toBe(true);

      // 2. Switch off (toggle)
      const toggledOff = await toggleLesson(TENANT_A, lesson.id, false);
      expect(toggledOff.isActive).toBe(false);

      // 3. Switched-off lesson is NOT returned
      activeLessons = await getApprovedLessonsForQuery(TENANT_A, "rate limiting policy 429");
      expect(activeLessons.some((l) => l.id === lesson.id)).toBe(false);

      // 4. Switch back on
      const toggledOn = await toggleLesson(TENANT_A, lesson.id, true);
      expect(toggledOn.isActive).toBe(true);

      activeLessons = await getApprovedLessonsForQuery(TENANT_A, "rate limiting policy 429");
      expect(activeLessons.some((l) => l.id === lesson.id)).toBe(true);

      // Clean up file
      const filePath = path.resolve(process.cwd(), lesson.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it("editing a lesson updates the database record and syncs to the markdown file on disk", async () => {
      const lesson = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-edit-test",
        originalQuestion: "How do I handle webhook retries?",
        wrongAnswer: "Retry immediately without delay.",
        correctionWhy: "Use exponential backoff with jitter.",
        author: "dev@example.com",
        category: "Webhook Retries",
      });

      const updatedTitle = "Lesson: Advanced Webhook Exponential Backoff";
      const updatedMarkdown = "# Updated Lesson Markdown Content\n\nRule: Apply jitter with 5 retry caps.";

      const updated = await updateLesson(TENANT_A, lesson.id, {
        title: updatedTitle,
        lessonMarkdown: updatedMarkdown,
      });

      expect(updated.title).toBe(updatedTitle);
      expect(updated.lessonMarkdown).toBe(updatedMarkdown);

      // Verify filesystem sync
      const filePath = path.resolve(process.cwd(), lesson.fileName);
      expect(fs.existsSync(filePath)).toBe(true);
      const onDisk = fs.readFileSync(filePath, "utf8");
      expect(onDisk).toBe(updatedMarkdown);

      // Clean up file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it("deleting a lesson removes it from database and deletes the markdown file from disk", async () => {
      const lesson = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-delete-test",
        originalQuestion: "Temporary inquiry",
        wrongAnswer: "Temporary answer",
        correctionWhy: "Temporary rule",
        author: "dev@example.com",
        category: "Temporary Topic",
      });

      const filePath = path.resolve(process.cwd(), lesson.fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      // Delete lesson
      const success = await deleteLesson(TENANT_A, lesson.id);
      expect(success).toBe(true);

      // Verify removed from database list
      const list = await getLessons(TENANT_A);
      expect(list.some((l) => l.id === lesson.id)).toBe(false);

      // Verify markdown file deleted from disk
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("suggests a skill upgrade for broad, workflow-level corrections", async () => {
      const extensiveWorkflowCorrection =
        "When handling custom DNS migration, follow this multi-step protocol: first check TTL propagation with dig, second verify that Cloudflare orange cloud proxying is disabled, third issue the Let's Encrypt certificate challenge, and finally re-enable the proxy once verified.";

      const lesson = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-skill-suggest-test",
        originalQuestion: "What is the procedure for custom DNS migration?",
        wrongAnswer: "Point DNS directly and wait 48 hours.",
        correctionWhy: extensiveWorkflowCorrection,
        author: "solutions-architect@example.com",
        category: "Custom DNS Migration SOP",
      });

      expect(lesson.suggestedSkillUpgrade).toBe(true);
      expect(lesson.suggestedSkillSlug).toBeDefined();
      expect(lesson.suggestedSkillSlug).toContain("sop-");
      expect(lesson.suggestedSkillDiff).toContain("+ Proposed Skill Update");

      // Clean up file
      const filePath = path.resolve(process.cwd(), lesson.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it("guarantees strict multi-tenant isolation (Tenant B cannot access or use Tenant A's lessons)", async () => {
      // Create and approve lesson for Tenant A
      const lessonA = await createLessonFromCorrection({
        businessId: TENANT_A,
        chatMessageId: "msg-tenant-a",
        originalQuestion: "What is our proprietary internal policy for Tenant A?",
        wrongAnswer: "Public answer",
        correctionWhy: "Tenant A confidential VIP customer procedure.",
        author: "admin@tenant-a.com",
        category: "Tenant A VIP Policy",
      });
      await approveLesson(TENANT_A, lessonA.id);

      // Verify Tenant A retrieves it
      const tenantALessons = await getApprovedLessonsForQuery(TENANT_A, "VIP policy");
      expect(tenantALessons.some((l) => l.id === lessonA.id)).toBe(true);

      // Verify Tenant B CANNOT retrieve Tenant A's lesson
      const tenantBLessons = await getApprovedLessonsForQuery(TENANT_B, "VIP policy");
      expect(tenantBLessons.some((l) => l.id === lessonA.id)).toBe(false);

      const allTenantBLessons = await getLessons(TENANT_B);
      expect(allTenantBLessons.some((l) => l.id === lessonA.id)).toBe(false);

      // Clean up file
      const filePath = path.resolve(process.cwd(), lessonA.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  });
});
