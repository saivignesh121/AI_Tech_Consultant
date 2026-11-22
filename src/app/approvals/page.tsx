"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  MessageSquare,
  Sparkles,
  GitPullRequest,
  Send,
  HelpCircle,
  Clock,
  ShieldAlert,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface EscalatedTask {
  id: string;
  sessionId: string;
  content: string;
  escalationReason: string | null;
  isResolved: boolean;
  expertReply: string | null;
  createdAt: string;
}

interface PendingLesson {
  id: string;
  title: string;
  category: string;
  lessonMarkdown: string;
  confidenceScore: string | null;
  status: string;
  createdAt: string;
}

interface SelfImproveItem {
  id: string;
  branchName: string;
  roundsExecuted: number;
  maxRounds: number;
  costAccumulatedUsd: string;
  status: string;
  prUrl: string | null;
  createdAt: string;
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"escalations" | "lessons" | "prs">("escalations");
  const [escalations, setEscalations] = useState<EscalatedTask[]>([]);
  const [lessons, setLessons] = useState<PendingLesson[]>([]);
  const [prs, setPrs] = useState<SelfImproveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Resolving an escalation
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expertReplyInput, setExpertReplyInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/approvals");
      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg("Access Denied: Expert / Approver role required. Switch your persona to 'Expert / Approver' in the top right account menu.");
          return;
        }
        throw new Error("Failed to load approvals data");
      }
      const data = await res.json();
      setEscalations(data.escalatedTasks || []);
      setLessons(data.pendingLessons || []);
      setPrs(data.selfImproveRuns || []);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to communicate with approvals service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleResolveEscalation = async (messageId: string) => {
    if (!expertReplyInput.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_escalation",
          messageId,
          expertReply: expertReplyInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("Escalated task answered and resolved! Injected into knowledge base.");
        setTimeout(() => setToastMsg(""), 4000);
        setResolvingId(null);
        setExpertReplyInput("");
        await fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleLessonAction = async (lessonId: string, approve: boolean) => {
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approve ? "approve_lesson" : "reject_lesson",
          lessonId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(`Lesson successfully ${approve ? "approved" : "rejected"}.`);
        setTimeout(() => setToastMsg(""), 4000);
        await fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handlePrAction = async (runId: string, approve: boolean) => {
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approve ? "approve_pr" : "revert_pr",
          runId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(`Autonomous PR ${approve ? "approved & merged" : "reverted"}.`);
        setTimeout(() => setToastMsg(""), 4000);
        await fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const pendingEscalationsCount = escalations.filter((e) => !e.isResolved).length;
  const pendingLessonsCount = lessons.filter((l) => l.status === "pending").length;
  const pendingPrsCount = prs.filter((p) => p.status === "passed" || p.status === "running").length;

  return (
    <AppShell breadcrumbs={[{ label: "Approvals Inbox", href: "/approvals" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Human Expert Governance</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Approvals &amp; Escalations Inbox
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Review escalated customer tasks, approve learned lessons, and authorize self-improvement patches.
            </p>
          </div>

          <button
            onClick={fetchApprovals}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-700 bg-gray-900 text-gray-300 hover:text-white hover:border-cyan-400 transition flex items-center gap-2 self-start md:self-auto"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span className="text-xs font-medium">Refresh</span>
          </button>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200">
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Role Authorization Notice</span>
            </div>
            <p className="text-xs text-amber-300/80">{errorMsg}</p>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab("escalations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "escalations"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <HelpCircle className="h-4 w-4 text-amber-400" />
            <span>Escalated Tasks</span>
            {pendingEscalationsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingEscalationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "lessons"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Learned Lessons &amp; Skills</span>
            {pendingLessonsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {pendingLessonsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("prs")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "prs"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <GitPullRequest className="h-4 w-4 text-purple-400" />
            <span>Self-Improvement PRs</span>
            {pendingPrsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {pendingPrsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Escalations */}
        {activeTab === "escalations" && (
          <div className="space-y-4">
            {escalations.length === 0 && !loading && (
              <div className="p-8 text-center rounded-2xl border border-gray-800 bg-[#071329] text-gray-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <div className="font-semibold text-white">No Pending Escalations</div>
                <p className="text-xs text-gray-500 mt-1">
                  Questions flagged with high sentiment urgency, refund requests, or legal triggers will appear here for expert resolution.
                </p>
              </div>
            )}

            {escalations.map((item) => {
              const isReplying = resolvingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-6 rounded-2xl border transition ${
                    item.isResolved
                      ? "border-gray-800/80 bg-[#050e20]/60 opacity-80"
                      : "border-amber-500/30 bg-[#071329] shadow-lg shadow-amber-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                          Escalated Query
                        </span>
                        <span className="text-gray-600">&bull;</span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            item.isResolved
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {item.isResolved ? "RESOLVED" : "NEEDS HUMAN ANSWER"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white pt-1">
                        &quot;{item.content}&quot;
                      </p>
                      {item.escalationReason && (
                        <div className="text-xs text-gray-400 mt-1">
                          <span className="text-amber-400 font-medium">Trigger:</span> {item.escalationReason}
                        </div>
                      )}
                    </div>

                    {!item.isResolved && !isReplying && (
                      <button
                        onClick={() => {
                          setResolvingId(item.id);
                          setExpertReplyInput("");
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-md shadow-cyan-500/20"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Answer &amp; Resolve</span>
                      </button>
                    )}
                  </div>

                  {item.expertReply && (
                    <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 text-xs">
                      <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Expert Answer (Injected into Knowledge Memory):</span>
                      </div>
                      <p className="whitespace-pre-wrap">{item.expertReply}</p>
                    </div>
                  )}

                  {isReplying && (
                    <div className="mt-4 p-4 rounded-xl border border-cyan-500/40 bg-[#040f26] space-y-3">
                      <label className="block text-xs font-semibold text-cyan-300">
                        Type authoritative answer for this customer inquiry:
                      </label>
                      <textarea
                        value={expertReplyInput}
                        onChange={(e) => setExpertReplyInput(e.target.value)}
                        placeholder="Provide the exact verified solution, procedure, or policy details..."
                        className="w-full h-24 rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setResolvingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleResolveEscalation(item.id)}
                          disabled={submittingAction || !expertReplyInput.trim()}
                          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Submit &amp; Inject to Knowledge</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Lessons & Skills */}
        {activeTab === "lessons" && (
          <div className="space-y-4">
            {lessons.length === 0 && !loading && (
              <div className="p-8 text-center rounded-2xl border border-gray-800 bg-[#071329] text-gray-400">
                <Sparkles className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                <div className="font-semibold text-white">No Pending Lessons</div>
                <p className="text-xs text-gray-500 mt-1">
                  When support staff corrects the AI consultant during chat, autonomous lessons are proposed here for human approver sign-off.
                </p>
              </div>
            )}

            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="p-6 rounded-2xl border border-gray-800 bg-[#071329] space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                        {lesson.category}
                      </span>
                      <span className="text-gray-600">&bull;</span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Confidence: {lesson.confidenceScore ? `${Math.round(Number(lesson.confidenceScore) * 100)}%` : "N/A"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{lesson.title}</h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      lesson.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : lesson.status === "rejected"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    }`}
                  >
                    {lesson.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-gray-800 bg-[#040f26] text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {lesson.lessonMarkdown}
                </div>

                {lesson.status === "pending" && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleLessonAction(lesson.id, false)}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject Lesson</span>
                    </button>

                    <button
                      onClick={() => handleLessonAction(lesson.id, true)}
                      disabled={submittingAction}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve &amp; Commit Skill</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Self-Improvement PRs */}
        {activeTab === "prs" && (
          <div className="space-y-4">
            {prs.length === 0 && !loading && (
              <div className="p-8 text-center rounded-2xl border border-gray-800 bg-[#071329] text-gray-400">
                <GitPullRequest className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <div className="font-semibold text-white">No Self-Improvement Runs</div>
                <p className="text-xs text-gray-500 mt-1">
                  Automated benchmark patches and prompt optimization runs will generate branch PRs here for final merge approval.
                </p>
              </div>
            )}

            {prs.map((pr) => (
              <div
                key={pr.id}
                className="p-6 rounded-2xl border border-gray-800 bg-[#071329] space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-purple-400 font-bold">
                      BRANCH: {pr.branchName}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">
                      Rounds: {pr.roundsExecuted}/{pr.maxRounds} &bull; Cost: ${pr.costAccumulatedUsd}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      pr.status === "merged"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : pr.status === "reverted"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}
                  >
                    {pr.status.toUpperCase()}
                  </span>
                </div>

                {pr.status !== "merged" && pr.status !== "reverted" && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handlePrAction(pr.id, false)}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-semibold transition"
                    >
                      Reject &amp; Revert
                    </button>

                    <button
                      onClick={() => handlePrAction(pr.id, true)}
                      disabled={submittingAction}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-purple-500/20"
                    >
                      Approve &amp; Merge PR
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
