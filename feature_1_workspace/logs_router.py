"""FastAPI router for Settings -> Logs, Cost & Failed Jobs (Task 1.5)."""

from __future__ import annotations

from pathlib import Path
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import get_db, require_authenticated_user
from feature_1_workspace.logs_service import get_observability_summary, retry_failed_job

_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

router = APIRouter(prefix="/settings/logs", tags=["observability"])


@router.get("", response_class=HTMLResponse)
async def logs_settings_page(
    request: Request,
    saved: Optional[str] = None,
    error: Optional[str] = None,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, business = auth
    summary = await get_observability_summary(db, business.id)
    return templates.TemplateResponse(
        request=request,
        name="settings_logs.html",
        context={
            "user": user,
            "business": business,
            "summary": summary,
            "saved_notice": saved,
            "error_notice": error,
        },
    )


@router.post("/retry/{job_id}")
async def retry_failed_job_route(
    job_id: uuid.UUID,
    request: Request,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    _, business = auth
    result = await retry_failed_job(
        db=db,
        business_id=business.id,
        failed_job_id=job_id,
    )
    if "application/json" in request.headers.get("accept", ""):
        return result
    return RedirectResponse(
        url=f"/settings/logs?saved=Resumed+and+resolved+job+{job_id}",
        status_code=status.HTTP_303_SEE_OTHER,
    )
