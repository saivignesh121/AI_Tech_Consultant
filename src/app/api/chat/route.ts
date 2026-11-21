import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { executeConsultantTurn } from "@/services/chat/agentLoop";
import { compileLessonFromCorrection } from "@/services/chat/lessonCompiler";
import { db } from "@/db";
import { chatMessages, chatTraces, chatSessions } from "@/db/schema/chat";
import { lessons } from "@/db/schema/chat";
import { modelCallLogs } from "@/db/schema/telemetry";
import { eq } from "drizzle-orm";

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

    // Ensure session exists or create one
    let targetSessionId = sessionId;
    if (!targetSessionId) {
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
      const compiled = compileLessonFromCorrection({
        businessId: tenant.businessId,
        chatMessageId: targetSessionId,
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
          chatMessageId: targetSessionId,
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
    const response = await executeConsultantTurn({
      businessId: tenant.businessId,
      userMessage: message,
      roleSlug,
      modelId,
      availableContexts: contexts,
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
