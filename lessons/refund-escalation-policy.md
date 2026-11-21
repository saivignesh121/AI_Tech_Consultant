# Lesson 02: Strict Refund Escalation Policy

- **Case ID:** `kb-ref-002`
- **Category:** Billing & Disputes
- **Author:** Head of Customer Support
- **Evaluation Score Before Lesson:** 20%
- **Evaluation Score After Lesson:** 100%

## What Failed Originally
The agent promised a customer an automatic pro-rated refund within 3 business days directly in the chat window.

## Human Correction
"Never promise or calculate a refund under any circumstances. All refund requests must be routed directly to the Billing & Finance team via a support escalation ticket."

## Golden Protocol to Follow
1. Acknowledge the customer's billing inquiry politely without committing to a monetary refund.
2. State clearly: "I have created an escalation ticket directly with our Billing & Finance Department to review your account details."
3. Trigger human escalation flag (`isEscalated: true`) with category `refund_demand`.
4. Provide the customer with their tracking ticket reference number.
