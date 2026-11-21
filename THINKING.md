# THINKING.md — Engineering Thinking & Architecture Evolution

**Project:** AI Tech Consultant  
**Author:** Principal Full-Stack Software Architect & UI/UX Engineer  
**Status:** Round 1 (Plan Before You Code — Day 1 to 2)  

---

## Round 1: Plan Before You Code

### Question 1: Your App on One Page
*Draw one diagram of your whole app: the screens, the API, the database, the background jobs, and the models, with arrows that show what calls what. Then answer: if one part stops working, which part takes the whole app down with it? How will you protect it?*

#### 1. System Architecture Diagram
```
+---------------------------------------------------------------------------------------+
| USER BROWSER (Next.js 16 Client Components, React 19)                                 |
| [Onboarding]  [Dashboard]  [Knowledge UI]  [Chat UI]  [Prompt Studio]  [Eval Lab]     |
+------------------------------------------+--------------------------------------------+
                                           | HTTP Requests & SSE Event Streams
                                           v
+---------------------------------------------------------------------------------------+
| NEXT.JS 16 APP ROUTER (Server Handlers & Middleware)                                  |
| - Tenant Auth Context Guard (business_id)                                             |
| - Decoupled Knowledge Brain Public API (/api/brain/query, /api/brain/crawl)           |
| - Streaming Chat Agent Router (/api/chat, /api/teach)                                 |
| - Eval Lab Benchmarking API (/api/evals)                                              |
| - PII Sanitization & Prompt Injection Shield                                          |
+-------------------+----------------------+--------------------+-----------------------+
                    |                      |                    |
       Reads/Writes |         Enqueues Job |     Triggers Fixes | Model Requests
                    v                      v                    v
+-----------------------+  +-------------------+  +-------------------------------------+
| POSTGRESQL 18         |  | PG-BOSS WORKERS   |  | 14 SUPPORTED AI MODELS              |
| - 25 Relational Tables|  | - Sitemap Scraper |  | - Claude (Opus, Sonnet, Haiku 5.5)  |
| - Row-Level Security  |  | - URL Health Check|  | - Gemini (3.8 Flash, 3 Flash, Lite) |
| - HNSW Vector Index   |  | - Batch Evaluator |  | - OpenRouter (Nemotron, Qwen, Gemma)|
| - Full-Text (tsvector)|  | - Opus Auto-Fixer |  | - Local Ollama (gemma4, qwen3.5)    |
| - Encrypted Key Vault |  +-------------------+  +-------------------------------------+
+-----------------------+          |
                    ^              | Reads/Updates State
                    +--------------+
```

#### 2. Single Point of Failure (SPOF) Analysis & Protection
- **Which part takes the whole app down?**
  **PostgreSQL 18.** If the database crashes or exhausts connection pools, every subsystem immediately halts: Next.js cannot authenticate tenants, `pg-boss` background jobs cannot read queues, and the chat agent cannot retrieve knowledge or log token costs.
- **How we protect it:**
  1. **Strict Connection Pooling:** We employ connection poolers (`pgBouncer` / Drizzle pool limits capped at 30 connections) with strict query timeouts (3 seconds for hybrid search, 10 seconds for transactions).
  2. **Circuit Breakers for LLM APIs:** If third-party APIs (e.g., Anthropic or OpenRouter) experience downtime or 529 overloads, the app does not hang. It falls back to secondary models (e.g., Sonnet -> Gemini 3.8 Flash -> Qwen 3.8 Max), and background retry jobs enter an exponential backoff state without dropping requests.
  3. **Read-Only Degradation Mode:** If vector queries slow down under high load, the Knowledge Brain falls back to standard PostgreSQL full-text search, keeping the chat operational.

---

### Question 2: Your Time Guess

| Feature / Milestone | Initial Estimated Hours | Primary Complexity Driver |
|---|---|---|
| **Task 0: Screen Map & Wireframes** | 6 hours | Mapping all 7 screens, 15 tabs, wireframes, and user routing. |
| **Feature 1: Workspace & Settings** | 12 hours | 5 encrypted integrations, multi-tenant RLS, role editor with live test chat. |
| **Feature 2: The Knowledge Brain** | 20 hours | Recursive sitemap parsing, polite scraping, screenshot OCR, hybrid search. |
| **Feature 3: The Ask & Teach Chat** | 16 hours | Dynamic citations, trace panel, prompt injection shield, teaching-to-lesson flow. |
| **Feature 4: The Eval Lab** | 18 hours | 180 benchmark tests, 14 model integrations, AI judge calibration, cost router. |
| **Feature 5: Self-Improve Loop** | 14 hours | Branch creation, Claude Opus 5.5 fix loop, budget caps, hidden validation set. |
| **Feature 6: Go Live in 15 Minutes**| 10 hours | 5-step guided wizard, synthetic test generation, automated readiness score. |
| **Final Docs, Videos & Tests** | 14 hours | 4 feature proposals, ROADMAP.md, 180 benchmark execution, demo recording. |
| **Total Estimated Hours** | **110 hours** | Real-world production engineering over 14 calendar days. |

---

### Question 3: Your Model Guess (Lowest Cost for Passing Quality)

| Eval Job | My Initial Model Guess | One-Line Reason & Cost Trade-off |
|---|---|---|
| **1. Tag the Job** | `claude-haiku-5.5` | Exceptional at deterministic JSON schema classification at just $0.10 / 1M tokens. |
| **2. Find Facts** | `gemini-2.5-flash-lite` | Ultra-fast token scanning across retrieved chunks at $0.10 / 1M tokens. |
| **3. Write Reply** | `claude-sonnet-5.5` | The undisputed gold standard for nuanced, authoritative customer-facing communication ($2.00 / $10.00). |
| **4. Read Screenshot**| `gemini-3.8-flash` | State-of-the-art visual OCR and diagram parsing at 1/4th the price of Claude ($0.75 / $3.75). |
| **5. Improve Skill** | `claude-opus-5.5` | Complex code and prompt synthesis requires deep frontier reasoning; cheap models fail this task ($4.00 / $20.00). |
| **6. Judge Answers** | `claude-opus-5.5` | Unbiased, rigorous grading against ground truth; Nemotron 3 Ultra serves as a free cross-check. |

---

### Question 4: A Sitemap You Have Never Seen
*List 3 ways another website could be different from the Solution Center, and say what your design does about it:*

1. **Client-Side Rendered Single Page Applications (SPAs):**
   - *Difference:* The HTML page returns an empty `<div id="root"></div>`; content is injected dynamically by JavaScript.
   - *Design Response:* The scraper inspects content length. If the rendered text is below 150 characters, it flags the source and uses headless rendering (Playwright) to capture the hydrated DOM.
2. **Massive Scale Sitemaps (50,000+ Pages e.g., eCommerce / Giant Docs):**
   - *Difference:* Attempting to scrape 50,000 pages in one batch would exhaust memory, crash the server, and trigger IP blacklisting.
   - *Design Response:* The pre-crawl modal detects sitemap size > 2,000 pages. It forces chunked ingestion (batches of 250 URLs with polite delays of 300ms) executed via `pg-boss` background jobs with resumable checkpoints.
3. **Media-Heavy Pages with Zero Text (Pure Infographics & Screenshots):**
   - *Difference:* Traditional text scrapers extract empty strings, producing blank embeddings.
   - *Design Response:* The extractor detects image tags within article containers. If text word count is under 50 words but images exist, it automatically queues images for OCR/Vision analysis via Gemini 3.8 Flash and indexes the extracted image descriptions as searchable chunks.

---

### Question 5: Same Kind of Question, Different Risk
*Give 3 pairs of questions that look alike but need very different care (one safe to answer, one requiring human escalation):*

1. **Pair 1: Feature Limitations vs. Breach of Contract**
   - *Safe:* "Does your platform support multi-currency payouts in Euros?" (Safe -> Answer from knowledge base documentation).
   - *Escalate:* "You promised multi-currency payouts would be live yesterday; our contract is breached, refund our deposit immediately." (Escalate -> Financial/Legal dispute; create human expert ticket).
2. **Pair 2: Data Export vs. GDPR Erasure / Legal Subpoena**
   - *Safe:* "Where can I download a CSV export of my monthly subscriber data?" (Safe -> Step-by-step guide from settings documentation).
   - *Escalate:* "I am serving you with a formal GDPR erasure request and notice of legal spoliation." (Escalate -> Legal liability risk; human privacy officer required).
3. **Pair 3: Bug Troubleshooting vs. Catastrophic Data Loss**
   - *Safe:* "Why are my member profile avatars showing a 404 error?" (Safe -> Guide on image CDN cache refresh).
   - *Escalate:* "Your update just wiped our entire member directory and production database! Put me on with your CEO right now." (Escalate -> Severe incident management; emergency human handoff).

*How the app tells them apart:* An automated safety classifier (Haiku 5.5 + regex heuristics for legal keywords `lawyer`, `sue`, `breach`, `subpoena`, `GDPR`, `fraud`) intercepts the message before RAG retrieval. If high severity is flagged, the agent halts autonomous answering and renders an explicit human ticket.

---

### Question 6: 50 Questions a Day vs. 5,000? (Scale & Architecture)
*One business asks 50 questions a day and has 500 help pages. Another asks 5,000 a day and has 50,000 pages. Think through your design for the second one:*

#### 1. What Breaks First?
- **Vector Search Memory & Latency:** 50,000 pages create ~250,000 chunks. Naive sequential vector scans or unindexed tables consume multiple gigabytes of RAM. An HNSW index on 250,000 vectors requires ~1.2 GB of RAM dedicated exclusively to index caching.
- **LLM API Rate Limits & Cost:** 5,000 questions/day using pure Claude Sonnet 5.5 without caching costs ~$30 to $50/day ($1,500/month). Uncached API calls will hit Anthropic tier concurrency limits (e.g., 50 concurrent requests).

#### 2. Architecture & Performance Mitigations:
1. **Semantic Query Caching:** Introduce an exact and fuzzy query cache. Approximately 40% of customer support queries in high-volume businesses are duplicates (e.g., password reset, billing dates). Serving cached verified answers cuts LLM calls from 5,000 to 3,000/day.
2. **Partitioned Indices:** Partition the `knowledge_chunks` table by `business_id` or use compound indexes (`(business_id, chunk_id)`). This guarantees that queries for Tenant B only traverse Tenant B's subset of vectors in memory.
3. **Aggressive Prompt Caching:** Enable Anthropic Prompt Caching on the system prompt and core knowledge context, slashing input token costs by 90% on subsequent turns.
4. **Estimated Numbers for 5,000 Questions/Day:**
   - Database RAM needed: ~4 GB dedicated to PostgreSQL shared buffers and HNSW indices.
   - Response latency: Average 850 ms (vs. 2,400 ms unoptimized).
   - Monthly LLM Cost: Controlled to ~$350/mo using Haiku for classification, caching for context, and Sonnet for final synthesis.
