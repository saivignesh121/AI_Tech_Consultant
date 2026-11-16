"""Database connection, Session management, and Multi-Tenant Isolation with RLS."""

from contextlib import asynccontextmanager
from contextvars import ContextVar
import os
from typing import AsyncGenerator, Dict, List, Optional, Union
import uuid

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session

# Database URL configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tech_consultant",
)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Core Async Engine
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# ContextVar storing active tenant business_id for async execution flows
tenant_context: ContextVar[Optional[str]] = ContextVar("tenant_context", default=None)

# Canonical list of 24 tenant tables governed by FORCE ROW LEVEL SECURITY
TENANT_TABLES: List[str] = [
    "users",
    "connections",
    "onboarding_status",
    "agent_roles",
    "prompt_versions",
    "model_call_logs",
    "failed_jobs",
    "sitemaps",
    "knowledge_pages",
    "sitemap_urls",
    "page_versions",
    "knowledge_chunks",
    "instructions",
    "skills",
    "skill_versions",
    "email_threads",
    "email_messages",
    "email_notes",
    "chats",
    "chat_messages",
    "lessons",
    "eval_runs",
    "eval_results",
    "self_improve_runs",
]


@event.listens_for(Session, "after_begin")
def receive_after_begin(session: Session, transaction, connection) -> None:
    """Enforce strict multi-tenant isolation at transaction start.
    
    When a transaction begins, sets the role to ai_app_user (if not superuser/admin)
    and executes SELECT set_config('app.current_business_id', :biz_id, true)
    so PostgreSQL Row-Level Security evaluates the tenant boundary.
    """
    biz_id = session.info.get("business_id") or tenant_context.get()
    is_admin = session.info.get("is_admin", False)

    if biz_id and not is_admin:
        role_exists = connection.execute(
            text("SELECT 1 FROM pg_roles WHERE rolname = 'ai_app_user'")
        ).scalar()
        if role_exists:
            connection.execute(text("SET ROLE ai_app_user;"))

        # PostgreSQL transaction-local setting (is_local=true)
        connection.execute(
            text("SELECT set_config('app.current_business_id', :biz_id, true);"),
            {"biz_id": str(biz_id)},
        )


async def ensure_app_role_exists(target_engine: Optional[AsyncEngine] = None) -> None:
    """Ensure the ai_app_user role exists and has table privileges."""
    eng = target_engine or engine
    async with eng.begin() as conn:
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_app_user') THEN
                        CREATE ROLE ai_app_user WITH LOGIN PASSWORD 'ai_app_user_pass' NOBYPASSRLS;
                    END IF;
                    GRANT USAGE ON SCHEMA public TO ai_app_user;
                    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_app_user;
                    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_app_user;
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ai_app_user;
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ai_app_user;
                END $$;
                """
            )
        )


async def verify_force_row_level_security(
    session_or_conn: Union[AsyncSession, AsyncConnection, AsyncEngine, None] = None
) -> Dict[str, bool]:
    """Verify FORCE ROW LEVEL SECURITY is active on all 24 tenant tables.
    
    Queries pg_class for all canonical tenant tables and asserts that both
    relrowsecurity (ENABLE RLS) and relforcerowsecurity (FORCE RLS) are True.
    Raises RuntimeError if any tenant table lacks FORCE ROW LEVEL SECURITY.
    """
    query = text(
        """
        SELECT relname, relrowsecurity, relforcerowsecurity
        FROM pg_class
        WHERE relname = ANY(:tables)
          AND relnamespace = 'public'::regnamespace;
        """
    )

    rows = []
    if isinstance(session_or_conn, AsyncSession):
        result = await session_or_conn.execute(query, {"tables": TENANT_TABLES})
        rows = result.fetchall()
    elif isinstance(session_or_conn, AsyncConnection):
        result = await session_or_conn.execute(query, {"tables": TENANT_TABLES})
        rows = result.fetchall()
    else:
        eng = session_or_conn or engine
        async with eng.connect() as conn:
            result = await conn.execute(query, {"tables": TENANT_TABLES})
            rows = result.fetchall()

    table_rls_map = {r[0]: (r[1], r[2]) for r in rows}
    missing_tables = [tbl for tbl in TENANT_TABLES if tbl not in table_rls_map]
    unsecured_tables = [
        tbl
        for tbl, (rls, force_rls) in table_rls_map.items()
        if not (rls and force_rls)
    ]

    if missing_tables:
        raise RuntimeError(f"Missing tenant tables in public schema: {missing_tables}")
    if unsecured_tables:
        raise RuntimeError(
            f"FORCE ROW LEVEL SECURITY is NOT active on tables: {unsecured_tables}"
        )

    return {tbl: True for tbl in TENANT_TABLES}


@asynccontextmanager
async def tenant_session(
    business_id: Optional[Union[uuid.UUID, str]] = None,
    is_admin: bool = False,
) -> AsyncGenerator[AsyncSession, None]:
    """Async context manager providing a session bound to a tenant or admin context.
    
    Explicitly executes SELECT set_config('app.current_business_id', :biz_id, true)
    at transaction start.
    """
    biz_str = str(business_id) if business_id else None
    token = tenant_context.set(biz_str)

    async with AsyncSessionLocal() as session:
        session.info["business_id"] = biz_str
        session.info["is_admin"] = is_admin

        if biz_str and not is_admin:
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
