import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { getTenantContext } from "../src/lib/auth";

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

const sessionRow = {
  sessionId: "sess_valid",
  userId: "aaaaaaaa-1111-4111-8111-111111111111",
  businessId: "11111111-1111-4111-8111-111111111111",
  businessName: "Acme Corporation",
  businessSlug: "acme-corp",
  userEmail: "alex@acme.com",
  userRole: "member",
};

describe("C-01 getTenantContext fails closed", () => {
  beforeEach(() => {
    cookieJar.clear();
    selectMock.mockReset();
  });

  it("rejects anonymous requests instead of returning the Acme owner", async () => {
    await expect(getTenantContext()).rejects.toThrow(/unauthorized/i);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("ignores demo tenant and test-role cookies when there is no session", async () => {
    cookieJar.set("active_tenant_slug", "acme-corp");
    cookieJar.set("active_test_role", "owner");

    await expect(getTenantContext()).rejects.toThrow(/unauthorized/i);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("rejects when the session store fails instead of falling back to the demo owner", async () => {
    cookieJar.set("session_token", "sess_unknown");
    selectMock.mockImplementation(() => {
      throw new Error("session store unavailable");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getTenantContext()).rejects.toThrow(/unauthorized/i);
    expect(selectMock).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it("still returns the tenant for a valid session", async () => {
    cookieJar.set("session_token", "sess_valid");
    mockSessionRows([sessionRow]);

    const tenant = await getTenantContext();

    expect(tenant.businessId).toBe(sessionRow.businessId);
    expect(tenant.userId).toBe(sessionRow.userId);
    expect(tenant.businessName).toBe("Acme Corporation");
    expect(tenant.userRole).toBe("member");
  });
});
