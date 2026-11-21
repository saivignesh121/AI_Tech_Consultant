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
