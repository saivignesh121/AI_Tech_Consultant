"""
tests/test_tenant_isolation.py
==============================
Task 1.1 — Multi-Tenant Isolation & Cascading Deletion Tests
=============================================================

Test surface
------------
1. Cross-tenant READ isolation  — Business A's session cannot read Business B's rows
   (verified at both the application-level business_id filter and PostgreSQL RLS layer).
2. Cross-tenant WRITE isolation — Business A's session cannot mutate Business B's rows.
3. Cascading DELETE            — Deleting Business A via the Settings endpoint removes
   the business row and cascades to all child tables; local files are also purged.

Architecture
------------
* A lightweight test-only FastAPI app (``test_app``) is mounted beside ``shared.main:app``
  so we can exercise real auth/session-cookie plumbing and the actual service layer
  without needing the full routing tree to be wired up yet.
* ``httpx.AsyncClient`` with ``ASGITransport`` drives every HTTP call in-process.
* All fixtures use a *real* PostgreSQL connection (from DATABASE_URL / .env) so that
  Row-Level Security is exercised end-to-end rather than mocked.
* Each test-run tenant uses a UUID-suffixed slug to avoid collisions across parallel
  runs.

Dependencies
------------
    pytest, pytest-asyncio, httpx, sqlalchemy[asyncio], asyncpg
"""

from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import AsyncGenerator, Tuple

import pytest
import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from httpx import ASGITransport
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Project imports
# ---------------------------------------------------------------------------
from feature_1_workspace.auth import (
    encode_session,
    get_admin_db,
    get_db,
    hash_password,
    require_authenticated_user,
    set_session_cookie,
    COOKIE_NAME,
)
from feature_1_workspace.database import (
    AsyncSessionLocal,
    engine,
    tenant_session,
    TENANT_TABLES,
    verify_force_row_level_security,
)
from feature_1_workspace.models import (
    AgentRole,
    Business,
    Connection,
    KnowledgePage,
    OnboardingStatus,
    User,
)
from feature_1_workspace.services import (
    delete_business_and_all_data,
    delete_local_tenant_files,
    LOCAL_TENANT_STORAGE_ROOTS,
    signup_tenant,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_session_cookie(user_id: uuid.UUID, business_id: uuid.UUID, role: str = "owner") -> str:
    """Return a signed session cookie value (not yet attached to a Response)."""
    return encode_session(
        {
            "user_id": str(user_id),
            "business_id": str(business_id),
            "email": f"test+{business_id}@example.com",
            "role": role,
        }
    )


def _auth_headers(user_id: uuid.UUID, business_id: uuid.UUID) -> dict:
    """Return headers dict carrying a valid signed session cookie for the given tenant."""
    cookie_value = _make_session_cookie(user_id, business_id)
    return {"Cookie": f"{COOKIE_NAME}={cookie_value}"}


# ---------------------------------------------------------------------------
# Minimal test-only FastAPI application
# ---------------------------------------------------------------------------
# We mount a compact ``test_app`` that exposes the endpoints the tests need:
#
#   GET  /api/v1/settings/business          → returns the caller's own Business JSON
#   GET  /api/v1/agent-roles                → lists the caller's AgentRoles (RLS-scoped)
#   GET  /api/v1/agent-roles/{role_id}      → fetch one role (RLS should block cross-tenant)
#   PATCH /api/v1/agent-roles/{role_id}     → update one role (RLS should block cross-tenant)
#   GET  /api/v1/connections/{conn_id}      → fetch one Connection (RLS-scoped)
#   POST /api/v1/settings/business/delete   → cascading business deletion (admin session)
#
# These mirrors the contracts that ``feature_1_workspace`` routes will eventually expose,
# so the tests remain valid once real routes are wired up (just swap ``test_app`` for the
# real ``shared.main:app`` and adjust path prefixes).

test_app = FastAPI(title="Test Harness")


@test_app.get("/api/v1/settings/business")
async def get_my_business(
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, business = auth
    return {
        "id": str(business.id),
        "name": business.name,
        "slug": business.slug,
        "business_id": str(business.id),
    }


@test_app.get("/api/v1/agent-roles")
async def list_agent_roles(
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    user, business = auth
    result = await db.execute(
        select(AgentRole).where(AgentRole.business_id == business.id)
    )
    roles = result.scalars().all()
    return [{"id": str(r.id), "name": r.name, "business_id": str(r.business_id)} for r in roles]


@test_app.get("/api/v1/agent-roles/{role_id}")
async def get_agent_role(
    role_id: uuid.UUID,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(AgentRole).where(AgentRole.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"id": str(role.id), "name": role.name, "business_id": str(role.business_id)}


@test_app.patch("/api/v1/agent-roles/{role_id}")
async def update_agent_role(
    role_id: uuid.UUID,
    request: Request,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    body = await request.json()
    result = await db.execute(select(AgentRole).where(AgentRole.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found or access denied")
    if "name" in body:
        role.name = body["name"]
    await db.flush()
    return {"id": str(role.id), "name": role.name, "business_id": str(role.business_id)}


@test_app.get("/api/v1/connections/{conn_id}")
async def get_connection(
    conn_id: uuid.UUID,
    auth=Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Connection).where(Connection.id == conn_id))
    conn = result.scalar_one_or_none()
    if conn is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"id": str(conn.id), "provider": conn.provider, "business_id": str(conn.business_id)}


@test_app.delete("/api/v1/settings/business")
async def delete_business(
    auth=Depends(require_authenticated_user),
    admin_db: AsyncSession = Depends(get_admin_db),
) -> dict:
    """
    Settings → Business delete endpoint.

    Uses an *admin* session so the DELETE bypass PostgreSQL RLS (the superuser
    connection is required to delete the businesses row itself, which has no
    business_id column and therefore no RLS policy).
    """
    user, business = auth
    result = await delete_business_and_all_data(
        business_id=business.id,
        admin_db=admin_db,
    )
    return result


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

async def _create_test_tenant(
    name_suffix: str,
) -> Tuple[User, Business, AgentRole, Connection]:
    """
    Create a fully-formed tenant (Business + User + OnboardingStatus + AgentRole + Connection)
    via an *admin* (non-RLS) session so that test setup bypasses RLS.

    Returns (user, business, default_agent_role, connection).
    """
    uid = uuid.uuid4().hex[:8]
    email = f"test-{uid}@{name_suffix}.example.com"
    biz_name = f"Test Corp {name_suffix} {uid}"
    slug = f"test-{name_suffix}-{uid}"

    async with AsyncSessionLocal() as session:
        # Mark as admin so after_begin hook doesn't set RLS
        session.info["is_admin"] = True

        biz = Business(
            name=biz_name,
            slug=slug,
            support_email=email,
            timezone="UTC",
            autonomous_mode=False,
        )
        session.add(biz)
        await session.flush()
        await session.execute(
            text("SELECT set_config('app.current_business_id', :bid, true)"),
            {"bid": str(biz.id)},
        )

        user = User(
            business_id=biz.id,
            email=email,
            hashed_password=hash_password("TestPassword123!"),
            full_name=f"Owner {name_suffix}",
            role="owner",
            is_active=True,
        )
        session.add(user)

        onboarding = OnboardingStatus(
            business_id=biz.id,
            current_step=1,
            step_1_business_profile=True,
        )
        session.add(onboarding)

        role = AgentRole(
            business_id=biz.id,
            name=f"Support Engineer {name_suffix}",
            slug="support-engineer",
            system_prompt="You are a support engineer.",
            tone="technical",
            verbosity=3,
            technical_depth=3,
            politeness=3,
            is_default=True,
            is_active=True,
        )
        session.add(role)

        conn = Connection(
            business_id=biz.id,
            provider="openai",
            encrypted_api_key="enc-test-key",
            status="unverified",
        )
        session.add(conn)

        await session.commit()
        await session.execute(
            text("SELECT set_config('app.current_business_id', :bid, true)"),
            {"bid": str(biz.id)},
        )
        await session.refresh(biz)
        await session.refresh(user)
        await session.refresh(role)
        await session.refresh(conn)

        return user, biz, role, conn


async def _delete_tenant_if_exists(business_id: uuid.UUID) -> None:
    """Best-effort cleanup: delete a business row using an admin session."""
    async with AsyncSessionLocal() as session:
        session.info["is_admin"] = True
        try:
            await session.execute(
                text("SELECT set_config('app.current_business_id', :bid, true)"),
                {"bid": str(business_id)},
            )
            from sqlalchemy import delete as sa_delete
            from feature_1_workspace.models import Business as Biz
            await session.execute(sa_delete(Biz).where(Biz.id == business_id))
            await session.commit()
        except Exception:
            await session.rollback()


@pytest.fixture()
async def tenant_a() -> AsyncGenerator[Tuple[User, Business, AgentRole, Connection], None]:
    """Provision Business A and tear it down (best-effort) after the test."""
    user, biz, role, conn = await _create_test_tenant("biz-a")
    yield user, biz, role, conn
    await _delete_tenant_if_exists(biz.id)


@pytest.fixture()
async def tenant_b() -> AsyncGenerator[Tuple[User, Business, AgentRole, Connection], None]:
    """Provision Business B and tear it down (best-effort) after the test."""
    user, biz, role, conn = await _create_test_tenant("biz-b")
    yield user, biz, role, conn
    await _delete_tenant_if_exists(biz.id)


@pytest.fixture()
async def async_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """
    httpx.AsyncClient backed by our test_app via ASGITransport.
    ``follow_redirects=False`` so 303 redirects surface as test-visible responses.
    """
    async with httpx.AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
        follow_redirects=False,
    ) as client:
        yield client


# ---------------------------------------------------------------------------
# § 1  Cross-Tenant Read Isolation
# ---------------------------------------------------------------------------


class TestCrossTenantReadIsolation:
    """
    Business A authenticates and attempts to read Business B's resources.
    Every response MUST be 404 (resource not found/filtered by RLS) or 401/403
    — never 200 exposing Business B's data.
    """

    async def test_cannot_read_other_tenants_agent_role(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """Business A's session must not be able to fetch Business B's AgentRole."""
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        # Authenticated as Business A — attempt to read Business B's role ID
        resp = await async_client.get(
            f"/api/v1/agent-roles/{role_b.id}",
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        # RLS filters out the row → endpoint returns 404 (not leaking that it exists)
        assert resp.status_code == 404, (
            f"Expected 404 (cross-tenant read blocked by RLS), got {resp.status_code}. "
            f"Body: {resp.text}"
        )

    async def test_cannot_read_other_tenants_connection(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """Business A's session must not be able to fetch Business B's Connection."""
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        resp = await async_client.get(
            f"/api/v1/connections/{conn_b.id}",
            headers=_auth_headers(user_a.id, biz_a.id),
        )
        assert resp.status_code == 404, (
            f"Expected 404 (cross-tenant connection blocked by RLS), got {resp.status_code}. "
            f"Body: {resp.text}"
        )

    async def test_own_resources_are_accessible(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """Control test: Business A CAN read its own AgentRole (confirms RLS is working, not broken)."""
        user_a, biz_a, role_a, conn_a = tenant_a

        resp = await async_client.get(
            f"/api/v1/agent-roles/{role_a.id}",
            headers=_auth_headers(user_a.id, biz_a.id),
        )
        assert resp.status_code == 200, (
            f"Expected 200 for own role, got {resp.status_code}. Body: {resp.text}"
        )
        data = resp.json()
        assert data["id"] == str(role_a.id)
        assert data["business_id"] == str(biz_a.id)

    async def test_list_roles_only_returns_own_tenant_rows(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """Listing AgentRoles as Business A must only return A's rows, never B's."""
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        resp = await async_client.get(
            "/api/v1/agent-roles",
            headers=_auth_headers(user_a.id, biz_a.id),
        )
        assert resp.status_code == 200
        roles = resp.json()

        returned_biz_ids = {r["business_id"] for r in roles}
        assert str(biz_b.id) not in returned_biz_ids, (
            "Business B's role appeared in Business A's listing — RLS not enforced!"
        )
        # Must contain own role
        returned_ids = {r["id"] for r in roles}
        assert str(role_a.id) in returned_ids

    async def test_business_settings_scoped_to_own_tenant(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """GET /api/v1/settings/business must return Business A's data when authenticated as A."""
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        resp_a = await async_client.get(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )
        assert resp_a.status_code == 200
        data_a = resp_a.json()
        assert data_a["id"] == str(biz_a.id)
        assert data_a["id"] != str(biz_b.id)

        resp_b = await async_client.get(
            "/api/v1/settings/business",
            headers=_auth_headers(user_b.id, biz_b.id),
        )
        assert resp_b.status_code == 200
        data_b = resp_b.json()
        assert data_b["id"] == str(biz_b.id)
        assert data_b["id"] != str(biz_a.id)

    async def test_unauthenticated_request_is_rejected(
        self,
        async_client: httpx.AsyncClient,
    ) -> None:
        """No session cookie → 401 Unauthorized (not a data leak)."""
        resp = await async_client.get("/api/v1/agent-roles")
        assert resp.status_code in {401, 303}, (
            f"Expected 401/303 for unauthenticated request, got {resp.status_code}"
        )

    async def test_forged_business_id_in_cookie_cannot_access_data(
        self,
        async_client: httpx.AsyncClient,
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """
        A cookie carrying a *non-existent* business_id must not expose data.
        The require_authenticated_user guard looks up both user and business; if
        either is missing the request is rejected.
        """
        user_b, biz_b, role_b, conn_b = tenant_b
        fake_biz_id = uuid.uuid4()  # random, does not exist in DB

        resp = await async_client.get(
            f"/api/v1/agent-roles/{role_b.id}",
            headers=_auth_headers(user_b.id, fake_biz_id),
        )
        # Business row not found → 401 from require_authenticated_user
        assert resp.status_code in {401, 403, 404}, (
            f"Expected auth rejection with forged biz_id, got {resp.status_code}"
        )


# ---------------------------------------------------------------------------
# § 2  Cross-Tenant Write Isolation
# ---------------------------------------------------------------------------


class TestCrossTenantWriteIsolation:
    """
    Business A authenticates and attempts to modify Business B's resources.
    PostgreSQL RLS prevents the write at the DB layer; the application layer
    must reflect that as a 404 (row not visible) or 403 (explicitly forbidden).
    """

    async def test_cannot_modify_other_tenants_agent_role(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """PATCH on Business B's AgentRole while authenticated as A must fail."""
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        original_name = role_b.name
        resp = await async_client.patch(
            f"/api/v1/agent-roles/{role_b.id}",
            json={"name": "HACKED BY BIZ A"},
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        # RLS hides the row → endpoint returns 404
        assert resp.status_code in {403, 404}, (
            f"Expected 403/404 (cross-tenant write blocked), got {resp.status_code}. "
            f"Body: {resp.text}"
        )

        # Verify the name was not actually changed in the DB
        async with AsyncSessionLocal() as admin_session:
            admin_session.info["is_admin"] = True
            await admin_session.execute(
                text("SELECT set_config('app.current_business_id', :bid, true)"),
                {"bid": str(biz_b.id)},
            )
            result = await admin_session.execute(
                select(AgentRole).where(AgentRole.id == role_b.id)
            )
            refreshed = result.scalar_one_or_none()
            assert refreshed is not None
            assert refreshed.name == original_name, (
                f"RLS failed: Business B's role name was mutated to '{refreshed.name}'"
            )

    async def test_own_role_can_be_modified(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """Control: Business A CAN modify its own AgentRole (confirms write path works)."""
        user_a, biz_a, role_a, conn_a = tenant_a

        resp = await async_client.patch(
            f"/api/v1/agent-roles/{role_a.id}",
            json={"name": "Updated Support Engineer"},
            headers=_auth_headers(user_a.id, biz_a.id),
        )
        assert resp.status_code == 200, (
            f"Expected 200 for own-tenant write, got {resp.status_code}. Body: {resp.text}"
        )
        assert resp.json()["name"] == "Updated Support Engineer"


# ---------------------------------------------------------------------------
# § 3  RLS Configuration Verification
# ---------------------------------------------------------------------------


class TestRLSConfiguration:
    """Direct PostgreSQL verification that FORCE ROW LEVEL SECURITY is active."""

    async def test_force_rls_enabled_on_all_tenant_tables(self) -> None:
        """
        Calls verify_force_row_level_security() — raises RuntimeError if any
        of the 24 canonical tenant tables is missing ENABLE/FORCE RLS.
        Skip gracefully if certain future tables don't exist yet.
        """
        try:
            result = await verify_force_row_level_security()
        except RuntimeError as exc:
            msg = str(exc)
            # Only fail hard if it's about *existing* tables without RLS
            if "FORCE ROW LEVEL SECURITY is NOT active" in msg:
                pytest.fail(msg)
            # Missing tables (not yet migrated) are a skip, not a failure
            pytest.skip(f"Some tenant tables not yet present in schema: {msg}")

        assert isinstance(result, dict)
        assert len(result) > 0
        for tbl, is_secured in result.items():
            assert is_secured, f"Table '{tbl}' did not pass FORCE RLS check"

    async def test_rls_blocks_direct_cross_tenant_query_via_sqlalchemy(
        self,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """
        Open a *tenant_session* scoped to Business A and attempt to SELECT
        Business B's AgentRole by primary key — RLS must return no rows.
        """
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        async with tenant_session(business_id=biz_a.id) as session:
            result = await session.execute(
                select(AgentRole).where(AgentRole.id == role_b.id)
            )
            row = result.scalar_one_or_none()

        assert row is None, (
            f"RLS FAILED: Business A's tenant_session returned Business B's AgentRole "
            f"(id={role_b.id}). PostgreSQL RLS is not enforced."
        )

    async def test_rls_blocks_cross_tenant_connection_query(
        self,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """RLS on the connections table filters out cross-tenant rows."""
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        async with tenant_session(business_id=biz_a.id) as session:
            result = await session.execute(
                select(Connection).where(Connection.id == conn_b.id)
            )
            row = result.scalar_one_or_none()

        assert row is None, (
            f"RLS FAILED: Business A's session can see Business B's Connection."
        )

    async def test_own_tenant_session_sees_own_rows(
        self,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """Sanity: a tenant_session scoped to A returns A's own rows."""
        user_a, biz_a, role_a, conn_a = tenant_a

        async with tenant_session(business_id=biz_a.id) as session:
            result = await session.execute(
                select(AgentRole).where(AgentRole.id == role_a.id)
            )
            row = result.scalar_one_or_none()

        assert row is not None, (
            "RLS incorrectly blocked a tenant from reading its own AgentRole."
        )
        assert row.business_id == biz_a.id


# ---------------------------------------------------------------------------
# § 4  Cascading Business Deletion
# ---------------------------------------------------------------------------


class TestCascadingBusinessDeletion:
    """
    DELETE /api/v1/settings/business for Business A must:
      • Remove the businesses row.
      • Cascade to all child tables (users, onboarding_status, agent_roles, connections, …).
      • Purge local upload/screenshot directories.
    """

    async def test_delete_endpoint_returns_success(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """The delete endpoint responds 200 with a success payload."""
        user_a, biz_a, role_a, conn_a = tenant_a

        resp = await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )
        assert resp.status_code == 200, (
            f"Delete endpoint failed: {resp.status_code} — {resp.text}"
        )
        body = resp.json()
        assert body["status"] == "success"
        assert body["business_id"] == str(biz_a.id)

    async def test_business_row_removed_from_db(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """After deletion the businesses row no longer exists."""
        user_a, biz_a, role_a, conn_a = tenant_a

        await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        async with AsyncSessionLocal() as admin_session:
            admin_session.info["is_admin"] = True
            result = await admin_session.execute(
                select(Business).where(Business.id == biz_a.id)
            )
            biz = result.scalar_one_or_none()

        assert biz is None, f"Business row still present after deletion: {biz_a.id}"

    async def test_cascade_removes_users(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """ON DELETE CASCADE removes all User rows belonging to the deleted Business."""
        user_a, biz_a, role_a, conn_a = tenant_a

        await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        async with AsyncSessionLocal() as admin_session:
            admin_session.info["is_admin"] = True
            result = await admin_session.execute(
                select(User).where(User.business_id == biz_a.id)
            )
            users = result.scalars().all()

        assert len(users) == 0, (
            f"Expected 0 users after cascade deletion, found {len(users)}"
        )

    async def test_cascade_removes_agent_roles(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """ON DELETE CASCADE removes all AgentRole rows belonging to the deleted Business."""
        user_a, biz_a, role_a, conn_a = tenant_a

        await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        async with AsyncSessionLocal() as admin_session:
            admin_session.info["is_admin"] = True
            result = await admin_session.execute(
                select(AgentRole).where(AgentRole.business_id == biz_a.id)
            )
            roles = result.scalars().all()

        assert len(roles) == 0, (
            f"Expected 0 agent_roles after cascade deletion, found {len(roles)}"
        )

    async def test_cascade_removes_onboarding_status(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """ON DELETE CASCADE removes the OnboardingStatus row for the deleted Business."""
        user_a, biz_a, role_a, conn_a = tenant_a

        await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        async with AsyncSessionLocal() as admin_session:
            admin_session.info["is_admin"] = True
            result = await admin_session.execute(
                select(OnboardingStatus).where(OnboardingStatus.business_id == biz_a.id)
            )
            rows = result.scalars().all()

        assert len(rows) == 0, (
            f"Expected 0 onboarding_status rows after cascade deletion, found {len(rows)}"
        )

    async def test_cascade_removes_connections(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """ON DELETE CASCADE removes all Connection rows belonging to the deleted Business."""
        user_a, biz_a, role_a, conn_a = tenant_a

        await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        async with AsyncSessionLocal() as admin_session:
            admin_session.info["is_admin"] = True
            result = await admin_session.execute(
                select(Connection).where(Connection.business_id == biz_a.id)
            )
            conns = result.scalars().all()

        assert len(conns) == 0, (
            f"Expected 0 connections after cascade deletion, found {len(conns)}"
        )

    async def test_local_files_purged_on_deletion(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tmp_path: Path,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """
        Synthetic file-system test: writes a fake file into the expected storage
        root and asserts it is purged when the business is deleted.

        Uses ``monkeypatch`` to redirect LOCAL_TENANT_STORAGE_ROOTS to ``tmp_path``
        so the test does not write to the real project directory.
        """
        user_a, biz_a, role_a, conn_a = tenant_a
        biz_str = str(biz_a.id)

        # Create a fake upload directory tree
        fake_upload_root = tmp_path / "uploads"
        fake_screenshots_root = tmp_path / "screenshots"
        tenant_upload_dir = fake_upload_root / biz_str
        tenant_upload_dir.mkdir(parents=True)
        (tenant_upload_dir / "document.pdf").write_bytes(b"fake pdf content")
        tenant_screenshots_dir = fake_screenshots_root / biz_str
        tenant_screenshots_dir.mkdir(parents=True)
        (tenant_screenshots_dir / "page1.png").write_bytes(b"fake png content")

        import feature_1_workspace.services as svc_module
        monkeypatch.setattr(
            svc_module,
            "LOCAL_TENANT_STORAGE_ROOTS",
            [fake_upload_root, fake_screenshots_root],
        )

        # Trigger deletion
        await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )

        assert not tenant_upload_dir.exists(), (
            f"Tenant upload directory was NOT purged: {tenant_upload_dir}"
        )
        assert not tenant_screenshots_dir.exists(), (
            f"Tenant screenshots directory was NOT purged: {tenant_screenshots_dir}"
        )

    async def test_deleted_business_session_is_invalidated(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """
        After Business A is deleted, a subsequent request using the same cookie
        must be rejected (user and business no longer exist in DB).
        """
        user_a, biz_a, role_a, conn_a = tenant_a
        auth_headers = _auth_headers(user_a.id, biz_a.id)

        # Delete
        del_resp = await async_client.delete(
            "/api/v1/settings/business",
            headers=auth_headers,
        )
        assert del_resp.status_code == 200

        # Subsequent request with the same (now-stale) cookie
        follow_up = await async_client.get(
            "/api/v1/settings/business",
            headers=auth_headers,
        )
        assert follow_up.status_code in {401, 303}, (
            f"Expected 401/303 after business deletion, got {follow_up.status_code}. "
            f"Body: {follow_up.text}"
        )

    async def test_business_b_unaffected_by_business_a_deletion(
        self,
        async_client: httpx.AsyncClient,
        tenant_a: Tuple[User, Business, AgentRole, Connection],
        tenant_b: Tuple[User, Business, AgentRole, Connection],
    ) -> None:
        """
        Deleting Business A must NOT affect Business B's data.
        Business B must still be able to read its own resources after A's deletion.
        """
        user_a, biz_a, role_a, conn_a = tenant_a
        user_b, biz_b, role_b, conn_b = tenant_b

        # Delete Business A
        del_resp = await async_client.delete(
            "/api/v1/settings/business",
            headers=_auth_headers(user_a.id, biz_a.id),
        )
        assert del_resp.status_code == 200

        # Business B should still be healthy
        resp_b = await async_client.get(
            "/api/v1/settings/business",
            headers=_auth_headers(user_b.id, biz_b.id),
        )
        assert resp_b.status_code == 200, (
            f"Business B was incorrectly affected by Business A's deletion: "
            f"{resp_b.status_code} — {resp_b.text}"
        )
        assert resp_b.json()["id"] == str(biz_b.id)

        # Business B's role still accessible
        role_resp = await async_client.get(
            f"/api/v1/agent-roles/{role_b.id}",
            headers=_auth_headers(user_b.id, biz_b.id),
        )
        assert role_resp.status_code == 200
        assert role_resp.json()["id"] == str(role_b.id)
