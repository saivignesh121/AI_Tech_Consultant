"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Brain,
  Search,
  Globe,
  FileText,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  ExternalLink,
  Layers,
  ShieldAlert,
  Clock,
  ArrowRight,
  Database,
  Filter,
} from "lucide-react";

interface SitemapSource {
  id: string;
  rootUrl: string;
  sourceType: string;
  crawlSchedule: string;
  status: string;
  lastCrawledAt: string | null;
  pageCount: number;
  chunkCount: number;
}

interface KnowledgePageItem {
  id: string;
  url: string;
  title: string;
  healthStatus: "active" | "watch" | "quarantined" | "archived";
  httpStatus: number | null;
  redirectUrl: string | null;
  consecutiveFailures: number;
  lastCheckedAt: string;
  chunksCount: number;
  chunks?: Array<{ id: string; heading: string; content: string; chunkIndex: number }>;
}

interface HybridSearchResult {
  citationIndex: number;
  pageTitle: string;
  url: string;
  heading: string;
  content: string;
  rrfScore: number;
  vectorRank: number;
  vectorSimilarity: number;
  bm25Rank: number;
  matchedTerms: string[];
}

interface SkillItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  triggerConditions: string;
  stepsMarkdown: string;
  examples: Array<{ question: string; answer: string }>;
}

export default function KnowledgeBrainPage() {
  const [activeTab, setActiveTab] = useState<"sitemaps" | "pages" | "search" | "health" | "skills">("search");

  // --- Sitemaps Tab State ---
  const [sources, setSources] = useState<SitemapSource[]>([]);
  const [newSitemapUrl, setNewSitemapUrl] = useState("");
  const [loadingSources, setLoadingSources] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<{
    sitemapUrl: string;
    discoveredUrlsCount: number;
    sampleUrls: string[];
    estimatedMinutes: number;
    politeRatePerPageSec: number;
    robotsTxtCompliant: boolean;
  } | null>(null);
  const [ingesting, setIngesting] = useState(false);

  // --- Pages & Chunks Tab State ---
  const [pages, setPages] = useState<KnowledgePageItem[]>([]);
  const [selectedPage, setSelectedPage] = useState<KnowledgePageItem | null>(null);
  const [pageSearchFilter, setPageSearchFilter] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);

  // --- Hybrid Search Sandbox State ---
  const [searchQuery, setSearchQuery] = useState("How do I configure custom CNAME subdomains?");
  const [searchResults, setSearchResults] = useState<HybridSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDurationMs, setSearchDurationMs] = useState(0);

  // --- URL Health State ---
  const [healthSummary, setHealthSummary] = useState<{
    total: number;
    active: number;
    watch: number;
    quarantined: number;
    archived: number;
    healthyPercent: number;
  } | null>(null);

  // --- Skills Studio State ---
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [draftingSkill, setDraftingSkill] = useState(false);
  const [skillSuccessMsg, setSkillSuccessMsg] = useState("");

  useEffect(() => {
    fetchSitemaps();
    fetchPages();
    fetchHealth();
    fetchSkills();
    executeSearch("How do I configure custom CNAME subdomains?");
  }, []);

  const fetchSitemaps = async () => {
    setLoadingSources(true);
    try {
      const res = await fetch("/api/brain/sitemaps");
      const data = await res.json();
      if (data.sources) setSources(data.sources);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSources(false);
    }
  };

  const handlePreviewSitemap = async () => {
    if (!newSitemapUrl.trim()) return;
    setIngesting(true);
    try {
      const res = await fetch("/api/brain/sitemaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl: newSitemapUrl, previewOnly: true }),
      });
      const data = await res.json();
      if (data.summary) setPreviewSummary(data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIngesting(false);
    }
  };

  const handleConfirmIngest = async () => {
    if (!previewSummary) return;
    setIngesting(true);
    try {
      const res = await fetch("/api/brain/sitemaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl: previewSummary.sitemapUrl }),
      });
      if (res.ok) {
        setPreviewSummary(null);
        setNewSitemapUrl("");
        fetchSitemaps();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIngesting(false);
    }
  };

  const fetchPages = async (healthFilter?: string) => {
    setLoadingPages(true);
    try {
      const url = healthFilter ? `/api/brain/pages?health=${healthFilter}` : "/api/brain/pages";
      const res = await fetch(url);
      const data = await res.json();
      if (data.pages) {
        setPages(data.pages);
        if (!selectedPage && data.pages.length > 0) setSelectedPage(data.pages[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPages(false);
    }
  };

  const executeSearch = async (queryToRun: string) => {
    if (!queryToRun.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch("/api/brain/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToRun }),
      });
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
        setSearchDurationMs(data.durationMs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/brain/health");
      const data = await res.json();
      if (data.summary) setHealthSummary(data.summary);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateHealthTransition = async (pageId: string, status: number, redirectUrl?: string) => {
    try {
      await fetch("/api/brain/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, simulatedStatus: status, redirectUrl }),
      });
      fetchHealth();
      fetchPages();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/brain/skills");
      const data = await res.json();
      if (data.skills) {
        setSkillsList(data.skills);
        if (data.skills.length > 0) setSelectedSkill(data.skills[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoDraftSkill = async () => {
    setDraftingSkill(true);
    setSkillSuccessMsg("");
    try {
      const res = await fetch("/api/brain/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft_from_pages", name: "Custom Domain Routing Protocol" }),
      });
      const data = await res.json();
      if (data.draftedSkill) {
        setSkillSuccessMsg("Skill drafted automatically from ingested help docs!");
        fetchSkills();
        setTimeout(() => setSkillSuccessMsg(""), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDraftingSkill(false);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.title?.toLowerCase().includes(pageSearchFilter.toLowerCase()) ||
      p.url.toLowerCase().includes(pageSearchFilter.toLowerCase())
  );

  return (
    <AppShell breadcrumbs={[{ label: "Knowledge Brain" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">The Knowledge Brain</h1>
            <p className="text-sm text-gray-400 mt-1">
              Polite sitemap ingestion, 400-token semantic chunking, and hybrid search (pgvector + tsvector RRF).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 px-3 py-1.5 text-xs font-mono text-indigo-300">
              3,842 Chunks Embedded
            </span>
          </div>
        </div>

        {/* Secondary Tabs */}
        <div className="flex border-b border-gray-800 space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "search"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Hybrid Search Sandbox (RRF)</span>
          </button>

          <button
            onClick={() => setActiveTab("sitemaps")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "sitemaps"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Sitemaps & Ingestion</span>
          </button>

          <button
            onClick={() => setActiveTab("pages")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "pages"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Pages & Chunk Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "health"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>URL Health Lifecycle</span>
          </button>

          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "skills"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Drafted Skills & SOP Studio</span>
          </button>
        </div>

        {/* ================= TAB 1: HYBRID SEARCH SANDBOX (Task 2.3) ================= */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search Input Bar */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-400" />
                  Hybrid Search Query Engine (pgvector + tsvector)
                </span>
                {searchDurationMs > 0 && (
                  <span className="text-[11px] font-mono text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                    Retrieved in {searchDurationMs}ms
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") executeSearch(searchQuery);
                  }}
                  placeholder="Enter a tech question to test hybrid retrieval..."
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => executeSearch(searchQuery)}
                  disabled={searching}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                >
                  <Search className="h-4 w-4" />
                  <span>{searching ? "Searching..." : "Execute Search"}</span>
                </button>
              </div>

              {/* Morphology and Quick Test Chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-gray-500">Quick Test:</span>
                <button
                  onClick={() => {
                    setSearchQuery("How do I configure custom CNAME subdomains?");
                    executeSearch("How do I configure custom CNAME subdomains?");
                  }}
                  className="rounded bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1 text-gray-300 font-mono text-[11px]"
                >
                  Custom CNAME setup
                </button>
                <button
                  onClick={() => {
                    setSearchQuery("customizing domain DNS records");
                    executeSearch("customizing domain DNS records");
                  }}
                  className="rounded bg-indigo-950/40 border border-indigo-500/30 hover:bg-indigo-900/40 px-2.5 py-1 text-indigo-300 font-mono text-[11px]"
                >
                  Stemming: &quot;customizing&quot;
                </button>
                <button
                  onClick={() => {
                    setSearchQuery("Webhook signature verification HMAC");
                    executeSearch("Webhook signature verification HMAC");
                  }}
                  className="rounded bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1 text-gray-300 font-mono text-[11px]"
                >
                  Webhook HMAC
                </button>
              </div>
            </div>

            {/* Results Stream */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Top {searchResults.length} Reciprocal Rank Fusion Results</span>
                <span className="text-[11px] font-mono">Formula: RRF = &Sigma; 1 / (60 + rank)</span>
              </div>

              {searchResults.map((res) => (
                <div
                  key={res.citationIndex}
                  className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm space-y-3 hover:border-gray-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-600/20 text-indigo-400 font-mono font-bold text-xs px-2 py-0.5 border border-indigo-500/30">
                        [{res.citationIndex}]
                      </span>
                      <h3 className="text-sm font-semibold text-white">{res.pageTitle}</h3>
                      <span className="text-xs text-gray-500 font-mono">&bull; {res.heading}</span>
                    </div>

                    {/* Retrieval Telemetry Scores */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-purple-400 bg-purple-950/30 border border-purple-500/20 px-2 py-0.5 rounded">
                        Vector: #{res.vectorRank} (Sim: {res.vectorSimilarity})
                      </span>
                      <span className="text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded">
                        BM25: #{res.bm25Rank}
                      </span>
                      <span className="text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        RRF: {res.rrfScore.toFixed(6)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{res.content}</p>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-gray-500 font-mono truncate max-w-md">{res.url}</span>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span>Stemmed Terms:</span>
                      {res.matchedTerms.map((term) => (
                        <span key={term} className="rounded bg-gray-800 px-1.5 py-0.2 font-mono text-gray-300 text-[10px]">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: SITEMAPS & INGESTION (Task 2.1) ================= */}
        {activeTab === "sitemaps" && (
          <div className="space-y-6">
            {/* Sitemap Input & Pre-Crawl Trigger */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-white">Ingest Help Center Sitemap</h3>
              <p className="text-xs text-gray-400">
                Polite batch crawler respects robots.txt and throttles to 450 pages/hour with 8-second delay between batches.
              </p>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newSitemapUrl}
                  onChange={(e) => setNewSitemapUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handlePreviewSitemap}
                  disabled={ingesting || !newSitemapUrl.trim()}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40"
                >
                  <Search className="h-4 w-4" />
                  <span>Discover & Pre-Crawl Summary</span>
                </button>
              </div>

              {/* Pre-Crawl Summary Modal / Preview Card (Task 2.1) */}
              {previewSummary && (
                <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-5 space-y-4 mt-4">
                  <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <h4 className="text-sm font-bold">Pre-Crawl Discovery Summary</h4>
                    </div>
                    <span className="rounded bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 font-mono border border-emerald-500/20">
                      Robots.txt Allowed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Discovered URLs:</span>
                      <div className="text-xl font-bold text-white mt-1 font-mono">
                        {previewSummary.discoveredUrlsCount} pages
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Estimated Duration:</span>
                      <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
                        ~{previewSummary.estimatedMinutes} minutes
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Polite Crawl Rate:</span>
                      <div className="text-xl font-bold text-indigo-300 mt-1 font-mono">
                        450 pages/hr (8s pause)
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-300">
                    <span className="text-gray-400 block mb-1">Sample Discovered URLs:</span>
                    <div className="bg-gray-950/80 p-2.5 rounded font-mono text-[11px] text-gray-400 space-y-1">
                      {previewSummary.sampleUrls.slice(0, 3).map((u, i) => (
                        <div key={i} className="truncate">
                          &bull; {u}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setPreviewSummary(null)}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmIngest}
                      disabled={ingesting}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition"
                    >
                      {ingesting ? "Scheduling Crawl..." : "Confirm & Start Ingestion"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ingested Sources Table */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Active Knowledge Sources</h3>
                <span className="text-xs text-gray-400 font-mono">{sources.length} sources registered</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Source URL</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3 text-right">Ingested Pages</th>
                    <th className="px-4 py-3 text-right">Embedded Chunks</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {sources.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-900/40 transition">
                      <td className="px-4 py-3 text-white truncate max-w-sm">{s.rootUrl}</td>
                      <td className="px-4 py-3 text-gray-400">{s.crawlSchedule}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{s.pageCount}</td>
                      <td className="px-4 py-3 text-right text-purple-400">{s.chunkCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] uppercase border border-emerald-500/20">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PAGES & CHUNK INSPECTOR (Task 2.2) ================= */}
        {activeTab === "pages" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (5 Cols): Pages List */}
            <div className="lg:col-span-5 rounded-xl border border-gray-800 bg-[#0E1322] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h3 className="text-sm font-semibold text-white">Ingested Pages</h3>
                <span className="text-xs text-gray-400 font-mono">{filteredPages.length} pages</span>
              </div>

              <input
                type="text"
                value={pageSearchFilter}
                onChange={(e) => setPageSearchFilter(e.target.value)}
                placeholder="Filter pages by title or URL..."
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />

              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {filteredPages.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPage(p)}
                    className={`cursor-pointer rounded-lg p-3 transition border ${
                      selectedPage?.id === p.id
                        ? "border-indigo-500 bg-indigo-950/20"
                        : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                    }`}
                  >
                    <div className="text-xs font-semibold text-white truncate">{p.title || p.url}</div>
                    <div className="text-[10px] text-gray-500 font-mono truncate mt-0.5">{p.url}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono uppercase ${
                          p.healthStatus === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : p.healthStatus === "watch"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {p.healthStatus}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{p.chunksCount} chunks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (7 Cols): Chunk Inspector */}
            <div className="lg:col-span-7 rounded-xl border border-gray-800 bg-[#0E1322] p-5 space-y-4">
              {selectedPage ? (
                <>
                  <div className="border-b border-gray-800 pb-3">
                    <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">
                      Page Chunk Inspector (400-Token Chunks)
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">{selectedPage.title}</h3>
                    <a
                      href={selectedPage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
                    >
                      <span>{selectedPage.url}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {selectedPage.chunks?.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 border-b border-gray-900 pb-1">
                          <span className="text-indigo-300 font-semibold">{chunk.heading}</span>
                          <span>Chunk #{chunk.chunkIndex + 1} &bull; 1536-dim vector</span>
                        </div>
                        <p className="text-gray-300 font-sans leading-relaxed">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-gray-500 text-xs">
                  Select an ingested page on the left to inspect its semantic chunks.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: URL HEALTH LIFECYCLE (Task 2.4) ================= */}
        {activeTab === "health" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            {healthSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-emerald-500/30 bg-[#0E1322] p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Active (Healthy)</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 mt-2 font-mono">
                    {healthSummary.active}
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">Full citation eligibility</span>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-[#0E1322] p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Watch (1 Fail)</span>
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-bold text-amber-400 mt-2 font-mono">
                    {healthSummary.watch}
                  </div>
                  <span className="text-[11px] text-amber-400 mt-1 block">1 failure grace period</span>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-[#0E1322] p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Quarantined</span>
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-3xl font-bold text-red-400 mt-2 font-mono">
                    {healthSummary.quarantined}
                  </div>
                  <span className="text-[11px] text-red-400 mt-1 block">Blocked from citations (301/404)</span>
                </div>

                <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Archived</span>
                    <Layers className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-400 mt-2 font-mono">
                    {healthSummary.archived}
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">Historical audit only</span>
                </div>
              </div>
            )}

            {/* Health Verification Table */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">404 Watch Counter & 301 Quarantine State Machine</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Prevents hallucinations and broken links. 2 consecutive 404s trigger immediate Quarantine.
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetchHealth();
                    fetchPages();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
                >
                  <RotateCw className="h-3 w-3" />
                  <span>Refresh Health</span>
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Page Title & URL</th>
                    <th className="px-4 py-3">HTTP Status</th>
                    <th className="px-4 py-3 text-center">Failures</th>
                    <th className="px-4 py-3 text-center">Lifecycle Status</th>
                    <th className="px-4 py-3 text-right">Simulate Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {pages.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-900/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{p.title}</div>
                        <div className="text-gray-500 font-mono text-[11px] truncate max-w-sm">{p.url}</div>
                        {p.redirectUrl && (
                          <div className="text-[10px] text-indigo-400 font-mono">
                            &rarr; Redirects to: {p.redirectUrl}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{p.httpStatus || 200}</td>
                      <td className="px-4 py-3 text-center font-mono">
                        <span className={p.consecutiveFailures > 0 ? "text-amber-400 font-bold" : "text-gray-500"}>
                          {p.consecutiveFailures}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase ${
                            p.healthStatus === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : p.healthStatus === "watch"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {p.healthStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSimulateHealthTransition(p.id, 200)}
                            className="rounded bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300 hover:bg-emerald-900/40"
                          >
                            200 OK
                          </button>
                          <button
                            onClick={() => handleSimulateHealthTransition(p.id, 404)}
                            className="rounded bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300 hover:bg-amber-900/40"
                          >
                            404 Fail
                          </button>
                          <button
                            onClick={() =>
                              handleSimulateHealthTransition(p.id, 301, "https://example.com/new-location")
                            }
                            className="rounded bg-red-950/40 border border-red-500/30 px-2 py-0.5 text-[10px] font-mono text-red-300 hover:bg-red-900/40"
                          >
                            301 Redirect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: DRAFTED SKILLS & SOP STUDIO (Task 2.5) ================= */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            {skillSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{skillSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Standard Operating Procedures (Skills)</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cluster ingested help documentation into executable step-by-step procedures used during consultation chat.
                </p>
              </div>

              <button
                onClick={handleAutoDraftSkill}
                disabled={draftingSkill}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>{draftingSkill ? "Clustering Pages..." : "Auto-Draft Skill from Pages"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (4 Cols): Skills List */}
              <div className="lg:col-span-4 rounded-xl border border-gray-800 bg-[#0E1322] p-4 space-y-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Active SOP Skills
                </span>

                <div className="space-y-2">
                  {skillsList.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSkill(s)}
                      className={`cursor-pointer rounded-lg p-3 transition border ${
                        selectedSkill?.id === s.id
                          ? "border-indigo-500 bg-indigo-950/20"
                          : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{s.name}</div>
                      <div className="text-[10px] text-gray-400 line-clamp-2 mt-1">{s.description}</div>
                      <span className="mt-2 inline-block rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-mono px-1.5 py-0.2 border border-indigo-500/20">
                        {s.slug}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (8 Cols): Skill Step Viewer & Editor */}
              <div className="lg:col-span-8 rounded-xl border border-gray-800 bg-[#0E1322] p-6 space-y-4">
                {selectedSkill ? (
                  <>
                    <div className="border-b border-gray-800 pb-3">
                      <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">
                        Active SOP Procedure
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">{selectedSkill.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{selectedSkill.description}</p>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Trigger Condition:</span>
                      <div className="rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-xs text-amber-300 font-mono">
                        {selectedSkill.triggerConditions}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">
                        Step-by-Step Instructions (Markdown):
                      </span>
                      <pre className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs font-mono text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {selectedSkill.stepsMarkdown}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-gray-500 text-xs">
                    Select a skill on the left to inspect its instructions.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
