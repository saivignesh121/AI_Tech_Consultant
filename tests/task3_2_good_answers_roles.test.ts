import { describe, it, expect, beforeEach } from "vitest";
import { executeConsultantTurn } from "@/services/chat/agentLoop";
import {
  runConfidenceThresholdEval,
  CALIBRATED_CONFIDENCE_THRESHOLD,
} from "@/services/eval/thresholdCalibration";
import { buildCitations, mapDynamicCitations } from "@/services/chat/citationMapper";
import { composeAutonomousAgentPrompt } from "@/services/chat/promptComposer";
import { BUILTIN_ROLES, AgentRoleDefinition } from "@/services/chat/roles";
import {
  createExpertTask,
  getExpertTasks,
  resolveExpertTask,
  resetInMemoryExpertTasks,
} from "@/services/chat/expertTaskManager";
import {
  resetInMemoryInstructions,
  getInstructions,
} from "@/services/brain/instructionsManager";
import { POST as expertTasksPOST, GET as expertTasksGET } from "@/app/api/chat/expert-tasks/route";
import { POST as expertResolvePOST } from "@/app/api/chat/expert-tasks/[id]/resolve/route";
import { GET as confidenceThresholdGET } from "@/app/api/evals/confidence-threshold/route";
import { NextRequest } from "next/server";

import { DEFAULT_TENANT } from "@/lib/auth";

describe("Feature 3: The Ask and Teach Chat — Task 3.2: Good answers, in the right role", () => {
  const TEST_BUSINESS_ID = DEFAULT_TENANT.businessId;

  beforeEach(() => {
    resetInMemoryInstructions(TEST_BUSINESS_ID);
    resetInMemoryExpertTasks(TEST_BUSINESS_ID);
  });

  describe("1. Give a Correct Answer & Say Honestly When You Do Not Know", () => {
    it("provides accurate answer with verified citations when knowledge is present", async () => {
      const result = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: "How do I configure custom CNAME subdomains and SSL?",
        roleSlug: "support-engineer",
        availableContexts: [
          {
            id: "c-1",
            type: "sitemap",
            title: "Custom CNAME Subdomains & SSL Setup",
            sourceUrl: "https://support.example.com/articles/custom-cname",
            content: "Point your CNAME record to proxy cluster and ensure SSL TLS encryption mode is Full Strict.",
            relevanceScore: 0.94,
          },
        ],
      });

      expect(result.isUnknown).toBe(false);
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.citations[0].attributionBadge).toBe("[sitemap]");
      expect(result.answer).toContain("proxy cluster");
      expect(result.answer).toContain("[1]");
    });

    it("honestly states 'I do not have verified documentation' when knowledge is absent", async () => {
      const result = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: "How do I build an orbital rocket engine in my garage?",
        roleSlug: "support-engineer",
        availableContexts: [], // Completely absent knowledge
      });

      expect(result.isUnknown).toBe(true);
      expect(result.citations.length).toBe(0);
      expect(result.answer).toContain("I do not have verified documentation");
      expect(result.expertTaskId).toBeDefined();
    });

    it("honestly refuses queries where context relevance is below calibrated threshold", async () => {
      const result = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: "What is the secret recipe for Coca-Cola syrup?",
        roleSlug: "support-executive",
        availableContexts: [
          {
            id: "c-loose",
            type: "paragraph",
            title: "Unrelated Webhook Guide",
            content: "Webhook payloads are JSON encoded.",
            relevanceScore: 0.18, // Far below 0.38
          },
        ],
        confidenceThreshold: CALIBRATED_CONFIDENCE_THRESHOLD,
      });

      expect(result.isUnknown).toBe(true);
      expect(result.confidenceScore).toBe(0.18);
      expect(result.answer).toContain("below calibrated threshold 0.38");
      expect(result.expertTaskId).toBeDefined();
    });
  });

  describe("2. Citations: Every Answer Shows Sources with One-Click Exact Details", () => {
    it("builds rich citations supporting one-click paragraph, screenshot, instruction, and skill inspection", () => {
      const { citations } = buildCitations([
        {
          id: "chunk-sitemap-1",
          type: "sitemap",
          title: "DNS Management Guide",
          sourceUrl: "https://support.example.com/dns",
          content: "Navigate to Domain Manager > DNS Records > Add CNAME pointing to cluster.",
        },
        {
          id: "chunk-screenshot-1",
          type: "screenshot",
          title: "Cloudflare SSL Handshake Screenshot",
          sourceUrl: "https://support.example.com/ssl",
          content: "Visual confirmation of Full (Strict) SSL badge.",
          imageUrl: "https://support.example.com/images/ssl-strict-badge.png",
          imageCaption: "Cloudflare SSL TLS encryption mode setting set to Full Strict",
        },
        {
          id: "chunk-instruction-1",
          type: "instruction",
          title: "Refund Policy Instruction",
          content: "Never promise a refund. Route all refund inquiries to billing team.",
          instructionRule: "Never promise a refund. Route all refund inquiries to billing team.",
        },
        {
          id: "chunk-skill-1",
          type: "skill",
          title: "DNS Troubleshooting SOP",
          content: "1. Run dig CNAME\n2. Verify nameservers\n3. Flush local DNS cache",
          skillSteps: "1. Run dig CNAME\n2. Verify nameservers\n3. Flush local DNS cache",
        },
      ]);

      expect(citations.length).toBe(4);

      // Paragraph / Sitemap
      expect(citations[0].citationNumber).toBe(1);
      expect(citations[0].attributionBadge).toBe("[sitemap]");
      expect(citations[0].paragraphText).toContain("Navigate to Domain Manager");

      // Screenshot
      expect(citations[1].citationNumber).toBe(2);
      expect(citations[1].attributionBadge).toBe("[sitemap]");
      expect(citations[1].imageUrl).toBe("https://support.example.com/images/ssl-strict-badge.png");
      expect(citations[1].imageCaption).toContain("Full Strict");

      // Instruction
      expect(citations[2].citationNumber).toBe(3);
      expect(citations[2].attributionBadge).toBe("[instruction]");
      expect(citations[2].instructionRule).toContain("Never promise a refund");

      // Skill
      expect(citations[3].citationNumber).toBe(4);
      expect(citations[3].attributionBadge).toBe("[skill]");
      expect(citations[3].skillSteps).toContain("Run dig CNAME");
    });
  });

  describe("3. 'I Don't Know' Line Calibration & Empirical Trade-Off Curve", () => {
    it("proves wrong answers drop from baseline to 0.0% at calibrated threshold 0.38", () => {
      const evalResult = runConfidenceThresholdEval();

      expect(evalResult.calibratedThreshold).toBe(0.38);
      expect(evalResult.totalCasesTested).toBe(20);

      const baseline = evalResult.tradeoffCurve.find((s) => s.threshold === 0.10)!;
      const calibrated = evalResult.tradeoffCurve.find((s) => s.threshold === 0.38)!;
      const strict = evalResult.tradeoffCurve.find((s) => s.threshold === 0.80)!;

      // Baseline loose threshold: high wrong answers (hallucinations on out-of-domain)
      expect(baseline.wrongAnswerRate).toBeGreaterThanOrEqual(40);

      // Calibrated line: 0.0% wrong answers with 100% in-domain coverage
      expect(calibrated.wrongAnswerRate).toBe(0.0);
      expect(calibrated.correctAnswerRate).toBe(100.0);
      expect(calibrated.refusalRate).toBe(100.0);

      // Excessively strict threshold: false refusals increase
      expect(strict.falseRefusalRate).toBeGreaterThan(0);

      // Summary proof
      expect(evalResult.improvementSummary.wrongAnswerReductionPercent).toBeGreaterThanOrEqual(40);
      expect(evalResult.improvementSummary.finalWrongAnswerRate).toBe(0.0);
    });

    it("serves calibration trade-off data via GET /api/evals/confidence-threshold", async () => {
      const req = new NextRequest("http://localhost:3000/api/evals/confidence-threshold");
      const res = await confidenceThresholdGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.calibratedThreshold).toBe(0.38);
      expect(data.evalResult.tradeoffCurve.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("4. The 3 Agent Roles + Custom Roles: Same Facts, Different Depth & Tone", () => {
    const SHARED_CONTEXT = [
      {
        id: "c-shared-1",
        type: "paragraph" as const,
        title: "Proxy CNAME Configuration",
        sourceUrl: "https://support.example.com/proxy",
        content: "Custom domains require pointing your CNAME to proxy.cluster.com with SSL Full Strict mode enabled.",
        relevanceScore: 0.95,
      },
    ];
    const USER_QUERY = "How should I configure my custom domain proxy?";

    it("gives technical, code-level, step-by-step diagnostic resolution in Support Engineer role", async () => {
      const response = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: USER_QUERY,
        roleSlug: "support-engineer",
        availableContexts: SHARED_CONTEXT,
      });

      expect(response.roleUsed).toBe("Support Engineer");
      expect(response.answer).toContain("Diagnostic Analysis & Technical Diagnostic Step-by-Step Resolution");
      expect(response.answer).toContain("curl -Iv");
      expect(response.answer).toContain("proxy.cluster.com");
      expect(response.answer).toContain("[1]");
    });

    it("gives friendly, warm, simple, everyday how-to guidance in Support Executive role", async () => {
      const response = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: USER_QUERY,
        roleSlug: "support-executive",
        availableContexts: SHARED_CONTEXT,
      });

      expect(response.roleUsed).toBe("Support Executive");
      expect(response.answer).toContain("Hello! I'd be happy to help you with that! 😊");
      expect(response.answer).toContain("Here are three simple, friendly steps");
      expect(response.answer).toContain("proxy.cluster.com");
      expect(response.answer).toContain("[1]");
    });

    it("gives sales-level, consultative, ROI & quote-steering guidance in AI Consultant role", async () => {
      const response = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: USER_QUERY,
        roleSlug: "ai-consultant",
        availableContexts: SHARED_CONTEXT,
      });

      expect(response.roleUsed).toBe("AI Consultant");
      expect(response.answer).toContain("Executive Consultation & Strategic Overview");
      expect(response.answer).toContain("Business Impact & Scalability");
      expect(response.answer).toContain("proposal quote");
      expect(response.answer).toContain("proxy.cluster.com");
      expect(response.answer).toContain("[1]");
    });

    it("enforces pricing authority: only AI Consultant can quote commercial tier prices", async () => {
      const priceQuery = "How much does the enterprise subscription plan cost?";

      // 1. Support Engineer attempts pricing inquiry
      const engResponse = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: priceQuery,
        roleSlug: "support-engineer",
        availableContexts: SHARED_CONTEXT,
      });
      expect(engResponse.answer).toContain("handled exclusively by our AI Consultant persona");

      // 2. AI Consultant answers pricing inquiry with quote and solution tier
      const consultantResponse = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: priceQuery,
        roleSlug: "ai-consultant",
        availableContexts: SHARED_CONTEXT,
      });
      expect(consultantResponse.answer).toContain("Enterprise Pricing & Solution Quotation");
      expect(consultantResponse.answer).toContain("$1,200/month");
      expect(consultantResponse.answer).toContain("$3,500/month");
    });

    it("executes custom role created in role editor with dynamic persona without code changes", async () => {
      const customRole: AgentRoleDefinition = {
        name: "Security Compliance Auditor",
        slug: "compliance-auditor",
        goal: "Verify SOC2 and ISO27001 data isolation policies.",
        tone: "Authoritative, risk-conscious, audit-grade",
        systemPrompt: "You are the Security Compliance Auditor.",
        modelId: "claude-sonnet-5.5",
        allowedSkills: ["answer_from_brain"],
        knowledgeSources: ["compliance_docs"],
        handoverRule: "Handover on compliance breach.",
        isBuiltin: false,
      };

      const response = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: USER_QUERY,
        roleSlug: customRole.slug,
        roleDefinition: customRole,
        availableContexts: SHARED_CONTEXT,
      });

      expect(response.roleUsed).toBe("Security Compliance Auditor");
      expect(response.answer).toContain("[Security Compliance Auditor Consultation — Tone: Authoritative, risk-conscious, audit-grade]");
      expect(response.answer).toContain("Verify SOC2 and ISO27001 data isolation policies");
      expect(response.answer).toContain("proxy.cluster.com");
    });
  });

  describe("5. Autonomous Prompt Writing (The Agent Writes Its Own Prompts)", () => {
    it("dynamically compiles system prompt and user prompt from settings and matched skills", () => {
      const role = BUILTIN_ROLES[0]; // Support Engineer
      const composed = composeAutonomousAgentPrompt({
        businessName: "Acme Cloud Corp",
        customerQuery: "How do I configure custom CNAME subdomains?",
        customerName: "Jane Doe",
        role,
        formattedKnowledgeContext: "[1] Source: DNS Guide\nPoint CNAME to proxy cluster.",
        activeInstructions: [
          {
            id: "inst-1",
            businessId: TEST_BUSINESS_ID,
            title: "CLI Command Protocol",
            ruleText: "Provide bash commands for DNS validation.",
            appliesToRoles: ["support-engineer"],
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ],
        matchedSkill: {
          id: "skill-1",
          businessId: TEST_BUSINESS_ID,
          name: "DNS Troubleshooting SOP",
          slug: "dns-troubleshooting",
          description: "DNS resolution steps",
          triggerConditions: "dns, cname, domain",
          stepsMarkdown: "1. dig CNAME\n2. check proxy",
          examplesJson: [],
          currentVersion: 1,
          createdAt: new Date().toISOString(),
        },
      });

      expect(composed.promptTemplateKey).toBe("qa_answer");
      expect(composed.systemPrompt).toContain("Acme Cloud Corp");
      expect(composed.systemPrompt).toContain("Support Engineer");
      expect(composed.userPrompt).toContain("Jane Doe");
      expect(composed.userPrompt).toContain("Point CNAME to proxy cluster");
      expect(composed.userPrompt).toContain("CLI Command Protocol");
      expect(composed.userPrompt).toContain("DNS Troubleshooting SOP");
    });
  });

  describe("6. Human Expert Task Handover & Memory Flowback", () => {
    it("creates an expert task when knowledge is unknown, and expert resolution flows into Knowledge Brain", async () => {
      // 1. Initial unknown question asked
      const unknownQuery = "What is the custom enterprise rate limit for API webhook workers?";
      const turnResponse = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: unknownQuery,
        roleSlug: "support-engineer",
        availableContexts: [], // Absent
      });

      expect(turnResponse.isUnknown).toBe(true);
      expect(turnResponse.expertTaskId).toBeDefined();

      const taskId = turnResponse.expertTaskId!;

      // 2. Verify task is listed in pending expert tasks
      const pendingTasks = await getExpertTasks(TEST_BUSINESS_ID, "pending");
      const foundTask = pendingTasks.find((t) => t.id === taskId);
      expect(foundTask).toBeDefined();
      expect(foundTask?.status).toBe("pending");

      // 3. Expert answers and resolves the task via API
      const expertAnswer = "Enterprise API webhook workers are allocated 5,000 requests per minute with automatic burst capacity.";
      const resolveReq = new NextRequest(`http://localhost:3000/api/chat/expert-tasks/${taskId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          expertAnswer,
          flowIntoMemory: true,
        }),
      });

      const resolveRes = await expertResolvePOST(resolveReq, { params: Promise.resolve({ id: taskId }) });
      const resolveData = await resolveRes.json();

      expect(resolveRes.status).toBe(200);
      expect(resolveData.success).toBe(true);
      expect(resolveData.task.status).toBe("resolved");
      expect(resolveData.learnedInstruction).toBeDefined();
      expect(resolveData.learnedInstruction.ruleText).toBe(expertAnswer);

      // 4. Verify the learned instruction is now active in the business instructions
      const instructions = getInstructions(TEST_BUSINESS_ID);
      const learned = instructions.find((i) => i.id === resolveData.learnedInstruction.id);
      expect(learned).toBeDefined();
      expect(learned?.ruleText).toBe(expertAnswer);

      // 5. Subsequent inquiry now answers using the newly learned instruction!
      const subsequentResponse = await executeConsultantTurn({
        businessId: TEST_BUSINESS_ID,
        userMessage: "What is the custom enterprise rate limit for API webhook workers?",
        roleSlug: "support-engineer",
        availableContexts: [
          {
            id: "inst-chunk-1",
            type: "instruction",
            title: learned!.title,
            content: learned!.ruleText,
            relevanceScore: 0.96,
          },
        ],
      });

      expect(subsequentResponse.isUnknown).toBe(false);
      expect(subsequentResponse.answer).toContain("5,000 requests per minute");
      expect(subsequentResponse.citations[0].attributionBadge).toBe("[instruction]");
    });

    it("supports GET and POST on /api/chat/expert-tasks", async () => {
      // POST new task
      const postReq = new NextRequest("http://localhost:3000/api/chat/expert-tasks", {
        method: "POST",
        body: JSON.stringify({
          question: "Can we support custom SSO SAML with Okta?",
          roleSlug: "ai-consultant",
        }),
      });
      const postRes = await expertTasksPOST(postReq);
      const postData = await postRes.json();

      expect(postRes.status).toBe(200);
      expect(postData.success).toBe(true);
      expect(postData.task.question).toContain("custom SSO SAML");

      // GET tasks list
      const getReq = new NextRequest("http://localhost:3000/api/chat/expert-tasks?status=pending");
      const getRes = await expertTasksGET(getReq);
      const getData = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getData.tasks.some((t: any) => t.id === postData.task.id)).toBe(true);
    });
  });
});
