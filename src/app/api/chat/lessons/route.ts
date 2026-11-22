import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  getLessons,
  createLessonFromCorrection,
  approveLesson,
  rejectLesson,
  toggleLesson,
  updateLesson,
  deleteLesson,
} from "@/services/chat/lessonManager";

/**
 * Task 3.4 & Task 3.3: Lessons API
 * Supports viewing, editing, approving, switching on/off, and deleting lessons.
 * Strictly guarantees that unapproved lessons are NEVER used in answers.
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;

    const lessonList = await getLessons(tenant.businessId, {
      status,
      category,
      isActive,
    });

    return NextResponse.json({
      success: true,
      lessons: lessonList,
      totalCount: lessonList.length,
      pendingCount: lessonList.filter((l) => l.status === "pending").length,
      approvedCount: lessonList.filter((l) => l.status === "approved" && l.isActive).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lessons", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { action } = body;

    // Action 1: Create a lesson from comment box or critique
    if (action === "create_from_correction") {
      const {
        chatMessageId = "00000000-0000-0000-0000-000000000000",
        originalQuestion,
        wrongAnswer,
        why,
        category,
      } = body;

      if (!originalQuestion || !why) {
        return NextResponse.json(
          { error: "originalQuestion and why (correction rule) are required" },
          { status: 400 }
        );
      }

      const lesson = await createLessonFromCorrection({
        businessId: tenant.businessId,
        chatMessageId,
        originalQuestion,
        wrongAnswer: wrongAnswer || "Unverified model reply",
        correctionWhy: why,
        author: tenant.userEmail,
        category,
      });

      return NextResponse.json({
        success: true,
        message: `Draft lesson created at ${lesson.fileName}. Awaiting human approval.`,
        lesson,
      });
    }

    // Action 2: Approve a lesson
    if (action === "approve") {
      const { lessonId } = body;
      if (!lessonId) {
        return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
      }

      const approved = await approveLesson(tenant.businessId, lessonId, tenant.userId);
      return NextResponse.json({
        success: true,
        message: "Lesson approved and active in chat context.",
        lesson: approved,
      });
    }

    // Action 3: Reject a lesson
    if (action === "reject") {
      const { lessonId } = body;
      if (!lessonId) {
        return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
      }

      const rejected = await rejectLesson(tenant.businessId, lessonId);
      return NextResponse.json({
        success: true,
        message: "Lesson rejected.",
        lesson: rejected,
      });
    }

    // Action 4: Switch off or on (toggle)
    if (action === "toggle") {
      const { lessonId, isActive } = body;
      if (!lessonId || typeof isActive !== "boolean") {
        return NextResponse.json({ error: "lessonId and isActive (boolean) are required" }, { status: 400 });
      }

      const toggled = await toggleLesson(tenant.businessId, lessonId, isActive);
      return NextResponse.json({
        success: true,
        message: `Lesson is now ${isActive ? "active" : "switched off (inactive)"}.`,
        lesson: toggled,
      });
    }

    // Action 5: Edit / Update a lesson
    if (action === "update") {
      const { lessonId, title, category, lessonMarkdown } = body;
      if (!lessonId) {
        return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
      }

      const updated = await updateLesson(tenant.businessId, lessonId, {
        ...(title ? { title } : {}),
        ...(category ? { category } : {}),
        ...(lessonMarkdown ? { lessonMarkdown } : {}),
      });

      return NextResponse.json({
        success: true,
        message: "Lesson successfully updated.",
        lesson: updated,
      });
    }

    // Action 6: Delete a lesson
    if (action === "delete") {
      const { lessonId } = body;
      if (!lessonId) {
        return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
      }

      await deleteLesson(tenant.businessId, lessonId);
      return NextResponse.json({
        success: true,
        message: "Lesson and markdown file permanently deleted.",
      });
    }

    return NextResponse.json({ error: "Unsupported lesson action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Lesson operation failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId query param is required" }, { status: 400 });
    }

    await deleteLesson(tenant.businessId, lessonId);
    return NextResponse.json({
      success: true,
      message: "Lesson and markdown file permanently deleted.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete lesson", details: String(error) },
      { status: 500 }
    );
  }
}
