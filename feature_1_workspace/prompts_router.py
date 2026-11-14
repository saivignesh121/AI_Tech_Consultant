"""FastAPI router for Settings -> Prompts (Task 1.3)."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import get_db, require_authenticated_user
from feature_1_workspace.prompts_models import ALLOWED_PROMPT_TYPES, PROMPT_SPECS
from feature_1_workspace.prompts_service import (
    compute_prompt_diff,
    get_all_prompt_states,
    rollback_prompt_version,
    run_prompt_caching_benchmark,
    save_new_prompt_version,
)

_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

router = APIRouter(
    prefix="/settings/prompts",
    tags=["prompts"],
)


@router.get("", response_class=HTMLResponse)
async def prompts_settings_page(
    request: Request,
    saved: Optional[str] = None,
    error: Optional[str] = None,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Render the Settings -> Prompts tab with all 5 versioned prompts and caching proof."""
    user, business = auth
    states = await get_all_prompt_states(db, business.id)
    return templates.TemplateResponse(
        request=request,
        name="settings_prompts.html",
        context={
            "user": user,
            "business": business,
            "prompt_types": ALLOWED_PROMPT_TYPES,
            "states": states,
            "saved_notice": saved,
            "error_notice": error,
            "benchmark": None,
        },
    )


@router.post("/{prompt_type}/save")
async def save_prompt_route(
    prompt_type: str,
    request: Request,
    template_text: str = Form(...),
    change_summary: str = Form(""),
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate required placeholders and save an immutable new prompt version."""
    user, business = auth
    try:
        new_ver = await save_new_prompt_version(
            db=db,
            business_id=business.id,
            prompt_type=prompt_type,
            template_text=template_text,
            change_summary=change_summary,
            user_id=user.id,
        )
    except HTTPException as exc:
        if "application/json" in request.headers.get("accept", ""):
            raise
        states = await get_all_prompt_states(db, business.id)
        return templates.TemplateResponse(
            request=request,
            name="settings_prompts.html",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            context={
                "user": user,
                "business": business,
                "prompt_types": ALLOWED_PROMPT_TYPES,
                "states": states,
                "saved_notice": None,
                "error_notice": f"{PROMPT_SPECS.get(prompt_type, {}).get('label', prompt_type)}: {exc.detail}",
                "benchmark": None,
            },
        )

    if "application/json" in request.headers.get("accept", ""):
        return {
            "id": str(new_ver.id),
            "prompt_type": new_ver.prompt_type,
            "version_number": new_ver.version_number,
            "variables": new_ver.variables,
            "is_active": new_ver.is_active,
        }

    return RedirectResponse(
        url=f"/settings/prompts?saved=Saved+{prompt_type}+v{new_ver.version_number}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.post("/{prompt_type}/rollback")
async def rollback_prompt_route(
    prompt_type: str,
    request: Request,
    version_number: int = Form(...),
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """1-click rollback to any prior version (or v1 default)."""
    user, business = auth
    restored = await rollback_prompt_version(
        db=db,
        business_id=business.id,
        prompt_type=prompt_type,
        target_version_number=version_number,
        user_id=user.id,
    )
    if "application/json" in request.headers.get("accept", ""):
        return {
            "prompt_type": restored.prompt_type,
            "active_version": restored.version_number,
            "is_active": restored.is_active,
        }
    return RedirectResponse(
        url=f"/settings/prompts?saved=Rolled+back+{prompt_type}+to+v{restored.version_number}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.get("/{prompt_type}/diff")
async def diff_prompt_versions_route(
    prompt_type: str,
    from_ver: int,
    to_ver: int,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Return unified diff between two versions of a prompt."""
    _, business = auth
    states = await get_all_prompt_states(db, business.id)
    if prompt_type not in states:
        raise HTTPException(status_code=404, detail="Prompt type not found")
    versions = {v.version_number: v for v in states[prompt_type]["versions"]}
    if from_ver not in versions or to_ver not in versions:
        raise HTTPException(status_code=404, detail="Requested version not found")
    diff_str = compute_prompt_diff(
        versions[from_ver].template_text,
        versions[to_ver].template_text,
        from_label=f"v{from_ver}",
        to_label=f"v{to_ver}",
    )
    return {"prompt_type": prompt_type, "from_ver": from_ver, "to_ver": to_ver, "diff": diff_str}


@router.post("/benchmark-caching")
async def benchmark_caching_route(
    request: Request,
    task_count: int = Form(100),
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute 100-task Anthropic prompt caching OFF vs ON proof."""
    user, business = auth
    result = await run_prompt_caching_benchmark(
        db=db,
        business_id=business.id,
        task_count=max(1, min(task_count, 500)),
    )
    if "application/json" in request.headers.get("accept", ""):
        return result

    states = await get_all_prompt_states(db, business.id)
    return templates.TemplateResponse(
        request=request,
        name="settings_prompts.html",
        context={
            "user": user,
            "business": business,
            "prompt_types": ALLOWED_PROMPT_TYPES,
            "states": states,
            "saved_notice": f"Completed {result['task_count']}-task Anthropic prompt caching proof ({result['saved_pct']}% saved).",
            "error_notice": None,
            "benchmark": result,
        },
    )
