import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { instructions } from "@/db/schema/knowledge";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    let list = await db
      .select()
      .from(instructions)
      .where(eq(instructions.businessId, tenant.businessId))
      .orderBy(desc(instructions.createdAt));

    // Seed default instructions if empty
    if (list.length === 0) {
      const defaultRules = [
        {
          title: "Refund Escalation Policy",
          ruleText: "Never promise a refund. Send every refund question to the Billing team for human approval.",
          appliesToRoles: ["all"],
          isActive: true,
        },
        {
          title: "Technical Command Attribution",
          ruleText: "Include exact CLI commands (e.g. dig, curl) and link to verified Knowledge Brain documentation.",
          appliesToRoles: ["support-engineer"],
          isActive: true,
        },
        {
          title: "Warm Greeting & Simplicity",
          ruleText: "Greet customers warmly with friendly phrasing, avoid technical jargon, and check if they need more help.",
          appliesToRoles: ["support-executive"],
          isActive: true,
        },
        {
          title: "Solution & Quote Steering",
          ruleText: "Highlight ROI and scalable SaaS benefits, steering the discussion toward an implementation quote.",
          appliesToRoles: ["ai-consultant"],
          isActive: true,
        },
      ];

      for (const rule of defaultRules) {
        await db.insert(instructions).values({
          businessId: tenant.businessId,
          title: rule.title,
          ruleText: rule.ruleText,
          appliesToRoles: rule.appliesToRoles,
          isActive: rule.isActive,
        });
      }

      list = await db
        .select()
        .from(instructions)
        .where(eq(instructions.businessId, tenant.businessId))
        .orderBy(desc(instructions.createdAt));
    }

    return NextResponse.json({ instructions: list });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch instructions", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { id, title, ruleText, appliesToRoles = ["all"], isActive = true } = body;

    if (!title || !ruleText) {
      return NextResponse.json({ error: "Title and ruleText are required." }, { status: 400 });
    }

    const isUuid = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (id && isUuid) {
      const [updated] = await db
        .update(instructions)
        .set({
          title,
          ruleText,
          appliesToRoles: Array.isArray(appliesToRoles) ? appliesToRoles : ["all"],
          isActive: Boolean(isActive),
        })
        .where(and(eq(instructions.id, id), eq(instructions.businessId, tenant.businessId)))
        .returning();

      return NextResponse.json({ success: true, instruction: updated, message: "Instruction updated." });
    } else {
      const [inserted] = await db
        .insert(instructions)
        .values({
          businessId: tenant.businessId,
          title,
          ruleText,
          appliesToRoles: Array.isArray(appliesToRoles) ? appliesToRoles : ["all"],
          isActive: Boolean(isActive),
        })
        .returning();

      return NextResponse.json({ success: true, instruction: inserted, message: "Instruction created." });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save instruction", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Instruction ID is required" }, { status: 400 });
    }

    await db
      .delete(instructions)
      .where(and(eq(instructions.id, id), eq(instructions.businessId, tenant.businessId)));

    return NextResponse.json({ success: true, message: "Instruction deleted." });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete instruction", details: String(error) },
      { status: 500 }
    );
  }
}
