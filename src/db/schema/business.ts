import { pgTable, uuid, varchar, integer, timestamp, uniqueIndex, text, boolean, jsonb } from "drizzle-orm/pg-core";

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  readinessScore: integer("readiness_score").default(0).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(), // 'active' | 'suspended'
  stepModels: jsonb("step_models").$type<Record<string, string>>().default({}).notNull(),
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
    name: varchar("name", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: varchar("role", { length: 50 }).default("team").notNull(), // 'owner' | 'team' | 'expert' (compat: 'admin' | 'member')
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_users_business_email").on(table.businessId, table.email),
  ]
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 50 }).default("team").notNull(), // 'owner' | 'team' | 'expert' (compat: 'admin' | 'member')
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_memberships_user_biz").on(table.userId, table.businessId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: varchar("token", { length: 255 }).unique().notNull(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).default("member").notNull(), // 'admin' | 'member'
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const apiConnections = pgTable(
  "api_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // legacy: 'claude' | 'gemini' | 'openrouter' | 'ollama' | 'google'
    encryptedApiKey: text("encrypted_api_key"), // legacy envelope; nullable during migration
    endpointUrl: varchar("endpoint_url", { length: 255 }),
    keyVersion: varchar("key_version", { length: 50 }).default("1").notNull(),
    iv: varchar("iv", { length: 24 }),
    authTag: varchar("auth_tag", { length: 32 }),
    ciphertext: text("ciphertext"),
    last4: varchar("last4", { length: 4 }),
    status: varchar("status", { length: 50 }).default("unchecked").notNull(), // 'active' | 'rejected' | 'unchecked'
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_api_conn_workspace_provider").on(table.workspaceId, table.provider),
  ]
);

export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    otpCode: varchar("otp_code", { length: 10 }).notNull(),
    purpose: varchar("purpose", { length: 50 }).default("registration").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumed: boolean("consumed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);
