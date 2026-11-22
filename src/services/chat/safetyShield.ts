/**
 * Safety Shield: Prompt Injection Interceptor & Human Escalation Safety Valve
 * Task 3.6: 10 trick injection defenses (pasted messages & scraped web pages),
 * and automatic "Send to a human" notes for angry, refund, and legal questions.
 */

export interface SafetyCheckResult {
  isSafe: boolean;
  isInjected: boolean;
  isEscalated: boolean;
  escalationReason?: "angry_sentiment" | "refund_demand" | "legal_threat";
  shieldViolation?: string;
  matchedScenario?: string;
  sanitizedMessage: string;
}

export interface ScrapedSafetyCheckResult {
  isSafe: boolean;
  isInjected: boolean;
  sanitizedContent: string;
  threatsNeutralized: string[];
}

// 10 Trick Injection Scenario Definitions (Task 3.6)
export const TRICK_INJECTION_SCENARIOS = [
  {
    id: "ignore_previous",
    name: "Ignore Previous Instructions Override",
    pattern: /ignore\s+(all\s+)?(previous|prior|above|existing)\s+(instructions|prompts|rules|commands|constraints)/i,
  },
  {
    id: "developer_mode",
    name: "Developer Mode / God Mode Bypass",
    pattern: /(?:you\s+are\s+now\s+in|enable|switch\s+to)\s+(?:developer\s+mode|god\s+mode|debug\s+mode|unrestricted\s+mode)/i,
  },
  {
    id: "system_override",
    name: "System Override Command",
    pattern: /\b(?:system\s*override|override\s+system\s+prompt|admin\s+override)\b/i,
  },
  {
    id: "prompt_exfiltration",
    name: "Master System Prompt Exfiltration",
    pattern: /(?:show|reveal|print|dump|output|repeat|leak|display)\s+(?:me\s+)?(?:your|the)?\s*.*?\b(?:system|hidden|internal|master|base)\s+prompt\b/i,
  },
  {
    id: "secrets_dump",
    name: "Credentials & Secrets Extraction",
    pattern: /(?:reveal|dump|leak|print|show|extract)\s+(?:all\s+)?(?:api[_\s-]?keys|passwords|database\s+credentials|secrets\s+stored\s+in|secrets|environment\s+variables|tokens)/i,
  },
  {
    id: "guardrail_disregard",
    name: "Disregard Safety Guardrails",
    pattern: /(?:disregard|ignore|bypass|disable|remove)\s+(?:all\s+)?(?:the\s+)?(?:(?:safety\s+)?guardrails|safety\s+filters|security\s+protocols|ethical\s+boundaries|content\s+moderation)/i,
  },
  {
    id: "dan_jailbreak",
    name: "DAN (Do Anything Now) Jailbreak",
    pattern: /\b(?:dan\s+mode|do\s+anything\s+now|jailbreak)\b/i,
  },
  {
    id: "roleplay_bypass",
    name: "Unrestricted Roleplay Bypass",
    pattern: /(?:pretend|roleplay|act\s+as)\b[\s\S]*?\b(?:unrestricted|unaligned|jailbroken|evil|ruleless|filterless|hypothetical)\b[\s\S]*?\b(?:ai|assistant|model|bot)\b/i,
  },
  {
    id: "delimiter_attack",
    name: "Delimiter & Markdown Fence Attack",
    pattern: /(?:###\s*system\s*:|```(?:markdown|system)?\s*\n\s*\[?(?:SYSTEM|INSTRUCTION|RESET))/i,
  },
  {
    id: "tag_injection",
    name: "XML/HTML Tag & Token Injection",
    pattern: /<\/?(?:system(?:_override)?|admin(?:_override)?|prompt_reset|instruction_override)>/i,
  },
];

// Escalation Patterns (Angry, Refund, Legal)
const LEGAL_PATTERNS = /\b(lawyer|attorney|legal\s+action|lawsuit|sue\s+you|court|subpoena|litigation|breach\s+of\s+contract|arbitration)\b/i;
const REFUND_PATTERNS = /\b(refund(\s+me)?|money\s+back|chargeback|dispute\s+the\s+charge|cancel\s+and\s+refund|return\s+my\s+funds)\b/i;
const ANGRY_PATTERNS = /\b(scam|fraud|unacceptable|furious|terrible\s+service|report\s+you|stolen\s+my\s+money|speak\s+with\s+(the\s+)?manager|worst\s+company|utterly\s+useless|ripoff)\b/i;

/**
 * Evaluates an incoming message for prompt injection attacks and safety escalation policies.
 * Covers the 10 trick injection scenarios and human safety valves.
 */
export function evaluateMessageSafety(message: string): SafetyCheckResult {
  if (!message || typeof message !== "string") {
    return {
      isSafe: true,
      isInjected: false,
      isEscalated: false,
      sanitizedMessage: "",
    };
  }

  // 1. Check for Prompt Injections (Task 3.6 - 10 trick injection scenarios)
  for (const scenario of TRICK_INJECTION_SCENARIOS) {
    if (scenario.pattern.test(message)) {
      return {
        isSafe: false,
        isInjected: true,
        isEscalated: false,
        matchedScenario: scenario.id,
        shieldViolation: `Prompt injection attempt detected and neutralized: ${scenario.name}`,
        sanitizedMessage: "[REDACTED_SECURITY_VIOLATION]",
      };
    }
  }

  // 2. Check for Human Escalation Triggers (Task 3.6: Angry, Refund, Legal)
  if (LEGAL_PATTERNS.test(message)) {
    return {
      isSafe: true,
      isInjected: false,
      isEscalated: true,
      escalationReason: "legal_threat",
      sanitizedMessage: message,
    };
  }

  if (REFUND_PATTERNS.test(message)) {
    return {
      isSafe: true,
      isInjected: false,
      isEscalated: true,
      escalationReason: "refund_demand",
      sanitizedMessage: message,
    };
  }

  if (ANGRY_PATTERNS.test(message)) {
    return {
      isSafe: true,
      isInjected: false,
      isEscalated: true,
      escalationReason: "angry_sentiment",
      sanitizedMessage: message,
    };
  }

  return {
    isSafe: true,
    isInjected: false,
    isEscalated: false,
    sanitizedMessage: message,
  };
}

/**
 * Scans scraped web page content for indirect prompt injections and malicious instructions.
 * Task 3.6: Protects the Knowledge Brain against tainted websites, hidden HTML comments,
 * and zero-font markdown overrides.
 */
export function scanScrapedDocumentSafety(
  rawContent: string,
  pageUrl: string = "https://example.com"
): ScrapedSafetyCheckResult {
  if (!rawContent || typeof rawContent !== "string") {
    return {
      isSafe: true,
      isInjected: false,
      sanitizedContent: "",
      threatsNeutralized: [],
    };
  }

  let sanitized = rawContent;
  const threatsNeutralized: string[] = [];

  // 1. Indirect injection hidden in HTML comments: <!-- Ignore previous instructions ... -->
  const htmlCommentInjection = /<!--\s*(?:system|instruction|admin|ignore\s+all|override)[\s\S]*?-->/gi;
  if (htmlCommentInjection.test(sanitized)) {
    threatsNeutralized.push("Malicious hidden HTML comment injection intercepted");
    sanitized = sanitized.replace(htmlCommentInjection, " [REDACTED_HIDDEN_COMMENT] ");
  }

  // 2. Hidden CSS style injection (e.g. style="display:none", font-size:0, visibility:hidden)
  const hiddenCssInjection = /<(?:div|span|p|section|article)[^>]*style=["'][^"']*\b(?:display\s*:\s*none|font-size\s*:\s*0|visibility\s*:\s*hidden|opacity\s*:\s*0)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|span|p|section|article)>/gi;
  if (hiddenCssInjection.test(sanitized)) {
    threatsNeutralized.push("Hidden CSS zero-font text injection intercepted");
    sanitized = sanitized.replace(hiddenCssInjection, " [REDACTED_HIDDEN_CSS_PAYLOAD] ");
  }

  // 3. Delimiter and Tag Injection inside scraped content
  for (const scenario of TRICK_INJECTION_SCENARIOS) {
    if (scenario.pattern.test(sanitized)) {
      threatsNeutralized.push(`Indirect prompt injection neutralized (${scenario.name})`);
      sanitized = sanitized.replace(scenario.pattern, " [REDACTED_INDIRECT_INJECTION] ");
    }
  }

  const isInjected = threatsNeutralized.length > 0;

  return {
    isSafe: !isInjected,
    isInjected,
    sanitizedContent: sanitized.trim(),
    threatsNeutralized,
  };
}

/**
 * Standard human escalation response formatter.
 * Task 3.6: The chat shows a clear "Send to a human" note instead of a normal answer.
 */
export function formatHumanEscalationNote(
  reason: "angry_sentiment" | "refund_demand" | "legal_threat" | string,
  ticketId?: string
): { noteTitle: string; noteBody: string; fullFormattedMessage: string } {
  const ref = ticketId || `TKT-${Date.now().toString(36).toUpperCase()}`;

  let noteTitle = "Send to a Human";
  let noteBody = "Your inquiry has been escalated for human specialist review.";

  if (reason === "legal_threat") {
    noteTitle = "Send to a Human: Legal & Compliance Executive";
    noteBody = "A ticket has been opened for our Legal & Compliance Executive. An expert will reach out directly.";
  } else if (reason === "refund_demand") {
    noteTitle = "Send to a Human: Billing & Finance Department";
    noteBody = "A ticket has been dispatched to our Billing & Finance Team for immediate human review.";
  } else if (reason === "angry_sentiment") {
    noteTitle = "Send to a Human: Senior Support Specialist";
    noteBody = "I apologize for the frustration. A senior human support specialist has been notified and will assist you.";
  }

  const fullFormattedMessage = `[${noteTitle.toUpperCase()}]\n${noteBody}\n\nTicket Reference: #${ref}\nStatus: Autonomous answering paused & assigned to human queue.`;

  return {
    noteTitle,
    noteBody,
    fullFormattedMessage,
  };
}

/**
 * Quick helper for checking prompt injection in role testing and chat endpoints.
 */
export function checkPromptInjection(message: string): { isBlocked: boolean; threatType?: string } {
  const result = evaluateMessageSafety(message);
  return {
    isBlocked: result.isInjected,
    threatType: result.isInjected ? "system_override" : undefined,
  };
}
