import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { chatMessages, chatSessions, lessons } from "@/db/schema/chat";
import { selfImproveRuns } from "@/db/schema/evals";
import { eq, and, desc } from "drizzle-orm";
import {
  getSkillImprovementProposals,
  approveSkillImprovement,
  rejectSkillImprovement,
} from "@/services/brain/emailSkillsOptimizer";
import {
  approveLesson,
  rejectLesson,
  toggleLesson,
  deleteLesson,
  updateLesson,
} from "@/services/chat/lessonManager";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    // Verify role: expert or owner
    if (tenant.userRole !== "expert" && tenant.userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden. Expert / Approver or Owner permissions required." },
        { status: 403 }
      );
    }

    // 1. Fetch escalated chat tasks
    const escalatedTasks = await db
      .select({
        id: chatMessages.id,
        sessionId: chatMessages.sessionId,
        content: chatMessages.content,
        escalationReason: chatMessages.escalationReason,
        isResolved: chatMessages.isResolved,
        expertReply: chatMessages.expertReply,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.businessId, tenant.businessId),
          eq(chatMessages.isEscalated, true)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(30);

    // 2. Fetch pending lessons
    const pendingLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.businessId, tenant.businessId))
      .orderBy(desc(lessons.createdAt))
      .limit(30);

    // 3. Fetch self-improve PRs
    const prRuns = await db
      .select()
      .from(selfImproveRuns)
      .where(eq(selfImproveRuns.businessId, tenant.businessId))
      .orderBy(desc(selfImproveRuns.createdAt))
      .limit(20);

    const skillProposals = getSkillImprovementProposals(tenant.businessId);

    return NextResponse.json({
      success: true,
      escalatedTasks,
      pendingLessons,
      selfImproveRuns: prRuns,
      skillProposals,
      summary: {
        pendingEscalations: escalatedTasks.filter((t) => !t.isResolved).length,
        pendingLessons: pendingLessons.filter((l) => l.status === "pending").length,
        pendingPrs: prRuns.filter((r) => r.status === "passed" || r.status === "running").length,
        pendingSkillProposals: skillProposals.filter((p) => p.status === "pending_human_review").length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch approvals:", error);
    return NextResponse.json(
      { error: "Failed to retrieve approvals data", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();

    if (tenant.userRole !== "expert" && tenant.userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden. Expert / Approver or Owner permissions required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Action 1: Resolve escalated chat task with human expert answer
    if (action === "resolve_escalation") {
      const { messageId, expertReply } = body;
      if (!messageId || !expertReply) {
        return NextResponse.json(
          { error: "Missing messageId or expertReply" },
          { status: 400 }
        );
      }

      await db
        .update(chatMessages)
        .set({
          isResolved: true,
          expertReply,
        })
        .where(
          and(
            eq(chatMessages.id, messageId),
            eq(chatMessages.businessId, tenant.businessId)
          )
        );

      return NextResponse.json({
        success: true,
        message: "Escalated task resolved. Expert answer injected into knowledge memory.",
      });
    }

    // Action 2: Approve or Reject a Lesson / Skill change
    if (action === "approve_lesson" || action === "reject_lesson") {
      const { lessonId } = body;
      const newStatus = action === "approve_lesson" ? "approved" : "rejected";

      if (action === "approve_lesson") {
        await approveLesson(tenant.businessId, lessonId, tenant.userId);
      } else {
        await rejectLesson(tenant.businessId, lessonId);
      }

      return NextResponse.json({
        success: true,
        lessonId,
        status: newStatus,
        message: `Lesson successfully ${newStatus}.`,
      });
    }

    // Action 2b: Toggle, Edit, or Delete a Lesson (Task 3.4)
    if (action === "toggle_lesson") {
      const { lessonId, isActive } = body;
      const toggled = await toggleLesson(tenant.businessId, lessonId, isActive);
      return NextResponse.json({
        success: true,
        lessonId,
        isActive: toggled.isActive,
        message: `Lesson is now ${toggled.isActive ? "active" : "inactive"}.`,
      });
    }

    if (action === "edit_lesson") {
      const { lessonId, title, category, lessonMarkdown } = body;
      const updated = await updateLesson(tenant.businessId, lessonId, {
        ...(title ? { title } : {}),
        ...(category ? { category } : {}),
        ...(lessonMarkdown ? { lessonMarkdown } : {}),
      });
      return NextResponse.json({
        success: true,
        lesson: updated,
        message: "Lesson updated successfully.",
      });
    }

    if (action === "delete_lesson") {
      const { lessonId } = body;
      await deleteLesson(tenant.businessId, lessonId);
      return NextResponse.json({
        success: true,
        message: "Lesson and markdown file deleted.",
      });
    }

    // Action 3: Approve or Revert a Self-Improvement PR
    if (action === "approve_pr" || action === "revert_pr") {
      const { runId } = body;
      const newStatus = action === "approve_pr" ? "merged" : "reverted";

      await db
        .update(selfImproveRuns)
        .set({
          status: newStatus,
        })
        .where(
          and(
            eq(selfImproveRuns.id, runId),
            eq(selfImproveRuns.businessId, tenant.businessId)
          )
        );

      return NextResponse.json({
        success: true,
        runId,
        status: newStatus,
        message: `Self-improvement patch ${newStatus === "merged" ? "approved and merged" : "reverted"}.`,
      });
    }

    // Action 4: Approve or Reject a Skill Improvement Proposal (from Past Email Teaching Notes)
    if (action === "approve_skill_proposal" || action === "reject_skill_proposal") {
      const { proposalId } = body;
      if (!proposalId) {
        return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
      }
      if (action === "approve_skill_proposal") {
        const result = approveSkillImprovement(tenant.businessId, proposalId, tenant.userId);
        return NextResponse.json({
          success: true,
          message: `Skill change approved! Created Version ${result.newVersionNumber} in Settings.`,
          proposal: result.proposal,
          newVersionNumber: result.newVersionNumber,
          demonstration: result.demonstration,
        });
      } else {
        const rejected = rejectSkillImprovement(tenant.businessId, proposalId);
        return NextResponse.json({
          success: true,
          message: "Skill proposal rejected.",
          proposal: rejected,
        });
      }
    }

    return NextResponse.json({ error: "Unsupported approval action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process approval action:", error);
    return NextResponse.json(
      { error: "Approval operation failed", details: String(error) },
      { status: 500 }
    );
  }
}
