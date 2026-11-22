import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { resolveExpertTask } from "@/services/chat/expertTaskManager";

/**
 * Resolve Expert Task API
 * Resolves a human expert task and flows the expert's answer back into the Knowledge Brain.
 * Task 3.2: "and the expert's answer flows back into the memory."
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantContext();
    const resolvedParams = await context.params;
    const taskId = resolvedParams.id;

    const body = await req.json();
    const { expertAnswer, flowIntoMemory = true, appliesToRoles, businessId = tenant.businessId } = body;

    if (!expertAnswer || expertAnswer.trim().length === 0) {
      return NextResponse.json(
        { error: "expertAnswer content is required to resolve task" },
        { status: 400 }
      );
    }

    const result = await resolveExpertTask({
      businessId,
      taskId,
      expertAnswer,
      flowIntoMemory,
      appliesToRoles,
    });

    return NextResponse.json({
      success: true,
      message: flowIntoMemory
        ? "Task resolved and expert answer successfully flowed into Knowledge Brain as active instruction."
        : "Task resolved without memory flow.",
      task: result.task,
      learnedInstruction: result.learnedInstruction,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to resolve expert task" },
      { status: 500 }
    );
  }
}
