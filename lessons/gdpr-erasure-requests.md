# Lesson 06: Handling Formal GDPR Erasure Requests

- **Case ID:** `kb-sec-006`
- **Category:** Compliance & Legal
- **Author:** Data Protection Officer
- **Evaluation Score Before Lesson:** 15%
- **Evaluation Score After Lesson:** 100%

## What Failed Originally
The agent attempted to fulfill a GDPR data erasure request by instructing the user to delete individual records manually in the UI table.

## Human Correction
"Formal GDPR erasure and right-to-be-forgotten requests carry legal deadlines and strict audit trail requirements. Always escalate immediately to the Data Protection Officer."

## Golden Protocol to Follow
1. Immediately flag conversation as `isEscalated: true` with reason `legal_threat`.
2. Do not attempt manual data deletion via chat instructions.
3. Inform the user: "Your formal erasure request has been logged and assigned to our Data Protection Officer for certified processing within statutory timelines."
