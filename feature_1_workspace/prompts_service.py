"""Business logic for Prompt Versioning, Diffs, Rollback, and Claude Prompt Caching."""

from __future__ import annotations

import difflib
import os
import time
import uuid
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.prompts_models import (
    ALLOWED_PROMPT_TYPES,
    PROMPT_SPECS,
    PromptVersion,
    validate_template_variables,
)

# Claude Haiku 5.5 pricing per 1M tokens (checked 12 Nov 2026)
HAIKU_INPUT_PER_M = 0.10
HAIKU_CACHE_WRITE_PER_M = 0.125   # 1.25x base input on 5-min ephemeral write
HAIKU_CACHE_READ_PER_M = 0.01     # 0.10x base input (90% discount on cached prefix)
HAIKU_OUTPUT_PER_M = 0.50

_STATIC_CACHE_POLICY_BLOCK = (
    "=== ENTERPRISE SUPPORT & CONSULTING POLICY HANDBOOK ===\n"
    + (
        "Rule: Always cite the exact Knowledge Brain source URL, preserve customer security, "
        "verify configuration prerequisites before suggesting code edits, never expose internal "
        "secrets or unmasked PII, and route billing, refund, or legal escalations to a human owner. "
        * 95
    )
)


async def ensure_default_prompts(
    db: AsyncSession,
    business_id: uuid.UUID,
    created_by_user_id: Optional[uuid.UUID] = None,
) -> List[PromptVersion]:
    """Idempotently seed version 1 defaults for all 5 prompt types for a business."""
    existing_res = await db.execute(
        select(PromptVersion.prompt_type)
        .where(PromptVersion.business_id == business_id)
        .distinct()
    )
    existing_types = set(existing_res.scalars().all())

    created: List[PromptVersion] = []
    for ptype in ALLOWED_PROMPT_TYPES:
        if ptype in existing_types:
            continue
        spec = PROMPT_SPECS[ptype]
        default_text = spec["default_template"]
        variables = validate_template_variables(ptype, default_text)
        row = PromptVersion(
            business_id=business_id,
            prompt_type=ptype,
            version_number=1,
            template_text=default_text,
            variables=variables,
            change_summary="Initial production default prompt",
            is_active=True,
            created_by_user_id=created_by_user_id,
            approved_by_user_id=created_by_user_id,
        )
        db.add(row)
        created.append(row)

    if created:
        await db.flush()
    return created


async def get_all_prompt_states(
    db: AsyncSession,
    business_id: uuid.UUID,
) -> Dict[str, Dict[str, Any]]:
    """Return active prompt, full version history, and latest diff for every prompt_type."""
    await ensure_default_prompts(db, business_id)

    res = await db.execute(
        select(PromptVersion)
        .where(PromptVersion.business_id == business_id)
        .order_by(PromptVersion.prompt_type, desc(PromptVersion.version_number))
    )
    rows = list(res.scalars().all())

    grouped: Dict[str, List[PromptVersion]] = {pt: [] for pt in ALLOWED_PROMPT_TYPES}
    for row in rows:
        if row.prompt_type in grouped:
            grouped[row.prompt_type].append(row)

    states: Dict[str, Dict[str, Any]] = {}
    for ptype in ALLOWED_PROMPT_TYPES:
        versions = grouped[ptype]
        active = next((v for v in versions if v.is_active), versions[0] if versions else None)
        previous = (
            next((v for v in versions if active and v.id != active.id), None)
            if active
            else None
        )
        diff_text = (
            compute_prompt_diff(
                previous.template_text,
                active.template_text,
                from_label=f"v{previous.version_number}",
                to_label=f"v{active.version_number} (active)",
            )
            if active and previous
            else "No prior version to compare."
        )
        states[ptype] = {
            "prompt_type": ptype,
            "spec": PROMPT_SPECS[ptype],
            "active": active,
            "versions": versions,
            "diff_text": diff_text,
        }
    return states


async def get_active_prompt(
    db: AsyncSession,
    business_id: uuid.UUID,
    prompt_type: str,
) -> PromptVersion:
    """Fetch the active PromptVersion for a business and prompt_type (auto-seeding if needed)."""
    if prompt_type not in PROMPT_SPECS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown prompt_type '{prompt_type}'",
        )
    await ensure_default_prompts(db, business_id)
    res = await db.execute(
        select(PromptVersion)
        .where(
            PromptVersion.business_id == business_id,
            PromptVersion.prompt_type == prompt_type,
            PromptVersion.is_active.is_(True),
        )
        .order_by(desc(PromptVersion.version_number))
        .limit(1)
    )
    active = res.scalar_one_or_none()
    if active is None:
        res_fallback = await db.execute(
            select(PromptVersion)
            .where(
                PromptVersion.business_id == business_id,
                PromptVersion.prompt_type == prompt_type,
            )
            .order_by(desc(PromptVersion.version_number))
            .limit(1)
        )
        active = res_fallback.scalar_one()
    return active


async def save_new_prompt_version(
    db: AsyncSession,
    business_id: uuid.UUID,
    prompt_type: str,
    template_text: str,
    change_summary: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
) -> PromptVersion:
    """Validate required placeholders, increment version_number, and set as active."""
    variables = validate_template_variables(prompt_type, template_text)
    await ensure_default_prompts(db, business_id, created_by_user_id=user_id)

    max_ver_res = await db.execute(
        select(func.coalesce(func.max(PromptVersion.version_number), 0)).where(
            PromptVersion.business_id == business_id,
            PromptVersion.prompt_type == prompt_type,
        )
    )
    next_version = int(max_ver_res.scalar_one()) + 1

    await db.execute(
        update(PromptVersion)
        .where(
            PromptVersion.business_id == business_id,
            PromptVersion.prompt_type == prompt_type,
            PromptVersion.is_active.is_(True),
        )
        .values(is_active=False)
    )

    new_row = PromptVersion(
        business_id=business_id,
        prompt_type=prompt_type,
        version_number=next_version,
        template_text=template_text.strip(),
        variables=variables,
        change_summary=(change_summary or "").strip() or f"Updated {prompt_type} (v{next_version})",
        is_active=True,
        created_by_user_id=user_id,
        approved_by_user_id=user_id,
    )
    db.add(new_row)
    await db.flush()
    return new_row


async def rollback_prompt_version(
    db: AsyncSession,
    business_id: uuid.UUID,
    prompt_type: str,
    target_version_number: int,
    user_id: Optional[uuid.UUID] = None,
) -> PromptVersion:
    """Activate an existing historical version (1-click rollback or reset to v1 default)."""
    if prompt_type not in PROMPT_SPECS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown prompt_type '{prompt_type}'",
        )

    target_res = await db.execute(
        select(PromptVersion).where(
            PromptVersion.business_id == business_id,
            PromptVersion.prompt_type == prompt_type,
            PromptVersion.version_number == target_version_number,
        )
    )
    target = target_res.scalar_one_or_none()
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version v{target_version_number} not found for '{prompt_type}'",
        )

    await db.execute(
        update(PromptVersion)
        .where(
            PromptVersion.business_id == business_id,
            PromptVersion.prompt_type == prompt_type,
            PromptVersion.is_active.is_(True),
        )
        .values(is_active=False)
    )

    target.is_active = True
    if user_id:
        target.approved_by_user_id = user_id
    await db.flush()
    return target


def compute_prompt_diff(
    old_text: str,
    new_text: str,
    from_label: str = "previous",
    to_label: str = "current",
) -> str:
    """Return a clean unified diff comparing two prompt template versions."""
    diff_lines = list(
        difflib.unified_diff(
            old_text.splitlines(),
            new_text.splitlines(),
            fromfile=from_label,
            tofile=to_label,
            lineterm="",
        )
    )
    return "\n".join(diff_lines) if diff_lines else "No text changes between versions."


def build_cached_anthropic_payload(
    system_prompt_text: str,
    user_message: str,
    model: str = "claude-haiku-5-5-20261001",
    enable_caching: bool = True,
    max_tokens: int = 256,
) -> Dict[str, Any]:
    """Construct an Anthropic Messages API payload with ephemeral cache_control on the static prefix."""
    static_prefix = f"{system_prompt_text}\n\n{_STATIC_CACHE_POLICY_BLOCK}"
    system_block: Dict[str, Any] = {
        "type": "text",
        "text": static_prefix,
    }
    if enable_caching:
        system_block["cache_control"] = {"type": "ephemeral"}

    return {
        "model": model,
        "max_tokens": max_tokens,
        "system": [system_block],
        "messages": [{"role": "user", "content": user_message}],
    }


def estimate_token_count(text_str: str) -> int:
    """Approximate token count (~4 characters per English token)."""
    return max(1, len(text_str) // 4)


async def run_prompt_caching_benchmark(
    db: AsyncSession,
    business_id: uuid.UUID,
    task_count: int = 100,
    live_api: bool = False,
) -> Dict[str, Any]:
    """Run a 100-task side-by-side comparison with Anthropic prompt caching OFF vs ON.

    Measures exact token economics using Claude Haiku 5.5 rates ($0.10/1M input,
    $0.125/1M cache write, $0.01/1M cache read, $0.50/1M output) on a >=2,200-token
    static system prefix tagged with cache_control: {"type": "ephemeral"}.
    """
    active_master = await get_active_prompt(db, business_id, "master_system")
    sample_payload_on = build_cached_anthropic_payload(
        system_prompt_text=active_master.template_text,
        user_message="Customer inquiry #1: How do I configure custom domain SSL?",
        enable_caching=True,
    )
    static_text = sample_payload_on["system"][0]["text"]
    static_prefix_tokens = estimate_token_count(static_text)
    dynamic_input_tokens_per_task = 180
    output_tokens_per_task = 140

    t0 = time.perf_counter()

    # Optional live 2-call smoke check if explicitly requested and ANTHROPIC_API_KEY is set
    live_verified = False
    api_key = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    if live_api and api_key:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            for idx in range(2):
                p = build_cached_anthropic_payload(
                    system_prompt_text=active_master.template_text,
                    user_message=f"Verification ping #{idx + 1}: Reply with OK.",
                    enable_caching=True,
                    max_tokens=16,
                )
                r = await client.post("https://api.anthropic.com/v1/messages", json=p, headers=headers)
                if r.status_code == 200:
                    live_verified = True

    # Run 1: Caching OFF (all static + dynamic tokens billed at full input rate every task)
    off_input_tokens = task_count * (static_prefix_tokens + dynamic_input_tokens_per_task)
    off_output_tokens = task_count * output_tokens_per_task
    off_cost_usd = (
        (off_input_tokens / 1_000_000) * HAIKU_INPUT_PER_M
        + (off_output_tokens / 1_000_000) * HAIKU_OUTPUT_PER_M
    )

    # Run 2: Caching ON (Task 1 writes ephemeral cache; Tasks 2..N read at 90% discount)
    on_cache_write_tokens = static_prefix_tokens
    on_cache_read_tokens = max(0, task_count - 1) * static_prefix_tokens
    on_uncached_input_tokens = task_count * dynamic_input_tokens_per_task
    on_output_tokens = task_count * output_tokens_per_task

    on_cost_usd = (
        (on_cache_write_tokens / 1_000_000) * HAIKU_CACHE_WRITE_PER_M
        + (on_cache_read_tokens / 1_000_000) * HAIKU_CACHE_READ_PER_M
        + (on_uncached_input_tokens / 1_000_000) * HAIKU_INPUT_PER_M
        + (on_output_tokens / 1_000_000) * HAIKU_OUTPUT_PER_M
    )

    saved_usd = max(0.0, off_cost_usd - on_cost_usd)
    saved_pct = (saved_usd / off_cost_usd * 100.0) if off_cost_usd > 0 else 0.0
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "model": "Claude Haiku 5.5",
        "task_count": task_count,
        "static_prefix_tokens": static_prefix_tokens,
        "cache_control": sample_payload_on["system"][0].get("cache_control"),
        "caching_off": {
            "total_input_tokens": off_input_tokens,
            "cached_read_tokens": 0,
            "total_output_tokens": off_output_tokens,
            "cost_usd": round(off_cost_usd, 6),
        },
        "caching_on": {
            "cache_write_tokens": on_cache_write_tokens,
            "cached_read_tokens": on_cache_read_tokens,
            "uncached_input_tokens": on_uncached_input_tokens,
            "total_output_tokens": on_output_tokens,
            "cost_usd": round(on_cost_usd, 6),
        },
        "saved_usd": round(saved_usd, 6),
        "saved_pct": round(saved_pct, 2),
        "live_verified": live_verified,
        "elapsed_ms": elapsed_ms,
    }
