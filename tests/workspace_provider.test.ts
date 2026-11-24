import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encryptSecret } from "../src/lib/crypto";

const originalKey = process.env.ENCRYPTION_KEY;
const originalVersion = process.env.ENCRYPTION_KEY_VERSION;

const { state, mocks } = vi.hoisted(() => ({
  state: { rows: [] as any[] },
  mocks: {
    select: vi.fn(),
    update: vi.fn(),
    updateSet: vi.fn(),
    fetch: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: { select: mocks.select, update: mocks.update },
}));

import {
  callWorkspaceModel,
  getWorkspaceKey,
  AiKeyMissingError,
  AiKeyRejectedError,
} from "../src/services/ai/workspaceProvider";

const WORKSPACE_A = "ws-a";
const WORKSPACE_B = "ws-b";

function storedKey(plain: string) {
  return {
    ...encryptSecret(plain),
    provider: "anthropic",
    workspaceId: WORKSPACE_A,
    status: "active",
  };
}

describe("workspace-scoped AI key usage", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    process.env.ENCRYPTION_KEY_VERSION = "1";
    state.rows = [];
    mocks.select.mockImplementation(() => {
      const chain: any = {
        from: () => chain,
        where: () => chain,
        limit: async () => state.rows,
      };
      return chain;
    });
    mocks.update.mockImplementation(() => {
      const chain: any = {
        set: (value: any) => {
          mocks.updateSet(value);
          return chain;
        },
        where: async () => undefined,
      };
      return chain;
    });
    mocks.fetch.mockReset();
    mocks.updateSet.mockClear();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
    if (originalVersion === undefined) delete process.env.ENCRYPTION_KEY_VERSION;
    else process.env.ENCRYPTION_KEY_VERSION = originalVersion;
  });

  it("fails safely when no key is stored", async () => {
    await expect(callWorkspaceModel(WORKSPACE_A, "anthropic", "hello")).rejects.toBeInstanceOf(
      AiKeyMissingError
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("cannot use another workspace's key", async () => {
    // The query is scoped to WORKSPACE_B in SQL; its result set has no row.
    state.rows = [];

    expect(await getWorkspaceKey(WORKSPACE_B, "anthropic")).toBeNull();
    await expect(
      callWorkspaceModel(WORKSPACE_B, "anthropic", "hello")
    ).rejects.toBeInstanceOf(AiKeyMissingError);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("marks the key rejected when the provider returns 401", async () => {
    state.rows = [storedKey("sk-ant-api03-dead-key")];
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    await expect(
      callWorkspaceModel(WORKSPACE_A, "anthropic", "hello")
    ).rejects.toBeInstanceOf(AiKeyRejectedError);
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected" })
    );
  });

  it("maps provider 429 to a rate-limit error", async () => {
    state.rows = [storedKey("sk-ant-api03-good-key")];
    mocks.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    await expect(
      callWorkspaceModel(WORKSPACE_A, "anthropic", "hello")
    ).rejects.toThrow(/rate limited/i);
  });

  it("calls the provider with the workspace key and returns the text", async () => {
    state.rows = [storedKey("sk-ant-api03-good-key")];
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: "answer" }] }),
    });

    const reply = await callWorkspaceModel(WORKSPACE_A, "anthropic", "hello");

    expect(reply).toBe("answer");
    const [, options] = mocks.fetch.mock.calls[0];
    expect(options.headers["x-api-key"]).toBe("sk-ant-api03-good-key");
  });
});
