"""Tests for Task 1.4: Pre-Seeded Agent Roles, Live Role Editor & RLS Isolation."""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text

from feature_1_workspace.auth import hash_password
from feature_1_workspace.database import AsyncSessionLocal, tenant_session
from feature_1_workspace.models import AgentRole, Business, User
from feature_1_workspace.roles_service import (
    ensure_default_roles,
    list_roles,
    run_role_test_chat,
    upsert_role,
)


async def _create_biz(tag: str) -> Business:
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as s:
        s.info["is_admin"] = True
        biz = Business(
            name=f"RoleBiz {tag} {uid}",
            slug=f"rolebiz-{tag}-{uid}",
            support_email=f"roles-{uid}@example.com",
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
            email=f"roles-{uid}@example.com",
            hashed_password=hash_password("TestPass123!"),
            full_name=f"Owner {tag}",
            role="owner",
            is_active=True,
        )
        s.add(user)
        await s.commit()
        return biz


@pytest.mark.asyncio
async def test_three_default_roles_seeded_and_produce_distinct_tones() -> None:
    biz = await _create_biz("tones")
    async with tenant_session(biz.id) as db:
        roles = await list_roles(db, biz.id)
        slugs = {r.slug for r in roles}
        assert {"support-engineer", "support-executive", "ai-consultant"}.issubset(slugs)

        # Idempotency check
        created_again = await ensure_default_roles(db, biz.id)
        assert created_again == []

        by_slug = {r.slug: r for r in roles}
        question = "How do I connect a custom domain?"

        replies = {}
        for slug in ("support-engineer", "support-executive", "ai-consultant"):
            role = by_slug[slug]
            res = await run_role_test_chat(
                role_name=role.name,
                description=role.description or "",
                system_prompt=role.system_prompt,
                tone=role.tone,
                verbosity=role.verbosity,
                technical_depth=role.technical_depth,
                politeness=role.politeness,
                assigned_model="gemma4:e4b",
                permitted_skills=role.permitted_skills or [],
                handover_criteria=role.handover_criteria or {},
                user_message=question,
                try_ollama=False,
            )
            assert "CNAME" in res["reply"]
            replies[slug] = res["reply"]

        # Same verified CNAME fact, three distinct tones & depths
        assert len(set(replies.values())) == 3
        assert "Technical Depth 5/5" in replies["support-engineer"]
        assert "Friendly How-To" in replies["support-executive"]
        assert "Consultative Sales" in replies["ai-consultant"]


@pytest.mark.asyncio
async def test_custom_role_editor_handover_and_rls_isolation() -> None:
    biz_a = await _create_biz("custom-a")
    biz_b = await _create_biz("custom-b")

    async with tenant_session(biz_a.id) as db_a:
        # Invalid slider (>5) raises 422
        with pytest.raises(HTTPException) as exc_info:
            await upsert_role(
                db=db_a,
                business_id=biz_a.id,
                name="Bad Slider Role",
                description="Test",
                system_prompt="Prompt",
                verbosity=9,
            )
        assert exc_info.value.status_code == 422

        custom = await upsert_role(
            db=db_a,
            business_id=biz_a.id,
            name="Enterprise Onboarding Specialist",
            description="Guide enterprise migrations",
            system_prompt="Provide white-glove migration guidance.",
            tone="consultative",
            verbosity=4,
            technical_depth=4,
            politeness=5,
            permitted_skills=["search_knowledge_brain", "share_pricing_quote"],
            custom_triggers=["enterprise SLA"],
        )
        assert custom.slug == "enterprise-onboarding-specialist"

        # Handover policy triggers on refund or custom trigger
        handover_res = await run_role_test_chat(
            role_name=custom.name,
            description=custom.description or "",
            system_prompt=custom.system_prompt,
            tone=custom.tone,
            verbosity=custom.verbosity,
            technical_depth=custom.technical_depth,
            politeness=custom.politeness,
            assigned_model="gemma4:e4b",
            permitted_skills=custom.permitted_skills or [],
            handover_criteria=custom.handover_criteria,
            user_message="I demand a refund and want to talk about our enterprise SLA.",
            try_ollama=False,
        )
        assert handover_res["handover_triggered"] is True
        assert "Send to a human" in handover_res["reply"]

    # RLS prevents Business B from seeing Business A's custom role
    async with tenant_session(biz_b.id) as db_b:
        res = await db_b.execute(
            select(AgentRole).where(AgentRole.business_id == biz_a.id)
        )
        assert res.scalars().all() == []
