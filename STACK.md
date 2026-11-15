# STACK.md - AI Tech Consultant

## 1. Language & Framework Declaration
- **Language:** Python 3.14 (Async, strict type hints)
- **Framework:** FastAPI
- **Database & ORM:** PostgreSQL 18 with `pgvector`, SQLAlchemy 2.0 (asyncio), Alembic
- **Task Queue:** Procrastinate (PostgreSQL-backed background jobs)
- **Containerization:** Docker Compose (1-command startup)

## 2. Key Architecture Answers
- **S1 (No Redis initially):** Procrastinate utilizes PostgreSQL for job queuing, avoiding extra infrastructure overhead until scaling requires Valkey.
- **S2 (ORM Boundary):** SQLAlchemy ORM for relational models; raw SQL or parameterized queries for complex vector and full-text searches.
- **M1 (Embeddings):** Utilizing lightweight local/cloud embeddings optimized for pgvector distance metrics.
