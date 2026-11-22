import { pgTable, uuid, varchar, text, integer, char, timestamp, boolean, jsonb, vector, uniqueIndex, index, type AnyPgColumn } from "drizzle-orm/pg-core";
import { businesses, users } from "./business";

export const knowledgeSources = pgTable("knowledge_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // 'sitemap' | 'page_url' | 'document'
  rootUrl: text("root_url").notNull(),
  parentSourceId: uuid("parent_source_id").references((): AnyPgColumn => knowledgeSources.id, { onDelete: "cascade" }),
  crawlSchedule: varchar("crawl_schedule", { length: 50 }).default("daily").notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
});

export const knowledgePages = pgTable(
  "knowledge_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url").notNull(),
    title: text("title"),
    contentHash: char("content_hash", { length: 64 }),
    healthStatus: varchar("health_status", { length: 50 }).default("active").notNull(), // 'active' | 'watch' | 'quarantined' | 'archived'
    consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
    httpStatus: integer("http_status"),
    redirectUrl: text("redirect_url"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_kp_business_url").on(table.businessId, table.url),
    index("idx_kp_health").on(table.businessId, table.healthStatus),
  ]
);

export const sourcePageLinks = pgTable(
  "source_page_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    sourceId: uuid("source_id")
      .references(() => knowledgeSources.id, { onDelete: "cascade" })
      .notNull(),
    pageId: uuid("page_id")
      .references(() => knowledgePages.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    uniqueIndex("uq_source_page_links").on(table.sourceId, table.pageId),
  ]
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    pageId: uuid("page_id")
      .references(() => knowledgePages.id, { onDelete: "cascade" })
      .notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    heading: text("heading"),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    imageCaption: text("image_caption"),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    index("idx_kc_business_page").on(table.businessId, table.pageId),
  ]
);

export const instructions = pgTable("instructions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  ruleText: text("rule_text").notNull(),
  appliesToRoles: jsonb("applies_to_roles").$type<string[]>().default(["all"]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").notNull(),
    triggerConditions: text("trigger_conditions").notNull(),
    stepsMarkdown: text("steps_markdown").notNull(),
    examples: jsonb("examples").$type<Array<{ question: string; answer: string }>>().default([]).notNull(),
    currentVersionId: uuid("current_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_skills_business_slug").on(table.businessId, table.slug),
  ]
);

export const skillVersions = pgTable(
  "skill_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .references(() => skills.id, { onDelete: "cascade" })
      .notNull(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    versionNumber: integer("version_number").notNull(),
    stepsMarkdown: text("steps_markdown").notNull(),
    changeNotes: text("change_notes"),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_skill_versions_num").on(table.skillId, table.versionNumber),
  ]
);

export const emailThreads = pgTable(
  "email_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    gmailThreadId: varchar("gmail_thread_id", { length: 255 }).notNull(),
    subject: text("subject"),
    snippet: text("snippet"),
    notes: text("notes"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_email_threads_gmail").on(table.businessId, table.gmailThreadId),
  ]
);

export const emailMessages = pgTable("email_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  threadId: uuid("thread_id")
    .references(() => emailThreads.id, { onDelete: "cascade" })
    .notNull(),
  fromAddress: varchar("from_address", { length: 255 }).notNull(),
  toAddress: varchar("to_address", { length: 255 }).notNull(),
  bodyText: text("body_text").notNull(),
  notes: text("notes"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
});

/**
 * Task 2.4: Stay Fresh - Refresh Runs, Changes Audit History & Health Policies
 */
export const knowledgeRefreshRuns = pgTable(
  "knowledge_refresh_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    sourceId: uuid("source_id").references(() => knowledgeSources.id, { onDelete: "cascade" }),
    schedule: varchar("schedule", { length: 50 }).default("daily").notNull(), // 'daily' | 'weekly' | '15_days' | '30_days'
    status: varchar("status", { length: 50 }).default("completed").notNull(), // 'in_progress' | 'completed' | 'failed'
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    totalUrlsFetched: integer("total_urls_fetched").default(0).notNull(),
    pagesProcessed: integer("pages_processed").default(0).notNull(),
    pagesEmbedded: integer("pages_embedded").default(0).notNull(),
    pagesFailed: integer("pages_failed").default(0).notNull(),
    pagesPending: integer("pages_pending").default(0).notNull(),
    duplicateUrlsSkipped: integer("duplicate_urls_skipped").default(0).notNull(),
    urlsList: jsonb("urls_list").$type<
      Array<{
        url: string;
        httpStatus: number;
        healthStatus: "active" | "watch" | "quarantined" | "archived";
        consecutiveFailures: number;
        changeType: "new" | "unchanged" | "updated" | "redirected" | "missing" | "recovered";
        contentHash?: string;
        redirectUrl?: string;
        timestamp: string;
      }>
    >().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_krr_business").on(table.businessId, table.startedAt),
  ]
);

export const knowledgePageChanges = pgTable(
  "knowledge_page_changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    pageId: uuid("page_id").references(() => knowledgePages.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    changeType: varchar("change_type", { length: 50 }).notNull(), // 'created' | 'updated' | 'removed' | 'recovered' | 'quarantined' | 'archived'
    oldContentHash: char("old_content_hash", { length: 64 }),
    newContentHash: char("new_content_hash", { length: 64 }),
    diffSummary: text("diff_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_kpc_business_page").on(table.businessId, table.pageId),
    index("idx_kpc_business_created").on(table.businessId, table.createdAt),
  ]
);

export const knowledgeHealthPolicies = pgTable(
  "knowledge_health_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    failureThresholdX: integer("failure_threshold_x").default(2).notNull(), // 1 ("right away"), 2, 15, 30
    actionRule: varchar("action_rule", { length: 50 }).default("quarantine_then_archive").notNull(), // 'quarantine' | 'archive' | 'quarantine_then_archive'
    recheckSchedule: varchar("recheck_schedule", { length: 50 }).default("daily").notNull(), // 'daily' | 'weekly' | '15_days' | '30_days'
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_khp_business").on(table.businessId),
  ]
);
