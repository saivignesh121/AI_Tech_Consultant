import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { businesses, users } from "./business";

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    key: varchar("key", { length: 100 }).notNull(), // 'master_system' | 'qa_answer' | 'write_lesson' | 'judge_eval' | 'job_tagger'
    description: text("description"),
    currentVersionId: uuid("current_version_id"),
  },
  (table) => [
    uniqueIndex("uq_prompts_business_key").on(table.businessId, table.key),
  ]
);

export const promptVersions = pgTable(
  "prompt_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promptId: uuid("prompt_id")
      .references(() => prompts.id, { onDelete: "cascade" })
      .notNull(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    versionNumber: integer("version_number").notNull(),
    templateText: text("template_text").notNull(),
    variables: jsonb("variables").$type<string[]>().default([]).notNull(),
    changeSummary: text("change_summary"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_prompt_versions_num").on(table.promptId, table.versionNumber),
  ]
);

export const agentRoles = pgTable(
  "agent_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(), // 'support-engineer' | 'support-executive' | 'ai-consultant'
    goal: text("goal").notNull(),
    tone: varchar("tone", { length: 100 }).notNull(),
    systemPrompt: text("system_prompt").notNull(),
    modelId: varchar("model_id", { length: 100 }).default("claude-sonnet-5.5").notNull(),
    allowedSkills: jsonb("allowed_skills").$type<string[]>().default([]).notNull(),
    knowledgeSources: jsonb("knowledge_sources").$type<string[]>().default([]).notNull(),
    handoverRule: text("handover_rule").default("Escalate to human expert on angry customer sentiment > 0.8, legal threats, or refund disputes.").notNull(),
    isBuiltin: boolean("is_builtin").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_agent_roles_business_slug").on(table.businessId, table.slug),
  ]
);
