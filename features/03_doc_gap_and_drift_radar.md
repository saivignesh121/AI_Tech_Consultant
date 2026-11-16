# Feature Idea 3: Proactive Documentation Gap & Drift Radar

## 1. The Problem It Solves, and For Whom
- **Target User:** Technical writers, documentation managers, and Heads of Support.
- **Problem:** Knowledge bases silently go stale—customers repeatedly ask questions where the agent hits low retrieval confidence or escalates, and product releases change UI steps without anyone knowing which `KnowledgePage` or `Skill` is now outdated.

## 2. Who Would Pay For It, and Why
- **Buyer:** SaaS companies with fast release cycles ($79–$249/month Intelligence tier).
- **Why They Pay:** Automatically surfaces the top 10 missing documentation articles ranked by customer demand and drafts ready-to-publish Markdown pages using Claude Opus 5.5, turning support escalations into self-service deflection.

## 3. The User Flow (Step-by-Step)
1. Weekly Procrastinate cron job clusters all low-confidence chat turns (`match_score == 0`), human escalations, and thumbs-down feedback from the past 7 days using pgvector embeddings.
2. Clusters with >=3 similar unanswered queries are logged as **Doc Gap Opportunities** with frequency count and anonymized sample questions.
3. Technical writer opens **Knowledge Brain → Doc Gaps** and clicks **Draft Article with Opus**.
4. System synthesizes a structured Markdown article + starter `EvalTestCase` pairs; once approved, it is indexed into `KnowledgePage` and added to the Eval Lab regression suite.

## 4. Screens and Tabs Needed (Task 0 Map Placement)
- **Knowledge Brain (`/knowledge?tab=gaps`):** New 6th horizontal tab (**Doc Gaps**) displaying ranked unanswered topic clusters, affected customer count, and a **Draft & Publish** drawer.
- **Self-Improve Weekly Digest (Feature 5):** Embeds the top 3 detected Doc Gaps directly into the owner's weekly summary.

## 5. New Tables and Columns (Linked to `DATABASE.md`)
- **`doc_gap_clusters`:** `id` (UUID PK), `business_id` (UUID FK -> `businesses.id`, RLS enabled), `topic_title` (VARCHAR(255)), `query_count` (INTEGER), `sample_queries` (JSONB), `draft_markdown` (TEXT NULL), `status` (`'open' | 'drafted' | 'published' | 'dismissed'`), `created_at` (TIMESTAMPTZ).

## 6. How It Connects to Built Features
- **Feature 2 (`feature_2_knowledge_brain`):** Publishes approved gap drafts directly into `knowledge_pages` and `instructions`.
- **Feature 3 (`feature_3_chat`):** Consumes unanswered queries and thumbs-down feedback events.
- **Feature 4 & 5 (`feature_4_eval_lab`, `feature_5_self_improve`):** Auto-generates `EvalTestCase` rows for each closed gap and reports gap metrics in the weekly digest.

## 7. How We Measure That It Works
- **Done when:** Asking 5 paraphrased questions about an undocumented feature (e.g., "SAML SSO setup") automatically generates a ranked Doc Gap cluster, and clicking **Draft & Publish** raises Eval Lab pass rate on those 5 questions from `<20%` to `>=95%`.

## 8. Risks and What Could Go Wrong
- **Hallucinated Documentation:** Opus drafting plausible-sounding but false product steps when no source exists. *Mitigation:* Mark every AI-drafted article with `[UNVERIFIED DRAFT — HUMAN SME SIGN-OFF REQUIRED]` and block indexing until a human edits and clicks **Approve & Index**.

## 9. Build Time Estimate
- **Total Estimate:** **12 hours** (4h clustering query/job, 5h Knowledge Brain tab + draft editor, 3h Eval Lab integration tests).
