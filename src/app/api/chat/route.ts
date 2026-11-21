import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { executeConsultantTurn } from "@/services/chat/agentLoop";
import { compileLessonFromCorrection } from "@/services/chat/lessonCompiler";
import { db } from "@/db";
import { chatMessages, chatTraces, chatSessions } from "@/db/schema/chat";
import { lessons } from "@/db/schema/chat";
import { knowledgePages, knowledgeChunks } from "@/db/schema/knowledge";
import { modelCallLogs } from "@/db/schema/telemetry";
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
      roleSlug = "support-engineer",
      mode = "ask",
      modelId = "claude-sonnet-5.5",
      contexts = [],
      feedbackCorrection,
      imageUrl,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Ensure session exists and strictly belongs to the current tenant
    let targetSessionId = sessionId;
    if (targetSessionId) {
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
        return NextResponse.json(
          { error: "Session not found or belongs to another business" },
          { status: 403 }
        );
      }
    } else {
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
    }

    // 1. If request is Teach Mode or has feedback correction, compile lesson
    if (mode === "teach" || feedbackCorrection) {
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

    // 2. Standard Ask consultation turn via Agent Loop
    // Load tenant-isolated knowledge base contexts if not explicitly provided
    let activeContexts = contexts;
    if (!activeContexts || activeContexts.length === 0) {
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
      } else {
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

    const response = await executeConsultantTurn({
      businessId: tenant.businessId,
      userMessage: message,
      roleSlug,
      modelId,
      availableContexts: activeContexts,
    });

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

    // Record Chat Trace & Telemetry
    await db.insert(chatTraces).values({
      messageId: savedConsultantMsg.id,
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

    return NextResponse.json({
      success: true,
      mode: "ask",
      sessionId: targetSessionId,
      messageId: savedConsultantMsg.id,
      response,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
