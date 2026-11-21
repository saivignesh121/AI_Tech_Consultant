import { pgTable, uuid, varchar, integer, timestamp, uniqueIndex, text } from "drizzle-orm/pg-core";

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  readinessScore: integer("readiness_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: varchar("role", { length: 50 }).default("member").notNull(), // 'owner' | 'admin' | 'member'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_users_business_email").on(table.businessId, table.email),
  ]
);

export const apiConnections = pgTable(
  "api_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // 'claude' | 'gemini' | 'openrouter' | 'ollama' | 'google'
    encryptedApiKey: text("encrypted_api_key"),
    endpointUrl: varchar("endpoint_url", { length: 255 }),
    status: varchar("status", { length: 50 }).default("untested").notNull(), // 'active' | 'error' | 'untested'
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_api_conn_business_provider").on(table.businessId, table.provider),
  ]
);
