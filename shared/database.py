"""Shared database engine configuration to prevent circular imports."""
from __future__ import annotations
import os
from sqlalchemy.ext.asyncio import create_async_engine

_db_url = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@db:5432/ai_tech_consultant",
)
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(_db_url, echo=False, pool_pre_ping=True)
