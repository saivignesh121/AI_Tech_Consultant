# C-01: getTenantContext fails open to the Acme demo owner

- Severity: CRITICAL
- Audit reference: C-01 "Anonymous requests are treated as the Acme owner" (§3 Authentication and authorization)
- Status: Fixed
- Date: 2026-11-23

## Problem

`getTenantContext` in `src/lib/auth.ts` resolved a tenant even when the caller
presented no valid session. With no `session_token`, it fell through to
`DEFAULT_TENANT` (the Acme demo owner, `alex@acme.com`, `userRole: "owner"`):

```ts
// before the fix
200:     let baseContext = DEFAULT_TENANT;
201:     if (slug && DEMO_BUSINESSES[slug]) {
202:       baseContext = DEMO_BUSINESSES[slug];
203:     }
...
214:     return baseContext;
```

It also applied the `active_test_role` cookie to that demo context without a
session (lines 205–212), and the outer catch returned the same owner context:

```ts
// before the fix
215:   } catch {
216:     // If called outside request context (e.g. in standalone scripts or tests)
217:   }
218:
219:   return DEFAULT_TENANT;
```

A session-store error was swallowed by the inner catch (lines 192–195) and
"fell through" to the same demo lookup. Every one of the 43 route files that
calls `getTenantContext` (`src/app/api/business/delete/route.ts:14`,
`src/app/api/admin/businesses/route.ts:10`, `src/app/api/chat/route.ts:20`,
`src/app/api/roles/route.ts:153`, ...) therefore granted an unauthenticated
visitor owner rights over the demo tenant, including reading and deleting its
workspace.

## Root cause

The function treated "could not establish a session" as "use the demo
tenant". The demo fallback (with an owner role) was the default branch for
three distinct cases: no cookie, no matching/expired session row, and a lookup
failure. Authentication was opt-out rather than opt-in, so the absence of a
credential produced the highest privilege level.

## Fix

`getTenantContext` now requires a session and fails closed:

- If `session_token` is missing, it throws `UnauthorizedError`
  (`src/lib/auth.ts:138-157`). `active_tenant_slug` and `active_test_role`
  are not consulted without a session.
- If the session lookup returns no row, or the lookup throws, it logs the
  failure and throws `UnauthorizedError` (`src/lib/auth.ts:200-205`). No demo
  tenant is returned in either case.
- The valid-session branch is unchanged, including the existing
  `active_test_role` override (`src/lib/auth.ts:184-198`). That override is
  C-02 and is deliberately untouched.

Files changed:

- `src/lib/auth.ts`: added exported `UnauthorizedError`; removed the
  `DEFAULT_TENANT`/`DEMO_BUSINESSES` fallback, the no-session test-role
  branch, and the outer catch that returned `DEFAULT_TENANT`. `DEFAULT_TENANT`
  and `DEMO_BUSINESSES` remain exported because `src/db/seed.ts`,
  `src/app/api/auth/context/route.ts`, `src/app/api/auth/switch-tenant/route.ts`
  and tests import them.
- `tests/c01_tenant_context_fail_closed.test.ts`: new test file (see below).
- `docs/fixes/C-01-get-tenant-context-fail-closed.md`: this document.

No dependency was added. The function signature is unchanged
(`Promise<TenantContext>`); it now throws instead of returning a demo context.

## Verification

- Test(s) added: `tests/c01_tenant_context_fail_closed.test.ts`. It mocks
  `next/headers` with an in-memory cookie jar and `@/db` with a stub
  `select` chain, so no database or network is touched. It covers: no session,
  only demo cookies, session-store failure, and a valid session (positive
  control).
- Commands run and results:
  - `npx vitest run tests/c01_tenant_context_fail_closed.test.ts -t "C-01"`
    before the fix: **FAIL** — `3 failed | 1 passed (4)`.
    `rejects anonymous requests...` and `ignores demo tenant...` failed with
    `promise resolved "{ …(6) }" instead of rejecting`, showing
    `businessName: "Acme Corporation"`, `userRole: "owner"`. The session-store
    failure test also resolved the Acme owner.
  - `npx vitest run tests/c01_tenant_context_fail_closed.test.ts -t "C-01"`
    after the fix: **PASS** — `1 passed (1)` test file, `4 passed (4)` tests.
  - `npm run typecheck` (`tsc --noEmit`): **PASS**, no errors.
- Not verified: `UnauthorizedError` is not mapped to HTTP `401` anywhere; each
  route's own `try/catch` returns `500`. A shared `requireSession()` guard
  belongs to the C-09 / Phase 1 follow-up. The demo-mode product decision
  (whether a `DEMO_MODE` flag should exist) was not made. No route handler was
  exercised end-to-end.

## Risks and follow-up

- **Anonymous API responses change from demo data to `500`.** 43 route files
  call `getTenantContext` and most wrap it in `try/catch` that returns `500`
  with a generic error (some still include `details`, see H-05). This is
  fail-closed but not yet a clean `401`. Clients of `/api/auth/context`
  (`src/components/layout/AppShell.tsx:71`,
  `src/components/layout/WebsiteHeader.tsx:46`, and the page headers) now get
  an error for logged-out users instead of the Acme workspace.
- **Existing tests that relied on the fallback were updated.** These five
  files call route handlers with no session cookie and originally expected
  `200`: `tests/task2_7_task2_8_hybrid_search_api.test.ts`,
  `tests/task3_1_ask_and_teach.test.ts`,
  `tests/task3_2_good_answers_roles.test.ts`,
  `tests/task5_3_task5_4_approve_undo_digest.test.ts`, and
  `tests/task6_1_task6_4_onboarding.test.ts`. Each now has an inline
  `vi.mock("@/lib/auth", ...)` that stubs `getTenantContext` to return
  `DEFAULT_TENANT` for that test run; `src/` and `getTenantContext` are
  unchanged. All 56 tests in those five files pass. The full suite is now
  `Tests 1 failed | 403 passed (404)`; the only remaining failure is
  `tests/task2_3_polite_crawler.test.ts` ("read every page once"
  idempotency), which fails identically with this fix reverted and touches no
  auth code, so it is pre-existing and unrelated to C-01.
- `src/app/api/auth/switch-role/route.ts` (C-03) now fails for anonymous
  callers because it no longer receives the Acme owner, but the endpoint
  itself is unchanged: it still has no login requirement and no elevation
  guard. C-03 is not fixed.
- `createSession` still swallows insert errors (C-05, `src/lib/auth.ts:59-75`),
  and a session-store outage is now reported as "invalid or expired session"
  rather than `503`. C-05 is not fixed.
- Demo workspaces remain selectable through `active_tenant_slug`
  (`src/app/api/auth/switch-tenant/route.ts`), but the cookie no longer
  authorizes anything by itself.
- If a demo build is still required, a `DEMO_MODE` flag that defaults to off
  is the audit's suggested follow-up. That is a product decision (audit §9)
  and was intentionally not added in this issue.

## Newly found (not fixed)

- `src/app/api/auth/context/route.ts:8`: `getTenantContext()` is called with no
  `try/catch`. An unauthenticated request now produces an unhandled
  `UnauthorizedError` and a framework `500` instead of a clean `401` with an
  empty workspace list.
- `src/app/api/auth/context/route.ts:10-17`: every caller receives both
  `DEMO_BUSINESSES` entries in `workspaces`, whether or not they belong to
  them. This second exposure of the demo tenants is not removed by C-01.
- `src/app/api/auth/switch-role/route.ts:39-41`: when the database update
  fails, the route logs a warning and still returns `{ success: true }`, so a
  role switch can be reported as successful while nothing was written.
- `src/app/api/business/delete/route.ts:56` and
  `src/app/api/auth/switch-tenant/route.ts:34`: still return
  `details: String(error)` to clients (H-05 residue).
