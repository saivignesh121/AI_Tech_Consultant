import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { agentRoles } from "@/db/schema/prompts";
import { BUILTIN_ROLES, canRoleSharePrice } from "@/services/chat/roles";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    let roles = await db
      .select()
      .from(agentRoles)
      .where(eq(agentRoles.businessId, tenant.businessId));

    // Seed defaults if empty
    if (roles.length === 0) {
      for (const br of BUILTIN_ROLES) {
        await db.insert(agentRoles).values({
          businessId: tenant.businessId,
          name: br.name,
          slug: br.slug,
          goal: br.goal,
          tone: br.tone,
          systemPrompt: br.systemPrompt,
          modelId: br.modelId,
          allowedSkills: br.allowedSkills,
          knowledgeSources: br.knowledgeSources,
          handoverRule: br.handoverRule,
          isBuiltin: br.isBuiltin,
        });
      }

      roles = await db
        .select()
        .from(agentRoles)
        .where(eq(agentRoles.businessId, tenant.businessId));
    }

    return NextResponse.json({ roles });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agent roles", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { id, name, slug, goal, tone, systemPrompt, modelId, allowedSkills, knowledgeSources, handoverRule } = body;

    if (!name || !goal || !tone || !systemPrompt) {
      return NextResponse.json(
        { error: "Name, goal, tone, and systemPrompt are required." },
        { status: 400 }
      );
    }

    const roleSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Enforce Rule: Only AI Consultant can share prices & quotes
    let sanitizedSkills: string[] = Array.isArray(allowedSkills) ? allowedSkills : [];
    if (sanitizedSkills.includes("share_price") && !canRoleSharePrice(roleSlug)) {
      sanitizedSkills = sanitizedSkills.filter((s) => s !== "share_price");
    }

    const sanitizedSources: string[] = Array.isArray(knowledgeSources) ? knowledgeSources : ["sitemaps", "technical_docs"];
    const sanitizedRule: string = handoverRule || "Escalate to human expert on angry customer sentiment > 0.8, legal threats, or refund disputes.";

    const isUuid = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Task 4.5: Release Gate Enforcer — Roles cannot go live if score falls below last version
    if (body.candidateScore !== undefined && body.baselineScore !== undefined) {
      const { evaluateRoleReleaseGate } = await import("@/services/eval/releaseGate");
      const gate = evaluateRoleReleaseGate(
        name,
        Number(body.candidateScore),
        Number(body.baselineScore)
      );
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: `Blocked by Release Gate: role score (${gate.candidateScore}%) fell below baseline (${gate.baselineScore}%). Cannot go live.`,
            releaseGate: gate,
          },
          { status: 422 }
        );
      }
    }

    if (id && isUuid) {
      // Update existing role
      const existing = await db
        .select()
        .from(agentRoles)
        .where(and(eq(agentRoles.id, id), eq(agentRoles.businessId, tenant.businessId)))
        .then((rows) => rows[0]);

      if (!existing) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      await db
        .update(agentRoles)
        .set({
          name,
          goal,
          tone,
          systemPrompt,
          modelId: modelId || "claude-sonnet-5.5",
          allowedSkills: sanitizedSkills,
          knowledgeSources: sanitizedSources,
          handoverRule: sanitizedRule,
        })
        .where(eq(agentRoles.id, id));

      return NextResponse.json({ success: true, roleId: id, message: `Role '${name}' updated.` });
    } else {
      // Create new role
      const [inserted] = await db
        .insert(agentRoles)
        .values({
          businessId: tenant.businessId,
          name,
          slug: roleSlug,
          goal,
          tone,
          systemPrompt,
          modelId: modelId || "claude-sonnet-5.5",
          allowedSkills: sanitizedSkills,
          knowledgeSources: sanitizedSources,
          handoverRule: sanitizedRule,
          isBuiltin: false,
        })
        .returning();

      return NextResponse.json({ success: true, role: inserted, message: `Role '${name}' created.` });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save agent role", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("id");

    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const role = await db
      .select()
      .from(agentRoles)
      .where(and(eq(agentRoles.id, roleId), eq(agentRoles.businessId, tenant.businessId)))
      .then((rows) => rows[0]);

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (role.isBuiltin) {
      return NextResponse.json(
        { error: "Built-in roles (Support Engineer, Support Executive, AI Consultant) cannot be deleted." },
        { status: 403 }
      );
    }

    await db.delete(agentRoles).where(eq(agentRoles.id, roleId));

    return NextResponse.json({ success: true, message: `Role '${role.name}' deleted.` });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete role", details: String(error) },
      { status: 500 }
    );
  }
}
