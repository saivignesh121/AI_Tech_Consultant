/**
 * Self-Improvement Loop Architectural Decisions & Policies
 * Task 5.3 & 5.4: Formalizes:
 * 1. Which failures are worth sending to Opus vs. which a human should fix (Triage Classifier).
 * 2. How the prompt sent to Opus is constructed (5-Part Prompt Architecture).
 * 3. How to guarantee Opus does not cheat or make the tests easier (Anti-Cheating Guardrails).
 */

export interface TriageClassificationResult {
  sendToOpus: boolean;
  destination: "claude-opus-5.5" | "human_expert";
  reason: string;
  confidence: number;
  category: string;
  recommendedAction: string;
}

/**
 * Decision 1: Which failures are worth sending to Opus vs. which a human should fix
 * Evaluates failure characteristics against strict safety and feasibility matrices.
 */
export function classifyFailureForRepair(params: {
  caseId: string;
  question: string;
  failingAnswer: string;
  expectedAnswer?: string;
  category?: string;
  attemptsCount?: number;
  isLegalThreat?: boolean;
  isRefundDispute?: boolean;
  hasContradictoryDocs?: boolean;
}): TriageClassificationResult {
  const qLower = params.question.toLowerCase();
  const fLower = params.failingAnswer.toLowerCase();
  const attempts = params.attemptsCount || 0;

  // 1. Escalation Condition: 3 or more previous failed repair attempts or budget ceiling hit
  if (attempts >= 3) {
    return {
      sendToOpus: false,
      destination: "human_expert",
      reason: "Ceiling Limit: Case failed across >= 3 autonomous repair attempts. Quarantined for Principal Engineer review.",
      confidence: 1.0,
      category: "exhausted_budget_limit",
      recommendedAction: "Dispatch high-priority ticket to engineering team.",
    };
  }

  // 2. Escalation Condition: Legal threat or regulatory liability
  const legalKeywords = ["lawyer", "attorney", "sue", "lawsuit", "legal action", "legal team", "legal", "litigation", "court", "arbitration", "breach of contract"];
  const hasLegal = params.isLegalThreat || legalKeywords.some((w) => qLower.includes(w) || fLower.includes(w));
  if (hasLegal) {
    return {
      sendToOpus: false,
      destination: "human_expert",
      reason: "Legal Shield: Questions involving lawsuits, legal counsel, or regulatory claims must be addressed by Legal/Executive humans.",
      confidence: 0.99,
      category: "legal_compliance",
      recommendedAction: "Trigger Send to a Human task with legal flag.",
    };
  }

  // 3. Escalation Condition: High-value refund disputes or contract alterations
  const refundKeywords = ["chargeback", "dispute charge", "bank dispute", "refund exception", "waive contract"];
  const hasRefundDispute = params.isRefundDispute || refundKeywords.some((w) => qLower.includes(w));
  if (hasRefundDispute) {
    return {
      sendToOpus: false,
      destination: "human_expert",
      reason: "Financial Policy: Discretionary refund exceptions or contract disputes require Director of Finance sign-off.",
      confidence: 0.95,
      category: "financial_policy",
      recommendedAction: "Escalate to Billing Supervisor queue.",
    };
  }

  // 4. Escalation Condition: Conflicting or contradictory internal documentation
  if (params.hasContradictoryDocs) {
    return {
      sendToOpus: false,
      destination: "human_expert",
      reason: "Documentation Contradiction: Multiple internal knowledge sources disagree. Human documentation owner must resolve.",
      confidence: 0.92,
      category: "conflicting_docs",
      recommendedAction: "Assign documentation reconciliation task in Knowledge Brain.",
    };
  }

  // 5. Eligible for Autonomous Opus 5.5 Repair: Factual, instructional, or SOP edge cases
  return {
    sendToOpus: true,
    destination: "claude-opus-5.5",
    reason: "Autonomous Repair Eligible: Factual, IP/DNS, or prompt instruction defect with grounded ground truth in Knowledge Brain.",
    confidence: 0.96,
    category: params.category || "grounded_technical_resolution",
    recommendedAction: "Dispatch to Claude Opus 5.5 on isolated self-improve branch.",
  };
}

/**
 * Decision 2: How you write the prompt that you send to Opus
 * Generates the standardized 5-Part Prompt Architecture for autonomous Claude Opus 5.5 repair.
 */
export function buildStandardOpusPrompt(params: {
  caseId: string;
  branchName: string;
  question: string;
  failingAnswer: string;
  expectedAnswer: string;
  critique: string;
  systemPrompt: string;
  relatedCode: Array<{ filePath: string; content: string }>;
}): string {
  return `================================================================================
PART 1: SANDBOX CONSTRAINTS & REPOSITORY FENCING
================================================================================
You are Claude Opus 5.5 operating in Autonomous Self-Improvement Mode.
- Target Branch: "${params.branchName}"
- Strict Rule 1: You must NEVER target, checkout, or push to the 'main' or 'master' branch.
- Strict Rule 2: You are STRICTLY FORBIDDEN from modifying benchmark test cases ("benchmark/**"), unit tests ("tests/**"), the hidden check set, or the judge prompt ("judge.ts").
- Strict Rule 3: Your repair must achieve 100% precision on the failing case while introducing 0 regressions on all other cases.

================================================================================
PART 2: FAILURE DIAGNOSTICS & HUMAN/JUDGE CRITIQUE
================================================================================
• Test Case ID:      ${params.caseId}
• Customer Query:    "${params.question}"
• Flawed AI Answer:  "${params.failingAnswer}"
• Verified Truth:    "${params.expectedAnswer}"
• Judge/User Reason: "${params.critique}"

================================================================================
PART 3: REPOSITORY CONTEXT & CODE GROUNDING
================================================================================
Active System Prompt:
${params.systemPrompt}

Related Source Files & Prompts:
${params.relatedCode.map((c) => `--- File: ${c.filePath} ---\n${c.content}`).join("\n\n")}

================================================================================
PART 4: OBJECTIVE & HIDDEN EVALUATION NOTICE
================================================================================
1. Formulate a minimal, robust patch to the prompt template or domain skill SOP.
2. Note: Your candidate fix will be evaluated against a secret validation check set that you cannot see.
   Any superficial "hack" that overfits to this single question will fail the hidden check set.

================================================================================
PART 5: UNIFIED DIFF OUTPUT SPECIFICATION
================================================================================
Provide your proposed fix as a clean unified diff with line replacements, accompanied by a brief explanation of root cause.`;
}

/**
 * Decision 3: How to make sure Opus is not just making the tests easier (Anti-Cheating Guardrails)
 * Validates that candidate modifications strictly respect test immutability and anti-overfitting rules.
 */
export const ANTI_CHEATING_PILLARS = {
  pillar1_immutable_test_infrastructure: {
    name: "Cryptographically Immutable Benchmark & Test Directory",
    description: "Benchmark datasets (benchmark/**) and test files (tests/**) are sandboxed and read-only. Any attempt by Opus to alter test questions, expected answers, or thresholds triggers immediate termination.",
  },
  pillar2_segregated_hidden_check_set: {
    name: "Segregated Hidden Validation Suite",
    description: "Candidate patches are evaluated against a secret validation suite (benchmark/hidden_check_set.json) that is completely excluded from Opus's prompt payload. Overfitting causes instant hidden check set failure.",
  },
  pillar3_whole_benchmark_regression_gate: {
    name: "Whole-Benchmark Regression Guard",
    description: "A candidate patch must maintain or exceed the baseline score across all 180 visible benchmark cases. If any category drops, the release gate blocks deployment.",
  },
  pillar4_calibrated_master_judge: {
    name: "Calibrated Master AI Judge (>= 90% Human Agreement)",
    description: "Scoring is determined by Claude Opus 5.5 / Nemotron 3 Ultra calibrated against 20 human ground-truth cases, eliminating lexical cheating or keyword matching exploits.",
  },
};

export function verifyAntiCheatingGuards(modifiedFiles: string[]): {
  compliant: boolean;
  violations: string[];
  explanation: string;
} {
  const forbiddenPatterns = [
    /^benchmark\//,
    /benchmark.*\.json$/,
    /^tests\//,
    /.*\.test\.ts$/,
    /^src\/services\/eval\/judge\.ts$/,
    /hidden_check_set\.json$/,
    /releaseGate/,
  ];

  const violations: string[] = [];
  for (const file of modifiedFiles) {
    if (forbiddenPatterns.some((pattern) => pattern.test(file))) {
      violations.push(file);
    }
  }

  if (violations.length > 0) {
    return {
      compliant: false,
      violations,
      explanation: `Anti-Cheating Guardrail Triggered: Claude Opus attempted to modify protected test infrastructure (${violations.join(", ")}). Tests cannot be altered to make passing easier.`,
    };
  }

  return {
    compliant: true,
    violations: [],
    explanation: "All proposed file changes comply with Anti-Cheating & Test Immutability policies.",
  };
}
