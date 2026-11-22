import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { selfImproveRuns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { packEvalFailure } from "@/services/self_improve/failurePacker";
import { executeOpusSelfImproveLoop } from "@/services/self_improve/opusFixer";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const runs = await db
      .select()
      .from(selfImproveRuns)
      .where(eq(selfImproveRuns.businessId, tenant.businessId))
      .orderBy(desc(selfImproveRuns.createdAt));

    // If no runs in db yet for this tenant, provide demonstrative initial seed runs
    if (runs.length === 0) {
      return NextResponse.json({
        runs: [
          {
            id: "run-001",
            businessId: tenant.businessId,
            caseId: "kb-dns-042",
            branchName: "self-improve/fix-kb-dns-042-1732185600",
            roundsExecuted: 2,
            maxRounds: 5,
            costAccumulatedUsd: "1.700000",
            maxBudgetUsd: "5.000000",
            status: "merged",
            prUrl: `https://github.com/${tenant.businessSlug}/ai-consultant/pull/42`,
            failingCasesSummary: {
              caseId: "kb-dns-042",
              question: "What A-record should I point to if I use Cloudflare proxying with an external registrar?",
              failingAnswer: "Point your A record to 127.0.0.1",
              expectedAnswer: "Point your A record to 54.214.12.8 per Solution Center.",
              judgeCritique: "Failed to cite correct IP.",
              scoreBefore: 40,
              scoreAfter: 100,
            },
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: "run-002",
            businessId: tenant.businessId,
            caseId: "chat-ref-019",
            branchName: "self-improve/fix-chat-ref-019-1732189200",
            roundsExecuted: 1,
            maxRounds: 5,
            costAccumulatedUsd: "0.850000",
            maxBudgetUsd: "5.000000",
            status: "passed",
            prUrl: `https://github.com/${tenant.businessSlug}/ai-consultant/pull/43`,
            failingCasesSummary: {
              caseId: "chat-ref-019",
              question: "Can I get a refund if I subscribed 45 days ago?",
              failingAnswer: "Yes, we offer refunds anytime within 60 days.",
              expectedAnswer: "Our policy strictly caps refunds at 30 days.",
              judgeCritique: "Hallucinated refund window exceeding 30-day policy.",
              scoreBefore: 30,
              scoreAfter: 100,
            },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "run-003",
            businessId: tenant.businessId,
            caseId: "kb-edge-999",
            branchName: "self-improve/fix-kb-edge-999-1732193400",
            roundsExecuted: 5,
            maxRounds: 5,
            costAccumulatedUsd: "4.250000",
            maxBudgetUsd: "5.000000",
            status: "failed_limit",
            prUrl: null,
            failingCasesSummary: {
              caseId: "kb-edge-999",
              question: "Ambiguous circular webhook question across 3 microservices",
              failingAnswer: "Ambiguous answer with incomplete routing logic",
              expectedAnswer: "Complex multi-vendor protocol requiring manual human review",
              judgeCritique: "Did not resolve webhook circle within 5 reasoning rounds.",
              scoreBefore: 40,
              scoreAfter: 65,
            },
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve self-improve runs", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();

    const {
      caseId = "kb-dns-042",
      question = "What A-record should I point to?",
      failingAnswer = "Point your A record to 127.0.0.1",
      expectedAnswer = "Point your A record to 54.214.12.8 per Solution Center.",
      judgeCritique = "Failed to cite correct IP.",
      comment,
      systemPrompt,
      relatedCode,
      targetBranch,
      activePromptVersion = "v1.2.0",
      maxRounds = 5,
      maxBudgetUsd = 5.0,
      forceFailureScenario = false,
    } = body;

    const failurePkg = packEvalFailure({
      caseId,
      question,
      failingAnswer,
      expectedAnswer,
      judgeCritique,
      comment,
      systemPrompt,
      relatedCode,
      targetBranch,
      activePromptVersion,
    });

    const result = await executeOpusSelfImproveLoop(failurePkg, {
      maxRounds,
      maxBudgetUsd,
      forceFailureScenario,
      businessSlug: tenant.businessSlug,
      businessId: tenant.businessId,
    });

    // Persist to database
    const [inserted] = await db
      .insert(selfImproveRuns)
      .values({
        businessId: tenant.businessId,
        branchName: result.branchName,
        roundsExecuted: result.roundsExecuted,
        maxRounds,
        costAccumulatedUsd: result.totalCostUsd.toFixed(6),
        maxBudgetUsd: maxBudgetUsd.toFixed(6),
        status: result.status,
        prUrl: result.pullRequestUrl || null,
        failingCasesSummary: {
          caseId,
          question,
          failingAnswer,
          expectedAnswer,
          judgeCritique,
          comment: failurePkg.comment,
          systemPrompt: failurePkg.systemPrompt,
          scoreBefore: result.failingCaseScoreBefore,
          scoreAfter: result.failingCaseScoreAfter,
          hiddenCheckSetPassed: result.hiddenCheckSetPassed,
          visibleCasesPassed: result.visibleCasesPassed ?? true,
          roundsLog: result.rounds || [],
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      run: inserted,
      failurePackage: failurePkg,
      rounds: result.rounds,
      reportMarkdown: result.reportMarkdown,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute self-improve loop", details: String(error) },
      { status: 500 }
    );
  }
}
