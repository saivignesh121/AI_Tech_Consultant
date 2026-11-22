import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { skills, skillVersions } from "@/db/schema/knowledge";
import {
  getSkills,
  getSkillById,
  createSkillByHand,
  draftSkillFromDescription,
  saveSkillVersion,
  rollbackSkillToVersion,
  testSkillInChat,
  type SkillExample,
} from "@/services/brain/skillsManager";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const skillId = searchParams.get("id");

    if (skillId) {
      const skill = getSkillById(tenant.businessId, skillId);
      if (!skill) {
        return NextResponse.json({ error: "Skill not found" }, { status: 404 });
      }
      return NextResponse.json({ skill });
    }

    const skillsList = getSkills(tenant.businessId);
    return NextResponse.json({ skills: skillsList });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch skills", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const {
      action = "save",
      id,
      name,
      slug,
      description,
      triggerConditions,
      stepsMarkdown,
      examples,
      changeNotes,
      versionId,
      testQuery,
      roleTone,
    } = body;

    // 1. AI Drafting Mode: "Describe it in a few words and let the agent draft it"
    if (action === "draft" || action === "draft_from_pages") {
      const skillName = name || "Custom Domain Routing Protocol";
      const skillDesc = description || "Configuring custom root domains, SSL certificates, and proxy routing";
      const drafted = draftSkillFromDescription(skillName, skillDesc);
      
      // Save into the active skills list so it immediately appears in the list
      const saved = createSkillByHand(tenant.businessId, {
        name: drafted.name,
        description: drafted.description,
        triggerConditions: drafted.triggerConditions,
        stepsMarkdown: drafted.stepsMarkdown,
        examples: drafted.examples,
      });

      return NextResponse.json({
        success: true,
        draftedSkill: saved,
        skill: saved,
        message: `SOP Skill '${saved.name}' successfully drafted and saved into Knowledge Base.`,
      });
    }

    // 2. Test Chat Beside Skill Editor: "A test chat sits beside the skill editor..."
    if (action === "test") {
      if (!testQuery) {
        return NextResponse.json({ error: "testQuery is required for test chat" }, { status: 400 });
      }
      const testResult = testSkillInChat(
        stepsMarkdown || "1. Check settings.\n2. Apply configuration.\n3. Validate with dig.",
        testQuery,
        name || "Draft Skill",
        roleTone || "Technical, step-by-step"
      );
      return NextResponse.json({ success: true, testResult });
    }

    // 3. 1-Click Rollback: "The user can go back to any older version in one click"
    if (action === "rollback") {
      if (!id || !versionId) {
        return NextResponse.json(
          { error: "Skill id and versionId are required for rollback." },
          { status: 400 }
        );
      }
      const rolledBack = rollbackSkillToVersion(tenant.businessId, id, versionId);
      return NextResponse.json({
        success: true,
        message: `Skill '${rolledBack.name}' rolled back to Version ${rolledBack.currentVersionNumber}.`,
        skill: rolledBack,
      });
    }

    // 4. Save Skill (Create or New Version)
    if (!name || !stepsMarkdown) {
      return NextResponse.json(
        { error: "Name and stepsMarkdown are required to save a skill." },
        { status: 400 }
      );
    }

    // Task 4.5: Release Gate Enforcer — Skills cannot go live if score falls below last version
    if (body.candidateScore !== undefined && body.baselineScore !== undefined) {
      const { evaluateSkillReleaseGate } = await import("@/services/eval/releaseGate");
      const gate = evaluateSkillReleaseGate(
        name,
        Number(body.candidateScore),
        Number(body.baselineScore)
      );
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: `Blocked by Release Gate: skill score (${gate.candidateScore}%) fell below baseline (${gate.baselineScore}%). Cannot go live.`,
            releaseGate: gate,
          },
          { status: 422 }
        );
      }
    }

    // If existing skill ID provided, save as a new version
    if (id) {
      const { skill, newVersion } = saveSkillVersion(tenant.businessId, id, {
        name,
        description,
        triggerConditions,
        stepsMarkdown,
        examples,
        changeNotes,
      });

      return NextResponse.json({
        success: true,
        message: `Skill '${skill.name}' updated to Version ${skill.currentVersionNumber}.`,
        skill,
        version: newVersion,
      });
    }

    // Otherwise, create fresh skill by hand
    const created = createSkillByHand(tenant.businessId, {
      name,
      slug,
      description: description || "Operational skill procedure",
      triggerConditions: triggerConditions || "Triggered on related customer queries",
      stepsMarkdown,
      examples: examples || [],
    });

    return NextResponse.json({
      success: true,
      message: `Skill '${created.name}' created as Version 1.`,
      skill: created,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process skill action", details: String(error) },
      { status: 500 }
    );
  }
}
