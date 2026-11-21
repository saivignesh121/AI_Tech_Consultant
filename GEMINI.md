# GEMINI.md — Project Governance & Engineering Standards
**Project:** AI Tech Consultant (Production-Grade Multi-Tenant SaaS)
**Architecture Standard:** Strict Tenant Isolation | PII Masking | Model & Cost Telemetry | Zero-Defect Modular Architecture

---

## 1. Selected Technology Stack (Strict End-to-End TypeScript)
In strict accordance with Step 2 of the Capstone Specification, the entire repository uses a single language without mixing:
- **Language & Runtime:** TypeScript (Strict Mode, `noImplicitAny: true`, typed end-to-end) running on Node.js v24+.
- **Frontend & Full-Stack Framework:** Next.js 16 (App Router, Server Components & Route Handlers, React 19).
- **ORM & Database Client:** Drizzle ORM (schema definitions, relations, type-safe queries, pgvector extension).
- **Database:** PostgreSQL 18 with `pgvector` (>= 0.8.7) for vector embeddings and PostgreSQL Full-Text Search (`tsvector`/`tsquery` and `pg_trgm`) for hybrid search.
- **Background Jobs & Scheduled Workers:** `pg-boss` (Postgres-native job queue, zero Redis dependency at startup) wrapped behind a clean job runner interface.
- **Styling & UI Components:** Tailwind CSS, Lucide React icons, Radix UI primitives / accessible headless components.
- **Containerization & One-Command Run:** Docker Compose (`docker-compose.yml`) spinning up PostgreSQL 18 with pgvector, the Next.js app, and the background worker runner.

---

## 2. Multi-Tenant Isolation Rules (Zero-Leakage Guarantee)
Every business signing up to AI Tech Consultant is an isolated tenant.
1. **Mandatory Tenant Scoping (`business_id`):**
   - Every single business-owned table (`users`, `api_connections`, `prompts`, `prompt_versions`, `agent_roles`, `knowledge_sources`, `knowledge_pages`, `knowledge_chunks`, `instructions`, `skills`, `skill_versions`, `email_threads`, `chat_sessions`, `chat_messages`, `chat_traces`, `model_logs`, `eval_runs`, `eval_cases`, `eval_results`, `lessons`, `self_improve_runs`, `failed_jobs`) MUST contain a non-nullable `business_id` foreign key referencing `businesses(id) ON DELETE CASCADE`.
2. **Database Queries:**
   - Every SELECT, UPDATE, DELETE, and INSERT must explicitly filter on `business_id`.
   - Never write an unscoped query. In Drizzle ORM, queries must include `eq(table.businessId, currentTenantId)`.
3. **Session & Middleware Enforcement:**
   - The authenticated tenant context (`business_id`) is resolved via authenticated session token/cookies and injected into the request context.
   - Any API request attempting to access or modify data belonging to another `business_id` returns an immediate HTTP 403 / 404 Forbidden.
4. **Tenant Deletion Protocol (Task 1.1 / D14):**
   - When a business owner requests account deletion, all records, embeddings, files, cached chunks, and vector rows are completely wiped via cascading foreign keys and disk/blob purge.
   - Tenant isolation verification tests MUST be run in CI to prove Business A can never access Business B's data under any condition.

---

## 3. Model Telemetry & Cost Logging Rules (Task 1.5 & Task 4.3)
Every model invocation across any feature (Knowledge Brain ingestion, chat replies, role testing, prompt generation, evals, self-improvement, routing checks) MUST be logged with complete precision.
1. **Telemetry Fields Logged (`model_call_logs`):**
   - `id` (UUIDv7 / nanoid)
   - `business_id` (UUID)
   - `task_type` (e.g., `tag_job`, `find_facts`, `write_reply`, `read_screenshot`, `improve_skill`, `judge_eval`, `self_improve`)
   - `model_id` (exact model name from the 14 supported models)
   - `prompt_version_id` (foreign key to the exact prompt version utilized)
   - `role_id` (if invoked within an agent role context)
   - `input_tokens` (exact count from API or token counter)
   - `output_tokens` (exact count from response usage)
   - `cached_read_tokens` / `cached_write_tokens` (tracking Claude prompt caching savings)
   - `duration_ms` (end-to-end invocation latency)
   - `cost_usd` (calculated to 6 decimal places using exact rates per 1M tokens)
   - `status` (`success`, `error`, `fallback_rerouted`)
   - `created_at` (timestamp)
2. **Official Model Price Table (Checked 12 Nov 2026):**
   | # | Model Identifier | Provider / Runner | Input / Output (per 1M tokens) |
   |---|------------------|-------------------|--------------------------------|
   | 1 | `claude-opus-5.5` | Claude API | $4.00 / $20.00 |
   | 2 | `claude-sonnet-5.5` | Claude API | $2.00 / $10.00 |
   | 3 | `claude-haiku-5.5` | Claude API | $0.10 / $0.50 (<=100k) ; $0.50 / $2.50 (>100k) |
   | 4 | `gemini-3.8-flash` | Gemini API | $0.75 / $3.75 |
   | 5 | `gemini-3-flash` | Gemini API | $0.50 / $3.00 |
   | 6 | `gemini-2.5-flash-lite` | Gemini API | $0.10 / $0.40 |
   | 7 | `nvidia/nemotron-3-ultra-550b-a55b:free` | OpenRouter (Free) | $0.00 / $0.00 |
   | 8 | `nvidia/nemotron-3.5-super-vl:free` | OpenRouter (Free) | $0.00 / $0.00 |
   | 9 | `nvidia/nemotron-3.5-lightning:free` | OpenRouter (Free) | $0.00 / $0.00 |
   | 10 | `google/gemma-4-31b-it:free` | OpenRouter (Free) | $0.00 / $0.00 |
   | 11 | `qwen/qwen3.8-max-0902` | OpenRouter | $2.00 / $6.00 |
   | 12 | `qwen/qwen3.7-flash` | OpenRouter | $0.03 / $0.13 (<=32k) |
   | 13 | `gemma4:e4b` | Laptop Ollama (`localhost:11434`) | $0.00 / $0.00 |
   | 14 | `qwen3.5:4b` | Laptop Ollama (`localhost:11434`) | $0.00 / $0.00 |
3. **Local-Only Mode:**
   - When toggled, all paid cloud APIs are bypassed; only `gemma4:e4b` and `qwen3.5:4b` via `localhost:11434` are utilized.

---

## 4. Privacy, PII Masking & Safety Standards
1. **PII Masking Before Ingestion/Inference (Task 1.5):**
   - Phone numbers, credit card numbers, personal addresses, and sensitive national IDs must be scrubbed or masked (e.g., `[REDACTED_PHONE]`, `[REDACTED_CARD]`) before text is transmitted to external model APIs or stored in query logs.
2. **Prompt Injection Shield (Task 3.6):**
   - High-risk patterns, system prompt overrides, delimiter attacks, and hidden instructions in pasted user messages or scraped documents must be intercepted by the input sanitization & shield layer. Tested against 10 trick injection scenarios.
3. **Human Escalation Safety Valve:**
   - Any detected legal threat ("lawyer", "legal action", "sue"), angry customer sentiment exceeding threshold, or refund request MUST bypass autonomous answering and flag a "Send to a Human" task.

---

## 5. Coding Conventions & Code Reliability
- **Strict Typing:** All data structures, API contracts, ORM models, and tool parameters must have explicit TypeScript types or Zod schemas. No `any` types.
- **Decoupled Architecture:**
  - `src/db/`: Drizzle schemas, migrations, relations, db connection pool.
  - `src/services/brain/`: Knowledge Brain ingestion, chunking, embedding, hybrid search.
  - `src/services/llm/`: Unified provider clients (Anthropic, Gemini, OpenRouter, Ollama), cost calculator, token counters, router.
  - `src/services/chat/`: Chat agent loop, role prompt compilation, dynamic citation attribution, human escalation.
  - `src/services/eval/`: Benchmark runner, automated judge, side-by-side comparators.
  - `src/services/self_improve/`: Self-improve loop, git branch manager, patcher, report generator.
  - `src/jobs/`: pg-boss background workers for crawler, refreshes, bulk eval runs.
  - `src/app/`: Next.js App Router UI pages and route handlers.
- **Zero Hallucination & Safe Defaults:**
  - Fallback models defined for all free tiers.
  - Never guess library signatures; verify against documentation.
  - Verify every build (`npm run build`) and test suite (`npm test`) on every milestone.
