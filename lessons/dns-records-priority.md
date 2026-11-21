# Lesson 01: DNS Records Priority Protocol

- **Case ID:** `kb-dns-001`
- **Category:** DNS & Domain Configuration
- **Author:** Senior Support Lead
- **Evaluation Score Before Lesson:** 35%
- **Evaluation Score After Lesson:** 100%

## What Failed Originally
The agent recommended pointing both root A records and CNAME records to conflicting destinations simultaneously, creating DNS resolution loops for custom domains.

## Human Correction
"Never advise configuring both an A record and a CNAME record on the root (@) domain. For Cloudflare proxying, always specify the root A record pointing to 54.214.12.8, with CNAME reserved strictly for www subdomains."

## Golden Protocol to Follow
1. Verify if the customer is configuring the root domain (@) or a subdomain (www, app).
2. For root (@), provide the single verified A record IP: `54.214.12.8`.
3. For `www`, advise creating a CNAME record pointing to `@`.
4. Instruct the customer to set Cloudflare Proxy status to Active (Orange Cloud) and verify propagation.
