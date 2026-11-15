# DATABASE.md - AI Tech Consultant

## 1. Schema Overview
- **businesses**: id (UUID, PK), name, created_at
- **users**: id (UUID, PK), business_id (FK), email, password_hash, role
- **connections**: id (UUID, PK), business_id (FK), provider (claude/gemini/openrouter/ollama/gmail), encrypted_keys
- **sitemaps**: id (UUID, PK), business_id (FK), url, status
- **knowledge_pages**: id (UUID, PK), business_id (FK), sitemap_id (FK), url, health_status
- **instructions**: id (UUID, PK), business_id (FK), title, content, target_roles
- **skills**: id (UUID, PK), business_id (FK), name, trigger_condition, steps_markdown
- **model_call_logs**: id (UUID, PK), business_id (FK), model_name, tokens_in, tokens_out, cost_usd, latency_ms

## 2. Indexing Strategy
- B-tree indexes on all foreign keys (`business_id`, `sitemap_id`) for fast tenant filtering.
- HNSW indexes on `pgvector` embedding columns for sub-millisecond semantic search.
- GIN indexes with `tsvector` and `pg_trgm` for hybrid full-text search.

## 3. Multi-Tenant Isolation (D1)
- Strict row-level isolation via `business_id` foreign keys on every operational table.
- Enforced at the application query layer and PostgreSQL Row-Level Security (RLS) policies.
