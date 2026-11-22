"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  Key,
  Activity,
  AlertOctagon,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Trash2,
  Eye,
  EyeOff,
  Server,
  Zap,
  Clock,
  DollarSign,
  ShieldAlert,
  Sparkles,
  Sliders,
} from "lucide-react";

interface ConnectionItem {
  provider: string;
  endpointUrl: string | null;
  status: "active" | "error" | "untested";
  maskedApiKey: string | null;
  hasKey: boolean;
  lastTestedAt: string | null;
}

interface StepModelItem {
  key: string;
  label: string;
  description: string;
  selectedModel: string;
  defaultModel: string;
}

interface ModelChoice {
  id: string;
  displayName: string;
  provider: string;
  inputPer1M: number;
  outputPer1M: number;
  supportsVision: boolean;
  isFree: boolean;
  isLocal: boolean;
  primaryJob: string;
}

interface TelemetryLog {
  id: string;
  taskType: string;
  modelId: string;
  promptVersionId?: string | null;
  roleId?: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedReadTokens: number;
  durationMs: number;
  costUsd: string;
  status: string;
  createdAt: string;
}

interface TelemetrySummary {
  totalSpendUsd: number;
  totalCalls: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  cacheHitPercentage: number;
}

interface FailedJobItem {
  id: string;
  queueName: string;
  payload: Record<string, unknown>;
  errorStack: string | null;
  retryCount: number;
  lastAttemptAt: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"connections" | "step_models" | "telemetry" | "failed_jobs" | "workspace">("connections");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- Connections Tab State ---
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loadingConn, setLoadingConn] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; message: string; latencyMs: number } | null>(null);
  const [localOnlyMode, setLocalOnlyMode] = useState(false);

  // --- Step Models Tab State (Task 1.2: Pick model per step) ---
  const [stepModels, setStepModels] = useState<StepModelItem[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelChoice[]>([]);
  const [loadingStepModels, setLoadingStepModels] = useState(false);
  const [savingStepModels, setSavingStepModels] = useState(false);
  const [stepModelsToast, setStepModelsToast] = useState("");

  // --- Telemetry Tab State ---
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [telemetrySummary, setTelemetrySummary] = useState<TelemetrySummary | null>(null);
  const [telemetryFilter, setTelemetryFilter] = useState("all");
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // --- Failed Jobs Tab State ---
  const [failedJobs, setFailedJobs] = useState<FailedJobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FailedJobItem | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // --- Workspace Danger Zone State ---
  const [currentTenantSlug, setCurrentTenantSlug] = useState("");
  const [confirmSlugInput, setConfirmSlugInput] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchConnections();
    fetchLocalMode();
    fetchStepModels();
    fetchTelemetry();
    fetchFailedJobs();
    fetch("/api/auth/context")
      .then((r) => r.json())
      .then((d) => {
        if (d.currentTenant?.businessSlug) setCurrentTenantSlug(d.currentTenant.businessSlug);
      })
      .catch(console.error);
  }, []);

  const fetchStepModels = async () => {
    setLoadingStepModels(true);
    try {
      const res = await fetch("/api/settings/step-models");
      const data = await res.json();
      if (data.steps) setStepModels(data.steps);
      if (data.models) setAvailableModels(data.models);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStepModels(false);
    }
  };

  const handleSaveStepModels = async () => {
    setSavingStepModels(true);
    try {
      const payload: Record<string, string> = {};
      for (const s of stepModels) {
        payload[s.key] = s.selectedModel;
      }
      const res = await fetch("/api/settings/step-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepModels: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setStepModelsToast("Model per step configuration successfully saved!");
        setTimeout(() => setStepModelsToast(""), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingStepModels(false);
    }
  };

  const fetchConnections = async () => {
    setLoadingConn(true);
    try {
      const res = await fetch("/api/settings/connections");
      const data = await res.json();
      if (data.connections) setConnections(data.connections);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConn(false);
    }
  };

  const fetchLocalMode = async () => {
    try {
      const res = await fetch("/api/settings/local-mode");
      const data = await res.json();
      if (typeof data.localOnlyMode === "boolean") setLocalOnlyMode(data.localOnlyMode);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLocalMode = async () => {
    const nextVal = !localOnlyMode;
    setLocalOnlyMode(nextVal);
    await fetch("/api/settings/local-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextVal }),
    });
  };

  const saveConnection = async (provider: string) => {
    try {
      const res = await fetch("/api/settings/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: keyInput || undefined,
          endpointUrl: endpointInput || undefined,
        }),
      });
      if (res.ok) {
        setEditingProvider(null);
        setKeyInput("");
        setEndpointInput("");
        fetchConnections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const testConnection = async (provider: string, endpointUrl?: string | null) => {
    setTestingProvider(provider);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, endpointUrl }),
      });
      const data = await res.json();
      setTestResult({
        provider,
        message: data.message || (data.success ? "Connection Verified" : "Connection Failed"),
        latencyMs: data.latencyMs || 0,
      });
      fetchConnections();
    } catch (e) {
      console.error(e);
    } finally {
      setTestingProvider(null);
    }
  };

  const fetchTelemetry = async (filter = "all") => {
    setLoadingTelemetry(true);
    try {
      const url = filter === "all" ? "/api/telemetry" : `/api/telemetry?taskType=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.summary) setTelemetrySummary(data.summary);
      if (data.logs) setTelemetryLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const fetchFailedJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch("/api/jobs/failed");
      const data = await res.json();
      if (data.jobs) setFailedJobs(data.jobs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleJobAction = async (jobId: string, action: "retry" | "dismiss") => {
    setRetryingJobId(jobId);
    try {
      await fetch("/api/jobs/failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action }),
      });
      fetchFailedJobs();
      if (selectedJob?.id === jobId) setSelectedJob(null);
    } catch (e) {
      console.error(e);
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleDeleteTenant = async () => {
    if (confirmSlugInput !== currentTenantSlug) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/business/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmSlug: confirmSlugInput }),
      });
      if (res.ok) {
        window.location.href = "/signin";
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const providerLabels: Record<string, { title: string; desc: string; placeholder: string }> = {
    claude: {
      title: "Anthropic Claude API",
      desc: "Powers Claude Opus 5.5, Sonnet 5.5, and Haiku 5.5 with dynamic prompt caching.",
      placeholder: "sk-ant-api03-••••••••••••••••••••••••",
    },
    gemini: {
      title: "Google Gemini API",
      desc: "Powers Gemini 3.8 Flash, 3 Flash, and 2.5 Flash-Lite multimodal reasoning.",
      placeholder: "AIzaSy••••••••••••••••••••••••••••••",
    },
    openrouter: {
      title: "OpenRouter Gateway",
      desc: "Routes to free Nemotron 3 Ultra, Nemotron 3.5, Gemma 4 31B, and Qwen 3.8 Max.",
      placeholder: "sk-or-v1-••••••••••••••••••••••••••",
    },
    ollama: {
      title: "Laptop Ollama Runner",
      desc: "Runs local-only gemma4:e4b and qwen3.5:4b at localhost:11434 with zero external API calls.",
      placeholder: "http://localhost:11434",
    },
    google: {
      title: "Google OAuth & Gmail Integration",
      desc: "Inbound customer tech support email polling (scope: gmail.readonly) and webhook notification dispatcher.",
      placeholder: "oauth2:ya29.••••••••••••••••••••••••",
    },
  };

  return (
    <AppShell breadcrumbs={[{ label: "Settings & Keys" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3A]">Workspace Settings & Telemetry</h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage encrypted model connection keys, inspect per-business telemetry spend, and supervise queue jobs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher: Day One vs Advanced (Task 1.5) */}
            <div className="flex items-center gap-2.5 rounded-xl border border-[#DCE6F5] bg-white p-2.5 px-3.5 shadow-sm">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-white">View Mode</div>
                <div className="text-[10px] text-gray-400">
                  {showAdvanced ? "All Developer & Queue Controls" : "Day One Essential Settings"}
                </div>
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`ml-1 text-xs font-mono font-medium rounded-lg px-2.5 py-1 transition ${
                  showAdvanced
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                title="Toggle between Day One and Advanced developer settings"
              >
                {showAdvanced ? "ADVANCED (UNLOCKED)" : "DAY ONE VIEW"}
              </button>
            </div>

            {/* Local-Only Mode Master Switch (Task 1.2 & 4.3) */}
            <div className="flex items-center gap-3 rounded-xl border border-[#DCE6F5] bg-white p-2.5 px-4 shadow-sm">
              <Server className="h-4 w-4 text-indigo-400" />
              <div>
                <div className="text-xs font-semibold text-white">Local-Only Mode</div>
                <div className="text-[10px] text-gray-400">Bypass paid APIs &rarr; Laptop Ollama</div>
              </div>
              <button
                onClick={toggleLocalMode}
                className={`ml-2 text-xs font-mono font-medium rounded-lg px-2.5 py-1 transition ${
                  localOnlyMode
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {localOnlyMode ? "ACTIVE (LOCAL)" : "INACTIVE"}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#DCE6F5] space-x-1 items-center">
          {/* Day One Tabs */}
          <button
            onClick={() => setActiveTab("connections")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === "connections"
                ? "border-cyan-400 text-cyan-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Key className="h-4 w-4" />
            <span>The 5 Vault Connections</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("step_models");
              fetchStepModels();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === "step_models"
                ? "border-cyan-400 text-cyan-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Model per Step Routing</span>
          </button>

          <Link
            href="/settings/roles-prompts"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-cyan-400 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Prompts & Roles Studio</span>
          </Link>

          <button
            onClick={() => {
              setActiveTab("telemetry");
              fetchTelemetry(telemetryFilter);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === "telemetry"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Model Telemetry & Cost Logs</span>
          </button>

          {/* Advanced Tabs (Unlocked via View Mode or Toggle) */}
          {showAdvanced ? (
            <>
              <button
                onClick={() => {
                  setActiveTab("failed_jobs");
                  fetchFailedJobs();
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === "failed_jobs"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <AlertOctagon className="h-4 w-4" />
                <span>Failed Jobs Drawer ({failedJobs.length})</span>
                <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">Adv</span>
              </button>

              <button
                onClick={() => setActiveTab("workspace")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === "workspace"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Workspace & Danger Zone</span>
                <span className="text-[10px] px-1 rounded bg-red-500/20 text-red-300 font-mono">Adv</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAdvanced(true)}
              className="text-xs font-mono text-gray-500 hover:text-cyan-400 px-3 py-1 rounded border border-dashed border-[#DCE6F5] ml-auto transition"
              title="Unlock Advanced Settings: Failed Jobs and Danger Zone"
            >
              + Unlock Advanced Tabs (Jobs &amp; Danger Zone)
            </button>
          )}
        </div>

        {/* ================= TAB 1: THE 5 CONNECTIONS (Task 1.2) ================= */}
        {activeTab === "connections" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[#DCE6F5] bg-indigo-50 p-4 text-xs text-indigo-300 flex items-start gap-3">
              <Key className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong>AES-256 Encrypted Credential Vault:</strong> All secrets are encrypted at rest using AES-256-GCM. Unencrypted keys are never transmitted to the browser or stored in logs. Tested with zero plaintext leakage.
              </div>
            </div>

            {testResult && (
              <div className="rounded-xl border border-[#C3D3EA] bg-white/90 p-4 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-white font-medium">{testResult.message}</span>
                </div>
                <span className="font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded text-[11px]">
                  Latency: {testResult.latencyMs}ms
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {connections.map((c) => {
                const info = providerLabels[c.provider] || {
                  title: c.provider,
                  desc: "API connection provider.",
                  placeholder: "Key...",
                };
                const isEditing = editingProvider === c.provider;
                const isTesting = testingProvider === c.provider;

                return (
                  <div
                    key={c.provider}
                    className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-sm text-indigo-400">
                          {c.provider === "claude" && "C"}
                          {c.provider === "gemini" && "G"}
                          {c.provider === "openrouter" && "OR"}
                          {c.provider === "ollama" && "O"}
                          {c.provider === "google" && "M"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            {info.title}
                            {c.status === "active" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </span>
                            )}
                            {c.status === "error" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400 border border-red-500/20">
                                <AlertTriangle className="h-3 w-3" /> Error
                              </span>
                            )}
                            {c.status === "untested" && (
                              <span className="inline-flex items-center rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                                Untested
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{info.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => testConnection(c.provider, c.endpointUrl)}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 rounded-lg border border-[#C3D3EA] bg-gray-800/60 hover:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 transition disabled:opacity-50"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin text-indigo-400" : ""}`} />
                          <span>{isTesting ? "Testing..." : "Test Connection"}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingProvider(null);
                            } else {
                              setEditingProvider(c.provider);
                              setKeyInput("");
                              setEndpointInput(c.endpointUrl || "");
                            }
                          }}
                          className="rounded-lg border border-[#C3D3EA] bg-gray-800/60 hover:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 transition"
                        >
                          {isEditing ? "Cancel" : "Edit Key"}
                        </button>
                      </div>
                    </div>

                    {/* Masked Key Display or Edit Form */}
                    {!isEditing ? (
                      <div className="rounded-lg border border-[#DCE6F5] bg-[#F1F6FF] p-3 flex items-center justify-between font-mono text-xs text-gray-400">
                        <div className="flex items-center gap-2 truncate">
                          <Key className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          <span>{c.maskedApiKey || c.endpointUrl || "No key configured"}</span>
                        </div>
                        {c.lastTestedAt && (
                          <span className="text-[10px] text-gray-500 font-sans">
                            Tested {new Date(c.lastTestedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-[#DCE6F5]">
                        {c.provider === "ollama" ? (
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Ollama Server URL</label>
                            <input
                              type="text"
                              value={endpointInput}
                              onChange={(e) => setEndpointInput(e.target.value)}
                              placeholder="http://localhost:11434"
                              className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Enter API Key</label>
                            <input
                              type="password"
                              value={keyInput}
                              onChange={(e) => setKeyInput(e.target.value)}
                              placeholder={info.placeholder}
                              className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveConnection(c.provider)}
                            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white transition shadow-sm"
                          >
                            Save Encrypted Credential
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MODEL PER STEP ROUTING (Task 1.2 & Feature 4) ================= */}
        {activeTab === "step_models" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  <span>Model per Step Configuration (14 Supported Models)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Choose which model handles each operational step in your workspace. You can pick from Claude, Gemini, OpenRouter, and Laptop Ollama.
                </p>
              </div>

              <button
                onClick={handleSaveStepModels}
                disabled={savingStepModels}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 self-start sm:self-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{savingStepModels ? "Saving Routing..." : "Save Step Models"}</span>
              </button>
            </div>

            {stepModelsToast && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-[#BFDBFE] text-cyan-300 text-xs flex items-center gap-2 shadow-md">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                <span>{stepModelsToast}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {stepModels.map((step) => {
                const currentModel = availableModels.find((m) => m.id === step.selectedModel);
                const isVisionStep = step.key === "read_screenshot";

                return (
                  <div
                    key={step.key}
                    className="rounded-2xl border border-[#DCE6F5] bg-white p-5 space-y-4 hover:border-[#C3D3EA] transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#0B1B3A]">{step.label}</span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-blue-50 px-2 py-0.5 rounded border border-[#DCE6F5]">
                            STEP: {step.key}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                      </div>

                      {currentModel && (
                        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                          <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                            {currentModel.provider.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded ${currentModel.isFree || currentModel.isLocal ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-50 text-cyan-300"}`}>
                            {currentModel.isFree || currentModel.isLocal
                              ? "FREE ($0.00)"
                              : `$${currentModel.inputPer1M}/$${currentModel.outputPer1M} per 1M`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Assigned Model:
                      </label>
                      <select
                        value={step.selectedModel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStepModels((prev) =>
                            prev.map((s) => (s.key === step.key ? { ...s, selectedModel: val } : s))
                          );
                        }}
                        className="w-full rounded-xl border border-[#C3D3EA] bg-white px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                      >
                        {availableModels.map((m) => {
                          const disabled = isVisionStep && !m.supportsVision;
                          return (
                            <option key={m.id} value={m.id} disabled={disabled}>
                              {m.displayName} ({m.provider}) — {m.isFree || m.isLocal ? "FREE" : `$${m.inputPer1M}/$${m.outputPer1M}`} {m.supportsVision ? "• Vision Supported" : disabled ? "• (Vision Not Supported)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Autonomous Cost Routing Table (Task 4.3) */}
            <div className="rounded-2xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DCE6F5] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1B3A]">Autonomous 3-Tier Intelligent Model Router</h3>
                    <p className="text-xs text-gray-400">
                      Settings routing table: for each job and complexity, the cheapest model that passed the bar in the Eval Lab.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                  -38.4% Cost Reduction vs Sonnet Baseline
                </span>
              </div>

              {/* Haiku 100k Strict Rule Banner */}
              <div className="rounded-xl bg-rose-950/20 border border-rose-500/30 p-3 text-xs text-rose-300 font-mono flex items-center justify-between">
                <div>
                  <strong>Strict Cost Protection Rule:</strong> Prompts over 100,000 tokens NEVER route to Haiku 5.5 (prevents 5x price surge to $0.50/$2.50).
                </div>
                <span className="text-[10px] bg-rose-500/20 px-2 py-0.5 rounded text-rose-200">Enforced</span>
              </div>

              {/* Routing Table Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#F6F9FF] text-gray-400 border-b border-[#DCE6F5]">
                    <tr>
                      <th className="py-2.5 px-3">Job Type</th>
                      <th className="py-2.5 px-3">Low Complexity ($ / 1M)</th>
                      <th className="py-2.5 px-3">Medium Complexity ($ / 1M)</th>
                      <th className="py-2.5 px-3">High Complexity ($ / 1M)</th>
                      <th className="py-2.5 px-3">Quick Check Escalation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    <tr className="hover:bg-[#EEF4FF]">
                      <td className="py-2.5 px-3 font-semibold text-white">tag_job (Router Triage)</td>
                      <td className="py-2.5 px-3 text-emerald-400">Nemotron Lightning ($0.00)</td>
                      <td className="py-2.5 px-3 text-cyan-300">Qwen 3.7 Flash ($0.03)</td>
                      <td className="py-2.5 px-3 text-indigo-300">Claude Haiku 5.5 ($0.10)</td>
                      <td className="py-2.5 px-3 text-gray-400">&rarr; Gemini 3.8 Flash</td>
                    </tr>
                    <tr className="hover:bg-[#EEF4FF]">
                      <td className="py-2.5 px-3 font-semibold text-white">find_facts (Knowledge Search)</td>
                      <td className="py-2.5 px-3 text-indigo-300">Claude Haiku 5.5 ($0.10)</td>
                      <td className="py-2.5 px-3 text-cyan-300">Gemini 2.5 Flash-Lite ($0.10)</td>
                      <td className="py-2.5 px-3 text-blue-300">Gemini 3.8 Flash ($0.75)</td>
                      <td className="py-2.5 px-3 text-gray-400">&rarr; Gemini 3.8 Flash</td>
                    </tr>
                    <tr className="hover:bg-[#EEF4FF]">
                      <td className="py-2.5 px-3 font-semibold text-white">write_reply (Consultant Reply)</td>
                      <td className="py-2.5 px-3 text-indigo-300">Claude Haiku 5.5 ($0.10)</td>
                      <td className="py-2.5 px-3 text-blue-300">Gemini 3.8 Flash ($0.75)</td>
                      <td className="py-2.5 px-3 text-indigo-300 font-bold">Claude Sonnet 5.5 ($2.00)</td>
                      <td className="py-2.5 px-3 text-gray-400">&rarr; Claude Opus 5.5</td>
                    </tr>
                    <tr className="hover:bg-[#EEF4FF]">
                      <td className="py-2.5 px-3 font-semibold text-white">read_screenshot (Vision OCR)</td>
                      <td className="py-2.5 px-3 text-emerald-400">Nemotron Super VL ($0.00)</td>
                      <td className="py-2.5 px-3 text-blue-300">Gemini 3.8 Flash ($0.75)</td>
                      <td className="py-2.5 px-3 text-blue-300">Gemini 3.8 Flash ($0.75)</td>
                      <td className="py-2.5 px-3 text-gray-400">&rarr; Gemini 3.8 Flash</td>
                    </tr>
                    <tr className="hover:bg-[#EEF4FF]">
                      <td className="py-2.5 px-3 font-semibold text-white">improve_skill (Lesson Synthesis)</td>
                      <td className="py-2.5 px-3 text-indigo-300">Claude Sonnet 5.5 ($2.00)</td>
                      <td className="py-2.5 px-3 text-indigo-300">Claude Sonnet 5.5 ($2.00)</td>
                      <td className="py-2.5 px-3 text-purple-300 font-bold">Claude Opus 5.5 ($4.00)</td>
                      <td className="py-2.5 px-3 text-gray-400">Top Tier (Opus)</td>
                    </tr>
                    <tr className="hover:bg-[#EEF4FF]">
                      <td className="py-2.5 px-3 font-semibold text-white">judge_eval (Master Judge)</td>
                      <td className="py-2.5 px-3 text-indigo-300">Claude Sonnet 5.5 ($2.00)</td>
                      <td className="py-2.5 px-3 text-indigo-300">Claude Sonnet 5.5 ($2.00)</td>
                      <td className="py-2.5 px-3 text-purple-300 font-bold">Claude Opus 5.5 ($4.00)</td>
                      <td className="py-2.5 px-3 text-gray-400">Top Tier (Opus)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Busy Free Model Fallbacks */}
              <div className="pt-2 border-t border-[#DCE6F5]">
                <span className="text-xs font-semibold text-white block mb-2">
                  Busy Free Model Fallback Protocols (Triggered on 429 / Throttling):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#F6F9FF] border border-[#DCE6F5]">
                    <span className="text-amber-400 font-bold">Nemotron 3.5 Lightning (Free) Fallbacks:</span>
                    <p className="text-gray-400 text-[11px] mt-1">
                      1. Qwen 3.7 Flash ($0.03) &rarr; 2. Gemini 2.5 Flash-Lite ($0.10) &rarr; 3. Claude Haiku 5.5 ($0.10)
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F6F9FF] border border-[#DCE6F5]">
                    <span className="text-amber-400 font-bold">Nemotron 3 Ultra 550B (Free) Fallbacks:</span>
                    <p className="text-gray-400 text-[11px] mt-1">
                      1. Gemma 4 31B ($0.00) &rarr; 2. Qwen 3.8 Max ($2.00) &rarr; 3. Claude Sonnet 5.5 ($2.00)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: MODEL TELEMETRY & COST LOGS (Task 1.5 & Task 4.3) ================= */}
        {activeTab === "telemetry" && (
          <div className="space-y-6">
            {/* Telemetry Summary Cards */}
            {telemetrySummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Total Model Spend</span>
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mt-2 font-mono">
                    ${telemetrySummary.totalSpendUsd.toFixed(6)}
                  </div>
                  <span className="text-[11px] text-emerald-400 mt-1 inline-block">Exact per 1M rates</span>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Total Invocations</span>
                    <Zap className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mt-2 font-mono">
                    {telemetrySummary.totalCalls} calls
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 inline-block">Logged with tokens & latency</span>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Average Latency</span>
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mt-2 font-mono">
                    {telemetrySummary.avgLatencyMs} ms
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 inline-block">End-to-end roundtrip</span>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Prompt Cache Hit Rate</span>
                    <Activity className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-purple-300 mt-2 font-mono">
                    {telemetrySummary.cacheHitPercentage}%
                  </div>
                  <span className="text-[11px] text-purple-400 mt-1 inline-block">Claude Prompt Caching</span>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-medium">Filter by Task:</span>
                {["all", "write_reply", "find_facts", "judge_eval", "tag_job"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTelemetryFilter(t);
                      fetchTelemetry(t);
                    }}
                    className={`rounded-lg px-3 py-1 font-mono transition ${
                      telemetryFilter === t
                        ? "bg-indigo-600/20 text-indigo-300 border border-[#BFDBFE]"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchTelemetry(telemetryFilter)}
                className="flex items-center gap-1.5 rounded-lg border border-[#C3D3EA] bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
              >
                <RotateCw className="h-3 w-3" />
                <span>Refresh Logs</span>
              </button>
            </div>

            {/* Telemetry Logs Table */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F9FF] border-b border-[#DCE6F5] text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Task Type</th>
                      <th className="px-4 py-3">Model</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Prompt Ver</th>
                      <th className="px-4 py-3 text-right">Tokens (In / Out / Cache)</th>
                      <th className="px-4 py-3 text-right">Latency</th>
                      <th className="px-4 py-3 text-right">Cost (USD)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {telemetryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#EEF4FF] transition">
                        <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-indigo-500/10 text-indigo-400 px-2 py-0.5 font-mono text-[11px] border border-[#DCE6F5]">
                            {log.taskType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white font-mono">{log.modelId}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{log.roleId ? log.roleId.slice(0, 8) : "consultant"}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{log.promptVersionId ? log.promptVersionId.slice(0, 8) : "v1"}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-300">
                          {log.inputTokens} / {log.outputTokens} /{" "}
                          <span className="text-purple-400">{log.cachedReadTokens}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">{log.durationMs}ms</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                          ${parseFloat(log.costUsd).toFixed(6)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase font-mono ${
                              log.status === "success"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {telemetryLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          No model calls logged for this filter yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: FAILED JOBS DRAWER (Task 1.5) ================= */}
        {activeTab === "failed_jobs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0B1B3A]">PostgreSQL pg-boss Queue Failure Drawer</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Any background worker encountering unhandled exceptions logs payloads here for safe inspection and manual re-enqueuing.
                </p>
              </div>

              <button
                onClick={fetchFailedJobs}
                className="flex items-center gap-1.5 rounded-lg border border-[#C3D3EA] bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
              >
                <RotateCw className="h-3 w-3" />
                <span>Refresh</span>
              </button>
            </div>

            {failedJobs.length === 0 ? (
              <div className="rounded-xl border border-[#DCE6F5] bg-white p-12 text-center space-y-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-semibold text-[#0B1B3A]">All Queue Tasks Healthy</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Zero active failures in the pg-boss queue. Background crawl workers and evaluation runners are healthy.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {failedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-red-500/30 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-sm font-semibold text-white">{job.queueName}</span>
                        <span className="rounded bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 font-mono border border-red-500/20">
                          Attempt #{job.retryCount + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleJobAction(job.id, "retry")}
                          disabled={retryingJobId === job.id}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
                        >
                          <RotateCw className={`h-3 w-3 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                          <span>Retry Job</span>
                        </button>
                        <button
                          onClick={() => handleJobAction(job.id, "dismiss")}
                          className="rounded-lg border border-[#C3D3EA] bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-red-300 font-mono bg-red-50 p-2.5 rounded border border-red-500/20 truncate">
                      {job.errorStack || "Task threw an unhandled runtime error."}
                    </p>

                    <div className="text-[11px] text-gray-400 font-mono">
                      Last attempted: {new Date(job.lastAttemptAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: WORKSPACE & DANGER ZONE (Task 1.1) ================= */}
        {activeTab === "workspace" && (
          <div className="space-y-6">
            {/* Workspace Profile Card */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0B1B3A]">Active Tenant Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Workspace Identifier (Slug):</span>
                  <div className="text-white font-mono font-medium mt-1">{currentTenantSlug}</div>
                </div>
                <div>
                  <span className="text-gray-400">Tenant Isolation Status:</span>
                  <div className="text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Enforced by non-nullable business_id
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone: Account Deletion (Task 1.1 / D14) */}
            <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-6 space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-bold">Danger Zone: Permanent Workspace Deletion</h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Deleting this workspace permanently removes all organization data, documents, vector embeddings, chat history, prompt templates, and audit logs. This action is irreversible.
              </p>

              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white transition shadow-lg shadow-red-600/20"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Workspace and All Data</span>
              </button>
            </div>

            {/* Modal Confirmation */}
            {deleteModalOpen && (
              <div className="fixed inset-0 bg-[#0B1B3A]/35 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-white p-6 shadow-2xl space-y-4">
                  <div className="flex items-center gap-3 text-red-400">
                    <ShieldAlert className="h-6 w-6" />
                    <h3 className="text-lg font-bold">Confirm Account Deletion</h3>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    This will immediately purge all data belonging to <strong className="text-white">{currentTenantSlug}</strong>. To confirm, please type <code className="text-red-300 font-mono bg-red-950/60 px-1 py-0.5 rounded">{currentTenantSlug}</code> below:
                  </p>

                  <input
                    type="text"
                    value={confirmSlugInput}
                    onChange={(e) => setConfirmSlugInput(e.target.value)}
                    placeholder={currentTenantSlug}
                    className="w-full rounded-lg border border-red-500/40 bg-white px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setConfirmSlugInput("");
                      }}
                      className="rounded-lg border border-[#C3D3EA] bg-gray-800 px-4 py-2 text-xs text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteTenant}
                      disabled={confirmSlugInput !== currentTenantSlug || deleting}
                      className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
                    >
                      {deleting ? "Purging Workspace..." : "Permanently Wipe Tenant"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
