import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  getEmailThreads,
  updateThreadNote,
  updateMessageNote,
  analyzeNotesAndProposeSkillImprovement,
  getSkillImprovementProposals,
  approveSkillImprovement,
  rejectSkillImprovement,
  getDoneWhenDemonstration,
} from "@/services/brain/emailSkillsOptimizer";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    if (view === "demonstration") {
      const demo = getDoneWhenDemonstration(tenant.businessId);
      return NextResponse.json({ success: true, demonstration: demo });
    }

    const threads = getEmailThreads(tenant.businessId);
    const proposals = getSkillImprovementProposals(tenant.businessId);
    const demonstration = getDoneWhenDemonstration(tenant.businessId);

    return NextResponse.json({
      success: true,
      threads,
      proposals,
      demonstration,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch past email threads", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { action, threadId, messageId, notes, proposalId, modelId } = body;

    // Action 1: Propose Skill Improvement using Strong Model (e.g. Claude Opus 5.5)
    if (action === "propose_improvement") {
      const proposal = analyzeNotesAndProposeSkillImprovement(tenant.businessId, {
        modelId: modelId || "claude-opus-5.5",
      });
      return NextResponse.json({
        success: true,
        proposal,
        message: `Claude Opus 5.5 analyzed human notes and proposed improvements for skill '${proposal.targetSkillName}'.`,
      });
    }

    // Action 2: Human Approves Skill Improvement -> Creates new version in Settings
    if (action === "approve_improvement") {
      if (!proposalId) {
        return NextResponse.json({ error: "proposalId is required for approval" }, { status: 400 });
      }
      const result = approveSkillImprovement(tenant.businessId, proposalId, tenant.userId);
      return NextResponse.json({
        success: true,
        message: `Skill change approved by human reviewer! Updated to Version ${result.newVersionNumber} in Settings.`,
        proposal: result.proposal,
        updatedSkill: result.updatedSkill,
        newVersionNumber: result.newVersionNumber,
        demonstration: result.demonstration,
      });
    }

    // Action 3: Human Rejects Skill Improvement
    if (action === "reject_improvement") {
      if (!proposalId) {
        return NextResponse.json({ error: "proposalId is required for rejection" }, { status: 400 });
      }
      const rejected = rejectSkillImprovement(tenant.businessId, proposalId);
      return NextResponse.json({
        success: true,
        message: "Skill improvement proposal rejected.",
        proposal: rejected,
      });
    }

    // Action 4: Get Done-When Demonstration (Note -> Skill Change -> Better Answer)
    if (action === "get_demonstration") {
      const demo = getDoneWhenDemonstration(tenant.businessId);
      return NextResponse.json({ success: true, demonstration: demo });
    }

    // Action 5: Save note on an individual message
    if (messageId && notes !== undefined) {
      if (!threadId) {
        return NextResponse.json({ error: "threadId is required when annotating a message" }, { status: 400 });
      }
      const res = updateMessageNote(tenant.businessId, threadId, messageId, notes);
      return NextResponse.json({
        success: true,
        message: "Human teaching note saved on email message.",
        thread: res.thread,
        messageItem: res.message,
      });
    }

    // Action 6: Save note on whole thread
    if (threadId && notes !== undefined) {
      const updated = updateThreadNote(tenant.businessId, threadId, notes);
      return NextResponse.json({
        success: true,
        thread: updated,
        message: "Human teaching note updated on entire email thread.",
      });
    }

    return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process email action", details: String(error) },
      { status: 500 }
    );
  }
}
