# Lesson 10: API Rate Limiting & 429 Exponential Backoff

- **Case ID:** `kb-api-010`
- **Category:** API Reliability
- **Author:** API Platform Lead
- **Evaluation Score Before Lesson:** 45%
- **Evaluation Score After Lesson:** 100%

## What Failed Originally
When a customer encountered HTTP 429 Too Many Requests, the agent suggested looping immediate retries in a `while(true)` loop.

## Human Correction
"Never advise immediate tight retry loops on HTTP 429; this intensifies server load and leads to permanent IP blacklisting. Developers must read `Retry-After` headers and use exponential backoff with full jitter."

## Golden Protocol to Follow
1. Inspect the HTTP `Retry-After` response header (seconds to wait).
2. If absent, implement exponential backoff: `delay = Math.min(maxDelay, baseDelay * 2 ** attempt + Math.random() * jitter)`.
3. Cap retries at 5 attempts before flagging an incident.
