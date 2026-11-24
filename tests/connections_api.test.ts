import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { encryptSecret } from "../src/lib/crypto";

const originalKey = process.env.ENCRYPTION_KEY;
const originalVersion = process.env.ENCRYPTION_KEY_VERSION;

const { state, mocks } = vi.hoisted(() => ({
  state: {
    rows: [] as any[],
    tenant: { businessId: "ws-a", userId: "user-a", userRole: "owner" } as any,
  },
  mocks: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insertValues: vi.fn(),
    updateSet: vi.fn(),
    validateKey: vi.fn(),
    allow: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getTenantContext: vi.fn(async () => state.tenant),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.delete,
  },
}));

vi.mock("@/services/ai/validateKey", () => ({ validateKey: mocks.validateKey }));
vi.mock("@/services/ai/rateLimit", () => ({
  allowConnectionMutation: mocks.allow,
}));

import { GET, POST, PATCH, DELETE } from "../src/app/api/settings/connections/route";

function request(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/settings/connections", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("connections API", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    process.env.ENCRYPTION_KEY_VERSION = "1";
    state.rows = [];
    state.tenant = { businessId: "ws-a", userId: "user-a", userRole: "owner" };

    mocks.select.mockImplementation(() => {
      const chain: any = {
        from: () => chain,
        where: () => chain,
        limit: async () => state.rows,
        then: (resolve: any) => Promise.resolve(state.rows).then(resolve),
      };
      return chain;
    });
    mocks.insert.mockImplementation(() => {
      const chain: any = {
        values: (value: any) => {
          mocks.insertValues(value);
          return chain;
        },
        onConflictDoUpdate: async () => undefined,
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
    mocks.delete.mockImplementation(() => ({ where: async () => undefined }));

    mocks.insertValues.mockClear();
    mocks.updateSet.mockClear();
    mocks.validateKey.mockReset();
    mocks.allow.mockReset();
    mocks.validateKey.mockResolvedValue({ ok: true, status: "ok", provider: "anthropic" });
    mocks.allow.mockResolvedValue({ allowed: true });
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
    if (originalVersion === undefined) delete process.env.ENCRYPTION_KEY_VERSION;
    else process.env.ENCRYPTION_KEY_VERSION = originalVersion;
  });

  it("refuses a non-owner/non-admin mutation", async () => {
    state.tenant = { businessId: "ws-a", userId: "user-a", userRole: "member" };

    const res = await POST(request("POST", { provider: "anthropic", apiKey: "sk-ant-abc123" }));

    expect(res.status).toBe(403);
    expect(mocks.validateKey).not.toHaveBeenCalled();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("does not save a rejected key", async () => {
    mocks.validateKey.mockResolvedValue({ ok: false, status: "rejected", provider: "anthropic" });

    const res = await POST(request("POST", { provider: "anthropic", apiKey: "sk-ant-dead-key" }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rejected/i);
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("saves a valid key encrypted and scoped to the workspace", async () => {
    const key = "sk-ant-api03-good-key-9999";

    const res = await POST(request("POST", { provider: "anthropic", apiKey: key }));

    expect(res.status).toBe(200);
    const body = await res.json();
    const saved = mocks.insertValues.mock.calls[0][0];
    expect(saved.workspaceId).toBe("ws-a");
    expect(saved.provider).toBe("anthropic");
    expect(saved.ciphertext).toBeTruthy();
    expect(saved.last4).toBe(key.slice(-4));
    expect(JSON.stringify(body)).not.toContain(key.slice(0, 10));
    expect(body.last4).toBe(key.slice(-4));
  });

  it("rate limits repeated saves", async () => {
    mocks.allow.mockResolvedValue({ allowed: false, reason: "limited" });

    const res = await POST(request("POST", { provider: "gemini", apiKey: "AIzaSy-valid-key-1234567890" }));

    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many/i);
    expect(mocks.validateKey).not.toHaveBeenCalled();
  });

  it("reports an unavailable limiter distinctly", async () => {
    mocks.allow.mockResolvedValue({ allowed: false, reason: "unavailable" });

    const res = await POST(request("POST", { provider: "anthropic", apiKey: "sk-ant-valid-key" }));

    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/unavailable/i);
  });

  it("cannot retest a key belonging to a different workspace", async () => {
    state.tenant = { businessId: "ws-b", userId: "user-b", userRole: "owner" };
    state.rows = [];

    const res = await PATCH(request("PATCH", { provider: "gemini" }));

    expect(res.status).toBe(404);
    expect(mocks.validateKey).not.toHaveBeenCalled();
  });

  it("retests a stored key and updates its status", async () => {
    const envelope = encryptSecret("AIzaSy-stored-key-1234567890");
    state.rows = [{ ...envelope, provider: "gemini", workspaceId: "ws-a" }];

    const res = await PATCH(request("PATCH", { provider: "gemini" }));

    expect(res.status).toBe(200);
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" })
    );
  });

  it("removes a key", async () => {
    const res = await DELETE(request("DELETE", { provider: "gemini" }));

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mocks.delete).toHaveBeenCalled();
  });

  it("returns only status metadata on read", async () => {
    state.rows = [
      { provider: "anthropic", last4: "9999", status: "active", validatedAt: new Date() },
    ];

    const res = await GET();
    const body = await res.json();

    expect(body.connections[0]).toMatchObject({
      provider: "anthropic",
      last4: "9999",
      status: "active",
    });
    for (const field of ["ciphertext", "apiKey", "authTag", "iv", "keyVersion"]) {
      expect(body.connections[0]).not.toHaveProperty(field);
    }
  });
});
