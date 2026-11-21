# Feature Proposal 1: Bi-Directional CRM & Ticket Sync (HubSpot, Salesforce, Zendesk)

**Author:** Principal Full-Stack Software Architect  
**Status:** Planned Feature Specification  

---

## 1. The Problem It Solves, and for Whom
Support agents and account executives lose 2 to 3 hours daily copying customer inquiries from ticketing systems (Zendesk, Freshdesk) and CRMs (HubSpot, Salesforce) into internal tools, manually checking help articles, and pasting answers back. When customer status or subscription tiers change in the CRM, the AI consultant has no real-time awareness and may quote the wrong prices or troubleshooting tier. This feature provides bi-directional, real-time ticket ingestion and contact-aware resolution for SaaS companies with dedicated customer support teams.

## 2. Who Would Pay for It, and Why
Mid-market B2B SaaS companies and agencies ($50k–$500k MRR). They would pay an extra $150–$300/month because it automates first-touch ticket replies directly inside their existing Zendesk/HubSpot queues, reducing first-response time from 45 minutes to under 30 seconds with 100% human-verified accuracy.

## 3. User Flow, Step by Step
1. **OAuth Connection:** Admin navigates to `/settings/integrations`, clicks "Connect HubSpot" or "Connect Zendesk", and authenticates.
2. **Webhook Registration:** AI Tech Consultant automatically subscribes to ticket creation and contact update webhooks.
3. **Automated Draft Synthesis:** When a customer submits a ticket, the webhook triggers background processing:
   - Fetches customer's account tier and contract terms from CRM.
   - Queries Knowledge Brain via `/api/brain/query` using the customer's question.
   - Adopts the active Agent Role (e.g. Support Executive) to synthesize a draft answer with inline citations.
4. **Draft Injection & Agent Review:** The draft is injected into Zendesk as an internal note with a 1-click "Approve & Send" button.
5. **Teaching Sync Back:** If the human agent edits the draft in Zendesk, the delta is posted back to `/api/chat` as a teaching lesson for continuous learning.

## 4. Screens and Tabs on Task 0 Map
- **Location:** Sits under `Settings & Integrations` (`/settings`), under a new horizontal tab: **CRM & Helpdesk Integrations** (`/settings/crm`).
- **Activity Feed:** In `/dashboard`, adds a new widget: "Active CRM Webhook Queue".
- **Ticket Viewer:** In `/chat`, adds an external badge showing `Synced from Zendesk Ticket #1042`.

## 5. New Database Tables and Columns (Linked to DATABASE.md)
```sql
CREATE TABLE crm_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'hubspot' | 'salesforce' | 'zendesk'
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    webhook_secret TEXT,
    sync_status VARCHAR(50) DEFAULT 'active',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crm_ticket_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
    external_ticket_id VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_tier VARCHAR(100),
    draft_response TEXT,
    status VARCHAR(50) DEFAULT 'drafted', -- 'drafted' | 'sent' | 'edited_by_human'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_crm_ticket_business ON crm_ticket_syncs(business_id, external_ticket_id);
```

## 6. Connection to Existing Architecture
- **APIs:** Calls decoupled Knowledge Brain API (`/api/brain/query`) and Chat API (`/api/chat`).
- **Prompts:** Reuses `qa_answer` prompt template and injects dynamic CRM customer tier variables (`{customer_tier}`, `{account_value}`).
- **Roles:** Adopts existing `agent_roles` table configurations.
- **Safety:** Passes all CRM messages through `evaluateMessageSafety()` for injection defense and refund/legal escalation.

## 7. How to Measure Success ("Done When")
**Done when:** A real test ticket opened in Zendesk receives an automated, cited draft response in under 5 seconds with >= 95% relevance score, and human edits in Zendesk generate an approved lesson record in `/knowledge/skills`.

## 8. Risks and Failure Modes
- **Rate Limits:** Salesforce / HubSpot API rate-limiting during ticket storms. *Mitigation:* Rate-limited buffering in `pg-boss` background queue with exponential backoff.
- **Draft Hallucinations:** Customer accidentally sent an unverified answer. *Mitigation:* Force "Draft Only" mode by default; never send directly without explicit tenant setting toggle.

## 9. Estimated Hours to Build
**32 Engineering Hours** (OAuth setup: 6h, Webhook listeners: 8h, Knowledge draft injector: 10h, UI & Tests: 8h).
