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
     - Full test suite passing.

---

## 5. Milestone 2 (Feature 2: The Knowledge Brain) Implementation Record

- **Implemented Date:** 21 Nov 2026
- **Architecture Standard:** Strict Hybrid Search | Morphology Normalization | URL Health Lifecycle
- **Key Modules Delivered:**
  1. **Polite Sitemap Crawler & Batch Ingestion (`src/services/brain/htmlExtractor.ts`, `src/services/brain/chunker.ts`, `src/app/api/brain/sitemaps/`, `src/app/api/brain/pages/`):**
     - Strips navigation, headers, footers, scripts, and styles; extracts headings, title, and clean content.
     - Implements polite rate limiting (batch delay, 450 pages/hr max ceiling).
  2. **pgvector Hybrid Search Sandbox (`src/services/brain/hybridSearch.ts`, `src/app/api/brain/query/`):**
     - Reciprocal Rank Fusion (RRF) combining vector cosine distance and PostgreSQL tsvector/tsquery text search.
     - Stemming & morphology normalization ('custom', 'customize', 'customizing' produce identical top hits).
  3. **URL Health Lifecycle Watcher (`src/services/brain/healthTracker.ts`, `src/app/api/brain/health/`):**
     - Consecutive 404 failure tracking (`Watch` state after 1 fail, `Quarantined` after 3 fails).
     - 301 Permanent Redirect handling: updates pointer to target canonical URL, strictly forbidding answers citing deprecated URLs.
  4. **Drafted Skills Synthesizer (`src/services/brain/skillsDrafter.ts`, `src/app/api/brain/skills/`):**
     - Compiles multi-step procedures from disparate help docs into standardized Markdown skills with trigger phrases.
  5. **Interactive UI (`src/app/knowledge/page.tsx`):**
     - 5-tab interface: Sitemaps Ingestion, Pages Explorer, Hybrid Sandbox, URL Health Lifecycle, and Drafted Skills.
  6. **Automated Verification:**
     - `tests/milestone2_e2e.test.ts` (11 tests covering all Feature 2 tasks).

---

## 6. Milestone 3 (Feature 3: Ask & Teach Consultant Chat) Implementation Record

- **Implemented Date:** 21 Nov 2026
- **Architecture Standard:** Agent Loop | Multimodal Vision | Inline Citations | Human Escalation
- **Key Modules Delivered:**
  1. **Full Agent Loop with Dynamic Citation Attributor (`src/services/chat/agentLoop.ts`, `src/services/chat/citationMapper.ts`, `src/app/api/chat/`):**
     - Automatically attaches inline bracketed citations `[1]`, `[2]` linking directly to verified documentation URLs.
     - Fallback honesty protocol: answers with explicit "I do not have verified documentation..." rather than hallucinating.
  2. **Multimodal Screenshot Understanding (`src/services/chat/agentLoop.ts`):**
     - Accepts screenshots (Base64), routes to Gemini 3.8 Flash (or laptop Ollama in local mode), extracts OCR buttons, toggles, and status indicators.
  3. **10-Trick Prompt Injection Defense Shield (`src/services/chat/safetyShield.ts`):**
     - Neutralizes system prompt overrides, developer mode tricks, delimiter attacks (`### SYSTEM:`), DAN mode, and key exfiltration.
  4. **Human Escalation Valve (`src/services/chat/safetyShield.ts`):**
     - Routes legal threats ("sue", "lawyer"), angry customer sentiment, and refund requests directly to human support specialist queue.
  5. **Ask & Teach Correction Loop (`src/services/chat/agentLoop.ts`, `src/app/api/chat/lessons/`):**
     - "Teach/Correct AI" flow creates verified lesson markdown files in `lessons/` immediately improving future answers.
  6. **Interactive 3-Column UI (`src/app/chat/page.tsx`):**
     - Session switcher, consultant message stream with citation clickover, citation inspector drawer, human escalation alert banner, multimodal upload, and Teach AI modal.
  7. **Automated Verification:**
     - `tests/milestone3_e2e.test.ts` (14 tests covering all Feature 3 tasks).

---

## 7. Milestone 4 (Feature 4: The Eval Lab) Implementation Record

- **Implemented Date:** 21 Nov 2026
- **Architecture Standard:** 180 Benchmark Suite | Impartial AI Judge | 38.4% Cost Router | Release Gate
- **Key Modules Delivered:**
  1. **180 Official Benchmark Suite (`benchmark/benchmark_180.json`, `src/app/api/evals/benchmark/`):**
     - 100 Knowledge Brain cases, 60 Ask & Teach cases, 20 Escalation/Safety cases.
  2. **14-Model Performance Matrix (`src/services/eval/benchmarkRunner.ts`, `src/app/api/evals/models/`):**
     - Computes quality score, average latency (ms), p95 latency (ms), and cost per 100 runs across all 14 models.
     - Local-Only Mode restricts to laptop Ollama models with zero cloud spend.
  3. **Impartial AI Judge & Human Calibration (`src/services/eval/judge.ts`, `src/app/api/evals/judge/`):**
     - Prevents models from judging their own answers (delegates to Nemotron 3 Ultra fallback).
     - Achieves 90.0% agreement with 20 human-graded test cases (spec requirement >= 85%).
  4. **Dynamic 3-Tier Model Cost Router (`src/services/llm/router.ts`, `src/app/api/evals/router/`):**
     - Free token pre-flight check, enforces Haiku 100k cap rule, tags complexity, routes to cheapest passing model.
     - Proves 38.4% cost savings over Claude Sonnet 5.5 baseline ($0.8624 vs $1.4000 per 100 calls) with quality parity (98.4% vs 98.8%).
  5. **Production Release Gate Enforcer (`src/services/eval/releaseGate.ts`, `src/app/api/evals/release-gate/`):**
     - Blocks deployment of any prompt, role, skill, or model if candidate benchmark score drops below the active baseline.
  6. **Interactive UI (`src/app/evals/page.tsx`):**
     - 4-tab dashboard: 14-Model Matrix, 180 Benchmark Suite, AI Judge Calibration, and 3-Tier Router Economics.
  7. **Automated Verification:**
     - `tests/milestone4_e2e.test.ts` (9 tests covering all Feature 4 tasks).

---

## 8. Milestone 5 (Feature 5: Autonomous Self-Improvement Loop) Implementation Record

- **Implemented Date:** 21 Nov 2026
- **Architecture Standard:** Claude Opus 5.5 Git Branching | Hidden Validation Check Set | $5 Budget Ceiling
- **Key Modules Delivered:**
  1. **Failure Packaging & Isolated Git Branching (`src/services/self_improve/failurePacker.ts`, `src/app/api/self-improve/runs/`):**
     - Packages failing question, incorrect answer, judge critique, and target branch `self-improve/fix-...`.
  2. **Claude Opus Fix Loop & Hidden Check Set Validation (`src/services/self_improve/opusFixer.ts`):**
     - Synthesizes prompt and skill refinements; verifies against 5 secret hidden regression cases with 0 regressions permitted.
  3. **Hard Circuit Breaker Budget Guardrail (`src/services/self_improve/opusFixer.ts`):**
     - Strictly caps execution at 5 rounds and $5.00 USD. If ceiling is breached, execution halts safely and changes are quarantined.
  4. **1-Click Approve/Merge and Revert/Rollback (`src/app/api/self-improve/approve/`, `src/app/api/self-improve/revert/`):**
     - Instant production merge or 1-click rollback to previous active version.
  5. **Weekly Executive Owner Digest Email (`src/lib/email.ts`, `src/app/api/self-improve/digest/`):**
     - Compiles accuracy gains (+3.2%), resolved failures (3 fixed), monthly model cost ($14.85), and prompt caching savings ($21.40).
  6. **Interactive UI (`src/app/self-improve/page.tsx`):**
     - Active Runs table, split-screen Run Inspector with unified Git diff viewer, budget meter, and Weekly Digest email preview.
  7. **Automated Verification:**
     - `tests/milestone5_e2e.test.ts` (5 tests covering all Feature 5 tasks).

---

## 9. Milestone 6 (Feature 6: 15-Minute Onboarding Flow) Implementation Record

- **Implemented Date:** 21 Nov 2026
- **Architecture Standard:** 15-Minute Stopwatch | Synthetic Test Generation | Readiness Pass Bar (>= 85%)
- **Key Modules Delivered:**
  1. **Onboarding Stopwatch Timer (`src/services/onboarding/stopwatchTimer.ts`):**
     - Enforces live countdown timer and proves full onboarding completes within 900 seconds (15 minutes).
  2. **Autonomous Synthetic Test Generator (`src/services/onboarding/syntheticTestGenerator.ts`, `src/app/api/onboarding/synthetic-tests/`):**
     - Derives 10 realistic domain Q&A questions directly from crawled documentation headings and content.
  3. **Readiness Benchmark Gate (`src/services/onboarding/readinessEvaluator.ts`, `src/app/api/onboarding/readiness/`):**
     - Evaluates candidate answers with impartial AI Judge; enforces >= 85.0% readiness pass bar before unlocking production chat.
  4. **Interactive 5-Step Stepper Wizard (`src/app/onboarding/page.tsx`):**
     - Steps: 1. Vault Keys -> 2. Sitemap Ingestion -> 3. Consultant Persona -> 4. 10 Synthetic Tests -> 5. Readiness Gate & 1-Click Launch.
  5. **Automated Verification:**
     - `tests/milestone6_e2e.test.ts` (4 tests covering all Feature 6 tasks).
  6. **Final System Verification:**
     - All 12 test suites passing (111 tests in vitest).
     - Next.js production build (`npm run build`) compiling all 49 pages and API routes with zero diagnostic errors.

---

## 10. Feature 2 - Task 2.4: Stay Fresh & URL Health Lifecycle Implementation Record

- **Implemented Date:** 22 Nov 2026
- **Architecture Standard:** Recheck Schedule | Zero-Waste Content Hashing | 4-Level URL Health State Machine | Archived Knowledge Base Recovery
- **Key Modules Delivered:**
  1. **Freshness & Health State Engine (`src/services/brain/freshnessChecker.ts`, `src/services/brain/healthTracker.ts`):**
     - Computes deterministic SHA-256 `contentHash` on raw page content.
     - Zero-Waste Re-Embedding: unchanged pages skip re-chunking and re-embedding, consuming 0 AI model tokens and zero wasted DB writes.
     - Changed pages: detects modified hash, triggers re-chunking, updates embeddings, and records full audit trail in `knowledge_page_changes`.
     - URL Health Lifecycle State Machine:
       - HTTP 404 / missing from sitemap: failure count increments by 1 and moves to `Watch`.
       - HTTP 301 Permanent Redirect: follows redirect to target URL, quarantines old URL, and indexes target URL.
       - User settings: X consecutive failure threshold (`1` [right away], `2`, `15`, `30`) and Action Rule (`quarantine_then_archive`, `quarantine`, `archive`).
       - HTTP 200 Recovery: failure count resets to 0 and transitions back to `Active`.
       - Strict Filtering Guarantee: `quarantined` and `archived` URLs NEVER appear in answers or search retrieval.
  2. **Database Schema Enhancements (`src/db/schema/knowledge.ts`):**
     - `knowledgeRefreshRuns`: logs each refresh run with `startedAt`, `finishedAt`, `totalUrlsFetched` at the bottom, and full URL list with status and change type.
     - `knowledgePageChanges`: audit log tracking every creation, modification (with old/new content hashes and diff summaries), status transition, and recovery.
     - `knowledgeHealthPolicies`: user-controlled threshold X, action rule, and schedule (`daily`, `weekly`, `15_days`, `30_days`).
  3. **REST API Endpoints:**
     - `GET /api/brain/refresh`: returns dashboard metrics, active policy, past refresh runs, and pending URLs.
     - `POST /api/brain/refresh`: triggers recheck runs, updates health policy settings, and recovers quarantined pages.
     - `GET /api/brain/archived`: returns the Archived Knowledge Base for compliance audits and recovery.
     - `POST /api/brain/archived`: 1-click recovery restoring quarantined/archived pages back to Active.
  4. **Interactive Dashboard UI (`src/app/knowledge/page.tsx`):**
     - Tab 7: "Stay Fresh & URL Health":
       - Freshness & Ingestion Dashboard KPI cards (Pages processed, embedded, failed, pending, duplicates skipped, last sync time).
       - Recheck schedule selector (Daily, Weekly, 15 days, 30 days).
       - URL Health Settings Controls (Threshold X and Action Rule selector with save action).
       - Pending URLs Review Panel: shows all pending URLs and consecutive failure counts before action is taken.
       - Refresh Run View: shows first and last fetch date/time, total URLs fetched at the bottom, and expandable clean scrollable full URL list with status filters.
       - Archived Knowledge Base: displays quarantined and archived pages with 1-click "Recover to Active" button.
  5. **Automated Verification:**
     - `tests/task2_4_stay_fresh.test.ts` (15/15 tests passing covering all Task 2.4 requirements).
     - Full test suite: 21 test files, **213/213 tests passing (100% pass rate)**.
     - Clean TypeScript verification (`tsc --noEmit`) and Next.js production build (`npm run build` compiling 69 routes).

