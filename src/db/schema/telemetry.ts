import { pgTable, uuid, varchar, integer, numeric, timestamp, index, text, jsonb } from "drizzle-orm/pg-core";
import { businesses } from "./business";
import { agentRoles, promptVersions } from "./prompts";

export const modelCallLogs = pgTable(
  "model_call_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    taskType: varchar("task_type", { length: 100 }).notNull(), // 'tag_job' | 'find_facts' | 'write_reply' | 'read_screenshot' | 'improve_skill' | 'judge_eval' | 'self_improve'
    modelId: varchar("model_id", { length: 100 }).notNull(),
    promptVersionId: uuid("prompt_version_id").references(() => promptVersions.id, { onDelete: "set null" }),
    roleId: uuid("role_id").references(() => agentRoles.id, { onDelete: "set null" }),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cachedReadTokens: integer("cached_read_tokens").default(0).notNull(),
    durationMs: integer("duration_ms").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(), // 'success' | 'error' | 'fallback_rerouted'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_mcl_telemetry").on(table.businessId, table.createdAt),
  ]
);

export const failedJobs = pgTable("failed_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  queueName: varchar("queue_name", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  errorStack: text("error_stack"),
  retryCount: integer("retry_count").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).defaultNow().notNull(),
});
