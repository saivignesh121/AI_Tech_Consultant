from feature_3_chat.router import router as chat_router
import feature_3_chat.models
"""Main FastAPI application for AI Tech Consultant."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from feature_1_workspace.models import Base
from feature_1_workspace.database import ensure_app_role_exists
from feature_1_workspace.connections_migration import generate_migration_sql
from feature_1_workspace.connections_router import router as connections_router
from feature_1_workspace.prompts_router import router as prompts_router
from feature_1_workspace.roles_router import router as roles_router
from feature_1_workspace.logs_router import router as logs_router
from feature_2_knowledge_brain.router import router as knowledge_router
import feature_2_knowledge_brain.models  # Registers Feature 2 models

_db_url = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@db:5432/ai_tech_consultant",
)
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(_db_url, echo=False, pool_pre_ping=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling startup table creation and migrations safely."""
    try:
        await ensure_app_role_exists(engine)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            ddl = generate_migration_sql().replace(
                "CREATE TABLE step_model_assignments",
                "CREATE TABLE IF NOT EXISTS step_model_assignments",
            )
            for stmt in ddl.split(";\n"):
                stmt = stmt.strip()
                if stmt:
                    try:
                        await conn.execute(text(stmt))
                    except Exception:
                        pass
    except Exception as exc:
        print(f"Lifespan startup notice: {exc}")
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Tech Consultant",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_path = getattr(app, "include_path", None)
app.include_router(connections_router)
app.include_router(prompts_router)
app.include_router(roles_router)
app.include_router(logs_router)
app.include_router(knowledge_router)
app.include_router(chat_router)


@app.get("/health")
async def health_check(response: Response):
    """Health check endpoint."""
    return {"status": "healthy"}
