import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  getInstructions,
  createInstruction,
  updateInstruction,
  toggleInstruction,
  deleteInstruction,
} from "@/services/brain/instructionsManager";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const roleSlug = searchParams.get("role");

    const list = getInstructions(tenant.businessId);

    if (roleSlug) {
      const filtered = list.filter(
        (i) => i.isActive && (i.appliesToRoles.includes("all") || i.appliesToRoles.includes(roleSlug))
      );
      return NextResponse.json({ instructions: filtered });
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

    if (id) {
      const updated = updateInstruction(tenant.businessId, id, {
        title,
        ruleText,
        appliesToRoles: Array.isArray(appliesToRoles) ? appliesToRoles : ["all"],
        isActive: Boolean(isActive),
      });

      return NextResponse.json({
        success: true,
        instruction: updated,
        message: `Instruction '${updated.title}' updated.`,
      });
    }

    const created = createInstruction(tenant.businessId, {
      title,
      ruleText,
      appliesToRoles: Array.isArray(appliesToRoles) ? appliesToRoles : ["all"],
      isActive: Boolean(isActive),
    });

    return NextResponse.json({
      success: true,
      instruction: created,
      message: `Instruction '${created.title}' created successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save instruction", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "id and isActive boolean are required" }, { status: 400 });
    }

    const toggled = toggleInstruction(tenant.businessId, id, isActive);

    return NextResponse.json({
      success: true,
      instruction: toggled,
      message: `Instruction rule '${toggled.title}' switched ${isActive ? "ON" : "OFF"}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to toggle instruction", details: String(error) },
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

    const deleted = deleteInstruction(tenant.businessId, id);

    return NextResponse.json({
      success: true,
      message: deleted ? "Instruction deleted." : "Instruction not found or already deleted.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete instruction", details: String(error) },
      { status: 500 }
    );
  }
}
