# C-12: select-business must verify identity, not trust the request body

- Severity: CRITICAL
- Audit reference: C-12 (`POST /api/auth/select-business`)
- Status: Fixed
- Date: 2026-11-23

## Problem

`src/app/api/auth/select-business/route.ts` read `userId` from the JSON request body and passed it straight to `createSession(userId, ...)`, then set `session_token` and `user_id` cookies for that user. The only check was that the *claimed* user had a membership in the requested business — there was no proof that the caller *was* that user. Anyone who knew a user ID and one of that user's business IDs could mint a real, 30-day session for that account (account takeover). The 500 handler also returned `details: String(error)`, leaking internal error text.

Root cause: identity was taken from client-controlled input instead of being derived from a server-verified credential. The multi-business login path made this worse: `/api/auth/login` returned `requiresBusinessChoice: true` with `user.id` but set **no** cookie at all, so `select-business` had no session to rely on and the UI had to echo the user ID back in the body.

## Root cause

`login` multi-business branch issued no scoped credential; `select-business` treated the echoed `userId` as authentic.

## Design (human-approved)

1. `/api/auth/login`, **only** in the `requiresBusinessChoice` branch: issue a short-lived (5 min) httpOnly `pending_login` cookie containing `userId + expiry`, HMAC-SHA256 signed with `ENCRYPTION_KEY`. It is not a session and grants no tenant access. No other login behavior changes.
2. `/api/auth/select-business`: derive the user ID **only** from a valid, unexpired, correctly signed `pending_login` cookie. Ignore body `userId` entirely. Keep the membership check. 401 when the cookie is missing/expired/badly signed.
3. Signing secret: reuse the existing `ENCRYPTION_KEY`. No new secret. Missing key ⇒ fail closed (401), never a default/hardcoded key.
4. `src/app/signin/page.tsx` unchanged; the UI keeps sending `{ userId, businessId }` and the server ignores `userId`.

## Fix

Files changed:

- `src/app/api/auth/login/route.ts` — added `signPendingLogin()` (HMAC-SHA256 over `<userId>.<expiryMs>` using `process.env.ENCRYPTION_KEY`, throwing if unset) and set the signed `pending_login` cookie in the multi-business branch only (`httpOnly`, `sameSite: lax`, `secure` when `COOKIE_SECURE=true`, `maxAge: 300`).
- `src/app/api/auth/select-business/route.ts` — added `verifyPendingLogin()` (split/parse, expiry check, timing-safe HMAC comparison, null when `ENCRYPTION_KEY` is unset), reads identity from the cookie, ignores body `userId`, keeps the membership check, and now returns a fixed 500 body with `console.error` server-side. On the success path it also calls `response.cookies.delete("pending_login")` so the credential is single-use (see below). The JSON response shape and the names of the session cookies are unchanged.
- `tests/c12_select_business_requires_session.test.ts` (new) — 6 tests (A–F), all DB access mocked.
- `docs/fixes/C-12-select-business-requires-session.md` (new) — this document.

Note: `src/lib/crypto.ts:8` reads `process.env.ENCRYPTION_KEY || DEFAULT_KEY` (hardcoded fallback, `<REDACTED>`). That helper was **not** reused, because the approved design forbids default keys and requires fail-closed behavior. Both routes read `process.env.ENCRYPTION_KEY` directly and reject when it is absent.

## Follow-up: `pending_login` is single-use

Verifying the signature was not enough: a valid `pending_login` cookie stayed usable for its full 5-minute window, so a successful selection could be replayed to mint another session for the same user without re-authenticating. On the success path only, `src/app/api/auth/select-business/route.ts:158` now calls:

```ts
response.cookies.delete("pending_login");
```

That emits `pending_login=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`, clearing the short-lived credential in the browser. It sits after all five session cookies are set and immediately before `return response`. The 401 path is unchanged — an invalid cookie is still rejected, and no deletion is attempted there. Test F covers this behavior.

## Evidence — Step 1 (read-only confirmation)

```
$ grep -rn "ENCRYPTION_KEY" src --exclude='.env*'
src/lib/crypto.ts:8:  const hexKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
```

`ENCRYPTION_KEY` is already used in `src/` (AES-256-GCM credential encryption in `src/lib/crypto.ts`), so no new secret is needed and no STOP condition applies.

The requested `sed -n '95,135p' src/app/api/auth/login/route.ts` covered the **single-business** branch (the file's `requiresBusinessChoice` branch is at lines ~186–203, read separately). Confirmed raw branch before the fix:

```
    } else {
      // Multiple businesses: Prompt user to choose workspace
      return NextResponse.json({
        success: true,
        requiresBusinessChoice: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
        },
        businesses: userMemberships,
        message: "Multiple workspaces found. Please select which business to open.",
      });
    }
```

No `createSession` / no cookies in that branch. `createSession` and all `cookies.set(...)` calls are inside `if (userMemberships.length === 1)` (line 103 / 148+).

## Evidence — Step 2 (failing tests first)

Full output of `npx vitest run tests/c12_select_business_requires_session.test.ts` on the unfixed code:

```
 RUN  v3.2.7 /Users/sanjanakolu/Desktop/vignesh/AI_Tech_Consultant

 ❯ tests/c12_select_business_requires_session.test.ts (5 tests | 5 failed) 8ms
   × C-12 select-business requires a verified pending_login cookie > A: returns 401 and does not create a session with no pending_login cookie 5ms
     → expected 200 to be 401 // Object.is equality
   × C-12 select-business requires a verified pending_login cookie > B: ignores body userId and creates the session for the cookie's user 1ms
     → expected "spy" to be called with arguments: [ …(2) ]
Received: 
  1st spy call:
  [
-   "aaaaaaaa-1111-4111-8111-111111111111",
+   "bbbbbbbb-2222-4222-8222-222222222222",
    "11111111-1111-4111-8111-111111111111",
  ]
Number of calls: 1
   × C-12 select-business requires a verified pending_login cookie > C: returns 401 for a tampered pending_login signature 0ms
     → expected 200 to be 401 // Object.is equality
   × C-12 select-business requires a verified pending_login cookie > D: returns 401 for an expired pending_login cookie 0ms
     → expected 200 to be 401 // Object.is equality
   × C-12 select-business requires a verified pending_login cookie > E: fails closed with 401 when ENCRYPTION_KEY is unset 0ms
     → expected 200 to be 401 // Object.is equality

 Test Files  1 failed (1)
      Tests  5 failed (5)
   Start at  19:54:46
   Duration  399ms (transform 29ms, setup 0ms, collect 182ms, tests 8ms, environment 0ms, prepare 33ms)

Exit code: 1
```

Tests A–D fail on current code as required (E fails too). Test B choice: **body `userId` is ignored**, not rejected — `createSession` must be called for the cookie's user (A), never the body's user (B). Test F was added with the single-use follow-up above; on unfixed code it fails at `expect(cleared).toBeDefined()` because a successful response emits no `pending_login` Set-Cookie to clear it.

## Verification

- `npx vitest run tests/c12_select_business_requires_session.test.ts --reporter=verbose` → **6 passed / 6**, one per test A–F:

```
 RUN  v3.2.7 /Users/sanjanakolu/Desktop/vignesh/AI_Tech_Consultant

 ✓ tests/c12_select_business_requires_session.test.ts > C-12 select-business requires a verified pending_login cookie > A: returns 401 and does not create a session with no pending_login cookie 2ms
 ✓ tests/c12_select_business_requires_session.test.ts > C-12 select-business requires a verified pending_login cookie > B: ignores body userId and creates the session for the cookie's user 2ms
 ✓ tests/c12_select_business_requires_session.test.ts > C-12 select-business requires a verified pending_login cookie > C: returns 401 for a tampered pending_login signature 0ms
 ✓ tests/c12_select_business_requires_session.test.ts > C-12 select-business requires a verified pending_login cookie > D: returns 401 for an expired pending_login cookie 0ms
 ✓ tests/c12_select_business_requires_session.test.ts > C-12 select-business requires a verified pending_login cookie > E: fails closed with 401 when ENCRYPTION_KEY is unset 0ms
 ✓ tests/c12_select_business_requires_session.test.ts > C-12 select-business requires a verified pending_login cookie > F: clears the pending_login cookie on success so it cannot be replayed 0ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  20:09:21
   Duration  347ms (transform 26ms, setup 0ms, collect 177ms, tests 5ms, environment 0ms, prepare 36ms)
```

- `npm run typecheck` → clean (full output):

```
> ai_tech_consultant@1.0.0 typecheck
> tsc --noEmit
```

- `npx vitest run` → summary (run before test F was added; counts below predate the single-use follow-up, which is verified by the targeted six-test run above):

```
 Test Files  1 failed | 41 passed (42)
      Tests  1 failed | 415 passed (416)
   Start at  19:55:46
   Duration  3.23s
```

The only failure is the pre-existing, known `tests/task2_3_polite_crawler.test.ts` idempotency test (`expected +0 to be 1`, line 96). All other tests, including the 5 C-12 tests that existed at that point, pass. Test F was added later and passes in the targeted run above.

- Not verified: no live HTTP request and no database/Vercel/production access was performed (per rules). The `pending_login` cookie was validated only through the mocked unit tests and typecheck.

## Risks and follow-up (what remains)

- **Demo list merged into `/api/auth/context`**: `src/app/api/auth/context/route.ts:19-58` merges `DEMO_BUSINESSES` with real memberships and returns demo workspaces for any authenticated user. Not addressed here.
- **Migrate `AppShell` off `switch-tenant`**: `src/components/layout/AppShell.tsx:115` still calls `POST /api/auth/switch-tenant`.
- **`scripts/verify_all_screens_and_buttons.py`**: `make_req()` (line 13) sends a static `Cookie: tenant_slug=acme-corp` and never captures `Set-Cookie`, while the `select-business` check (lines 103–107) hardcodes a `userId`. With this fix that check will now fail (no `pending_login` cookie); the script must be updated to carry the cookie from the multi-business login response and stop hardcoding `userId`.
- **Delete `switch-tenant`**: `src/app/api/auth/switch-tenant/route.ts` is now unused by the main UI after the AppShell migration and should be removed in a separate change.
- `src/lib/crypto.ts:8` still uses a hardcoded fallback key for credential encryption (separate issue, `<REDACTED>`).
