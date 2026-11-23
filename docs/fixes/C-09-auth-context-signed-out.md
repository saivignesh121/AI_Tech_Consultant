# C-09 follow-up: /api/auth/context returns 401 for signed-out requests

- Severity: HIGH
- Audit reference: follow-up to C-01 (fail-closed tenant resolution) and the "Newly found" item in `docs/fixes/C-02-C-03-role-override-and-switch-role.md`
- Status: Fixed
- Date: 2026-11-23

## Problem

`GET` in `src/app/api/auth/context/route.ts` called `await getTenantContext()`
on line 8 with no surrounding try/catch. Since C-01, that function throws
`UnauthorizedError` for a signed-out request, so the route returned a framework
**500 with an empty body**. `AppShell.tsx:70-86` calls `res.json()` without
checking `res.ok`; the empty body made that throw into `.catch`, which only
logs, so the signed-out redirect gate never ran.

Verified before the fix with a dev server on port 3100 (port 3000 belongs to
the stale pre-fix Docker container):

```
HTTP/1.1 500 Internal Server Error
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
Date: Mon, 23 Nov 2026 10:10:47 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

(body: 0 bytes)
```

Server log: `Error [UnauthorizedError]: Unauthorized: no valid session` at
`src/lib/auth.ts:156`, called from `src/app/api/auth/context/route.ts:8`.

## Root cause

The route relied on `getTenantContext` always resolving a tenant. When C-01
made that function fail closed by throwing, this one caller was left without a
handler for the new failure mode. The route's only `catch` (old line 40)
belongs to the later memberships-query block, not to the tenant resolution.

## Fix

`src/app/api/auth/context/route.ts` only:

- Imports `UnauthorizedError` and the `TenantContext` type from `@/lib/auth`.
- Wraps just the `getTenantContext()` call in try/catch.
- Returns `NextResponse.json({ error: "unauthorized" }, { status: 401 })` for
  `UnauthorizedError` — a fixed body with no session, tenant, or stack details.
- Logs other errors server-side and returns
  `NextResponse.json({ error: "internal_error" }, { status: 500 })`, so no
  internal detail reaches the client.

`getTenantContext`, `UnauthorizedError`, the role logic, the demo-workspace
merge, and all other routes are unchanged. No dependency added, no schema
change.

## Verification

- Test added: `tests/c09_auth_context_signed_out.test.ts`. It mocks
  `next/headers` (empty cookie jar) and `@/db`, so no database or network is
  touched. It asserts (1) status 401 with no session, (2) the exact fixed JSON
  body and absence of session/tenant/stack details, and (3) an unexpected
  error (thrown by `cookies()`) returns 500 with a detail-free body.
- Commands run and results:
  - `npx vitest run tests/c09_auth_context_signed_out.test.ts` **before the fix**:
    **FAIL — `3 failed (3)`**. The 401 test failed with
    `UnauthorizedError: Unauthorized: no valid session` thrown from
    `src/lib/auth.ts:156` through `src/app/api/auth/context/route.ts:8`; the
    unexpected-error test failed with `Error: cookies called outside request scope`.
  - `npx vitest run tests/c09_auth_context_signed_out.test.ts` **after the fix**:
    **PASS — `3 passed (3)`**.
  - `npm run typecheck` (`tsc --noEmit`): **PASS**, no errors.
  - `npx vitest run` (full suite): `Test Files 1 failed | 40 passed (41)`,
    `Tests 1 failed | 410 passed (411)`. The only failure is the known
    pre-existing `tests/task2_3_polite_crawler.test.ts` idempotency test; it
    was reproduced on clean checkouts of `4a62c52` and `8facaab` with fresh
    `npm ci`, and touches no auth code.
  - Signed-out request against the current code (`npm run dev -- -p 3100`,
    then `curl -i http://localhost:3100/api/auth/context`; server stopped
    afterward):

    ```
    HTTP/1.1 401 Unauthorized
    vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
    content-type: application/json
    Date: Mon, 23 Nov 2026 10:14:10 GMT
    Connection: keep-alive
    Keep-Alive: timeout=5
    Transfer-Encoding: chunked

    {"error":"unauthorized"}
    ```

- Not verified: no authenticated request was exercised through the dev server;
  the positive behavior is covered by the existing route tests and the
  unchanged code path.

## Frontend check (no change needed)

`src/components/layout/AppShell.tsx:70-86` does not check `res.ok`, but the new
401 has a JSON body, so `res.json()` succeeds, `data.currentTenant` is absent,
and the existing branch at `:76-82` redirects to
`/signup?redirect=...` for non-public routes. A 401 is therefore handled as a
redirect, not silently swallowed. The other six `/api/auth/context` callers
guard on `d.currentTenant?...` and are unaffected. Changing AppShell was not
required and was not done.

## Risks and follow-up

- **API contract change:** signed-out `GET /api/auth/context` changes from 500
  with an empty body to 401 with `{"error":"unauthorized"}`. Approved before
  implementation.
- **Known remaining work (C-09 follow-up): the other routes still fail with
 500 for signed-out users.** The exact list requested by
  `for f in $(grep -rln "getTenantContext" src/app/api --include=*.ts); do grep -q "catch" "$f" || echo "$f"; done`
  is **empty** — that command only checks whether a file contains the word
  `catch`, and every file does. It is not a reliable guard test: before this
  fix, `auth/context` also contained a `catch` (for its memberships query)
  while the `getTenantContext()` call itself was unguarded. A brace-depth scan
  found that `auth/context:8` was the only unguarded call, and it is now fixed.
  The remaining 41 callers catch the `UnauthorizedError` inside their handler
  and return their generic 500 (some with `details: String(error)` — H-05).
  They should all return 401 through a shared `requireSession()` guard in a
  separate C-09 change, which would exceed the three-file limit for this fix:

  - `src/app/api/admin/businesses/route.ts`
  - `src/app/api/approvals/route.ts`
  - `src/app/api/brain/archived/route.ts`
  - `src/app/api/brain/crawl/route.ts`
  - `src/app/api/brain/emails/route.ts`
  - `src/app/api/brain/health/route.ts`
  - `src/app/api/brain/instructions/route.ts`
  - `src/app/api/brain/pages/route.ts`
  - `src/app/api/brain/query/route.ts`
  - `src/app/api/brain/refresh/route.ts`
  - `src/app/api/brain/sitemaps/route.ts`
  - `src/app/api/brain/skills/route.ts`
  - `src/app/api/business/delete/route.ts`
  - `src/app/api/chat/expert-tasks/[id]/resolve/route.ts`
  - `src/app/api/chat/expert-tasks/route.ts`
  - `src/app/api/chat/lessons/route.ts`
  - `src/app/api/chat/route.ts`
  - `src/app/api/chat/sessions/route.ts`
  - `src/app/api/evals/benchmark/versions/route.ts`
  - `src/app/api/evals/confidence-threshold/route.ts`
  - `src/app/api/evals/jobs-matrix/route.ts`
  - `src/app/api/evals/judge/route.ts`
  - `src/app/api/evals/ollama/route.ts`
  - `src/app/api/evals/prove-learned/route.ts`
  - `src/app/api/evals/side-by-side/route.ts`
  - `src/app/api/jobs/failed/route.ts`
  - `src/app/api/onboarding/readiness/route.ts`
  - `src/app/api/onboarding/state/route.ts`
  - `src/app/api/onboarding/synthetic-tests/route.ts`
  - `src/app/api/prompts/rollback/route.ts`
  - `src/app/api/prompts/route.ts`
  - `src/app/api/roles/route.ts`
  - `src/app/api/roles/test/route.ts`
  - `src/app/api/self-improve/approve/route.ts`
  - `src/app/api/self-improve/digest/route.ts`
  - `src/app/api/self-improve/revert/route.ts`
  - `src/app/api/self-improve/runs/route.ts`
  - `src/app/api/settings/connections/route.ts`
  - `src/app/api/settings/connections/test/route.ts`
  - `src/app/api/settings/step-models/route.ts`
  - `src/app/api/telemetry/route.ts`
- Unexpected errors are logged with `console.error` server-side; log retention
  and access are unchanged.

## Newly found (not fixed)

- None new in this change. The `task2_3` failure and the 41-route 500 behavior
  are documented above as pre-existing/follow-up work.
