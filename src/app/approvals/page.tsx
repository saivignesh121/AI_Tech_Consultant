"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Check,
  Wrench,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
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
  isActive?: boolean;
  author?: string;
  originalQuestion?: string;
  wrongAnswer?: string;
  fileName?: string;
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

interface SkillProposalItem {
  id: string;
  targetSkillName: string;
  targetSkillSlug: string;
  modelUsed: string;
  diffSummary: string;
  previousStepsMarkdown: string;
  proposedStepsMarkdown: string;
  status: string;
  originatingNotes: Array<{
    noteText: string;
    sourceSubject?: string;
  }>;
  createdAt: string;
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"escalations" | "lessons" | "prs" | "skills">("escalations");
  const [escalations, setEscalations] = useState<EscalatedTask[]>([]);
  const [lessons, setLessons] = useState<PendingLesson[]>([]);
  const [prs, setPrs] = useState<SelfImproveItem[]>([]);
  const [skillProposals, setSkillProposals] = useState<SkillProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Resolving an escalation
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expertReplyInput, setExpertReplyInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Lesson editing state
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMarkdown, setEditMarkdown] = useState("");

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
      setSkillProposals(data.skillProposals || []);
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

  const handleToggleLessonActive = async (lessonId: string, currentActive: boolean) => {
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_lesson",
          lessonId,
          isActive: !currentActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(`Lesson is now ${!currentActive ? "active" : "switched off"}.`);
        setTimeout(() => setToastMsg(""), 4000);
        await fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_lesson",
          lessonId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("Lesson and markdown file permanently deleted.");
        setTimeout(() => setToastMsg(""), 4000);
        await fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveEditLesson = async () => {
    if (!editingLessonId) return;
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_lesson",
          lessonId: editingLessonId,
          title: editTitle,
          category: editCategory,
          lessonMarkdown: editMarkdown,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("Lesson successfully updated.");
        setTimeout(() => setToastMsg(""), 4000);
        setEditingLessonId(null);
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

  const handleSkillProposalAction = async (proposalId: string, approve: boolean) => {
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approve ? "approve_skill_proposal" : "reject_skill_proposal",
          proposalId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(data.message);
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
  const pendingSkillsCount = skillProposals.filter((p) => p.status === "pending_human_review").length;

  return (
    <AppShell breadcrumbs={[{ label: "Approvals Inbox", href: "/approvals" }]}>
      <div className="space-y-8">
        {/* Header Banner: Proteus Royal Blue to Violet/Purple */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white p-8 md:p-10 shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-xs font-mono font-medium">
                <ShieldAlert className="h-3.5 w-3.5 text-cyan-300" />
                <span>Human Expert Governance</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Approvals &amp; Escalations Inbox
              </h1>
              <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
                Review escalated customer tasks, approve learned lessons, and authorize self-improvement patches.
              </p>
            </div>

            <button
              onClick={fetchApprovals}
              disabled={loading}
              className="p-3 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-2 self-start md:self-auto shadow-sm"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-300" : ""}`} />
              <span className="text-xs font-semibold">Refresh Inbox</span>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{toastMsg}</span>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-900 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Role Authorization Notice</span>
            </div>
            <p className="text-xs text-amber-800/90">{errorMsg}</p>
          </div>
        )}

        {/* Tab Selection in Rounded-Full Pills */}
        <div className="flex flex-wrap gap-2.5 border-b border-[#DCE6F5] pb-2">
          <button
            onClick={() => setActiveTab("escalations")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition whitespace-nowrap shadow-xs ${
              activeTab === "escalations"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Escalated Tasks</span>
            {pendingEscalationsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === "escalations" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                {pendingEscalationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition whitespace-nowrap shadow-xs ${
              activeTab === "lessons"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Learned Lessons</span>
            {pendingLessonsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === "lessons" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                {pendingLessonsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("prs")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition whitespace-nowrap shadow-xs ${
              activeTab === "prs"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            <span>Self-Improve PRs</span>
            {pendingPrsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === "prs" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800 border border-purple-200"}`}>
                {pendingPrsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition whitespace-nowrap shadow-xs ${
              activeTab === "skills"
                ? "bg-[#1D4ED8] text-white shadow-sm font-bold"
                : "bg-white text-[#4A5B78] border border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Email Skill Proposals</span>
            {pendingSkillsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === "skills" ? "bg-white/20 text-white" : "bg-cyan-100 text-cyan-800 border border-cyan-200"}`}>
                {pendingSkillsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Escalations */}
        {activeTab === "escalations" && (
          <div className="space-y-4">
            {escalations.length === 0 && !loading && (
              <div className="p-8 text-center rounded-2xl border border-[#DCE6F5] bg-white text-gray-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <div className="font-semibold text-slate-900">No Pending Escalations</div>
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
                      ? "border-[#DCE6F5] bg-[#050e20]/60 opacity-80"
                      : "border-amber-500/30 bg-white shadow-lg shadow-amber-500/5"
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
                      <p className="text-sm font-medium text-slate-900 pt-1">
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
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-md shadow-blue-500/20"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Answer &amp; Resolve</span>
                      </button>
                    )}
                  </div>

                  {item.expertReply && (
                    <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-50 text-emerald-200 text-xs">
                      <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Expert Answer (Injected into Knowledge Memory):</span>
                      </div>
                      <p className="whitespace-pre-wrap">{item.expertReply}</p>
                    </div>
                  )}

                  {isReplying && (
                    <div className="mt-4 p-4 rounded-xl border border-[#BFDBFE] bg-white space-y-3">
                      <label className="block text-xs font-semibold text-cyan-300">
                        Type authoritative answer for this customer inquiry:
                      </label>
                      <textarea
                        value={expertReplyInput}
                        onChange={(e) => setExpertReplyInput(e.target.value)}
                        placeholder="Provide the exact verified solution, procedure, or policy details..."
                        className="w-full h-24 rounded-lg border border-[#C3D3EA] bg-white p-3 text-xs text-slate-900 focus:outline-none focus:border-cyan-400 font-sans"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setResolvingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#C3D3EA] text-xs text-slate-500 hover:text-slate-900"
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
              <div className="p-8 text-center rounded-2xl border border-[#DCE6F5] bg-white text-gray-400">
                <Sparkles className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                <div className="font-semibold text-slate-900">No Pending Lessons</div>
                <p className="text-xs text-gray-500 mt-1">
                  When support staff corrects the AI consultant during chat, autonomous lessons are proposed here for human approver sign-off.
                </p>
              </div>
            )}

            {lessons.map((lesson) => {
              const isEditing = editingLessonId === lesson.id;
              const isActive = lesson.isActive !== false;
              const isPending = lesson.status === "pending";

              return (
                <div
                  key={lesson.id}
                  className={`p-6 rounded-2xl border transition space-y-4 shadow-sm ${
                    !isActive
                      ? "border-[#DCE6F5] bg-[#050e20]/60 opacity-60"
                      : isPending
                      ? "border-amber-500/30 bg-white shadow-amber-500/5"
                      : "border-[#DCE6F5] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                          {lesson.category}
                        </span>
                        <span className="text-gray-600">&bull;</span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          Confidence: {lesson.confidenceScore ? `${Math.round(Number(lesson.confidenceScore) * 100)}%` : "N/A"}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-mono ${
                            isActive
                              ? "bg-blue-50 text-cyan-400 border border-[#DCE6F5]"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {isActive ? "ACTIVE" : "SWITCHED OFF"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0B1B3A] mt-1">{lesson.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                          lesson.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : lesson.status === "rejected"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-blue-50 text-cyan-400 border border-[#DCE6F5]"
                        }`}
                      >
                        {lesson.status.toUpperCase()}
                      </span>

                      {/* Toggle On/Off */}
                      <button
                        type="button"
                        onClick={() => handleToggleLessonActive(lesson.id, isActive)}
                        className="px-2 py-1 rounded bg-[#EEF4FF] border border-[#DCE6F5] hover:border-[#C3D3EA] text-[11px] text-gray-300 flex items-center gap-1 transition"
                        title={isActive ? "Switch off lesson" : "Switch on lesson"}
                      >
                        {isActive ? (
                          <>
                            <ToggleRight className="h-3.5 w-3.5 text-cyan-400" />
                            <span>On</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3.5 w-3.5 text-gray-500" />
                            <span>Off</span>
                          </>
                        )}
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingLessonId(null);
                          } else {
                            setEditingLessonId(lesson.id);
                            setEditTitle(lesson.title);
                            setEditCategory(lesson.category);
                            setEditMarkdown(lesson.lessonMarkdown);
                          }
                        }}
                        className="p-1 rounded bg-[#EEF4FF] border border-[#DCE6F5] hover:text-slate-900 text-gray-400 transition"
                        title="Edit lesson markdown and metadata"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-1 rounded bg-[#EEF4FF] border border-[#DCE6F5] hover:text-red-400 text-gray-400 transition"
                        title="Delete lesson record and Markdown file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata: Author, When, Which example */}
                  <div className="p-3 rounded-xl bg-white border border-[#DCE6F5] text-[11px] space-y-1 font-mono text-gray-300">
                    <div className="flex items-center justify-between text-gray-400 flex-wrap gap-2">
                      <span><strong>Author:</strong> {lesson.author || "Support Team Member"}</span>
                      <span><strong>Created:</strong> {new Date(lesson.createdAt).toLocaleString()}</span>
                      {lesson.fileName && <span><strong>File:</strong> <code className="text-cyan-400">{lesson.fileName}</code></span>}
                    </div>
                    {lesson.originalQuestion && (
                      <div className="text-gray-300 pt-1 border-t border-[#DCE6F5]">
                        <span className="text-gray-500 font-sans">Which example:</span> &quot;{lesson.originalQuestion}&quot;
                      </div>
                    )}
                    {lesson.wrongAnswer && (
                      <div className="text-amber-300/80">
                        <span className="text-gray-500 font-sans">What was wrong:</span> &quot;{lesson.wrongAnswer}&quot;
                      </div>
                    )}
                  </div>

                  {/* Edit Form or Markdown View */}
                  {isEditing ? (
                    <div className="space-y-3 p-4 rounded-xl bg-[#030919] border border-[#BFDBFE]">
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded bg-[#EEF4FF] border border-[#C3D3EA] p-2 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Category</label>
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full rounded bg-[#EEF4FF] border border-[#C3D3EA] p-2 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Markdown Content</label>
                        <textarea
                          rows={6}
                          value={editMarkdown}
                          onChange={(e) => setEditMarkdown(e.target.value)}
                          className="w-full rounded bg-[#EEF4FF] border border-[#C3D3EA] p-2.5 text-xs font-mono text-slate-900"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingLessonId(null)}
                          className="px-3 py-1.5 rounded border border-[#C3D3EA] text-xs text-slate-500 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditLesson}
                          className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-sm"
                        >
                          Save Changes &amp; Sync Disk
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-[#DCE6F5] bg-white text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {lesson.lessonMarkdown}
                    </div>
                  )}

                  {lesson.status === "pending" && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                      <span className="text-xs text-amber-300 italic">
                        Pending expert sign-off. Strictly NOT active in chat until approved.
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleLessonAction(lesson.id, false)}
                          disabled={submittingAction}
                          className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={() => handleLessonAction(lesson.id, true)}
                          disabled={submittingAction}
                          className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve Lesson</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Self-Improvement PRs */}
        {activeTab === "prs" && (
          <div className="space-y-4">
            {prs.length === 0 && !loading && (
              <div className="p-8 text-center rounded-2xl border border-[#DCE6F5] bg-white text-gray-400">
                <GitPullRequest className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <div className="font-semibold text-slate-900">No Self-Improvement Runs</div>
                <p className="text-xs text-gray-500 mt-1">
                  Automated benchmark patches and prompt optimization runs will generate branch PRs here for final merge approval.
                </p>
              </div>
            )}

            {prs.map((pr) => (
              <div
                key={pr.id}
                className="p-6 rounded-2xl border border-[#DCE6F5] bg-white space-y-4 shadow-sm"
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
        {/* Tab 4: Skill Improvements from Email Teaching Notes (Task 2.6) */}
        {activeTab === "skills" && (
          <div className="space-y-4">
            {skillProposals.length === 0 && !loading && (
              <div className="p-8 text-center rounded-2xl border border-[#DCE6F5] bg-white text-gray-400">
                <CheckCircle2 className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <div className="font-semibold text-slate-900">No Pending Skill Improvements</div>
                <p className="text-xs text-gray-500 mt-1">
                  Human teaching notes added on past email threads will be analyzed by Claude Opus 5.5 to propose SOP improvements here.
                </p>
              </div>
            )}

            {skillProposals.map((prop) => (
              <div
                key={prop.id}
                className="p-5 rounded-2xl border border-[#DCE6F5] bg-white hover:border-[#C3D3EA] transition space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#DCE6F5] pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#0B1B3A] text-sm">{prop.targetSkillName}</span>
                      <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                        Model: {prop.modelUsed}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-sans">{prop.diffSummary}</p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold self-start md:self-auto ${
                      prop.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : prop.status === "rejected"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}
                  >
                    {prop.status.toUpperCase()}
                  </span>
                </div>

                {/* Originating notes used */}
                <div className="p-3 bg-[#F6F9FF] rounded-xl border border-[#DCE6F5]/60 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">
                    Teaching Notes Used by Model:
                  </span>
                  {prop.originatingNotes?.map((n: any, idx: number) => (
                    <div key={idx} className="text-gray-300 flex items-center gap-2">
                      <span>&bull;</span>
                      <span className="font-mono text-amber-300">&quot;{n.noteText}&quot;</span>
                      {n.sourceSubject && (
                        <span className="text-gray-500 text-[10px]">(from {n.sourceSubject})</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Before vs Proposed SOP Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase">Previous SOP Steps (v1):</span>
                    <pre className="rounded-xl bg-[#F1F6FF] text-[#1E3A8A] border border-[#DCE6F5] p-3 text-gray-400 whitespace-pre-wrap max-h-44 overflow-y-auto border border-[#DCE6F5] leading-relaxed text-[11px]">
                      {prop.previousStepsMarkdown}
                    </pre>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-emerald-400 uppercase">
                      Proposed SOP Steps (3 Steps Prioritized First):
                    </span>
                    <pre className="rounded-xl bg-emerald-50 p-3 text-emerald-200 whitespace-pre-wrap max-h-44 overflow-y-auto border border-emerald-500/20 leading-relaxed text-[11px]">
                      {prop.proposedStepsMarkdown}
                    </pre>
                  </div>
                </div>

                {prop.status === "pending_human_review" && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleSkillProposalAction(prop.id, false)}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs font-semibold transition"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => handleSkillProposalAction(prop.id, true)}
                      disabled={submittingAction}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve &amp; Update Skill</span>
                    </button>
                  </div>
                )}

                {prop.status === "approved" && (
                  <div className="flex justify-end pt-1">
                    <Link
                      href="/settings/roles-prompts?tab=skills"
                      className="flex items-center gap-1.5 text-xs font-mono text-purple-300 hover:text-slate-900 bg-purple-950/50 border border-purple-500/30 px-3 py-1.5 rounded-lg transition"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>View &amp; Edit in Settings</span>
                    </Link>
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
