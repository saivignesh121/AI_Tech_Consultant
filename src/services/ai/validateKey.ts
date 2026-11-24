export type KeyProvider = "anthropic" | "gemini";

export type KeyValidationStatus =
  | "ok"
  | "rejected"
  | "rate_limited"
  | "unreachable"
  | "invalid_format";

export interface KeyValidationResult {
  ok: boolean;
  provider: KeyProvider;
  status: KeyValidationStatus;
  httpStatus?: number;
  warning?: string;
}

const TIMEOUT_MS = 10_000;

function matchesFormat(provider: KeyProvider, key: string): boolean {
  const trimmed = key.trim();
  if (provider === "anthropic") return /^sk-ant-/.test(trimmed);
  return /^AIza/.test(trimmed);
}

/**
 * Validate a provider key. Logs only the provider and HTTP status — never
 * the key, its prefix, or any provider response body.
 */
export async function validateKey(
  provider: KeyProvider,
  apiKey: string
): Promise<KeyValidationResult> {
  if (!matchesFormat(provider, apiKey)) {
    console.log("[validateKey]", provider, "invalid_format");
    return { ok: false, provider, status: "invalid_format" };
  }

  const key = apiKey.trim();
  const url =
    provider === "anthropic"
      ? "https://api.anthropic.com/v1/models"
      : "https://generativelanguage.googleapis.com/v1beta/models";
  const headers: Record<string, string> =
    provider === "anthropic"
      ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
      : { "x-goog-api-key": key };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    console.log("[validateKey]", provider, "unreachable");
    return { ok: false, provider, status: "unreachable" };
  }

  console.log("[validateKey]", provider, res.status);

  if (res.status === 200) {
    return { ok: true, provider, status: "ok", httpStatus: 200 };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, provider, status: "rejected", httpStatus: res.status };
  }
  if (res.status === 429) {
    return {
      ok: true,
      provider,
      status: "rate_limited",
      httpStatus: 429,
      warning: "Provider rate limited the key check; the key was accepted but is limited.",
    };
  }
  return { ok: false, provider, status: "unreachable", httpStatus: res.status };
}
