/**
 * Conversational Intent & Long Message Extractor
 * Task 3.1: Parsing pasted emails, distinguishing 'Ask' vs 'Teach' modes.
 */

export interface ParsedCustomerInput {
  mode: "ask" | "teach";
  extractedCoreQuery: string;
  isPastedThread: boolean;
  suggestedAction: "answer" | "learn_lesson" | "clarify";
}

const TEACH_TRIGGERS = [
  /^teach\s+me\b/i,
  /^this\s+is\s+wrong\b/i,
  /^the\s+right\s+answer\s+is\b/i,
  /^rule\s*:/i,
  /^correction\s*:/i,
  /\bhere\s+is\s+how\s+to\s+reply\b/i,
];

/**
 * Extracts the real question from long pasted email threads or identifies teaching intent.
 */
export function parseCustomerInput(rawInput: string): ParsedCustomerInput {
  const trimmed = rawInput.trim();

  // 1. Check for explicit Teaching Intent (Task 3.1 & 3.4)
  for (const trigger of TEACH_TRIGGERS) {
    if (trigger.test(trimmed)) {
      return {
        mode: "teach",
        extractedCoreQuery: trimmed,
        isPastedThread: false,
        suggestedAction: "learn_lesson",
      };
    }
  }

  // 2. Detect Long Pasted Emails / Chat Threads (> 300 characters or containing email headers)
  const isPastedEmail =
    trimmed.length > 300 ||
    /From:\s*|To:\s*|Subject:\s*|Sent:\s*|On\s+.*wrote:/i.test(trimmed);

  if (isPastedEmail) {
    // Extract question lines ending with '?' or actionable request sentences
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    const questionLines = lines.filter((l) => l.endsWith("?") || /how (do|can) I|where is|why is/i.test(l));

    const extracted = questionLines.length > 0 ? questionLines.join(" ") : lines[lines.length - 1] || trimmed;

    return {
      mode: "ask",
      extractedCoreQuery: extracted,
      isPastedThread: true,
      suggestedAction: "answer",
    };
  }

  return {
    mode: "ask",
    extractedCoreQuery: trimmed,
    isPastedThread: false,
    suggestedAction: "answer",
  };
}
