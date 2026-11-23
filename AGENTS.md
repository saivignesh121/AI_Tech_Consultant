# Project rules for coding agents

## Scope
- Work on exactly ONE audit issue per session unless told otherwise.
- Do not modify unrelated files or reformat code you are not changing.
- Do not add dependencies unless the issue cannot be fixed without one. Justify any addition in the fix doc.
- Do not remove or rewrite code outside the issue's root cause.

## Forbidden actions
- Do not read `.env`, `.env.*`, or any file containing credentials. Use `.env.example` for variable names only.
- Do not run migrations, seed scripts, or any command that connects to Neon, Render, or any production database.
- Do not run the full integration suite against a real database.
- Never write real passwords, API keys, tokens, or secrets into code, tests, or docs. Use environment variables and placeholders such as `<REDACTED>`.

## Decisions that require a human
Stop and ask before:
- changing a database schema or a production table,
- changing a public API contract,
- choosing a new library,
- editing more than three files for one issue.

## Verification
- A test must fail before the fix and pass after it. If it cannot fail first, say so.
- Run only the targeted tests with `npx vitest run <file> -t "<name>"`. Report the exact commands and results.
- Run `npm run typecheck` on changed files when relevant.

## Fix documentation
Every fixed issue gets `docs/fixes/<ID>-<short-slug>.md`, using `docs/fixes/TEMPLATE.md`.
Use these statuses: Fixed, Not confirmed, Blocked.

## Newly found bugs
Do not fix them. List each one under "Newly found (not fixed)" in the fix doc with file and line.
