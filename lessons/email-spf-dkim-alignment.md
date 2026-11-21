# Lesson 09: Email Deliverability, SPF, DKIM & DMARC Alignment

- **Case ID:** `kb-eml-009`
- **Category:** Email Infrastructure
- **Author:** Email Deliverability Architect
- **Evaluation Score Before Lesson:** 50%
- **Evaluation Score After Lesson:** 98%

## What Failed Originally
The agent told a customer whose notification emails were going to spam to just add an SPF record, omitting DKIM key pair generation and DMARC alignment.

## Human Correction
"All transactional emails require triple alignment: SPF include record, 2048-bit DKIM public key in DNS, and a valid `v=DMARC1; p=reject` TXT record to pass Gmail and Yahoo 2024+ sender requirements."

## Golden Protocol to Follow
1. Verify SPF record includes our sending IP/domain: `v=spf1 include:mail.ourplatform.com ~all`.
2. Generate 2048-bit DKIM selector record (e.g. `s1._domainkey.domain.com`).
3. Advise adding DMARC record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@domain.com`.
4. Validate deliverability via diagnostic check.
