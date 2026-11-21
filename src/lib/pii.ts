/**
 * High-performance PII masking engine to sanitize customer data before model transmission or logging.
 */

// Comprehensive regex patterns for PII detection
const PATTERNS = {
  // Matches 13 to 19-digit credit cards with optional spaces or dashes
  creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b(?:\d{4}[ -]?){2}\d{5}\b|\b\d{13,19}\b/g,

  // Matches formatted US and international phone numbers:
  // e.g., (555) 234-5678, +1-800-555-0199, 555-234-5678
  phone: /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,

  // Matches SSN format (XXX-XX-XXXX)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Matches physical street address patterns
  streetAddress: /\b\d{1,5}\s+[A-Za-z0-9.,\s]+?\b(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Terrace|Ter|Place|Pl|Square|Sq|Circle|Cir)\b(?:[\s,]+(?:Suite|Ste|Apt|Apartment|Unit|Floor|Fl)\s*[A-Za-z0-9#]+)?/gi,
};

/**
 * Validates a credit card candidate using the Luhn Algorithm.
 */
function isValidLuhn(val: string): boolean {
  const digits = val.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Masks sensitive personal data (credit cards, phone numbers, addresses, SSNs) from text.
 */
export function maskPII(text: string): { sanitized: string; maskedCount: number } {
  if (!text) return { sanitized: "", maskedCount: 0 };

  let count = 0;
  let result = text;

  // 1. Mask Luhn-valid Credit Cards FIRST (so phone regex won't match segments of card numbers)
  result = result.replace(PATTERNS.creditCard, (match) => {
    if (isValidLuhn(match)) {
      count++;
      return "[REDACTED_CARD]";
    }
    return match;
  });

  // 2. Mask SSNs
  result = result.replace(PATTERNS.ssn, () => {
    count++;
    return "[REDACTED_SSN]";
  });

  // 3. Mask Physical Street Addresses
  result = result.replace(PATTERNS.streetAddress, () => {
    count++;
    return "[REDACTED_ADDRESS]";
  });

  // 4. Mask Phone Numbers
  result = result.replace(PATTERNS.phone, () => {
    count++;
    return "[REDACTED_PHONE]";
  });

  return { sanitized: result, maskedCount: count };
}
