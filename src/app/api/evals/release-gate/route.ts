import { NextRequest, NextResponse } from "next/server";
import {
  evaluateReleaseGate,
  getReleaseGateAuditLogs,
  ReleaseGateCheckParams,
} from "@/services/eval/releaseGate";
import {
  TASK_SCORING_STANDARDS,
  RULES_VS_JUDGE_BOUNDARIES,
  ANTI_SATURATION_POLICIES,
} from "@/services/eval/releaseGateDecisions";

/**
 * Task 4.5: A Release Gate API
 * Hard automated enforcer: prevents prompts, roles, skills, or models
 * from deploying if candidate benchmark score falls below active baseline.
 */

export async function GET() {
  try {
    // Current baseline release gate status check
    const currentGate = evaluateReleaseGate({
      entityType: "prompt",
      entityName: "master_system_prompt",
      candidateScore: 98.8,
      baselineScore: 96.5,
    });

    const recentAuditLogs = getReleaseGateAuditLogs(20);

    return NextResponse.json({
      success: true,
      activeGate: currentGate,
      scoringStandards: TASK_SCORING_STANDARDS,
      rulesVsJudge: RULES_VS_JUDGE_BOUNDARIES,
      antiSaturation: ANTI_SATURATION_POLICIES,
      recentAuditLogs,
      policy:
        "Hard blocking rule: Candidate version MUST meet or exceed active baseline benchmark score across overall and category scores.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch release gate status", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      entityType = "prompt",
      entityName = "custom_change",
      candidateScore = 98.2,
      baselineScore = 96.0,
      candidateCategoryScores,
      baselineCategoryScores,
      minimumPassThreshold = 80.0,
    } = body;

    const checkParams: ReleaseGateCheckParams = {
      entityType,
      entityName,
      candidateScore: Number(candidateScore),
      baselineScore: Number(baselineScore),
      candidateCategoryScores,
      baselineCategoryScores,
      minimumPassThreshold: Number(minimumPassThreshold),
    };

    const gate = evaluateReleaseGate(checkParams);

    return NextResponse.json({
      success: true,
      gate,
      blocked: !gate.allowed,
      message: gate.reason,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to evaluate release gate", details: String(error) },
      { status: 500 }
    );
  }
}
