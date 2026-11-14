"""Pre-LLM and pre-log PII masking (credit/debit cards, phone numbers, street addresses)."""

from __future__ import annotations

import re
from typing import Any

_CARD_CANDIDATE_RE = re.compile(r"(?<!\d)(?:\d[ -]*?){13,19}(?!\d)")

_PHONE_RE = re.compile(
    r"(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{4}(?!\w)"
)

_STREET_ADDRESS_RE = re.compile(
    r"\b\d{1,6}[A-Za-z]?\s+(?:[A-Za-z0-9.'-]+\s+){1,5}"
    r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|"
    r"Way|Parkway|Pkwy|Terrace|Ter|Place|Pl|Circle|Cir|Mall)\.?"
    r"(?:\s*(?:,?|\s*(?:Apt|Apartment|Suite|Ste|Unit|Floor|Fl|#)\s*[A-Za-z0-9-]+))?\b",
    re.IGNORECASE,
)

def _passes_luhn(digits: str) -> bool:
    total = 0
    reverse_digits = digits[::-1]
    for idx, ch in enumerate(reverse_digits):
        n = ord(ch) - 48
        if idx % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0

def _replace_card(match: re.Match[str]) -> str:
    raw = match.group(0)
    digits = re.sub(r"\D", "", raw)
    if 13 <= len(digits) <= 19 and _passes_luhn(digits):
        return "[REDACTED_CARD]"
    return raw

def mask_pii(text: str) -> str:
    """Redact card numbers, phone numbers, and street addresses before LLM or log storage."""
    if not text:
        return text
    masked = _CARD_CANDIDATE_RE.sub(_replace_card, text)
    masked = _PHONE_RE.sub("[REDACTED_PHONE]", masked)
    masked = _STREET_ADDRESS_RE.sub("[REDACTED_ADDRESS]", masked)
    return masked

def mask_payload(value: Any) -> Any:
    """Recursively mask PII across strings, lists, and dicts."""
    if isinstance(value, str):
        return mask_pii(value)
    if isinstance(value, list):
        return [mask_payload(item) for item in value]
    if isinstance(value, dict):
        return {k: mask_payload(v) for k, v in value.items()}
    return value
