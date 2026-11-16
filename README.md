# AI Tech Consultant — Multi-Tenant Autonomous Support & Consulting SaaS

Enterprise multi-tenant SaaS built with Python 3.14 (async), FastAPI, SQLAlchemy 2.0, PostgreSQL 18 (pgvector 0.8.7) with Row-Level Security, Procrastinate, Jinja2 + HTMX + Tailwind CSS, and local Ollama (gemma4:e4b, qwen3.5:4b).

## One-Command Quickstart
1. git clone https://github.com/saivignesh121/AI_Tech_Consultant.git && cd AI_Tech_Consultant
2. cp .env.example .env
3. docker compose up --build -d
4. Open http://localhost:8000/auth/signup to create a workspace.
5. Run tests: docker compose exec -T web pytest -q (63/63 passing).

## Local-Only Offline Mode ($0 API Cost)
- Pull models: ollama pull qwen3.5:4b && ollama pull gemma4:e4b (verify with ollama list).
- Docker reaches Ollama automatically at http://host.docker.internal:11434.
- In Eval Lab (/evals), choose Local-Only Mode (Both Ollama Models) to run offline at $0.00/run.
