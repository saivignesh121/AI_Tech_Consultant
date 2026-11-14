"""SQLAlchemy model, canonical defaults, and placeholder validator for Task 1.3."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from feature_1_workspace.models import Base

ALLOWED_PROMPT_TYPES: tuple[str, ...] = (
    "master_system",
    "user_wrapper",
    "lesson_injection",
    "skill_calling",
    "judge_evaluation",
)

PROMPT_SPECS: Dict[str, Dict[str, Any]] = {
    "master_system": {
        "label": "Master System Prompt",
        "description": "Core identity, grounding rules, tone guardrails, and escalation policy sent in the cached system prefix.",
        "required_variables": [
            "business_name",
            "role_name",
            "role_instructions",
            "tone_guidelines",
        ],
        "default_template": (
            "You are {role_name}, the dedicated AI Technical Consultant for {business_name}.\n"
            "Follow these role instructions strictly:\n"
            "{role_instructions}\n\n"
            "Tone & Communication Guidelines:\n"
            "{tone_guidelines}\n\n"
            "Core Grounding & Safety Policy:\n"
            "1. Answer strictly from verified Knowledge Brain articles, approved lessons, and active skills.\n"
            "2. Never invent settings, prices, URLs, or undocumented API parameters.\n"
            "3. Mask any sensitive customer PII (phone numbers, card numbers, street addresses) before logging.\n"
            "4. Immediately flag refund disputes, legal threats, billing changes, or angry escalations for human handoff."
        ),
    },
    "user_wrapper": {
        "label": "User Message Wrapper",
        "description": "Wraps the customer inquiry with retrieved Knowledge Brain passages and recent conversation context.",
        "required_variables": [
            "customer_name",
            "customer_query",
            "knowledge_results",
            "conversation_history",
        ],
        "default_template": (
            "Customer: {customer_name}\n\n"
            "Recent Conversation History:\n"
            "{conversation_history}\n\n"
            "Retrieved Knowledge Brain Context:\n"
            "{knowledge_results}\n\n"
            "Current Customer Inquiry:\n"
            "{customer_query}\n\n"
            "Provide an accurate, well-structured response grounded in the Knowledge Brain context above."
        ),
    },
    "lesson_injection": {
        "label": "Lesson Injection Block",
        "description": "Injects human-approved correction lessons and edge-case overrides into the active context.",
        "required_variables": [
            "lessons_markdown",
            "escalation_rules",
        ],
        "default_template": (
            "Approved Team Lessons & Corrections (Always Prioritize Over Generic Defaults):\n"
            "{lessons_markdown}\n\n"
            "Mandatory Human Escalation Triggers:\n"
            "{escalation_rules}"
        ),
    },
    "skill_calling": {
        "label": "Skill Selection & Tool Calling",
        "description": "Guides the router/agent when selecting allowed workspace skills and structured actions.",
        "required_variables": [
            "available_skills",
            "user_intent",
            "business_context",
        ],
        "default_template": (
            "Business Context: {business_context}\n"
            "Detected User Intent: {user_intent}\n\n"
            "Available Authorized Skills:\n"
            "{available_skills}\n\n"
            "Select the single most relevant skill only if all preconditions are satisfied; otherwise answer directly from verified knowledge."
        ),
    },
    "judge_evaluation": {
        "label": "Eval Lab & Self-Improve Judge",
        "description": "Rubric used by the Judge model to score accuracy, citation fidelity, tone, and safety.",
        "required_variables": [
            "question",
            "expected_answer",
            "candidate_answer",
            "source_context",
        ],
        "default_template": (
            "Evaluate the candidate support response against the ground-truth reference and source context.\n\n"
            "Question: {question}\n"
            "Source Context: {source_context}\n"
            "Expected Reference Answer: {expected_answer}\n"
            "Candidate Response: {candidate_answer}\n\n"
            "Score factual accuracy, completeness, citation grounding, and tone on a 1-5 scale and return structured JSON."
        ),
    },
}

_PLACEHOLDER_RE = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


def extract_variables(template_text: str) -> List[str]:
    """Return deduplicated placeholder names in appearance order."""
    seen: set[str] = set()
    ordered: List[str] = []
    for match in _PLACEHOLDER_RE.finditer(template_text):
        name = match.group(1)
        if name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


def validate_template_variables(prompt_type: str, template_text: str) -> List[str]:
    """Validate prompt_type and verify all required {variables} exist in template_text.

    Raises HTTPException(422) if prompt_type is invalid, template_text is empty,
    or any required variable is missing.
    """
    if prompt_type not in PROMPT_SPECS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported prompt_type '{prompt_type}'. Allowed: {', '.join(ALLOWED_PROMPT_TYPES)}",
        )

    cleaned = (template_text or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Prompt template text cannot be empty.",
        )

    found = extract_variables(cleaned)
    found_set = set(found)
    required = PROMPT_SPECS[prompt_type]["required_variables"]
    missing = [var for var in required if var not in found_set]
    if missing:
        missing_fmt = ", ".join(f"{{{m}}}" for m in missing)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required template variable(s): {missing_fmt}",
        )

    return found


class PromptVersion(Base):
    """Versioned, tenant-scoped prompt templates stored in PostgreSQL."""

    __tablename__ = "prompt_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    prompt_type: Mapped[str] = mapped_column(String(50), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    template_text: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "prompt_type",
            "version_number",
            name="uq_prompt_versions_biz_type_ver",
        ),
        Index(
            "idx_prompt_versions_biz_type_ver",
            "business_id",
            "prompt_type",
            "version_number",
        ),
        CheckConstraint(
            "prompt_type IN ('master_system', 'user_wrapper', 'lesson_injection', 'skill_calling', 'judge_evaluation')",
            name="ck_prompt_versions_type",
        ),
    )
