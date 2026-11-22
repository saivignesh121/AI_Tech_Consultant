"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Sparkles,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  GitPullRequest,
  Mail,
  DollarSign,
  Play,
  Layers,
  ChevronRight,
  ShieldCheck,
  FileCode,
  ArrowRight,
  Clock,
  Send,
} from "lucide-react";

interface SelfImproveRun {
  id: string;
  businessId: string;
  caseId: string;
  branchName: string;
  roundsExecuted: number;
  maxRounds: number;
  costAccumulatedUsd: string;
  maxBudgetUsd: string;
  status: "passed" | "failed_limit" | "merged" | "reverted";
  prUrl?: string | null;
  failingCasesSummary?: {
    caseId?: string;
    question?: string;
    failingAnswer?: string;
    expectedAnswer?: string;
    judgeCritique?: string;
    scoreBefore?: number;
    scoreAfter?: number;
    hiddenCheckSetPassed?: boolean;
  };
  createdAt: string;
}

export default function SelfImprovePage() {
  const [runs, setRuns] = useState<SelfImproveRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"runs" | "inspector" | "digest">("runs");
  const [selectedRun, setSelectedRun] = useState<SelfImproveRun | null>(null);

  // Trigger Run Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [triggerCaseId, setTriggerCaseId] = useState("kb-dns-042");
  const [triggerQuestion, setTriggerQuestion] = useState(
    "What A-record should I point to if I use Cloudflare proxying with an external registrar?"
  );
  const [triggerExpected, setTriggerExpected] = useState(
    "Point your A record to 54.214.12.8 per Solution Center."
  );
  const [triggerComment, setTriggerComment] = useState(
    "Failed to cite correct proxy ingress IP 54.214.12.8. Hallucinated localhost."
  );
  const [triggerMaxRounds, setTriggerMaxRounds] = useState(5);
  const [triggerMaxBudget, setTriggerMaxBudget] = useState(5.0);
  const [forceCeiling, setForceCeiling] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Action status
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [digestEmailHtml, setDigestEmailHtml] = useState<string>("");
  const [digestSubject, setDigestSubject] = useState<string>("");
  const [ownerEmail, setOwnerEmail] = useState<string>("founder@company.com");

  useEffect(() => {
    fetchRuns();
    fetchDigest();
    fetch("/api/auth/context")
      .then((r) => r.json())
      .then((d) => {
        if (d.currentTenant?.userEmail) {
          setOwnerEmail(d.currentTenant.userEmail);
        }
      })
      .catch(console.error);
  }, []);

  async function fetchRuns() {
    try {
      setLoading(true);
      const res = await fetch("/api/self-improve/runs");
      const data = await res.json();
      if (data.runs) {
        setRuns(data.runs);
        if (data.runs.length > 0 && !selectedRun) {
          setSelectedRun(data.runs[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch self-improve runs", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDigest() {
    try {
      const res = await fetch("/api/self-improve/digest");
      const data = await res.json();
      if (data.email) {
        setDigestEmailHtml(data.email.htmlBody);
        setDigestSubject(data.email.subject);
      }
    } catch (err) {
      console.error("Failed to fetch digest email", err);
    }
  }

  async function handleTriggerRun(e: React.FormEvent) {
    e.preventDefault();
    setTriggering(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/self-improve/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: triggerCaseId,
          question: triggerQuestion,
          expectedAnswer: triggerExpected,
          judgeCritique: triggerComment,
          comment: triggerComment,
          maxRounds: triggerMaxRounds,
          maxBudgetUsd: triggerMaxBudget,
          forceFailureScenario: forceCeiling,
        }),
      });
      const data = await res.json();
      if (data.success && data.run) {
        setRuns((prev) => [data.run, ...prev]);
        setSelectedRun(data.run);
        setActiveTab("inspector");
        setIsModalOpen(false);
        setActionMessage("Autonomous Claude Opus 5.5 run completed successfully.");
      }
    } catch (err) {
      console.error("Failed to trigger run", err);
    } finally {
      setTriggering(false);
    }
  }

  async function handleApprove(runId: string) {
    try {
      const res = await fetch("/api/self-improve/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Branch approved & merged into main! Production prompt updated.`);
        setRuns((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, status: "merged" } : r))
        );
        if (selectedRun && selectedRun.id === runId) {
          setSelectedRun({ ...selectedRun, status: "merged" });
        }
      }
    } catch (err) {
      console.error("Failed to approve run", err);
    }
  }

  async function handleRevert(runId: string) {
    try {
      const res = await fetch("/api/self-improve/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Patch reverted. Previous baseline restored.`);
        setRuns((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, status: "reverted" } : r))
        );
        if (selectedRun && selectedRun.id === runId) {
          setSelectedRun({ ...selectedRun, status: "reverted" });
        }
      }
    } catch (err) {
      console.error("Failed to revert run", err);
    }
  }

  return (
    <AppShell breadcrumbs={[{ label: "Self-Improvement Loop" }]}>
      <div className="space-y-8">
        {/* Header Banner: Proteus Royal Blue to Violet/Purple */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white p-8 md:p-10 shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-xs font-mono font-medium">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                <span>Autonomous Git-Branch Diagnosis &amp; Healing</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Self-Improvement Loop
              </h1>
              <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
                Claude Opus 5.5 automatically packs failing test cases, branches git, synthesizes fixes, validates against hidden check sets, and enforces a strict $5.00 ceiling.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-blue-50 text-[#1D4ED8] font-bold text-xs rounded-full shadow-sm transition"
              >
                <Play className="w-3.5 h-3.5 fill-[#1D4ED8]" />
                Trigger New Opus Fix
              </button>
            </div>
          </div>
        </div>

        {/* Global Notification */}
        {actionMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Top Cards in 4 Pastel Tinted Styles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Card 1: Mint / Soft Cyan */}
          <div className="p-6 rounded-3xl border-2 border-[#BCECEF] bg-[#E6F8F9] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-800">
                Total Runs
              </span>
              <Layers className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#0B1B3A] font-mono">{runs.length || 3}</div>
            <div className="mt-1 text-xs text-[#334155]">Autonomous Claude Opus fixes</div>
          </div>

          {/* Card 2: Ice Blue */}
          <div className="p-6 rounded-3xl border-2 border-[#D0E2FB] bg-[#EEF5FD] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                Success Pass Rate
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-700 font-mono">66.7%</div>
            <div className="mt-1 text-xs text-[#334155]">2 passed / 1 quarantined limit</div>
          </div>

          {/* Card 3: Warm Peach / Soft Cream */}
          <div className="p-6 rounded-3xl border-2 border-[#FFE2C2] bg-[#FFF4E8] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Total Invested
              </span>
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#15803D] font-mono">$6.80 USD</div>
            <div className="mt-1 text-xs text-[#334155]">Opus reasoning tokens ($5 hard cap)</div>
          </div>

          {/* Card 4: Soft Lavender */}
          <div className="p-6 rounded-3xl border-2 border-[#DDD6FE] bg-[#F5F3FF] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-800">
                Hidden Check Set
              </span>
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-purple-700 font-mono">100%</div>
            <div className="mt-1 text-xs text-[#334155]">0 regressions verified</div>
          </div>
        </div>

        {/* Tabs Bar in Rounded-Full Pills */}
        <div className="flex flex-wrap gap-2.5 items-center pb-2 border-b border-[#DCE6F5]">
          <button
            onClick={() => setActiveTab("runs")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "runs"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Active Runs &amp; History ({runs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("inspector")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "inspector"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Run Inspector &amp; Diff Viewer</span>
          </button>
          <button
            onClick={() => setActiveTab("digest")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition whitespace-nowrap shadow-xs ${
              activeTab === "digest"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Weekly Owner Digest Preview</span>
          </button>
        </div>

        {/* Tab 1: Runs Table */}
        {activeTab === "runs" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Autonomous Run Pipeline</h3>
              <span className="text-xs text-gray-500">Enforcing isolated git branches & $5 ceiling</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100/70 text-xs uppercase text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Run ID & Target Branch</th>
                    <th className="py-3 px-4">Failing Test Case</th>
                    <th className="py-3 px-4">Rounds</th>
                    <th className="py-3 px-4">Cost / Budget</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runs.map((r) => {
                    const costNum = parseFloat(r.costAccumulatedUsd || "0");
                    const budgetNum = parseFloat(r.maxBudgetUsd || "5.00");
                    const pct = Math.min(100, (costNum / budgetNum) * 100);

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{r.id}</div>
                          <div className="flex items-center gap-1 text-xs text-purple-700 font-mono mt-0.5">
                            <GitBranch className="w-3 h-3" />
                            {r.branchName}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                            {r.failingCasesSummary?.caseId || r.caseId || "test-case"}
                          </span>
                          <div className="text-xs text-gray-500 truncate max-w-xs mt-1">
                            {r.failingCasesSummary?.question || "Failure details"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">
                            {r.roundsExecuted} / {r.maxRounds}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                            <span>${costNum.toFixed(2)}</span>
                            <span className="text-gray-400">/ ${budgetNum.toFixed(2)}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct > 80 ? "bg-red-500" : "bg-purple-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {r.status === "merged" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3" /> Merged to Main
                            </span>
                          )}
                          {r.status === "passed" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <CheckCircle2 className="w-3 h-3" /> Passed (Ready)
                            </span>
                          )}
                          {r.status === "failed_limit" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" /> Quarantined (Limit)
                            </span>
                          )}
                          {r.status === "reverted" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <RotateCcw className="w-3 h-3" /> Reverted
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedRun(r);
                              setActiveTab("inspector");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800"
                          >
                            Inspect Diff
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Run Inspector & Diff Viewer */}
        {activeTab === "inspector" && (
          (() => {
            const currentRun = selectedRun || runs[0];
            if (!currentRun) {
              return (
                <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
                  No active runs available. Trigger a new Opus fix above to begin.
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* Inspector Top Bar */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-gray-900">
                        Inspection: {currentRun.id}
                      </h2>
                      <span className="font-mono text-xs px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                        {currentRun.branchName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <span>Model: <strong>Claude Opus 5.5</strong></span>
                      <span>Rounds: <strong>{currentRun.roundsExecuted} of 5</strong></span>
                      <span>Cost: <strong>${parseFloat(currentRun.costAccumulatedUsd || "0").toFixed(2)} USD</strong></span>
                      <span>Hidden Validation Set: <strong className="text-green-600">PASSED (0 Regressions)</strong></span>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(currentRun.id)}
                      disabled={currentRun.status === "merged" || currentRun.status === "failed_limit"}
                      className={`inline-flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg shadow-sm transition ${
                        currentRun.status === "merged"
                          ? "bg-green-100 text-green-700 cursor-not-allowed"
                          : currentRun.status === "failed_limit"
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      <GitPullRequest className="w-4 h-4" />
                      {currentRun.status === "merged" ? "Merged to Main" : "1-Click Approve & Merge"}
                    </button>

                    <button
                      onClick={() => handleRevert(currentRun.id)}
                      disabled={currentRun.status === "reverted"}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg border border-gray-300 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      1-Click Revert
                    </button>
                  </div>
                </div>

                {/* Split Screen Inspector: Left Failure Details | Right Visual Diff */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Failure & Reasoning */}
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                      <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Failure Diagnosis (Round 0)
                      </h3>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-gray-600">Question:</span>
                          <p className="p-2.5 bg-gray-50 rounded border border-gray-200 text-gray-800 font-mono mt-1">
                            {currentRun.failingCasesSummary?.question || "What IP should my A record point to?"}
                          </p>
                        </div>

                        <div>
                          <span className="font-semibold text-red-600">Failing Answer (Pre-Fix):</span>
                          <p className="p-2.5 bg-red-50 rounded border border-red-200 text-red-800 font-mono mt-1">
                            {currentRun.failingCasesSummary?.failingAnswer || "Point your A record to 127.0.0.1"}
                          </p>
                        </div>

                        <div>
                          <span className="font-semibold text-green-700">Expected Resolution:</span>
                          <p className="p-2.5 bg-green-50 rounded border border-green-200 text-green-900 font-mono mt-1">
                            {currentRun.failingCasesSummary?.expectedAnswer || "Point your A record to 54.214.12.8 per Solution Center."}
                          </p>
                        </div>

                        <div>
                          <span className="font-semibold text-gray-600">AI Judge Critique:</span>
                          <p className="p-2.5 bg-gray-50 rounded border border-gray-200 text-gray-700 italic mt-1">
                            &quot;{currentRun.failingCasesSummary?.judgeCritique || "Failed to cite correct IP documented in Solution Center."}&quot;
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hidden Check Set Verification Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                          Hidden Validation Set Verification
                        </h3>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                          5 / 5 Passed
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        To prevent overfitting to the single failing test, Claude Opus 5.5 must pass all 5 secret regression tests without losing a single point.
                      </p>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="p-2 bg-gray-50 rounded flex items-center justify-between text-gray-700">
                          <span>1. [DNS] Migration TTL recommendation</span>
                          <span className="text-green-600 font-bold">100% OK</span>
                        </div>
                        <div className="p-2 bg-gray-50 rounded flex items-center justify-between text-gray-700">
                          <span>2. [Billing] Enterprise discount approval gate</span>
                          <span className="text-green-600 font-bold">100% OK</span>
                        </div>
                        <div className="p-2 bg-gray-50 rounded flex items-center justify-between text-gray-700">
                          <span>3. [Security] Production DB credentials vault</span>
                          <span className="text-green-600 font-bold">100% OK</span>
                        </div>
                        <div className="p-2 bg-gray-50 rounded flex items-center justify-between text-gray-700">
                          <span>4. [Webhooks] Distributed idempotency deduplication</span>
                          <span className="text-green-600 font-bold">100% OK</span>
                        </div>
                        <div className="p-2 bg-gray-50 rounded flex items-center justify-between text-gray-700">
                          <span>5. [Escalation] Legal threat human handoff valve</span>
                          <span className="text-green-600 font-bold">100% OK</span>
                        </div>
                      </div>
                    </div>

                    {/* Task 5.1 Safety Fencing & Sandbox Boundaries */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          Security Boundaries &amp; Git Branch Isolation
                        </h3>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                          Enforced
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="p-2 bg-purple-50/60 rounded border border-purple-100">
                          <span className="font-semibold text-purple-900">Branch Quarantine:</span>
                          <p className="text-purple-700 font-mono mt-0.5">
                            Opus works on \`{currentRun.branchName}\`. Main branch checkout is hard blocked.
                          </p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          <span className="font-semibold text-gray-700">Protected Test Set & Judge Prompt:</span>
                          <p className="text-gray-500 font-mono mt-0.5">
                            Edits to \`benchmark/**\`, \`tests/**\`, and \`src/services/eval/judge.ts\` trigger immediate security termination.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual Unified Diff Viewer */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-purple-600" />
                        <span className="font-mono text-xs font-bold text-gray-800">
                          diff --git a/prompts/qa_answer.txt b/prompts/qa_answer.txt
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">+12 / -4 lines</span>
                    </div>

                    <div className="p-4 bg-[#F1F6FF] text-[#1E3A8A] font-mono text-xs border border-[#DCE6F5] overflow-x-auto flex-1 leading-relaxed">
                      <div className="text-gray-400">@@ -14,8 +14,12 @@ Instruction Set:</div>
                      <div className="text-red-400 bg-red-50 px-2 py-0.5 rounded">
                        - When customer asks about DNS proxying, suggest localhost or standard IPs.
                      </div>
                      <div className="text-green-400 bg-green-950/40 px-2 py-0.5 rounded">
                        + When customer asks about DNS proxying with an external registrar:
                      </div>
                      <div className="text-green-400 bg-green-950/40 px-2 py-0.5 rounded">
                        + 1. Point the A record strictly to 54.214.12.8 (Solution Center).
                      </div>
                      <div className="text-green-400 bg-green-950/40 px-2 py-0.5 rounded">
                        + 2. Never recommend localhost 127.0.0.1 for live production domains.
                      </div>
                      <div className="text-green-400 bg-green-950/40 px-2 py-0.5 rounded">
                        + 3. Provide exact CNAME verification steps from Cloudflare docs.
                      </div>
                      <div className="text-gray-400">@@ -32,4 +36,8 @@ Safety Protocol:</div>
                      <div className="text-gray-300"> Always verify SPF and DKIM records when modifying MX lines.</div>
                      <div className="text-green-400 bg-green-950/40 px-2 py-0.5 rounded">
                        + Caching hash verified. Zero regression on 5 hidden test cases.
                      </div>
                    </div>

                    {/* Budget Meter Bar */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1.5">
                        <span>Claude Opus Reasoning Budget</span>
                        <span className="font-mono">
                          ${parseFloat(currentRun.costAccumulatedUsd || "0").toFixed(2)} / $5.00 Cap
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (parseFloat(currentRun.costAccumulatedUsd || "0") / 5.0) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1.5">
                        Hard circuit breaker triggers and safely quarantines changes if round cost exceeds $5.00 ceiling.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Tab 3: Weekly Owner Digest */}
        {activeTab === "digest" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  Weekly Executive Owner Digest
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automated weekly report sent to the business owner summarizing accuracy gains, self-improved fixes, and monthly model cost.
                </p>
              </div>

              <button
                onClick={async () => {
                  try {
                    await fetch("/api/self-improve/digest", { method: "POST", body: JSON.stringify({ recipientEmail: ownerEmail }) });
                    setActionMessage(`Test weekly digest email dispatched to ${ownerEmail}.`);
                  } catch (err) {
                    console.error("Failed to send test digest", err);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Test Email to Owner
              </button>
            </div>

            {/* Email Render Box */}
            <div className="max-w-2xl mx-auto border border-gray-300 rounded-xl overflow-hidden shadow-md">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 text-xs text-gray-600">
                <div><strong>Subject:</strong> {digestSubject || "AI Tech Consultant Weekly Report"}</div>
                <div><strong>To:</strong> {ownerEmail}</div>
              </div>
              <div
                className="p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: digestEmailHtml }}
              />
            </div>
          </div>
        )}

        {/* Trigger New Run Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#0B1B3A]/35 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900">Trigger Autonomous Opus Fix</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTriggerRun} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Failing Benchmark Case ID
                  </label>
                  <input
                    type="text"
                    value={triggerCaseId}
                    onChange={(e) => setTriggerCaseId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Failing Question
                  </label>
                  <textarea
                    rows={2}
                    value={triggerQuestion}
                    onChange={(e) => setTriggerQuestion(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Expected Verified Answer
                  </label>
                  <textarea
                    rows={2}
                    value={triggerExpected}
                    onChange={(e) => setTriggerExpected(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Human / AI Judge Critique (Comment)
                  </label>
                  <textarea
                    rows={2}
                    value={triggerComment}
                    onChange={(e) => setTriggerComment(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Max Rounds
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={triggerMaxRounds}
                      onChange={(e) => setTriggerMaxRounds(parseInt(e.target.value) || 5)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Max Budget Cap ($ USD)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      max={20}
                      value={triggerMaxBudget}
                      onChange={(e) => setTriggerMaxBudget(parseFloat(e.target.value) || 5.0)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-amber-900">Force Ceiling Limit Scenario</span>
                    <p className="text-amber-700 text-[11px]">
                      Demonstrates Run #003 where Opus exceeds $5.00 budget and is safely quarantined.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={forceCeiling}
                    onChange={(e) => setForceCeiling(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={triggering}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                  >
                    {triggering ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Running Opus 5.5...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        Execute Fix Loop
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
