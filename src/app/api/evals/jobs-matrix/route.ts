import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  evaluateJobSuitability,
  EVAL_JOBS,
  getModelStepBreakdownMatrix,
  getLocalOnlyQualityDropReport,
} from "@/services/eval/evalJobsMatrix";

/**
 * Feature 4 & Task 4.2: The 6 Eval Jobs & Step-by-Step Breakdown Matrix API
 * Returns empirical model evaluations job-by-job on Quality, Cost, and Speed,
 * and the Local-Only quality drop report.
 */
export async function GET(req: NextRequest) {
  try {
    await getTenantContext();
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || undefined;
    const localOnly = searchParams.get("localOnly") === "true";

    const evaluations = evaluateJobSuitability(jobId, localOnly);
    const stepBreakdownMatrix = getModelStepBreakdownMatrix(localOnly);
    const localOnlyQualityDrop = getLocalOnlyQualityDropReport();

    return NextResponse.json({
      success: true,
      evaluations,
      stepBreakdownMatrix,
      localOnlyQualityDrop,
      availableJobs: Object.values(EVAL_JOBS).map((j) => ({
        id: j.id,
        title: j.title,
        description: j.description,
        recommendedModelId: j.recommendedModelId,
      })),
      localOnly,
    });
  } catch (error) {
    console.error("Error in eval jobs matrix API:", error);
    return NextResponse.json(
      { error: "Failed to evaluate eval jobs matrix" },
      { status: 500 }
    );
  }
}
