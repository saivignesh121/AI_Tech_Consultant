import { db } from "./index";
import { businesses, users, memberships, apiConnections } from "./schema/business";
import { prompts, promptVersions, agentRoles } from "./schema/prompts";
import { modelCallLogs } from "./schema/telemetry";
import { DEFAULT_PROMPTS } from "../services/chat/prompts";
import { BUILTIN_ROLES } from "../services/chat/roles";
import { encryptCredential } from "../lib/crypto";
import { DEMO_BUSINESSES, hashPassword } from "../lib/auth";
import { eq, and } from "drizzle-orm";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Businesses
  for (const [slug, tenant] of Object.entries(DEMO_BUSINESSES)) {
    const existingBiz = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, tenant.businessId))
      .limit(1);

    if (existingBiz.length === 0) {
      await db.insert(businesses).values({
        id: tenant.businessId,
        name: tenant.businessName,
        slug: tenant.businessSlug,
        readinessScore: slug === "acme-corp" ? 92 : 65,
      });
      console.log(`✓ Inserted business: ${tenant.businessName}`);
    }

    // 2. Seed Users & Memberships
    const defaultPassword = slug === "acme-corp" ? "AcmePass123!" : "BetaPass123!";
    const passwordHash = await hashPassword(defaultPassword);
    const userName = slug === "acme-corp" ? "Alex Turner" : "Sarah Chen";

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, tenant.userId))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: tenant.userId,
        businessId: tenant.businessId,
        email: tenant.userEmail,
        name: userName,
        passwordHash,
        role: tenant.userRole,
      });
      console.log(`✓ Inserted user: ${tenant.userEmail}`);
    } else {
      await db
        .update(users)
        .set({ passwordHash, name: userName })
        .where(eq(users.id, tenant.userId));
    }

    // Seed Owner Membership
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, tenant.userId),
          eq(memberships.businessId, tenant.businessId)
        )
      )
      .limit(1);

    if (existingMembership.length === 0) {
      await db.insert(memberships).values({
        userId: tenant.userId,
        businessId: tenant.businessId,
        role: "owner",
      });
      console.log(`✓ Inserted membership: ${tenant.userEmail} -> ${tenant.businessName} (owner)`);
    }

    // 3. Seed The 5 Connections
    const defaultProviders = [
      { provider: "claude", key: "sk-ant-api03-demo-key-4217", endpoint: null },
      { provider: "gemini", key: "AIzaSyDemoKey-9843", endpoint: null },
      { provider: "openrouter", key: "sk-or-v1-demo-key-7712", endpoint: null },
      { provider: "ollama", key: null, endpoint: "http://localhost:11434" },
      { provider: "google", key: "oauth2:ya29.demo-token", endpoint: null },
    ];

    for (const p of defaultProviders) {
      const existingConn = await db
        .select()
        .from(apiConnections)
        .where(eq(apiConnections.businessId, tenant.businessId))
        .then((rows) => rows.find((r) => r.provider === p.provider));

      if (!existingConn) {
        await db.insert(apiConnections).values({
          businessId: tenant.businessId,
          provider: p.provider,
          encryptedApiKey: p.key ? encryptCredential(p.key) : null,
          endpointUrl: p.endpoint,
          status: p.provider === "claude" || p.provider === "ollama" ? "active" : "untested",
        });
      }
    }

    // 4. Seed Prompts & Prompt Versions
    for (const p of DEFAULT_PROMPTS) {
      let existingPrompt = await db
        .select()
        .from(prompts)
        .where(eq(prompts.businessId, tenant.businessId))
        .then((rows) => rows.find((r) => r.key === p.key));

      let promptId = existingPrompt?.id;

      if (!existingPrompt) {
        const [inserted] = await db
          .insert(prompts)
          .values({
            businessId: tenant.businessId,
            key: p.key,
            description: p.description,
          })
          .returning();
        promptId = inserted.id;

        const [version] = await db
          .insert(promptVersions)
          .values({
            promptId: inserted.id,
            businessId: tenant.businessId,
            versionNumber: 1,
            templateText: p.templateText,
            variables: p.requiredVariables,
            changeSummary: "Initial production baseline version",
            createdBy: tenant.userId,
          })
          .returning();

        await db
          .update(prompts)
          .set({ currentVersionId: version.id })
          .where(eq(prompts.id, inserted.id));
      }
    }

    // 5. Seed Built-in Roles
    for (const r of BUILTIN_ROLES) {
      const existingRole = await db
        .select()
        .from(agentRoles)
        .where(eq(agentRoles.businessId, tenant.businessId))
        .then((rows) => rows.find((row) => row.slug === r.slug));

      if (!existingRole) {
        await db.insert(agentRoles).values({
          businessId: tenant.businessId,
          name: r.name,
          slug: r.slug,
          goal: r.goal,
          tone: r.tone,
          systemPrompt: r.systemPrompt,
          modelId: r.modelId,
          allowedSkills: r.allowedSkills,
          isBuiltin: r.isBuiltin,
        });
      }
    }
  }

  // 5b. Seed Multi-Tenant User for testing Business Picker Flow
  const multiUserId = "cccccccc-3333-4333-8333-333333333333";
  const multiHash = await hashPassword("MultiPass123!");
  const existingMulti = await db
    .select()
    .from(users)
    .where(eq(users.id, multiUserId))
    .limit(1);

  if (existingMulti.length === 0) {
    await db.insert(users).values({
      id: multiUserId,
      businessId: DEMO_BUSINESSES["acme-corp"].businessId,
      email: "multi@consultant.com",
      name: "Morgan Lee",
      passwordHash: multiHash,
      role: "admin",
    });
    console.log("✓ Inserted multi-tenant user: multi@consultant.com");
  } else {
    await db.update(users).set({ passwordHash: multiHash, name: "Morgan Lee" }).where(eq(users.id, multiUserId));
  }

  // Memberships for multi-tenant user in Acme and Beta
  for (const [slug, role] of [["acme-corp", "admin"], ["beta-dynamics", "member"]] as const) {
    const bizId = DEMO_BUSINESSES[slug].businessId;
    const exists = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, multiUserId), eq(memberships.businessId, bizId)))
      .limit(1);

    if (exists.length === 0) {
      await db.insert(memberships).values({
        userId: multiUserId,
        businessId: bizId,
        role,
      });
      console.log(`✓ Inserted multi-tenant membership: multi@consultant.com -> ${slug} (${role})`);
    }
  }

  // 6. Seed Telemetry Logs for Acme Corp
  const acmeId = DEMO_BUSINESSES["acme-corp"].businessId;
  const existingLogs = await db
    .select()
    .from(modelCallLogs)
    .where(eq(modelCallLogs.businessId, acmeId))
    .limit(5);

  if (existingLogs.length === 0) {
    const sampleCalls = [
      {
        taskType: "write_reply",
        modelId: "claude-sonnet-5.5",
        inputTokens: 1420,
        outputTokens: 380,
        cachedReadTokens: 1200,
        durationMs: 480,
        costUsd: "0.004040",
        status: "success",
      },
      {
        taskType: "find_facts",
        modelId: "gemini-3-flash",
        inputTokens: 2100,
        outputTokens: 150,
        cachedReadTokens: 0,
        durationMs: 310,
        costUsd: "0.001500",
        status: "success",
      },
      {
        taskType: "judge_eval",
        modelId: "claude-opus-5.5",
        inputTokens: 3200,
        outputTokens: 420,
        cachedReadTokens: 2800,
        durationMs: 890,
        costUsd: "0.009520",
        status: "success",
      },
      {
        taskType: "tag_job",
        modelId: "gemma4:e4b",
        inputTokens: 450,
        outputTokens: 45,
        cachedReadTokens: 0,
        durationMs: 120,
        costUsd: "0.000000",
        status: "success",
      },
      {
        taskType: "write_reply",
        modelId: "claude-haiku-5.5",
        inputTokens: 980,
        outputTokens: 210,
        cachedReadTokens: 800,
        durationMs: 260,
        costUsd: "0.000185",
        status: "success",
      },
    ];

    for (const call of sampleCalls) {
      await db.insert(modelCallLogs).values({
        businessId: acmeId,
        ...call,
      });
    }
    console.log("✓ Seeded sample model call telemetry for Acme Corporation");
  }

  console.log("🎉 Seeding complete!");
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
