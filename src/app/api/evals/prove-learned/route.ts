import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  runBeforeAfterLessonEvaluation,
  COMPARATIVE_SCENARIOS,
} from "@/services/eval/lessonEvalProver";

/**
 * Task 3.5: Prove that it learned API Endpoint
 * Runs the same question in the Eval Lab before and after a lesson,
 * demonstrating an empirical score improvement.
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get("scenarioId") || undefined;
    const candidateModelId = searchParams.get("candidateModelId") || "claude-sonnet-5.5";
    const judgeModelId = searchParams.get("judgeModelId") || "claude-opus-5.5";

    const proof = await runBeforeAfterLessonEvaluation({
      businessId: tenant.businessId,
      scenarioId,
      candidateModelId,
      judgeModelId,
    });

    return NextResponse.json({
      success: true,
      proof,
      availableScenarios: COMPARATIVE_SCENARIOS,
    });
  } catch (error) {
    console.error("Error in prove-learned evaluation GET:", error);
    return NextResponse.json(
      { error: "Failed to run comparative lesson evaluation" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json().catch(() => ({}));
    const { scenarioId, candidateModelId, judgeModelId } = body;

    const proof = await runBeforeAfterLessonEvaluation({
      businessId: tenant.businessId,
      scenarioId,
      candidateModelId,
      judgeModelId,
    });

    return NextResponse.json({
      success: true,
      proof,
      availableScenarios: COMPARATIVE_SCENARIOS,
    });
  } catch (error) {
    console.error("Error in prove-learned evaluation POST:", error);
    return NextResponse.json(
      { error: "Failed to execute comparative evaluation run" },
      { status: 500 }
    );
  }
}
