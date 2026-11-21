# Lesson 03: SSL Handshake Resolution in Cloudflare

- **Case ID:** `kb-ssl-003`
- **Category:** Security & SSL
- **Author:** Lead Infrastructure Engineer
- **Evaluation Score Before Lesson:** 45%
- **Evaluation Score After Lesson:** 95%

## What Failed Originally
The agent suggested switching Cloudflare SSL mode to 'Flexible', which causes infinite redirect loops (ERR_TOO_MANY_REDIRECTS) when origin servers enforce HTTPS.

## Human Correction
"Cloudflare SSL mode must always be configured to 'Full' or 'Full (Strict)'. Never advise 'Flexible' mode when our origin server has an active auto-renewing Let's Encrypt certificate."

## Golden Protocol to Follow
1. In Cloudflare, navigate to SSL/TLS > Overview.
2. Select encryption mode: **Full (Strict)**.
3. Verify origin SSL port is 443.
4. Clear Cloudflare edge cache and test with `curl -Iv https://customdomain.com`.
