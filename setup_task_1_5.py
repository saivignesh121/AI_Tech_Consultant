from pathlib import Path

print("Creating Task 1.5 files...")

# 1. shared/pii.py
Path("shared/pii.py").write_text('''"""Pre-LLM and pre-log PII masking (credit/debit cards, phone numbers, street addresses)."""

from __future__ import annotations

import re
from typing import Any

_CARD_CANDIDATE_RE = re.compile(r"(?<!\\d)(?:\\d[ -]*?){13,19}(?!\\d)")

_PHONE_RE = re.compile(
    r"(?<!\\w)(?:\\+?\\d{1,3}[\\s.-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s.-]?\\d{3,4}[\\s.-]?\\d{4}(?!\\w)"
)

_STREET_ADDRESS_RE = re.compile(
    r"\\b\\d{1,6}[A-Za-z]?\\s+(?:[A-Za-z0-9.'-]+\\s+){1,5}"
    r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|"
    r"Way|Parkway|Pkwy|Terrace|Ter|Place|Pl|Circle|Cir|Mall)\\.?"
    r"(?:\\s*(?:,?|\\s*(?:Apt|Apartment|Suite|Ste|Unit|Floor|Fl|#)\\s*[A-Za-z0-9-]+))?\\b",
    re.IGNORECASE,
)

def _passes_luhn(digits: str) -> bool:
    total = 0
    reverse_digits = digits[::-1]
    for idx, ch in enumerate(reverse_digits):
        n = ord(ch) - 48
        if idx % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0

def _replace_card(match: re.Match[str]) -> str:
    raw = match.group(0)
    digits = re.sub(r"\\D", "", raw)
    if 13 <= len(digits) <= 19 and _passes_luhn(digits):
        return "[REDACTED_CARD]"
    return raw

def mask_pii(text: str) -> str:
    """Redact card numbers, phone numbers, and street addresses before LLM or log storage."""
    if not text:
        return text
    masked = _CARD_CANDIDATE_RE.sub(_replace_card, text)
    masked = _PHONE_RE.sub("[REDACTED_PHONE]", masked)
    masked = _STREET_ADDRESS_RE.sub("[REDACTED_ADDRESS]", masked)
    return masked

def mask_payload(value: Any) -> Any:
    """Recursively mask PII across strings, lists, and dicts."""
    if isinstance(value, str):
        return mask_pii(value)
    if isinstance(value, list):
        return [mask_payload(item) for item in value]
    if isinstance(value, dict):
        return {k: mask_payload(v) for k, v in value.items()}
    return value
''')

# 2. feature_1_workspace/observability_models.py
Path("feature_1_workspace/observability_models.py").write_text('''"""SQLAlchemy models for model_call_logs and failed_jobs (Task 1.5)."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from feature_1_workspace.models import Base


class ModelCallLog(Base):
    """Per-business audit log of every LLM call with masked prompts/responses and cost."""

    __tablename__ = "model_call_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agent_roles.id", ondelete="SET NULL"),
        nullable=True,
    )
    prompt_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("prompt_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    model_id: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cached_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_usd: Mapped[Decimal] = mapped_column(
        Numeric(10, 6), nullable=False, default=Decimal("0.000000")
    )
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ttft_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    masked_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    masked_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    was_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fallback_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_model_call_logs_biz_created", "business_id", "created_at"),
        Index("idx_model_call_logs_job_model", "job_type", "model_id"),
        CheckConstraint("cost_usd >= 0", name="ck_model_call_logs_cost"),
        CheckConstraint(
            "input_tokens >= 0 AND output_tokens >= 0 AND cached_tokens >= 0",
            name="ck_model_call_logs_tokens",
        ),
    )


class FailedJob(Base):
    """Dead-letter queue capturing exhausted background jobs for safe inspection and retry."""

    __tablename__ = "failed_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    queue_name: Mapped[str] = mapped_column(String(100), nullable=False, default="default")
    job_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    last_attempt_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_failed_jobs_biz_status", "business_id", "status"),
        CheckConstraint(
            "status IN ('pending', 'retrying', 'resolved', 'abandoned')",
            name="ck_failed_jobs_status",
        ),
    )
''')

# 3. shared/llm_gateway.py
Path("shared/llm_gateway.py").write_text('''"""Unified LLM Gateway enforcing pre-model PII masking, token cost calculation, and DB logging."""

from __future__ import annotations

from decimal import Decimal
import time
from typing import Any, Awaitable, Callable, Dict, Optional, Tuple
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.observability_models import ModelCallLog
from shared.pii import mask_pii

MODEL_PRICING_PER_M: Dict[str, Tuple[float, float]] = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
    "gemini-3.8-flash": (0.75, 3.75),
    "gemini-3-flash": (0.50, 3.00),
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "qwen/qwen3.8-max-0902": (2.00, 6.00),
    "qwen/qwen3.7-flash": (0.03, 0.13),
    "nvidia/nemotron-3-ultra-550b-a55b:free": (0.0, 0.0),
    "nvidia/nemotron-3.5-super-vl:free": (0.0, 0.0),
    "nvidia/nemotron-3.5-lightning:free": (0.0, 0.0),
    "google/gemma-4-31b-it:free": (0.0, 0.0),
    "gemma4:e4b": (0.0, 0.0),
    "qwen3.5:4b": (0.0, 0.0),
}


def calculate_call_cost_usd(
    model_id: str,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int = 0,
) -> Decimal:
    in_rate, out_rate = MODEL_PRICING_PER_M.get(model_id, (0.0, 0.0))
    uncached_in = max(0, input_tokens - cached_tokens)
    total = (
        (uncached_in / 1_000_000) * in_rate
        + (cached_tokens / 1_000_000) * (in_rate * 0.10)
        + (output_tokens / 1_000_000) * out_rate
    )
    return Decimal(f"{total:.6f}")


ProviderCallable = Callable[[str, str], Awaitable[Dict[str, Any]]]


async def call_llm_with_observability(
    *,
    db: AsyncSession,
    business_id: uuid.UUID,
    job_type: str,
    model_id: str,
    provider: str,
    system_prompt: str,
    user_prompt: str,
    provider_fn: ProviderCallable,
    user_id: Optional[uuid.UUID] = None,
    role_id: Optional[uuid.UUID] = None,
    prompt_version_id: Optional[uuid.UUID] = None,
    was_fallback: bool = False,
    fallback_reason: Optional[str] = None,
) -> Dict[str, Any]:
    safe_system = mask_pii(system_prompt)
    safe_user = mask_pii(user_prompt)
    combined_masked_prompt = f"[SYSTEM]\\n{safe_system}\\n\\n[USER]\\n{safe_user}"

    t0 = time.perf_counter()
    try:
        raw_result = await provider_fn(safe_system, safe_user)
        latency_ms = max(1, int((time.perf_counter() - t0) * 1000))

        raw_text = str(raw_result.get("text", ""))
        safe_response = mask_pii(raw_text)
        in_tok = int(raw_result.get("input_tokens", max(1, len(combined_masked_prompt) // 4)))
        out_tok = int(raw_result.get("output_tokens", max(1, len(safe_response) // 4)))
        cached_tok = int(raw_result.get("cached_tokens", 0))
        cost = calculate_call_cost_usd(model_id, in_tok, out_tok, cached_tok)

        log_row = ModelCallLog(
            business_id=business_id,
            user_id=user_id,
            role_id=role_id,
            prompt_version_id=prompt_version_id,
            job_type=job_type,
            model_id=model_id,
            provider=provider,
            input_tokens=in_tok,
            output_tokens=out_tok,
            cached_tokens=cached_tok,
            cost_usd=cost,
            latency_ms=latency_ms,
            ttft_ms=raw_result.get("ttft_ms"),
            masked_prompt=combined_masked_prompt,
            masked_response=safe_response,
            status_code=200,
            error_message=None,
            was_fallback=was_fallback,
            fallback_reason=fallback_reason,
        )
        db.add(log_row)
        await db.flush()

        return {
            "log_id": str(log_row.id),
            "text": safe_response,
            "masked_prompt": combined_masked_prompt,
            "input_tokens": in_tok,
            "output_tokens": out_tok,
            "cached_tokens": cached_tok,
            "cost_usd": float(cost),
            "latency_ms": latency_ms,
        }
    except Exception as exc:
        latency_ms = max(1, int((time.perf_counter() - t0) * 1000))
        safe_err = mask_pii(str(exc))
        err_log = ModelCallLog(
            business_id=business_id,
            user_id=user_id,
            role_id=role_id,
            prompt_version_id=prompt_version_id,
            job_type=job_type,
            model_id=model_id,
            provider=provider,
            input_tokens=0,
            output_tokens=0,
            cached_tokens=0,
            cost_usd=Decimal("0.000000"),
            latency_ms=latency_ms,
            masked_prompt=combined_masked_prompt,
            masked_response=None,
            status_code=502,
            error_message=safe_err,
            was_fallback=was_fallback,
            fallback_reason=fallback_reason,
        )
        db.add(err_log)
        await db.flush()
        raise
''')

# 4. feature_1_workspace/logs_service.py
Path("feature_1_workspace/logs_service.py").write_text('''"""Observability metrics, resilient background job retries, and failed-job recovery (Task 1.5)."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import traceback
from typing import Any, Awaitable, Callable, Dict, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.observability_models import FailedJob, ModelCallLog
from shared.pii import mask_payload, mask_pii

JobHandler = Callable[[Dict[str, Any]], Awaitable[Any]]
JOB_HANDLERS: Dict[str, JobHandler] = {}


def register_job_handler(job_type: str, handler: JobHandler) -> None:
    JOB_HANDLERS[job_type] = handler


async def execute_with_resilience(
    *,
    db: AsyncSession,
    business_id: uuid.UUID,
    job_type: str,
    payload: Dict[str, Any],
    handler: Optional[JobHandler] = None,
    queue_name: str = "default",
    max_retries: int = 3,
    backoff_base_sec: float = 0.02,
) -> Dict[str, Any]:
    fn = handler or JOB_HANDLERS.get(job_type)
    if fn is None:
        raise ValueError(f"No handler registered for job_type '{job_type}'")

    safe_payload = mask_payload(payload)
    last_exc: Optional[Exception] = None
    last_trace = ""

    for attempt in range(1, max_retries + 1):
        try:
            output = await fn(safe_payload)
            return {
                "status": "completed",
                "attempts": attempt,
                "result": output,
            }
        except Exception as exc:
            last_exc = exc
            last_trace = mask_pii(traceback.format_exc())
            if attempt < max_retries and backoff_base_sec > 0:
                await asyncio.sleep(backoff_base_sec * (2 ** (attempt - 1)))

    failed_row = FailedJob(
        business_id=business_id,
        queue_name=queue_name,
        job_type=job_type,
        payload=safe_payload,
        error_message=mask_pii(str(last_exc)),
        stack_trace=last_trace,
        retry_count=max_retries,
        max_retries=max_retries,
        last_attempt_at=datetime.now(timezone.utc),
        status="pending",
    )
    db.add(failed_row)
    await db.flush()

    return {
        "status": "failed_queued",
        "failed_job_id": str(failed_row.id),
        "attempts": max_retries,
        "error": failed_row.error_message,
    }


async def retry_failed_job(
    *,
    db: AsyncSession,
    business_id: uuid.UUID,
    failed_job_id: uuid.UUID,
    handler: Optional[JobHandler] = None,
) -> Dict[str, Any]:
    res = await db.execute(
        select(FailedJob).where(
            FailedJob.id == failed_job_id,
            FailedJob.business_id == business_id,
        )
    )
    job = res.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Failed job not found.")

    fn = handler or JOB_HANDLERS.get(job.job_type)
    if fn is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No handler available to resume '{job.job_type}'.",
        )

    job.status = "retrying"
    job.retry_count += 1
    job.last_attempt_at = datetime.now(timezone.utc)
    await db.flush()

    try:
        output = await fn(job.payload)
        job.status = "resolved"
        job.resolved_at = datetime.now(timezone.utc)
        await db.flush()
        return {
            "id": str(job.id),
            "status": job.status,
            "retry_count": job.retry_count,
            "result": output,
        }
    except Exception as exc:
        job.status = "pending"
        job.error_message = mask_pii(str(exc))
        job.stack_trace = mask_pii(traceback.format_exc())
        await db.flush()
        raise


async def get_observability_summary(
    db: AsyncSession,
    business_id: uuid.UUID,
) -> Dict[str, Any]:
    agg_res = await db.execute(
        select(
            func.count(ModelCallLog.id),
            func.coalesce(func.sum(ModelCallLog.cost_usd), 0),
            func.coalesce(func.sum(ModelCallLog.input_tokens), 0),
            func.coalesce(func.sum(ModelCallLog.output_tokens), 0),
            func.coalesce(func.sum(ModelCallLog.cached_tokens), 0),
            func.coalesce(func.avg(ModelCallLog.latency_ms), 0),
        ).where(ModelCallLog.business_id == business_id)
    )
    total_calls, total_cost, total_in, total_out, total_cached, avg_latency = agg_res.one()

    logs_res = await db.execute(
        select(ModelCallLog)
        .where(ModelCallLog.business_id == business_id)
        .order_by(desc(ModelCallLog.created_at))
        .limit(30)
    )
    recent_logs = list(logs_res.scalars().all())

    jobs_res = await db.execute(
        select(FailedJob)
        .where(FailedJob.business_id == business_id)
        .order_by(desc(FailedJob.created_at))
        .limit(25)
    )
    failed_jobs = list(jobs_res.scalars().all())

    return {
        "total_calls": int(total_calls or 0),
        "total_cost_usd": float(total_cost or 0),
        "total_input_tokens": int(total_in or 0),
        "total_output_tokens": int(total_out or 0),
        "total_cached_tokens": int(total_cached or 0),
        "avg_latency_ms": int(avg_latency or 0),
        "recent_logs": recent_logs,
        "failed_jobs": failed_jobs,
    }
''')

# 5. feature_1_workspace/logs_router.py
Path("feature_1_workspace/logs_router.py").write_text('''"""FastAPI router for Settings -> Logs, Cost & Failed Jobs (Task 1.5)."""

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
''')

# 6. feature_1_workspace/templates/settings_logs.html
Path("feature_1_workspace/templates/settings_logs.html").write_text('''{% extends "base.html" %}
{% block title %}Logs, Cost & Failed Jobs — Settings{% endblock %}
{% block content %}

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
  <div class="flex gap-8 items-start">
    <aside class="w-56 flex-shrink-0">
      <div class="sticky top-24">
        <p class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 px-2">Settings</p>
        <nav class="flex flex-col space-y-1">
          <a href="/settings/business" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition">Business Profile</a>
          <a href="/settings/connections" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition">Keys &amp; Connections</a>
          <a href="/settings/prompts" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition">Prompts &amp; Caching</a>
          <a href="/settings/roles" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition">Agent Roles</a>
          <a href="/settings/logs" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white border border-slate-700 shadow-inner">
            Logs, Cost &amp; Jobs
            <span class="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </a>
        </nav>
      </div>
    </aside>

    <main class="flex-1 space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-white">Tracing, Cost &amp; Resilient Job Queue</h1>
        <p class="text-sm text-slate-400 mt-1">Every model call is logged with PII masked prior to transmission, and interrupted background jobs can be resumed with 1 click.</p>
      </div>

      {% if saved_notice %}
      <div class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{{ saved_notice }}</div>
      {% endif %}

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400">Total Spend</p>
          <p class="text-2xl font-bold text-emerald-400 mt-1">${{ "%.4f"|format(summary.total_cost_usd) }}</p>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400">Model Calls</p>
          <p class="text-2xl font-bold text-white mt-1">{{ summary.total_calls }}</p>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400">Cached Tokens</p>
          <p class="text-2xl font-bold text-indigo-400 mt-1">{{ summary.total_cached_tokens }}</p>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400">Avg Latency</p>
          <p class="text-2xl font-bold text-slate-200 mt-1">{{ summary.avg_latency_ms }} ms</p>
        </div>
      </div>

      <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white">Failed Jobs &amp; Outage Recovery</h2>
        {% if summary.failed_jobs %}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th class="py-2 pr-4">Job Type</th>
                <th class="py-2 pr-4">Status</th>
                <th class="py-2 pr-4">Retries</th>
                <th class="py-2 pr-4">Last Error</th>
                <th class="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/70">
              {% for job in summary.failed_jobs %}
              <tr>
                <td class="py-3 pr-4 font-mono text-slate-200">{{ job.job_type }}</td>
                <td class="py-3 pr-4"><span class="px-2 py-0.5 rounded text-xs {{ 'bg-emerald-500/15 text-emerald-300' if job.status == 'resolved' else 'bg-amber-500/15 text-amber-300' }}">{{ job.status }}</span></td>
                <td class="py-3 pr-4 text-slate-300">{{ job.retry_count }} / {{ job.max_retries }}</td>
                <td class="py-3 pr-4 text-rose-300 max-w-md truncate">{{ job.error_message }}</td>
                <td class="py-3 text-right">
                  {% if job.status != 'resolved' %}
                  <form method="post" action="/settings/logs/retry/{{ job.id }}">
                    <button type="submit" class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition">Retry Job</button>
                  </form>
                  {% else %}
                  <span class="text-slate-500">Resolved</span>
                  {% endif %}
                </td>
              </tr>
              {% endfor %}
            </tbody>
          </table>
        </div>
        {% else %}
        <p class="text-xs text-slate-500">No failed background jobs recorded.</p>
        {% endif %}
      </section>

      <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white">Recent Model Call Traces (PII Masked)</h2>
        {% if summary.recent_logs %}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th class="py-2 pr-4">Step</th>
                <th class="py-2 pr-4">Model</th>
                <th class="py-2 pr-4">Tokens (In/Out/Cache)</th>
                <th class="py-2 pr-4">Cost</th>
                <th class="py-2 pr-4">Latency</th>
                <th class="py-2">Masked Prompt Preview</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/70">
              {% for log in summary.recent_logs %}
              <tr>
                <td class="py-3 pr-4 font-mono text-slate-300">{{ log.job_type }}</td>
                <td class="py-3 pr-4 text-indigo-300">{{ log.model_id }}</td>
                <td class="py-3 pr-4 text-slate-300">{{ log.input_tokens }} / {{ log.output_tokens }} / {{ log.cached_tokens }}</td>
                <td class="py-3 pr-4 text-emerald-400">${{ "%.5f"|format(log.cost_usd) }}</td>
                <td class="py-3 pr-4 text-slate-400">{{ log.latency_ms }} ms</td>
                <td class="py-3 text-slate-400 max-w-xs truncate">{{ log.masked_prompt }}</td>
              </tr>
              {% endfor %}
            </tbody>
          </table>
        </div>
        {% else %}
        <p class="text-xs text-slate-500">No model calls logged yet.</p>
        {% endif %}
      </section>
    </main>
  </div>
</div>
{% endblock %}
''')

# 7. tests/test_observability.py
Path("tests/test_observability.py").write_text('''"""Tests for Task 1.5: Pre-Model PII Masking, Cost Logging, Resilient Retries & RLS."""

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
''')

# Mount logs_router in shared/main.py
main_path = Path("shared/main.py")
src = main_path.read_text()
if "logs_router" not in src:
    src = src.replace(
        "from feature_1_workspace.roles_router import router as roles_router",
        "from feature_1_workspace.roles_router import router as roles_router\\n"
        "from feature_1_workspace.logs_router import router as logs_router",
        1,
    )
    src = src.replace(
        "app.include_router(roles_router)",
        "app.include_router(roles_router)\\napp.include_router(logs_router)",
        1,
    )
    main_path.write_text(src)

print("All Task 1.5 files successfully created and mounted!")
