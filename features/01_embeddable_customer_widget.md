# Feature Idea 1: Embeddable White-Label Customer Support Widget

## 1. The Problem It Solves, and For Whom
- **Target User:** SaaS founders, support leads, and end-customers visiting a tenant's documentation site or web app.
- **Problem:** Ask & Teach Chat (`/chat`) is currently an internal operator console. Customers cannot ask questions directly inside the tenant's own product or help center without an agent manually pasting tickets into `/chat`.

## 2. Who Would Pay For It, and Why
- **Buyer:** B2B SaaS companies and developer tool startups ($49–$199/month add-on tier).
- **Why They Pay:** Deflects 40–65% of repetitive Tier-1 support tickets before they reach Gmail or Zendesk, while preserving tenant branding, `AgentRole` personas, and mandatory human escalation for billing/legal issues.

## 3. The User Flow (Step-by-Step)
1. Workspace admin opens **Settings → Web Widget** (linked from Go Live Step 3), customizes brand color, welcome greeting, and default `AgentRole` (e.g., `Support Executive`).
2. System generates a tenant-scoped public widget key (`wk_live_...`) and a 3-line `<script>` embed snippet.
3. End-user opens the widget on the client's website and submits a question.
4. FastAPI validates the HTTP `Origin` header + `wk_live_...` token, sets `app.current_business_id`, masks PII, runs `hybrid_retrieve_context()`, and streams a cited answer via the 3-Step Model Router.
5. If confidence is below threshold or refund/legal triggers fire, the widget collects the user's email and creates a human escalation task.

## 4. Screens and Tabs Needed (Task 0 Map Placement)
- **Settings → Web Widget (`/settings/widget`) & Link from Go Live (`/go-live`):**
  - **Widget Customizer Tab:** Brand hex picker, allowed origins list, default `AgentRole` selector, and copyable `<script>` snippet.
  - **Live Widget Preview Drawer:** Interactive sandbox iframe showing the end-user bubble live against the tenant's Knowledge Brain.

## 5. New Tables and Columns (Linked to `DATABASE.md`)
- **`widget_configs`:** `id` (UUID PK), `business_id` (UUID FK -> `businesses.id`, unique, RLS enabled), `public_key` (VARCHAR(64) unique), `allowed_origins` (TEXT[]), `default_role_id` (UUID FK -> `agent_roles.id`), `brand_hex` (VARCHAR(7)), `welcome_message` (TEXT), `is_enabled` (BOOLEAN), `created_at` (TIMESTAMPTZ).
- **`chat_threads` (alteration):** Add `channel` (`VARCHAR(32) DEFAULT 'internal_console'`, allowing `'web_widget'`) and `visitor_email` (`VARCHAR(255) NULL`).

## 6. How It Connects to Built Features
- **Feature 1 (`feature_1_workspace`):** Uses `AgentRole` personas, `shared/pii.py` masking, `shared/llm_gateway.py` cost logging, and PostgreSQL RLS isolation.
- **Feature 2 (`feature_2_knowledge_brain`):** Calls `hybrid_retrieve_context()` API directly—never duplicates retrieval logic.
- **Feature 3 (`feature_3_chat`):** Reuses prompt injection guardrails and escalation rules; thumbs-down ratings feed into `EvalTestCase`.
- **Feature 4 (`feature_4_eval_lab`):** Widget traffic obeys the tenant's active Release Gate and 3-Step Model Router table.

## 7. How We Measure That It Works
- **Done when:** A tenant embeds the `<script>` tag on a local test HTML page, asks 10 questions (including 1 prompt injection and 1 refund request), receives cited answers in `<1.5s` p95 latency, blocks the injection, routes the refund to human escalation, and isolates cross-tenant queries 100% under RLS.

## 8. Risks and What Could Go Wrong
- **Origin Spoofing / Token Abuse:** A third party copying `wk_live_...` to drain LLM credits. *Mitigation:* Strict HTTP `Origin` allowlist verification + per-IP token-bucket rate limiting (20 req/min) + daily spend cap.
- **Unauthenticated RLS Bypass:** Public widget endpoints lack a user cookie. *Mitigation:* Resolve `business_id` exclusively from `widget_configs.public_key` inside a dedicated read-only lookup before calling `SET LOCAL app.current_business_id`.

## 9. Build Time Estimate
- **Total Estimate:** **14 hours** (4h DB/auth key validation + rate limiter, 6h embeddable JS/HTMX widget UI, 4h security & cross-tenant pytest suite).
