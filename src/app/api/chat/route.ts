import { NextResponse } from "next/server";
import { executeConsultantTurn } from "@/services/chat/agentLoop";
import { compileLessonFromCorrection } from "@/services/chat/lessonCompiler";

/**
 * Public Ask & Teach Chat API Endpoint
 * Handles conversational queries, role switching, citations, and inline teaching.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      businessId,
      message,
      roleSlug = "support-engineer",
      mode = "ask",
      modelId = "claude-sonnet-5.5",
      contexts = [],
      feedbackCorrection,
    } = body;

    if (!businessId || !message) {
      return NextResponse.json(
        { error: "Both 'businessId' and 'message' are required" },
        { status: 400 }
      );
    }

    // If request contains teaching feedback, compile lesson
    if (mode === "teach" || feedbackCorrection) {
      const lesson = compileLessonFromCorrection({
        businessId,
        chatMessageId: `msg-${Date.now()}`,
        category: "Customer Support Teaching",
        originalQuestion: message,
        wrongAnswer: feedbackCorrection?.wrongAnswer || "Previous answer",
        correctionWhy: feedbackCorrection?.why || message,
        author: feedbackCorrection?.author || "Support Lead",
      });

      return NextResponse.json({
        success: true,
        mode: "teach",
        message: "Teaching received and compiled into draft lesson awaiting approval.",
        lesson,
      });
    }

    // Standard Ask consultation turn
    const response = await executeConsultantTurn({
      businessId,
      userMessage: message,
      roleSlug,
      modelId,
      availableContexts: contexts,
    });

    return NextResponse.json({
      success: true,
      mode: "ask",
      response,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
