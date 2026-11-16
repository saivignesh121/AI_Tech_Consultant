"""FastAPI router for Feature 2: Knowledge Brain."""

from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse
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
    user, business = auth
    sitemaps = (await db.execute(select(Sitemap).where(Sitemap.business_id == business.id).order_by(Sitemap.created_at.desc()))).scalars().all()
    pages = (await db.execute(select(KnowledgePage).where(KnowledgePage.business_id == business.id).limit(100))).scalars().all()
    instructions = (await db.execute(select(Instruction).where(Instruction.business_id == business.id))).scalars().all()
    skills = (await db.execute(select(Skill).where(Skill.business_id == business.id))).scalars().all()

    return templates.TemplateResponse(
        request=request,
        name="knowledge.html",
        context={
            "user": user,
            "business": business,
            "active_tab": tab,
            "sitemaps": list(sitemaps),
            "pages": list(pages),
            "instructions": list(instructions),
            "skills": list(skills),
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
    user, business = auth
    clean_url = sitemap_url.strip()
    if not clean_url:
        raise HTTPException(status_code=422, detail="Sitemap URL is required.")

    plan = await generate_ingestion_plan([clean_url])

    sitemaps = (await db.execute(select(Sitemap).where(Sitemap.business_id == business.id))).scalars().all()
    pages = (await db.execute(select(KnowledgePage).where(KnowledgePage.business_id == business.id).limit(100))).scalars().all()
    instructions = (await db.execute(select(Instruction).where(Instruction.business_id == business.id))).scalars().all()
    skills = (await db.execute(select(Skill).where(Skill.business_id == business.id))).scalars().all()

    return templates.TemplateResponse(
        request=request,
        name="knowledge.html",
        context={
            "user": user,
            "business": business,
            "active_tab": "sitemaps",
            "sitemaps": list(sitemaps),
            "pages": list(pages),
            "instructions": list(instructions),
            "skills": list(skills),
            "plan_result": plan,
            "entered_url": clean_url,
        },
    )


@router.get("/ping")
async def knowledge_ping():
    # Public health check for Knowledge Brain
    return {"status": "ok", "feature": "knowledge_brain"}


@router.post("/instructions/add", response_class=HTMLResponse)
async def add_instruction_route(
    request: Request,
    title: str = Form(...),
    content: str = Form(...),
    auth = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new instruction rule."""
    user, business = auth
    from feature_2_knowledge_brain.instruction_skill_service import create_instruction
    await create_instruction(db, business.id, title.strip(), content.strip())
    return RedirectResponse(url="/knowledge?tab=instructions", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/skills/add", response_class=HTMLResponse)
async def add_skill_route(
    request: Request,
    name: str = Form(...),
    trigger_condition: str = Form(...),
    steps_markdown: str = Form(...),
    auth = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new agent skill guide."""
    user, business = auth
    from feature_2_knowledge_brain.instruction_skill_service import create_skill
    await create_skill(db, business.id, name.strip(), trigger_condition.strip(), steps_markdown.strip())
    return RedirectResponse(url="/knowledge?tab=skills", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/emails/synthesize", response_class=HTMLResponse)
async def synthesize_email_notes_route(
    request: Request,
    thread_subject: str = Form(...),
    coaching_notes: str = Form(...),
    auth = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Synthesize coaching notes from an email thread into a proposed skill."""
    user, business = auth
    from feature_2_knowledge_brain.gmail_learning_service import synthesize_notes_into_skill, approve_and_save_synthesized_skill

    proposal = await synthesize_notes_into_skill(db, business.id, thread_subject.strip(), coaching_notes.strip())
    # Auto-approve for streamlined capstone workflow
    await approve_and_save_synthesized_skill(db, business.id, proposal)

    return RedirectResponse(url="/knowledge?tab=skills", status_code=status.HTTP_303_SEE_OTHER)
