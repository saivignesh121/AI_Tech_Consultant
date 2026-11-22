/**
 * Conversational Intent & Long Message Extractor
 * Task 3.1: Parsing pasted customer emails, distinguishing 'Ask' vs 'Teach' modes,
 * and extracting the real core question from noisy unstructured text.
 */

export interface ParsedCustomerInput {
  mode: "ask" | "teach";
  extractedCoreQuery: string;
  isPastedThread: boolean;
  rawInput: string;
  emailHeaders?: {
    from?: string;
    subject?: string;
  };
  suggestedAction: "answer" | "learn_lesson" | "clarify";
}

const TEACH_TRIGGERS = [
  /^teach\s+me\b/i,
  /\bthis\s+is\s+wrong\b/i,
  /\bthat('?s|\s+is)\s+wrong\b/i,
  /\bthe\s+right\s+answer\s+is\b/i,
  /\bthe\s+correct\s+answer\s+is\b/i,
  /^rule\s*:/i,
  /^correction\s*:/i,
  /^feedback\s*:/i,
  /\bhere\s+is\s+how\s+(you\s+should\s+|to\s+)reply\b/i,
  /\blet\s+me\s+teach\s+you\b/i,
  /\bnever\s+promise\b/i,
  /\balways\s+tell\s+the\s+user\b/i,
  /\balways\s+ask\s+if\b/i,
  /\byou\s+should\s+have\s+said\b/i,
  /\bincorrect[.,!]/i,
];

const EMAIL_HEADER_REGEX = /(?:From|To|Subject|Date|Sent|Cc):\s*([^\n\r]+)/gi;
const GREETING_REGEX = /^(?:hi|hello|hey|dear|good\s+morning|good\s+afternoon|good\s+evening)\s+[^,\n]+[,!]?/gim;
const SIGN_OFF_REGEX = /(?:best\s+regards|regards|sincerely|thanks|thank\s+you|cheers|yours\s+truly|sent\s+from\s+my|confidentiality\s+notice)[\s\S]*$/gi;

/**
 * Extracts the real core question from long pasted email threads or identifies teaching intent.
 */
export function parseCustomerInput(rawInput: string): ParsedCustomerInput {
  const trimmed = rawInput.trim();

  // 1. Check for explicit or inline Teaching Intent (Task 3.1 & 3.4)
  for (const trigger of TEACH_TRIGGERS) {
    if (trigger.test(trimmed)) {
      return {
        mode: "teach",
        extractedCoreQuery: trimmed,
        isPastedThread: false,
        rawInput: trimmed,
        suggestedAction: "learn_lesson",
      };
    }
  }

  // 2. Detect Long Pasted Emails / Chat Threads
  const hasEmailHeaders = /From:\s*|To:\s*|Subject:\s*|Sent:\s*|On\s+.*wrote:/i.test(trimmed);
  const isPastedEmail = trimmed.length > 200 || hasEmailHeaders;

  if (isPastedEmail) {
    let subject: string | undefined;
    let from: string | undefined;

    const fromMatch = trimmed.match(/From:\s*([^\n\r]+)/i);
    if (fromMatch) from = fromMatch[1].trim();

    const subjectMatch = trimmed.match(/Subject:\s*([^\n\r]+)/i);
    if (subjectMatch) subject = subjectMatch[1].trim();

    // Strip email headers
    let cleaned = trimmed.replace(EMAIL_HEADER_REGEX, "");

    // Strip standard email greetings and signoffs
    cleaned = cleaned.replace(GREETING_REGEX, "");
    cleaned = cleaned.replace(SIGN_OFF_REGEX, "");

    // Extract interrogative sentences or core question lines
    const sentences = cleaned
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    // Prioritize sentences ending with '?'
    const questions = sentences.filter((s) => s.endsWith("?"));

    // Prioritize sentences with question/action words
    const actionable = sentences.filter((s) =>
      /\b(how (do|can|to)|where (is|do)|why (is|does)|what is|can you|could you|is there|need help with|issue with|problem with|error)\b/i.test(
        s
      )
    );

    let coreQuery = "";
    if (questions.length > 0) {
      coreQuery = questions.join(" ");
    } else if (actionable.length > 0) {
      coreQuery = actionable[0];
    } else if (subject) {
      coreQuery = subject;
    } else {
      coreQuery = sentences[0] || trimmed.slice(0, 150);
    }

    return {
      mode: "ask",
      extractedCoreQuery: coreQuery.trim(),
      isPastedThread: true,
      rawInput: trimmed,
      emailHeaders: { from, subject },
      suggestedAction: "answer",
    };
  }

  return {
    mode: "ask",
    extractedCoreQuery: trimmed,
    isPastedThread: false,
    rawInput: trimmed,
    suggestedAction: "answer",
  };
}
