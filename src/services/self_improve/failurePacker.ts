/**
 * Failure Packager for Autonomous Claude Opus 5.5 Self-Improvement
 * Task 5.1: Safely packages test failures, judge critique, system prompt, and failing answer.
 */

export interface FailurePackage {
  runId: string;
  caseId: string;
  failingQuestion: string;
  failingAnswer: string;
  expectedAnswer: string;
  judgeCritique: string;
  activePromptVersion: string;
  targetBranch: string;
  createdAt: string;
}

export function packEvalFailure(params: {
  caseId: string;
  question: string;
  failingAnswer: string;
  expectedAnswer: string;
  judgeCritique: string;
  activePromptVersion?: string;
}): FailurePackage {
  const timestamp = Date.now();
  const branchName = `self-improve/fix-${params.caseId.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${timestamp}`;

  return {
    runId: `run-${timestamp}`,
    caseId: params.caseId,
    failingQuestion: params.question,
    failingAnswer: params.failingAnswer,
    expectedAnswer: params.expectedAnswer,
    judgeCritique: params.judgeCritique,
    activePromptVersion: params.activePromptVersion || "v1.0.0",
    targetBranch: branchName,
    createdAt: new Date().toISOString(),
  };
}
