import { db } from "@/db";
import { expertTasks, chatMessages } from "@/db/schema/chat";
import { createInstruction, InstructionItem } from "../brain/instructionsManager";
import { eq, and, desc } from "drizzle-orm";

export interface ExpertTaskItem {
  id: string;
  businessId: string;
  sessionId?: string;
  messageId?: string;
  question: string;
  roleSlug: string;
  status: "pending" | "resolved";
  assignedTo?: string;
  expertAnswer?: string;
  learnedInstructionId?: string;
  resolvedAt?: string;
  createdAt: string;
}

// In-memory store fallback for vitest and offline DB execution
const inMemExpertTasks = new Map<string, ExpertTaskItem[]>();
const isTestEnv = process.env.NODE_ENV === "test";

export function resetInMemoryExpertTasks(businessId?: string) {
  if (businessId) {
    inMemExpertTasks.delete(businessId);
  } else {
    inMemExpertTasks.clear();
  }
}

/**
 * Creates a human expert task when the agent cannot answer with sufficient confidence.
 * Task 3.2: "Ask a human when it cannot answer. The chat creates a task for a human expert"
 */
export async function createExpertTask(params: {
  businessId: string;
  question: string;
  roleSlug?: string;
  sessionId?: string;
  messageId?: string;
  assignedTo?: string;
}): Promise<ExpertTaskItem> {
  const roleSlug = params.roleSlug || "support-engineer";
  const now = new Date().toISOString();

  let createdTask: ExpertTaskItem = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    businessId: params.businessId,
    sessionId: params.sessionId,
    messageId: params.messageId,
    question: params.question,
    roleSlug,
    status: "pending",
    assignedTo: params.assignedTo || "Senior Technical Specialist",
    createdAt: now,
  };

  if (!isTestEnv) {
    try {
      const [row] = await db
        .insert(expertTasks)
        .values({
          businessId: params.businessId,
          sessionId: params.sessionId,
          messageId: params.messageId,
          question: params.question,
          roleSlug,
          status: "pending",
          assignedTo: params.assignedTo || "Senior Technical Specialist",
        })
        .returning();

      if (row) {
        createdTask = {
          id: row.id,
          businessId: row.businessId,
          sessionId: row.sessionId || undefined,
          messageId: row.messageId || undefined,
          question: row.question,
          roleSlug: row.roleSlug,
          status: row.status as "pending" | "resolved",
          assignedTo: row.assignedTo || undefined,
          expertAnswer: row.expertAnswer || undefined,
          learnedInstructionId: row.learnedInstructionId || undefined,
          resolvedAt: row.resolvedAt?.toISOString(),
          createdAt: row.createdAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("Notice: DB expert task insert fallback", err);
    }
  }

  // Update in-memory registry
  const existing = inMemExpertTasks.get(params.businessId) || [];
  inMemExpertTasks.set(params.businessId, [createdTask, ...existing]);

  return createdTask;
}

/**
 * Lists all expert tasks for a business, optionally filtered by status.
 */
export async function getExpertTasks(
  businessId: string,
  filterStatus?: "pending" | "resolved"
): Promise<ExpertTaskItem[]> {
  try {
    const rows = await db
      .select()
      .from(expertTasks)
      .where(
        filterStatus
          ? and(eq(expertTasks.businessId, businessId), eq(expertTasks.status, filterStatus))
          : eq(expertTasks.businessId, businessId)
      )
      .orderBy(desc(expertTasks.createdAt));

    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        businessId: r.businessId,
        sessionId: r.sessionId || undefined,
        messageId: r.messageId || undefined,
        question: r.question,
        roleSlug: r.roleSlug,
        status: r.status as "pending" | "resolved",
        assignedTo: r.assignedTo || undefined,
        expertAnswer: r.expertAnswer || undefined,
        learnedInstructionId: r.learnedInstructionId || undefined,
        resolvedAt: r.resolvedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Notice: DB expert tasks read fallback", err);
  }

  const inMem = inMemExpertTasks.get(businessId) || [];
  if (filterStatus) {
    return inMem.filter((t) => t.status === filterStatus);
  }
  return inMem;
}

/**
 * Resolves an expert task, saves the expert's answer, and flows the knowledge back into memory.
 * Task 3.2: "and the expert's answer flows back into the memory."
 */
export async function resolveExpertTask(params: {
  businessId: string;
  taskId: string;
  expertAnswer: string;
  flowIntoMemory?: boolean;
  appliesToRoles?: string[];
}): Promise<{
  task: ExpertTaskItem;
  learnedInstruction?: InstructionItem;
}> {
  const { businessId, taskId, expertAnswer, flowIntoMemory = true, appliesToRoles } = params;
  const now = new Date().toISOString();

  // 1. Locate the task
  const allTasks = inMemExpertTasks.get(businessId) || [];
  const targetTask = allTasks.find((t) => t.id === taskId);
  const question = targetTask ? targetTask.question : "Resolved Inquiry";
  const roleSlug = targetTask ? targetTask.roleSlug : "support-engineer";

  let learnedInstruction: InstructionItem | undefined;

  // 2. Flow expert answer into memory as an active Instruction (or lesson)
  if (flowIntoMemory) {
    const summaryTitle = question.length > 50 ? `${question.slice(0, 47)}...` : question;
    learnedInstruction = createInstruction(businessId, {
      title: `Expert Verified: ${summaryTitle}`,
      ruleText: expertAnswer,
      appliesToRoles: appliesToRoles || [roleSlug, "all"],
      isActive: true,
    });
  }

  // 3. Update DB
  let updatedTask: ExpertTaskItem = {
    id: taskId,
    businessId,
    sessionId: targetTask?.sessionId,
    messageId: targetTask?.messageId,
    question,
    roleSlug,
    status: "resolved",
    assignedTo: targetTask?.assignedTo,
    expertAnswer,
    learnedInstructionId: learnedInstruction?.id,
    resolvedAt: now,
    createdAt: targetTask?.createdAt || now,
  };

  try {
    await db
      .update(expertTasks)
      .set({
        status: "resolved",
        expertAnswer,
        learnedInstructionId: learnedInstruction?.id,
        resolvedAt: new Date(),
      })
      .where(and(eq(expertTasks.id, taskId), eq(expertTasks.businessId, businessId)));

    if (targetTask?.messageId) {
      await db
        .update(chatMessages)
        .set({
          isResolved: true,
          expertReply: expertAnswer,
        })
        .where(and(eq(chatMessages.id, targetTask.messageId), eq(chatMessages.businessId, businessId)));
    }
  } catch (err) {
    console.warn("Notice: DB expert task update fallback", err);
  }

  // 4. Update in-memory
  const updatedList = allTasks.map((t) => (t.id === taskId ? updatedTask : t));
  inMemExpertTasks.set(businessId, updatedList);

  return {
    task: updatedTask,
    learnedInstruction,
  };
}
