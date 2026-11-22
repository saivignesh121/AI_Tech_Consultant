import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { executeConsultantTurn } from "@/services/chat/agentLoop";
import { compileLessonFromCorrection } from "@/services/chat/lessonCompiler";
import { db } from "@/db";
import { chatMessages, chatTraces, chatSessions } from "@/db/schema/chat";
import { lessons } from "@/db/schema/chat";
import { knowledgePages, knowledgeChunks } from "@/db/schema/knowledge";
import { modelCallLogs } from "@/db/schema/telemetry";
import { agentRoles } from "@/db/schema/prompts";
import { BUILTIN_ROLES, AgentRoleDefinition } from "@/services/chat/roles";
import { eq, and } from "drizzle-orm";

/**
 * Multi-Tenant Ask & Teach Chat API Endpoint
 * Handles conversational queries, role switching, citations, inline teaching, and telemetry.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const {
      sessionId,
      message,
      mode = "ask",
      modelId = "claude-sonnet-5.5",
      contexts = [],
      feedbackCorrection,
      imageUrl,
    } = body;
    const roleSlug = body.roleSlug || body.role || "support-engineer";

    if (!message) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Ensure session exists and strictly belongs to the current tenant
    let targetSessionId = sessionId;
    if (targetSessionId) {
      try {
        const [existingSession] = await db
          .select()
          .from(chatSessions)
          .where(
            and(
              eq(chatSessions.id, targetSessionId),
              eq(chatSessions.businessId, tenant.businessId)
            )
          )
          .limit(1);

        if (!existingSession) {
          // If query returns empty in real DB, return 403
          return NextResponse.json(
            { error: "Session not found or belongs to another business" },
            { status: 403 }
          );
        }
      } catch (err) {
        console.warn("Notice: DB session check fallback", err);
      }
    } else {
      try {
        const [newSession] = await db
          .insert(chatSessions)
          .values({
            businessId: tenant.businessId,
            userId: tenant.userId,
            title: message.slice(0, 40) + "...",
            mode: mode || "ask",
          })
          .returning();
        targetSessionId = newSession.id;
      } catch (err) {
        console.warn("Notice: DB session insert fallback", err);
        targetSessionId = `session-${Date.now()}`;
      }
    }

    // 1. If explicit feedbackCorrection modal payload is provided, compile lesson immediately
    if (feedbackCorrection) {
      // First persist the user correction message so foreign key constraint is satisfied
      const [savedFeedbackMsg] = await db
        .insert(chatMessages)
        .values({
          sessionId: targetSessionId,
          businessId: tenant.businessId,
          sender: "user",
          content: message,
          citations: [],
          isEscalated: false,
        })
        .returning();

      const compiled = compileLessonFromCorrection({
        businessId: tenant.businessId,
        chatMessageId: savedFeedbackMsg.id,
        category: feedbackCorrection?.category || "Customer Support Teaching",
        originalQuestion: message,
        wrongAnswer: feedbackCorrection?.wrongAnswer || "Previous answer",
        correctionWhy: feedbackCorrection?.why || message,
        author: tenant.userEmail,
      });

      // Save to database lessons table
      const [insertedLesson] = await db
        .insert(lessons)
        .values({
          businessId: tenant.businessId,
          chatMessageId: savedFeedbackMsg.id,
          title: compiled.title,
          category: compiled.category,
          lessonMarkdown: compiled.lessonMarkdown,
          status: "pending",
        })
        .returning();

      return NextResponse.json({
        success: true,
        mode: "teach",
        message: "Teaching received and compiled into draft lesson awaiting approval.",
        lesson: insertedLesson,
      });
    }

    // Fetch conversation history for session
    let history: Array<{ sender: string; content: string }> = [];
    try {
      const historyRows = await db
        .select({ sender: chatMessages.sender, content: chatMessages.content })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, targetSessionId))
        .orderBy(chatMessages.createdAt);

      history = historyRows.map((h) => ({ sender: h.sender, content: h.content }));
    } catch (err) {
      console.warn("Notice: DB history read fallback", err);
    }

    // 2. Standard Ask consultation turn via Agent Loop
    // Load tenant-isolated knowledge base contexts if not explicitly provided
    let activeContexts = contexts;
    if (!activeContexts || activeContexts.length === 0) {
      try {
        const dbChunks = await db
          .select({
            id: knowledgeChunks.id,
            heading: knowledgeChunks.heading,
            content: knowledgeChunks.content,
            pageUrl: knowledgePages.url,
          })
          .from(knowledgeChunks)
          .innerJoin(knowledgePages, eq(knowledgeChunks.pageId, knowledgePages.id))
          .where(
            and(
              eq(knowledgeChunks.businessId, tenant.businessId),
              eq(knowledgePages.businessId, tenant.businessId),
              eq(knowledgePages.healthStatus, "active")
            )
          )
          .limit(4);

        if (dbChunks.length > 0) {
          activeContexts = dbChunks.map((c) => ({
            id: c.id,
            type: "paragraph" as const,
            title: c.heading || "Documentation",
            sourceUrl: c.pageUrl,
            content: c.content,
          }));
        }
      } catch (err) {
        console.warn("Notice: DB chunks fallback", err);
      }

      if (!activeContexts || activeContexts.length === 0) {
        // Isolated tenant-scoped default context
        activeContexts = [
          {
            id: `chunk-${tenant.businessSlug}-1`,
            type: "paragraph" as const,
            title: `${tenant.businessName} CNAME & Custom Domain Setup`,
            sourceUrl: `https://support.${tenant.businessSlug}.com/articles/custom-cname-setup`,
            content: `To configure your custom domain on ${tenant.businessName}, point your CNAME record to proxy.${tenant.businessSlug}.com. Verify Cloudflare SSL/TLS Full Strict mode.`,
          },
          {
            id: `chunk-${tenant.businessSlug}-2`,
            type: "paragraph" as const,
            title: `${tenant.businessName} Webhook & API Limits`,
            sourceUrl: `https://support.${tenant.businessSlug}.com/articles/webhook-configuration`,
            content: `All webhook deliveries for ${tenant.businessName} require HMAC SHA-256 validation. Rate limits are 100 requests per second.`,
          },
        ];
      }
    }

    // Resolve role definition: builtin or custom created in role editor
    let roleDef: AgentRoleDefinition | undefined = BUILTIN_ROLES.find((r) => r.slug === roleSlug);
    if (!roleDef) {
      try {
        const [customRoleRow] = await db
          .select()
          .from(agentRoles)
          .where(
            and(
              eq(agentRoles.businessId, tenant.businessId),
              eq(agentRoles.slug, roleSlug)
            )
          )
          .limit(1);

        if (customRoleRow) {
          roleDef = {
            name: customRoleRow.name,
            slug: customRoleRow.slug,
            goal: customRoleRow.goal,
            tone: customRoleRow.tone,
            systemPrompt: customRoleRow.systemPrompt,
            modelId: customRoleRow.modelId,
            allowedSkills: customRoleRow.allowedSkills || [],
            knowledgeSources: customRoleRow.knowledgeSources || [],
            handoverRule: customRoleRow.handoverRule,
            isBuiltin: customRoleRow.isBuiltin,
          };
        }
      } catch (err) {
        console.warn("Notice: DB custom role fallback", err);
      }
    }

    const response = await executeConsultantTurn({
      businessId: tenant.businessId,
      businessName: tenant.businessName,
      sessionId: targetSessionId,
      userMessage: message,
      roleSlug,
      modelId: roleDef?.modelId || modelId,
      mode: (mode as "ask" | "teach") || "ask",
      authorEmail: tenant.userEmail,
      conversationHistory: history,
      roleDefinition: roleDef,
      availableContexts: activeContexts,
      confidenceThreshold: body.confidenceThreshold,
    });

    // Record Messages & Telemetry with resilient database fallback
    let savedMsgId = `msg-${Date.now()}`;
    try {
      // Record User Message
      await db.insert(chatMessages).values({
        sessionId: targetSessionId,
        businessId: tenant.businessId,
        sender: "user",
        content: message,
        citations: [],
        isEscalated: false,
      });

      // Record Consultant Message
      const [savedConsultantMsg] = await db
        .insert(chatMessages)
        .values({
          sessionId: targetSessionId,
          businessId: tenant.businessId,
          sender: "consultant",
          content: response.reply,
          citations: response.citations,
          isEscalated: response.isEscalated,
          escalationReason: response.escalationReason || null,
        })
        .returning();

      if (savedConsultantMsg) savedMsgId = savedConsultantMsg.id;

      // Record Chat Trace & Telemetry
      await db.insert(chatTraces).values({
        messageId: savedMsgId,
        businessId: tenant.businessId,
        modelId,
        knowledgeUsed: response.citations.map((c) => c.title),
        skillsUsed: [roleSlug],
        inputTokens: response.telemetry.inputTokens,
        outputTokens: response.telemetry.outputTokens,
        cachedTokens: response.telemetry.cachedTokens,
        durationMs: response.telemetry.latencyMs,
        costUsd: response.telemetry.costUsd.toFixed(6),
      });

      // Record Model Call Telemetry
      await db.insert(modelCallLogs).values({
        businessId: tenant.businessId,
        taskType: "write_reply",
        modelId,
        inputTokens: response.telemetry.inputTokens,
        outputTokens: response.telemetry.outputTokens,
        cachedReadTokens: response.telemetry.cachedTokens,
        durationMs: response.telemetry.latencyMs,
        costUsd: response.telemetry.costUsd.toFixed(6),
        status: response.isBlocked ? "blocked_security" : "success",
      });
    } catch (dbErr) {
      console.warn("Notice: DB chat insert fallback", dbErr);
    }

    return NextResponse.json({
      success: true,
      mode: response.isTeachingTurn ? "teach" : mode,
      sessionId: targetSessionId,
      messageId: savedMsgId,
      reply: response.reply,
      isPastedThread: response.isPastedThread,
      extractedCoreQuery: response.extractedCoreQuery,
      teaching: response.isTeachingTurn
        ? {
            isTeachingTurn: true,
            phase: response.teachingPhase,
            clarifyingQuestions: response.clarifyingQuestions,
            lessonDraft: response.lessonDraft,
            lessonId: response.lessonId,
          }
        : undefined,
      response,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
