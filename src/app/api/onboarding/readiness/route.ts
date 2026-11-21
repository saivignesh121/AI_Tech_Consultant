import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { evaluateBusinessReadiness } from "@/services/onboarding/readinessEvaluator";
import { SyntheticTestCase } from "@/services/onboarding/syntheticTestGenerator";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const {
      testCases = [],
      modelId = "claude-sonnet-5.5",
      passThreshold = 85.0,
    } = body;

    const defaultTestCases: SyntheticTestCase[] = testCases.length > 0
      ? testCases
      : [
          {
            id: "synth-001",
            question: "Where is the SSL encryption toggle located?",
            expectedAnswer: "Under the SSL/TLS tab, select 'Full' encryption mode from the radio options.",
            sourceUrl: "https://docs.acme.com/ssl",
            sourceTitle: "SSL Setup",
          },
          {
            id: "synth-002",
            question: "What port number is used for PostgreSQL database connections?",
            expectedAnswer: "Port 5432 is the standard PostgreSQL port.",
            sourceUrl: "https://docs.acme.com/database",
            sourceTitle: "Database Settings",
          },
        ];

    const result = evaluateBusinessReadiness(defaultTestCases, modelId, passThreshold);

    return NextResponse.json({
      success: true,
      businessId: tenant.businessId,
      result: {
        totalTests: result.totalTests,
        passedTests: result.passedTests,
        readinessScore: result.readinessScore,
        targetThreshold: result.targetThreshold,
        isChatUnlocked: result.isChatUnlocked,
        humanReadableSummary: result.humanReadableSummary,
        evaluationDurationMs: result.evaluationDurationMs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to evaluate readiness", details: String(error) },
      { status: 500 }
    );
  }
}
