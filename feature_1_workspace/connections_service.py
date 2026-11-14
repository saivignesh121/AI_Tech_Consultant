"""
Async service layer for CRUD and connectivity testing of the 5 provider connections.

Providers: claude, gemini, openrouter, local, gmail
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.connections_crypto import (
    decrypt_value,
    encrypt_value,
    mask_value,
)
from feature_1_workspace.models import Connection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider constants
# ---------------------------------------------------------------------------

PROVIDERS: list[str] = ["claude", "gemini", "openrouter", "local", "gmail"]

FIXED_LOCAL_MODELS: list[str] = ["gemma4:e4b", "qwen3.5:4b"]

# ---------------------------------------------------------------------------
# Docker detection & local base URL resolution
# ---------------------------------------------------------------------------


def is_running_in_docker() -> bool:
    """Return True when the process is running inside a Docker container."""
    if os.path.exists("/.dockerenv"):
        return True
    cgroup_path = "/proc/1/cgroup"
    if os.path.exists(cgroup_path):
        try:
            with open(cgroup_path) as fh:
                return "docker" in fh.read()
        except OSError:
            pass
    return False


def get_local_base_url(stored_url: str | None) -> str:
    """Resolve the Ollama base URL, translating localhost → host.docker.internal
    when running inside Docker."""
    base = stored_url or "http://localhost:11434"
    if is_running_in_docker() and "localhost" in base:
        return base.replace("localhost", "host.docker.internal")
    return base


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# CRUD service functions
# ---------------------------------------------------------------------------


async def get_connection(
    business_id: uuid.UUID,
    provider: str,
    db: AsyncSession,
) -> Connection | None:
    """Return the Connection row for *business_id*/*provider*, or None."""
    result = await db.execute(
        select(Connection).where(
            Connection.business_id == business_id,
            Connection.provider == provider,
        )
    )
    return result.scalar_one_or_none()


async def upsert_connection(
    business_id: uuid.UUID,
    provider: str,
    data: dict[str, Any],
    db: AsyncSession,
) -> Connection:
    """Insert or update a connection row.

    *data* may contain:
      - api_key (plaintext, optional)
      - base_url (optional)
      - oauth_access_token (plaintext, optional)
      - oauth_refresh_token (plaintext, optional)
      - token_expires_at (optional)
      - scopes (optional)

    Sensitive values are encrypted before persistence.
    Status is always reset to 'unverified'.
    """
    values: dict[str, Any] = {
        "id": uuid.uuid4(),
        "business_id": business_id,
        "provider": provider,
        "status": "unverified",
        "updated_at": _utc_now(),
    }

    # Encrypt API key if supplied and non-empty
    api_key: str | None = data.get("api_key")
    if api_key and api_key.strip():
        values["encrypted_api_key"] = encrypt_value(api_key.strip())

    if "base_url" in data and data["base_url"] is not None:
        values["base_url"] = data["base_url"]

    # Encrypt OAuth tokens if supplied
    oauth_access_token: str | None = data.get("oauth_access_token")
    if oauth_access_token and oauth_access_token.strip():
        values["encrypted_oauth_token"] = encrypt_value(oauth_access_token.strip())

    oauth_refresh_token: str | None = data.get("oauth_refresh_token")
    if oauth_refresh_token and oauth_refresh_token.strip():
        values["encrypted_refresh_token"] = encrypt_value(oauth_refresh_token.strip())

    if "token_expires_at" in data and data["token_expires_at"] is not None:
        values["token_expires_at"] = data["token_expires_at"]

    if "scopes" in data and data["scopes"] is not None:
        values["scopes"] = data["scopes"]

    # Build the set of columns to update on conflict (exclude immutable cols)
    update_set: dict[str, Any] = {
        k: v
        for k, v in values.items()
        if k not in ("id", "business_id", "provider")
    }

    stmt = (
        pg_insert(Connection)
        .values(**values)
        .on_conflict_do_update(
            index_elements=["business_id", "provider"],
            set_=update_set,
        )
        .returning(Connection)
    )

    result = await db.execute(stmt)
    await db.commit()
    row = result.scalar_one()
    return row


async def get_all_connections(
    business_id: uuid.UUID,
    db: AsyncSession,
) -> list[dict[str, Any]]:
    """Return a summary list of all 5 provider slots for *business_id*.

    Each dict contains:
      - provider, status, last_tested_at, last_ping_latency_ms
      - masked_key (using mask_value)
      - base_url (for 'local')
      - scopes (for 'gmail')
      - is_connected (bool)
    """
    result = await db.execute(
        select(Connection).where(Connection.business_id == business_id)
    )
    rows: dict[str, Connection] = {
        conn.provider: conn for conn in result.scalars().all()
    }

    output: list[dict[str, Any]] = []
    for provider in PROVIDERS:
        conn = rows.get(provider)
        if conn is None:
            output.append(
                {
                    "provider": provider,
                    "status": "unverified",
                    "last_tested_at": None,
                    "last_ping_latency_ms": None,
                    "masked_key": None,
                    "base_url": None,
                    "scopes": None,
                    "is_connected": False,
                }
            )
            continue

        # Determine display key / token for masking
        masked_key: str | None = None
        if provider == "local":
            # base_url is not sensitive; use it directly
            masked_key = conn.base_url or get_local_base_url(None)
        elif provider == "gmail":
            if conn.encrypted_oauth_token:
                try:
                    access_token = decrypt_value(conn.encrypted_oauth_token)
                    masked_key = mask_value(access_token, provider)
                except Exception:
                    masked_key = None
        else:
            if conn.encrypted_api_key:
                try:
                    plaintext_key = decrypt_value(conn.encrypted_api_key)
                    masked_key = mask_value(plaintext_key, provider)
                except Exception:
                    masked_key = None

        is_connected = conn.status == "active"

        output.append(
            {
                "provider": provider,
                "status": conn.status,
                "last_tested_at": conn.last_tested_at,
                "last_ping_latency_ms": conn.last_ping_latency_ms,
                "masked_key": masked_key,
                "base_url": conn.base_url if provider == "local" else None,
                "scopes": conn.scopes if provider == "gmail" else None,
                "is_connected": is_connected,
            }
        )

    return output


# ---------------------------------------------------------------------------
# Connection test
# ---------------------------------------------------------------------------


async def test_connection(
    business_id: uuid.UUID,
    provider: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Live-test a provider connection and persist the result.

    Returns {"ok": bool, "latency_ms": int, "detail": str}.
    Keys and tokens are NEVER logged.
    """
    logger.info("Testing %s connection...", provider)

    conn = await get_connection(business_id, provider, db)
    if conn is None:
        return {"ok": False, "latency_ms": 0, "detail": "No connection configured."}

    ok = False
    latency_ms = 0
    detail = ""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if provider == "claude":
                if not conn.encrypted_api_key:
                    return {"ok": False, "latency_ms": 0, "detail": "No API key stored."}
                api_key = decrypt_value(conn.encrypted_api_key)
                t0 = time.monotonic()
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-5-5",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "hi"}],
                    },
                )
                latency_ms = int((time.monotonic() - t0) * 1000)
                ok = resp.status_code == 200
                detail = "ok" if ok else f"HTTP {resp.status_code}"

            elif provider == "gemini":
                if not conn.encrypted_api_key:
                    return {"ok": False, "latency_ms": 0, "detail": "No API key stored."}
                api_key = decrypt_value(conn.encrypted_api_key)
                t0 = time.monotonic()
                resp = await client.get(
                    "https://generativelanguage.googleapis.com/v1beta/models",
                    params={"key": api_key, "pageSize": 1},
                )
                latency_ms = int((time.monotonic() - t0) * 1000)
                ok = resp.status_code == 200
                detail = "ok" if ok else f"HTTP {resp.status_code}"

            elif provider == "openrouter":
                if not conn.encrypted_api_key:
                    return {"ok": False, "latency_ms": 0, "detail": "No API key stored."}
                api_key = decrypt_value(conn.encrypted_api_key)
                t0 = time.monotonic()
                resp = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    params={"limit": 1},
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                latency_ms = int((time.monotonic() - t0) * 1000)
                ok = resp.status_code == 200
                detail = "ok" if ok else f"HTTP {resp.status_code}"

            elif provider == "local":
                base_url = get_local_base_url(conn.base_url)
                t0 = time.monotonic()
                resp = await client.get(
                    f"{base_url}/api/tags",
                    timeout=5.0,
                )
                latency_ms = int((time.monotonic() - t0) * 1000)
                ok = resp.status_code == 200
                detail = "ok" if ok else f"HTTP {resp.status_code}"

            elif provider == "gmail":
                if not conn.encrypted_oauth_token:
                    return {"ok": False, "latency_ms": 0, "detail": "No OAuth token stored."}
                access_token = decrypt_value(conn.encrypted_oauth_token)
                t0 = time.monotonic()
                resp = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                latency_ms = int((time.monotonic() - t0) * 1000)
                ok = resp.status_code == 200
                detail = "ok" if ok else f"HTTP {resp.status_code}"

            else:
                return {"ok": False, "latency_ms": 0, "detail": f"Unknown provider: {provider}"}

    except httpx.TimeoutException:
        detail = "fail"
        latency_ms = latency_ms or 10000
    except Exception as exc:
        detail = "fail"
        logger.error("test_connection %s error: %s", provider, type(exc).__name__)

    logger.info("Testing %s connection... %s", provider, "ok" if ok else "fail")

    # Persist test result
    new_status = "active" if ok else "invalid"
    now = _utc_now()

    update_stmt = (
        pg_insert(Connection)
        .values(
            id=conn.id,
            business_id=conn.business_id,
            provider=conn.provider,
            status=new_status,
            last_tested_at=now,
            last_ping_latency_ms=latency_ms,
            updated_at=now,
        )
        .on_conflict_do_update(
            index_elements=["business_id", "provider"],
            set_={
                "status": new_status,
                "last_tested_at": now,
                "last_ping_latency_ms": latency_ms,
                "updated_at": now,
            },
        )
    )
    await db.execute(update_stmt)
    await db.commit()

    return {"ok": ok, "latency_ms": latency_ms, "detail": detail}
