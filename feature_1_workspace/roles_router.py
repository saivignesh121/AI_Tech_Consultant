"""Agent Roles Management Router for Feature 1 (Task 1.4)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.models import AgentRole
from shared.database import engine

router = APIRouter(prefix="/settings/roles", tags=["Agent Roles"])


class RoleUpsertRequest(BaseModel):
    name: str
    goal: str
    tone: str
    is_active: bool = True


@router.get("")
async def list_roles():
    """List all customizable agent roles for the tenant."""
    async with AsyncSession(engine) as session:
        result = await session.execute(select(AgentRole))
        roles = result.scalars().all()
    return {
        "status": "success",
        "roles": [
            {
                "id": str(r.id),
                "name": r.name,
                "goal": r.goal,
                "tone": r.tone,
                "is_active": r.is_active,
            }
            for r in roles
        ],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_role(payload: RoleUpsertRequest):
    """Create a new custom agent role."""
    async with AsyncSession(engine) as session:
        async with session.begin():
            role = AgentRole(
                name=payload.name,
                goal=payload.goal,
                tone=payload.tone,
                is_active=payload.is_active,
            )
            session.add(role)
    return {"status": "success", "name": payload.name}
