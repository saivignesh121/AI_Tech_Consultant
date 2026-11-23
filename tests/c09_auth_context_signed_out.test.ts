import { describe, it, expect, vi, beforeEach } from "vitest";

const { headersState } = vi.hoisted(() => ({
  headersState: { throwOnCookies: false },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => {
    if (headersState.throwOnCookies) {
      throw new Error("cookies called outside request scope");
    }
    return { get: () => undefined };
  }),
}));

vi.mock("@/db", () => ({
  db: { select: vi.fn() },
}));

import { GET } from "../src/app/api/auth/context/route";

describe("/api/auth/context signed-out responses", () => {
  beforeEach(() => {
    headersState.throwOnCookies = false;
  });

  it("returns 401 when there is no session cookie", async () => {
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns a fixed JSON body with no session or tenant details", async () => {
    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({ error: "unauthorized" });
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(JSON.stringify(body)).not.toMatch(/acme|alex|session|tenant|stack|at /i);
  });

  it("returns 500 with no internal details for an unexpected error", async () => {
    headersState.throwOnCookies = true;

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).not.toMatch(/outside request scope|stack|at /i);
  });
});
