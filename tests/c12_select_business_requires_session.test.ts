import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

// Test-only signing key. Not a real secret; never sourced from .env.
const TEST_SIGNING_KEY = "a".repeat(64);
const USER_A = "aaaaaaaa-1111-4111-8111-111111111111";
const USER_B = "bbbbbbbb-2222-4222-8222-222222222222";
const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";

const originalEncryptionKey = process.env.ENCRYPTION_KEY;

const { cookieJar, selectMock, createSessionMock } = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  selectMock: vi.fn(),
  createSessionMock: vi.fn(async (userId: string, businessId: string) => ({
    token: `sess_test_${userId}`,
    expiresAt: new Date(Date.now() + 60_000),
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined,
  })),
}));

vi.mock("@/db", () => ({
  db: { select: selectMock, insert: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  createSession: createSessionMock,
}));

import { POST } from "../src/app/api/auth/select-business/route";

function chainFor(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "leftJoin", "where", "limit"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.limit = vi.fn(async () => rows);
  return chain;
}

function mockDb(membershipRows: unknown[]) {
  selectMock.mockReset();
  selectMock
    .mockReturnValueOnce(chainFor(membershipRows))
    .mockReturnValueOnce(chainFor([{ readinessScore: 100 }]));
}

function sign(payload: string, key: string): string {
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

function makePendingLoginCookie(
  userId: string,
  expiresAt: number,
  key: string = TEST_SIGNING_KEY
): string {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload, key)}`;
}

function makeRequest(body: unknown) {
  return { json: async () => body } as never;
}

const membershipRow = {
  role: "member",
  businessId: BUSINESS_ID,
  businessName: "Acme Corporation",
  businessSlug: "acme-corp",
};

describe("C-12 select-business requires a verified pending_login cookie", () => {
  beforeEach(() => {
    cookieJar.clear();
    createSessionMock.mockClear();
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey;
    }
    process.env.ENCRYPTION_KEY = TEST_SIGNING_KEY;
    mockDb([membershipRow]);
  });

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey;
    }
  });

  it("A: returns 401 and does not create a session with no pending_login cookie", async () => {
    const res = await POST(
      makeRequest({ userId: USER_B, businessId: BUSINESS_ID })
    );

    expect(res.status).toBe(401);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("B: ignores body userId and creates the session for the cookie's user", async () => {
    cookieJar.set(
      "pending_login",
      makePendingLoginCookie(USER_A, Date.now() + 5 * 60 * 1000)
    );

    const res = await POST(
      makeRequest({ userId: USER_B, businessId: BUSINESS_ID })
    );

    expect(res.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalledTimes(1);
    expect(createSessionMock).toHaveBeenCalledWith(USER_A, BUSINESS_ID);
    expect(createSessionMock).not.toHaveBeenCalledWith(USER_B, BUSINESS_ID);
  });

  it("C: returns 401 for a tampered pending_login signature", async () => {
    const cookie = makePendingLoginCookie(USER_A, Date.now() + 5 * 60 * 1000);
    const tampered = cookie.slice(0, -1) + (cookie.endsWith("0") ? "1" : "0");
    cookieJar.set("pending_login", tampered);

    const res = await POST(
      makeRequest({ userId: USER_A, businessId: BUSINESS_ID })
    );

    expect(res.status).toBe(401);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("D: returns 401 for an expired pending_login cookie", async () => {
    cookieJar.set(
      "pending_login",
      makePendingLoginCookie(USER_A, Date.now() - 1000)
    );

    const res = await POST(
      makeRequest({ userId: USER_A, businessId: BUSINESS_ID })
    );

    expect(res.status).toBe(401);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("E: fails closed with 401 when ENCRYPTION_KEY is unset", async () => {
    delete process.env.ENCRYPTION_KEY;
    cookieJar.set(
      "pending_login",
      makePendingLoginCookie(USER_A, Date.now() + 5 * 60 * 1000)
    );

    const res = await POST(
      makeRequest({ userId: USER_A, businessId: BUSINESS_ID })
    );

    expect(res.status).toBe(401);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("F: clears the pending_login cookie on success so it cannot be replayed", async () => {
    cookieJar.set(
      "pending_login",
      makePendingLoginCookie(USER_A, Date.now() + 5 * 60 * 1000)
    );

    const res = await POST(
      makeRequest({ userId: USER_A, businessId: BUSINESS_ID })
    );

    expect(res.status).toBe(200);
    const cleared = res.cookies.get("pending_login");
    expect(cleared).toBeDefined();
    expect(cleared?.value).toBe("");
    expect(
      cleared?.maxAge === 0 ||
        (cleared?.expires && Date.parse(String(cleared.expires)) < Date.now())
    ).toBe(true);
  });
});
