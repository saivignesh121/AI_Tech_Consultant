import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { state } = vi.hoisted(() => ({
  state: { mode: "missing" as "missing" | "rejected" | "rate_limited" },
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getTenantContext: async () => actual.DEFAULT_TENANT };
});

vi.mock("@/services/ai/workspaceProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/ai/workspaceProvider")>();
  return {
    ...actual,
    getWorkspaceKey: async () =>
      state.mode === "missing" ? null : "sk-ant-api03-test-workspace-key",
    callWorkspaceModel: async () => {
      if (state.mode === "rejected") throw new actual.AiKeyRejectedError();
      if (state.mode === "rate_limited") throw new actual.AiRateLimitedError();
      throw new actual.AiKeyMissingError();
    },
  };
});

import { POST } from "../src/app/api/chat/route";

function req(): NextRequest {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hello", mode: "ask" }),
  });
}

describe("chat workspace-key error mapping", () => {
  beforeEach(() => {
    state.mode = "missing";
  });

  it("returns the add-key error when no key is stored", async () => {
    const res = await POST(req());

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Add your AI key in Settings.");
  });

  it("maps a rejected provider key to the rejected message", async () => {
    state.mode = "rejected";

    const res = await POST(req());

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(
      "Your AI key was rejected. Update it in Settings."
    );
  });

  it("maps provider 429 to a try-again-later message", async () => {
    state.mode = "rate_limited";

    const res = await POST(req());

    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe(
      "The AI provider is rate limited. Please try again later."
    );
  });
});
