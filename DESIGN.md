# System Architecture & Engineering Design (DESIGN.md)

## 1. Modular Monolith & Clean API Boundaries
- Six isolated feature modules (feature_1_workspace through feature_6_go_live) backed by PostgreSQL 18 + pgvector 0.8.7 and Procrastinate.
- Clean API boundary: hybrid_retrieve_context(db, business_id, query) in feature_3_chat/retrieval_service.py serves Chat, Eval Lab, and Go Live without duplicating SQL.

## 2. Multi-Tenant Isolation & Security
- PostgreSQL 18 FORCE ROW LEVEL SECURITY enforced via app.current_business_id and non-superuser ai_app_user.
- AES-256-GCM encryption (connections_crypto.py) with HKDF key derivation and random nonces for API keys and OAuth tokens.
- Pre-model PII redaction (shared/pii.py) scrubbing phone numbers, cards, and addresses before LLM calls or model_call_logs.
- Deterministic prompt-injection shield and mandatory human handover on refund/legal/chargeback queries.

## 3. 3-Step Cost-Saving Model Router & Caching
- Pre-flight token count routes >100k prompts away from Claude Haiku 5.5.
- Routes Tier-1 tagging/lookups to local Ollama (qwen3.5:4b / gemma4:e4b at $0.00) or Haiku 5.5, reserving Sonnet 5.5 / Opus 5.5 for complex synthesis, judging, and Self-Improve patches.
- Anthropic ephemeral prompt caching cuts static system/role prompt cost by 68-90%.
