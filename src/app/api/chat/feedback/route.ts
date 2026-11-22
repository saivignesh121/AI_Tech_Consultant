import { NextRequest, NextResponse } from "next/server";
import {
  convertFeedbackToTestCase,
  getAllFeedbackTestCases,
  FeedbackPayload,
} from "@/services/eval/feedbackTestGenerator";

/**
 * Task 4.4: Real feedback becomes new tests
 * POST /api/chat/feedback: Ingests thumbs up or down with reason and creates a new test case.
 * GET /api/chat/feedback: Returns all test cases generated from real user feedback.
 */

export async function GET() {
  try {
    const feedbackTests = getAllFeedbackTestCases();
    return NextResponse.json({
      success: true,
      totalCount: feedbackTests.length,
      feedbackTests,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch feedback test cases", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chatMessageId,
      question,
      aiAnswer,
      feedbackType = "thumbs_down",
      reason,
      correctedAnswer,
      category,
      roleId,
    } = body;

    if (!question || !aiAnswer || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: question, aiAnswer, and reason are required" },
        { status: 400 }
      );
    }

    if (feedbackType !== "thumbs_up" && feedbackType !== "thumbs_down") {
      return NextResponse.json(
        { error: "feedbackType must be either 'thumbs_up' or 'thumbs_down'" },
        { status: 400 }
      );
    }

    const payload: FeedbackPayload = {
      chatMessageId,
      question,
      aiAnswer,
      feedbackType,
      reason,
      correctedAnswer,
      category,
      roleId,
    };

    const newTestCase = await convertFeedbackToTestCase(payload);
    const allTests = getAllFeedbackTestCases();

    return NextResponse.json({
      success: true,
      message: "Feedback converted to new benchmark test case successfully",
      testCase: newTestCase,
      totalFeedbackTests: allTests.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to convert feedback to test case", details: String(error) },
      { status: 500 }
    );
  }
}
