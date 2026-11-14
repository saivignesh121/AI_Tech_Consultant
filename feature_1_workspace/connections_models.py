"""
connections_models.py

Canonical model list and pipeline step model assignments.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    select,
)
from sqlalchemy.dialects.postgresql import UUID, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from feature_1_workspace.models import Base

# ---------------------------------------------------------------------------
# Pipeline step names
# ---------------------------------------------------------------------------

PIPELINE_STEPS: list[str] = [
    "tag_job",
    "find_facts",
    "write_answer",
    "read_screenshot",
    "improve_skill",
    "write_lesson",
    "judge_answer",
]

# ---------------------------------------------------------------------------
# Available models
# ---------------------------------------------------------------------------

AVAILABLE_MODELS: list[dict[str, str]] = [
    # Claude
    {"id": "claude-opus-5-5",    "label": "Claude Opus 5.5",    "provider": "claude"},
    {"id": "claude-sonnet-5-5",  "label": "Claude Sonnet 5.5",  "provider": "claude"},
    {"id": "claude-haiku-5-5",   "label": "Claude Haiku 5.5",   "provider": "claude"},
    # Gemini
    {"id": "gemini-3.8-flash",       "label": "Gemini 3.8 Flash",       "provider": "gemini"},
    {"id": "gemini-3-flash",         "label": "Gemini 3 Flash",         "provider": "gemini"},
    {"id": "gemini-2.5-flash-lite",  "label": "Gemini 2.5 Flash-Lite",  "provider": "gemini"},
    # OpenRouter – Nvidia Nemotron
    {"id": "nvidia/nemotron-3-ultra-550b-a55b:free", "label": "Nemotron 3 Ultra 550B - Free", "provider": "openrouter"},
    {"id": "nvidia/nemotron-3.5-super-vl:free",      "label": "Nemotron 3.5 Super VL - Free", "provider": "openrouter"},
    {"id": "nvidia/nemotron-3.5-lightning:free",     "label": "Nemotron 3.5 Lightning - Free", "provider": "openrouter"},
    # OpenRouter – Google Gemma / Qwen
    {"id": "google/gemma-4-31b-it:free", "label": "Gemma 4 31B - Free", "provider": "openrouter"},
    {"id": "qwen/qwen3.8-max-0902",      "label": "Qwen 3.8 Max",       "provider": "openrouter"},
    {"id": "qwen/qwen3.7-flash",         "label": "Qwen 3.7 Flash",     "provider": "openrouter"},
    # Local (Ollama)
    {"id": "ollama/gemma4:e4b",   "label": "gemma4:e4b - Local",  "provider": "local"},
    {"id": "ollama/qwen3.5:4b",   "label": "qwen3.5:4b - Local",  "provider": "local"},
]

# Fast lookup sets (built once at import time)
_VALID_STEP_NAMES: frozenset[str] = frozenset(PIPELINE_STEPS)
_VALID_MODEL_IDS: frozenset[str] = frozenset(m["id"] for m in AVAILABLE_MODELS)

# ---------------------------------------------------------------------------
# SQLAlchemy 2.0 ORM model
# ---------------------------------------------------------------------------

_STEP_CHECK_LITERAL = "', '".join(PIPELINE_STEPS)


class StepModelAssignment(Base):
    """Maps a pipeline step to a chosen LLM model for a given business."""

    __tablename__ = "step_model_assignments"

    __table_args__ = (
        UniqueConstraint("business_id", "step_name", name="uq_step_model_biz_step"),
        CheckConstraint(
            f"step_name IN ('{_STEP_CHECK_LITERAL}')",
            name="ck_step_model_valid_step",
        ),
        Index("ix_step_model_business_id", "business_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    step_name: Mapped[str] = mapped_column(String(50), nullable=False)
    model_id: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<StepModelAssignment business={self.business_id} "
            f"step={self.step_name!r} model={self.model_id!r}>"
        )


# ---------------------------------------------------------------------------
# Async service functions
# ---------------------------------------------------------------------------


async def get_step_assignments(
    business_id: uuid.UUID,
    db: AsyncSession,
) -> dict[str, str]:
    """Return all step→model assignments for the given business.

    Returns a dict keyed by step_name. Steps that have no explicit assignment
    are absent from the returned dict.
    """
    result = await db.execute(
        select(StepModelAssignment.step_name, StepModelAssignment.model_id).where(
            StepModelAssignment.business_id == business_id
        )
    )
    return {row.step_name: row.model_id for row in result.all()}


async def upsert_step_assignment(
    business_id: uuid.UUID,
    step_name: str,
    model_id: str,
    db: AsyncSession,
) -> StepModelAssignment:
    """Create or update the model assignment for *step_name* under *business_id*.

    Raises HTTP 422 if *step_name* or *model_id* are invalid.
    Uses PostgreSQL INSERT … ON CONFLICT DO UPDATE (SQLAlchemy 2.0 style).
    """
    if step_name not in _VALID_STEP_NAMES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid step_name {step_name!r}. "
                f"Must be one of: {sorted(_VALID_STEP_NAMES)}"
            ),
        )
    if model_id not in _VALID_MODEL_IDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid model_id {model_id!r}. "
                f"Must be one of the {len(AVAILABLE_MODELS)} available models."
            ),
        )

    now = datetime.utcnow()
    new_id = uuid.uuid4()

    stmt = (
        insert(StepModelAssignment)
        .values(
            id=new_id,
            business_id=business_id,
            step_name=step_name,
            model_id=model_id,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_step_model_biz_step",
            set_={
                "model_id": model_id,
                "updated_at": now,
            },
        )
        .returning(StepModelAssignment)
    )

    result = await db.execute(stmt)
    await db.flush()

    row: Any = result.scalar_one()
    return row
