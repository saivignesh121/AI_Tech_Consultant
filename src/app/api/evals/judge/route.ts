import { NextRequest, NextResponse } from "next/server";
import { runHumanJudgeCalibration } from "@/services/eval/judge";

export async function GET() {
  try {
    const calibration = runHumanJudgeCalibration();
    return NextResponse.json({
      success: true,
      masterJudge: "Claude Opus 5.5",
      secondaryJudge: "NVIDIA Nemotron 3 Ultra (Free)",
      calibration,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch judge calibration", details: String(error) },
      { status: 500 }
    );
  }
}
