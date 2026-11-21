# Lesson 08: Stripe Webhook Signature Verification

- **Case ID:** `kb-pay-008`
- **Category:** Payments & Billing Webhooks
- **Author:** Senior Fintech Integrations Engineer
- **Evaluation Score Before Lesson:** 40%
- **Evaluation Score After Lesson:** 100%

## What Failed Originally
The agent told a developer that JSON parsing errors on Stripe webhooks can be resolved by passing `JSON.parse(req.body)` into `stripe.webhooks.constructEvent()`.

## Human Correction
"Stripe signature verification requires the raw, unparsed request payload buffer (`req.rawBody` or `bodyParser.raw({ type: 'application/json' })`). Parsing JSON prior to signature validation invalidates cryptographic hashes."

## Golden Protocol to Follow
1. Emphasize that `stripe.webhooks.constructEvent()` requires the raw string/buffer payload.
2. In Next.js route handlers, use `await request.text()` directly—never `await request.json()`.
3. Pass `stripe-signature` header from request headers.
