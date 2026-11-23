import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

const { cookieJar, selectMock } = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  selectMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined,
  })),
}));

vi.mock("@/db", () => ({
  db: { select: selectMock },
}));

import { getTenantContext, DEFAULT_TENANT } from "../src/lib/auth";

function mockSessionRows(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
  };
  selectMock.mockReturnValue(chain);
}

const memberRow = {
  sessionId: "sess_member",
  userId: "aaaaaaaa-1111-4111-8111-111111111111",
  businessId: DEFAULT_TENANT.businessId,
  businessName: DEFAULT_TENANT.businessName,
  businessSlug: DEFAULT_TENANT.businessSlug,
  userEmail: "member@acme.com",
  userRole: "member",
};

describe("C-02/C-03 role override and switch-role removal", () => {
  beforeEach(() => {
    cookieJar.clear();
    selectMock.mockReset();
  });

  it("ignores active_test_role for an authenticated member", async () => {
    cookieJar.set("session_token", "sess_member");
    cookieJar.set("active_test_role", "owner");
    mockSessionRows([memberRow]);

    const tenant = await getTenantContext();

    expect(tenant.userRole).toBe("member");
  });

  it("still resolves the real membership role for a valid session", async () => {
    cookieJar.set("session_token", "sess_member");
    mockSessionRows([memberRow]);

    const tenant = await getTenantContext();

    expect(tenant.userRole).toBe("member");
  });

  it("has no runtime reader for the active_test_role cookie", () => {
    const authSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/auth.ts"),
      "utf8"
    );

    expect(authSource).not.toContain("active_test_role");
  });

  it("does not expose a switch-role endpoint", () => {
    const routePath = path.resolve(
      process.cwd(),
      "src/app/api/auth/switch-role/route.ts"
    );

    expect(fs.existsSync(routePath)).toBe(false);
  });
});
