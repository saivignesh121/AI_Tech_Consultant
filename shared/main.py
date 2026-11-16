from feature_1_workspace.database import ensure_app_role_exists
"""Main FastAPI application for AI Tech Consultant."""
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from feature_1_workspace.models import Base
from feature_1_workspace.auth_router import router as auth_router

from feature_1_workspace.roles_router import router as roles_router
from feature_2_knowledge_brain.router import router as knowledge_router
import feature_2_knowledge_brain.models  # Registers Feature 2 models
from shared.database import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_app_role_exists()
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        print(f"Lifespan startup notice: {exc}")
    yield
    await engine.dispose()

app = FastAPI(title="AI Tech Consultant", version="1.0.0", lifespan=lifespan)
app.include_router(auth_router)

app.include_router(roles_router)
app.include_router(knowledge_router)

@app.get("/health")
async def health_check(response: Response):
    return {"status": "healthy"}
