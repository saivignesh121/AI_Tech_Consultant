import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { createExpertTask, getExpertTasks } from "@/services/chat/expertTaskManager";

/**
 * Expert Tasks API
 * Task 3.2: "Ask a human when it cannot answer. The chat creates a task for a human expert,
 *            and the expert's answer flows back into the memory."
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as "pending" | "resolved" | null;
    const businessId = url.searchParams.get("businessId") || tenant.businessId;

    const tasks = await getExpertTasks(businessId, status || undefined);

    return NextResponse.json({
      success: true,
      businessId,
      tasks,
      total: tasks.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve expert tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { question, roleSlug, sessionId, messageId, assignedTo, businessId = tenant.businessId } = body;

    if (!question) {
      return NextResponse.json({ error: "Task question is required" }, { status: 400 });
    }

    const task = await createExpertTask({
      businessId,
      question,
      roleSlug,
      sessionId,
      messageId,
      assignedTo,
    });

    return NextResponse.json({
      success: true,
      message: "Expert task created successfully",
      task,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create expert task" },
      { status: 500 }
    );
  }
}
