"""Unified LLM Gateway enforcing pre-model PII masking, token cost calculation, and DB logging."""

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
    combined_masked_prompt = f"[SYSTEM]\n{safe_system}\n\n[USER]\n{safe_user}"

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
