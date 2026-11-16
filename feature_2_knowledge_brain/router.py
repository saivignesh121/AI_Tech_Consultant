"""FastAPI router for Feature 2: Knowledge Brain (Sitemaps, Page URLs, Instructions, Skills, Past Emails)."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import get_db, require_authenticated_user
from feature_2_knowledge_brain.models import Instruction, KnowledgePage, Skill, Sitemap
from feature_2_knowledge_brain.sitemap_service import generate_ingestion_plan

_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

router = APIRouter(prefix="/knowledge", tags=["knowledge-brain"])


@router.get("", response_class=HTMLResponse)
async def knowledge_hub_page(
    request: Request,
    tab: str = "sitemaps",
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Render the unified Knowledge Brain screen with 5 tabs."""
    user, business = auth

    sitemaps_res = await db.execute(
        select(Sitemap).where(Sitemap.business_id == business.id).order_by(Sitemap.created_at.desc())
    )
    sitemaps = list(sitemaps_res.scalars().all())

    pages_res = await db.execute(
        select(KnowledgePage).where(KnowledgePage.business_id == business.id).limit(100)
    )
    pages = list(pages_res.scalars().all())

    instructions_res = await db.execute(
        select(Instruction).where(Instruction.business_id == business.id)
    )
    instructions = list(instructions_res.scalars().all())

    skills_res = await db.execute(
        select(Skill).where(Skill.business_id == business.id)
    )
    skills = list(skills_res.scalars().all())

    return templates.TemplateResponse(
        request=request,
        name="knowledge.html",
        context={
            "user": user,
            "business": business,
            "active_tab": tab,
            "sitemaps": sitemaps,
            "pages": pages,
            "instructions": instructions,
            "skills": skills,
            "plan_result": None,
        },
    )


@router.post("/sitemaps/plan", response_class=HTMLResponse)
async def sitemap_ingestion_plan_route(
    request: Request,
    sitemap_url: str = Form(...),
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Parse sitemap, detect nested indexes & duplicates, and render pre-crawl summary."""
    user, business = auth
    clean_url = sitemap_url.strip()
    if not clean_url:
        raise HTTPException(status_code=422, detail="Sitemap URL is required.")

    plan = await generate_ingestion_plan([clean_url])

    sitemaps_res = await db.execute(select(Sitemap).where(Sitemap.business_id == business.id))
    sitemaps = list(sitemaps_res.scalars().all())
    pages_res = await db.execute(select(KnowledgePage).where(KnowledgePage.business_id == business.id).limit(100))
    pages = list(pages_res.scalars().all())
    instructions = (await db.execute(select(Instruction).where(Instruction.business_id == business.id))).scalars().all()
    skills = (await db.execute(select(Skill).where(Skill.business_id == business.id))).scalars().all()

    return templates.TemplateResponse(
        request=request,
        name="knowledge.html",
        context={
            "user": user,
            "business": business,
            "active_tab": "sitemaps",
            "sitemaps": sitemaps,
            "pages": pages,
            "instructions": instructions,
            "skills": skills,
            "plan_result": plan,
            "entered_url": clean_url,
        },
    )
