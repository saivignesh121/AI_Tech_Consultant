import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { businesses, users } from "./business";
import { agentRoles, promptVersions } from "./prompts";

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  roleId: uuid("role_id").references(() => agentRoles.id, { onDelete: "set null" }),
  mode: varchar("mode", { length: 50 }).default("ask").notNull(), // 'ask' | 'teach'
  title: varchar("title", { length: 255 }).default("New Consultation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => chatSessions.id, { onDelete: "cascade" })
    .notNull(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  sender: varchar("sender", { length: 50 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Array<{ id: string; type: string; title: string; url?: string; snippet: string }>>().default([]).notNull(),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  escalationReason: varchar("escalation_reason", { length: 255 }),
  isResolved: boolean("is_resolved").default(false).notNull(),
  expertReply: text("expert_reply"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatTraces = pgTable("chat_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .references(() => chatMessages.id, { onDelete: "cascade" })
    .notNull(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  modelId: varchar("model_id", { length: 100 }).notNull(),
  promptVersionId: uuid("prompt_version_id").references(() => promptVersions.id, { onDelete: "set null" }),
  roleId: uuid("role_id").references(() => agentRoles.id, { onDelete: "set null" }),
  knowledgeUsed: jsonb("knowledge_used").$type<string[]>().default([]).notNull(),
  skillsUsed: jsonb("skills_used").$type<string[]>().default([]).notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cachedTokens: integer("cached_tokens").default(0).notNull(),
  durationMs: integer("duration_ms").notNull(),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  chatMessageId: uuid("chat_message_id")
    .references(() => chatMessages.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  lessonMarkdown: text("lesson_markdown").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 2 }),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
