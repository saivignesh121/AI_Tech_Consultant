# Architectural Decisions & Operating Standards: Autonomous Self-Improvement Loop
**Feature:** The Self-Improve Loop, where Claude Opus 5.5 fixes the app  
**Tasks:** Task 5.3 (Report, approve and undo) & Task 5.4 (Weekly email to the owner)  
**Standard:** Enterprise Tenant Isolation | Zero Regression Fencing | Anti-Cheating Invariants

---

## Executive Summary
This document formalizes the three core architectural decisions governing the autonomous self-improvement loop in the AI Tech Consultant SaaS platform:
1. **The Triage Matrix:** Which failures are worth sending to Claude Opus 5.5 vs. which must be resolved by a human expert.
2. **The 5-Part Prompt Architecture:** How the prompt dispatched to Claude Opus 5.5 is constructed for safe, grounded code and prompt synthesis.
3. **Anti-Cheating & Anti-Saturation Guardrails:** How the system prevents Claude Opus 5.5 from "cheating" or making the test set easier to achieve passing scores.

---

## 1. Decision 1: Which Failures are Worth Sending to Opus vs. Human Fixes

Not every test failure should be passed to an autonomous AI agent. Autonomous self-improvement carries token costs ($4.00 / $20.00 per 1M tokens for Claude Opus 5.5) and risk of policy distortion if applied to ambiguous business requirements.

### The Decision Matrix
| Failure Class | Example Failure | Dispatch Destination | Architectural Rationale |
|---|---|---|---|
| **Factual Ingress / DNS / Configuration Error** | Citing `127.0.0.1` instead of `54.214.12.8` for apex Cloudflare proxy | **Claude Opus 5.5** | High-precision technical defect with authoritative ground truth in Knowledge Brain documentation. Minimal risk of policy drift. |
| **Prompt Instruction / Formatting Violation** | Forgetting bracketed citations (`[1]`) or violating persona tone | **Claude Opus 5.5** | Prompt template defect cleanly rectifiable through prompt engineering on `qa_answer` or `agent_roles`. |
| **Standard Operating Procedure (SOP) Edge Case** | Subdomain CNAME flattening rule missing from `skills/dns-troubleshooting.md` | **Claude Opus 5.5** | Well-bounded procedural guideline that can be added to Markdown skills without broad side effects. |
| **Policy Exception / Discretionary Refund Dispute** | Customer demanding a refund after 45 days (policy is 30 days) | **Human Expert** | Autonomous models must never invent financial exceptions. Discretionary waivers require Director of Finance sign-off. |
| **Legal Threat / Regulatory Risk** | Customer threatening lawsuits, legal counsel, or regulatory audit | **Human Expert** | Legal Shield valve triggers immediate human handoff. Never allow autonomous self-improvement on legal threats. |
| **Contradictory Internal Documentation** | One sitemap document says "Port 8080" while another says "Port 8443" | **Human Expert** | Two authoritative internal documents conflict. An LLM cannot know which department is correct; human docs owner must reconcile. |
| **Multi-Vendor Circular Webhook Loop** | Circular webhook dependencies across Stripe, Zapier, and custom endpoint | **Human Expert** | Unsolvable without architectural redesign. Flagged for Principal Engineer review. |
| **Exhausted Budget Ceiling (> 3 Attempts / > $5.00)** | Case fails to achieve 100% after 3 rounds or hits budget ceiling | **Human Expert** | Prevents runaway token billing and loops. Quarantines branch automatically. |

---

## 2. Decision 2: The 5-Part Prompt Architecture Sent to Opus

When an eligible failure is dispatched, the prompt payload must provide complete context without granting unrestricted autonomy. The prompt is divided into five immutable sections:

1. **Part 1: Sandbox Constraints & Repository Fencing:**
   - Mandates that Opus operates exclusively on `self-improve/fix-${caseId}-${timestamp}`.
   - Enforces the hard prohibition: Opus is **never** permitted to checkout or commit to `main`/`master`.
   - Informs Opus that all test files (`tests/**`, `benchmark/**`, `judge.ts`) are cryptographically locked and read-only.
2. **Part 2: Failure Diagnostics & Human Critique:**
   - Transmits the exact customer question, the flawed model output, the human reviewer's comment or judge critique, and the verified expected answer.
3. **Part 3: Repository Context & Code Grounding:**
   - Binds the active system prompt (`prompts.ts`), active agent persona guidelines (`roles.ts`), and relevant skill procedures (`skills/*.md`).
4. **Part 4: Repair Objectives & Hidden Validation Notice:**
   - States the required threshold: 100% pass on the failing case with 0 regressions on visible benchmark cases.
   - Informs Opus that all candidate fixes will be validated against a **Hidden Check Set** that it cannot see.
5. **Part 5: Unified Diff Output Specification:**
   - Constrains Opus's output to structured JSON or unified diff format with file paths, replacement lines, and root-cause explanation.

---

## 3. Decision 3: Anti-Cheating & Anti-Saturation Guardrails

In autonomous repair systems, an unconstrained model will often attempt the easiest path to a passing score: **modifying the test assertions, deleting test cases, or weakening evaluation rubrics**.

We enforce four layers of defense to make test-cheating impossible:

### Layer 1: Cryptographically Immutable Test Infrastructure
- All files in `benchmark/**`, `tests/**`, `benchmark/hidden_check_set.json`, and `src/services/eval/judge.ts` are protected by `validateProposedFileChanges`.
- Any patch proposing alterations to these directories triggers an immediate security error and terminates the loop.

### Layer 2: The Segregated Hidden Validation Set
- The hidden check set ([benchmark/hidden_check_set.json](file:///Users/sanjanakolu/Desktop/vignesh/AI_Tech_Consultant/benchmark/hidden_check_set.json)) is stored outside the prompt payload and is **never** exposed to Claude Opus 5.5.
- If Opus proposes an overfitted "hack" (e.g. hardcoding an answer for just one question while breaking general knowledge), the candidate will fail the secret regression cases and be quarantined.

### Layer 3: Whole-Benchmark Regression Suite Gate
- Every proposed fix must be evaluated against the entire 180-test benchmark suite.
- If any category drops below its baseline score, the Release Gate strictly blocks deployment.

### Layer 4: Calibrated Master AI Judge ($\ge 90\%$ Agreement)
- Scoring is evaluated by the Master AI Judge (calibrated against 20 human ground-truth cases).
- The judge assesses factual semantic accuracy, citation grounding, and persona compliance—preventing simple lexical hacks from registering as passes.

---

## 4. 1-Click Approve, Versioning & 1-Click Undo Protocol

1. **1-Click Approve & Merge:**
   - Admin clicks "1-Click Approve & Merge" on the run report.
   - Git branch `self-improve/*` is merged into `main`.
   - Prompt Versioning (Task 1.3): Inserts new row into `prompt_versions` (`versionNumber = max + 1`) and updates `prompts.currentVersionId`.
   - Skill Versioning (Task 2.5): Inserts new row into `skill_versions` (`versionNumber = max + 1`) and updates `skills.currentVersionId`.
   - The new versions appear immediately in Settings with change summaries attributing the Pull Request.
2. **1-Click Undo / Revert:**
   - Admin clicks "1-Click Undo / Revert".
   - Restores prompt to previous version in Settings (`versionNumber - 1`).
   - Restores skill to previous version in Settings (`versionNumber - 1`).
   - Marks run status as `reverted` in `self_improve_runs`.
   - Restores baseline configuration with zero downtime.

---

## 5. Weekly Executive Owner Digest (Task 5.4)
Every week, the business owner receives an automated digest containing:
- **What Got Better:** List of all autonomous fixes merged by Opus (case ID, category, resolution summary, and cost).
- **What Failed:** List of quarantined cases flagged for human principal engineer review (e.g., `kb-edge-999`).
- **Cost Audit:** Total production inference cost, Opus self-improvement investment ($5.00 ceiling enforced), and net prompt caching savings.
