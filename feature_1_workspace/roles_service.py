"""Business logic for Pre-Seeded Agent Roles, Role Editor, and Live Test Chat (Task 1.4)."""

from __future__ import annotations

import os
import re
import uuid
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.models import AgentRole

AVAILABLE_SKILLS: List[Dict[str, str]] = [
    {
        "id": "search_knowledge_brain",
        "label": "Answer from Knowledge Brain",
        "description": "Retrieve verified help-center articles, pages, and approved lessons.",
    },
    {
        "id": "draft_customer_reply",
        "label": "Write reply for human approval",
        "description": "Compose structured email or chat responses grounded in citations.",
    },
    {
        "id": "create_expert_task",
        "label": "Create expert escalation task",
        "description": "Log a structured engineering or account escalation ticket.",
    },
    {
        "id": "share_pricing_quote",
        "label": "Share pricing & solution quote",
        "description": "Recommend plans, add-ons, and next-step consultation quotes.",
    },
]

DEFAULT_STARTER_PROMPT = (
    "You are a specialist AI assistant for this business. Answer customer inquiries using only "
    "verified Knowledge Brain articles and approved company policies. Be transparent when a detail "
    "is not documented, and immediately flag refund, billing dispute, or legal requests for human review."
)

DEFAULT_ROLE_SPECS: List[Dict[str, Any]] = [
    {
        "name": "Support Engineer",
        "slug": "support-engineer",
        "description": "Resolve technical setup, DNS/SSL, webhook, and code-level troubleshooting with step-by-step precision.",
        "system_prompt": (
            "You are a Senior Support Engineer. Provide exact, step-by-step technical troubleshooting "
            "with specific admin setting paths, configuration keys, DNS/webhook diagnostics, and code-level "
            "examples. Verify prerequisites first and explain the root cause clearly."
        ),
        "tone": "technical",
        "verbosity": 4,
        "technical_depth": 5,
        "politeness": 3,
        "permitted_skills": [
            "search_knowledge_brain",
            "draft_customer_reply",
            "create_expert_task",
        ],
        "handover_criteria": {
            "auto_handover_on_refund": True,
            "auto_handover_on_legal": True,
            "auto_handover_on_angry": True,
            "assigned_model": "gemma4:e4b",
            "knowledge_sources": ["all"],
            "custom_triggers": ["production outage", "security breach"],
        },
        "is_default": True,
    },
    {
        "name": "Support Executive",
        "slug": "support-executive",
        "description": "Deliver warm, jargon-free, everyday how-to answers so customers succeed quickly.",
        "system_prompt": (
            "You are a friendly Customer Support Executive. Give simple, reassuring, jargon-free "
            "everyday how-to guidance in short, easy-to-follow steps. Keep explanations clear, concise, "
            "and welcoming for non-technical users."
        ),
        "tone": "friendly",
        "verbosity": 2,
        "technical_depth": 2,
        "politeness": 5,
        "permitted_skills": [
            "search_knowledge_brain",
            "draft_customer_reply",
        ],
        "handover_criteria": {
            "auto_handover_on_refund": True,
            "auto_handover_on_legal": True,
            "auto_handover_on_angry": True,
            "assigned_model": "gemma4:e4b",
            "knowledge_sources": ["all"],
            "custom_triggers": ["cancel subscription", "speak to manager"],
        },
        "is_default": False,
    },
    {
        "name": "AI Consultant",
        "slug": "ai-consultant",
        "description": "Qualify client goals, recommend tailored solutions, and guide inquiries toward a quote or next step.",
        "system_prompt": (
            "You are an AI Solutions Consultant. Handle client inquiries with consultative, value-driven "
            "communication: uncover the client's business goal, recommend the best-fit solution and capabilities, "
            "highlight business outcomes, and guide the conversation smoothly toward a tailored quote or discovery call."
        ),
        "tone": "consultative",
        "verbosity": 3,
        "technical_depth": 3,
        "politeness": 5,
        "permitted_skills": [
            "search_knowledge_brain",
            "draft_customer_reply",
            "share_pricing_quote",
            "create_expert_task",
        ],
        "handover_criteria": {
            "auto_handover_on_refund": True,
            "auto_handover_on_legal": True,
            "auto_handover_on_angry": True,
            "assigned_model": "gemma4:e4b",
            "knowledge_sources": ["all"],
            "custom_triggers": ["enterprise contract", "custom SLA"],
        },
        "is_default": False,
    },
]


def _slugify_role(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9]+", "-", (name or "").strip().lower()).strip("-")
    return (clean or "custom-role")[:90]


def _validate_sliders(verbosity: int, technical_depth: int, politeness: int) -> None:
    for label, val in (
        ("verbosity", verbosity),
        ("technical_depth", technical_depth),
        ("politeness", politeness),
    ):
        if not (1 <= int(val) <= 5):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{label} must be between 1 and 5 (got {val}).",
            )


async def ensure_default_roles(
    db: AsyncSession,
    business_id: uuid.UUID,
) -> List[AgentRole]:
    """Idempotently seed the 3 canonical agent roles for a business."""
    existing_res = await db.execute(
        select(AgentRole.slug).where(AgentRole.business_id == business_id)
    )
    existing_slugs = set(existing_res.scalars().all())

    created: List[AgentRole] = []
    for spec in DEFAULT_ROLE_SPECS:
        if spec["slug"] in existing_slugs:
            continue
        role = AgentRole(
            business_id=business_id,
            name=spec["name"],
            slug=spec["slug"],
            description=spec["description"],
            system_prompt=spec["system_prompt"],
            tone=spec["tone"],
            verbosity=spec["verbosity"],
            technical_depth=spec["technical_depth"],
            politeness=spec["politeness"],
            permitted_skills=list(spec["permitted_skills"]),
            handover_criteria=dict(spec["handover_criteria"]),
            is_default=spec["is_default"],
            is_active=True,
        )
        db.add(role)
        created.append(role)

    if created:
        await db.flush()
    return created


async def list_roles(
    db: AsyncSession,
    business_id: uuid.UUID,
) -> List[AgentRole]:
    """Ensure default roles exist and return all active roles for the tenant."""
    await ensure_default_roles(db, business_id)
    res = await db.execute(
        select(AgentRole)
        .where(AgentRole.business_id == business_id, AgentRole.is_active.is_(True))
        .order_by(desc(AgentRole.is_default), AgentRole.created_at.asc())
    )
    return list(res.scalars().all())


async def upsert_role(
    db: AsyncSession,
    business_id: uuid.UUID,
    *,
    role_id: Optional[uuid.UUID] = None,
    name: str,
    description: Optional[str],
    system_prompt: str,
    tone: str = "technical",
    verbosity: int = 3,
    technical_depth: int = 3,
    politeness: int = 3,
    permitted_skills: Optional[List[str]] = None,
    assigned_model: str = "gemma4:e4b",
    knowledge_sources: Optional[List[str]] = None,
    auto_handover_on_refund: bool = True,
    auto_handover_on_legal: bool = True,
    auto_handover_on_angry: bool = True,
    custom_triggers: Optional[List[str]] = None,
) -> AgentRole:
    """Create a new custom role or update an existing role for the business."""
    clean_name = (name or "").strip()
    clean_prompt = (system_prompt or "").strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role name is required.",
        )
    if not clean_prompt:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role system prompt is required.",
        )
    _validate_sliders(verbosity, technical_depth, politeness)

    handover_payload: Dict[str, Any] = {
        "auto_handover_on_refund": bool(auto_handover_on_refund),
        "auto_handover_on_legal": bool(auto_handover_on_legal),
        "auto_handover_on_angry": bool(auto_handover_on_angry),
        "assigned_model": (assigned_model or "gemma4:e4b").strip(),
        "knowledge_sources": knowledge_sources or ["all"],
        "custom_triggers": [t.strip() for t in (custom_triggers or []) if t.strip()],
    }

    if role_id is not None:
        res = await db.execute(
            select(AgentRole).where(
                AgentRole.id == role_id,
                AgentRole.business_id == business_id,
            )
        )
        role = res.scalar_one_or_none()
        if role is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")
        role.name = clean_name
        role.description = (description or "").strip() or None
        role.system_prompt = clean_prompt
        role.tone = (tone or "technical").strip().lower()
        role.verbosity = int(verbosity)
        role.technical_depth = int(technical_depth)
        role.politeness = int(politeness)
        role.permitted_skills = list(permitted_skills or [])
        role.handover_criteria = handover_payload
        await db.flush()
        return role

    # Generate unique slug within this business
    base_slug = _slugify_role(clean_name)
    slug = base_slug
    counter = 1
    while True:
        dup = await db.execute(
            select(AgentRole.id).where(
                AgentRole.business_id == business_id,
                AgentRole.slug == slug,
            )
        )
        if dup.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    new_role = AgentRole(
        business_id=business_id,
        name=clean_name,
        slug=slug,
        description=(description or "").strip() or None,
        system_prompt=clean_prompt,
        tone=(tone or "technical").strip().lower(),
        verbosity=int(verbosity),
        technical_depth=int(technical_depth),
        politeness=int(politeness),
        permitted_skills=list(permitted_skills or ["search_knowledge_brain"]),
        handover_criteria=handover_payload,
        is_default=False,
        is_active=True,
    )
    db.add(new_role)
    await db.flush()
    return new_role


def detect_handover_trigger(
    message: str,
    handover_criteria: Dict[str, Any],
) -> Optional[str]:
    """Return the matched escalation reason if the message requires human handoff."""
    lowered = (message or "").lower()
    if handover_criteria.get("auto_handover_on_refund", True) and any(
        kw in lowered for kw in ("refund", "chargeback", "money back", "dispute charge")
    ):
        return "Refund / billing dispute policy"
    if handover_criteria.get("auto_handover_on_legal", True) and any(
        kw in lowered for kw in ("lawyer", "lawsuit", "attorney", "legal action", "gdpr subpoena")
    ):
        return "Legal / compliance escalation policy"
    if handover_criteria.get("auto_handover_on_angry", True) and any(
        kw in lowered for kw in ("furious", "unacceptable", "scam", "worst service", "angry")
    ):
        return "High-frustration / angry sentiment policy"
    for trigger in handover_criteria.get("custom_triggers", []):
        if trigger and trigger.lower() in lowered:
            return f"Custom trigger: '{trigger}'"
    return None


async def run_role_test_chat(
    *,
    role_name: str,
    description: str,
    system_prompt: str,
    tone: str,
    verbosity: int,
    technical_depth: int,
    politeness: int,
    assigned_model: str,
    permitted_skills: List[str],
    handover_criteria: Dict[str, Any],
    user_message: str,
    try_ollama: bool = True,
) -> Dict[str, Any]:
    """Preview a role's live response using unsaved editor configuration."""
    clean_msg = (user_message or "").strip()
    if not clean_msg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a test question or paste a customer email first.",
        )

    handover_reason = detect_handover_trigger(clean_msg, handover_criteria)
    clean_tone = (tone or "technical").strip().lower()
    model_used = (assigned_model or "gemma4:e4b").strip()
    source_mode = "role-preview-engine"

    # If a local Ollama model is selected and reachable, generate live output via Ollama
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    is_local_ollama = model_used in {"gemma4:e4b", "qwen3.5:4b"} or ":" in model_used
    if try_ollama and is_local_ollama and not handover_reason:
        composed_system = (
            f"Role: {role_name}\n"
            f"Goal: {description}\n"
            f"Instructions: {system_prompt}\n"
            f"Tone: {clean_tone} | Verbosity: {verbosity}/5 | Technical Depth: {technical_depth}/5 | Politeness: {politeness}/5\n"
            f"Allowed Skills: {', '.join(permitted_skills) if permitted_skills else 'none'}\n"
            "Keep the reply concise (under 140 words) and strictly reflect the tone and technical depth above."
        )
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    f"{ollama_base}/api/chat",
                    json={
                        "model": model_used,
                        "stream": False,
                        "messages": [
                            {"role": "system", "content": composed_system},
                            {"role": "user", "content": clean_msg},
                        ],
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = (data.get("message") or {}).get("content", "").strip()
                    if content:
                        return {
                            "role_name": role_name,
                            "tone": clean_tone,
                            "model": model_used,
                            "source": "ollama-live",
                            "handover_triggered": False,
                            "handover_reason": None,
                            "reply": content,
                        }
        except Exception:
            pass

    # Deterministic, tone- and depth-differentiated preview grounded in the editor's live settings
    core_fact = (
        "Verified Knowledge Fact: Custom domains connect via a CNAME record pointing to your workspace "
        "host and automatically provision TLS/SSL certificates within 5–10 minutes under Settings -> Domain."
    )
    if handover_reason:
        reply = (
            f"[Send to a human — Triggered: {handover_reason}]\n"
            f"Role '{role_name}' paused autonomous reply and queued this thread for a human owner."
        )
    elif clean_tone == "technical" or int(technical_depth) >= 4:
        reply = (
            f"[{role_name} | Technical Depth {technical_depth}/5 | Verbosity {verbosity}/5]\n"
            f"1. Configure DNS: Add `CNAME @ -> proxy.workspace.local` (TTL 300s) and verify propagation with `dig +short CNAME`.\n"
            f"2. Admin Path: Open Settings -> Domain -> Custom Hostname, save the domain, and trigger ACME TLS issuance.\n"
            f"3. {core_fact}\n"
            f"Active directive applied: {system_prompt[:110]}..."
        )
    elif clean_tone == "consultative" or "consultant" in role_name.lower():
        reply = (
            f"[{role_name} | Consultative Sales | Politeness {politeness}/5]\n"
            f"Great question—connecting your branded domain boosts customer trust right away. "
            f"{core_fact} Depending on your team size and white-label needs, we can also bundle multi-domain routing "
            f"and priority onboarding. Would you like me to prepare a tailored quote or schedule a 15-minute setup walkthrough?"
        )
    else:
        reply = (
            f"[{role_name} | Friendly How-To | Depth {technical_depth}/5 | Politeness {politeness}/5]\n"
            f"Hi there! You can connect your custom domain in two quick steps: open Settings -> Domain, enter your web address, "
            f"and paste the CNAME record into your domain provider. {core_fact} Let me know if you'd like help checking it!"
        )

    return {
        "role_name": role_name,
        "tone": clean_tone,
        "model": model_used,
        "source": source_mode,
        "handover_triggered": bool(handover_reason),
        "handover_reason": handover_reason,
        "reply": reply,
    }
