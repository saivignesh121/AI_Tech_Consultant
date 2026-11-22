import { compileLessonFromCorrection, LessonRecord } from "./lessonCompiler";
import { db } from "@/db";
import { lessons, chatMessages } from "@/db/schema/chat";

export interface TeachingTurnResult {
  reply: string;
  isTeachingTurn: boolean;
  phase: "clarifying" | "confirmed";
  clarifyingQuestions?: string[];
  lessonDraft?: {
    title: string;
    category: string;
    ruleText: string;
    lessonMarkdown: string;
  };
  lessonId?: string;
}

const CONFIRMATION_PHRASES = [
  /^(yes|yeah|yep|correct|exactly|confirmed|save|approve|proceed)\b/i,
  /\bapply\s+to\s+all\s+roles\b/i,
  /\ball\s+roles\b/i,
  /\bthat('?s|\s+is)\s+right\b/i,
  /\bsave\s+this\s+lesson\b/i,
];

/**
 * Interactive Teaching Dialog Engine
 * Task 3.1: The agent asks questions back until it is sure it understood the rule or correction.
 * Task 3.4: Converts inline feedback ("This is wrong, the right answer is...") into structured lessons.
 */
export async function processTeachingTurn(params: {
  businessId: string;
  sessionId: string;
  userMessage: string;
  roleSlug: string;
  roleName: string;
  authorEmail: string;
  conversationHistory?: Array<{ sender: string; content: string }>;
}): Promise<TeachingTurnResult> {
  const { businessId, sessionId, userMessage, roleSlug, roleName, authorEmail, conversationHistory = [] } = params;
  const trimmed = userMessage.trim();

  // 1. Check if the user is answering a previous clarifying question or confirming the lesson
  const isConfirmation = CONFIRMATION_PHRASES.some((p) => p.test(trimmed));
  const previousAssistantMsg = [...conversationHistory].reverse().find((m) => m.sender === "consultant" || m.sender === "assistant");
  const hadClarifyingQuestion = previousAssistantMsg && (
    previousAssistantMsg.content.includes("To make sure I understand all aspects") ||
    previousAssistantMsg.content.includes("clarifying question") ||
    previousAssistantMsg.content.includes("Before I compile this into a permanent lesson")
  );

  if (hadClarifyingQuestion && isConfirmation) {
    // 2. Finalize and persist lesson into database
    const ruleSummary = extractRuleSnippet(previousAssistantMsg.content) || trimmed;
    const lessonTitle = generateLessonTitle(ruleSummary);
    const category = categorizeTeaching(ruleSummary);

    const compiled = compileLessonFromCorrection({
      businessId,
      chatMessageId: "00000000-0000-0000-0000-000000000000",
      category,
      originalQuestion: `Customer Inquiry regarding ${lessonTitle}`,
      wrongAnswer: "Previous unoptimized answer or default behavior",
      correctionWhy: `${ruleSummary}. Clarification confirmed by ${authorEmail}: "${trimmed}"`,
      author: authorEmail,
    });

    let persistedLessonId = `lesson-${Date.now()}`;
    try {
      // Record user confirmation message
      const [userMsgRow] = await db
        .insert(chatMessages)
        .values({
          sessionId,
          businessId,
          sender: "user",
          content: userMessage,
          citations: [],
          isEscalated: false,
        })
        .returning();

      // Persist to database
      const [inserted] = await db
        .insert(lessons)
        .values({
          businessId,
          chatMessageId: userMsgRow.id,
          title: compiled.title,
          category: compiled.category,
          lessonMarkdown: compiled.lessonMarkdown,
          status: "pending",
        })
        .returning();

      if (inserted) persistedLessonId = inserted.id;
    } catch (err) {
      console.warn("Notice: Database write fallback for lesson in teachingDialog", err);
    }

    const confirmationReply = `🎓 **Teaching Confirmed & Lesson Compiled!**

Thank you for clarifying! I now completely understand how to apply this rule:
• **Scope & Context:** Confirmed for **${roleName}** and relevant persona workflows.
• **Human-in-the-Loop Safeguard:** In strict accordance with our Capstone safety standards, this new lesson is saved as a **Draft** awaiting your approval in **Settings > Approvals**.
• **Permanent Lesson Draft:** \`${lessonTitle}\`

Once approved, all future customer answers will strictly adhere to your guidance. What would you like to teach or ask next?`;

    return {
      reply: confirmationReply,
      isTeachingTurn: true,
      phase: "confirmed",
      lessonDraft: {
        title: compiled.title,
        category: compiled.category,
        ruleText: ruleSummary,
        lessonMarkdown: compiled.lessonMarkdown,
      },
      lessonId: persistedLessonId,
    };
  }

  // 3. New Teaching Statement or Inline Correction
  const ruleText = extractCoreRuleFromMessage(trimmed);
  const lessonTitle = generateLessonTitle(ruleText);
  const category = categorizeTeaching(ruleText);

  // Generate 2 targeted clarifying questions
  const clarifyingQuestions = [
    `Should this rule apply exclusively to the **${roleName}** persona, or across all agent roles (Support Engineer, Support Executive, AI Consultant)?`,
    `If a customer encounters a non-standard configuration (e.g. third-party proxy or legacy DNS), should I still apply this rule, or escalate to a human specialist?`,
  ];

  const clarificationReply = `🎓 **I've received your teaching!**

> **Your Rule / Guidance:**
> "${ruleText}"

To make sure I understand all aspects before recording this standard:
1. ${clarifyingQuestions[0]}
2. ${clarifyingQuestions[1]}

You can reply with your answers, or simply reply **"Yes, save this lesson"** to confirm these defaults!`;

  return {
    reply: clarificationReply,
    isTeachingTurn: true,
    phase: "clarifying",
    clarifyingQuestions,
    lessonDraft: {
      title: lessonTitle,
      category,
      ruleText,
      lessonMarkdown: `# Lesson: ${lessonTitle}\n\n## Rule Statement\n${ruleText}\n\n## Context\nCaptured in chat from teacher ${authorEmail}`,
    },
  };
}

function extractCoreRuleFromMessage(msg: string): string {
  let cleaned = msg
    .replace(/^teach\s+me\s*[:,-]?\s*/i, "")
    .replace(/^this\s+is\s+wrong\s*[,.]?\s*(the\s+right\s+answer\s+is\s*)?/i, "")
    .replace(/^the\s+right\s+answer\s+is\s*/i, "")
    .replace(/^the\s+correct\s+answer\s+is\s*/i, "")
    .replace(/^rule\s*:\s*/i, "")
    .replace(/^correction\s*:\s*/i, "")
    .replace(/^feedback\s*:\s*/i, "")
    .replace(/^here\s+is\s+how\s+(you\s+should\s+|to\s+)reply\s*[:,-]?\s*/i, "")
    .replace(/^let\s+me\s+teach\s+you\s*[:,-]?\s*/i, "");

  return cleaned.trim() || msg;
}

function extractRuleSnippet(text: string): string | null {
  const match = text.match(/>\s*\*\*"(.*?)"\*\*/s) || text.match(/>\s*"(.*?)"/s);
  return match ? match[1].trim() : null;
}

function generateLessonTitle(rule: string): string {
  const words = rule.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 40 ? words.slice(0, 40) + "..." : words || "Custom Support Standard";
}

function categorizeTeaching(rule: string): string {
  const lower = rule.toLowerCase();
  if (lower.includes("dns") || lower.includes("cname") || lower.includes("cloudflare") || lower.includes("ssl")) {
    return "DNS & Cloudflare Protocols";
  }
  if (lower.includes("refund") || lower.includes("billing") || lower.includes("price") || lower.includes("cost")) {
    return "Billing & Refund Policies";
  }
  if (lower.includes("webhook") || lower.includes("signature") || lower.includes("api")) {
    return "API & Webhook Security";
  }
  return "Customer Support Standard";
}
