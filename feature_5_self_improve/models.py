from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from feature_1_workspace.models import Base


class SelfImproveRun(Base):
    __tablename__ = "self_improve_runs"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    failing_test_summary: Mapped[str] = mapped_column(Text, nullable=False)
    opus_branch_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rounds_used: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    score_before: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    score_after: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending_review")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = {"extend_existing": True}
