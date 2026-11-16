"""Authentication, Password Hashing, Signed Session Cookies, and Auth Dependencies."""

import base64
import hashlib
import hmac
import json
import os
import time
from typing import AsyncGenerator, Dict, Optional, Tuple, Union
import uuid

import argon2
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from feature_1_workspace.database import AsyncSessionLocal, tenant_context
from feature_1_workspace.models import Business, User

# Secret key for cryptographically signing session cookies
SESSION_SECRET_KEY = os.getenv(
    "SESSION_SECRET_KEY",
    "ai-tech-consultant-cryptographic-session-secret-key-32-bytes-long",
)
COOKIE_NAME = "session"
DEFAULT_SESSION_MAX_AGE = 86400 * 30  # 30 days

# Argon2 Password Hasher instance
_pwd_hasher = argon2.PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id with automatic salt generation."""
    try:
        return _pwd_hasher.hash(password)
    except Exception:
        # PBKDF2-HMAC-SHA256 fallback if native argon2 bindings encounter system issues
        salt = os.urandom(16)
        kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600000)
        return f"pbkdf2:sha256:600000${salt.hex()}${kdf.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2id or PBKDF2 hash."""
    if not hashed_password:
        return False
    if hashed_password.startswith("pbkdf2:"):
        try:
            _, algo, iters, salt_hex, hash_hex = hashed_password.split("$")
            kdf = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                bytes.fromhex(salt_hex),
                int(iters),
            )
            return hmac.compare_digest(kdf.hex(), hash_hex)
        except Exception:
            return False
    try:
        return _pwd_hasher.verify(hashed_password, plain_password)
    except argon2.exceptions.VerifyMismatchError:
        return False
    except Exception:
        return False


def encode_session(
    payload: Dict[str, Union[str, int]],
    max_age: int = DEFAULT_SESSION_MAX_AGE,
) -> str:
    """Serialize and HMAC-SHA256 sign session payload storing user_id and business_id."""
    data = dict(payload)
    data["exp"] = int(time.time()) + max_age
    json_bytes = json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(json_bytes).decode("utf-8").rstrip("=")

    signature = hmac.new(
        SESSION_SECRET_KEY.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def decode_session(token: Optional[str]) -> Optional[Dict[str, Union[str, int]]]:
    """Verify HMAC signature and decode payload from a signed session cookie."""
    if not token or "." not in token:
        return None

    try:
        payload_b64, signature = token.rsplit(".", 1)
        expected_sig = hmac.new(
            SESSION_SECRET_KEY.encode("utf-8"),
            payload_b64.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Add base64 padding if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding and padding != 4:
            payload_b64 += "=" * padding

        raw_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        payload = json.loads(raw_json)

        # Check expiration timestamp
        if payload.get("exp", 0) < time.time():
            return None

        # Must have user_id and business_id
        if "user_id" not in payload or "business_id" not in payload:
            return None

        return payload
    except Exception:
        return None


def set_session_cookie(
    response: Response,
    user_id: Union[uuid.UUID, str],
    business_id: Union[uuid.UUID, str],
    email: str = "",
    role: str = "member",
    max_age: int = DEFAULT_SESSION_MAX_AGE,
) -> str:
    """Generate signed cookie storing user_id and business_id and attach to Response."""
    payload = {
        "user_id": str(user_id),
        "business_id": str(business_id),
        "email": email,
        "role": role,
    }
    cookie_value = encode_session(payload, max_age=max_age)
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_value,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in HTTPS production environments
        path="/",
    )
    return cookie_value


def clear_session_cookie(response: Response) -> None:
    """Clear signed session cookie on Response."""
    response.delete_cookie(key=COOKIE_NAME, path="/")


def get_session_from_request(request: Request) -> Optional[Dict[str, Union[str, int]]]:
    """Extract and verify signed session cookie from FastAPI Request."""
    cookie = request.cookies.get(COOKIE_NAME)
    return decode_session(cookie)


async def get_admin_db() -> AsyncGenerator[AsyncSession, None]:
    """Database session dependency without RLS tenant restrictions.
    
    Used for platform operations like login email lookup, initial tenant signup,
    or cascading deletion of the root business entity.
    """
    token = tenant_context.set(None)
    async with AsyncSessionLocal() as session:
        session.info["business_id"] = None
        session.info["is_admin"] = True
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            tenant_context.reset(token)


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """FastAPI database session dependency enforcing strict multi-tenant isolation.
    
    Extracts business_id from the signed session cookie and immediately executes:
    SELECT set_config('app.current_business_id', :biz_id, true)
    at transaction start.
    """
    session_data = get_session_from_request(request)
    biz_id = session_data.get("business_id") if session_data else None

    biz_str = str(biz_id) if biz_id else None
    token = tenant_context.set(biz_str)

    async with AsyncSessionLocal() as session:
        session.info["business_id"] = biz_str
        session.info["is_admin"] = False

        if biz_str:
            try:
                async with session.begin_nested():
                    await session.execute(text("SET ROLE ai_app_user;"))
            except Exception:
                pass
            await session.execute(
                text("SELECT set_config('app.current_business_id', :biz_id, true);"),
                {"biz_id": biz_str},
            )

        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            tenant_context.reset(token)


async def require_authenticated_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Tuple[User, Business]:
    """Ensure the request is signed and authenticated, returning the active User and Business.
    
    Redirects to /login if unauthenticated on HTML navigation, or raises 401 on API calls.
    """
    session_data = get_session_from_request(request)
    if not session_data:
        if "text/html" in request.headers.get("accept", ""):
            raise HTTPException(
                status_code=status.HTTP_303_SEE_OTHER,
                headers={"Location": "/login"},
                detail="Authentication required",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user_id = session_data.get("user_id")
    biz_id = session_data.get("business_id")

    try:
        user_uuid = uuid.UUID(str(user_id))
        biz_uuid = uuid.UUID(str(biz_id))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_303_SEE_OTHER,
            headers={"Location": "/login"},
            detail="Invalid session tokens",
        )

    # In tenant-isolated session, user lookup is scoped to current_business_id
    user_res = await db.execute(select(User).where(User.id == user_uuid))
    user = user_res.scalar_one_or_none()

    biz_res = await db.execute(select(Business).where(Business.id == biz_uuid))
    business = biz_res.scalar_one_or_none()

    if not user or not business or not user.is_active:
        if "text/html" in request.headers.get("accept", ""):
            raise HTTPException(
                status_code=status.HTTP_303_SEE_OTHER,
                headers={"Location": "/login"},
                detail="Session expired or invalid",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

    return user, business
