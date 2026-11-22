import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { prompts, promptVersions } from "@/db/schema/prompts";
import { DEFAULT_PROMPTS, validatePromptVariables } from "@/services/chat/prompts";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    // Fetch existing prompts for this business
    let promptList = await db
      .select()
      .from(prompts)
      .where(eq(prompts.businessId, tenant.businessId));

    // Ensure all DEFAULT_PROMPTS exist for this business
    for (const dp of DEFAULT_PROMPTS) {
      const existing = promptList.find((p) => p.key === dp.key);
      if (!existing) {
        const [insertedPrompt] = await db
          .insert(prompts)
          .values({
            businessId: tenant.businessId,
            key: dp.key,
            description: dp.description,
          })
          .returning();

        const [initialVersion] = await db
          .insert(promptVersions)
          .values({
            promptId: insertedPrompt.id,
            businessId: tenant.businessId,
            versionNumber: 1,
            templateText: dp.templateText,
            variables: dp.requiredVariables,
            changeSummary: "Initial production baseline",
            createdBy: tenant.userId,
          })
          .returning();

        await db
          .update(prompts)
          .set({ currentVersionId: initialVersion.id })
          .where(eq(prompts.id, insertedPrompt.id));
      }
    }

    // Refresh list if any were inserted
    promptList = await db
      .select()
      .from(prompts)
      .where(eq(prompts.businessId, tenant.businessId));

    // Now gather versions for each prompt
    const fullPrompts = await Promise.all(
      promptList.map(async (p) => {
        const versions = await db
          .select()
          .from(promptVersions)
          .where(eq(promptVersions.promptId, p.id))
          .orderBy(desc(promptVersions.versionNumber));

        const currentVersion = versions.find((v) => v.id === p.currentVersionId) || versions[0];
        const defaultDef = DEFAULT_PROMPTS.find((dp) => dp.key === p.key);

        return {
          id: p.id,
          key: p.key,
          description: p.description,
          currentVersionId: p.currentVersionId,
          requiredVariables: defaultDef?.requiredVariables || [],
          defaultTemplateText: defaultDef?.templateText || "",
          currentVersion: currentVersion
            ? {
                id: currentVersion.id,
                versionNumber: currentVersion.versionNumber,
                templateText: currentVersion.templateText,
                variables: currentVersion.variables,
                changeSummary: currentVersion.changeSummary,
                createdAt: currentVersion.createdAt,
              }
            : null,
          versions: versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            templateText: v.templateText,
            variables: v.variables,
            changeSummary: v.changeSummary,
            createdAt: v.createdAt,
          })),
        };
      })
    );

    return NextResponse.json({ prompts: fullPrompts });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch prompts", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { promptId, key, templateText, changeSummary } = body;

    if (!templateText) {
      return NextResponse.json({ error: "templateText is required" }, { status: 400 });
    }

    // Identify required variables from default schema
    const defaultDef = DEFAULT_PROMPTS.find((dp) => dp.key === key);
    const requiredVars = defaultDef ? defaultDef.requiredVariables : [];

    // Real-time validation warning / blocker
    const validation = validatePromptVariables(templateText, requiredVars);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Variable validation failed. Missing required template variables.",
          missingVariables: validation.missingVariables,
          requiredVariables: requiredVars,
        },
        { status: 400 }
      );
    }

    // Task 4.5: Release Gate Enforcer — Prompts cannot go live if score falls below last version
    if (body.candidateScore !== undefined && body.baselineScore !== undefined) {
      const { evaluatePromptReleaseGate } = await import("@/services/eval/releaseGate");
      const gate = evaluatePromptReleaseGate(
        key || "prompt_template",
        Number(body.candidateScore),
        Number(body.baselineScore)
      );
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: `Blocked by Release Gate: prompt score (${gate.candidateScore}%) fell below baseline (${gate.baselineScore}%). Cannot go live.`,
            releaseGate: gate,
          },
          { status: 422 }
        );
      }
    }

    // Resolve target prompt record
    const isPromptUuid = typeof promptId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promptId);
    let targetPrompt = (promptId && isPromptUuid)
      ? await db
          .select()
          .from(prompts)
          .where(eq(prompts.id, promptId))
          .then((rows) => rows[0])
      : null;

    if (!targetPrompt) {
      const existing = await db
        .select()
        .from(prompts)
        .where(eq(prompts.businessId, tenant.businessId))
        .then((rows) => rows.find((r) => r.key === key));

      if (existing) {
        targetPrompt = existing;
      } else {
        const [inserted] = await db
          .insert(prompts)
          .values({
            businessId: tenant.businessId,
            key: key || "custom_prompt",
            description: defaultDef?.description || "Custom system prompt",
          })
          .returning();
        targetPrompt = inserted;
      }
    }

    // Find latest version number
    const existingVersions = await db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.promptId, targetPrompt.id))
      .orderBy(desc(promptVersions.versionNumber));

    const nextVersionNumber = existingVersions.length > 0 ? existingVersions[0].versionNumber + 1 : 1;

    // Insert new version
    const [newVersion] = await db
      .insert(promptVersions)
      .values({
        promptId: targetPrompt.id,
        businessId: tenant.businessId,
        versionNumber: nextVersionNumber,
        templateText,
        variables: requiredVars,
        changeSummary: changeSummary || `Updated to version ${nextVersionNumber}`,
        createdBy: tenant.userId,
      })
      .returning();

    // Update active version
    await db
      .update(prompts)
      .set({ currentVersionId: newVersion.id })
      .where(eq(prompts.id, targetPrompt.id));

    return NextResponse.json({
      success: true,
      promptId: targetPrompt.id,
      newVersion: {
        id: newVersion.id,
        versionNumber: newVersion.versionNumber,
        changeSummary: newVersion.changeSummary,
        createdAt: newVersion.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save prompt version", details: String(error) },
      { status: 500 }
    );
  }
}
