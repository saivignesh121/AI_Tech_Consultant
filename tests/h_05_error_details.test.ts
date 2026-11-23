import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => {
      throw new Error("forced db failure");
    }),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { POST } from "../src/app/api/auth/login/route";

describe("H-05 login error responses", () => {
  it("returns no details field when the database throws", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "correct-horse-battery-staple",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).not.toHaveProperty("details");
  });
});
