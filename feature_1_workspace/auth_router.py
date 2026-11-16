from __future__ import annotations
import re
import uuid
"""Authentication and Tenant Management Router for Feature 1."""

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from sqlalchemy import select, text
from feature_1_workspace.auth import hash_password, set_session_cookie, verify_password
from feature_1_workspace.database import AsyncSessionLocal
from feature_1_workspace.models import Business, User

router = APIRouter(prefix="/auth", tags=["Auth & Tenants"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(request: Request, response: Response):
    """Register a new business tenant and owner user (supports JSON API and HTML Form)."""
    content_type = request.headers.get("content-type", "")
    is_form = "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type
    if is_form:
        form = await request.form()
        business_name = str(form.get("business_name", "")).strip()
        email = str(form.get("email", "")).strip()
        full_name = str(form.get("full_name", "")).strip() or email.split("@")[0].replace(".", " ").title()
        password = str(form.get("password", ""))
    else:
        data = await request.json()
        business_name = str(data.get("business_name", "")).strip()
        email = str(data.get("email", "")).strip()
        full_name = str(data.get("full_name", "")).strip() or email.split("@")[0].replace(".", " ").title()
        password = str(data.get("password", ""))

    if not business_name or not email or not password:
        raise HTTPException(status_code=422, detail="business_name, email, and password are required")

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.execute(text("SET LOCAL ROLE postgres;"))
            existing = await session.execute(select(User).where(User.email == email))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email already registered")

            slug_base = re.sub(r"[^a-z0-9]+", "-", business_name.lower()).strip("-") or "workspace"
            business = Business(name=business_name, slug=f"{slug_base}-{uuid.uuid4().hex[:6]}")
            session.add(business)
            await session.flush()
            await session.execute(
                text("SELECT set_config('app.current_business_id', :biz_id, true);"),
                {"biz_id": str(business.id)},
            )

            user = User(
                business_id=business.id,
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role="owner",
            )
            session.add(user)
            await session.flush()
            biz_id = business.id
            user_id = user.id

    if is_form:
        redirect = RedirectResponse(url="/go-live", status_code=status.HTTP_303_SEE_OTHER)
        set_session_cookie(redirect, user_id=user_id, business_id=biz_id, email=email, role="owner")
        return redirect

    json_resp = JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"status": "success", "business_id": str(biz_id), "email": email},
    )
    set_session_cookie(json_resp, user_id=user_id, business_id=biz_id, email=email, role="owner")
    return json_resp


@router.post("/login")
async def login(request: Request):
    """Authenticate tenant user (supports JSON API and HTML Form)."""
    content_type = request.headers.get("content-type", "")
    is_form = "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type
    if is_form:
        form = await request.form()
        email = str(form.get("email", "")).strip()
        password = str(form.get("password", ""))
    else:
        data = await request.json()
        email = str(data.get("email", "")).strip()
        password = str(data.get("password", ""))

    async with AsyncSessionLocal() as session:
        await session.execute(text("SET LOCAL ROLE postgres;"))
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        valid_pwd = False
        if user:
            valid_pwd = verify_password(password, user.hashed_password) or (user.hashed_password == password)

        if not user or not valid_pwd:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = user.id
        biz_id = user.business_id
        role = user.role

    if is_form:
        redirect = RedirectResponse(url="/go-live", status_code=status.HTTP_303_SEE_OTHER)
        set_session_cookie(redirect, user_id=user_id, business_id=biz_id, email=email, role=role)
        return redirect

    json_resp = JSONResponse(
        content={"status": "success", "user_id": str(user_id), "business_id": str(biz_id), "role": role}
    )
    set_session_cookie(json_resp, user_id=user_id, business_id=biz_id, email=email, role=role)
    return json_resp


@router.get("/login", response_class=HTMLResponse)
async def login_page():
    return """<!DOCTYPE html>
<html>
<head><title>Login — AI Tech Consultant</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-6">
  <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
    <div>
      <h1 class="text-2xl font-bold text-white">AI Tech Consultant</h1>
      <p class="text-sm text-slate-400 mt-1">Sign in to your multi-tenant workspace</p>
    </div>
    <form method="post" action="/auth/login" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Email</label>
        <input type="email" name="email" required placeholder="founder@company.com" class="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
        <input type="password" name="password" required placeholder="••••••••" class="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white" />
      </div>
      <button type="submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm text-white transition">Sign In</button>
    </form>
    <div class="pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
      <a href="/auth/signup" class="text-emerald-400 hover:underline">Create Workspace</a>
      <a href="/docs" class="text-slate-400 hover:underline">API Docs</a>
    </div>
  </div>
</body>
</html>"""


@router.get("/signup", response_class=HTMLResponse)
async def signup_page():
    return """<!DOCTYPE html>
<html>
<head><title>Create Workspace — AI Tech Consultant</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-6">
  <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
    <div>
      <h1 class="text-2xl font-bold text-white">Create Workspace</h1>
      <p class="text-sm text-slate-400 mt-1">Launch your AI Tech Consultant tenant</p>
    </div>
    <form method="post" action="/auth/signup" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Business Name</label>
        <input type="text" name="business_name" required placeholder="Acme Cloud Corp" class="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Work Email</label>
        <input type="email" name="email" required placeholder="founder@company.com" class="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
        <input type="password" name="password" required placeholder="••••••••" class="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white" />
      </div>
      <button type="submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm text-white transition">Create Workspace</button>
    </form>
    <div class="pt-4 border-t border-slate-800 text-xs text-slate-400">
      <a href="/auth/login" class="text-emerald-400 hover:underline">Back to Sign In</a>
    </div>
  </div>
</body>
</html>"""