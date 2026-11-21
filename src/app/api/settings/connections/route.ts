import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { apiConnections } from "@/db/schema/business";
import { encryptCredential, decryptCredential, maskApiKey } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";

const SUPPORTED_PROVIDERS = ["claude", "gemini", "openrouter", "ollama", "google"];

export async function GET() {
  try {
    const tenant = await getTenantContext();
    const rows = await db
      .select()
      .from(apiConnections)
      .where(eq(apiConnections.businessId, tenant.businessId));

    const connections = SUPPORTED_PROVIDERS.map((provider) => {
      const match = rows.find((r) => r.provider === provider);
      let maskedKey: string | null = null;
      if (match?.encryptedApiKey) {
        try {
          const rawKey = decryptCredential(match.encryptedApiKey);
          maskedKey = maskApiKey(rawKey);
        } catch {
          maskedKey = "••••••••••••••••";
        }
      }

      return {
        id: match?.id ?? null,
        provider,
        endpointUrl: match?.endpointUrl ?? (provider === "ollama" ? "http://localhost:11434" : null),
        status: match?.status ?? "untested",
        maskedApiKey: maskedKey,
        hasKey: Boolean(match?.encryptedApiKey),
        lastTestedAt: match?.lastTestedAt ?? null,
      };
    });

    return NextResponse.json({ connections });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve connections", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { provider, apiKey, endpointUrl } = body;

    if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${SUPPORTED_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(apiConnections)
      .where(
        and(
          eq(apiConnections.businessId, tenant.businessId),
          eq(apiConnections.provider, provider)
        )
      )
      .limit(1);

    let encryptedKey: string | null | undefined = undefined;
    if (apiKey !== undefined) {
      encryptedKey = apiKey ? encryptCredential(apiKey) : null;
    }

    if (existing.length > 0) {
      const updateData: Record<string, unknown> = {};
      if (encryptedKey !== undefined) updateData.encryptedApiKey = encryptedKey;
      if (endpointUrl !== undefined) updateData.endpointUrl = endpointUrl;
      updateData.status = "untested";

      await db
        .update(apiConnections)
        .set(updateData)
        .where(eq(apiConnections.id, existing[0].id));
    } else {
      await db.insert(apiConnections).values({
        businessId: tenant.businessId,
        provider,
        encryptedApiKey: encryptedKey ?? null,
        endpointUrl: endpointUrl ?? (provider === "ollama" ? "http://localhost:11434" : null),
        status: "untested",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Connection for ${provider} saved securely.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save connection", details: String(error) },
      { status: 500 }
    );
  }
}
