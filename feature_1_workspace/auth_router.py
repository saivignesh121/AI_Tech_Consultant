"""Authentication and Tenant Management Router for Feature 1."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.models import Business, User
from shared.database import engine

router = APIRouter(prefix="/auth", tags=["Auth & Tenants"])


class SignupRequest(BaseModel):
    business_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest):
    """Register a new business tenant and owner user."""
    async with AsyncSession(engine) as session:
        async with session.begin():
            existing = await session.execute(select(User).where(User.email == payload.email))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email already registered")

            business = Business(name=payload.business_name)
            session.add(business)
            await session.flush()

            user = User(
                business_id=business.id,
                email=payload.email,
                password_hash=payload.password,
                role="owner"
            )
            session.add(user)

    return {"status": "success", "business_id": str(business.id), "email": payload.email}


@router.post("/login")
async def login(payload: LoginRequest):
    """Authenticate tenant user."""
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User).where(User.email == payload.email))
        user = result.scalar_one_or_none()

        if not user or user.password_hash != payload.password:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"status": "success", "user_id": str(user.id), "business_id": str(user.business_id), "role": user.role}
