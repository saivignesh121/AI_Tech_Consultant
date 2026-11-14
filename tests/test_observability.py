"""Tests for Task 1.5: Pre-Model PII Masking, Cost Logging, Resilient Retries & RLS."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select, text

from feature_1_workspace.auth import hash_password
from feature_1_workspace.database import AsyncSessionLocal, tenant_session
from feature_1_workspace.logs_service import (
    execute_with_resilience,
    get_observability_summary,
    register_job_handler,
    retry_failed_job,
)
from feature_1_workspace.models import Business, User
from feature_1_workspace.observability_models import FailedJob, ModelCallLog
from shared.llm_gateway import call_llm_with_observability
from shared.pii import mask_pii


async def _create_biz(tag: str) -> Business:
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as s:
        s.info["is_admin"] = True
        biz = Business(
            name=f"ObsBiz {tag} {uid}",
            slug=f"obsbiz-{tag}-{uid}",
            support_email=f"obs-{uid}@example.com",
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
            email=f"obs-{uid}@example.com",
            hashed_password=hash_password("TestPass123!"),
            full_name=f"Owner {tag}",
            role="owner",
            is_active=True,
        )
        s.add(user)
        await s.commit()
        return biz


def test_pii_masker_redacts_cards_phones_and_addresses() -> None:
    raw = (
        "Hi, call me at +1 (555) 867-5309, bill card 4532-0151-1283-0366, "
        "and ship to 742 Evergreen Terrace, Apt 4B."
    )
    masked = mask_pii(raw)
    assert "867-5309" not in masked
    assert "4532" not in masked
    assert "742 Evergreen Terrace" not in masked
    assert "[REDACTED_PHONE]" in masked
    assert "[REDACTED_CARD]" in masked
    assert "[REDACTED_ADDRESS]" in masked


@pytest.mark.asyncio
async def test_llm_gateway_masks_pii_before_provider_and_logs_cost() -> None:
    biz = await _create_biz("gateway")
    seen_by_model: dict[str, str] = {}

    async def fake_provider(sys_prompt: str, usr_prompt: str) -> dict:
        seen_by_model["system"] = sys_prompt
        seen_by_model["user"] = usr_prompt
        return {
            "text": "Confirmed for phone +1 555-234-5678 and card 4532015112830366.",
            "input_tokens": 500,
            "output_tokens": 100,
            "cached_tokens": 200,
        }

    async with tenant_session(biz.id) as db:
        out = await call_llm_with_observability(
            db=db,
            business_id=biz.id,
            job_type="write_answer",
            model_id="claude-haiku-5-5",
            provider="anthropic",
            system_prompt="You are a support assistant.",
            user_prompt="My phone is 555-234-5678, card 4532-0151-1283-0366, at 123 Main Street.",
            provider_fn=fake_provider,
        )

        assert "555-234-5678" not in seen_by_model["user"]
        assert "4532" not in seen_by_model["user"]
        assert "123 Main Street" not in seen_by_model["user"]

        assert "555-234-5678" not in out["text"]
        assert "4532" not in out["text"]
        assert out["cost_usd"] > 0

        summary = await get_observability_summary(db, biz.id)
        assert summary["total_calls"] == 1
        assert summary["total_cached_tokens"] == 200
        log_row = summary["recent_logs"][0]
        assert "4532" not in (log_row.masked_prompt or "")
        assert "4532" not in (log_row.masked_response or "")


@pytest.mark.asyncio
async def test_outage_resilience_failed_jobs_recovery_and_rls() -> None:
    biz_a = await _create_biz("res-a")
    biz_b = await _create_biz("res-b")

    api_online = {"flag": False}

    async def flaky_ingestion_job(payload: dict) -> dict:
        if not api_online["flag"]:
            raise ConnectionError("Simulated upstream LLM API outage")
        return {"processed_url": payload["url"], "ok": True}

    register_job_handler("ingest_test_page", flaky_ingestion_job)

    async with tenant_session(biz_a.id) as db_a:
        outcome = await execute_with_resilience(
            db=db_a,
            business_id=biz_a.id,
            job_type="ingest_test_page",
            payload={"url": "https://example.com/docs", "contact": "555-867-5309"},
            max_retries=2,
            backoff_base_sec=0.0,
        )
        assert outcome["status"] == "failed_queued"
        failed_id = uuid.UUID(outcome["failed_job_id"])

        api_online["flag"] = True
        resumed = await retry_failed_job(
            db=db_a,
            business_id=biz_a.id,
            failed_job_id=failed_id,
        )
        assert resumed["status"] == "resolved"
        assert resumed["result"]["ok"] is True

    async with tenant_session(biz_b.id) as db_b:
        res_jobs = await db_b.execute(
            select(FailedJob).where(FailedJob.business_id == biz_a.id)
        )
        assert res_jobs.scalars().all() == []
        res_logs = await db_b.execute(
            select(ModelCallLog).where(ModelCallLog.business_id == biz_a.id)
        )
        assert res_logs.scalars().all() == []
