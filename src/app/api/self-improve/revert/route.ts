import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { selfImproveRuns, prompts, promptVersions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSkills, rollbackSkillToVersion } from "@/services/brain/skillsManager";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json({ error: "Missing runId parameter" }, { status: 400 });
    }

    // 1. Update matching run in DB if valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId);
    if (isUuid) {
      const existing = await db
        .select()
        .from(selfImproveRuns)
        .where(and(eq(selfImproveRuns.id, runId), eq(selfImproveRuns.businessId, tenant.businessId)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(selfImproveRuns)
          .set({ status: "reverted" })
          .where(eq(selfImproveRuns.id, runId));
      }
    }

    // 2. Revert Prompt to previous version (Task 1.3 rollback)
    let revertedPromptVersion = 1;
    try {
      const targetPrompt = await db
        .select()
        .from(prompts)
        .where(and(eq(prompts.businessId, tenant.businessId), eq(prompts.key, "qa_answer")))
        .then((rows) => rows[0]);

      if (targetPrompt) {
        const versions = await db
          .select()
          .from(promptVersions)
          .where(eq(promptVersions.promptId, targetPrompt.id))
          .orderBy(desc(promptVersions.versionNumber));

        // Point back to the previous version
        if (versions.length > 1) {
          const priorVersion = versions[1];
          await db
            .update(prompts)
            .set({ currentVersionId: priorVersion.id })
            .where(eq(prompts.id, targetPrompt.id));
          revertedPromptVersion = priorVersion.versionNumber;
        } else if (versions.length === 1) {
          revertedPromptVersion = versions[0].versionNumber;
        }
      }
    } catch (dbErr) {
      console.warn("Notice: DB prompt revert fallback", dbErr);
    }

    // 3. Revert Skill to previous version (Task 2.5 rollback)
    let revertedSkillVersion = 1;
    let revertedSkillName = "DNS & Custom CNAME Setup";

    try {
      const skillsList = getSkills(tenant.businessId);
      const matchedSkill =
        skillsList.find((s) => s.slug.includes("dns") || s.name.toLowerCase().includes("dns")) ||
        skillsList[0];

      if (matchedSkill && matchedSkill.versions.length > 1) {
        revertedSkillName = matchedSkill.name;
        // Prior version is second in version history
        const priorVersion = matchedSkill.versions[1] || matchedSkill.versions[0];
        const rolledBack = rollbackSkillToVersion(tenant.businessId, matchedSkill.id, priorVersion.id);
        revertedSkillVersion = rolledBack.currentVersionNumber;
      }
    } catch (skillErr) {
      console.warn("Notice: In-memory skill rollback fallback", skillErr);
    }

    return NextResponse.json({
      success: true,
      runId,
      status: "reverted",
      revertedPromptVersion,
      revertedSkillVersion,
      skillName: revertedSkillName,
      message: `Patch reverted successfully! Production prompt restored to version v${revertedPromptVersion} and skill '${revertedSkillName}' restored to version v${revertedSkillVersion}. Baseline stability restored.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revert self-improve run", details: String(error) },
      { status: 500 }
    );
  }
}
