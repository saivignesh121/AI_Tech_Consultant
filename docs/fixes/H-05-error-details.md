# H-05: Internal error details are returned to clients (login route)

- Severity: HIGH
- Audit reference: H-05 "Internal error details are returned to clients"
- Status: Fixed
- Date: 2026-11-23

## Problem

`POST` in `src/app/api/auth/login/route.ts` returned the caught exception in
the HTTP response body: `{ error: "Login failed", details: String(error) }`.
Any failure during login returned `error.message` and, for some error shapes,
internal stack/context text to the client. The `details` value also exposed
SQL, file paths, and driver messages, which helps an attacker fingerprint the
backend.

## Root cause

The catch-all handler serialized the raw `Error` into the response instead of
logging it server-side. There was no single error-response helper, so each
route did its own thing and the login route chose to include the detail.

## Fix

- `src/app/api/auth/login/route.ts`: the catch block now logs the error with
  `console.error("Login failed:", error)` and returns only
  `{ error: "Login failed" }` with status 500. Status code is unchanged, so
  callers that branch on 500 keep working; only the `details` field is gone.
- No new dependency, no API contract change other than removing the leaked
  field.

## Verification

- Test(s) added or changed: `tests/h_05_error_details.test.ts` (pre-existing
  audit test, unchanged). It mocks `@/db` to throw and asserts the response has
  no `details` property and status 500.
- Commands run and results:
  - `npx vitest run tests/h_05_error_details.test.ts` before the fix:
    FAIL — `AssertionError: expected { error: 'Login failed', …(1) } to not have property "details"`, received `"Error: forced db failure"`.
  - `npx vitest run tests/h_05_error_details.test.ts` after the fix: PASS
    (1 test), with the error logged to stderr as expected.
  - `npx tsc --noEmit`: no errors.
- Not verified: the remaining `details: String(error)` sites listed in the
  audit report were not exercised.

## Risks and follow-up

- This closes H-05 only for the login route. The audit report lists 79
  `details: String(error)` sites in total, including
  `src/app/api/auth/register/route.ts:164-165`. Those still leak internal
  error text and should be fixed under the same issue ID in follow-up
  sessions (each is a small, identical change but spans far more than three
  files, so it needs a human decision on scope/batching).
- Logging the raw error server-side can include DB host/user info in logs.
  Logs are not client-visible, but log retention and access should be
  reviewed separately.

## Newly found (not fixed)

- `src/app/api/auth/login/route.ts:114-116`: the readiness-score lookup is
  wrapped in a catch that sets `readinessScore = 100` on any error. A failing
  DB read therefore routes the user past onboarding as if their profile were
  fully complete, and hides the failure from logs.
- `src/app/api/auth/register/route.ts:164-165`: same `details: String(error)`
  leak as H-05, not addressed here.
