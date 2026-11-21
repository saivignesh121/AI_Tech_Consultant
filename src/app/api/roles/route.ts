import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { agentRoles } from "@/db/schema/prompts";
import { BUILTIN_ROLES } from "@/services/chat/roles";
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
    const { id, name, slug, goal, tone, systemPrompt, modelId, allowedSkills } = body;

    if (!name || !goal || !tone || !systemPrompt) {
      return NextResponse.json(
        { error: "Name, goal, tone, and systemPrompt are required." },
        { status: 400 }
      );
    }

    const roleSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (id) {
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
          allowedSkills: allowedSkills || [],
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
          allowedSkills: allowedSkills || [],
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
