import { db } from "@/db";
import { modelCallLogs } from "@/db/schema";
import { calculateModelCost } from "./pricing";

export interface LogModelCallParams {
  businessId: string;
  taskType: "tag_job" | "find_facts" | "write_reply" | "read_screenshot" | "improve_skill" | "judge_eval" | "self_improve";
  modelId: string;
  promptVersionId?: string;
  roleId?: string;
  inputTokens: number;
  outputTokens: number;
  cachedReadTokens?: number;
  durationMs: number;
  status: "success" | "error" | "fallback_rerouted";
}

/**
 * Persists model invocation telemetry and calculated USD cost to the database.
 */
export async function logModelCall(params: LogModelCallParams) {
  const costUsd = calculateModelCost(
    params.modelId,
    params.inputTokens,
    params.outputTokens,
    params.cachedReadTokens ?? 0
  );

  return db.insert(modelCallLogs).values({
    businessId: params.businessId,
    taskType: params.taskType,
    modelId: params.modelId,
    promptVersionId: params.promptVersionId,
    roleId: params.roleId,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cachedReadTokens: params.cachedReadTokens ?? 0,
    durationMs: params.durationMs,
    costUsd: costUsd.toString(),
    status: params.status,
  }).returning();
}
