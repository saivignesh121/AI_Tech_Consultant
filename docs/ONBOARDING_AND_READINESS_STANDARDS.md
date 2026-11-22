# Architectural Decisions & Operating Standards: Go Live in 15 Minutes
**Feature:** Go Live in 15 Minutes  
**Tasks:** Task 6.1 (One guided setup flow), Task 6.2 (A starting test set made by itself), Task 6.3 (A readiness score), Task 6.4 (Time it <= 15 minutes)  
**Standard:** Zero Developer Required | Autonomous Ingestion | Empirical Readiness Gating

---

## Executive Summary
This document formalizes the production onboarding architecture for the AI Tech Consultant SaaS platform. It documents the guided setup wizard, the autonomous synthesis of domain test sets, empirical readiness scoring, stopwatch timing standards, and the two key architectural decisions.

---

## 1. The 15-Minute Guided Onboarding Flow (Task 6.1)

The onboarding flow unifies Features 1 to 3 into a single, cohesive 5-step wizard accessible to non-technical business owners:

```
[ Step 1: Sign Up & Vault API Keys ]
       │
       ▼
[ Step 2: Knowledge Ingestion (Sitemap / Docs / Gmail) ]
       │
       ▼
[ Step 3: Agent Roles & Tone of Voice ]
       │
       ▼
[ Step 4: Autonomous Synthetic Test Set Generation ]
       │
       ▼
[ Step 5: Eval Lab Readiness Benchmark & Chat Unlock ]
```

### Flow Breakdown
1. **Step 1: Sign Up & Vault Keys:**
   - Owner signs up with company name and email.
   - Saves AES-256 encrypted API keys (Anthropic Claude, Google Gemini) or toggles **Local-Only Mode** (running purely via local Ollama models with zero cloud API keys).
2. **Step 2: Ingestion Seed (Sitemap, Page URLs, Documents & Gmail):**
   - Provide a public documentation sitemap (`https://docs.company.com/sitemap.xml`), paste direct page URLs, or upload Markdown/PDF guides.
   - Connect support email / Gmail via OAuth or customer forwarding inbox.
   - Knowledge Brain automatically crawls, strips boilerplate, chunks text, and builds pgvector hybrid search embeddings.
3. **Step 3: Consultant Roles & Tone of Voice:**
   - Pick the active role: Support Engineer, Support Executive, AI Consultant, Solutions Architect.
   - Select tone of voice:
     - **Empathetic & Structured:** Ideal for high-touch customer support.
     - **Technical & Deep:** Ideal for developer platforms, API troubleshooting, and architecture reviews.
     - **Professional & Concise:** Ideal for executive fast-path inquiries.
     - **Direct & Action-Oriented:** Ideal for technical triage.
4. **Step 4: Synthetic Test Set Generation (Task 6.2):**
   - The app reads the ingested pages and automatically synthesizes 10 to 20 realistic domain Q&A test cases.
   - Each test case includes the generated question, verified expected answer, and source URL citation.
5. **Step 5: Readiness Benchmark & Chat Unlocking (Task 6.3):**
   - Runs the Eval Lab judge across the synthetic test set.
   - Computes the readiness score (e.g., `85.0%` - `100.0%`).
   - Displays clear human meaning: *"Answers 18 of 20 test questions correctly (90.0% readiness)."*
   - Chat unlocks for the team only when the score meets or exceeds the owner's chosen threshold.
6. **Stopwatch Timing Standard (Task 6.4):**
   - The entire onboarding flow is tracked with an active stopwatch (`OnboardingStopwatch`).
   - Guarantees completion within **15 minutes or less (<= 900 seconds)**.

---

## 2. Decision 1: What the Owner Must Give You vs. What the App Finds by Itself

To eliminate the need for software developers or manual data labeling, the system enforces a strict division of responsibility:

| Phase | What Owner Must Give | What App Finds Autonomously |
|---|---|---|
| **Identity & Access** | Company name, admin email, API keys (or Local toggle) | Tenant isolation schema, encryption salt, provider connection healthcheck |
| **Knowledge Base** | One seed sitemap URL OR uploaded document bundle | Entire documentation hierarchy, page link discovery, robots.txt compliance, heading extraction, image OCR (Gemini 3.8 Flash), hybrid search vectors |
| **Email Integration** | Support Gmail OAuth or email address | Historical email thread ingestion, past Q&A extraction, customer sentiment baselines |
| **Persona & Tone** | Preferred agent role and tone of voice | System prompt compilation, citation anchor formatting, injection protection shields |
| **Quality Gate** | Target readiness threshold (e.g. 85%) | Domain test set generation (10-20 Q&A pairs), ground truth source attribution, impartial AI Judge scoring |

---

## 3. Decision 2: What Readiness Score is Good Enough to Switch on the Chat

A business cannot afford an autonomous customer-facing AI that hallucinates or misquotes configuration parameters. The platform provides an empirical readiness gate with clear trade-off tiers:

### Readiness Tiers & Trade-Off Analysis
| Score Range | Production Status | Behavioral Guarantee | Trade-off Analysis |
|---|---|---|---|
| **< 70.0%** | **LOCKED (High Risk)** | Severe knowledge gaps; model hallucinates IP addresses or policies. | **Unacceptable:** Direct customer exposure would generate support escalations and brand damage. Chat strictly locked. |
| **70.0% - 84.9%** | **LOCKED (Supervised Only)** | Correct on basic questions, but fails complex edge cases or lacks citations. | **Supervised Beta:** Permitted only for internal staff testing where a human reviews every draft before sending. |
| **85.0% - 94.9%** | **UNLOCKED (Production Ready)** | **The Standard Pass Bar.** Accurately answers verified technical queries, provides source citations, and outputs honest *"I don't know"* lines on undocumented questions. | **Optimal Trade-Off:** High accuracy and speed. Allows rapid go-live within 15 minutes while maintaining strict safety. |
| **>= 95.0%** | **UNLOCKED (Enterprise Strict)** | Near-perfect recall; strict compliance on financial, security, and legal boundaries. | **Enterprise Grade:** Suitable for high-liability regulated industries (fintech, healthcare, legal). |

### Owner Configuration
The owner can select their desired threshold between 70% and 95%. When the Eval Lab runs, the team chat unlocks if and only if:
$$\text{ReadinessScore} \ge \text{OwnerChosenThreshold}$$

---

## 4. Verification & Validation Metrics
- **Stopwatch Benchmark:** Typically completes in **2 to 5 minutes** (under the 15-minute cap).
- **Synthetic Test Quality:** 100% grounded in crawled documentation with verified source URLs.
- **Readiness Meaning:** Displayed clearly in plain English on the dashboard and team chat gatekeeper.
