"""FastAPI entrypoint and core application for AI Tech Consultant."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from feature_1_workspace.connections_migration import generate_migration_sql
from feature_1_workspace.connections_router import router as connections_router
from feature_1_workspace.prompts_router import router as prompts_router
from feature_1_workspace.roles_router import router as roles_router


class Settings(BaseSettings):
    """Application configuration loaded from environment or .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tech_consultant",
    )
    ollama_base_url: str = os.getenv(
        "OLLAMA_BASE_URL",
        "http://localhost:11434",
    )


settings = Settings()

_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(_db_url, echo=False, pool_pre_ping=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling startup migrations and shutdown."""
    async with engine.begin() as conn:
        ddl = (
            generate_migration_sql()
            .replace("CREATE TABLE step_model_assignments", "CREATE TABLE IF NOT EXISTS step_model_assignments")
            
        )
        for stmt in ddl.split(";\n"):
            stmt = stmt.strip()
            if stmt:
                await conn.execute(text(stmt))
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Tech Consultant",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(connections_router)
app.include_router(prompts_router)
app.include_router(roles_router)


@app.get("/health")
async def health(response: Response) -> dict:
    """Healthcheck endpoint checking PostgreSQL and Ollama connectivity."""
    db_status = "disconnected"
    ollama_status = "disconnected"

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            if result.scalar() == 1:
                db_status = "connected"
    except Exception as exc:
        db_status = f"error: {exc}"

    try:
        tags_url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(tags_url)
            if resp.status_code == 200:
                ollama_status = "connected"
            else:
                ollama_status = f"error: status code {resp.status_code}"
    except Exception as exc:
        ollama_status = f"error: {exc}"

    is_healthy = (db_status == "connected" and ollama_status == "connected")
    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if is_healthy else "degraded",
        "db": db_status,
        "ollama": ollama_status,
    }
