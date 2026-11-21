# Lesson 05: Database Connection Pooling & Limits

- **Case ID:** `kb-db-005`
- **Category:** Infrastructure & PostgreSQL
- **Author:** DevOps Lead
- **Evaluation Score Before Lesson:** 40%
- **Evaluation Score After Lesson:** 98%

## What Failed Originally
The agent advised a client experiencing `remaining connection slots are reserved for non-replication superuser connections` to simply increase `max_connections` to 2,000 on their 4GB RAM VPS.

## Human Correction
"Never recommend arbitrarily raising PostgreSQL `max_connections` to high numbers on low-memory servers; this causes Linux OOM kernel kills. Advise deploying connection pooler PgBouncer or using client connection pooling with transaction mode."

## Golden Protocol to Follow
1. Recommend connection pooling (PgBouncer or Node/Pg pool capped at 25 connections per instance).
2. Set `statement_timeout = '10s'` to kill rogue queries.
3. Keep server `max_connections` <= 150 to preserve PostgreSQL shared buffer memory.
