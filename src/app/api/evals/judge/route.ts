import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  calibrateJudgeAgainstHuman,
  runHumanJudgeCalibration,
  DEFAULT_JUDGE_PROMPT,
  HUMAN_CALIBRATION_CASES,
} from "@/services/eval/judge";

/**
 * AI Judge Calibration & Prompt API (Task 4.1)
 * Returns 20 hand-graded cases calibration results and allows testing custom prompts.
 */
export async function GET(req: NextRequest) {
  try {
    await getTenantContext();
    const { searchParams } = new URL(req.url);
    const judgeModel = searchParams.get("judgeModel") || DEFAULT_JUDGE_PROMPT.judgeModelId;

    const calibration = calibrateJudgeAgainstHuman(HUMAN_CALIBRATION_CASES, judgeModel);

    return NextResponse.json({
      success: true,
      masterJudge: "Claude Opus 5.5",
      secondaryJudge: "NVIDIA Nemotron 3 Ultra (Free)",
      judgePrompt: DEFAULT_JUDGE_PROMPT,
      calibration,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch judge calibration", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await getTenantContext();
    const body = await req.json().catch(() => ({}));
    const { judgeModelId = "claude-opus-5.5", customPrompt } = body;

    const calibration = calibrateJudgeAgainstHuman(HUMAN_CALIBRATION_CASES, judgeModelId, customPrompt);

    return NextResponse.json({
      success: true,
      calibration,
      judgePrompt: {
        ...DEFAULT_JUDGE_PROMPT,
        judgeModelId,
        promptTemplate: customPrompt || DEFAULT_JUDGE_PROMPT.promptTemplate,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to calibrate judge", details: String(error) },
      { status: 500 }
    );
  }
}
