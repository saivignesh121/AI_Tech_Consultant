import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  runConfidenceThresholdEval,
  CALIBRATED_CONFIDENCE_THRESHOLD,
  CALIBRATION_BENCHMARK_CASES,
} from "@/services/eval/thresholdCalibration";

/**
 * "I Don't Know" Line Calibration & Trade-Off Evaluation Endpoint
 * Task 3.2: "An 'I don't know' line, set by your evals, not by guessing.
 *            Done when: wrong answers drop, and you show the trade-off."
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const evalResult = runConfidenceThresholdEval();

    return NextResponse.json({
      success: true,
      businessId: tenant.businessId,
      calibratedThreshold: CALIBRATED_CONFIDENCE_THRESHOLD,
      evalResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to run threshold calibration evaluation" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json().catch(() => ({}));
    const { thresholds, customCases } = body;

    const evalResult = runConfidenceThresholdEval(thresholds, customCases);

    return NextResponse.json({
      success: true,
      businessId: tenant.businessId,
      calibratedThreshold: evalResult.calibratedThreshold,
      evalResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to run custom threshold evaluation" },
      { status: 500 }
    );
  }
}
