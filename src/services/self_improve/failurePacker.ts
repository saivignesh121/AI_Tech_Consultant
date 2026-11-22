/**
 * Failure Packager for Autonomous Claude Opus 5.5 Self-Improvement
 * Task 5.1: Safely packages test failures, human/judge comment, system prompt,
 * user prompt, failing answer, and related code onto an isolated git branch.
 * Enforces strict sandbox fences: Claude Opus 5.5 never touches main/master,
 * and never edits the test set or judge prompt.
 */

export interface RelatedCodeSnippet {
  filePath: string;
  language: string;
  summary: string;
  content: string;
}

export interface ClaudeOpusPayload {
  model: "claude-opus-5.5";
  systemInstructions: string;
  context: {
    runId: string;
    caseId: string;
    branchName: string;
    failingQuestion: string;
    userPrompt: string;
    systemPrompt: string;
    failingAnswer: string;
    expectedAnswer: string;
    judgeCritique: string;
    comment: string;
    relatedCode: RelatedCodeSnippet[];
  };
  safetyBoundaries: {
    isolatedBranchOnly: string;
    forbiddenPatterns: string[];
    enforceHiddenCheckSet: boolean;
  };
  prompt: string;
}

export interface FailurePackage {
  runId: string;
  caseId: string;
  failingQuestion: string;
  userPrompt: string; // Task 5.1 user prompt
  failingAnswer: string;
  expectedAnswer: string;
  judgeCritique: string;
  comment: string; // Task 5.1 comment / critique
  systemPrompt: string; // Task 5.1 system prompt
  relatedCode: RelatedCodeSnippet[]; // Task 5.1 related code
  activePromptVersion: string;
  targetBranch: string;
  createdAt: string;
  claudeOpusPayload: ClaudeOpusPayload;
}

/**
 * Protected file patterns that Claude Opus 5.5 is STRICTLY FORBIDDEN from modifying.
 * Opus can never alter tests, benchmarks, the hidden check set, or the judge prompt.
 */
export const FORBIDDEN_FILE_PATTERNS: RegExp[] = [
  /^benchmark\//,
  /benchmark.*\.json$/,
  /^tests\//,
  /.*\.test\.ts$/,
  /.*\.spec\.ts$/,
  /^src\/services\/eval\/judge\.ts$/,
  /^src\/services\/eval\/judge.*$/,
  /hidden_check_set\.json$/,
  /releaseGate/,
];

/**
 * Validates that the target git branch is strictly isolated and never touches main/master.
 */
export function validateTargetBranch(branchName: string): { valid: boolean; reason?: string } {
  if (!branchName || branchName.trim() === "") {
    return { valid: false, reason: "Target branch name cannot be empty." };
  }

  const clean = branchName.trim().toLowerCase();
  if (
    clean === "main" ||
    clean === "master" ||
    clean === "origin/main" ||
    clean === "origin/master" ||
    clean === "head"
  ) {
    return {
      valid: false,
      reason: "Security Violation: Claude Opus 5.5 is strictly forbidden from targeting or checking out the main/master branch.",
    };
  }

  if (!clean.startsWith("self-improve/")) {
    return {
      valid: false,
      reason: "Branch naming policy violation: Self-improvement branches must follow the isolated naming convention 'self-improve/*'.",
    };
  }

  return { valid: true };
}

/**
 * Validates that proposed file modifications do not touch protected tests or judge prompts.
 */
export function validateProposedFileChanges(modifiedFiles: string[]): {
  allowed: boolean;
  blockedFiles: string[];
  reason?: string;
} {
  const blocked: string[] = [];

  for (const file of modifiedFiles) {
    const isForbidden = FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(file));
    if (isForbidden) {
      blocked.push(file);
    }
  }

  if (blocked.length > 0) {
    return {
      allowed: false,
      blockedFiles: blocked,
      reason: `Security Sandbox Block: Claude Opus 5.5 is strictly prohibited from modifying test suites, benchmark sets, or the judge prompt (${blocked.join(", ")}).`,
    };
  }

  return { allowed: true, blockedFiles: [] };
}

/**
 * Resolves standard system prompt for the failure package if not provided.
 */
export function resolveDefaultSystemPrompt(version = "v1.2.0"): string {
  return `You are an elite AI Technical Support Consultant.
Your mission is to provide rigorous, citation-backed technical resolutions.
Never invent IP addresses, configurations, or discount policies.
Always adhere to active skills and grounded Knowledge Brain documentation.
Prompt Version: ${version}`;
}

/**
 * Resolves related code snippets for the failure package.
 */
export function resolveRelatedCode(caseId?: string): RelatedCodeSnippet[] {
  const baseSnippets: RelatedCodeSnippet[] = [
    {
      filePath: "src/services/chat/prompts.ts",
      language: "typescript",
      summary: "Core prompt templates including qa_answer and role guidelines.",
      content: `export const QA_ANSWER_TEMPLATE = \`Context: {knowledge_results}\\nQuery: {customer_query}\\nActive Skill: {active_skill}\\nProvide a direct, complete, and cited response adhering to your active role persona.\`;`,
    },
    {
      filePath: "src/services/chat/roles.ts",
      language: "typescript",
      summary: "Role definitions and persona enforcement for support engineers and consultants.",
      content: `export const ROLE_PROMPTS = {\n  support_engineer: "Technical precision, root-cause diagnosis, explicit configuration steps.",\n  support_executive: "Polite, structured, SLA-focused with clean escalation paths."\n};`,
    },
  ];

  if (caseId && caseId.includes("dns")) {
    baseSnippets.push({
      filePath: "skills/dns-troubleshooting.md",
      language: "markdown",
      summary: "Standard Operating Procedure for Cloudflare and DNS CNAME flattening.",
      content: `# DNS & Custom CNAME Setup\nWhen configuring external DNS for Cloudflare proxying, route apex domains to standard proxy ingress 54.214.12.8. Never route apex domains to 127.0.0.1.`,
    });
  } else if (caseId && (caseId.includes("refund") || caseId.includes("billing"))) {
    baseSnippets.push({
      filePath: "skills/refund-resolution.md",
      language: "markdown",
      summary: "SOP for billing refunds and contract adjustments.",
      content: `# Refund Policies\nRefunds are strictly permitted only within 30 days of initial invoice. Enterprise discounts require written Sales Director approval.`,
    });
  }

  return baseSnippets;
}

/**
 * Safely packs an evaluation failure into a self-contained, typed bundle for Claude Opus 5.5.
 * Task 5.1: Bundles comment, system prompt, user prompt, failing answer, and related code.
 */
export function packEvalFailure(params: {
  caseId: string;
  question: string;
  failingAnswer: string;
  expectedAnswer: string;
  judgeCritique: string;
  comment?: string;
  systemPrompt?: string;
  relatedCode?: RelatedCodeSnippet[];
  activePromptVersion?: string;
  targetBranch?: string;
}): FailurePackage {
  const timestamp = Date.now();
  const caseSlug = params.caseId.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const branchName = params.targetBranch || `self-improve/fix-${caseSlug}-${timestamp}`;

  // Enforce branch safety validation
  const branchValidation = validateTargetBranch(branchName);
  if (!branchValidation.valid) {
    throw new Error(branchValidation.reason);
  }

  const commentText = params.comment || params.judgeCritique;
  const sysPrompt = params.systemPrompt || resolveDefaultSystemPrompt(params.activePromptVersion);
  const codeSnippets = params.relatedCode && params.relatedCode.length > 0
    ? params.relatedCode
    : resolveRelatedCode(params.caseId);

  const claudeOpusPayload: ClaudeOpusPayload = {
    model: "claude-opus-5.5",
    systemInstructions: `You are Claude Opus 5.5 running in Autonomous Self-Improvement Mode.
You have been dispatched to analyze an evaluation failure, propose targeted prompt and code improvements,
and verify that your fix resolves the failure completely without regressing other test cases.

CRITICAL SECURITY AND REPOSITORY RULES:
1. You are working exclusively on the isolated git branch: "${branchName}".
2. You must NEVER modify or commit to the main/master branch.
3. You must NEVER modify benchmark test sets, the hidden check set, or the judge prompt.
4. Your goal is a 100% pass on the failing test case while maintaining 0 regressions on all other cases.
5. All code and prompt fixes will be validated against a hidden check set you cannot see.`,
    context: {
      runId: `run-${timestamp}`,
      caseId: params.caseId,
      branchName,
      failingQuestion: params.question,
      userPrompt: params.question,
      systemPrompt: sysPrompt,
      failingAnswer: params.failingAnswer,
      expectedAnswer: params.expectedAnswer,
      judgeCritique: params.judgeCritique,
      comment: commentText,
      relatedCode: codeSnippets,
    },
    safetyBoundaries: {
      isolatedBranchOnly: branchName,
      forbiddenPatterns: [
        "benchmark/**",
        "tests/**",
        "src/services/eval/judge.ts",
        "benchmark/hidden_check_set.json",
      ],
      enforceHiddenCheckSet: true,
    },
    prompt: `EVALUATION FAILURE TO REPAIR:
Case ID: ${params.caseId}
User Prompt / Question: "${params.question}"

Failing Answer Produced:
"${params.failingAnswer}"

Expected Resolution Ground Truth:
"${params.expectedAnswer}"

Human / Judge Critique:
"${commentText}"

Active System Prompt:
${sysPrompt}

Related Code Files:
${codeSnippets.map((c) => `--- File: ${c.filePath} (${c.language}) ---\n${c.content}`).join("\n\n")}

Task Instructions:
1. Identify the exact root cause of the failure (e.g. missing instruction, hallucination, ambiguous condition).
2. Formulate a minimal, elegant patch to the prompt template or related skill/service code.
3. Ensure no protected files are modified.
4. Formulate the unified diff and verify that the repair achieves 100% precision.`,
  };

  return {
    runId: `run-${timestamp}`,
    caseId: params.caseId,
    failingQuestion: params.question,
    userPrompt: params.question,
    failingAnswer: params.failingAnswer,
    expectedAnswer: params.expectedAnswer,
    judgeCritique: params.judgeCritique,
    comment: commentText,
    systemPrompt: sysPrompt,
    relatedCode: codeSnippets,
    activePromptVersion: params.activePromptVersion || "v1.0.0",
    targetBranch: branchName,
    createdAt: new Date().toISOString(),
    claudeOpusPayload,
  };
}
