"""Sitemap recursive parsing, duplicate detection, and pre-crawl estimation."""

from __future__ import annotations

from typing import Any, Dict, List, Set
import xml.etree.ElementTree as ET

import httpx


async def fetch_and_parse_sitemap(sitemap_url: str) -> Dict[str, Any]:
    """Recursively fetch XML sitemap or sitemap index, extracting all URLs and nested sitemaps."""
    headers = {"User-Agent": "AITechConsultantBot/1.0 (+https://aitechconsultant.local)"}
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        resp = await client.get(sitemap_url, headers=headers)
        if resp.status_code != 200:
            raise ValueError(f"Failed to fetch sitemap URL {sitemap_url} (status {resp.status_code})")
        xml_content = resp.content

    urls_found: List[str] = []
    nested_sitemaps: List[str] = []

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid XML in sitemap {sitemap_url}: {exc}")

    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if tag == "loc" and elem.text:
            loc = elem.text.strip()
            if loc.endswith(".xml") or "sitemap" in loc.lower():
                if loc != sitemap_url:
                    nested_sitemaps.append(loc)
            else:
                urls_found.append(loc)

    return {
        "sitemap_url": sitemap_url,
        "urls": urls_found,
        "nested_sitemaps": nested_sitemaps,
    }


async def generate_ingestion_plan(sitemap_urls: List[str]) -> Dict[str, Any]:
    """Recursively traverse sitemaps, detect duplicates, and compute pre-crawl metrics & ETA."""
    all_sitemaps_meta: List[Dict[str, Any]] = []
    url_to_sitemaps: Dict[str, Set[str]] = {}
    queue = list(sitemap_urls)
    visited_sitemaps: Set[str] = set()

    while queue:
        current_url = queue.pop(0)
        if current_url in visited_sitemaps:
            continue
        visited_sitemaps.add(current_url)

        try:
            parsed = await fetch_and_parse_sitemap(current_url)
            s_urls = parsed["urls"]
            for u in s_urls:
                if u not in url_to_sitemaps:
                    url_to_sitemaps[u] = set()
                url_to_sitemaps[u].add(current_url)

            all_sitemaps_meta.append({
                "sitemap_url": current_url,
                "url_count": len(s_urls),
                "first_url": s_urls[0] if s_urls else None,
                "last_url": s_urls[-1] if s_urls else None,
            })

            for nested in parsed["nested_sitemaps"]:
                if nested not in visited_sitemaps:
                    queue.append(nested)
        except Exception as exc:
            all_sitemaps_meta.append({
                "sitemap_url": current_url,
                "error": str(exc),
                "url_count": 0,
            })

    unique_urls = list(url_to_sitemaps.keys())
    total_urls = len(unique_urls)
    duplicates = {u: list(maps) for u, maps in url_to_sitemaps.items() if len(maps) > 1}

    seconds_estimated = total_urls * 2.0
    hours_estimated = seconds_estimated / 3600.0
    pages_per_hour = 1800
    pages_per_day = pages_per_hour * 24

    return {
        "total_sitemaps": len(visited_sitemaps),
        "total_unique_urls": total_urls,
        "total_duplicate_instances": len(duplicates),
        "sitemap_breakdown": all_sitemaps_meta,
        "first_url": unique_urls[0] if unique_urls else None,
        "last_url": unique_urls[-1] if unique_urls else None,
        "estimates": {
            "pages_per_hour": pages_per_hour,
            "pages_per_day": pages_per_day,
            "estimated_hours": round(hours_estimated, 2),
            "estimated_days": round(hours_estimated / 24.0, 2),
        },
        "duplicates_sample": list(duplicates.items())[:10],
    }
