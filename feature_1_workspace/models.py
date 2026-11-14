"""SQLAlchemy 2.0 ORM Models for Multi-Tenant Workspace & Identity."""

from datetime import datetime, timezone
from decimal import Decimal
import uuid
from typing import List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    """Return current UTC timestamp with timezone."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy 2.0 models."""
    pass


class Business(Base):
    """The root tenant entity. Every piece of business-specific data cascades from this table."""

    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    support_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    autonomous_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    readiness_threshold: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("85.00")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    __table_args__ = (
        CheckConstraint(
            "readiness_threshold >= 0 AND readiness_threshold <= 100",
            name="ck_businesses_readiness",
        ),
    )

    # Relationships cascading from business
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="business", cascade="all, delete-orphan", passive_deletes=True
    )
    onboarding: Mapped[Optional["OnboardingStatus"]] = relationship(
        "OnboardingStatus",
        back_populates="business",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    roles: Mapped[List["AgentRole"]] = relationship(
        "AgentRole", back_populates="business", cascade="all, delete-orphan", passive_deletes=True
    )
    connections: Mapped[List["Connection"]] = relationship(
        "Connection", back_populates="business", cascade="all, delete-orphan", passive_deletes=True
    )
    knowledge_pages: Mapped[List["KnowledgePage"]] = relationship(
        "KnowledgePage", back_populates="business", cascade="all, delete-orphan", passive_deletes=True
    )
    knowledge_chunks: Mapped[List["KnowledgeChunk"]] = relationship(
        "KnowledgeChunk", back_populates="business", cascade="all, delete-orphan", passive_deletes=True
    )


class User(Base):
    """Authenticated human operator, administrator, or developer belonging to a business."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    __table_args__ = (
        CheckConstraint("role IN ('owner', 'admin', 'member')", name="ck_users_role"),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="users")


class OnboardingStatus(Base):
    """Tracks progression of the 15-minute Go Live wizard across steps."""

    __tablename__ = "onboarding_status"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    step_1_business_profile: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    step_2_api_keys: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    step_3_knowledge_ingestion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    step_4_role_persona: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    step_5_live_verification: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    step_6_email_activation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    readiness_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00")
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    __table_args__ = (
        CheckConstraint("current_step BETWEEN 1 AND 6", name="ck_onboarding_step"),
        CheckConstraint(
            "readiness_score >= 0 AND readiness_score <= 100", name="ck_onboarding_score"
        ),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="onboarding")


class AgentRole(Base):
    """Configurable agent persona defining system prompts, tone sliders, and tool access."""

    __tablename__ = "agent_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    tone: Mapped[str] = mapped_column(String(50), nullable=False, default="technical")
    verbosity: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    technical_depth: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    politeness: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    permitted_skills: Mapped[Optional[list]] = mapped_column(ARRAY(String), nullable=True)
    handover_criteria: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {"auto_handover_on_refund": True, "auto_handover_on_legal": True},
    )
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    __table_args__ = (
        UniqueConstraint("business_id", "slug", name="uq_agent_roles_biz_slug"),
        CheckConstraint(
            "verbosity BETWEEN 1 AND 5 AND technical_depth BETWEEN 1 AND 5 AND politeness BETWEEN 1 AND 5",
            name="ck_agent_roles_sliders",
        ),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="roles")


class Connection(Base):
    """Encrypted provider credentials, API keys, and connection settings."""

    __tablename__ = "connections"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    encrypted_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    base_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    encrypted_oauth_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    encrypted_refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scopes: Mapped[Optional[list]] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="unverified")
    last_tested_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_ping_latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    __table_args__ = (
        UniqueConstraint("business_id", "provider", name="uq_connections_biz_provider"),
        CheckConstraint(
            "status IN ('active', 'invalid', 'expired', 'unverified')",
            name="ck_connections_status",
        ),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="connections")


class KnowledgePage(Base):
    """Canonical ingested documentation pages belonging to a business."""

    __tablename__ = "knowledge_pages"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    normalized_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="manual_url")
    title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    current_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    health_level: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    __table_args__ = (
        UniqueConstraint("business_id", "normalized_url", name="uq_knowledge_pages_biz_norm_url"),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="knowledge_pages")
    page_versions: Mapped[List["PageVersion"]] = relationship(
        "PageVersion", back_populates="knowledge_page", cascade="all, delete-orphan", passive_deletes=True
    )


class PageVersion(Base):
    """Historical versioned snapshot of page content."""

    __tablename__ = "page_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    knowledge_page_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("knowledge_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    raw_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cleaned_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    screenshot_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    __table_args__ = (
        UniqueConstraint("knowledge_page_id", "version_number", name="uq_page_versions_page_ver"),
    )

    knowledge_page: Mapped["KnowledgePage"] = relationship(
        "KnowledgePage", back_populates="page_versions"
    )


class KnowledgeChunk(Base):
    """Chunked vector embeddings with pgvector HNSW indexing."""

    __tablename__ = "knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    knowledge_page_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("knowledge_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_version_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("page_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    heading: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding = mapped_column(Vector(1536), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    business: Mapped["Business"] = relationship("Business", back_populates="knowledge_chunks")
