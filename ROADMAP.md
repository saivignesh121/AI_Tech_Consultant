# Product & Engineering Roadmap (Post-Capstone Expansion)

This roadmap sequences our **4 planned (unbuilt) features** in order of customer value, architectural leverage, and technical dependency.

---

## Priority & Build Sequence

| Rank | Feature | Est. Hours | Target Tier | Key Dependencies | Why This Position |
|---|---|---|---|---|---|
| **1** | [**Doc Gap & Drift Radar**](features/03_doc_gap_and_drift_radar.md) | 12h | Intelligence ($79/mo) | Built Features 2, 3, 4, 5 | **Highest immediate ROI with zero external OAuth dependencies.** Uses existing chat failure logs and pgvector to close knowledge gaps before exposing the bot publicly. |
| **2** | [**Embeddable Customer Widget**](features/01_embeddable_customer_widget.md) | 14h | Growth ($49/mo) | Built Features 1–4 + Priority #1 (hardened KB) | **Primary revenue driver.** Once Doc Gap Radar hardens the Knowledge Brain to >=98% accuracy, exposing a white-label `<script>` widget turns internal deflection into direct self-serve customer support. |
| **3** | [**Multilingual Auto-Localization**](features/04_multilingual_auto_localization.md) | 10h | Global ($99/mo) | Priority #2 (Widget) + Built Feature 3 | **Multiplies Widget & Email TAM globally.** International visitors hitting the new Web Widget immediately ask questions in non-English languages; cross-lingual retrieval unlocks global adoption without translating docs. |
| **4** | [**Slack & Teams Copilot**](features/02_slack_teams_copilots.md) | 16h | Team ($99/mo) | Built Features 1–3 + Procrastinate Worker | **Highest integration complexity (OAuth + HMAC + async Block Kit).** Scheduled after customer-facing deflection is live so internal support engineers can triage escalated widget/email threads inside Slack. |

---

## Dependency Graph
**Total Planned Expansion Effort:** **52 engineering hours** across 4 modular, RLS-isolated releases.
