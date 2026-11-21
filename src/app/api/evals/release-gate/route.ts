import { NextRequest, NextResponse } from "next/server";
import { evaluateReleaseGate } from "@/services/eval/releaseGate";

export async function GET() {
  // Return current release gate status
  const currentGate = evaluateReleaseGate(
    "prompt",
    "master_system",
    98.8, // Candidate score
    96.5  // Baseline score
  );

  return NextResponse.json({
    activeGate: currentGate,
    policy: "Hard blocking rule: Candidate version MUST meet or exceed active baseline benchmark score.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetType = "prompt",
      targetIdentifier = "qa_answer",
      candidateScore = 98.2,
      baselineScore = 96.0,
    } = body;

    const gate = evaluateReleaseGate(
      targetType,
      targetIdentifier,
      Number(candidateScore),
      Number(baselineScore)
    );

    return NextResponse.json({ success: true, gate });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to evaluate release gate", details: String(error) },
      { status: 500 }
    );
  }
}
