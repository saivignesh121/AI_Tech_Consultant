"""FastAPI router for Settings -> Roles and Live Side-by-Side Role Editor (Task 1.4)."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import get_db, require_authenticated_user
from feature_1_workspace.connections_models import AVAILABLE_MODELS
from feature_1_workspace.roles_service import (
    AVAILABLE_SKILLS,
    DEFAULT_STARTER_PROMPT,
    list_roles,
    run_role_test_chat,
    upsert_role,
)

_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

router = APIRouter(tags=["roles"])


class RolePatchPayload(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    tone: Optional[str] = None
    verbosity: Optional[int] = None
    technical_depth: Optional[int] = None
    politeness: Optional[int] = None


@router.get("/settings/roles", response_class=HTMLResponse)
async def roles_settings_page(
    request: Request,
    role_id: Optional[str] = None,
    new: bool = False,
    saved: Optional[str] = None,
    error: Optional[str] = None,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Render Settings -> Roles with pre-seeded roles, Role Editor, and Live Test Chat."""
    user, business = auth
    roles = await list_roles(db, business.id)

    selected_role = None
    if not new:
        if role_id:
            selected_role = next((r for r in roles if str(r.id) == role_id), None)
        if selected_role is None and roles:
            selected_role = roles[0]

    return templates.TemplateResponse(
        request=request,
        name="settings_roles.html",
        context={
            "user": user,
            "business": business,
            "roles": roles,
            "selected_role": selected_role,
            "is_new_role": bool(new or selected_role is None),
            "default_starter_prompt": DEFAULT_STARTER_PROMPT,
            "available_skills": AVAILABLE_SKILLS,
            "available_models": AVAILABLE_MODELS,
            "saved_notice": saved,
            "error_notice": error,
        },
    )


@router.post("/settings/roles/save")
async def save_role_route(
    request: Request,
    role_id: str = Form(""),
    name: str = Form(...),
    description: str = Form(""),
    system_prompt: str = Form(...),
    tone: str = Form("technical"),
    verbosity: int = Form(3),
    technical_depth: int = Form(3),
    politeness: int = Form(3),
    permitted_skills: List[str] = Form(default=[]),
    assigned_model: str = Form("gemma4:e4b"),
    auto_handover_on_refund: Optional[str] = Form(None),
    auto_handover_on_legal: Optional[str] = Form(None),
    auto_handover_on_angry: Optional[str] = Form(None),
    custom_triggers: str = Form(""),
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update an AgentRole from the no-code Role Editor."""
    _, business = auth
    parsed_id: Optional[uuid.UUID] = uuid.UUID(role_id) if role_id.strip() else None
    triggers_list = [t.strip() for t in custom_triggers.split(",") if t.strip()]

    role = await upsert_role(
        db=db,
        business_id=business.id,
        role_id=parsed_id,
        name=name,
        description=description,
        system_prompt=system_prompt,
        tone=tone,
        verbosity=verbosity,
        technical_depth=technical_depth,
        politeness=politeness,
        permitted_skills=permitted_skills,
        assigned_model=assigned_model,
        auto_handover_on_refund=bool(auto_handover_on_refund),
        auto_handover_on_legal=bool(auto_handover_on_legal),
        auto_handover_on_angry=bool(auto_handover_on_angry),
        custom_triggers=triggers_list,
    )

    if "application/json" in request.headers.get("accept", ""):
        return {
            "id": str(role.id),
            "name": role.name,
            "slug": role.slug,
            "tone": role.tone,
            "verbosity": role.verbosity,
            "technical_depth": role.technical_depth,
            "politeness": role.politeness,
        }

    return RedirectResponse(
        url=f"/settings/roles?role_id={role.id}&saved=Saved+role+{role.name}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.post("/settings/roles/test-chat")
async def test_role_chat_route(
    request: Request,
    name: str = Form("Preview Role"),
    description: str = Form(""),
    system_prompt: str = Form(DEFAULT_STARTER_PROMPT),
    tone: str = Form("technical"),
    verbosity: int = Form(3),
    technical_depth: int = Form(3),
    politeness: int = Form(3),
    permitted_skills: List[str] = Form(default=[]),
    assigned_model: str = Form("gemma4:e4b"),
    auto_handover_on_refund: Optional[str] = Form("on"),
    auto_handover_on_legal: Optional[str] = Form("on"),
    auto_handover_on_angry: Optional[str] = Form("on"),
    custom_triggers: str = Form(""),
    test_message: str = Form(...),
    auth=Depends(require_authenticated_user),
):
    """Live side-by-side Test Chat endpoint reflecting unsaved editor changes immediately."""
    _ = auth
    triggers_list = [t.strip() for t in custom_triggers.split(",") if t.strip()]
    result = await run_role_test_chat(
        role_name=name,
        description=description,
        system_prompt=system_prompt,
        tone=tone,
        verbosity=verbosity,
        technical_depth=technical_depth,
        politeness=politeness,
        assigned_model=assigned_model,
        permitted_skills=permitted_skills,
        handover_criteria={
            "auto_handover_on_refund": bool(auto_handover_on_refund),
            "auto_handover_on_legal": bool(auto_handover_on_legal),
            "auto_handover_on_angry": bool(auto_handover_on_angry),
            "custom_triggers": triggers_list,
        },
        user_message=test_message,
    )

    if "application/json" in request.headers.get("accept", ""):
        return JSONResponse(result)

    badge_cls = (
        "border-amber-500/40 bg-amber-500/10 text-amber-200"
        if result["handover_triggered"]
        else "border-slate-700 bg-slate-950 text-slate-100"
    )
    html = (
        f'<div class="rounded-lg border {badge_cls} p-4 space-y-2">'
        f'<div class="flex items-center justify-between text-xs text-slate-400">'
        f'<span class="font-semibold text-emerald-400">{result["role_name"]} ({result["tone"]})</span>'
        f'<span>Model: {result["model"]} &bull; {result["source"]}</span>'
        f"</div>"
        f'<pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">{result["reply"]}</pre>'
        f"</div>"
    )
    return HTMLResponse(html)


@router.patch("/api/v1/agent-roles/{role_id}")
async def patch_agent_role_api(
    role_id: uuid.UUID,
    payload: RolePatchPayload,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Tenant-scoped JSON API to update an AgentRole (RLS hides cross-tenant rows -> 404)."""
    _, business = auth
    roles = await list_roles(db, business.id)
    target = next((r for r in roles if r.id == role_id), None)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent role not found.")

    updated = await upsert_role(
        db=db,
        business_id=business.id,
        role_id=target.id,
        name=payload.name if payload.name is not None else target.name,
        description=payload.description if payload.description is not None else target.description,
        system_prompt=payload.system_prompt if payload.system_prompt is not None else target.system_prompt,
        tone=payload.tone if payload.tone is not None else target.tone,
        verbosity=payload.verbosity if payload.verbosity is not None else target.verbosity,
        technical_depth=payload.technical_depth if payload.technical_depth is not None else target.technical_depth,
        politeness=payload.politeness if payload.politeness is not None else target.politeness,
        permitted_skills=target.permitted_skills or [],
        assigned_model=(target.handover_criteria or {}).get("assigned_model", "gemma4:e4b"),
    )
    return {"id": str(updated.id), "name": updated.name, "tone": updated.tone}
