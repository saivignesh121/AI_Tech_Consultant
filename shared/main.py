from __future__ import annotations
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import create_async_engine
from feature_1_workspace.models import Base
from feature_1_workspace.auth_router import router as auth_router
from feature_2_knowledge_brain.router import router as knowledge_router
from feature_3_chat.router import router as chat_router
from feature_4_eval_lab.router import router as eval_router
from feature_5_self_improve.router import router as self_improve_router
from feature_6_go_live.router import router as go_live_router
import feature_1_workspace.models, feature_2_knowledge_brain.models, feature_3_chat.models, feature_4_eval_lab.models, feature_5_self_improve.models, feature_6_go_live.models
_db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/ai_tech_consultant").replace("postgresql://", "postgresql+asyncpg://", 1)
engine = create_async_engine(_db_url, echo=False, pool_pre_ping=True)
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        print(f"Lifespan notice: {exc}")
    yield
    await engine.dispose()
app = FastAPI(title="AI Tech Consultant SaaS", version="1.0.0", lifespan=lifespan)
for r in [auth_router, knowledge_router, chat_router, eval_router, self_improve_router, go_live_router]:
    app.include_router(r)
for m in ["feature_1_workspace.connections_router", "feature_1_workspace.prompts_router", "feature_1_workspace.roles_router", "feature_1_workspace.logs_router"]:
    try:
        app.include_router(__import__(m, fromlist=["router"]).router)
    except ImportError:
        pass
@app.get("/")
async def root():
    return RedirectResponse(url="/auth/login")
@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/login")
async def login_alias():
    return RedirectResponse(url="/auth/login")

@app.get("/signup")
async def signup_alias():
    return RedirectResponse(url="/auth/signup")

@app.get("/dashboard")
async def dashboard_alias():
    return RedirectResponse(url="/go-live")

@app.get("/eval-lab")
async def eval_lab_alias():
    return RedirectResponse(url="/evals")

@app.api_route("/logout", methods=["GET", "POST"])
async def logout_route():
    resp = RedirectResponse(url="/auth/login", status_code=303)
    resp.delete_cookie("session")
    return resp

@app.get("/settings/business", response_class=HTMLResponse)
async def business_settings_page(request: Request):
    from feature_1_workspace.auth import get_session_from_request
    sess = get_session_from_request(request) or {}
    email = sess.get("email", "founder@company.com")
    return f"""<!DOCTYPE html>
<html>
<head><title>Workspace Settings — AI Tech Consultant</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-white min-h-screen p-8">
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div>
        <h1 class="text-2xl font-bold">Workspace & Tenant Settings</h1>
        <p class="text-sm text-slate-400">PostgreSQL 18 Row-Level Security (RLS) Active</p>
      </div>
      <a href="/go-live" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">Back to Dashboard</a>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div><span class="text-xs uppercase text-slate-400">Owner Account</span><p class="font-medium">{email}</p></div>
      <div><span class="text-xs uppercase text-slate-400">Tenant Isolation</span><p class="text-emerald-400 text-sm font-semibold">Enforced via app.current_business_id</p></div>
      <div><span class="text-xs uppercase text-slate-400">Autonomous Readiness Threshold</span><p class="text-sm">85.0%</p></div>
    </div>
  </div>
</body>
</html>"""
