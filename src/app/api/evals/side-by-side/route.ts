import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { runSideBySideComparison } from "@/services/eval/sideBySideComparator";

/**
 * Side-by-Side Model Comparator API (Task 4.1)
 * Compares two models on the same benchmark test case with AI Judge evaluation and reasons.
 */
export async function GET(req: NextRequest) {
  try {
    await getTenantContext();
    const { searchParams } = new URL(req.url);

    const testCaseId = searchParams.get("testCaseId") || "step4-01";
    const modelAId = searchParams.get("modelAId") || "claude-sonnet-5.5";
    const modelBId = searchParams.get("modelBId") || "qwen/qwen3.8-max-0902";
    const judgeModelId = searchParams.get("judgeModelId") || "claude-opus-5.5";
    const benchmarkVersion = searchParams.get("version") || "1.0.0";

    const result = runSideBySideComparison({
      testCaseId,
      modelAId,
      modelBId,
      judgeModelId,
      benchmarkVersion,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error in side-by-side comparison GET:", error);
    return NextResponse.json(
      { error: "Failed to run side-by-side comparison" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await getTenantContext();
    const body = await req.json().catch(() => ({}));

    const result = runSideBySideComparison({
      testCaseId: body.testCaseId,
      question: body.question,
      expectedAnswer: body.expectedAnswer,
      category: body.category,
      modelAId: body.modelAId || "claude-sonnet-5.5",
      modelBId: body.modelBId || "qwen/qwen3.8-max-0902",
      judgeModelId: body.judgeModelId || "claude-opus-5.5",
      benchmarkVersion: body.benchmarkVersion || "1.0.0",
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error in side-by-side comparison POST:", error);
    return NextResponse.json(
      { error: "Failed to evaluate side-by-side comparison" },
      { status: 500 }
    );
  }
}
