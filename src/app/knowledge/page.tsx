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
  FileCode,
  Mail,
  BookOpen,
  MessageSquare,
  Trash2,
  Save,
  Send,
  HelpCircle,
  Tag,
  Image as ImageIcon,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";

interface LiveCrawlProgress {
  jobId: string;
  status: "idle" | "running" | "paused" | "completed" | "interrupted" | "failed";
  totalUrls: number;
  processedUrls: number;
  failedUrls: number;
  skippedUrls: number;
  progressPercent: number;
  currentUrl: string | null;
  imagesDiscovered: number;
  chunksCreated: number;
  elapsedSeconds: number;
  estimatedSecondsLeft: number;
  formattedTimeLeft: string;
  recentActivity: Array<{
    timestamp: string;
    url: string;
    status: "ok" | "skipped" | "retry" | "failed";
    title?: string;
    chunksCount?: number;
    imagesCount?: number;
    message?: string;
  }>;
}

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
  chunks?: Array<{
    id: string;
    heading: string;
    content: string;
    chunkIndex: number;
    imageUrl?: string;
    imageCaption?: string;
  }>;
}

interface HybridSearchResult {
  citationIndex: number;
  pageTitle: string;
  url: string;
  heading: string;
  content: string;
  sourceType?: string;
  attributionBadge?: string;
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

interface InstructionItem {
  id: string;
  title: string;
  ruleText: string;
  appliesToRoles: string[];
  isActive: boolean;
  createdAt: string;
}

interface EmailThreadItem {
  id: string;
  gmailThreadId: string;
  subject: string;
  snippet: string;
  notes: string | null;
  syncedAt: string;
  messages?: Array<{
    id: string;
    fromAddress: string;
    toAddress: string;
    bodyText: string;
    notes?: string | null;
    sentAt: string;
  }>;
}

interface SitemapPlanSummary {
  rootUrl: string;
  rootUrls: string[];
  totalSitemapsFound: number;
  nestedSitemaps: string[];
  nestedBreakdown: Array<{
    sitemapUrl: string;
    pageCount: number;
    firstUrl: string | null;
    lastUrl: string | null;
  }>;
  totalUrls: number;
  uniqueUrls: number;
  duplicateUrlsCount: number;
  duplicates: Array<{
    url: string;
    foundIn: string[];
    occurrences: number;
  }>;
  firstUrl: string | null;
  lastUrl: string | null;
  estimatedPagesPerHour: number;
  estimatedPagesPerDay: number;
  estimatedHours: number;
  estimatedMinutes: number;
  estimatedCompletionTime: string;
  formattedEta: string;
}

export default function KnowledgeBrainPage() {
  const [activeTab, setActiveTab] = useState<
    "sitemaps" | "pages" | "instructions" | "skills" | "emails" | "search" | "health"
  >("sitemaps");

  // --- Sitemaps Tab State (Knowledge Type 1 & Task 2.2) ---
  const [sources, setSources] = useState<SitemapSource[]>([]);
  // Default benchmark: Brilliant Directories Solution Center sitemap (supports 1 or more URLs)
  const [sitemapsInput, setSitemapsInput] = useState("https://support.brilliantdirectories.com/support/sitemap.xml");
  const [urlValidationChecks, setUrlValidationChecks] = useState<
    Array<{ url: string; valid: boolean; error?: string }>
  >([
    { url: "https://support.brilliantdirectories.com/support/sitemap.xml", valid: true },
  ]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<SitemapPlanSummary | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccessMsg, setIngestSuccessMsg] = useState("");

  // --- Live Polite Crawl Progress State (Task 2.3) ---
  const [crawlProgress, setCrawlProgress] = useState<LiveCrawlProgress | null>(null);
  const [crawling, setCrawling] = useState(false);

  // --- Standalone Pages Tab State (Knowledge Type 2) ---
  const [pages, setPages] = useState<KnowledgePageItem[]>([]);
  const [selectedPage, setSelectedPage] = useState<KnowledgePageItem | null>(null);
  const [pageSearchFilter, setPageSearchFilter] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);
  const [singlePageUrl, setSinglePageUrl] = useState("");
  const [singlePageTitle, setSinglePageTitle] = useState("");
  const [singlePageContent, setSinglePageContent] = useState("");
  const [addingSinglePage, setAddingSinglePage] = useState(false);
  const [singlePageSuccessMsg, setSinglePageSuccessMsg] = useState("");

  // --- Instructions Tab State (Knowledge Type 3) ---
  const [instructionsList, setInstructionsList] = useState<InstructionItem[]>([]);
  const [loadingInstructions, setLoadingInstructions] = useState(false);
  const [newInstTitle, setNewInstTitle] = useState("");
  const [newInstRuleText, setNewInstRuleText] = useState("");
  const [newInstRole, setNewInstRole] = useState("all");
  const [savingInstruction, setSavingInstruction] = useState(false);
  const [instructionSuccessMsg, setInstructionSuccessMsg] = useState("");

  // --- Skills Studio State (Knowledge Type 4) ---
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [draftingSkill, setDraftingSkill] = useState(false);
  const [skillSuccessMsg, setSkillSuccessMsg] = useState("");

  // --- Past Emails Tab State (Knowledge Type 5) ---
  const [emailThreadsList, setEmailThreadsList] = useState<EmailThreadItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThreadItem | null>(null);
  const [threadNotes, setThreadNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccessMsg, setNotesSuccessMsg] = useState("");

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

  useEffect(() => {
    fetchSitemaps();
    fetchPages();
    fetchInstructions();
    fetchSkills();
    fetchEmailThreads();
    fetchHealth();
    fetchCrawlProgress();
    executeSearch("How do I configure custom CNAME subdomains?");

    const interval = setInterval(() => {
      fetchCrawlProgress();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchCrawlProgress = async () => {
    try {
      const res = await fetch("/api/brain/crawl");
      const data = await res.json();
      if (data.progress) {
        setCrawlProgress(data.progress);
        setCrawling(data.progress.status === "running");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerCrawl = async () => {
    setCrawling(true);
    try {
      const res = await fetch("/api/brain/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (data.progress) setCrawlProgress(data.progress);
      fetchPages();
      fetchSitemaps();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePauseCrawl = async () => {
    try {
      const res = await fetch("/api/brain/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      const data = await res.json();
      if (data.progress) setCrawlProgress(data.progress);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResumeCrawl = async () => {
    try {
      const res = await fetch("/api/brain/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
      const data = await res.json();
      if (data.progress) setCrawlProgress(data.progress);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateBatchStep = async () => {
    try {
      const res = await fetch("/api/brain/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "step" }),
      });
      const data = await res.json();
      if (data.progress) setCrawlProgress(data.progress);
      fetchPages();
      fetchSitemaps();
    } catch (e) {
      console.error(e);
    }
  };

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

  const validateUrlInput = (urlStr: string) => {
    const trimmed = urlStr.trim();
    if (!trimmed) return { valid: false, error: "URL cannot be empty." };
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { valid: false, error: "Must start with http:// or https://" };
      }
      if (!u.hostname.includes(".")) {
        return { valid: false, error: "Must contain a valid domain name." };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid URL syntax." };
    }
  };

  const handleSitemapsInputChange = (val: string) => {
    setSitemapsInput(val);
    const lines = val.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    const checks = lines.map((line) => ({
      url: line,
      ...validateUrlInput(line),
    }));
    setUrlValidationChecks(checks.length > 0 ? checks : [{ url: "", valid: false, error: "Enter at least one URL." }]);
  };

  const handlePreviewSitemap = async () => {
    const validUrls = urlValidationChecks.filter((u) => u.valid).map((u) => u.url);
    if (validUrls.length === 0) return;
    setIngesting(true);
    try {
      const res = await fetch("/api/brain/sitemaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrls: validUrls, previewOnly: true }),
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
    setIngestSuccessMsg("");
    try {
      const res = await fetch("/api/brain/sitemaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sitemapUrls: previewSummary.rootUrls,
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIngestSuccessMsg(data.message || "Sitemaps confirmed and scheduled for polite crawling!");
        setPreviewSummary(null);
        fetchSitemaps();
        await handleTriggerCrawl();
        setTimeout(() => setIngestSuccessMsg(""), 6000);
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

  const handleAddSinglePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singlePageUrl.trim()) return;
    setAddingSinglePage(true);
    setSinglePageSuccessMsg("");
    try {
      const res = await fetch("/api/brain/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: singlePageUrl.trim(),
          title: singlePageTitle.trim() || undefined,
          content: singlePageContent.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSinglePageSuccessMsg(`Indexed '${singlePageUrl}' into Knowledge Brain.`);
        setSinglePageUrl("");
        setSinglePageTitle("");
        setSinglePageContent("");
        fetchPages();
        setTimeout(() => setSinglePageSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSinglePage(false);
    }
  };

  const fetchInstructions = async () => {
    setLoadingInstructions(true);
    try {
      const res = await fetch("/api/brain/instructions");
      const data = await res.json();
      if (data.instructions) setInstructionsList(data.instructions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInstructions(false);
    }
  };

  const handleCreateInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstTitle.trim() || !newInstRuleText.trim()) return;
    setSavingInstruction(true);
    setInstructionSuccessMsg("");
    try {
      const res = await fetch("/api/brain/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newInstTitle.trim(),
          ruleText: newInstRuleText.trim(),
          appliesToRoles: [newInstRole],
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstructionSuccessMsg("Rule successfully registered into Knowledge Brain!");
        setNewInstTitle("");
        setNewInstRuleText("");
        setNewInstRole("all");
        fetchInstructions();
        setTimeout(() => setInstructionSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingInstruction(false);
    }
  };

  const handleToggleInstruction = async (inst: InstructionItem) => {
    try {
      await fetch("/api/brain/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: inst.id,
          title: inst.title,
          ruleText: inst.ruleText,
          appliesToRoles: inst.appliesToRoles,
          isActive: !inst.isActive,
        }),
      });
      fetchInstructions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    try {
      await fetch(`/api/brain/instructions?id=${id}`, {
        method: "DELETE",
      });
      fetchInstructions();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/brain/skills");
      const data = await res.json();
      if (data.skills) {
        setSkillsList(data.skills);
        if (!selectedSkill && data.skills.length > 0) setSelectedSkill(data.skills[0]);
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

  const fetchEmailThreads = async () => {
    try {
      const res = await fetch("/api/brain/emails");
      const data = await res.json();
      if (data.threads) {
        setEmailThreadsList(data.threads);
        if (!selectedThread && data.threads.length > 0) {
          setSelectedThread(data.threads[0]);
          setThreadNotes(data.threads[0].notes || "");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveThreadNotes = async () => {
    if (!selectedThread) return;
    setSavingNotes(true);
    setNotesSuccessMsg("");
    try {
      const res = await fetch("/api/brain/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_notes",
          threadId: selectedThread.id,
          notes: threadNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotesSuccessMsg("Teaching notes saved! Consultant agent will apply this guidance.");
        fetchEmailThreads();
        setTimeout(() => setNotesSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
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
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Brain className="h-6 w-6 text-indigo-400" />
              <span>The Knowledge Brain</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Learns from 5 distinct knowledge types with dynamic citation badges: Sitemaps, Page URLs, Instructions, Skills, and Past Emails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 px-3 py-1.5 text-xs font-mono text-indigo-300">
              5 Knowledge Types Active
            </span>
          </div>
        </div>

        {/* 5 Primary Knowledge Types Tabs + Hybrid Search Sandbox */}
        <div className="flex border-b border-gray-800 space-x-1 overflow-x-auto">
          {/* Tab 1: Sitemaps */}
          <button
            onClick={() => setActiveTab("sitemaps")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "sitemaps"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>1. Sitemaps</span>
            <span className="text-[10px] bg-indigo-950/60 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/20 font-mono">
              [sitemap]
            </span>
          </button>

          {/* Tab 2: Page URLs */}
          <button
            onClick={() => setActiveTab("pages")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "pages"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>2. Page URLs</span>
            <span className="text-[10px] bg-sky-950/60 text-sky-300 px-1.5 py-0.2 rounded border border-sky-500/20 font-mono">
              [page_url]
            </span>
          </button>

          {/* Tab 3: Instructions */}
          <button
            onClick={() => setActiveTab("instructions")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "instructions"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>3. Instructions</span>
            <span className="text-[10px] bg-emerald-950/60 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
              [instruction]
            </span>
          </button>

          {/* Tab 4: Skills */}
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "skills"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>4. Skills</span>
            <span className="text-[10px] bg-purple-950/60 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/20 font-mono">
              [skill]
            </span>
          </button>

          {/* Tab 5: Past Emails */}
          <button
            onClick={() => setActiveTab("emails")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "emails"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>5. Past Emails</span>
            <span className="text-[10px] bg-amber-950/60 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20 font-mono">
              [past_email]
            </span>
          </button>

          {/* Tab 6: Search & Health */}
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "search"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Search &amp; Health Sandbox</span>
          </button>
        </div>

        {/* ================= TAB 1: SITEMAPS (Task 2.1 & 2.2) ================= */}
        {activeTab === "sitemaps" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Ingest Help Center Sitemaps (Task 2.2)</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Add one or more sitemap URLs. Automatically checks each URL on entry, resolves nested sitemaps recursively, tracks duplicate URLs, and generates pre-flight read plans.
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 text-xs font-mono border border-indigo-500/20">
                  Polite 450 pages/hr (10,800/day) &bull; 8s batch pause
                </span>
              </div>

              {ingestSuccessMsg && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{ingestSuccessMsg}</span>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-gray-500">Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleSitemapsInputChange(
                      "https://support.brilliantdirectories.com/support/sitemap.xml"
                    )
                  }
                  className="rounded bg-indigo-950/40 border border-indigo-500/30 hover:bg-indigo-900/40 px-2.5 py-1 text-indigo-300 font-mono text-[11px]"
                >
                  Brilliant Directories (Default Benchmark)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSitemapsInputChange(
                      "https://support.brilliantdirectories.com/support/sitemap.xml\nhttps://docs.stripe.com/sitemap.xml"
                    )
                  }
                  className="rounded bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/40 px-2.5 py-1 text-purple-300 font-mono text-[11px]"
                >
                  Multi-Sitemap Batch (Nested Demo)
                </button>
                <button
                  type="button"
                  onClick={() => handleSitemapsInputChange("https://docs.stripe.com/sitemap.xml")}
                  className="rounded bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1 text-gray-300 font-mono text-[11px]"
                >
                  Stripe Docs
                </button>
                <button
                  type="button"
                  onClick={() => handleSitemapsInputChange("https://docs.github.com/sitemap.xml")}
                  className="rounded bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1 text-gray-300 font-mono text-[11px]"
                >
                  GitHub Docs
                </button>
              </div>

              {/* Multiline Sitemap URLs Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">
                  Enter One or More Sitemap URLs (one per line or comma-separated):
                </label>
                <textarea
                  rows={3}
                  value={sitemapsInput}
                  onChange={(e) => handleSitemapsInputChange(e.target.value)}
                  placeholder="https://example.com/sitemap.xml&#10;https://example.com/sitemap_index.xml"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                />

                {/* Live URL Validation Feedback List (Task 2.2: Check each URL when it is entered) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-gray-400 font-semibold block">URL Entry Checks:</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {urlValidationChecks.map((check, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded border font-mono ${
                          check.valid
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                            : "bg-red-950/20 border-red-500/30 text-red-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-xl">
                          {check.valid ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{check.url || "(Empty input line)"}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold flex-shrink-0 ml-2">
                          {check.valid ? "Valid Syntax" : check.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handlePreviewSitemap}
                    disabled={
                      ingesting ||
                      urlValidationChecks.filter((u) => u.valid).length === 0
                    }
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                  >
                    <Search className="h-4 w-4" />
                    <span>{ingesting ? "Discovering Nested Sitemaps..." : "Plan Sitemap Read (Pre-Flight Summary)"}</span>
                  </button>
                </div>
              </div>

              {/* Pre-Crawl Summary Modal / Preview Card (Task 2.2) */}
              {previewSummary && (
                <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-6 space-y-6 mt-4">
                  <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Sparkles className="h-5 w-5 text-indigo-400" />
                      <div>
                        <h4 className="text-base font-bold text-white">Pre-Flight Read Plan (Confirmation Required)</h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Review discovered nested sitemaps, duplicate URLs, and throughput estimates. Processing will only start after your confirmation.
                        </p>
                      </div>
                    </div>
                    <span className="rounded bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 font-mono border border-emerald-500/20">
                      Robots.txt Verified
                    </span>
                  </div>

                  {/* Grand Totals KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-gray-950/80 p-3.5 rounded-lg border border-gray-800">
                      <span className="text-gray-400">Total Sitemaps:</span>
                      <div className="text-2xl font-bold text-white mt-1 font-mono">
                        {previewSummary.totalSitemapsFound}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        {previewSummary.rootUrls.length} root + {previewSummary.nestedSitemaps.length} nested
                      </span>
                    </div>

                    <div className="bg-gray-950/80 p-3.5 rounded-lg border border-gray-800">
                      <span className="text-gray-400">Total URLs Discovered:</span>
                      <div className="text-2xl font-bold text-indigo-300 mt-1 font-mono">
                        {previewSummary.totalUrls}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        {previewSummary.uniqueUrls} unique URLs
                      </span>
                    </div>

                    <div className="bg-gray-950/80 p-3.5 rounded-lg border border-gray-800">
                      <span className="text-gray-400">Duplicate URLs:</span>
                      <div className={`text-2xl font-bold mt-1 font-mono ${
                        previewSummary.duplicateUrlsCount > 0 ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {previewSummary.duplicateUrlsCount}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        {previewSummary.duplicateUrlsCount > 0 ? "Flagged for deduplication" : "Zero cross-duplicates"}
                      </span>
                    </div>

                    <div className="bg-gray-950/80 p-3.5 rounded-lg border border-gray-800">
                      <span className="text-gray-400">Expected Finish Time:</span>
                      <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                        {previewSummary.formattedEta}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        ~{previewSummary.estimatedMinutes} mins ({previewSummary.estimatedHours} hrs)
                      </span>
                    </div>
                  </div>

                  {/* Throughput Specs */}
                  <div className="bg-gray-950/60 p-3.5 rounded-lg border border-gray-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-indigo-400" />
                      Polite Crawler Throughput:
                    </span>
                    <div className="flex items-center gap-4 text-indigo-300">
                      <span>{previewSummary.estimatedPagesPerHour} pages / hour</span>
                      <span>&bull;</span>
                      <span className="text-purple-300">{previewSummary.estimatedPagesPerDay.toLocaleString()} pages / day</span>
                      <span>&bull;</span>
                      <span className="text-gray-400">8s pause per page batch</span>
                    </div>
                  </div>

                  {/* First & Last URL Overall */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-950/80 p-3 rounded-lg border border-gray-800 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                        First Discovered URL (Overall)
                      </span>
                      <div className="text-indigo-400 font-mono text-[11px] truncate">
                        {previewSummary.firstUrl || "N/A"}
                      </div>
                    </div>
                    <div className="bg-gray-950/80 p-3 rounded-lg border border-gray-800 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                        Last Discovered URL (Overall)
                      </span>
                      <div className="text-indigo-400 font-mono text-[11px] truncate">
                        {previewSummary.lastUrl || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Per-Nested Sitemap Breakdown Table (Task 2.2) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Nested Sitemaps Breakdown ({previewSummary.nestedBreakdown.length} sitemaps)
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Per-sitemap counts, first and last URLs
                      </span>
                    </div>

                    <div className="rounded-lg border border-gray-800 overflow-hidden bg-gray-950">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                          <tr>
                            <th className="px-3.5 py-2.5">Sitemap Source URL</th>
                            <th className="px-3.5 py-2.5 text-right">Page Count</th>
                            <th className="px-3.5 py-2.5">First URL</th>
                            <th className="px-3.5 py-2.5">Last URL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                          {previewSummary.nestedBreakdown.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-900/40">
                              <td className="px-3.5 py-2 text-white truncate max-w-xs">{item.sitemapUrl}</td>
                              <td className="px-3.5 py-2 text-right text-indigo-300 font-bold">{item.pageCount}</td>
                              <td className="px-3.5 py-2 text-gray-400 truncate max-w-xs">{item.firstUrl || "-"}</td>
                              <td className="px-3.5 py-2 text-gray-400 truncate max-w-xs">{item.lastUrl || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Duplicate URLs Section (Task 2.2) */}
                  {previewSummary.duplicateUrlsCount > 0 && (
                    <div className="space-y-2 bg-amber-950/20 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-300">
                        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <h5 className="text-xs font-bold uppercase tracking-wider">
                          Duplicate URLs Detected ({previewSummary.duplicateUrlsCount} cross-sitemap duplicates)
                        </h5>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        These URLs exist in more than one sitemap. They are highlighted below and will be deduplicated so each page is only ingested and indexed once:
                      </p>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1 font-mono text-xs">
                        {previewSummary.duplicates.map((dup, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-950/90 border border-gray-800 p-2.5 rounded space-y-1"
                          >
                            <div className="flex items-center justify-between text-white text-[11px]">
                              <span className="truncate max-w-lg text-amber-200 font-semibold">{dup.url}</span>
                              <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                Found in {dup.occurrences} sitemaps
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-gray-400">
                              <span>Found in:</span>
                              {dup.foundIn.map((src, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="bg-gray-900 border border-gray-700 px-1.5 py-0.2 rounded text-indigo-300 truncate max-w-xs"
                                >
                                  {src}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmation Actions Bar (Task 2.2: User must confirm before processing starts) */}
                  <div className="flex items-center justify-between pt-3 border-t border-indigo-500/30">
                    <span className="text-xs text-gray-400 font-sans">
                      Click confirm to queue background crawler jobs across all discovered sitemaps.
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewSummary(null)}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs text-gray-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmIngest}
                        disabled={ingesting}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white transition shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{ingesting ? "Starting Ingestion..." : "Confirm & Start Processing"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Polite Crawl Monitor & Image Understanding (Task 2.3) */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Live Polite Ingestion Monitor (Task 2.3)</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Batching: 5 pages/batch &bull; Polite rate: 450 pages/hr with 8s pause &bull; Resumes halfway if interrupted.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2.5 py-1 text-xs font-mono font-bold uppercase flex items-center gap-1.5 border ${
                      crawlProgress?.status === "running"
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/40 animate-pulse"
                        : crawlProgress?.status === "paused"
                        ? "bg-amber-950/40 text-amber-300 border-amber-500/40"
                        : crawlProgress?.status === "completed"
                        ? "bg-indigo-950/40 text-indigo-300 border-indigo-500/40"
                        : "bg-gray-900 text-gray-400 border-gray-800"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current"></span>
                    <span>Status: {crawlProgress?.status || "idle"}</span>
                  </span>

                  <button
                    onClick={crawlProgress?.status === "running" ? handlePauseCrawl : handleResumeCrawl}
                    className="flex items-center gap-1 rounded bg-gray-800 hover:bg-gray-700 px-2.5 py-1 text-xs text-gray-200 transition font-mono border border-gray-700"
                  >
                    {crawlProgress?.status === "running" ? (
                      <>
                        <Pause className="h-3 w-3 text-amber-400" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 text-emerald-400" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSimulateBatchStep}
                    className="flex items-center gap-1 rounded bg-indigo-950/60 border border-indigo-500/30 hover:bg-indigo-900/60 px-2.5 py-1 text-xs text-indigo-300 transition font-mono"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Next Batch Step</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar & KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-gray-950/80 p-3 rounded-lg border border-gray-800">
                  <span className="text-gray-400">Pages Processed:</span>
                  <div className="text-xl font-bold text-white mt-1 font-mono">
                    {crawlProgress?.processedUrls || 0} / {crawlProgress?.totalUrls || 0}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    {crawlProgress?.skippedUrls || 0} skipped (already read)
                  </span>
                </div>

                <div className="bg-gray-950/80 p-3 rounded-lg border border-gray-800">
                  <span className="text-gray-400">Time Left (Polite 450/hr):</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {crawlProgress?.formattedTimeLeft || "0 mins left"}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    {crawlProgress?.elapsedSeconds || 0}s elapsed
                  </span>
                </div>

                <div className="bg-gray-950/80 p-3 rounded-lg border border-gray-800">
                  <span className="text-gray-400">Multimodal Screenshots:</span>
                  <div className="text-xl font-bold text-purple-400 mt-1 font-mono">
                    {crawlProgress?.imagesDiscovered || 0}
                  </div>
                  <span className="text-[10px] text-purple-300 mt-0.5 block">
                    Visual descriptions grounded
                  </span>
                </div>

                <div className="bg-gray-950/80 p-3 rounded-lg border border-gray-800">
                  <span className="text-gray-400">Semantic Chunks:</span>
                  <div className="text-xl font-bold text-sky-400 mt-1 font-mono">
                    {crawlProgress?.chunksCreated || 0}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    With attached image metadata
                  </span>
                </div>
              </div>

              {/* Progress Visual Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>Crawl Completion</span>
                  <span>{crawlProgress?.progressPercent || 0}%</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden border border-gray-800">
                  <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${crawlProgress?.progressPercent || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Page Indicator */}
              {crawlProgress?.currentUrl && (
                <div className="flex items-center gap-2 text-xs font-mono bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-gray-300">
                  <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping flex-shrink-0"></div>
                  <span className="text-gray-500">Currently Reading:</span>
                  <span className="text-indigo-300 truncate">{crawlProgress.currentUrl}</span>
                </div>
              )}

              {/* Multimodal Screenshot Activity Stream */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-gray-400 block">Recent Ingestion &amp; Screenshot Activity:</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs font-mono">
                  {crawlProgress?.recentActivity && crawlProgress.recentActivity.length > 0 ? (
                    crawlProgress.recentActivity.slice(0, 5).map((act, i) => (
                      <div
                        key={i}
                        className="bg-gray-950 border border-gray-800 p-2 rounded flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-gray-500 text-[10px]">{act.timestamp}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                              act.status === "ok"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                                : act.status === "skipped"
                                ? "bg-gray-900 text-gray-400 border border-gray-800"
                                : "bg-red-950 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {act.status}
                          </span>
                          <span className="text-white truncate">{act.title || act.url}</span>
                        </div>
                        <span className="text-purple-300 text-[10px] flex-shrink-0">{act.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-xs italic p-2 bg-gray-950 rounded border border-gray-800">
                      Crawl monitor idle. Confirm sitemaps above or click &quot;Next Batch Step&quot; to initiate live polite reading.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ingested Sources Table */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Active Knowledge Sources</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Sitemaps continuously polled and monitored for updates.</p>
                </div>
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

        {/* ================= TAB 2: PAGE URLS (Task 2.1 & 2.2) ================= */}
        {activeTab === "pages" && (
          <div className="space-y-6">
            {/* Add Standalone Page URL Form */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Add Standalone Page URL</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Single pages added one by one, without a sitemap. Read, kept fresh, and health-checked the same way as sitemap pages.
                  </p>
                </div>
                <span className="text-[10px] bg-sky-950/60 text-sky-300 px-2 py-0.5 rounded border border-sky-500/20 font-mono">
                  Attribution: [page_url]
                </span>
              </div>

              {singlePageSuccessMsg && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{singlePageSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleAddSinglePage} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Page URL *</label>
                    <input
                      type="url"
                      required
                      value={singlePageUrl}
                      onChange={(e) => setSinglePageUrl(e.target.value)}
                      placeholder="https://example.com/standalone-article"
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Article Title (Optional)</label>
                    <input
                      type="text"
                      value={singlePageTitle}
                      onChange={(e) => setSinglePageTitle(e.target.value)}
                      placeholder="e.g. Setting up Custom Webhooks"
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Page Content / Summary (Optional)</label>
                  <textarea
                    rows={2}
                    value={singlePageContent}
                    onChange={(e) => setSinglePageContent(e.target.value)}
                    placeholder="Paste article body or documentation text to index immediately..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingSinglePage || !singlePageUrl.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{addingSinglePage ? "Indexing Page..." : "Index Standalone Page"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Ingested Pages & Chunk Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5 Cols): Pages List */}
              <div className="lg:col-span-5 rounded-xl border border-gray-800 bg-[#0E1322] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h3 className="text-sm font-semibold text-white">Indexed Pages</h3>
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
                          ? "border-sky-500 bg-sky-950/20"
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
                      <span className="text-[10px] uppercase font-semibold text-sky-400 tracking-wider">
                        Page Semantic Chunk Inspector (400 Tokens)
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">{selectedPage.title}</h3>
                      <a
                        href={selectedPage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
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
                            <span className="text-sky-300 font-semibold">{chunk.heading}</span>
                            <span>Chunk #{chunk.chunkIndex + 1} &bull; 1536-dim vector</span>
                          </div>
                          <p className="text-gray-300 font-sans leading-relaxed">{chunk.content}</p>

                          {chunk.imageUrl && (
                            <div className="mt-2.5 rounded-lg border border-purple-500/30 bg-purple-950/20 p-2.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-[10px] uppercase font-mono">
                                <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                                <span>Multimodal Screenshot Understood &amp; Grounded:</span>
                              </div>
                              <div className="text-[11px] text-gray-200 italic font-sans bg-gray-900/80 p-2 rounded border border-gray-800">
                                {chunk.imageCaption || "Visual screenshot part of the answer."}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono truncate">
                                Image URL: {chunk.imageUrl}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-gray-500 text-xs">
                    Select a page on the left to inspect its semantic chunks.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: INSTRUCTIONS (Task 2.1 & 2.5) ================= */}
        {activeTab === "instructions" && (
          <div className="space-y-6">
            {/* Create Instruction Form */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Create Plain-English Rule</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Written by people to guide agent behavior. Example: &quot;Never promise a refund. Send every refund question to the Billing team.&quot;
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  Attribution: [instruction]
                </span>
              </div>

              {instructionSuccessMsg && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{instructionSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateInstruction} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Instruction Title *</label>
                    <input
                      type="text"
                      required
                      value={newInstTitle}
                      onChange={(e) => setNewInstTitle(e.target.value)}
                      placeholder="e.g. Refund Policy Guidance"
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Applies to Role</label>
                    <select
                      value={newInstRole}
                      onChange={(e) => setNewInstRole(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Roles</option>
                      <option value="support-engineer">Support Engineer only</option>
                      <option value="support-executive">Support Executive only</option>
                      <option value="ai-consultant">AI Consultant only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rule Text (Plain English) *</label>
                  <textarea
                    rows={2}
                    required
                    value={newInstRuleText}
                    onChange={(e) => setNewInstRuleText(e.target.value)}
                    placeholder="Never promise a refund. Send every refund question to the Billing team for human approval."
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingInstruction || !newInstTitle.trim() || !newInstRuleText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{savingInstruction ? "Saving..." : "Add Instruction Rule"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Active Instructions Table */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Active Business Instructions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Rules injected into consultant grounding turn based on role targeting.</p>
                </div>
                <span className="text-xs text-gray-400 font-mono">{instructionsList.length} rules active</span>
              </div>

              <div className="divide-y divide-gray-800/60">
                {instructionsList.map((inst) => (
                  <div key={inst.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-900/40 transition">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{inst.title}</span>
                        <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 border border-emerald-500/20">
                          {inst.appliesToRoles.join(", ")}
                        </span>
                        {!inst.isActive && (
                          <span className="rounded bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 font-sans leading-relaxed">{inst.ruleText}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleInstruction(inst)}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded transition border ${
                          inst.isActive
                            ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                            : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40"
                        }`}
                      >
                        {inst.isActive ? "Pause" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteInstruction(inst.id)}
                        className="text-gray-500 hover:text-red-400 p-1.5 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SKILLS (Task 2.1 & 2.5) ================= */}
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
                  Step-by-step guides the agent follows for one kind of work. People can write skills, and the agent can draft and improve them.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                  Attribution: [skill]
                </span>
                <button
                  onClick={handleAutoDraftSkill}
                  disabled={draftingSkill}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{draftingSkill ? "Clustering Pages..." : "Auto-Draft Skill from Pages"}</span>
                </button>
              </div>
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
                          ? "border-purple-500 bg-purple-950/20"
                          : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{s.name}</div>
                      <div className="text-[10px] text-gray-400 line-clamp-2 mt-1">{s.description}</div>
                      <span className="mt-2 inline-block rounded bg-purple-500/10 text-purple-400 text-[9px] font-mono px-1.5 py-0.2 border border-purple-500/20">
                        {s.slug}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (8 Cols): Skill Step Viewer */}
              <div className="lg:col-span-8 rounded-xl border border-gray-800 bg-[#0E1322] p-6 space-y-4">
                {selectedSkill ? (
                  <>
                    <div className="border-b border-gray-800 pb-3">
                      <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">
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

        {/* ================= TAB 5: PAST EMAILS (Task 2.1 & 2.6) ================= */}
        {activeTab === "emails" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Gmail Threads &amp; Human Teaching Notes</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real email threads from connected Gmail with notes from staff that teach the consultant agent.
                </p>
              </div>
              <span className="text-[10px] bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                Attribution: [past_email]
              </span>
            </div>

            {notesSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{notesSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5 Cols): Email Threads List */}
              <div className="lg:col-span-5 rounded-xl border border-gray-800 bg-[#0E1322] p-4 space-y-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Synced Gmail Threads
                </span>

                <div className="space-y-2">
                  {emailThreadsList.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedThread(t);
                        setThreadNotes(t.notes || "");
                      }}
                      className={`cursor-pointer rounded-lg p-3 transition border ${
                        selectedThread?.id === t.id
                          ? "border-amber-500 bg-amber-950/20"
                          : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                      }`}
                    >
                      <div className="text-xs font-semibold text-white truncate">{t.subject}</div>
                      <div className="text-[10px] text-gray-400 line-clamp-2 mt-1">{t.snippet}</div>
                      {t.notes && (
                        <div className="mt-2 text-[10px] text-amber-400 font-mono bg-amber-950/30 border border-amber-500/20 p-1.5 rounded truncate">
                          Staff Note: {t.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (7 Cols): Thread Details & Staff Teaching Notes */}
              <div className="lg:col-span-7 rounded-xl border border-gray-800 bg-[#0E1322] p-6 space-y-4">
                {selectedThread ? (
                  <>
                    <div className="border-b border-gray-800 pb-3">
                      <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">
                        Thread Detail &bull; {selectedThread.gmailThreadId}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">{selectedThread.subject}</h3>
                      <p className="text-xs text-gray-400 mt-1">{selectedThread.snippet}</p>
                    </div>

                    {/* Messages in thread */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-gray-400 block">Thread Excerpts:</span>
                      {selectedThread.messages?.map((m) => (
                        <div key={m.id} className="rounded-lg border border-gray-800 bg-gray-950 p-3 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                            <span>From: {m.fromAddress}</span>
                            <span>{new Date(m.sentAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-200">{m.bodyText}</p>
                        </div>
                      ))}
                    </div>

                    {/* Teach Agent Notes Editor */}
                    <div className="pt-2 space-y-2">
                      <label className="block text-xs font-semibold text-amber-300">
                        Staff Teaching Notes (Teaches the Agent):
                      </label>
                      <textarea
                        rows={3}
                        value={threadNotes}
                        onChange={(e) => setThreadNotes(e.target.value)}
                        placeholder="e.g. Customer forgot to set Full Strict SSL in Cloudflare. Always remind customers to switch from Flexible to Full (Strict)."
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-sans"
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveThreadNotes}
                          disabled={savingNotes}
                          className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>{savingNotes ? "Saving Notes..." : "Save Teaching Notes"}</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-gray-500 text-xs">
                    Select an email thread on the left to inspect and annotate notes.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: SEARCH & HEALTH SANDBOX (Task 2.3 & 2.4) ================= */}
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
                    setSearchQuery("What is your refund policy?");
                    executeSearch("What is your refund policy?");
                  }}
                  className="rounded bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40 px-2.5 py-1 text-emerald-300 font-mono text-[11px]"
                >
                  Refund Policy (Instruction)
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
                      {res.attributionBadge && (
                        <span
                          className={`rounded font-mono font-bold text-[10px] px-2 py-0.5 uppercase ${
                            res.attributionBadge === "[instruction]"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : res.attributionBadge === "[skill]"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : res.attributionBadge === "[past_email]"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : res.attributionBadge === "[page_url]"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}
                        >
                          {res.attributionBadge}
                        </span>
                      )}
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

            {/* URL Health Lifecycle Section */}
            <div className="mt-8 pt-6 border-t border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">URL Health Lifecycle &amp; Quarantine State Machine</h3>
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

              {healthSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-emerald-500/30 bg-[#0E1322] p-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Active (Healthy)</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                      {healthSummary.active}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/30 bg-[#0E1322] p-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Watch (1 Fail)</span>
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                      {healthSummary.watch}
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-500/30 bg-[#0E1322] p-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Quarantined</span>
                      <ShieldAlert className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="text-2xl font-bold text-red-400 mt-1 font-mono">
                      {healthSummary.quarantined}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Archived</span>
                      <Layers className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-400 mt-1 font-mono">
                      {healthSummary.archived}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
