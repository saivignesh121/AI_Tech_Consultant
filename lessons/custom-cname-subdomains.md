# Lesson 07: Custom Subdomain CNAME Configuration

- **Case ID:** `kb-dom-007`
- **Category:** Domain & Routing
- **Author:** Tier-3 Support Specialist
- **Evaluation Score Before Lesson:** 55%
- **Evaluation Score After Lesson:** 96%

## What Failed Originally
The agent forgot to specify the CNAME target value for customers configuring subdomains like `members.clientbrand.com`.

## Human Correction
"For subdomains (anything other than root domain), specify CNAME pointing to `custom.ourplatform.com`. Do not provide the root A-record IP for subdomains."

## Golden Protocol to Follow
1. Identify the subdomain prefix (e.g., `members`, `portal`, `app`).
2. Instruct the user to add a DNS record:
   - Type: `CNAME`
   - Name: `<subdomain>`
   - Target: `custom.ourplatform.com`
   - TTL: Auto / 300s
3. Verify that origin routing validates the tenant Host header.
