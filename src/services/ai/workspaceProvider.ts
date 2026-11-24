import { db } from "@/db";
import { apiConnections } from "@/db/schema/business";
import { decryptSecret } from "@/lib/crypto";
import { and, eq } from "drizzle-orm";

export type WorkspaceProvider = "anthropic" | "gemini";

export class AiKeyMissingError extends Error {
  constructor() {
    super("Add your AI key in Settings.");
    this.name = "AiKeyMissingError";
  }
}

export class AiKeyRejectedError extends Error {
  constructor() {
    super("Your AI key was rejected. Update it in Settings.");
    this.name = "AiKeyRejectedError";
  }
}

export class AiProviderError extends Error {
  constructor() {
    super("The AI provider is unavailable. Please try again.");
    this.name = "AiProviderError";
  }
}

export class AiRateLimitedError extends Error {
  constructor() {
    super("The AI provider is rate limited. Please try again later.");
    this.name = "AiRateLimitedError";
  }
}

/** Load and decrypt the active key for exactly one workspace/provider. */
export async function getWorkspaceKey(
  workspaceId: string,
  provider: WorkspaceProvider
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(apiConnections)
    .where(
      and(
        eq(apiConnections.workspaceId, workspaceId),
        eq(apiConnections.provider, provider),
        eq(apiConnections.status, "active")
      )
    )
    .limit(1);

  if (!row) return null;
  if (row.ciphertext) {
    return decryptSecret({
      keyVersion: row.keyVersion,
      iv: row.iv ?? "",
      authTag: row.authTag ?? "",
      ciphertext: row.ciphertext,
      last4: row.last4 ?? "",
    });
  }
  if (row.encryptedApiKey) return decryptSecret(row.encryptedApiKey);
  return null;
}

export async function markKeyRejected(
  workspaceId: string,
  provider: WorkspaceProvider
): Promise<void> {
  await db
    .update(apiConnections)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(
      and(
        eq(apiConnections.workspaceId, workspaceId),
        eq(apiConnections.provider, provider)
      )
    );
}

/**
 * Call the provider with the workspace's own key. The key is scoped to the
 * workspace, held only in memory for the call, then dropped. No platform key
 * and no key from another workspace is ever used.
 */
export async function callWorkspaceModel(
  workspaceId: string,
  provider: WorkspaceProvider,
  prompt: string
): Promise<string> {
  let key: string | null = await getWorkspaceKey(workspaceId, provider);
  if (!key) throw new AiKeyMissingError();

  const url =
    provider === "anthropic"
      ? "https://api.anthropic.com/v1/messages"
      : "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  const headers: Record<string, string> =
    provider === "anthropic"
      ? { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }
      : { "x-goog-api-key": key, "content-type": "application/json" };
  const body =
    provider === "anthropic"
      ? JSON.stringify({
          model: "claude-sonnet-5.5",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        })
      : JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      await markKeyRejected(workspaceId, provider);
      throw new AiKeyRejectedError();
    }
    if (res.status === 429) throw new AiRateLimitedError();
    if (!res.ok) throw new AiProviderError();

    const data = (await res.json()) as any;
    return provider === "anthropic"
      ? (data?.content?.[0]?.text ?? "")
      : (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  } catch (err) {
    if (err instanceof AiKeyRejectedError || err instanceof AiRateLimitedError) throw err;
    throw new AiProviderError();
  } finally {
    // Drop the in-memory key reference as soon as the call finishes.
    key = null;
  }
}
