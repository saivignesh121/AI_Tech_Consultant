# AI Tech Consultant — Production Multi-Tenant SaaS

A production-grade, multi-tenant AI Tech Consultant SaaS that enables software and service businesses to automate customer support, technical inquiries, and sales consulting with human-level accuracy. Built with strict tenant isolation, real-time cost telemetry, self-improving Markdown lessons, an Eval Lab comparing 14 models, and an autonomous Claude Opus 5.5 self-healing loop.

---

## 1. Quick Start (One Command Run via Docker Compose)

The entire application stack (PostgreSQL 18 with `pgvector`, Next.js 16 app, and background workers) runs with one command:

```bash
# 1. Clone repository and copy environment template
cp .env.example .env.local

# 2. Start PostgreSQL 18 with pgvector and Next.js app
docker compose up --build
```
The application will be live at `http://localhost:3000`.

---

## 2. Local Development Setup

To run locally without Docker:

```bash
# 1. Install dependencies
npm install

# 2. Run database migrations
npm run db:push

# 3. Execute test suites (54 tests covering tenant isolation, PII masking, safety shields, and evals)
npm test

# 4. Start Next.js development server
npm run dev
```

---

## 3. How to Run with Only the 2 Local Models (Local-Only Mode)

To run the entire platform with zero cloud API costs using only the 2 local Ollama models on your laptop:

1. **Install and Start Ollama:**
   Download Ollama from [ollama.com](https://ollama.com) and ensure it is running:
   ```bash
   ollama list
   ```
2. **Pull the 2 Supported Local Models:**
   ```bash
   # Model 1: gemma4:e4b (offline replies, private data, screenshot reading)
   ollama pull gemma4:e4b

   # Model 2: qwen3.5:4b (offline job tagging and fact finding)
   ollama pull qwen3.5:4b
   ```
3. **Toggle Local-Only Mode:**
   - In `.env.local`, set `LOCAL_ONLY_MODE=true`
   - Or toggle the **"Local-Only Mode"** switch in the application header or in `/settings`.
   - All cloud API requests are bypassed; prompts are routed strictly to `http://localhost:11434`.

---

## 4. Architectural Summary

- **Single Language Consistency:** Strict TypeScript end-to-end (Node.js 24, Next.js 16 App Router, React 19).
- **Multi-Tenant Isolation:** Non-nullable `business_id` scoping with Row-Level Security and atomic cascade deletion.
- **Model Telemetry:** Every model invocation logs exact tokens, latency, and USD cost per 1M tokens.
- **Knowledge Brain:** 5 knowledge types (Sitemaps, Page URLs, Plain Instructions, Markdown Skills, Past Gmail Threads) with polite batch scraping, multimodal screenshot understanding, and URL health lifecycle (`Active`, `Watch`, `Quarantined`, `Archived`).
- **Safety Shield:** 10-trick prompt injection defense and automated human escalation for angry, refund, or legal queries.
- **Eval Lab:** 180-test benchmark comparing 14 models, calibrated AI Judge (>= 90% human agreement), and cost router saving 38.4% vs. Sonnet 5.5.
- **Self-Improve Loop:** Claude Opus 5.5 fixes failing test cases on isolated git branches, validated against a hidden check set with hard budget guardrails.
- **Go Live in 15 Minutes:** 5-step guided setup with automated synthetic test generation and readiness score.
