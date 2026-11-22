import { describe, it, expect } from "vitest";
import { parseCustomerInput } from "../src/services/chat/intentClassifier";
import { executeConsultantTurn } from "../src/services/chat/agentLoop";
import { processTeachingTurn } from "../src/services/chat/teachingDialog";
import { POST as chatPOST } from "../src/app/api/chat/route";
import { POST as sessionsPOST, GET as sessionsGET } from "../src/app/api/chat/sessions/route";
import { NextRequest } from "next/server";

describe("Feature 3: The Ask and Teach Chat — Task 3.1: Two Ways to Start a Chat", () => {
  const businessId = "b1000000-0000-0000-0000-000000000001";

  describe("1. Two Ways to Start a Chat ('Ask something' vs 'Teach me')", () => {
    it("creates a new chat session in 'ask' mode", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Technical CNAME Consultation",
          mode: "ask",
        }),
      });

      const res = await sessionsPOST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
      expect(data.session.mode).toBe("ask");
      expect(data.session.title).toBe("Technical CNAME Consultation");
    });

    it("creates a new chat session in 'teach' mode", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Teaching & Rule Session",
          mode: "teach",
        }),
      });

      const res = await sessionsPOST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
      expect(data.session.mode).toBe("teach");
      expect(data.session.title).toBe("Teaching & Rule Session");
    });

    it("returns sessions with their designated mode for UI badge presentation", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat/sessions", {
        method: "GET",
      });

      const res = await sessionsGET();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.sessions).toBeDefined();
      expect(Array.isArray(data.sessions)).toBe(true);
      if (data.sessions.length > 0) {
        const first = data.sessions[0];
        expect(["ask", "teach"]).toContain(first.mode);
      }
    });
  });

  describe("2. Long Pasted Message Question Extraction", () => {
    it("extracts the real core question from a noisy customer email with headers and signatures", () => {
      const rawEmail = `From: client.ops@enterprise.corp
To: support@solutions.example.com
Date: Mon, 16 Nov 2026 09:14:22 -0500
Subject: Critical Issue: Production custom domain throwing SSL Handshake 525

Hi Support Team,
Hope everyone had a great weekend. We recently switched our primary domain over to your platform.
Our dev team pointed the DNS CNAME record to the proxy as specified in your setup article.
However, since this morning our customers are reporting an intermittent SSL handshake failure on Cloudflare.
How do we configure our Cloudflare SSL Full Strict mode so we don't get the redirect loop error?
Please get back to us as soon as possible as this is impacting our staging environment.

Best regards,
Alexander Wright
Director of Infrastructure & Cloud Operations
Enterprise Corp Global Solutions
CONFIDENTIALITY NOTICE: This transmission is intended only for the use of the individual...`;

      const parsed = parseCustomerInput(rawEmail);

      expect(parsed.isPastedThread).toBe(true);
      expect(parsed.mode).toBe("ask");
      expect(parsed.extractedCoreQuery).toContain("How do we configure our Cloudflare SSL Full Strict mode so we don't get the redirect loop error?");
      // Headers and signatures must be stripped from core query
      expect(parsed.extractedCoreQuery).not.toContain("From: client.ops@enterprise.corp");
      expect(parsed.extractedCoreQuery).not.toContain("CONFIDENTIALITY NOTICE");
      expect(parsed.extractedCoreQuery).not.toContain("Director of Infrastructure");
    });

    it("extracts core question when user pastes a multi-line customer chat transcript", () => {
      const rawChat = `Customer: Hey there, I need some help.
Agent: Sure, what can I do for you today?
Customer: I am trying to connect my custom domain on Godaddy.
Customer: Where do I find the CNAME record proxy target to paste into my DNS records?
Agent: Let me check that for you.`;

      const parsed = parseCustomerInput(rawChat);

      expect(parsed.isPastedThread).toBe(true);
      expect(parsed.extractedCoreQuery).toContain("Where do I find the CNAME record proxy target to paste into my DNS records?");
    });

    it("executeConsultantTurn answers the extracted question and marks pasted thread", async () => {
      const rawPastedMessage = `From: user@staging.io
Subject: Question regarding domain DNS proxy
Hi support,
Can you tell me how to configure custom CNAME subdomains with SSL on Cloudflare?
Thanks, Bob`;

      const response = await executeConsultantTurn({
        businessId,
        userMessage: rawPastedMessage,
        roleSlug: "support-engineer",
      });

      expect(response.isPastedThread).toBe(true);
      expect(response.extractedCoreQuery).toBeDefined();
      expect(response.extractedCoreQuery).toContain("Can you tell me how to configure custom CNAME subdomains with SSL on Cloudflare?");
      expect(response.reply).toContain("[Extracted Question:");
      expect(response.citations.length).toBeGreaterThan(0);
    });
  });

  describe("3. Teach Me Mode & Interactive Clarification Dialogue", () => {
    it("starts apprentice dialogue by asking clarifying questions back when user shares a rule", async () => {
      const teachingMessage = "Rule: For custom CNAME domain setups, always tell the user to disable Cloudflare orange cloud during verification.";

      const response = await executeConsultantTurn({
        businessId,
        sessionId: "session-teach-001",
        userMessage: teachingMessage,
        roleSlug: "support-engineer",
        mode: "teach",
      });

      expect(response.isTeachingTurn).toBe(true);
      expect(response.teachingPhase).toBe("clarifying");
      expect(response.clarifyingQuestions).toBeDefined();
      expect(response.clarifyingQuestions!.length).toBeGreaterThanOrEqual(2);
      expect(response.reply).toContain("I've received your teaching!");
      expect(response.reply).toContain("To make sure I understand all aspects");
      expect(response.lessonDraft).toBeDefined();
      expect(response.lessonDraft!.ruleText).toContain("disable Cloudflare orange cloud");
    });

    it("confirms lesson compilation when user replies to clarifying questions", async () => {
      const history = [
        { sender: "user", content: "Rule: For custom CNAME domain setups, always tell the user to disable Cloudflare orange cloud during verification." },
        { sender: "consultant", content: "To make sure I understand all aspects before recording this standard: 1. Should this rule apply exclusively to Support Engineer?" },
      ];

      const confirmationResponse = await executeConsultantTurn({
        businessId,
        sessionId: "session-teach-001",
        userMessage: "Yes, exactly. Apply to all roles.",
        roleSlug: "support-engineer",
        mode: "teach",
        conversationHistory: history,
      });

      expect(confirmationResponse.isTeachingTurn).toBe(true);
      expect(confirmationResponse.teachingPhase).toBe("confirmed");
      expect(confirmationResponse.reply).toContain("Teaching Confirmed & Lesson Compiled!");
      expect(confirmationResponse.reply).toContain("Settings > Approvals");
      expect(confirmationResponse.lessonDraft).toBeDefined();
    });
  });

  describe("4. Inline Teaching Inside an 'Ask' Chat", () => {
    it("automatically shifts into teaching mode when user replies 'This is wrong, the right answer is ...'", async () => {
      const inlineCorrection = "This is wrong, the right answer is you must verify HMAC SHA-256 signatures with the shared secret, never SHA-1.";

      const response = await executeConsultantTurn({
        businessId,
        sessionId: "session-ask-001",
        userMessage: inlineCorrection,
        roleSlug: "support-engineer",
        mode: "ask", // Started as ask mode!
      });

      expect(response.isTeachingTurn).toBe(true);
      expect(response.teachingPhase).toBe("clarifying");
      expect(response.reply).toContain("I've received your teaching!");
      expect(response.lessonDraft).toBeDefined();
      expect(response.lessonDraft!.ruleText).toContain("HMAC SHA-256");
    });

    it("POST /api/chat seamlessly handles inline teaching and returns teaching metadata", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Here is how you should reply: for DNS questions, always give the 3 steps first.",
          roleSlug: "support-engineer",
          mode: "ask",
        }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("teach"); // Automatically shifted to teach!
      expect(data.teaching).toBeDefined();
      expect(data.teaching.isTeachingTurn).toBe(true);
      expect(data.teaching.phase).toBe("clarifying");
      expect(data.teaching.clarifyingQuestions.length).toBeGreaterThan(0);
    });

    it("POST /api/chat extracts core query from long customer email and returns it in telemetry", async () => {
      const rawEmail = `From: customer@example.com
Subject: Urgent CNAME Question
Hello Support,
We are trying to set up our custom domain.
How do I configure custom CNAME subdomains with SSL on Cloudflare?
Thank you, Customer Team`;

      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawEmail,
          roleSlug: "support-engineer",
          mode: "ask",
        }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe("ask");
      expect(data.isPastedThread).toBe(true);
      expect(data.extractedCoreQuery).toContain("How do I configure custom CNAME subdomains with SSL on Cloudflare?");
      expect(data.reply).toContain("[Extracted Question:");
    });
  });
});
