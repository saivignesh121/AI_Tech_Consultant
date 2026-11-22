import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { evaluateJobSuitability, EVAL_JOBS } from "@/services/eval/evalJobsMatrix";

/**
 * Feature 4: The 6 Eval Jobs Matrix API
 * Returns empirical model evaluations job-by-job on Quality, Cost, and Speed.
 */
export async function GET(req: NextRequest) {
  try {
    await getTenantContext();
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || undefined;
    const localOnly = searchParams.get("localOnly") === "true";

    const evaluations = evaluateJobSuitability(jobId, localOnly);

    return NextResponse.json({
      success: true,
      evaluations,
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
