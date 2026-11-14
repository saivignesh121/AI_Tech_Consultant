"""Business Logic Services for Workspace Management, Multi-Tenant Auth, and Cascading Deletion."""

import logging
from pathlib import Path
import re
import shutil
from typing import Any, Dict, List, Optional, Tuple, Union
import uuid

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import hash_password, verify_password
from feature_1_workspace.models import (
    AgentRole,
    Business,
    KnowledgeChunk,
    OnboardingStatus,
    User,
)

logger = logging.getLogger(__name__)

# Base directories where tenant files may be saved
LOCAL_TENANT_STORAGE_ROOTS = [
    Path("uploads"),
    Path("screenshots"),
    Path("data/uploads"),
    Path("data/screenshots"),
]


def generate_unique_slug(name: str) -> str:
    """Generate a clean, URL-safe workspace slug from a business name."""
    clean = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    if not clean:
        clean = "workspace"
    return clean[:80]


async def signup_tenant(
    full_name: str,
    email: str,
    password: str,
    business_name: str,
    domain: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> Tuple[User, Business]:
    """Create a new Business tenant, Owner User, Onboarding status, and Default Agent Role."""
    email_clean = email.strip().lower()

    # 1. Check if user already exists
    existing_user_res = await db.execute(
        select(User).where(func.lower(User.email) == email_clean)
    )
    if existing_user_res.scalar_one_or_none():
        raise ValueError(f"An account with email '{email_clean}' already exists.")

    # 2. Generate unique slug
    base_slug = generate_unique_slug(business_name)
    slug = base_slug
    attempt = 1
    while True:
        existing_biz = await db.execute(select(Business).where(Business.slug == slug))
        if not existing_biz.scalar_one_or_none():
            break
        slug = f"{base_slug}-{attempt}"
        attempt += 1

    # 3. Create Business
    business = Business(
        name=business_name.strip(),
        slug=slug,
        domain=domain.strip() if domain else None,
        support_email=email_clean,
        timezone="UTC",
        autonomous_mode=False,
    )
    db.add(business)
    await db.flush()
    await db.execute(
        text("SELECT set_config('app.current_business_id', :bid, true)"),
        {"bid": str(business.id)},
    )

    # 4. Create User (Owner)
    hashed_pwd = hash_password(password)
    user = User(
        business_id=business.id,
        email=email_clean,
        hashed_password=hashed_pwd,
        full_name=full_name.strip(),
        role="owner",
        is_active=True,
    )
    db.add(user)

    # 5. Create Onboarding Status (Step 1)
    onboarding = OnboardingStatus(
        business_id=business.id,
        current_step=1,
        step_1_business_profile=True,
    )
    db.add(onboarding)

    # 6. Create Default Agent Role
    default_role = AgentRole(
        business_id=business.id,
        name="Support Engineer",
        slug="support-engineer",
        description="Autonomous AI technical consultant for enterprise troubleshooting.",
        system_prompt=(
            "You are an expert AI technical consultant. Answer inquiries accurately, "
            "cite relevant technical documentation, and escalate when requested."
        ),
        tone="technical",
        verbosity=3,
        technical_depth=3,
        politeness=3,
        is_default=True,
        is_active=True,
    )
    db.add(default_role)

    await db.flush()
    await db.commit()
    await db.refresh(user)
    await db.refresh(business)

    return user, business


async def authenticate_user(
    email: str,
    password: str,
    db: AsyncSession,
) -> Optional[Tuple[User, Business]]:
    """Authenticate user credentials in an admin session, returning (User, Business)."""
    email_clean = email.strip().lower()

    # Query without tenant RLS scoping
    res = await db.execute(
        select(User, Business)
        .join(Business, User.business_id == Business.id)
        .where(func.lower(User.email) == email_clean)
    )
    row = res.first()
    if not row:
        return None

    user, business = row
    if not user.is_active:
        return None

    if not verify_password(password, user.hashed_password or ""):
        return None

    return user, business


async def get_or_create_demo_account(db: AsyncSession) -> Tuple[User, Business]:
    """Retrieve or automatically initialize a 1-click Demo Workspace & Operator."""
    demo_slug = "demo-workspace"
    demo_email = "demo@acme.example.com"

    # Check if demo business exists
    res = await db.execute(
        select(User, Business)
        .join(Business, User.business_id == Business.id)
        .where(Business.slug == demo_slug)
    )
    row = res.first()
    if row:
        return row[0], row[1]

    # Initialize complete demo tenant
    business = Business(
        name="Acme Cloud Demo",
        slug=demo_slug,
        domain="demo.acme.corp",
        support_email=demo_email,
        timezone="UTC",
        industry="SaaS & Cloud Platforms",
        autonomous_mode=False,
    )
    db.add(business)
    await db.flush()

    user = User(
        business_id=business.id,
        email=demo_email,
        hashed_password=hash_password("DemoPassword123!"),
        full_name="Demo Operator",
        role="owner",
        is_active=True,
    )
    db.add(user)

    onboarding = OnboardingStatus(
        business_id=business.id,
        current_step=1,
        step_1_business_profile=True,
    )
    db.add(onboarding)

    default_role = AgentRole(
        business_id=business.id,
        name="Tier 2 Technical Support",
        slug="support-engineer",
        description="Demo AI Technical Consultant persona.",
        system_prompt="You are a senior support engineer helping enterprise customers solve technical challenges.",
        tone="technical",
        verbosity=3,
        technical_depth=3,
        politeness=3,
        is_default=True,
        is_active=True,
    )
    db.add(default_role)

    await db.flush()
    await db.commit()
    await db.refresh(user)
    await db.refresh(business)

    return user, business


async def update_business_settings(
    business_id: Union[uuid.UUID, str],
    updates: Dict[str, Any],
    db: AsyncSession,
) -> Business:
    """Update business metadata in the database."""
    biz_uuid = uuid.UUID(str(business_id))
    res = await db.execute(select(Business).where(Business.id == biz_uuid))
    biz = res.scalar_one_or_none()
    if not biz:
        raise ValueError(f"Business '{business_id}' not found.")

    allowed_fields = {
        "name",
        "domain",
        "support_email",
        "timezone",
        "industry",
        "autonomous_mode",
        "readiness_threshold",
    }
    for field, val in updates.items():
        if field in allowed_fields and val is not None:
            setattr(biz, field, val)

    await db.flush()
    await db.commit()
    await db.refresh(biz)
    return biz


def delete_local_tenant_files(business_id: Union[uuid.UUID, str]) -> List[str]:
    """Purge all local uploaded and screenshot files for a business from disk."""
    biz_str = str(business_id)
    deleted_paths: List[str] = []

    for root in LOCAL_TENANT_STORAGE_ROOTS:
        target_dir = root / biz_str
        if target_dir.exists():
            try:
                if target_dir.is_dir():
                    shutil.rmtree(target_dir, ignore_errors=True)
                else:
                    target_dir.unlink(missing_ok=True)
                deleted_paths.append(str(target_dir))
                logger.info(f"Purged local storage directory: {target_dir}")
            except Exception as exc:
                logger.warning(f"Error purging local directory {target_dir}: {exc}")

    return deleted_paths


async def delete_business_and_all_data(
    business_id: Union[uuid.UUID, str],
    admin_db: AsyncSession,
) -> Dict[str, Any]:
    """Cascading Business Deletion.
    
    1. Removes the business row from PostgreSQL `businesses`, which automatically
       cascades across all 24 child tables (including `knowledge_chunks` vector embeddings).
    2. Deletes all local uploaded and screenshot files in `uploads/{biz_id}` and `screenshots/{biz_id}`.
    """
    biz_uuid = uuid.UUID(str(business_id))

    # 1. Fetch business row to confirm existence and slug
    res = await admin_db.execute(select(Business).where(Business.id == biz_uuid))
    business = res.scalar_one_or_none()
    if not business:
        raise ValueError(f"Business '{business_id}' not found.")

    biz_slug = business.slug
    biz_name = business.name

    # 2. Execute deletion of the Business tenant
    # ON DELETE CASCADE automatically cascades to:
    # users, connections, onboarding_status, agent_roles, prompt_versions,
    # model_call_logs, failed_jobs, sitemaps, knowledge_pages, sitemap_urls,
    # page_versions, knowledge_chunks (pgvector embeddings), instructions,
    # skills, skill_versions, email_threads, email_messages, email_notes,
    # chats, chat_messages, lessons, eval_runs, eval_results, self_improve_runs
    await admin_db.execute(delete(Business).where(Business.id == biz_uuid))
    await admin_db.commit()

    # 3. Purge all local uploaded and screenshot files for this tenant
    purged_files = delete_local_tenant_files(biz_uuid)

    logger.info(
        f"Cascading deletion complete for Business {biz_name} ({biz_slug}). Purged files: {purged_files}"
    )

    return {
        "status": "success",
        "business_id": str(biz_uuid),
        "slug": biz_slug,
        "name": biz_name,
        "purged_directories": purged_files,
    }
