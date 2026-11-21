/**
 * Safety Shield: Prompt Injection Interceptor & Human Escalation Safety Valve
 * Task 3.6: 10 trick injection defenses, angry/refund/legal human escalations.
 */

export interface SafetyCheckResult {
  isSafe: boolean;
  isInjected: boolean;
  isEscalated: boolean;
  escalationReason?: "angry_sentiment" | "refund_demand" | "legal_threat";
  shieldViolation?: string;
  sanitizedMessage: string;
}

// 10 Trick Injection Scenario Signatures
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /system\s*override/i,
  /(?:show|reveal|print|dump|output)\s+(?:me\s+)?(?:your|the)?\s*.*?\b(?:system|hidden|internal|master)\s+prompt\b/i,
  /reveal\s+(all\s+)?(api[_\s-]?keys|passwords|secrets|environment)/i,
  /disregard\s+(the\s+)?guardrails/i,
  /jailbreak/i,
  /###\s*system\s*:/i,
  /\bdan\s+mode\b/i,
  /bypass\s+(all\s+)?security\s+protocols/i,
  /secrets\s+stored\s+in\s+your\s+system\s+prompt/i,
];

// Escalation Patterns
const LEGAL_PATTERNS = /\b(lawyer|attorney|legal\s+action|lawsuit|sue\s+you|court|subpoena|litigation|breach\s+of\s+contract)\b/i;
const REFUND_PATTERNS = /\b(refund(\s+me)?|money\s+back|chargeback|dispute\s+the\s+charge|cancel\s+and\s+refund)\b/i;
const ANGRY_PATTERNS = /\b(scam|fraud|unacceptable|furious|terrible\s+service|report\s+you|stolen\s+my\s+money|speak\s+with\s+(the\s+)?manager|worst\s+company)\b/i;

/**
 * Evaluates an incoming message for prompt injection attacks and safety escalation policies.
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

  // 1. Check for Prompt Injections (Task 3.6 - 10 trick injection tests)
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        isSafe: false,
        isInjected: true,
        isEscalated: false,
        shieldViolation: "Prompt injection attempt detected and neutralized.",
        sanitizedMessage: "[REDACTED_SECURITY_VIOLATION]",
      };
    }
  }

  // 2. Check for Human Escalation Triggers
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
 * Quick helper for checking prompt injection in role testing and chat endpoints.
 */
export function checkPromptInjection(message: string): { isBlocked: boolean; threatType?: string } {
  const result = evaluateMessageSafety(message);
  return {
    isBlocked: result.isInjected,
    threatType: result.isInjected ? "system_override" : undefined,
  };
}
