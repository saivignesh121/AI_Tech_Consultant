"""Observability metrics, resilient background job retries, and failed-job recovery (Task 1.5)."""

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
