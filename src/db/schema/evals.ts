import { pgTable, uuid, varchar, text, integer, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { businesses } from "./business";

export const evalBenchmarks = pgTable("eval_benchmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evalCases = pgTable("eval_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  benchmarkId: uuid("benchmark_id")
    .references(() => evalBenchmarks.id, { onDelete: "cascade" })
    .notNull(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'screenshot' | 'unanswerable' | 'instruction_skill' | 'synonym_typo' | 'url_health' | 'trick_injection' | 'escalation' | 'teach_pair'
  question: text("question").notNull(),
  expectedAnswer: text("expected_answer").notNull(),
  expectedSource: text("expected_source"),
  expectedAction: varchar("expected_action", { length: 100 }).default("answer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evalRuns = pgTable("eval_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  benchmarkId: uuid("benchmark_id")
    .references(() => evalBenchmarks.id, { onDelete: "cascade" })
    .notNull(),
  modelId: varchar("model_id", { length: 100 }).notNull(),
  triggerSource: varchar("trigger_source", { length: 50 }).default("manual").notNull(), // 'manual' | 'release_gate' | 'self_improve'
  passRate: numeric("pass_rate", { precision: 5, scale: 2 }),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }),
  avgLatencyMs: integer("avg_latency_ms"),
  p95LatencyMs: integer("p95_latency_ms"),
  status: varchar("status", { length: 50 }).default("running").notNull(), // 'running' | 'completed' | 'failed'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evalResults = pgTable("eval_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  evalRunId: uuid("eval_run_id")
    .references(() => evalRuns.id, { onDelete: "cascade" })
    .notNull(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  caseId: uuid("case_id")
    .references(() => evalCases.id, { onDelete: "cascade" })
    .notNull(),
  actualAnswer: text("actual_answer").notNull(),
  judgeScore: numeric("judge_score", { precision: 5, scale: 2 }).notNull(),
  judgeReason: text("judge_reason").notNull(),
  humanNote: text("human_note"),
  isPassed: boolean("is_passed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const selfImproveRuns = pgTable("self_improve_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  failingCasesSummary: jsonb("failing_cases_summary").notNull(),
  branchName: varchar("branch_name", { length: 255 }).notNull(),
  roundsExecuted: integer("rounds_executed").default(0).notNull(),
  maxRounds: integer("max_rounds").default(5).notNull(),
  costAccumulatedUsd: numeric("cost_accumulated_usd", { precision: 10, scale: 6 }).default("0").notNull(),
  maxBudgetUsd: numeric("max_budget_usd", { precision: 10, scale: 6 }).default("5.00").notNull(),
  status: varchar("status", { length: 50 }).default("running").notNull(), // 'running' | 'passed' | 'failed_limit' | 'merged' | 'reverted'
  prUrl: text("pr_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
