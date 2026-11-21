# Lesson 04: Webhook Idempotency Key Handling

- **Case ID:** `kb-api-004`
- **Category:** Developer APIs & Webhooks
- **Author:** Senior Backend Architect
- **Evaluation Score Before Lesson:** 50%
- **Evaluation Score After Lesson:** 100%

## What Failed Originally
The agent told a developer that re-sending failed webhook requests would overwrite existing database records without checking idempotency headers.

## Human Correction
"All POST webhook requests must include a unique `Idempotency-Key` UUID header. Our ingestion server deduplicates requests within a 24-hour rolling window."

## Golden Protocol to Follow
1. Developers must pass header `Idempotency-Key: <UUIDv4>` on every mutating event.
2. If network timeouts occur, developers can safely retry with the exact same key without risking duplicate charges or duplicate rows.
3. State HTTP 200 response will return cached execution receipt.
