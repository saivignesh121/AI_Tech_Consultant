import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, type TenantContext } from "@/lib/auth";
import { db } from "@/db";
import { apiConnections } from "@/db/schema/business";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { validateKey, type KeyProvider } from "@/services/ai/validateKey";
import { allowConnectionMutation } from "@/services/ai/rateLimit";
import { and, eq } from "drizzle-orm";

const PROVIDERS: KeyProvider[] = ["anthropic", "gemini"];

function normalizeProvider(value: unknown): KeyProvider | null {
  if (value === "claude" || value === "anthropic") return "anthropic";
  if (value === "gemini") return "gemini";
  return null;
}

function isAdmin(tenant: TenantContext): boolean {
  return tenant.userRole === "owner" || tenant.userRole === "admin";
}

function logFailure(workspaceId: string, provider: string): void {
  console.error("[connections]", workspaceId, provider, "error");
}

export async function GET() {
  let workspaceId = "unknown";
  try {
    const tenant = await getTenantContext();
    workspaceId = tenant.businessId;
    const rows = await db
      .select()
      .from(apiConnections)
      .where(eq(apiConnections.workspaceId, tenant.businessId));

    const connections = PROVIDERS.map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      return {
        provider,
        connected: Boolean(row),
        last4: row?.last4 ?? null,
        status: row?.status ?? "unchecked",
        validatedAt: row?.validatedAt ?? null,
      };
    });

    return NextResponse.json({ success: true, connections });
  } catch {
    logFailure(workspaceId, "read");
    return NextResponse.json({ error: "Could not read connections" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let provider = "unknown";
  let workspaceId = "unknown";
  try {
    const tenant = await getTenantContext();
    workspaceId = tenant.businessId;
    if (!isAdmin(tenant)) {
      return NextResponse.json(
        { success: false, error: "Only an owner or admin can manage AI keys." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const normalized = normalizeProvider(body.provider);
    if (!normalized || typeof body.apiKey !== "string" || !body.apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: "A supported provider and API key are required." },
        { status: 400 }
      );
    }
    provider = normalized;

    const rateLimit = await allowConnectionMutation(tenant.userId, tenant.businessId);
    if (!rateLimit.allowed) {
      const message =
        rateLimit.reason === "unavailable"
          ? "Rate limiting is unavailable. Please try again later."
          : "Too many connection requests. Try again later.";
      return NextResponse.json({ success: false, error: message }, { status: 429 });
    }

    const validation = await validateKey(normalized, body.apiKey);
    if (!validation.ok) {
      const message =
        validation.status === "rejected"
          ? "Your AI key was rejected. Update it in Settings."
          : "Could not validate the AI key. Please try again.";
      return NextResponse.json(
        { success: false, provider, error: message },
        { status: validation.status === "rejected" ? 400 : 502 }
      );
    }

    const envelope = encryptSecret(body.apiKey);
    const status = validation.status === "rate_limited" ? "unchecked" : "active";
    const values = {
      workspaceId: tenant.businessId,
      provider,
      keyVersion: envelope.keyVersion,
      iv: envelope.iv,
      authTag: envelope.authTag,
      ciphertext: envelope.ciphertext,
      last4: envelope.last4,
      status,
      validatedAt: new Date(),
      createdBy: tenant.userId,
      updatedAt: new Date(),
      encryptedApiKey: null,
    };

    await db
      .insert(apiConnections)
      .values(values)
      .onConflictDoUpdate({
        target: [apiConnections.workspaceId, apiConnections.provider],
        set: values,
      });

    return NextResponse.json({
      success: true,
      provider,
      last4: envelope.last4,
      status,
      ...(validation.warning ? { warning: validation.warning } : {}),
    });
  } catch {
    logFailure(workspaceId, provider);
    return NextResponse.json(
      { success: false, error: "Could not save the AI key." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  let provider = "unknown";
  let workspaceId = "unknown";
  try {
    const tenant = await getTenantContext();
    workspaceId = tenant.businessId;
    if (!isAdmin(tenant)) {
      return NextResponse.json(
        { success: false, error: "Only an owner or admin can manage AI keys." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const normalized = normalizeProvider(body.provider);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: "A supported provider is required." },
        { status: 400 }
      );
    }
    provider = normalized;

    const rateLimit = await allowConnectionMutation(tenant.userId, tenant.businessId);
    if (!rateLimit.allowed) {
      const message =
        rateLimit.reason === "unavailable"
          ? "Rate limiting is unavailable. Please try again later."
          : "Too many connection requests. Try again later.";
      return NextResponse.json({ success: false, error: message }, { status: 429 });
    }

    const [row] = await db
      .select()
      .from(apiConnections)
      .where(
        and(
          eq(apiConnections.workspaceId, tenant.businessId),
          eq(apiConnections.provider, provider)
        )
      )
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "No key configured for this provider." },
        { status: 404 }
      );
    }

    const key = row.ciphertext
      ? decryptSecret({
          keyVersion: row.keyVersion,
          iv: row.iv ?? "",
          authTag: row.authTag ?? "",
          ciphertext: row.ciphertext,
          last4: row.last4 ?? "",
        })
      : decryptSecret(row.encryptedApiKey ?? "");

    const validation = await validateKey(normalized, key);
    const status =
      validation.status === "rejected"
        ? "rejected"
        : validation.ok
          ? "active"
          : "unchecked";

    await db
      .update(apiConnections)
      .set({ status, validatedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(apiConnections.workspaceId, tenant.businessId),
          eq(apiConnections.provider, provider)
        )
      );

    return NextResponse.json({ success: validation.ok, provider, status });
  } catch {
    logFailure(workspaceId, provider);
    return NextResponse.json(
      { success: false, error: "Could not retest the AI key." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  let provider = "unknown";
  let workspaceId = "unknown";
  try {
    const tenant = await getTenantContext();
    workspaceId = tenant.businessId;
    if (!isAdmin(tenant)) {
      return NextResponse.json(
        { success: false, error: "Only an owner or admin can manage AI keys." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const normalized = normalizeProvider(body.provider);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: "A supported provider is required." },
        { status: 400 }
      );
    }
    provider = normalized;

    await db
      .delete(apiConnections)
      .where(
        and(
          eq(apiConnections.workspaceId, tenant.businessId),
          eq(apiConnections.provider, provider)
        )
      );

    return NextResponse.json({ success: true, provider });
  } catch {
    logFailure(workspaceId, provider);
    return NextResponse.json(
      { success: false, error: "Could not remove the AI key." },
      { status: 500 }
    );
  }
}
