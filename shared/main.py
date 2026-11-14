"""FastAPI entrypoint and core application for AI Tech Consultant."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


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

# Normalize database URL to use asyncpg driver for SQLAlchemy async engine
_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(_db_url, echo=False, pool_pre_ping=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling application startup and shutdown."""
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Tech Consultant",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health(response: Response) -> dict:
    """Healthcheck endpoint checking PostgreSQL and Ollama connectivity."""
    db_status = "disconnected"
    ollama_status = "disconnected"

    # 1. Check PostgreSQL (SELECT 1)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            if result.scalar() == 1:
                db_status = "connected"
    except Exception as exc:
        db_status = f"error: {exc}"

    # 2. Check Ollama (/api/tags)
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
