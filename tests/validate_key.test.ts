import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateKey } from "../src/services/ai/validateKey";

const fetchMock = vi.fn();

function response(status: number): Response {
  return { status } as Response;
}

describe("validateKey", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects bad formats without any network call", async () => {
    const anthropic = await validateKey("anthropic", "wrong-prefix-key");
    const gemini = await validateKey("gemini", "AIza".slice(0, 2) + "bad");

    expect(anthropic).toMatchObject({ ok: false, status: "invalid_format" });
    expect(gemini).toMatchObject({ ok: false, status: "invalid_format" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a valid Anthropic key with the required headers", async () => {
    fetchMock.mockResolvedValue(response(200));

    const result = await validateKey("anthropic", "sk-ant-api03-valid-key");

    expect(result).toMatchObject({ ok: true, status: "ok", httpStatus: 200 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/models");
    expect(options.headers).toMatchObject({
      "x-api-key": "sk-ant-api03-valid-key",
      "anthropic-version": "2023-06-01",
    });
    expect(options.signal).toBeDefined();
  });

  it("sends the Gemini key in a header, not the URL", async () => {
    fetchMock.mockResolvedValue(response(200));

    const result = await validateKey("gemini", "AIzaSy-valid-key-1234567890");

    expect(result).toMatchObject({ ok: true, status: "ok" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models");
    expect(url).not.toContain("AIzaSy");
    expect(options.headers).toMatchObject({
      "x-goog-api-key": "AIzaSy-valid-key-1234567890",
    });
  });

  it.each([401, 403])("treats HTTP %i as rejected", async (status) => {
    fetchMock.mockResolvedValue(response(status));

    const result = await validateKey("anthropic", "sk-ant-api03-dead-key");

    expect(result).toMatchObject({
      ok: false,
      status: "rejected",
      httpStatus: status,
    });
  });

  it("treats HTTP 429 as valid but limited", async () => {
    fetchMock.mockResolvedValue(response(429));

    const result = await validateKey("gemini", "AIzaSy-limited-key-1234567890");

    expect(result.ok).toBe(true);
    expect(result.status).toBe("rate_limited");
    expect(result.warning).toBeTruthy();
  });

  it("treats a timeout as unreachable", async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error("timed out"), { name: "TimeoutError" })
    );

    const result = await validateKey("anthropic", "sk-ant-api03-timeout-key");

    expect(result).toMatchObject({ ok: false, status: "unreachable" });
  });

  it("treats other provider errors as unreachable", async () => {
    fetchMock.mockResolvedValue(response(500));

    const result = await validateKey("gemini", "AIzaSy-error-key-1234567890");

    expect(result).toMatchObject({
      ok: false,
      status: "unreachable",
      httpStatus: 500,
    });
  });

  it("never logs the key", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    fetchMock.mockResolvedValue(response(200));
    const secret = "sk-ant-api03-NEVER-LOG-THIS-KEY-1234";

    await validateKey("anthropic", secret);

    expect(log.mock.calls.flat().join(" ")).not.toContain("NEVER-LOG-THIS-KEY");
  });
});
