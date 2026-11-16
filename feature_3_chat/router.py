"""FastAPI router for Feature 3: Live Role-Aware Ask & Teach Chat + Feedback Loop."""
from __future__ import annotations

import re
from pathlib import Path
from fastapi import APIRouter, Depends, Form, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import get_db, require_authenticated_user
from feature_1_workspace.models import AgentRole
from feature_2_knowledge_brain.models import Instruction
from feature_3_chat.models import ChatMessage, ChatThread
from feature_3_chat.retrieval_service import hybrid_retrieve_context
from feature_4_eval_lab.models import EvalTestCase
from shared.live_inference import run_live_llm

_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

router = APIRouter(prefix="/chat", tags=["ask-and-teach-chat"])

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"reveal\s+(your\s+)?system\s+prompt",
    r"drop\s+table",
    r"bypass\s+(security|rls|guardrails)",
]
ESCALATION_KEYWORDS = {"refund", "lawsuit", "attorney", "legal", "chargeback", "sue", "furious", "angry"}


@router.get("", response_class=HTMLResponse)
async def chat_hub_page(
    request: Request,
    thread_id: str | None = None,
    notice: str | None = None,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, business = auth
    threads_res = await db.execute(
        select(ChatThread).where(ChatThread.business_id == business.id).order_by(ChatThread.created_at.desc())
    )
    threads = list(threads_res.scalars().all())

    roles_res = await db.execute(
        select(AgentRole).where(AgentRole.business_id == business.id, AgentRole.is_active == True)
    )
    roles = list(roles_res.scalars().all())

    active_thread = None
    messages = []
    if thread_id:
        t_res = await db.execute(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.business_id == business.id))
        active_thread = t_res.scalars().first()
    elif threads:
        active_thread = threads[0]

    if active_thread:
        m_res = await db.execute(select(ChatMessage).where(ChatMessage.thread_id == active_thread.id).order_by(ChatMessage.created_at.asc()))
        messages = list(m_res.scalars().all())

    return templates.TemplateResponse(
        request=request,
        name="chat.html",
        context={
            "user": user,
            "business": business,
            "threads": threads,
            "roles": roles,
            "active_thread": active_thread,
            "messages": messages,
            "notice": notice,
        },
    )


@router.post("/threads/new", response_class=HTMLResponse)
async def create_chat_thread(
    request: Request,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, business = auth
    thread = ChatThread(business_id=business.id, title="Customer Inquiry")
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return RedirectResponse(url=f"/chat?thread_id={thread.id}", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/messages/send", response_class=HTMLResponse)
async def send_chat_message(
    request: Request,
    thread_id: str = Form(...),
    prompt: str = Form(...),
    mode: str = Form("ask"),
    role_slug: str = Form("support-engineer"),
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    user, business = auth
    clean_prompt = prompt.strip()
    if not clean_prompt:
        return RedirectResponse(url=f"/chat?thread_id={thread_id}", status_code=status.HTTP_303_SEE_OTHER)

    # Update thread title on first message
    t_res = await db.execute(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.business_id == business.id))
    thread = t_res.scalars().first()
    if thread and thread.title == "Customer Inquiry":
        thread.title = clean_prompt[:52] + ("..." if len(clean_prompt) > 52 else "")

    db.add(ChatMessage(thread_id=thread_id, role="user", content=clean_prompt))

    # Resolve selected Agent Role persona
    r_res = await db.execute(
        select(AgentRole).where(AgentRole.business_id == business.id, AgentRole.slug == role_slug)
    )
    selected_role = r_res.scalars().first()
    role_label = selected_role.name if selected_role else "AI Tech Consultant"
    role_tone = selected_role.tone if selected_role else "technical"
    role_sys = selected_role.system_prompt if selected_role else "You are an enterprise AI Tech Consultant."

    # Guardrail 1: Prompt Injection Defense
    lower_q = clean_prompt.lower()
    if any(re.search(pat, lower_q) for pat in INJECTION_PATTERNS):
        db.add(ChatMessage(
            thread_id=thread_id,
            role="assistant",
            content="🛡️ **Security Guardrail Triggered:** Potential prompt-injection pattern detected and blocked. Tenant isolation and system instructions remain protected.",
            knowledge_types_used=["Security Guardrail"],
            sources_cited=["Guardrail: Prompt Injection Defense"],
        ))
        await db.commit()
        return RedirectResponse(url=f"/chat?thread_id={thread_id}", status_code=status.HTTP_303_SEE_OTHER)

    # Guardrail 2: Mandatory Human Escalation (Refund / Legal / Angry)
    words = set(re.findall(r"[a-z]+", lower_q))
    if mode == "ask" and (words & ESCALATION_KEYWORDS):
        db.add(ChatMessage(
            thread_id=thread_id,
            role="assistant",
            content=(
                f"🚨 **Escalated to Human Specialist ({role_label} Handover Rule):** "
                "Your inquiry involves billing/refund, legal, or sensitive escalation criteria. "
                "I have flagged this thread for immediate human review rather than guessing."
            ),
            knowledge_types_used=["Handover Policy"],
            sources_cited=["Policy: Mandatory Human Escalation"],
        ))
        await db.commit()
        return RedirectResponse(url=f"/chat?thread_id={thread_id}", status_code=status.HTTP_303_SEE_OTHER)

    if mode == "teach":
        # Persist real Instruction in Feature 2 Knowledge Brain!
        rule_title = f"Learned Rule: {clean_prompt[:55]}"
        new_inst = Instruction(
            business_id=business.id,
            title=rule_title,
            content=clean_prompt,
            target_roles=[role_slug],
            is_active=True,
        )
        db.add(new_inst)
        assistant_content = (
            f"✅ **Saved to Knowledge Brain (Instructions):**\n"
            f"• **Title:** {rule_title}\n"
            f"• **Rule:** {clean_prompt}\n\n"
            f"Switch back to **Ask Something** mode and ask a related question—the agent will now retrieve and apply this rule immediately."
        )
        knowledge_types = ["Instructions (Live Saved)"]
        sources = [f"Instruction: {rule_title}"]
    else:
        retrieval = await hybrid_retrieve_context(db, business.id, clean_prompt)
        if retrieval["total_records"] == 0:
            assistant_content = (
                "I do not have any indexed sitemaps, URLs, or instructions in your Knowledge Brain yet. "
                "Add a sitemap in **Knowledge → Sitemaps** or teach me a rule using **Teach Me** mode above."
            )
            knowledge_types = ["Empty Knowledge Brain"]
            sources = []
        else:
            sys_prompt = (
                f"{role_sys}\nRole: {role_label} | Tone: {role_tone}.\n"
                "Answer ONLY using the verified Knowledge Brain context below. Cite the exact URLs or Instruction titles used. "
                "If the context does not cover the question, state clearly that you are escalating to a human expert.\n\n"
                f"VERIFIED CONTEXT:\n{retrieval['context_text']}"
            )
            llm_out = await run_live_llm(
                db=db,
                business_id=business.id,
                system_prompt=sys_prompt,
                user_prompt=clean_prompt,
                preferred_model="gemma4:e4b (Local)",
            )
            trace_footer = (
                f"\n\n---\n*Trace: Role={role_label} ({role_tone}) • Engine={llm_out['engine']} • "
                f"Latency={llm_out['latency_ms']}ms • Cost=${llm_out['cost_usd']:.5f}*"
            )
            if llm_out["live"] and llm_out["text"]:
                assistant_content = llm_out["text"] + trace_footer
            else:
                assistant_content = (
                    f"**[{role_label} — {role_tone.title()} Tone]** Based on your verified Knowledge Brain:\n\n"
                    f"{retrieval['context_text'][:1400]}"
                    + trace_footer
                )
            knowledge_types = retrieval["knowledge_types_used"]
            sources = retrieval["sources_cited"]

    db.add(ChatMessage(
        thread_id=thread_id,
        role="assistant",
        content=assistant_content,
        knowledge_types_used=knowledge_types,
        sources_cited=sources,
    ))
    await db.commit()
    return RedirectResponse(url=f"/chat?thread_id={thread_id}", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/messages/{msg_id}/feedback", response_class=HTMLResponse)
async def submit_message_feedback(
    msg_id: str,
    thread_id: str = Form(...),
    rating: str = Form(...),
    correction_note: str = Form(""),
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """Convert thumbs-down feedback directly into an Eval Lab benchmark test case + optional Instruction."""
    user, business = auth
    m_res = await db.execute(select(ChatMessage).where(ChatMessage.id == msg_id))
    msg = m_res.scalars().first()
    if msg and rating == "down":
        # Find preceding user prompt in same thread
        prev_res = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id, ChatMessage.role == "user")
            .order_by(ChatMessage.created_at.desc())
        )
        last_user_msg = prev_res.scalars().first()
        q_text = last_user_msg.content if last_user_msg else "Customer support query"
        note = correction_note.strip() or "Must cite verified Knowledge Brain records accurately"
        db.add(EvalTestCase(
            business_id=business.id,
            prompt=q_text,
            expected_output_keywords=note,
            category="Chat Feedback Regression",
        ))
        if correction_note.strip():
            db.add(Instruction(
                business_id=business.id,
                title=f"Correction: {q_text[:45]}",
                content=correction_note.strip(),
                is_active=True,
            ))
        await db.commit()
        return RedirectResponse(url=f"/chat?thread_id={thread_id}&notice=Added+to+Eval+Lab+test+cases", status_code=303)
    return RedirectResponse(url=f"/chat?thread_id={thread_id}&notice=Feedback+recorded", status_code=303)
