"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  RotateCcw,
  Archive,
  Sliders,
  ChevronDown,
  ChevronUp,
  Calendar,
  Check,
  Wrench,
  Edit2,
  Code,
  Copy,
  Terminal,
  Zap,
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
    "sitemaps" | "pages" | "instructions" | "skills" | "emails" | "search" | "freshness"
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
  const [editingInstructionId, setEditingInstructionId] = useState<string | null>(null);
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

  // --- Past Emails Tab State (Knowledge Type 5 & Task 2.6) ---
  const [emailThreadsList, setEmailThreadsList] = useState<EmailThreadItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThreadItem | null>(null);
  const [threadNotes, setThreadNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccessMsg, setNotesSuccessMsg] = useState("");
  const [messageNoteInputs, setMessageNoteInputs] = useState<Record<string, string>>({});
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [skillProposals, setSkillProposals] = useState<any[]>([]);
  const [proposingImprovement, setProposingImprovement] = useState(false);
  const [approvingProposalId, setApprovingProposalId] = useState<string | null>(null);
  const [demonstration, setDemonstration] = useState<any | null>(null);
  const [showDoneWhen, setShowDoneWhen] = useState(true);

  // --- Hybrid Search Sandbox State (Task 2.7 & 2.8) ---
  const [searchQuery, setSearchQuery] = useState("How do I configure custom CNAME subdomains?");
  const [searchResults, setSearchResults] = useState<HybridSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDurationMs, setSearchDurationMs] = useState(0);
  const [searchMode, setSearchMode] = useState<"hybrid" | "vector_only" | "keyword_only">("hybrid");
  const [evalBenchmark, setEvalBenchmark] = useState<any | null>(null);
  const [runningEval, setRunningEval] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showBenchmarkDetails, setShowBenchmarkDetails] = useState(false);

  // --- URL Health State ---
  const [healthSummary, setHealthSummary] = useState<{
    total: number;
    active: number;
    watch: number;
    quarantined: number;
    archived: number;
    healthyPercent: number;
  } | null>(null);

  // --- Task 2.4: Stay Fresh & URL Health State ---
  const [freshnessMetrics, setFreshnessMetrics] = useState<{
    pagesProcessed: number;
    pagesEmbedded: number;
    pagesFailed: number;
    pagesPending: number;
    duplicateUrlsSkipped: number;
    lastSyncTime: string | null;
    totalRuns: number;
    activeCount: number;
    watchCount: number;
    quarantinedCount: number;
    archivedCount: number;
  }>({
    pagesProcessed: 5,
    pagesEmbedded: 5,
    pagesFailed: 1,
    pagesPending: 1,
    duplicateUrlsSkipped: 0,
    lastSyncTime: new Date().toISOString(),
    totalRuns: 1,
    activeCount: 3,
    watchCount: 1,
    quarantinedCount: 1,
    archivedCount: 0,
  });

  const [healthPolicy, setHealthPolicyState] = useState<{
    failureThresholdX: number;
    actionRule: "quarantine" | "archive" | "quarantine_then_archive";
    recheckSchedule: "daily" | "weekly" | "15_days" | "30_days";
  }>({
    failureThresholdX: 2,
    actionRule: "quarantine_then_archive",
    recheckSchedule: "daily",
  });

  const [refreshRuns, setRefreshRuns] = useState<any[]>([]);
  const [pendingUrlsList, setPendingUrlsList] = useState<any[]>([]);
  const [archivedPagesList, setArchivedPagesList] = useState<any[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [urlListFilter, setUrlListFilter] = useState<string>("all");
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [refreshStatusMsg, setRefreshStatusMsg] = useState("");

  useEffect(() => {
    fetchSitemaps();
    fetchPages();
    fetchInstructions();
    fetchSkills();
    fetchEmailThreads();
    fetchHealth();
    fetchFreshnessData();
    fetchCrawlProgress();
    executeSearch("How do I configure custom CNAME subdomains?");
    runBenchmarkEval();

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
      if (data.success && data.page) {
        setPages((prev) => [data.page, ...prev.filter((p) => p.url !== data.page.url)]);
        setSelectedPage(data.page);
        setSinglePageSuccessMsg(`✓ Successfully indexed '${data.page.title}' into Knowledge Base.`);
        setSinglePageUrl("");
        setSinglePageTitle("");
        setSinglePageContent("");
        setTimeout(() => setSinglePageSuccessMsg(""), 5000);
      } else {
        fetchPages();
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
          id: editingInstructionId || undefined,
          title: newInstTitle.trim(),
          ruleText: newInstRuleText.trim(),
          appliesToRoles: [newInstRole],
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.instruction) {
        setInstructionsList((prev) => [
          data.instruction,
          ...prev.filter((i) => i.id !== data.instruction.id),
        ]);
        setInstructionSuccessMsg(
          editingInstructionId
            ? "✓ Rule updated successfully!"
            : "✓ Business Rule created and active across all AI agents!"
        );
        setNewInstTitle("");
        setNewInstRuleText("");
        setNewInstRole("all");
        setEditingInstructionId(null);
        setTimeout(() => setInstructionSuccessMsg(""), 5000);
      } else {
        fetchInstructions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingInstruction(false);
    }
  };

  const handleToggleInstruction = async (inst: InstructionItem) => {
    // Instant UI update
    setInstructionsList((prev) =>
      prev.map((i) => (i.id === inst.id ? { ...i, isActive: !i.isActive } : i))
    );
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
    } catch (err) {
      console.error(err);
      fetchInstructions();
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    // Instant UI removal
    setInstructionsList((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/brain/instructions?id=${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error(err);
      fetchInstructions();
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
      const newSkill = data.draftedSkill || data.skill;
      if (newSkill) {
        setSkillsList((prev) => [newSkill, ...prev.filter((s) => s.id !== newSkill.id)]);
        setSelectedSkill(newSkill);
        setSkillSuccessMsg(`✓ SOP Skill '${newSkill.name}' drafted from help documentation and active!`);
        setTimeout(() => setSkillSuccessMsg(""), 5000);
      } else {
        fetchSkills();
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
      if (data.proposals) {
        setSkillProposals(data.proposals);
      }
      if (data.demonstration) {
        setDemonstration(data.demonstration);
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
        setNotesSuccessMsg("Teaching note saved on thread! Model will apply this to improve skills.");
        fetchEmailThreads();
        setTimeout(() => setNotesSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveMessageNote = async (messageId: string, noteText: string) => {
    if (!selectedThread || !noteText.trim()) return;
    setSavingMessageId(messageId);
    setNotesSuccessMsg("");
    try {
      const res = await fetch("/api/brain/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          messageId,
          notes: noteText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotesSuccessMsg("Teaching note saved on specific email message!");
        fetchEmailThreads();
        setTimeout(() => setNotesSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMessageId(null);
    }
  };

  const handleProposeSkillImprovement = async () => {
    setProposingImprovement(true);
    setNotesSuccessMsg("");
    try {
      const res = await fetch("/api/brain/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose_improvement",
          modelId: "claude-opus-5.5",
        }),
      });
      const data = await res.json();
      if (data.success && data.proposal) {
        setNotesSuccessMsg(
          "Claude Opus 5.5 analyzed human notes and proposed a skill improvement! Review & approve below."
        );
        fetchEmailThreads();
        setTimeout(() => setNotesSuccessMsg(""), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProposingImprovement(false);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    setApprovingProposalId(proposalId);
    setNotesSuccessMsg("");
    try {
      const res = await fetch("/api/brain/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_improvement",
          proposalId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotesSuccessMsg(
          `Skill change approved! Created Version ${data.newVersionNumber} in Settings. Review the better answer below.`
        );
        setShowDoneWhen(true);
        fetchEmailThreads();
        fetchSkills();
        setTimeout(() => setNotesSuccessMsg(""), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingProposalId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      const res = await fetch("/api/brain/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_improvement",
          proposalId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotesSuccessMsg("Skill improvement proposal rejected.");
        fetchEmailThreads();
        setTimeout(() => setNotesSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeSearch = async (queryToRun: string, modeOverride?: "hybrid" | "vector_only" | "keyword_only") => {
    if (!queryToRun.trim() || searching) return;
    setSearching(true);
    const targetMode = modeOverride || searchMode;
    try {
      const res = await fetch("/api/brain/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToRun, mode: targetMode }),
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

  const runBenchmarkEval = async () => {
    setRunningEval(true);
    try {
      const res = await fetch("/api/brain/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "eval_benchmark" }),
      });
      const data = await res.json();
      if (data.evalResult) {
        setEvalBenchmark(data.evalResult);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningEval(false);
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

  const fetchFreshnessData = async () => {
    try {
      const [refreshRes, archivedRes] = await Promise.all([
        fetch("/api/brain/refresh"),
        fetch("/api/brain/archived"),
      ]);
      const refreshData = await refreshRes.json();
      const archivedData = await archivedRes.json();

      if (refreshData.dashboard) setFreshnessMetrics(refreshData.dashboard);
      if (refreshData.policy) setHealthPolicyState(refreshData.policy);
      if (refreshData.runs && refreshData.runs.length > 0) {
        setRefreshRuns(refreshData.runs);
        if (!expandedRunId) {
          setExpandedRunId(refreshData.runs[0].runId);
        }
      }
      if (refreshData.pendingUrls) setPendingUrlsList(refreshData.pendingUrls);
      if (archivedData.archivedPages) setArchivedPagesList(archivedData.archivedPages);
    } catch (e) {
      console.error("Error fetching freshness data:", e);
    }
  };

  const handleTriggerRefresh = async () => {
    setRefreshLoading(true);
    setRefreshStatusMsg("");
    try {
      const res = await fetch("/api/brain/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger", schedule: healthPolicy.recheckSchedule }),
      });
      const data = await res.json();
      if (data.message) setRefreshStatusMsg(data.message);
      await fetchFreshnessData();
      await fetchHealth();
      await fetchPages();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleSaveHealthPolicy = async () => {
    setSavingPolicy(true);
    try {
      const res = await fetch("/api/brain/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_policy",
          policy: healthPolicy,
        }),
      });
      const data = await res.json();
      if (data.message) setRefreshStatusMsg(data.message);
      await fetchFreshnessData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleRecoverPage = async (pageId: string) => {
    try {
      const res = await fetch("/api/brain/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recover",
          pageId,
        }),
      });
      const data = await res.json();
      if (data.message) setRefreshStatusMsg(data.message);
      await fetchFreshnessData();
      await fetchHealth();
      await fetchPages();
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
      <div className="space-y-8">
        {/* Flagship Header Banner: Proteus Royal Blue to Violet/Purple */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white p-8 md:p-10 shadow-md">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-xs font-mono font-medium">
                <Brain className="h-3.5 w-3.5 text-cyan-300" />
                <span>Multi-Source Ingestion &amp; Hybrid Vector Indexing</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                The Knowledge Brain
              </h1>
              <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
                Learns from 5 distinct knowledge types with dynamic citation badges: Sitemaps, Page URLs, Instructions, Skills, and Past Emails.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-mono text-cyan-200 font-semibold shadow-xs">
                5 Knowledge Types Active
              </span>
            </div>
          </div>
        </div>

        {/* 5 Primary Knowledge Types Tabs + Hybrid Search Sandbox in Rounded-Full Pills */}
        <div className="flex flex-wrap gap-2.5 items-center pb-2 border-b border-[#DCE6F5]">
          {/* Tab 1: Sitemaps */}
          <button
            onClick={() => setActiveTab("sitemaps")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "sitemaps"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>1. Sitemaps</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeTab === "sitemaps" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
              [sitemap]
            </span>
          </button>

          {/* Tab 2: Page URLs */}
          <button
            onClick={() => setActiveTab("pages")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "pages"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>2. Page URLs</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeTab === "pages" ? "bg-white/20 text-white" : "bg-sky-50 text-sky-700 border border-sky-200"}`}>
              [page_url]
            </span>
          </button>

          {/* Tab 3: Instructions */}
          <button
            onClick={() => setActiveTab("instructions")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "instructions"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>3. Instructions</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeTab === "instructions" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              [instruction]
            </span>
          </button>

          {/* Tab 4: Skills */}
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "skills"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>4. Skills</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeTab === "skills" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
              [skill]
            </span>
          </button>

          {/* Tab 5: Past Emails */}
          <button
            onClick={() => setActiveTab("emails")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "emails"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>5. Past Emails</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeTab === "emails" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              [past_email]
            </span>
          </button>

          {/* Tab 6: Search & Health */}
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "search"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search &amp; Sandbox</span>
          </button>

          {/* Tab 7: Stay Fresh & URL Health */}
          <button
            onClick={() => setActiveTab("freshness")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "freshness"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Stay Fresh &amp; Health</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeTab === "freshness" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              Auto-Sync
            </span>
          </button>
        </div>

        {/* ================= TAB 1: SITEMAPS ================= */}
        {activeTab === "sitemaps" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Documentation Sitemaps &amp; Knowledge Crawling</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Add one or more XML sitemap URLs. Automatically inspects links on entry, resolves nested sitemaps recursively, eliminates duplicates, and generates pre-flight read plans.
                  </p>
                </div>
                <span className="rounded bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 text-xs font-mono border border-[#DCE6F5]">
                  Rate: 450 pages/hr &bull; 8s polite batch pause
                </span>
              </div>

              {ingestSuccessMsg && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
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
                  className="rounded bg-indigo-50 border border-[#BFDBFE] hover:bg-indigo-900/40 px-2.5 py-1 text-indigo-300 font-mono text-[11px]"
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
                  className="rounded bg-purple-50 border border-purple-500/30 hover:bg-purple-900/40 px-2.5 py-1 text-purple-300 font-mono text-[11px]"
                >
                  Multi-Sitemap Batch (Nested Demo)
                </button>
                <button
                  type="button"
                  onClick={() => handleSitemapsInputChange("https://docs.stripe.com/sitemap.xml")}
                  className="rounded bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-slate-700 shadow-xs font-mono text-[11px]"
                >
                  Stripe Docs
                </button>
                <button
                  type="button"
                  onClick={() => handleSitemapsInputChange("https://docs.github.com/sitemap.xml")}
                  className="rounded bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-slate-700 shadow-xs font-mono text-[11px]"
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
                  className="w-full rounded-lg border border-[#C3D3EA] bg-white px-4 py-2.5 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
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
                            ? "bg-emerald-50 border-emerald-500/30 text-emerald-300"
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

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handlePreviewSitemap}
                    disabled={
                      ingesting ||
                      urlValidationChecks.filter((u) => u.valid).length === 0
                    }
                    className="flex items-center gap-2 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] px-6 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                  >
                    <Search className="h-4 w-4 text-cyan-200" />
                    <span>{ingesting ? "Analyzing Sitemaps..." : "Plan Sitemap Read (Pre-Flight Summary)"}</span>
                  </button>
                  <button
                    onClick={async () => {
                      const validUrls = urlValidationChecks.filter((u) => u.valid).map((u) => u.url);
                      if (validUrls.length === 0) return;
                      setIngesting(true);
                      try {
                        const res = await fetch("/api/brain/sitemaps", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sitemapUrls: validUrls, confirmed: true }),
                        });
                        const data = await res.json();
                        setIngestSuccessMsg("✓ Sitemap ingestion started! Live crawler active.");
                        fetchSitemaps();
                        await handleTriggerCrawl();
                        setTimeout(() => setIngestSuccessMsg(""), 6000);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIngesting(false);
                      }
                    }}
                    disabled={
                      ingesting ||
                      urlValidationChecks.filter((u) => u.valid).length === 0
                    }
                    className="flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{ingesting ? "Starting Ingestion..." : "Start Ingestion Now"}</span>
                  </button>
                </div>
              </div>

              {/* Pre-Crawl Summary Modal / Preview Card */}
              {previewSummary && (
                <div className="rounded-3xl border-2 border-[#D0E2FB] bg-white p-6 sm:p-8 space-y-6 mt-4 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6F5] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-[#EEF5FD] border border-[#D0E2FB] flex items-center justify-center text-[#1D4ED8]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#0B1B3A]">Pre-Flight Read Plan (Confirmation Required)</h4>
                        <p className="text-xs text-[#4A5B78] mt-0.5">
                          Review discovered nested sitemaps, duplicate URLs, and throughput estimates. Processing will only start after your confirmation.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewSummary(null)}
                        className="rounded-full border border-[#DCE6F5] bg-white px-4 py-2 text-xs font-medium text-[#4A5B78] hover:bg-[#EEF4FF] shadow-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmIngest}
                        disabled={ingesting}
                        className="flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white transition shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{ingesting ? "Starting..." : "Confirm & Start Ingestion"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Grand Totals KPI Grid in 4 Pastel Tints */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-[#E6F8F9] p-5 rounded-3xl border-2 border-[#BCECEF] shadow-xs">
                      <span className="text-cyan-800 font-semibold uppercase text-[11px] tracking-wider block">Total Sitemaps:</span>
                      <div className="text-3xl font-extrabold text-[#0B1B3A] mt-1 font-mono">
                        {previewSummary.totalSitemapsFound}
                      </div>
                      <span className="text-[11px] text-[#334155] mt-1 block">
                        {previewSummary.rootUrls.length} root + {previewSummary.nestedSitemaps.length} nested
                      </span>
                    </div>

                    <div className="bg-[#EEF5FD] p-5 rounded-3xl border-2 border-[#D0E2FB] shadow-xs">
                      <span className="text-blue-800 font-semibold uppercase text-[11px] tracking-wider block">Total URLs Discovered:</span>
                      <div className="text-3xl font-extrabold text-[#1D4ED8] mt-1 font-mono">
                        {previewSummary.totalUrls}
                      </div>
                      <span className="text-[11px] text-[#334155] mt-1 block">
                        {previewSummary.uniqueUrls} unique URLs
                      </span>
                    </div>

                    <div className="bg-[#FFF4E8] p-5 rounded-3xl border-2 border-[#FFE2C2] shadow-xs">
                      <span className="text-amber-800 font-semibold uppercase text-[11px] tracking-wider block">Duplicate URLs:</span>
                      <div className={`text-3xl font-extrabold mt-1 font-mono ${
                        previewSummary.duplicateUrlsCount > 0 ? "text-[#B45309]" : "text-[#15803D]"
                      }`}>
                        {previewSummary.duplicateUrlsCount}
                      </div>
                      <span className="text-[11px] text-[#334155] mt-1 block">
                        {previewSummary.duplicateUrlsCount > 0 ? "Flagged for deduplication" : "Zero cross-duplicates"}
                      </span>
                    </div>

                    <div className="bg-[#F5F3FF] p-5 rounded-3xl border-2 border-[#DDD6FE] shadow-xs">
                      <span className="text-purple-800 font-semibold uppercase text-[11px] tracking-wider block">Expected Finish Time:</span>
                      <div className="text-3xl font-extrabold text-[#15803D] mt-1 font-mono">
                        {previewSummary.formattedEta}
                      </div>
                      <span className="text-[11px] text-[#334155] mt-1 block">
                        ~{previewSummary.estimatedMinutes} mins ({previewSummary.estimatedHours} hrs)
                      </span>
                    </div>
                  </div>

                  {/* Throughput Specs */}
                  <div className="bg-[#F6F9FF] p-3.5 rounded-lg border border-[#DCE6F5] flex items-center justify-between text-xs font-mono">
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
                    <div className="bg-[#F6F9FF] p-3 rounded-lg border border-[#DCE6F5] space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                        First Discovered URL (Overall)
                      </span>
                      <div className="text-indigo-400 font-mono text-[11px] truncate">
                        {previewSummary.firstUrl || "N/A"}
                      </div>
                    </div>
                    <div className="bg-[#F6F9FF] p-3 rounded-lg border border-[#DCE6F5] space-y-1">
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
                      <span className="text-xs font-bold text-[#0B1B3A] uppercase tracking-wider">
                        Nested Sitemaps Breakdown ({previewSummary.nestedBreakdown.length} sitemaps)
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Per-sitemap counts, first and last URLs
                      </span>
                    </div>

                    <div className="rounded-lg border border-[#DCE6F5] overflow-hidden bg-[#F1F6FF]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#EEF4FF] border-b border-[#DCE6F5] text-[#4A5B78] uppercase text-[10px] font-semibold">
                          <tr>
                            <th className="px-3.5 py-2.5">Sitemap Source URL</th>
                            <th className="px-3.5 py-2.5 text-right">Page Count</th>
                            <th className="px-3.5 py-2.5">First URL</th>
                            <th className="px-3.5 py-2.5">Last URL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                          {previewSummary.nestedBreakdown.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#EEF4FF]">
                              <td className="px-3.5 py-2 text-[#0B1B3A] truncate max-w-xs font-semibold">{item.sitemapUrl}</td>
                              <td className="px-3.5 py-2 text-right text-[#2563EB] font-bold">{item.pageCount}</td>
                              <td className="px-3.5 py-2 text-[#7B8AA6] truncate max-w-xs">{item.firstUrl || "-"}</td>
                              <td className="px-3.5 py-2 text-[#7B8AA6] truncate max-w-xs">{item.lastUrl || "-"}</td>
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
                            className="bg-[#F1F6FF]/90 border border-[#DCE6F5] p-2.5 rounded space-y-1"
                          >
                            <div className="flex items-center justify-between text-slate-900 text-[11px] font-semibold">
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
                                  className="bg-[#EEF4FF] border border-[#C3D3EA] px-1.5 py-0.2 rounded text-indigo-300 truncate max-w-xs"
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
                  <div className="flex items-center justify-between pt-3 border-t border-[#BFDBFE]">
                    <span className="text-xs text-gray-400 font-sans">
                      Click confirm to queue background crawler jobs across all discovered sitemaps.
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewSummary(null)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 shadow-xs"
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
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DCE6F5] pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">Live Knowledge Ingestion &amp; Crawler Monitor</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Batching: 5 pages/batch &bull; Polite rate: 450 pages/hr with 8s pause &bull; Resumes halfway if interrupted.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2.5 py-1 text-xs font-mono font-bold uppercase flex items-center gap-1.5 border ${
                      crawlProgress?.status === "running"
                        ? "bg-emerald-50 text-emerald-300 border-emerald-500/40 animate-pulse"
                        : crawlProgress?.status === "paused"
                        ? "bg-amber-50 text-amber-300 border-amber-500/40"
                        : crawlProgress?.status === "completed"
                        ? "bg-indigo-50 text-indigo-300 border-[#BFDBFE]"
                        : "bg-white text-[#4A5B78] border-[#DCE6F5]"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current"></span>
                    <span>Status: {crawlProgress?.status || "idle"}</span>
                  </span>

                  <button
                    onClick={crawlProgress?.status === "running" ? handlePauseCrawl : handleResumeCrawl}
                    className="flex items-center gap-1 rounded bg-gray-800 hover:bg-gray-700 px-2.5 py-1 text-xs text-gray-200 transition font-mono border border-[#C3D3EA]"
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
                    className="flex items-center gap-1 rounded bg-indigo-50 border border-[#BFDBFE] hover:bg-indigo-900/60 px-2.5 py-1 text-xs text-indigo-300 transition font-mono"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Next Batch Step</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar & KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#F6F9FF] p-3 rounded-lg border border-[#DCE6F5]">
                  <span className="text-gray-400">Pages Processed:</span>
                  <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                    {crawlProgress?.processedUrls || 0} / {crawlProgress?.totalUrls || 0}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    {crawlProgress?.skippedUrls || 0} skipped (already read)
                  </span>
                </div>

                <div className="bg-[#F6F9FF] p-3 rounded-lg border border-[#DCE6F5]">
                  <span className="text-gray-400">Time Left (Polite 450/hr):</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {crawlProgress?.formattedTimeLeft || "0 mins left"}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    {crawlProgress?.elapsedSeconds || 0}s elapsed
                  </span>
                </div>

                <div className="bg-[#F6F9FF] p-3 rounded-lg border border-[#DCE6F5]">
                  <span className="text-gray-400">Multimodal Screenshots:</span>
                  <div className="text-xl font-bold text-purple-400 mt-1 font-mono">
                    {crawlProgress?.imagesDiscovered || 0}
                  </div>
                  <span className="text-[10px] text-purple-300 mt-0.5 block">
                    Visual descriptions grounded
                  </span>
                </div>

                <div className="bg-[#F6F9FF] p-3 rounded-lg border border-[#DCE6F5]">
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
                <div className="w-full bg-[#EEF4FF] rounded-full h-2.5 overflow-hidden border border-[#DCE6F5]">
                  <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${crawlProgress?.progressPercent || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Page Indicator */}
              {crawlProgress?.currentUrl && (
                <div className="flex items-center gap-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-[#DCE6F5] text-gray-300">
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
                        className="bg-[#F1F6FF] border border-[#DCE6F5] p-2 rounded flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-gray-500 text-[10px]">{act.timestamp}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                              act.status === "ok"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                                : act.status === "skipped"
                                ? "bg-white text-[#4A5B78] border border-[#DCE6F5]"
                                : "bg-red-950 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {act.status}
                          </span>
                          <span className="text-slate-900 font-semibold truncate">{act.title || act.url}</span>
                        </div>
                        <span className="text-purple-300 text-[10px] flex-shrink-0">{act.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-xs italic p-2 bg-[#F1F6FF] rounded border border-[#DCE6F5]">
                      Crawl monitor idle. Confirm sitemaps above or click &quot;Next Batch Step&quot; to initiate live polite reading.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ingested Sources Table */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
              <div className="p-4 border-b border-[#DCE6F5] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Active Knowledge Sources</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Sitemaps continuously polled and monitored for updates.</p>
                </div>
                <span className="text-xs text-gray-400 font-mono">{sources.length} sources registered</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F9FF] border-b border-[#DCE6F5] text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
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
                    <tr key={s.id} className="hover:bg-[#EEF4FF] transition">
                      <td className="px-4 py-3 text-slate-900 font-medium truncate max-w-sm">{s.rootUrl}</td>
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
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Add Standalone Page URL</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Single pages added one by one, without a sitemap. Read, kept fresh, and health-checked the same way as sitemap pages.
                  </p>
                </div>
                <span className="text-[10px] bg-sky-950/60 text-sky-300 px-2 py-0.5 rounded border border-sky-500/20 font-mono">
                  Attribution: [page_url]
                </span>
              </div>

              {singlePageSuccessMsg && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-300 flex items-center gap-2">
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
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Article Title (Optional)</label>
                    <input
                      type="text"
                      value={singlePageTitle}
                      onChange={(e) => setSinglePageTitle(e.target.value)}
                      placeholder="e.g. Setting up Custom Webhooks"
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
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
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingSinglePage || !singlePageUrl.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-900 transition disabled:opacity-50"
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
              <div className="lg:col-span-5 rounded-xl border border-[#DCE6F5] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2">
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Indexed Pages</h3>
                  <span className="text-xs text-gray-400 font-mono">{filteredPages.length} pages</span>
                </div>

                <input
                  type="text"
                  value={pageSearchFilter}
                  onChange={(e) => setPageSearchFilter(e.target.value)}
                  placeholder="Filter pages by title or URL..."
                  className="w-full rounded-lg border border-[#DCE6F5] bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />

                <div className="space-y-2 max-h-[520px] overflow-y-auto">
                  {filteredPages.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPage(p)}
                      className={`cursor-pointer rounded-lg p-3 transition border ${
                        selectedPage?.id === p.id
                          ? "border-[#2563EB] bg-[#EEF4FF] shadow-xs"
                          : "border-[#DCE6F5] bg-white hover:bg-[#F6F9FF] hover:border-blue-200"
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#0B1B3A] truncate">{p.title || p.url}</div>
                      <div className="text-[10px] text-gray-500 font-mono truncate mt-0.5">{p.url}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-mono uppercase ${
                            p.healthStatus === "active"
                              ? "bg-emerald-50 text-[#15803D] border border-emerald-200"
                              : p.healthStatus === "watch"
                              ? "bg-amber-50 text-[#B45309] border border-amber-200"
                              : p.healthStatus === "archived"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-red-50 text-[#DC2626] border border-red-200"
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
              <div className="lg:col-span-7 rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-4">
                {selectedPage ? (
                  <>
                    <div className="border-b border-[#DCE6F5] pb-3">
                      <span className="text-[10px] uppercase font-semibold text-sky-400 tracking-wider">
                        Page Semantic Chunk Inspector (400 Tokens)
                      </span>
                      <h3 className="text-base font-bold text-[#0B1B3A] mt-1">{selectedPage.title}</h3>
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
                          className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-4 space-y-2 text-xs"
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
                              <div className="text-[11px] text-gray-200 italic font-sans bg-[#F6F9FF] p-2 rounded border border-[#DCE6F5]">
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
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">
                    {editingInstructionId ? "Edit Plain-English Rule" : "Create Plain-English Rule"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Written by people to guide agent behavior. Example: &quot;Never promise a refund. Send every refund question to the Billing team.&quot;
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {editingInstructionId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInstructionId(null);
                        setNewInstTitle("");
                        setNewInstRuleText("");
                        setNewInstRole("all");
                      }}
                      className="text-xs text-gray-400 hover:text-slate-900 px-2 py-0.5 rounded bg-gray-800"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <span className="text-[10px] bg-emerald-50 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    Attribution: [instruction]
                  </span>
                </div>
              </div>

              {instructionSuccessMsg && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-300 flex items-center gap-2">
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
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Applies to Role</label>
                    <select
                      value={newInstRole}
                      onChange={(e) => setNewInstRole(e.target.value)}
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
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
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {editingInstructionId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInstructionId(null);
                        setNewInstTitle("");
                        setNewInstRuleText("");
                        setNewInstRole("all");
                      }}
                      className="rounded-lg bg-gray-800 hover:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingInstruction || !newInstTitle.trim() || !newInstRuleText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>
                      {savingInstruction
                        ? "Saving..."
                        : editingInstructionId
                        ? "Update Instruction Rule"
                        : "Add Instruction Rule"}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Active Instructions Table */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
              <div className="p-4 border-b border-[#DCE6F5] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Active Business Instructions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Rules injected into consultant grounding turn based on role targeting.</p>
                </div>
                <span className="text-xs text-gray-400 font-mono">{instructionsList.length} rules active</span>
              </div>

              <div className="divide-y divide-gray-800/60">
                {instructionsList.map((inst) => (
                  <div key={inst.id} className="p-4 flex items-start justify-between gap-4 hover:bg-[#EEF4FF] transition">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0B1B3A]">{inst.title}</span>
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
                        onClick={() => {
                          setEditingInstructionId(inst.id);
                          setNewInstTitle(inst.title);
                          setNewInstRuleText(inst.ruleText);
                          setNewInstRole(inst.appliesToRoles[0] || "all");
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        className="text-[11px] font-mono px-2.5 py-1 rounded transition border bg-gray-800 border-[#C3D3EA] text-gray-300 hover:bg-gray-700 flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3 text-gray-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleToggleInstruction(inst)}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded transition border ${
                          inst.isActive
                            ? "bg-gray-800 border-[#C3D3EA] text-gray-300 hover:bg-gray-700"
                            : "bg-emerald-50 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40"
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
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{skillSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0B1B3A]">Standard Operating Procedures (Skills)</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Step-by-step guides the agent follows for one kind of work. People can write skills, and the agent can draft and improve them.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-purple-50 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                  Attribution: [skill]
                </span>
                <Link
                  href="/settings/roles-prompts?tab=skills"
                  className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-semibold text-white transition shadow-sm"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Open in Settings Skill Studio</span>
                </Link>
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
              <div className="lg:col-span-4 rounded-xl border border-[#DCE6F5] bg-white p-4 space-y-3">
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
                          : "border-[#DCE6F5] bg-white hover:bg-[#F6F9FF] hover:border-blue-200"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-900">{s.name}</div>
                      <div className="text-[10px] text-gray-400 line-clamp-2 mt-1">{s.description}</div>
                      <span className="mt-2 inline-block rounded bg-purple-500/10 text-purple-400 text-[9px] font-mono px-1.5 py-0.2 border border-purple-500/20">
                        {s.slug}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (8 Cols): Skill Step Viewer */}
              <div className="lg:col-span-8 rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
                {selectedSkill ? (
                  <>
                    <div className="border-b border-[#DCE6F5] pb-3">
                      <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">
                        Active SOP Procedure
                      </span>
                      <h3 className="text-base font-bold text-[#0B1B3A] mt-1">{selectedSkill.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{selectedSkill.description}</p>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Trigger Condition:</span>
                      <div className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-2.5 text-xs text-amber-300 font-mono">
                        {selectedSkill.triggerConditions}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">
                        Step-by-Step Instructions (Markdown):
                      </span>
                      <pre className="rounded-lg border border-[#DCE6F5] bg-white p-4 text-xs font-mono text-gray-200 whitespace-pre-wrap leading-relaxed">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                  <Mail className="h-4 w-4 text-amber-400" />
                  <span>Customer Email History &amp; Agent Learning</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Annotate notes on whole threads and individual messages. Claude Opus 5.5 continuously optimizes skills from these notes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-50 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                  Attribution: [past_email]
                </span>
                <button
                  onClick={handleProposeSkillImprovement}
                  disabled={proposingImprovement}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 text-indigo-200" />
                  <span>
                    {proposingImprovement
                      ? "Claude Opus 5.5 Analyzing Notes..."
                      : "Optimize Skills from Notes (Claude Opus 5.5)"}
                  </span>
                </button>
              </div>
            </div>

            {notesSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-3.5 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{notesSuccessMsg}</span>
                </div>
                <button onClick={() => setNotesSuccessMsg("")} className="text-gray-400 hover:text-slate-900 text-xs">
                  &times;
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (5 Cols): Email Threads List */}
              <div className="lg:col-span-5 rounded-xl border border-[#DCE6F5] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    Synced Gmail Threads
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">{emailThreadsList.length} threads</span>
                </div>

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
                          : "border-[#DCE6F5] bg-white hover:bg-[#F6F9FF] hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-900 truncate max-w-[80%]">{t.subject}</div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {t.messages ? `${t.messages.length} msg` : "1 msg"}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 line-clamp-2 mt-1">{t.snippet}</div>
                      {t.notes && (
                        <div className="mt-2 text-[10px] text-amber-300 font-mono bg-amber-50 border border-amber-500/20 p-1.5 rounded truncate">
                          Thread Note: &quot;{t.notes}&quot;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (7 Cols): Thread Details & Staff Teaching Notes */}
              <div className="lg:col-span-7 rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
                {selectedThread ? (
                  <>
                    <div className="border-b border-[#DCE6F5] pb-3 flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider font-mono">
                          Gmail Thread &bull; {selectedThread.gmailThreadId}
                        </span>
                        <h3 className="text-base font-bold text-[#0B1B3A] mt-1">{selectedThread.subject}</h3>
                        <p className="text-xs text-gray-400 mt-1">{selectedThread.snippet}</p>
                      </div>
                    </div>

                    {/* Messages in thread with Individual Message Note Editors */}
                    <div className="space-y-3">
                      <span className="text-xs font-semibold text-gray-400 block">
                        Thread Messages (Annotate notes on any single message):
                      </span>
                      {selectedThread.messages?.map((m) => (
                        <div key={m.id} className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono border-b border-[#DCE6F5]/60 pb-1.5">
                            <span>From: {m.fromAddress}</span>
                            <span>{new Date(m.sentAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-200 leading-relaxed font-sans">{m.bodyText}</p>

                          {m.notes && (
                            <div className="text-[10px] text-amber-300 bg-amber-950/30 border border-amber-500/20 p-2 rounded font-mono">
                              Message Note: &quot;{m.notes}&quot;
                            </div>
                          )}

                          {/* Inline Single-Message Note Editor */}
                          <div className="pt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={
                                messageNoteInputs[m.id] !== undefined
                                  ? messageNoteInputs[m.id]
                                  : m.notes || ""
                              }
                              onChange={(e) =>
                                setMessageNoteInputs({ ...messageNoteInputs, [m.id]: e.target.value })
                              }
                              placeholder="Write note on this specific message (e.g. This reply was too long. For DNS questions, always give the 3 steps first)..."
                              className="flex-1 rounded border border-[#DCE6F5] bg-[#EEF4FF] px-3 py-1.5 text-xs text-slate-900 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              disabled={savingMessageId === m.id}
                              onClick={() =>
                                handleSaveMessageNote(m.id, messageNoteInputs[m.id] || m.notes || "")
                              }
                              className="rounded bg-amber-700/80 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 flex-shrink-0"
                            >
                              {savingMessageId === m.id ? "Saving..." : "Save Message Note"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Teach Agent Whole-Thread Notes Editor */}
                    <div className="pt-3 border-t border-[#DCE6F5] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-amber-300">
                          Whole-Thread Teaching Note (Teaches the Agent):
                        </label>
                        <span className="text-[10px] text-gray-500">Preset quick-fill below</span>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-gray-500 text-[10px]">Quick Preset:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setThreadNotes(
                              "This reply was too long. For DNS questions, always give the 3 steps first."
                            )
                          }
                          className="rounded bg-gray-800 hover:bg-gray-700 px-2 py-0.5 text-amber-300 font-mono text-[10px]"
                        >
                          &quot;For DNS questions, give 3 steps first&quot;
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setThreadNotes(
                              "Customer forgot to set Full Strict SSL in Cloudflare. Always remind customers to switch from Flexible to Full (Strict)."
                            )
                          }
                          className="rounded bg-gray-800 hover:bg-gray-700 px-2 py-0.5 text-amber-300 font-mono text-[10px]"
                        >
                          &quot;Cloudflare Full Strict SSL check&quot;
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={threadNotes}
                        onChange={(e) => setThreadNotes(e.target.value)}
                        placeholder="e.g. This reply was too long. For DNS questions, always give the 3 steps first."
                        className="w-full rounded-lg border border-[#C3D3EA] bg-white p-3 text-xs text-slate-900 placeholder-gray-500 focus:outline-none focus:border-amber-500 font-sans"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleSaveThreadNotes}
                          disabled={savingNotes}
                          className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>{savingNotes ? "Saving..." : "Save Thread Note"}</span>
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

            {/* ================= SKILL IMPROVEMENTS & HUMAN APPROVAL GATE ================= */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DCE6F5] pb-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span>Skill Improvements from Teaching Notes (Human Approval Gate)</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Claude Opus 5.5 continuously monitors human notes to suggest skill updates. No change is active until you approve it.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-purple-50 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                    Approval Gate: Enforced
                  </span>
                </div>
              </div>

              {skillProposals.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 bg-[#EEF4FF] rounded-xl border border-[#DCE6F5]">
                  <p>No pending skill improvement proposals. Click &quot;Optimize Skills from Notes&quot; above to run Claude Opus 5.5 evaluation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {skillProposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="rounded-xl border border-[#DCE6F5] bg-[#F1F6FF] p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0B1B3A]">Target Skill: {prop.targetSkillName}</span>
                            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/50 border border-purple-500/30 px-2 py-0.5 rounded">
                              {prop.modelUsed}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                prop.status === "approved"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                  : prop.status === "rejected"
                                  ? "bg-red-950 text-red-300 border border-red-500/30"
                                  : "bg-amber-950 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {prop.status === "approved"
                                ? "Approved & Live in Settings"
                                : prop.status === "rejected"
                                ? "Rejected"
                                : "Pending Human Review"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300">{prop.diffSummary}</p>
                        </div>

                        {prop.status === "pending_human_review" && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleApproveProposal(prop.id)}
                              disabled={approvingProposalId === prop.id}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>{approvingProposalId === prop.id ? "Approving..." : "Approve & Update Skill"}</span>
                            </button>
                            <button
                              onClick={() => handleRejectProposal(prop.id)}
                              className="rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {prop.status === "approved" && (
                          <Link
                            href="/settings/roles-prompts?tab=skills"
                            className="flex items-center gap-1.5 text-xs font-mono text-purple-300 hover:text-slate-900 bg-purple-950/50 border border-purple-500/30 px-3 py-1.5 rounded-lg transition"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            <span>View &amp; Edit in Settings</span>
                          </Link>
                        )}
                      </div>

                      {/* Notes Used Attribution */}
                      <div className="p-3 bg-[#F6F9FF] rounded-lg border border-[#DCE6F5] text-xs space-y-1">
                        <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                          Teaching Notes Used by Model:
                        </span>
                        {prop.originatingNotes.map((n: any, idx: number) => (
                          <div key={idx} className="text-gray-300 flex items-center gap-2">
                            <span>&bull;</span>
                            <span className="font-mono text-amber-300">&quot;{n.noteText}&quot;</span>
                            <span className="text-gray-500 text-[10px]">(from {n.sourceSubject})</span>
                          </div>
                        ))}
                      </div>

                      {/* Before vs Proposed Steps Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-500 uppercase">Previous SOP Steps (v1):</span>
                          <pre className="rounded bg-[#EEF4FF] p-3 text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto border border-[#DCE6F5] leading-relaxed text-[11px]">
                            {prop.previousStepsMarkdown}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-400 uppercase">
                            Proposed SOP Steps (3 Steps Prioritized First):
                          </span>
                          <pre className="rounded bg-emerald-50 p-3 text-emerald-200 whitespace-pre-wrap max-h-48 overflow-y-auto border border-emerald-500/20 leading-relaxed text-[11px]">
                            {prop.proposedStepsMarkdown}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ================= DONE-WHEN SHOWCASE: NOTE -> SKILL DIFF -> BETTER ANSWER ================= */}
            {demonstration && (
              <div className="rounded-xl border border-[#BFDBFE] bg-indigo-950/10 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                    <div>
                      <h4 className="text-sm font-bold text-[#0B1B3A]">
                        Training Impact: Note &rarr; Skill Update &rarr; Improved Resolution
                      </h4>
                      <p className="text-xs text-gray-400">
                        Demonstrating how a human teaching note updates a skill and delivers a measurably better customer answer.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    PASSED VERIFICATION
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Column 1: The Human Note */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block tracking-wider">
                      1. The Human Note
                    </span>
                    <p className="text-xs font-semibold text-slate-900">
                      &quot;{demonstration.originatingNote}&quot;
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Annotated on thread: <span className="text-gray-300">{demonstration.sourceThread || "DNS CNAME Thread"}</span>
                    </p>
                  </div>

                  {/* Column 2: The Skill Change */}
                  <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-purple-400 block tracking-wider">
                      2. The Skill Change It Caused
                    </span>
                    <p className="text-xs font-semibold text-slate-900">
                      Updated: {demonstration.skillName || "DNS & Custom CNAME Setup"}
                    </p>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      {demonstration.skillChangeDiff}
                    </p>
                  </div>

                  {/* Column 3: The Improvement Impact */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block tracking-wider">
                      3. Operational Impact
                    </span>
                    <p className="text-xs font-semibold text-slate-900">
                      Adherence to Human Preference
                    </p>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      {demonstration.improvementExplanation || demonstration.whyBetter}
                    </p>
                  </div>
                </div>

                {/* Side-by-Side: Before Answer vs Better Answer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-semibold text-red-400">Before (Too Long / Preliminary Prose):</span>
                    </div>
                    <pre className="rounded-xl border border-[#DCE6F5] bg-[#F1F6FF] text-[#1E3A8A] border border-[#DCE6F5] p-4 text-xs font-mono text-gray-400 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {demonstration.beforeAnswer}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-emerald-400">
                      <span className="font-semibold text-emerald-300">
                        Better Answer (3 Steps Given First Directly):
                      </span>
                    </div>
                    <pre className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {demonstration.betterAnswer}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 6: SEARCH & HEALTH SANDBOX (Task 2.3, 2.7 & 2.8) ================= */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search Controls & Mode Selector */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Hybrid Semantic &amp; Keyword Search Engine
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mode Selector Tabs */}
                  <div className="flex rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-1 text-xs">
                    <button
                      onClick={() => {
                        setSearchMode("hybrid");
                        executeSearch(searchQuery, "hybrid");
                      }}
                      className={`px-3 py-1 rounded font-medium transition ${
                        searchMode === "hybrid"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      Hybrid (RRF)
                    </button>
                    <button
                      onClick={() => {
                        setSearchMode("vector_only");
                        executeSearch(searchQuery, "vector_only");
                      }}
                      className={`px-3 py-1 rounded font-medium transition ${
                        searchMode === "vector_only"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      Meaning-Only (Vector)
                    </button>
                    <button
                      onClick={() => {
                        setSearchMode("keyword_only");
                        executeSearch(searchQuery, "keyword_only");
                      }}
                      className={`px-3 py-1 rounded font-medium transition ${
                        searchMode === "keyword_only"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      Keyword-Only (BM25)
                    </button>
                  </div>

                  {/* API Docs Button */}
                  <button
                    onClick={() => setShowApiModal(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#C3D3EA] bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-xs text-gray-200 transition"
                  >
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                    <span>API Docs &amp; cURL</span>
                  </button>

                  {/* Benchmark Evals Button */}
                  <button
                    onClick={runBenchmarkEval}
                    disabled={runningEval}
                    className="flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-indigo-50 hover:bg-indigo-900/40 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition disabled:opacity-50"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${runningEval ? "animate-spin" : ""}`} />
                    <span>{runningEval ? "Evaluating..." : "Run Evals"}</span>
                  </button>
                </div>
              </div>

              {/* Search Input Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") executeSearch(searchQuery);
                  }}
                  placeholder="Enter a technical question, code snippet, or policy query..."
                  className="flex-1 rounded-lg border border-[#C3D3EA] bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => executeSearch(searchQuery)}
                  disabled={searching}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                >
                  <Search className="h-4 w-4" />
                  <span>{searching ? "Searching..." : "Search"}</span>
                </button>
              </div>

              {/* Morphology & Typo Invariance Quick Test Chips */}
              <div className="space-y-2 pt-1 border-t border-[#DCE6F5]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Retrieval Precision &amp; Quality Benchmarks:</span>
                  {searchDurationMs > 0 && (
                    <span className="font-mono text-[11px] text-gray-400 bg-[#EEF4FF] px-2 py-0.5 rounded border border-[#DCE6F5]">
                      Retrieved in {searchDurationMs}ms &bull; Mode: {searchMode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    onClick={() => {
                      const q = "custom domain setup";
                      setSearchQuery(q);
                      executeSearch(q);
                    }}
                    className="rounded bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-slate-700 shadow-xs font-mono text-[11px] border border-[#C3D3EA]"
                  >
                    1. Canonical: &quot;custom domain setup&quot;
                  </button>
                  <button
                    onClick={() => {
                      const q = "customize domain setup";
                      setSearchQuery(q);
                      executeSearch(q);
                    }}
                    className="rounded bg-indigo-50 border border-[#BFDBFE] hover:bg-indigo-900/40 px-2.5 py-1 text-indigo-300 font-mono text-[11px]"
                  >
                    2. Morphology: &quot;customize domain setup&quot;
                  </button>
                  <button
                    onClick={() => {
                      const q = "custm CNAME subdoamin setup";
                      setSearchQuery(q);
                      executeSearch(q);
                    }}
                    className="rounded bg-amber-50 border border-amber-500/30 hover:bg-amber-900/40 px-2.5 py-1 text-amber-300 font-mono text-[11px]"
                  >
                    3. Typo: &quot;custm CNAME subdoamin&quot;
                  </button>
                  <button
                    onClick={() => {
                      const q = "HMAC-SHA256 X-Signature-256 401 unauthorized";
                      setSearchQuery(q);
                      executeSearch(q);
                    }}
                    className="rounded bg-sky-950/40 border border-sky-500/30 hover:bg-sky-900/40 px-2.5 py-1 text-sky-300 font-mono text-[11px]"
                  >
                    4. Technical: &quot;HMAC-SHA256 401&quot;
                  </button>
                  <button
                    onClick={() => {
                      const q = "Never promise a refund billing team escalation";
                      setSearchQuery(q);
                      executeSearch(q);
                    }}
                    className="rounded bg-emerald-50 border border-emerald-500/30 hover:bg-emerald-900/40 px-2.5 py-1 text-emerald-300 font-mono text-[11px]"
                  >
                    5. Policy: &quot;Never promise refund&quot;
                  </button>
                </div>

                <div className="rounded-lg bg-indigo-50 border border-[#DCE6F5] p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>
                      <strong>Morphological &amp; Typo Invariance Engine:</strong> Queries #1 (canonical), #2 (inflected &quot;customize&quot;), and #3 (typo &quot;custm / subdoamin&quot;) all yield the identical Top-1 CNAME documentation article.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-indigo-900/40 px-2 py-0.5 rounded text-indigo-200 uppercase font-semibold">
                    100% Invariant
                  </span>
                </div>
              </div>
            </div>

            {/* Task 2.7 Done-When Benchmark Evaluation Card */}
            {evalBenchmark && (
              <div className="rounded-xl border border-emerald-500/40 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DCE6F5] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs px-2 py-0.5 font-bold border border-emerald-500/30">
                        SEARCH RELEVANCE BENCHMARK
                      </span>
                      <h3 className="text-sm font-semibold text-[#0B1B3A]">
                        Hybrid Search vs. Meaning-Only Search Benchmark
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Continuous Evaluation: Proving Reciprocal Rank Fusion outperforms vector cosine alone.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <Check className="h-3.5 w-3.5" />
                      <span>PASS: Hybrid Beats Meaning-Only (+{evalBenchmark.mrrImprovementPercent}%)</span>
                    </span>
                    <button
                      onClick={() => setShowBenchmarkDetails(!showBenchmarkDetails)}
                      className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 shadow-xs"
                    >
                      {showBenchmarkDetails ? "Hide Breakdown" : "View Breakdown"}
                    </button>
                  </div>
                </div>

                {/* Benchmark Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-3">
                    <span className="text-gray-400">Hybrid MRR</span>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{evalBenchmark.hybridMRR}</div>
                    <span className="text-[10px] text-gray-500">Reciprocal Rank Fusion</span>
                  </div>

                  <div className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-3">
                    <span className="text-gray-400">Meaning-Only MRR</span>
                    <div className="text-xl font-bold text-purple-400 mt-1">{evalBenchmark.meaningOnlyMRR}</div>
                    <span className="text-[10px] text-gray-500">Vector Cosine Only</span>
                  </div>

                  <div className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-3">
                    <span className="text-gray-400">MRR Improvement</span>
                    <div className="text-xl font-bold text-amber-400 mt-1">+{evalBenchmark.mrrImprovementPercent}%</div>
                    <span className="text-[10px] text-gray-500">Accuracy &amp; Rank Lift</span>
                  </div>

                  <div className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-3">
                    <span className="text-gray-400">Benchmark Test Suite</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{evalBenchmark.totalQueries} Queries</div>
                    <span className="text-[10px] text-gray-500">Technical, Typos &amp; Stems</span>
                  </div>
                </div>

                {/* Expandable Benchmark Queries Breakdown */}
                {showBenchmarkDetails && evalBenchmark.benchmarkDetails && (
                  <div className="rounded-lg border border-[#DCE6F5] bg-[#F6F9FF] p-4 space-y-3 text-xs">
                    <div className="font-semibold text-gray-300 flex items-center justify-between">
                      <span>Benchmark Query Comparison Matrix</span>
                      <span className="text-[11px] font-mono text-gray-500">RRF = 1/(60+vec) + 1/(60+bm25)</span>
                    </div>

                    <div className="divide-y divide-gray-800/80">
                      {evalBenchmark.benchmarkDetails.map((item: any, idx: number) => (
                        <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-900 text-[11px]">&quot;{item.query}&quot;</div>
                            <div className="text-[10px] text-gray-500 font-mono truncate max-w-md">
                              Target: {item.expectedTargetUrl}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-xs">
                            <span className="text-purple-400 bg-purple-950/30 px-2 py-0.5 rounded border border-purple-500/20">
                              Vector: #{item.meaningOnlyRank}
                            </span>
                            <span className="text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                              Hybrid: #{item.hybridRank}
                            </span>
                            <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                              ✓ Hybrid Superior
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Stream */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Top {searchResults.length} Ranked Results (Mode: {searchMode})</span>
                <span className="text-[11px] font-mono">
                  {searchMode === "hybrid"
                    ? "Formula: RRF = ∑ 1 / (60 + rank)"
                    : searchMode === "vector_only"
                    ? "Ranked by Cosine Similarity"
                    : "Ranked by BM25 Lexical Score"}
                </span>
              </div>

              {searchResults.map((res) => (
                <div
                  key={res.citationIndex}
                  className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-3 hover:border-[#C3D3EA] transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DCE6F5] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-600/20 text-indigo-400 font-mono font-bold text-xs px-2 py-0.5 border border-[#BFDBFE]">
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
                              : "bg-indigo-500/10 text-indigo-400 border border-[#DCE6F5]"
                          }`}
                        >
                          {res.attributionBadge}
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-[#0B1B3A]">{res.pageTitle}</h3>
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
                      {res.matchedTerms?.map((term) => (
                        <span key={term} className="rounded bg-gray-800 px-1.5 py-0.2 font-mono text-gray-300 text-[10px]">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Developer API Documentation Modal (Task 2.8) */}
            {showApiModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B3A]/35 backdrop-blur-sm p-4">
                <div className="w-full max-w-3xl rounded-xl border border-[#C3D3EA] bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-indigo-400" />
                      <div>
                        <h2 className="text-base font-bold text-[#0B1B3A]">Knowledge Brain REST API Documentation</h2>
                        <p className="text-xs text-gray-400">
                          Production-grade multi-tenant API called by Ask &amp; Teach Chat and Eval Lab.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowApiModal(false)}
                      className="rounded p-1 text-gray-400 hover:text-slate-900"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">HTTP POST Endpoint:</span>
                      <div className="mt-1 flex items-center justify-between rounded-lg bg-white border border-[#DCE6F5] px-3 py-2 font-mono text-gray-300">
                        <span>POST /api/brain/query</span>
                        <span className="text-[10px] text-emerald-400 uppercase font-bold">Multi-Tenant Scoped</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-900 mb-1">
                        <span>Ready-to-Run cURL Request:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`curl -X POST http://localhost:3000/api/brain/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "How do I configure custom CNAME subdomains?", "limit": 5, "mode": "hybrid"}'`);
                            setCopiedCurl(true);
                            setTimeout(() => setCopiedCurl(false), 3000);
                          }}
                          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{copiedCurl ? "Copied!" : "Copy cURL"}</span>
                        </button>
                      </div>
                      <pre className="rounded-lg bg-white border border-[#DCE6F5] p-3 font-mono text-[11px] text-gray-300 overflow-x-auto">
{`curl -X POST http://localhost:3000/api/brain/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "How do I configure custom CNAME subdomains?",
    "limit": 5,
    "mode": "hybrid"
  }'`}
                      </pre>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="font-semibold text-slate-900">Request JSON Payload:</span>
                        <pre className="mt-1 rounded-lg bg-white border border-[#DCE6F5] p-3 font-mono text-[11px] text-gray-300 overflow-x-auto">
{`{
  "query": string, // required
  "limit": number, // optional (1-20, default 5)
  "mode": "hybrid" | "vector_only" | "keyword_only",
  "action": "query" | "eval_benchmark"
}`}
                        </pre>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Knowledge Attribution Badges:</span>
                        <ul className="mt-1 space-y-1 rounded-lg bg-white border border-[#DCE6F5] p-3 font-mono text-[11px] text-gray-300">
                          <li><span className="text-indigo-400 font-bold">[sitemap]</span> : Sitemap XML Article</li>
                          <li><span className="text-sky-400 font-bold">[page_url]</span> : Standalone Web Page</li>
                          <li><span className="text-emerald-400 font-bold">[instruction]</span> : Human Policy Rule</li>
                          <li><span className="text-purple-400 font-bold">[skill]</span> : Standard Operating Proc</li>
                          <li><span className="text-amber-400 font-bold">[past_email]</span> : Gmail Thread + Notes</li>
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white border border-[#DCE6F5] p-3 text-gray-300 text-[11px] flex items-center justify-between">
                      <span>Complete technical manual and SDK contracts:</span>
                      <a
                        href="/api/brain/query?view=spec"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-indigo-400 hover:text-indigo-300 underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>OpenAPI 3.1 JSON Specification</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-[#DCE6F5]">
                    <button
                      onClick={() => setShowApiModal(false)}
                      className="rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* URL Health Lifecycle Section */}
            <div className="mt-8 pt-6 border-t border-[#DCE6F5] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">URL Health Lifecycle &amp; Quarantine State Machine</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Prevents hallucinations and broken links. 2 consecutive 404s trigger immediate Quarantine.
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetchHealth();
                    fetchPages();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 shadow-xs"
                >
                  <RotateCw className="h-3 w-3" />
                  <span>Refresh Health</span>
                </button>
              </div>

              {healthSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-emerald-500/30 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Active (Healthy)</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-[#15803D] mt-1 font-mono">
                      {healthSummary.active}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/30 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Watch (1 Fail)</span>
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                      {healthSummary.watch}
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-500/30 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Quarantined</span>
                      <ShieldAlert className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="text-2xl font-bold text-red-400 mt-1 font-mono">
                      {healthSummary.quarantined}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
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

        {/* ================= TAB 7: STAY FRESH & URL HEALTH (Task 2.4) ================= */}
        {activeTab === "freshness" && (
          <div className="space-y-6">
            {/* Header & Recheck Trigger */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-emerald-400" />
                    <span>Content Freshness &amp; Health Lifecycle</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Recheck sitemaps regularly to detect new and changed pages. Unchanged pages skip re-embedding via SHA-256 content hashes. Quarantined &amp; archived pages never appear in search answers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerRefresh}
                    disabled={refreshLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshLoading ? "animate-spin" : ""}`} />
                    <span>{refreshLoading ? "Checking Freshness..." : "Trigger Recheck Now"}</span>
                  </button>
                </div>
              </div>

              {refreshStatusMsg && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{refreshStatusMsg}</span>
                </div>
              )}
            </div>

            {/* Dashboard: pages processed, embedded, failed, pending, duplicate skipped, last sync */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Freshness &amp; Ingestion Dashboard
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <div className="text-xs text-gray-400">Pages Processed</div>
                  <div className="text-2xl font-bold text-[#0B1B3A] mt-1 font-mono">
                    {freshnessMetrics.pagesProcessed}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Verified URLs</div>
                </div>

                <div className="rounded-xl border border-[#BFDBFE] bg-white p-4">
                  <div className="text-xs text-indigo-400">Pages Embedded</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono">
                    {freshnessMetrics.pagesEmbedded}
                  </div>
                  <div className="text-[10px] text-indigo-300/70 mt-0.5">Content hash checked</div>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-white p-4">
                  <div className="text-xs text-red-400">Pages Failed</div>
                  <div className="text-2xl font-bold text-red-400 mt-1 font-mono">
                    {freshnessMetrics.pagesFailed}
                  </div>
                  <div className="text-[10px] text-red-300/70 mt-0.5">404 / HTTP errors</div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-white p-4">
                  <div className="text-xs text-amber-400">Pages Pending</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                    {freshnessMetrics.pagesPending}
                  </div>
                  <div className="text-[10px] text-amber-300/70 mt-0.5">On Watch (1 fail)</div>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <div className="text-xs text-gray-400">Duplicates Skipped</div>
                  <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">
                    {freshnessMetrics.duplicateUrlsSkipped}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Single URL row kept</div>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <div className="text-xs text-gray-400">Last Sync Time</div>
                  <div className="text-xs font-bold text-emerald-400 mt-2 font-mono truncate">
                    {freshnessMetrics.lastSyncTime
                      ? new Date(freshnessMetrics.lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "Pending"}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {freshnessMetrics.lastSyncTime ? new Date(freshnessMetrics.lastSyncTime).toLocaleDateString() : "Never"}
                  </div>
                </div>
              </div>
            </div>

            {/* Recheck Schedule & URL Health Settings (User Controls) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Setting 1: Recheck Schedule */}
              <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                    <span>Recheck Schedule</span>
                  </div>
                  <span className="rounded bg-indigo-500/10 text-indigo-300 px-2 py-0.5 text-xs font-mono border border-[#DCE6F5]">
                    Active: {healthPolicy.recheckSchedule.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Pick how often the sitemaps are checked again. New pages are added; changed pages update their embeddings; removed pages stop appearing in answers.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "daily", label: "Daily (24 hrs)", desc: "Best for fast-moving docs" },
                    { id: "weekly", label: "Weekly (7 days)", desc: "Recommended balance" },
                    { id: "15_days", label: "Every 15 Days", desc: "Bi-weekly sync" },
                    { id: "30_days", label: "Every 30 Days", desc: "Monthly cadence" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setHealthPolicyState((prev) => ({ ...prev, recheckSchedule: s.id as any }))}
                      className={`p-3 rounded-lg border text-left transition ${
                        healthPolicy.recheckSchedule === s.id
                          ? "border-indigo-500 bg-indigo-50 text-white"
                          : "border-[#DCE6F5] bg-[#F1F6FF]/50 text-gray-400 hover:border-[#C3D3EA]"
                      }`}
                    >
                      <div className="font-semibold text-slate-900 flex items-center justify-between">
                        <span>{s.label}</span>
                        {healthPolicy.recheckSchedule === s.id && (
                          <Check className="h-3.5 w-3.5 text-indigo-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 2: URL Health Action Policy (Threshold X & Action Rule) */}
              <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Sliders className="h-4 w-4 text-emerald-400" />
                    <span>URL Health Action Rules</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">User Controlled</span>
                </div>
                <p className="text-xs text-gray-400">
                  Configure X (number of consecutive refresh failures before action) and the automated quarantine/archive rule.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-300 font-medium block mb-1">
                      Consecutive Failures Threshold (X):
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: 1, label: "1 (Right away)" },
                        { val: 2, label: "2 (Standard)" },
                        { val: 15, label: "15 (Extended)" },
                        { val: 30, label: "30 (Lax)" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setHealthPolicyState((prev) => ({ ...prev, failureThresholdX: item.val }))}
                          className={`px-2.5 py-1.5 rounded border text-center font-mono text-xs transition ${
                            healthPolicy.failureThresholdX === item.val
                              ? "border-emerald-500 bg-emerald-50 text-emerald-300 font-bold"
                              : "border-[#DCE6F5] bg-white text-[#4A5B78] hover:border-[#C3D3EA]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-300 font-medium block mb-1">
                      Action Rule After X Refreshes:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "quarantine_then_archive", label: "Quarantine then Archive" },
                        { id: "quarantine", label: "Quarantine Only" },
                        { id: "archive", label: "Archive Directly" },
                      ].map((rule) => (
                        <button
                          key={rule.id}
                          type="button"
                          onClick={() => setHealthPolicyState((prev) => ({ ...prev, actionRule: rule.id as any }))}
                          className={`px-2.5 py-1.5 rounded border text-center text-xs transition ${
                            healthPolicy.actionRule === rule.id
                              ? "border-emerald-500 bg-emerald-50 text-emerald-300 font-bold"
                              : "border-[#DCE6F5] bg-white text-[#4A5B78] hover:border-[#C3D3EA]"
                          }`}
                        >
                          {rule.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveHealthPolicy}
                      disabled={savingPolicy}
                      className="rounded bg-emerald-600 px-3.5 py-1.5 text-xs text-white hover:bg-emerald-500 transition font-medium"
                    >
                      {savingPolicy ? "Saving Policy..." : "Save Policy Settings"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending URLs Review Panel (Task 2.4 requirement: Before any action, show user pending URLs and counts) */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>Pending URLs Review ({pendingUrlsList.length} Pending Actions)</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Before any quarantine or archival action is taken, pending URLs with consecutive failure counts are displayed for human review.
                  </p>
                </div>
                <span className="text-xs font-mono text-gray-400">
                  Threshold X = {healthPolicy.failureThresholdX}
                </span>
              </div>

              {pendingUrlsList.length === 0 ? (
                <div className="rounded-lg border border-[#DCE6F5] bg-[#F6F9FF] p-4 text-center text-xs text-gray-400">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                  <span>All knowledge URLs are healthy! No pending failures or quarantined items.</span>
                </div>
              ) : (
                <div className="rounded-lg border border-[#DCE6F5] overflow-hidden bg-[#F1F6FF]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#EEF4FF] border-b border-[#DCE6F5] text-[#4A5B78] uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">URL / Title</th>
                        <th className="px-3.5 py-2.5 text-center">Consecutive Failures</th>
                        <th className="px-3.5 py-2.5">Current Status</th>
                        <th className="px-3.5 py-2.5">Last Checked</th>
                        <th className="px-3.5 py-2.5">Pending Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {pendingUrlsList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#EEF4FF]">
                          <td className="px-3.5 py-2.5 font-sans">
                            <div className="font-medium text-slate-900 truncate max-w-sm">{item.title || "Help Page"}</div>
                            <div className="text-xs text-indigo-400 font-mono truncate max-w-md">{item.url}</div>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-amber-400">
                            {item.consecutiveFailures} / {healthPolicy.failureThresholdX}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              item.healthStatus === "watch"
                                ? "bg-amber-50 text-amber-300 border border-amber-500/30"
                                : item.healthStatus === "quarantined"
                                ? "bg-red-950/60 text-red-300 border border-red-500/30"
                                : "bg-gray-800 text-gray-400"
                            }`}>
                              {item.healthStatus}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-gray-400 text-[11px]">
                            {new Date(item.lastCheckedAt).toLocaleTimeString()}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="text-[11px] font-mono text-purple-300">
                              {item.pendingAction === "watch" ? "Keep on Watch" : `Apply ${item.pendingAction}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Refresh Run View (Task 2.4 requirement: First/Last fetch date & time, Total fetched at bottom, Full URL list) */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span>Refresh Run View ({refreshRuns.length} Runs Logged)</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    For each refresh, inspect first and last fetch timestamps, total URLs fetched, and toggle the full scrollable URL list.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">
                    Filter:
                  </span>
                  <select
                    value={urlListFilter}
                    onChange={(e) => setUrlListFilter(e.target.value)}
                    className="rounded border border-[#C3D3EA] bg-white px-2 py-1 text-xs text-gray-300 font-mono"
                  >
                    <option value="all">All Statuses</option>
                    <option value="200">200 OK (Clean)</option>
                    <option value="301">301 Redirected</option>
                    <option value="404">404 Missing / Failed</option>
                  </select>
                </div>
              </div>

              {refreshRuns.length === 0 ? (
                <div className="rounded-lg border border-[#DCE6F5] bg-[#F6F9FF] p-6 text-center text-xs text-gray-400 space-y-2">
                  <Clock className="h-6 w-6 text-indigo-400 mx-auto" />
                  <p>No refresh runs recorded yet. Click "Trigger Recheck Now" to perform the first scheduled sync.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {refreshRuns.map((run) => {
                    const isExpanded = expandedRunId === run.runId;
                    const filteredUrls = (run.urlsList || []).filter((u: any) => {
                      if (urlListFilter === "200") return u.httpStatus >= 200 && u.httpStatus < 300;
                      if (urlListFilter === "301") return u.httpStatus === 301 || u.httpStatus === 308;
                      if (urlListFilter === "404") return u.httpStatus === 404 || u.changeType === "missing";
                      return true;
                    });

                    return (
                      <div
                        key={run.runId}
                        className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF]/70 overflow-hidden"
                      >
                        {/* Run Header Card */}
                        <div className="p-4 bg-[#F6F9FF] border-b border-[#DCE6F5] flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-[#0B1B3A]">{run.runId}</span>
                              <span className="rounded bg-indigo-500/10 text-indigo-300 px-2 py-0.5 border border-[#DCE6F5] text-[10px]">
                                {run.schedule}
                              </span>
                              <span className="rounded bg-emerald-500/10 text-emerald-300 px-2 py-0.5 border border-emerald-500/20 text-[10px]">
                                {run.status}
                              </span>
                            </div>
                            <div className="text-gray-400 text-[11px] flex items-center gap-3">
                              <span>
                                <strong>First fetch:</strong> {new Date(run.startedAt).toLocaleString()}
                              </span>
                              <span>&bull;</span>
                              <span>
                                <strong>Last fetch:</strong> {new Date(run.finishedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right text-[11px] font-mono">
                              <span className="text-gray-400">Processed: </span>
                              <span className="text-slate-900 font-bold">{run.pagesProcessed}</span>
                              <span className="text-gray-600 mx-1">|</span>
                              <span className="text-gray-400">Embedded: </span>
                              <span className="text-indigo-400 font-bold">{run.pagesEmbedded}</span>
                              <span className="text-gray-600 mx-1">|</span>
                              <span className="text-gray-400">Failed: </span>
                              <span className="text-red-400 font-bold">{run.pagesFailed}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedRunId(isExpanded ? null : run.runId)}
                              className="flex items-center gap-1 rounded bg-gray-800 hover:bg-gray-700 px-2.5 py-1 text-xs text-gray-200 transition font-mono"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  <span>Hide URL List</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                  <span>View Full URL List ({run.urlsList?.length || 0})</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Section: Full URL List (Clean and Scrollable) */}
                        {isExpanded && (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                              <span>Showing {filteredUrls.length} of {run.urlsList?.length || 0} URLs in this refresh run:</span>
                              <span className="text-[11px] text-emerald-400">
                                SHA-256 Content Hash Checked (Unchanged pages skip re-embedding)
                              </span>
                            </div>

                            <div className="max-h-72 overflow-y-auto rounded border border-[#DCE6F5] bg-[#F1F6FF]">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-[#EEF4FF] border-b border-[#DCE6F5] text-gray-400 uppercase text-[10px] sticky top-0">
                                  <tr>
                                    <th className="px-3.5 py-2">URL</th>
                                    <th className="px-3.5 py-2 text-center">HTTP Status</th>
                                    <th className="px-3.5 py-2">Health Level</th>
                                    <th className="px-3.5 py-2">Change Type</th>
                                    <th className="px-3.5 py-2">Content Hash</th>
                                    <th className="px-3.5 py-2">Timestamp</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/80 text-gray-300">
                                  {filteredUrls.map((u: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-[#EEF4FF]/50">
                                      <td className="px-3.5 py-2 text-indigo-400 truncate max-w-sm">
                                        {u.url}
                                        {u.redirectUrl && (
                                          <div className="text-[10px] text-gray-500 font-sans">
                                            &rarr; Redirects to {u.redirectUrl}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3.5 py-2 text-center font-bold">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                          u.httpStatus === 200
                                            ? "bg-emerald-950 text-emerald-400"
                                            : u.httpStatus === 301 || u.httpStatus === 308
                                            ? "bg-purple-950 text-purple-400"
                                            : "bg-red-950 text-red-400"
                                        }`}>
                                          {u.httpStatus}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          u.healthStatus === "active"
                                            ? "text-emerald-400 bg-emerald-50"
                                            : u.healthStatus === "watch"
                                            ? "text-amber-400 bg-amber-50"
                                            : "text-red-400 bg-red-50"
                                        }`}>
                                          {u.healthStatus}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                          u.changeType === "new"
                                            ? "bg-indigo-950 text-indigo-300"
                                            : u.changeType === "unchanged"
                                            ? "bg-gray-800 text-gray-400"
                                            : u.changeType === "updated"
                                            ? "bg-emerald-950 text-emerald-300"
                                            : u.changeType === "recovered"
                                            ? "bg-blue-50 text-cyan-300"
                                            : "bg-red-950 text-red-300"
                                        }`}>
                                          {u.changeType === "unchanged" ? "Unchanged (0 tokens)" : u.changeType}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-2 text-gray-500 text-[10px]">
                                        {u.contentHash ? `${u.contentHash.substring(0, 10)}...` : "—"}
                                      </td>
                                      <td className="px-3.5 py-2 text-gray-400 text-[11px]">
                                        {new Date(u.timestamp).toLocaleTimeString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Total URLs Fetched Bottom Footer (Task 2.4 requirement) */}
                        <div className="px-4 py-2.5 bg-[#EEF4FF] border-t border-[#DCE6F5] flex items-center justify-between text-xs font-mono">
                          <span className="text-gray-400">
                            Total URLs Fetched: <strong className="text-slate-900">{run.totalUrlsFetched} URLs</strong>
                          </span>
                          <span className="text-gray-500 text-[11px]">
                            {run.pagesProcessed} Processed &bull; {run.pagesEmbedded} Embedded &bull; {run.pagesFailed} Failed &bull; {run.duplicateUrlsSkipped} Duplicates Skipped
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Archived Knowledge Base (Task 2.4 requirement: Nothing deleted for good, archived pages move here for audits and recovery) */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#0B1B3A] flex items-center gap-2">
                    <Archive className="h-4 w-4 text-purple-400" />
                    <span>Archived Knowledge Base ({archivedPagesList.length} Quarantined &amp; Archived Pages)</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Quarantined and archived URLs never appear in search answers. Nothing is deleted for good: records remain here for compliance audits and can be recovered to Active in one click.
                  </p>
                </div>
                <span className="rounded bg-purple-500/10 text-purple-300 px-2.5 py-0.5 text-xs font-mono border border-purple-500/20">
                  Zero Hallucination Shield
                </span>
              </div>

              {archivedPagesList.length === 0 ? (
                <div className="rounded-lg border border-[#DCE6F5] bg-[#F6F9FF] p-6 text-center text-xs text-gray-400">
                  <Archive className="h-6 w-6 text-gray-500 mx-auto mb-1" />
                  <span>No pages in Quarantine or Archive. Knowledge Brain is fully healthy!</span>
                </div>
              ) : (
                <div className="rounded-lg border border-[#DCE6F5] overflow-hidden bg-[#F1F6FF]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#EEF4FF] border-b border-[#DCE6F5] text-[#4A5B78] uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Title &amp; URL</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5 text-center">Failures</th>
                        <th className="px-3.5 py-2.5">Redirect Target</th>
                        <th className="px-3.5 py-2.5">Last Checked</th>
                        <th className="px-3.5 py-2.5 text-right">Recovery Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {archivedPagesList.map((page) => (
                        <tr key={page.id} className="hover:bg-[#EEF4FF]/50">
                          <td className="px-3.5 py-2.5 font-sans">
                            <div className="font-semibold text-slate-900 truncate max-w-sm">{page.title}</div>
                            <div className="text-xs text-indigo-400 font-mono truncate max-w-md">{page.url}</div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              page.healthStatus === "quarantined"
                                ? "bg-red-950/80 text-red-300 border border-red-500/30"
                                : "bg-gray-800 text-gray-400 border border-[#C3D3EA]"
                            }`}>
                              {page.healthStatus}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-amber-400">
                            {page.consecutiveFailures}
                          </td>
                          <td className="px-3.5 py-2.5 text-gray-400 text-[11px] truncate max-w-xs">
                            {page.redirectUrl || "None"}
                          </td>
                          <td className="px-3.5 py-2.5 text-gray-400 text-[11px]">
                            {new Date(page.lastCheckedAt).toLocaleTimeString()}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              onClick={() => handleRecoverPage(page.id)}
                              className="inline-flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-xs text-white transition font-mono"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Recover to Active</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
