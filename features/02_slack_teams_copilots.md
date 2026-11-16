# Feature Idea 2: Slack & Microsoft Teams Support Copilot

## 1. The Problem It Solves, and For Whom
- **Target User:** Support engineers and customer success managers collaborating in Slack or Microsoft Teams.
- **Problem:** When a customer escalates an issue in a shared Slack Connect channel or internal `#support-triage` channel, engineers still have to context-switch to the web dashboard to query the Knowledge Brain or record a correction.

## 2. Who Would Pay For It, and Why
- **Buyer:** Mid-market B2B software companies ($99–$299/month Team tier).
- **Why They Pay:** Keeps support engineers inside Slack/Teams, cuts ticket resolution time by ~35%, and turns engineer corrections in Slack threads directly into approved Knowledge Brain `Instructions` and `Skills`.

## 3. The User Flow (Step-by-Step)
1. Workspace Owner connects Slack via OAuth2 (`commands`, `app_mentions:read`, `chat:write`) in **Settings → Keys & Connections**.
2. In Slack, an engineer types `/ask-consultant How do I configure custom CNAME SSL?` or mentions `@AI Tech Consultant` inside a thread.
3. FastAPI verifies the Slack HMAC signature (`X-Slack-Signature`), maps `slack_team_id` to `business_id`, sets RLS context, and calls `hybrid_retrieve_context()`.
4. Bot posts a threaded answer with source citations and two interactive Block Kit buttons: **✅ Helpful** and **✏️ Teach Correction**.
5. Clicking **✏️ Teach Correction** opens a Slack modal; submitting the fix stages a new `Instruction` or `EvalTestCase` in the tenant's workspace.

## 4. Screens and Tabs Needed (Task 0 Map Placement)
- **Settings → Keys & Connections (`/settings/connections`):** Add Slack App OAuth card with channel-to-`AgentRole` mapping (e.g., `#engineering-help` -> `Support Engineer`, `#sales-questions` -> `AI Consultant`).
- **Knowledge Brain → Instructions (`/knowledge?tab=instructions`):** Badge indicator showing rules learned via Slack.

## 5. New Tables and Columns (Linked to `DATABASE.md`)
- **`slack_installations`:** `id` (UUID PK), `business_id` (UUID FK -> `businesses.id`, RLS enabled), `slack_team_id` (VARCHAR(64) unique), `encrypted_bot_token` (TEXT, AES-GCM encrypted), `default_role_slug` (VARCHAR(100)), `installed_at` (TIMESTAMPTZ).
- **`slack_channel_mappings`:** `id` (UUID PK), `business_id` (UUID FK), `slack_channel_id` (VARCHAR(64)), `role_id` (UUID FK -> `agent_roles.id`).

## 6. How It Connects to Built Features
- **Feature 1 (`feature_1_workspace`):** Uses `connections_crypto.py` (AES-GCM) to encrypt Slack bot tokens and maps channels to `AgentRole` records.
- **Feature 2 (`feature_2_knowledge_brain`):** Calls `hybrid_retrieve_context()` for answers and writes Slack modal corrections into `instructions`.
- **Feature 3 (`feature_3_chat`):** Shares the exact same prompt-injection filter and escalation classifier.

## 7. How We Measure That It Works
- **Done when:** A Slack slash command responds within Slack's 3-second acknowledgment window (posting the full cited answer asynchronously via Procrastinate), and submitting a Slack correction modal creates a live `Instruction` in PostgreSQL that updates the next answer.

## 8. Risks and What Could Go Wrong
- **Slack 3-Second Timeout:** LLM inference + RAG retrieval can take 2–4 seconds, causing Slack to show `operation_timeout`. *Mitigation:* Immediately return HTTP 200 ephemeral acknowledgment and enqueue a Procrastinate worker job to post the final answer to `response_url`.
- **Token Leakage:** Bot tokens logged in webhook traces. *Mitigation:* Encrypt via `encrypt_value()` and strip headers before logging.

## 9. Build Time Estimate
- **Total Estimate:** **16 hours** (5h Slack OAuth + HMAC verification, 6h async Procrastinate responder + Block Kit cards, 5h Teach modal + tests).
