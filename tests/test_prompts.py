"""Tests for Task 1.3: Prompt Versioning, Variable Validation, RLS & Prompt Caching."""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text

from feature_1_workspace.auth import hash_password
from feature_1_workspace.database import AsyncSessionLocal, tenant_session
from feature_1_workspace.models import Business, User
from feature_1_workspace.prompts_models import (
    ALLOWED_PROMPT_TYPES,
    PROMPT_SPECS,
    PromptVersion,
    validate_template_variables,
)
from feature_1_workspace.prompts_service import (
    build_cached_anthropic_payload,
    compute_prompt_diff,
    ensure_default_prompts,
    get_active_prompt,
    rollback_prompt_version,
    run_prompt_caching_benchmark,
    save_new_prompt_version,
)


async def _provision_business(tag: str) -> tuple[Business, User]:
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as s:
        s.info["is_admin"] = True
        biz = Business(
            name=f"PromptBiz {tag} {uid}",
            slug=f"promptbiz-{tag}-{uid}",
            support_email=f"owner-{uid}@example.com",
            timezone="UTC",
            autonomous_mode=False,
        )
        s.add(biz)
        await s.flush()
        await s.execute(
            text("SELECT set_config('app.current_business_id', :bid, true)"),
            {"bid": str(biz.id)},
        )
        user = User(
            business_id=biz.id,
            email=f"owner-{uid}@example.com",
            hashed_password=hash_password("TestPass123!"),
            full_name=f"Owner {tag}",
            role="owner",
            is_active=True,
        )
        s.add(user)
        await s.commit()
        return biz, user


def test_validate_template_variables_blocks_missing_placeholders() -> None:
    # Valid master_system prompt passes
    ok_vars = validate_template_variables(
        "master_system",
        PROMPT_SPECS["master_system"]["default_template"],
    )
    assert "business_name" in ok_vars
    assert "role_instructions" in ok_vars

    # Missing {role_instructions} raises HTTPException 422
    with pytest.raises(HTTPException) as exc_info:
        validate_template_variables(
            "master_system",
            "Hello {business_name}, you are {role_name} with {tone_guidelines}.",
        )
    assert exc_info.value.status_code == 422
    assert "{role_instructions}" in str(exc_info.value.detail)


def test_anthropic_cached_payload_sets_ephemeral_cache_control() -> None:
    payload_on = build_cached_anthropic_payload(
        system_prompt_text=PROMPT_SPECS["master_system"]["default_template"],
        user_message="How do I set up DNS?",
        enable_caching=True,
    )
    sys_block = payload_on["system"][0]
    assert sys_block["cache_control"] == {"type": "ephemeral"}
    assert len(sys_block["text"]) // 4 >= 2200

    payload_off = build_cached_anthropic_payload(
        system_prompt_text=PROMPT_SPECS["master_system"]["default_template"],
        user_message="How do I set up DNS?",
        enable_caching=False,
    )
    assert "cache_control" not in payload_off["system"][0]


@pytest.mark.asyncio
async def test_prompt_seeding_versioning_diff_and_rollback() -> None:
    biz, user = await _provision_business("ver")
    async with tenant_session(biz.id) as db:
        seeded = await ensure_default_prompts(db, biz.id, created_by_user_id=user.id)
        assert len(seeded) == len(ALLOWED_PROMPT_TYPES)

        # Second call is idempotent
        seeded_again = await ensure_default_prompts(db, biz.id, created_by_user_id=user.id)
        assert seeded_again == []

        v1 = await get_active_prompt(db, biz.id, "master_system")
        assert v1.version_number == 1
        assert v1.is_active is True

        # Save v2
        v2_text = v1.template_text + "\n5. Always end with a clear next step."
        v2 = await save_new_prompt_version(
            db,
            biz.id,
            "master_system",
            v2_text,
            change_summary="Added closing rule",
            user_id=user.id,
        )
        assert v2.version_number == 2
        assert v2.is_active is True

        diff = compute_prompt_diff(v1.template_text, v2.template_text, "v1", "v2")
        assert "+5. Always end with a clear next step." in diff

        # Rollback to v1
        restored = await rollback_prompt_version(db, biz.id, "master_system", 1, user_id=user.id)
        assert restored.version_number == 1
        assert restored.is_active is True

        active_now = await get_active_prompt(db, biz.id, "master_system")
        assert active_now.version_number == 1


@pytest.mark.asyncio
async def test_prompt_versions_rls_isolation_and_caching_benchmark() -> None:
    biz_a, user_a = await _provision_business("rls-a")
    biz_b, user_b = await _provision_business("rls-b")

    async with tenant_session(biz_a.id) as db_a:
        await ensure_default_prompts(db_a, biz_a.id, user_a.id)

    async with tenant_session(biz_b.id) as db_b:
        await ensure_default_prompts(db_b, biz_b.id, user_b.id)
        # RLS must prevent Business B from seeing Business A's rows
        res = await db_b.execute(
            select(PromptVersion).where(PromptVersion.business_id == biz_a.id)
        )
        assert res.scalars().all() == []

        # Run 100-task Anthropic prompt caching proof
        bench = await run_prompt_caching_benchmark(db_b, biz_b.id, task_count=100)
        assert bench["task_count"] == 100
        assert bench["static_prefix_tokens"] >= 2200
        assert bench["cache_control"] == {"type": "ephemeral"}
        assert bench["caching_on"]["cost_usd"] < bench["caching_off"]["cost_usd"]
        assert bench["saved_pct"] > 70.0
