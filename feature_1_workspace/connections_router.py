"""FastAPI router for the Settings -> Keys & Connections tab.

Handles full-page render, HTMX partial updates, OAuth2 Gmail flow,
and pipeline-step model assignment.  All routes require an authenticated user.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Annotated, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import get_db, require_authenticated_user
from feature_1_workspace.connections_models import (
    AVAILABLE_MODELS,
    PIPELINE_STEPS,
    get_step_assignments,
    upsert_step_assignment,
)
from feature_1_workspace.connections_service import (
    get_all_connections,
    test_connection,
    upsert_connection,
)
from feature_1_workspace.models import Business, User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_PROVIDERS: frozenset[str] = frozenset(
    ["claude", "gemini", "openrouter", "local", "gmail"]
)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

# ---------------------------------------------------------------------------
# Template setup
# ---------------------------------------------------------------------------

_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/settings/connections",
    tags=["connections"],
)

# Convenience type alias for the auth dependency result
AuthDep = Annotated[tuple[User, Business], Depends(require_authenticated_user)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helper: derive the app's public base URL from the incoming request
# ---------------------------------------------------------------------------


def _base_url(request: Request) -> str:
    """Return scheme + host (+ port if non-standard) with no trailing slash."""
    base = str(request.base_url).rstrip("/")
    return base


def _validate_provider(provider: str) -> None:
    if provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider '{provider}'. Must be one of: {sorted(VALID_PROVIDERS)}",
        )


# ---------------------------------------------------------------------------
# 1. Full-page settings view
# ---------------------------------------------------------------------------


@router.get("", response_class=HTMLResponse, name="connections_settings_page")
async def settings_connections_page(
    request: Request,
    auth: AuthDep,
    db: DbDep,
) -> HTMLResponse:
    """Render the full Settings → Keys & Connections page."""
    user, business = auth

    connections = await get_all_connections(str(business.id), db)
    step_assignments = await get_step_assignments(str(business.id), db)

    return templates.TemplateResponse(
        request,
        "settings_connections.html",
        {
            "user": user,
            "business": business,
            "connections": connections,
            "pipeline_steps": PIPELINE_STEPS,
            "available_models": AVAILABLE_MODELS,
            "step_assignments": step_assignments,
        },
    )


# ---------------------------------------------------------------------------
# 2. Save connection (HTMX partial)
# ---------------------------------------------------------------------------


@router.post("/{provider}/save", response_class=HTMLResponse, name="connections_save")
async def save_connection(
    provider: str,
    request: Request,
    auth: AuthDep,
    db: DbDep,
    api_key: Annotated[Optional[str], Form()] = None,
    base_url: Annotated[Optional[str], Form()] = None,
) -> HTMLResponse:
    """Persist an API key / base-URL for a provider and return an updated card partial."""
    _validate_provider(provider)
    user, business = auth

    # Strip whitespace; treat empty string as "no change"
    clean_api_key: Optional[str] = api_key.strip() if api_key else None
    clean_base_url: Optional[str] = base_url.strip() if base_url else None

    # Build kwargs — only pass api_key when non-empty to preserve existing encrypted value
    upsert_kwargs: dict = {
        "business_id": str(business.id),
        "provider": provider,
        "db": db,
    }
    if clean_api_key:
        upsert_kwargs["api_key"] = clean_api_key
    if provider == "local" and clean_base_url:
        upsert_kwargs["base_url"] = clean_base_url

    connection = await upsert_connection(**upsert_kwargs)

    response = templates.TemplateResponse(
        request,
        "_connection_card.html",
        {
            "user": user,
            "business": business,
            "connection": connection,
            "provider": provider,
        },
    )
    response.headers["HX-Trigger"] = "connectionSaved"
    return response


# ---------------------------------------------------------------------------
# 3. Test connection (HTMX partial)
# ---------------------------------------------------------------------------


@router.post("/{provider}/test", response_class=HTMLResponse, name="connections_test")
async def test_connection_route(
    provider: str,
    request: Request,
    auth: AuthDep,
    db: DbDep,
) -> HTMLResponse:
    """Run a live connectivity test and return the result partial."""
    _validate_provider(provider)
    _user, business = auth

    result = await test_connection(str(business.id), provider, db)

    return templates.TemplateResponse(
        request,
        "_test_result.html",
        {
            "result": result,  # dict with keys: ok, latency_ms, detail
            "provider": provider,
        },
    )


# ---------------------------------------------------------------------------
# 4. OAuth2 Gmail — start
# ---------------------------------------------------------------------------


@router.get(
    "/oauth/gmail/start",
    name="connections_oauth_gmail_start",
)
async def oauth_gmail_start(
    request: Request,
    auth: AuthDep,
) -> RedirectResponse:
    """Redirect the user to Google's OAuth2 consent screen."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_CLIENT_ID is not configured on this server.",
        )

    redirect_uri = f"{_base_url(request)}/settings/connections/oauth/gmail/callback"

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GMAIL_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    }
    authorization_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=authorization_url, status_code=status.HTTP_302_FOUND)


# ---------------------------------------------------------------------------
# 5. OAuth2 Gmail — callback
# ---------------------------------------------------------------------------


@router.get(
    "/oauth/gmail/callback",
    name="connections_oauth_gmail_callback",
)
async def oauth_gmail_callback(
    request: Request,
    auth: AuthDep,
    db: DbDep,
    code: Optional[str] = None,
    error: Optional[str] = None,
) -> RedirectResponse:
    """Exchange the authorization code for tokens and persist them."""
    if error or not code:
        logger.warning("Gmail OAuth callback received error=%s", error)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth2 error: {error or 'missing code'}",
        )

    _user, business = auth

    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    redirect_uri = f"{_base_url(request)}/settings/connections/oauth/gmail/callback"

    # Exchange code → tokens
    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        logger.error("Gmail token exchange failed: %s", token_resp.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to exchange authorization code for tokens.",
        )

    token_data = token_resp.json()
    access_token: str = token_data.get("access_token", "")
    refresh_token: str = token_data.get("refresh_token", "")

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Google did not return an access_token.",
        )

    # Persist via upsert_connection — tokens and scopes go into the data dict
    await upsert_connection(
        business_id=str(business.id),
        provider="gmail",
        data={
            "oauth_access_token": access_token,
            "oauth_refresh_token": refresh_token,
            "scopes": [GMAIL_SCOPE],
        },
        db=db,
    )

    logger.info("Gmail OAuth2 connection stored for business %s", business.id)

    # Redirect with success indicator (flash via query param; template can display it)
    return RedirectResponse(
        url="/settings/connections?flash=gmail_connected",
        status_code=status.HTTP_302_FOUND,
    )


# ---------------------------------------------------------------------------
# 6. Assign model to pipeline step (HTMX partial)
# ---------------------------------------------------------------------------


@router.post(
    "/models/{step_name}/assign",
    response_class=HTMLResponse,
    name="connections_model_assign",
)
async def assign_model_to_step(
    step_name: str,
    request: Request,
    auth: AuthDep,
    db: DbDep,
    model_id: Annotated[str, Form()],
) -> HTMLResponse:
    """Assign an AI model to a pipeline step and return the updated picker row partial."""
    if step_name not in PIPELINE_STEPS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown pipeline step '{step_name}'. Valid steps: {PIPELINE_STEPS}",
        )

    _user, business = auth

    # upsert_step_assignment validates model_id against AVAILABLE_MODELS internally
    assignment = await upsert_step_assignment(
        business_id=str(business.id),
        step_name=step_name,
        model_id=model_id,
        db=db,
    )

    return templates.TemplateResponse(
        request,
        "_model_picker_row.html",
        {
            "step_name": step_name,
            "model_id": assignment.model_id,
            "available_models": AVAILABLE_MODELS,
        },
    )


# ---------------------------------------------------------------------------
# 7. Full connections section partial (HTMX OOB swap)
# ---------------------------------------------------------------------------


@router.get(
    "/partial/all",
    response_class=HTMLResponse,
    name="connections_partial_all",
)
async def connections_partial_all(
    request: Request,
    auth: AuthDep,
    db: DbDep,
) -> HTMLResponse:
    """Return the complete connections section for an HTMX out-of-band swap."""
    user, business = auth

    connections = await get_all_connections(str(business.id), db)
    step_assignments = await get_step_assignments(str(business.id), db)

    return templates.TemplateResponse(
        request,
        "_connections_all.html",
        {
            "user": user,
            "business": business,
            "connections": connections,
            "pipeline_steps": PIPELINE_STEPS,
            "available_models": AVAILABLE_MODELS,
            "step_assignments": step_assignments,
        },
    )
