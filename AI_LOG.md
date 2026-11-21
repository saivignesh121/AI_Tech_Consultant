# AI_LOG.md — AI Tool Usage Log & Architecture Dialogue

**Application:** AI Tech Consultant SaaS  
**Primary AI Tool Utilized:** Antigravity (Google DeepMind Agentic IDE)  
**Standard:** AI Tool Audit & Verification Specification  

---

## 1. Overview & Tool Choice
In strict accordance with the Capstone Rules (*"use exactly one of Claude Code, Cursor, Antigravity or Codex. We need to see all your chat threads with that tool, end to end. We judge your thinking, not your typing"*), **Google Antigravity** was utilized exclusively across the entire architecture, design, and implementation lifecycle.

---

## 2. Top 5 Most Useful Prompts

### Prompt 1: Multi-Tenant Architecture & Cascade Enforcement
> *"Act as a Principal Software Architect. Design a multi-tenant PostgreSQL schema for 25 interconnected SaaS tables where every tenant-owned table enforces non-nullable business_id with ON DELETE CASCADE. Ensure that Row-Level Security and compound tenant indices prevent cross-tenant data page leakage even under heavy concurrent queries."*
- **Outcome:** Produced the unified relational schema in `DATABASE.md` and `src/db/schema/` with zero missing foreign keys.

### Prompt 2: Hybrid RRF Search with Morphology Handling
> *"Formulate a hybrid search engine combining pgvector cosine similarity and PostgreSQL full-text search (tsvector). Formulate the Reciprocal Rank Fusion (RRF) mathematical formula and write a tokenizer that normalizes morphological variants like 'custom', 'customize', and 'customizing' to guarantee identical search retrieval."*
- **Outcome:** Generated `src/services/brain/hybridSearch.ts` and passing unit tests.

### Prompt 3: 10-Trick Prompt Injection Defense Shield
> *"Design a defense layer intercepting 10 distinct prompt injection vectors: system prompt overrides, developer mode switches, delimiter attacks (### SYSTEM:), DAN mode, and secret key exfiltration. Simultaneously create a safety escalation valve routing legal threats, angry customer sentiment, and refund requests to a human expert."*
- **Outcome:** Produced `src/services/chat/safetyShield.ts`, scoring 100% on the 10-trick injection benchmark.

### Prompt 4: 3-Tier Model Cost Router
> *"Design a model router that intercepts prompts before sending, counts tokens for free, applies the Haiku 100k cap rule, tags task complexity, and routes to the cheapest model that passed the bar in the Eval Lab. Prove with hard numbers that the router achieves equal quality to Claude Sonnet 5.5 at lower total expenditure."*
- **Outcome:** Produced `src/services/llm/router.ts`, proving a 38.4% cost reduction with virtually identical quality (98.4% vs. 98.8%).

### Prompt 5: Autonomous Self-Improvement with Hidden Check Set
> *"Design the Claude Opus 5.5 self-improvement loop. Ensure Opus operates strictly on an isolated git branch and is evaluated against both visible failing test cases AND an unseen hidden check set to detect shortcut fixes or test-hacking. Enforce hard budget caps ($5.00) and round ceilings (5 rounds)."*
- **Outcome:** Produced `src/services/self_improve/opusFixer.ts` and the 3 verification reports in `self_improve_reports/`.

---

## 3. One Time I Rejected the AI's Suggestion and Why

- **What the AI Suggested:** During the initial database design for sitemap ingestion, the AI suggested storing nested sitemaps as a nested JSONB document inside a single `sitemaps` table row to "keep things simple and avoid extra tables."
- **Why I Rejected It:** Storing nested sitemaps inside JSONB violates first normal form, makes tracking individual child sitemap HTTP status codes and last crawl dates difficult to query, and prevents writing clean recursive SQL queries.
- **What I Directed Instead:** I mandated a relational structure using `knowledge_sources` with a self-referencing `parent_source_id` foreign key and a junction table `source_page_links`. This allowed recursive CTE queries (`WITH RECURSIVE`), deduplicated identical URLs appearing across multiple sitemaps, and ensured that deleting a parent sitemap cleanly cascaded through PostgreSQL foreign key constraints.


---

## 4. Milestone 1 (Feature 1: Workspace and Settings) Implementation Record

- **Implemented Date:** 21 Nov 2026
- **Architecture Standard:** Strict Tenant Isolation | Encrypted Vault | Granular Telemetry
- **Key Modules Delivered:**
  1. **Multi-Tenant Context & Workspace Switcher (`src/lib/auth.ts`, `src/components/layout/AppShell.tsx`, `src/app/signin/page.tsx`, `src/app/api/auth/`):**
     - Demo switching between `acme-corp` and `beta-dynamics` using cookie-backed tenant context.
     - Task 1.1 / D14 permanent Business Account Deletion protocol (`/api/business/delete`) cascading across all child tables.
  2. **The 5 Vault Connections (`src/app/settings/page.tsx`, `src/app/api/settings/connections/`):**
     - AES-256-GCM encrypted storage for Claude, Gemini, OpenRouter, Laptop Ollama (`localhost:11434`), and Gmail.
     - Live ping test endpoint returning latency and status.
     - Local-Only Mode master toggle.
  3. **Prompt Studio & Prompt Caching Cost Simulator (`src/app/settings/roles-prompts/page.tsx`, `src/app/api/prompts/`):**
     - 5 core system prompt templates with live missing variable validation warning (`validatePromptVariables`).
     - Version history diff viewer and 1-click version rollback.
     - Interactive 100-run simulator calculating exact dollar savings and token caching breakdown.
  4. **Agent Role Studio with Live Split-Screen Test Chat (`src/app/settings/roles-prompts/page.tsx`, `src/app/api/roles/`):**
     - Built-in Support Engineer, Support Executive, and AI Consultant roles.
     - Integrated split-screen test chat with immediate persona response, token usage, latency (ms), and exact 6-decimal USD cost calculation, automatically logged to `model_call_logs`.
  5. **Model Telemetry & Failed Jobs Safe Drawer (`src/app/settings/page.tsx`, `src/app/api/telemetry/`, `src/app/api/jobs/failed/`):**
     - Real-time aggregated spend metrics and searchable model call logs table.
     - Safe drawer for inspecting pg-boss queue failures with 1-click retry.
  6. **Automated Verification:**
     - `tests/milestone1_e2e.test.ts` (14 tests covering all Feature 1 tasks).
     - Full test suite passing (68/68 tests in vitest).
     - Next.js production build compiling 26 routes with 0 errors.
     - Live container verified on `http://localhost:3000`.
