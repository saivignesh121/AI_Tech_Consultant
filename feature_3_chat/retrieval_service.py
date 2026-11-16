"""Keyword-scored hybrid retrieval and citation grounding service for Feature 3."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from feature_2_knowledge_brain.models import KnowledgePage, Instruction, Skill


def _score_text(query_tokens: set[str], text: str) -> int:
    if not query_tokens or not text:
        return 0
    doc_tokens = set(re.findall(r"[a-z0-9]{3,}", text.lower()))
    return len(query_tokens & doc_tokens)


async def hybrid_retrieve_context(
    db: AsyncSession,
    business_id: Any,
    query: str,
    limit: int = 5,
) -> Dict[str, Any]:
    """Retrieve and rank knowledge pages, instructions, and skills matching the user query."""
    q_tokens = set(re.findall(r"[a-z0-9]{3,}", (query or "").lower()))

    pages_res = await db.execute(
        select(KnowledgePage)
        .where(KnowledgePage.business_id == business_id)
        .where(KnowledgePage.health_status == "Active")
    )
    all_pages = list(pages_res.scalars().all())
    ranked_pages: List[Tuple[int, KnowledgePage]] = sorted(
        [(_score_text(q_tokens, f"{p.title or ''} {p.url}"), p) for p in all_pages],
        key=lambda x: x[0],
        reverse=True,
    )

    inst_res = await db.execute(
        select(Instruction)
        .where(Instruction.business_id == business_id)
        .where(Instruction.is_active == True)
    )
    all_inst = list(inst_res.scalars().all())
    ranked_inst: List[Tuple[int, Instruction]] = sorted(
        [(_score_text(q_tokens, f"{i.title} {i.content}"), i) for i in all_inst],
        key=lambda x: x[0],
        reverse=True,
    )

    skills_res = await db.execute(
        select(Skill)
        .where(Skill.business_id == business_id)
        .where(Skill.is_active == True)
    )
    all_skills = list(skills_res.scalars().all())
    ranked_skills: List[Tuple[int, Skill]] = sorted(
        [(_score_text(q_tokens, f"{s.name} {s.trigger_condition} {s.steps_markdown}"), s) for s in all_skills],
        key=lambda x: x[0],
        reverse=True,
    )

    context_snippets: List[str] = []
    sources_cited: List[str] = []
    knowledge_types_used: List[str] = []

    top_pages = [p for _, p in ranked_pages[:3]]
    if top_pages:
        knowledge_types_used.append("Sitemaps & Page URLs")
        for p in top_pages:
            title = p.title or p.url
            context_snippets.append(f"[Doc Page] {title} ({p.url})")
            sources_cited.append(p.url)

    # Always include active high-priority / matching instructions
    top_inst = [i for _, i in ranked_inst[:3]]
    if top_inst:
        knowledge_types_used.append("Instructions")
        for inst in top_inst:
            context_snippets.append(f"[Instruction: {inst.title}] {inst.content}")
            sources_cited.append(f"Instruction: {inst.title}")

    top_skills = [s for _, s in ranked_skills[:2]]
    if top_skills:
        knowledge_types_used.append("Skills")
        for s in top_skills:
            context_snippets.append(f"[Skill: {s.name}] Trigger: {s.trigger_condition} | Steps: {s.steps_markdown}")
            sources_cited.append(f"Skill: {s.name}")

    best_match_score = max(
        [ranked_pages[0][0] if ranked_pages else 0]
        + [ranked_inst[0][0] if ranked_inst else 0]
        + [ranked_skills[0][0] if ranked_skills else 0]
    )

    return {
        "context_text": "\n\n".join(context_snippets) if context_snippets else "No specific knowledge base records found.",
        "sources_cited": sources_cited,
        "knowledge_types_used": list(dict.fromkeys(knowledge_types_used)),
        "match_score": best_match_score,
        "total_records": len(all_pages) + len(all_inst) + len(all_skills),
    }
