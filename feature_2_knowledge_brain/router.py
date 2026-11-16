from __future__ import annotations
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from fastapi import APIRouter, Depends, Form, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from feature_1_workspace.auth import get_db, require_authenticated_user
from feature_2_knowledge_brain.models import Instruction, KnowledgePage, Sitemap

router = APIRouter(prefix="/knowledge", tags=["Knowledge Brain"])
templates = Jinja2Templates(directory=["feature_2_knowledge_brain/templates", "feature_1_workspace/templates"])


def _discover_urls(target_url: str) -> list[tuple[str, str]]:
    url = target_url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    candidates = [url] if url.endswith(".xml") else [url.rstrip("/") + "/sitemap.xml", url]
    headers = {"User-Agent": "Mozilla/5.0 (AI-Tech-Consultant-Crawler/1.0)"}

    for candidate in candidates:
        try:
            req = urllib.request.Request(candidate, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as resp:
                body = resp.read().decode("utf-8", errors="ignore")
                if "<urlset" in body or "<sitemapindex" in body:
                    root = ET.fromstring(body)
                    locs = [el.text.strip() for el in root.iter() if el.tag.endswith("loc") and el.text]
                    if locs:
                        results = []
                        seen_norms = set()
                        for u in locs:
                            norm = u.lower().rstrip("/")
                            if norm not in seen_norms:
                                seen_norms.add(norm)
                                title = u.rstrip("/").split("/")[-1].replace("-", " ").title() or "Home"
                                results.append((u, title))
                            if len(results) >= 25:
                                break
                        return results
                else:
                    title_m = re.search(r"<title[^>]*>(.*?)</title>", body, re.I | re.S)
                    page_title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else url
                    hrefs = re.findall(r'href=["\'](https?://[^"\'#]+|/[^"\'#]*)["\']', body, re.I)
                    base = url.rstrip("/")
                    found = [(url, page_title)]
                    seen = {url.lower().rstrip("/")}
                    for h in hrefs:
                        full = h if h.startswith("http") else base + ("/" if not h.startswith("/") else "") + h
                        norm = full.lower().rstrip("/")
                        if full.startswith(base) and norm not in seen and not any(full.lower().endswith(ext) for ext in (".png", ".jpg", ".css", ".js", ".svg", ".ico")):
                            seen.add(norm)
                            slug = full.rstrip("/").split("/")[-1].replace("-", " ").title() or "Overview"
                            found.append((full, slug))
                        if len(found) >= 15:
                            break
                    return found
        except Exception:
            continue

    return [(url, url.rstrip("/").split("/")[-1].replace("-", " ").title() or "Indexed Page")]


@router.get("", response_class=HTMLResponse)
async def knowledge_index(
    request: Request,
    tab: str = Query("sitemaps"),
    error: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    auth=Depends(require_authenticated_user),
):
    user, business = auth
    sitemaps = (await db.execute(select(Sitemap).where(Sitemap.business_id == user.business_id).order_by(Sitemap.created_at.desc()))).scalars().all()
    pages = (await db.execute(select(KnowledgePage).where(KnowledgePage.business_id == user.business_id).order_by(KnowledgePage.created_at.desc()))).scalars().all()
    instructions = (await db.execute(select(Instruction).where(Instruction.business_id == user.business_id).order_by(Instruction.created_at.desc()))).scalars().all()
    return templates.TemplateResponse(
        request=request,
        name="knowledge.html",
        context={
            "request": request,
            "user": user,
            "business": business,
            "active_tab": tab,
            "error": error,
            "sitemaps": sitemaps,
            "pages": pages,
            "instructions": instructions,
        },
    )


@router.get("/urls")
async def urls_tab_redirect():
    return RedirectResponse(url="/knowledge?tab=urls", status_code=303)


@router.get("/instructions")
async def instructions_tab_redirect():
    return RedirectResponse(url="/knowledge?tab=instructions", status_code=303)


@router.get("/skills")
async def skills_tab_redirect():
    return RedirectResponse(url="/knowledge?tab=skills", status_code=303)


@router.post("/sitemaps/plan")
async def plan_sitemap(
    sitemap_url: str = Form(...),
    db: AsyncSession = Depends(get_db),
    auth=Depends(require_authenticated_user),
):
    user, _ = auth
    clean_url = sitemap_url.strip()[:1000]
    if not clean_url.startswith(("http://", "https://")):
        clean_url = "https://" + clean_url

    try:
        discovered = _discover_urls(clean_url)
        sm_stmt = (
            pg_insert(Sitemap)
            .values(
                business_id=user.business_id,
                url=clean_url,
                status="completed",
                total_urls_found=len(discovered),
            )
            .on_conflict_do_update(
                constraint="uq_sitemaps_biz_url",
                set_={"status": "completed", "total_urls_found": len(discovered)},
            )
            .returning(Sitemap.id)
        )
        sm_id = (await db.execute(sm_stmt)).scalar_one()

        for page_url, page_title in discovered:
            norm = page_url.lower().rstrip("/")[:2000]
            page_stmt = (
                pg_insert(KnowledgePage)
                .values(
                    business_id=user.business_id,
                    sitemap_id=sm_id,
                    url=page_url[:1000],
                    normalized_url=norm,
                    title=(page_title or page_url)[:500],
                )
                .on_conflict_do_nothing()
            )
            await db.execute(page_stmt)

        await db.commit()
        return RedirectResponse(url="/knowledge?tab=sitemaps", status_code=303)
    except Exception as exc:
        await db.rollback()
        msg = urllib.parse.quote(str(exc)[:180])
        return RedirectResponse(url=f"/knowledge?tab=sitemaps&error={msg}", status_code=303)


@router.post("/instructions")
async def create_instruction(
    title: str = Form(...),
    content: str = Form(...),
    db: AsyncSession = Depends(get_db),
    auth=Depends(require_authenticated_user),
):
    user, _ = auth
    db.add(
        Instruction(
            business_id=user.business_id,
            title=title.strip()[:250],
            content=content.strip(),
            is_active=True,
        )
    )
    await db.commit()
    return RedirectResponse(url="/knowledge?tab=instructions", status_code=303)
