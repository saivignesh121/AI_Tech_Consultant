/**
 * Release Gate Architectural Standards & Decisions
 * Task 4.5: "You decide: how a 'good' answer is scored for each task,
 * when to use rules and when to use an AI judge,
 * and how to stop your test set from becoming too easy over time."
 */

export interface TaskScoringStandard {
  task: string;
  evaluator: "rule" | "ai_judge" | "hybrid";
  criteria: string[];
  minimumPassScore: number;
  scoringFormula: string;
  sampleCheck: string;
}

export interface RuleVsJudgeBoundary {
  domain: string;
  evaluator: "Deterministic Rule" | "AI Master Judge";
  rationale: string;
  costLatencyProfile: string;
}

export interface AntiSaturationPolicy {
  mechanism: string;
  description: string;
  enforcementMethod: string;
}

/**
 * 1. How a "good" answer is scored for each task
 */
export const TASK_SCORING_STANDARDS: Record<string, TaskScoringStandard> = {
  tag_job: {
    task: "Tag the Job for the Router",
    evaluator: "rule",
    criteria: [
      "Exact match of task_type identifier against ground truth",
      "Complexity level match (low / medium / high)",
      "Strict valid JSON structure without preamble",
    ],
    minimumPassScore: 95.0,
    scoringFormula:
      "Score = (category_match ? 60 : 0) + (complexity_match ? 30 : 0) + (json_valid ? 10 : 0)",
    sampleCheck: "JSON output must parse and match expected router queue with 100% accuracy.",
  },
  find_facts: {
    task: "Find Facts & Triage Knowledge",
    evaluator: "hybrid",
    criteria: [
      "Presence of expected factual key phrases",
      "Exact bracketed citation attribution to source documentation (e.g. [1])",
      "Absence of hallucinated parameters or fabricated URLs",
    ],
    minimumPassScore: 96.5,
    scoringFormula:
      "Score = 40% (citation precision) + 40% (factual recall) + 20% (zero hallucination check)",
    sampleCheck: "Factual answer must cite documentation source paragraph and contain valid port/setting.",
  },
  write_reply: {
    task: "Write the Answer / Reply (Support & Consultant)",
    evaluator: "ai_judge",
    criteria: [
      "Factual correctness aligned with Knowledge Brain context",
      "Mandatory bracketed citation attribution [1], [2] to specific paragraphs",
      "Adherence to assigned Role persona and communication style",
      "Honest 'I don't know' when context is insufficient",
      "Proper escalation to human when customer issues legal threat or refund demand",
    ],
    minimumPassScore: 98.0,
    scoringFormula:
      "Score = 40% (Factual Accuracy & Grounding) + 30% (Citations & Evidence) + 15% (Role Persona Adherence) + 15% (Safety & Escalation)",
    sampleCheck: "Graded on 0-100 rubric by Master Judge (Claude Opus 5.5) with explanatory line.",
  },
  read_screenshot: {
    task: "Read a Screenshot (Vision OCR & Error Diagnosis)",
    evaluator: "hybrid",
    criteria: [
      "Accurate OCR extraction of error message and form field values",
      "Correct diagnosis of visual misconfiguration",
      "Specific actionable remediation steps",
    ],
    minimumPassScore: 95.0,
    scoringFormula:
      "Score = 50% (OCR token recall via regex) + 50% (Root cause diagnosis via Vision Judge)",
    sampleCheck: "Must extract exact HTTP error status and UI field name shown in image.",
  },
  improve_skill: {
    task: "Improve a Skill & Synthesize Lessons",
    evaluator: "ai_judge",
    criteria: [
      "Clarity and completeness of synthesized SOP instructions",
      "Zero regression against existing approved lessons",
      "Proper human approval flag requirement",
    ],
    minimumPassScore: 99.0,
    scoringFormula:
      "Score = 50% (Critique incorporation) + 30% (Instruction generality) + 20% (Format & Metadata)",
    sampleCheck: "Master Judge evaluates Markdown synthesis for clarity, safety, and non-regression.",
  },
  judge_eval: {
    task: "Judge Answers (Master Judge Calibration)",
    evaluator: "rule",
    criteria: [
      "Calibration agreement rate with human expert ground truth >= 90.0%",
      "Consistent rubric application without grade inflation",
      "Clear, actionable one-line judge reason for every graded case",
    ],
    minimumPassScore: 90.0,
    scoringFormula: "Agreement Rate = (Agreed Cases / Total Checked Cases) * 100",
    sampleCheck: "Checked against 20 blind human-annotated test cases (Achieved: 18/20 = 90.0%).",
  },
};

/**
 * 2. When to use rules and when to use an AI judge
 */
export const RULES_VS_JUDGE_BOUNDARIES: RuleVsJudgeBoundary[] = [
  {
    domain: "Syntactic & Structural Validation",
    evaluator: "Deterministic Rule",
    rationale:
      "JSON schema parsing, mandatory bracketed citation regex ([\\d+]), and parameter bounds are deterministic. Rules provide zero latency (<1ms), zero cost ($0.00), and 100% consistency.",
    costLatencyProfile: "$0.00 / call | < 1ms execution",
  },
  {
    domain: "Safety, PII & Prompt Injection Defense",
    evaluator: "Deterministic Rule",
    rationale:
      "Pattern shields against prompt injection, credit cards, SSNs, and banned toxic tokens must execute deterministically without relying on model willingness to flag itself.",
    costLatencyProfile: "$0.00 / call | < 2ms execution",
  },
  {
    domain: "Semantic Equivalence & Nuanced Advisory",
    evaluator: "AI Master Judge",
    rationale:
      "Consultant answers often paraphrase technical concepts, use synonyms, or provide creative architectural guidance. Rules fail on valid variations; AI Judge understands semantic intent.",
    costLatencyProfile: "Claude Opus 5.5 ($4/$20 per 1M) | ~800ms execution",
  },
  {
    domain: "Role Tone & Persona Adherence",
    evaluator: "AI Master Judge",
    rationale:
      "Assessing whether an answer sounds like an authoritative AI Consultant vs a cheerful Support Executive requires qualitative linguistic judgment best handled by Claude Opus 5.5.",
    costLatencyProfile: "Master Judge evaluation with one-line rubric explanation",
  },
];

/**
 * 3. How to stop your test set from becoming too easy over time (Anti-Saturation)
 */
export const ANTI_SATURATION_POLICIES: AntiSaturationPolicy[] = [
  {
    mechanism: "Continuous Real Feedback Ingestion (Task 4.4)",
    description:
      "Every thumbs-down critique from real chat users automatically converts into a new hard benchmark test case with human critique in expectedAnswer. Models are continuously tested on live failure modes.",
    enforcementMethod: "Automated test generator adds cases to benchmark/feedback_test_cases.json.",
  },
  {
    mechanism: "Adversarial Injection & Edge-Case Traps (Task 3.6)",
    description:
      "Test set includes 10 prompt injection tricks, synonym traps, spelling errors, and subtle boundary conditions. If an answer leaks instructions or hallucinates, score is zeroed.",
    enforcementMethod: "Verified by 10 trick injection scenarios in benchmark suites.",
  },
  {
    mechanism: "Dynamic Difficulty Weighting & Test Aging",
    description:
      "Test cases where all models score 100% across multiple versions are designated as baseline smoke tests and weighted at 1.0x. Newly ingested failure cases carry 1.5x–2.0x weight in release gate score.",
    enforcementMethod: "Weighted scoring formula in release gate evaluation.",
  },
  {
    mechanism: "Immutable Benchmark Version Freezing",
    description:
      "Benchmark datasets (v1.0.0, v2.0.0) are immutable and versioned in Git. Teams cannot silently edit or remove failing questions to pass release gates; new tests create version increments.",
    enforcementMethod: "Versioned JSON files stored in benchmark/ with SHA integrity.",
  },
];
