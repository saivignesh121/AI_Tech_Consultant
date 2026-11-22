# Release Gate Architecture & Answer Scoring Standards
**Governance Standard:** Task 4.4 & Task 4.5
**Project:** AI Tech Consultant (Production-Grade Multi-Tenant SaaS)

---

## 1. Task 4.4: Real Feedback Becomes New Tests
In customer support and technical consulting, static test sets become stale quickly. Real user critiques in the Ask and Teach Chat represent live edge cases and regressions that must never occur twice.

### Continuous Feedback Ingestion Pipeline
1. **Interactive Feedback Ingestion**:
   - Every AI answer in the chat includes **Thumbs Up ("This was right")** and **Thumbs Down ("This was wrong")** controls with a reason input.
   - For thumbs down, the user specifies why the answer was flawed and the golden rule to follow.
   - For thumbs up, the user provides the technical reason validating why the guidance was accurate.
2. **Automated Benchmark Test Generation**:
   - Every feedback submission calls `POST /api/chat/feedback` to synthesize a new `BenchmarkCaseItem` stored in `benchmark/feedback_test_cases.json`.
   - **Regressions (Thumbs Down)**: The question becomes the benchmark question; the expected answer incorporates the human critique while explicitly warning against the original flawed response (`difficulty: "hard"`, `weight: 1.5x - 2.0x`).
   - **Endorsements (Thumbs Up)**: Serves as verified positive ground truth for regression smoke suites (`difficulty: "standard"`, `weight: 1.0x`).

---

## 2. Task 4.5: The Release Gate Enforcer
A hard automated release enforcer is deployed across all production surfaces.
**Core Invariant:** A new prompt, role, skill, or model **cannot go live if any score falls below the last version**. This includes prompts and roles changed by the business in Settings.

### Protected Entities
1. **Prompts (`/api/prompts`)**: Evaluates `evaluatePromptReleaseGate()`. If candidate benchmark score < baseline, HTTP 422 is returned, blocking the update.
2. **Agent Roles (`/api/roles`)**: Evaluates `evaluateRoleReleaseGate()`. Built-in and custom roles are prevented from deploying if benchmark score drops.
3. **Operational Skills (`/api/brain/skills`)**: Evaluates `evaluateSkillReleaseGate()`. Newly synthesized or edited skills must match or beat prior accuracy.
4. **Model per Step Routing (`/api/settings/step-models`)**: Evaluates `evaluateModelReleaseGate()`. Switching a step's model is blocked if accuracy drops below baseline.

---

## 3. The Three Architectural Decisions ("You Decide")

### Decision 1: How a "Good" Answer is Scored for Each Task

| Operational Task | Evaluator Type | Scoring Formula & Criteria | Minimum Pass Threshold |
|---|---|---|---|
| **`tag_job`** | Deterministic Rule | `Score = (category_match ? 60 : 0) + (complexity_match ? 30 : 0) + (json_valid ? 10 : 0)` | **95.0%** |
| **`find_facts`** | Hybrid (Rule + Embedding) | `Score = 40% (citation precision) + 40% (factual recall) + 20% (zero hallucination)` | **96.5%** |
| **`write_reply`** | AI Master Judge (Claude Opus 5.5) | `Score = 40% (Factual Accuracy) + 30% (Evidence & Citations) + 15% (Role Persona) + 15% (Safety & Escalation)` | **98.0%** |
| **`read_screenshot`** | Hybrid (Regex OCR + Vision Judge) | `Score = 50% (OCR token recall via regex) + 50% (Root cause diagnosis via Vision Judge)` | **95.0%** |
| **`improve_skill`** | AI Master Judge (Claude Opus 5.5) | `Score = 50% (Critique incorporation) + 30% (Instruction generality) + 20% (Format & Metadata)` | **99.0%** |
| **`judge_eval`** | Master Judge Calibration Rule | `Agreement Rate = (Agreed Cases / Total Checked Cases) * 100` | **90.0%** (Achieved 18/20 = 90.0%) |

---

### Decision 2: When to Use Rules and When to Use an AI Judge

| Validation Domain | Engine Utilized | Engineering Rationale | Performance & Cost |
|---|---|---|---|
| **Syntactic & Structural Validation** | Deterministic Rules | JSON schema validation, bracketed citation regex (`\[\d+\]`), token length, and latency bounds are mathematically binary. | **$0.00 / call** (< 1ms execution) |
| **Safety, PII & Injection Defense** | Deterministic Rules | PII redaction (credit cards, SSNs) and 10 trick prompt injection shields must run predictably without model compliance variance. | **$0.00 / call** (< 2ms execution) |
| **Semantic Equivalence & Nuanced Guidance** | AI Master Judge (Claude Opus 5.5) | Valid consultant replies often use synonyms, different phrasings, or alternate architectural trade-offs. Rigid regex fails on valid answers; AI Judge evaluates underlying correctness. | **$4 / $20 per 1M** (~800ms) |
| **Role Persona & Tone Adherence** | AI Master Judge (Claude Opus 5.5) | Assessing whether a reply strikes the authoritative depth of an AI Consultant vs the concise helpfulness of a Support Engineer requires qualitative NLP judgment. | Master Judge rubric with one-line reason |

---

### Decision 3: How to Stop Your Test Set from Becoming Too Easy Over Time (Anti-Saturation)

1. **Continuous Real Feedback Ingestion (Task 4.4)**: Real user corrections (thumbs down) are automatically promoted into hard test cases. The benchmark continuously expands with authentic real-world failures.
2. **Adversarial Injection & Edge-Case Traps (Task 3.6)**: The test suite includes 10 prompt injection tricks, synonym traps, spelling errors, and boundary limits.
3. **Dynamic Difficulty Weighting & Test Aging**: Tests where all 14 models achieve 100% across multiple versions are designated as baseline smoke tests (weighted at 1.0x). Newly ingested real failure cases carry higher weight (1.5x–2.0x) in the release gate score.
4. **Immutable Benchmark Version Freezing**: Benchmark datasets (`v1.0.0`, `v2.0.0`) are versioned and immutable in the repository. New tests create version increments (`v2.1.0`), preventing artificial test inflation or silent removal of failing tests.
