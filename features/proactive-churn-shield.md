# Feature Proposal 3: Proactive Churn Shield & Frustration Radar

**Author:** Principal Full-Stack Software Architect  
**Status:** Planned Feature Specification  

---

## 1. The Problem It Solves, and for Whom
Most SaaS customers churn silently without submitting an explicit cancellation ticket. They encounter repeated documentation errors, broken configuration steps, or subtle bugs, grow frustrated after 2 or 3 failed chat queries, and abandon the software. Customer success leads have zero visibility into these micro-frustrations until the monthly invoice is canceled. This feature provides an autonomous sentiment monitoring radar that proactively alerts customer success before a frustrated user churns.

## 2. Who Would Pay for It, and Why
Subscription SaaS founders and VP of Customer Success managing recurring revenue ($20k–$2M ARR). Saving just 3 enterprise accounts from churning ($1,000/mo each) yields $36,000 in saved ARR, making a $200/month add-on fee an immediate 15x ROI.

## 3. User Flow, Step by Step
1. **Passive Sentiment Scoring:** During every chat interaction, the classifier analyzes customer sentiment velocity across consecutive turns (detecting repeated clarifying questions, typing velocity, thumbs-down feedback, or frustrated tone).
2. **Frustration Index Threshold:** If customer frustration index exceeds 75/100, the system triggers the Churn Shield.
3. **Proactive Intervention:**
   - The AI consultant shifts from technical monologue to empathetic de-escalation: "I notice this domain setup has been challenging. Let me personally connect you with our senior engineer Alex."
   - Dispatches an instant Slack / Webhook alert to the customer success channel with customer account details and chat summary.
4. **Resolution Playbook:** Proposes a targeted discount or concierge migration package tailored to the client's past history.
5. **Success Review:** Logs outcome in the Churn Radar dashboard.

## 4. Screens and Tabs on Task 0 Map
- **Location:** In `/dashboard`, adds a new alert card: **At-Risk Accounts Radar**.
- **Customer Success View:** In `/chat`, adds an interactive **Sentiment Velocity Meter** displaying real-time customer satisfaction probability.

## 5. New Database Tables and Columns (Linked to DATABASE.md)
```sql
CREATE TABLE churn_risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    customer_identifier VARCHAR(255) NOT NULL,
    frustration_score INT NOT NULL, -- 0 to 100
    detected_frustration_reasons JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open' | 'investigating' | 'saved' | 'churned'
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_churn_alerts_status ON churn_risk_alerts(business_id, status);
```

## 6. Connection to Existing Architecture
- **Safety:** Extends `evaluateMessageSafety()` with multi-turn sentiment tracking.
- **Jobs:** Enqueues background Slack/Webhook notification jobs via `pg-boss` (`enqueueJob('churn-alert-dispatcher', ...)`).
- **Lessons:** Analyzes recurring churn topics to automatically propose missing documentation articles in `/knowledge`.

## 7. How to Measure Success ("Done When")
**Done when:** 10 simulated frustrated customer conversations automatically trigger high-severity alerts in `churn_risk_alerts` within 2 seconds, and the AI agent smoothly pivots into concierge de-escalation mode with zero prompt leakage.

## 8. Risks and Failure Modes
- **False Positives:** Enthusiastic users writing in all caps or using exclamation points being misclassified as angry. *Mitigation:* Require semantic validation using Claude Haiku 5.5 rather than naive punctuation counting.

## 9. Estimated Hours to Build
**24 Engineering Hours** (Sentiment classifier: 6h, Webhook/Slack integration: 8h, Dashboard widgets & alerting UI: 6h, Verification tests: 4h).
