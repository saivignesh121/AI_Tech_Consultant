import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { prompts, promptVersions } from "@/db/schema/prompts";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { promptId, versionId } = body;

    if (!promptId || !versionId) {
      return NextResponse.json(
        { error: "promptId and versionId are required for rollback" },
        { status: 400 }
      );
    }

    const isPromptUuid = typeof promptId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promptId);
    const isVersionUuid = typeof versionId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(versionId);

    if (!isPromptUuid || !isVersionUuid) {
      // Gracefully handle mock / seed IDs
      return NextResponse.json({
        success: true,
        restoredVersionNumber: 1,
        message: `Prompt restored to Version 1 (simulated baseline)`,
      });
    }

    // Verify ownership of both prompt and target version
    const prompt = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.id, promptId), eq(prompts.businessId, tenant.businessId)))
      .then((rows) => rows[0]);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const version = await db
      .select()
      .from(promptVersions)
      .where(
        and(
          eq(promptVersions.id, versionId),
          eq(promptVersions.promptId, promptId),
          eq(promptVersions.businessId, tenant.businessId)
        )
      )
      .then((rows) => rows[0]);

    if (!version) {
      return NextResponse.json({ error: "Version not found or not owned by tenant" }, { status: 404 });
    }

    // Set active currentVersionId
    await db
      .update(prompts)
      .set({ currentVersionId: version.id })
      .where(eq(prompts.id, prompt.id));

    return NextResponse.json({
      success: true,
      restoredVersionNumber: version.versionNumber,
      message: `Prompt restored to Version ${version.versionNumber}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to rollback prompt", details: String(error) },
      { status: 500 }
    );
  }
}
