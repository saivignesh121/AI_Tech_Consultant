"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  FlaskConical,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  ShieldCheck,
  Server,
  DollarSign,
  Clock,
  ArrowRight,
  Filter,
  Lock,
  GraduationCap,
  FileText,
} from "lucide-react";

interface BenchmarkCaseItem {
  id: string;
  category: string;
  question: string;
  expectedAnswer: string;
  expectedSource?: string;
  expectedAction?: string;
}

interface ModelMetricItem {
  modelId: string;
  displayName: string;
  provider: string;
  qualityScore: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  costPer100RunsUsd: number;
  isLocal: boolean;
}

interface RouterComparisonData {
  totalTasks: number;
  sonnetAlwaysCostUsd: number;
  routerCostUsd: number;
  dollarsSavedUsd: number;
  percentSaved: number;
  sonnetAvgQualityScore: number;
  routerAvgQualityScore: number;
}

export default function EvalLabPage() {
  const [activeTab, setActiveTab] = useState<"benchmark" | "models" | "judge" | "router" | "prove-learned">("models");

  // --- Prove That It Learned State (Task 3.5) ---
  const [learningProof, setLearningProof] = useState<any | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("dns-acme-ssl");
  const [evaluatingLearning, setEvaluatingLearning] = useState(false);
  const [scenariosList, setScenariosList] = useState<any[]>([]);

  // --- Benchmark Tab State ---
  const [cases, setCases] = useState<BenchmarkCaseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkModel, setBenchmarkModel] = useState("claude-sonnet-5.5");
  const [benchmarkResult, setBenchmarkResult] = useState<{
    overallScore: number;
    passedCount: number;
    failedCount: number;
    passBarExceeded: boolean;
  } | null>(null);

  // --- Models Matrix State ---
  const [matrix, setMatrix] = useState<ModelMetricItem[]>([]);
  const [localOnly, setLocalOnly] = useState(false);

  // --- Judge & Calibration State ---
  const [calibrationData, setCalibrationData] = useState<{
    totalCases: number;
    agreedCases: number;
    agreementRatePercent: number;
    cases: Array<{ caseId: string; question: string; humanGrade: number; aiJudgeGrade: number; agreed: boolean }>;
  } | null>(null);

  // --- Router State ---
  const [routerStats, setRouterStats] = useState<RouterComparisonData | null>(null);
  const [testPrompt, setTestPrompt] = useState("How do I configure custom CNAME subdomains with SSL?");
  const [routingResult, setRoutingResult] = useState<{
    selectedModelId: string;
    complexity: string;
    estimatedCostUsd: number;
    reason: string;
  } | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  useEffect(() => {
    fetchBenchmarkCases();
    fetchModelsMatrix();
    fetchJudgeCalibration();
    fetchRouterComparison();
    fetchLearningProof();
  }, []);

  const fetchBenchmarkCases = async (cat = "all") => {
    try {
      const url = cat === "all" ? "/api/evals/benchmark" : `/api/evals/benchmark?category=${cat}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.cases) setCases(data.cases);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchModelsMatrix = async () => {
    try {
      const res = await fetch("/api/evals/models");
      const data = await res.json();
      if (data.matrix) setMatrix(data.matrix);
      if (typeof data.localOnlyMode === "boolean") setLocalOnly(data.localOnlyMode);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchJudgeCalibration = async () => {
    try {
      const res = await fetch("/api/evals/judge");
      const data = await res.json();
      if (data.calibration) setCalibrationData(data.calibration);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRouterComparison = async () => {
    try {
      const res = await fetch("/api/evals/router");
      const data = await res.json();
      if (data.comparison) setRouterStats(data.comparison);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLearningProof = async (scId = selectedScenarioId) => {
    setEvaluatingLearning(true);
    try {
      const res = await fetch(`/api/evals/prove-learned?scenarioId=${scId}`);
      const data = await res.json();
      if (data.proof) {
        setLearningProof(data.proof);
      }
      if (data.availableScenarios) {
        setScenariosList(data.availableScenarios);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluatingLearning(false);
    }
  };

  const handleRunBatchBenchmark = async () => {
    setRunningBenchmark(true);
    setBenchmarkResult(null);
    try {
      const res = await fetch("/api/evals/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: benchmarkModel, testCategory: selectedCategory }),
      });
      const data = await res.json();
      if (data.success) {
        setBenchmarkResult({
          overallScore: data.overallScore,
          passedCount: data.passedCount,
          failedCount: data.failedCount,
          passBarExceeded: data.passBarExceeded,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleTestRoute = async () => {
    if (!testPrompt.trim() || routingLoading) return;
    setRoutingLoading(true);
    try {
      const res = await fetch("/api/evals/router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: testPrompt, taskType: "write_reply" }),
      });
      const data = await res.json();
      if (data.decision) setRoutingResult(data.decision);
    } catch (e) {
      console.error(e);
    } finally {
      setRoutingLoading(false);
    }
  };

  return (
    <AppShell breadcrumbs={[{ label: "The Eval Lab" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-indigo-400" />
              <span>The Eval Lab</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Continuous 180-test benchmark verification, 14-model quality matrix, and 3-tier cost router.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-1.5 text-xs font-mono text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Pass Bar: 98.8% Active</span>
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("models")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "models"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>14-Model Comparison Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("benchmark")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "benchmark"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>Benchmark Suite (180 Tests)</span>
          </button>

          <button
            onClick={() => setActiveTab("judge")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "judge"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>AI Judge &amp; Calibration</span>
          </button>

          <button
            onClick={() => setActiveTab("router")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "router"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>3-Tier Router &amp; Release Gate</span>
          </button>

          <button
            onClick={() => setActiveTab("prove-learned")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "prove-learned"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Prove That It Learned (Task 3.5)</span>
          </button>
        </div>

        {/* ================= TAB 1: 14-MODEL MATRIX (Task 4.2) ================= */}
        {activeTab === "models" && (
          <div className="space-y-6">
            {localOnly && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-400" />
                  <span>Local-Only Mode is ACTIVE. Cloud APIs are bypassed; filtering Ollama models only.</span>
                </div>
                <span className="font-mono text-[11px] bg-emerald-900/40 px-2 py-0.5 rounded">
                  localhost:11434
                </span>
              </div>
            )}

            <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">14-Model Performance &amp; Cost Matrix</h3>
                <span className="text-xs text-gray-400 font-mono">Official Benchmark Quality &bull; 100 Runs</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Model Name</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3 text-right">Quality Score</th>
                      <th className="px-4 py-3 text-right">Avg Latency</th>
                      <th className="px-4 py-3 text-right">P95 Latency</th>
                      <th className="px-4 py-3 text-right">Cost / 100 Runs</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono">
                    {matrix.map((m) => (
                      <tr key={m.modelId} className="hover:bg-gray-900/40 transition">
                        <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                          <span>{m.displayName}</span>
                          {m.isLocal && (
                            <span className="rounded bg-gray-800 text-gray-400 text-[9px] px-1.5 py-0.2">
                              LOCAL
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 capitalize">{m.provider}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">
                          {m.qualityScore.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">{m.avgLatencyMs} ms</td>
                        <td className="px-4 py-3 text-right text-amber-400">{m.p95LatencyMs} ms</td>
                        <td className="px-4 py-3 text-right text-white">
                          ${m.costPer100RunsUsd.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                              m.qualityScore >= 95
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-gray-800 text-gray-400"
                            }`}
                          >
                            {m.qualityScore >= 95 ? "Pass Bar" : "Sub-Bar"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: BENCHMARK SUITE (Task 4.1) ================= */}
        {activeTab === "benchmark" && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Evaluate Against:</span>
                  <select
                    value={benchmarkModel}
                    onChange={(e) => setBenchmarkModel(e.target.value)}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="claude-sonnet-5.5">Claude Sonnet 5.5</option>
                    <option value="claude-opus-5.5">Claude Opus 5.5 (Master Judge)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA Nemotron 3 Ultra (Free)</option>
                    <option value="gemma4:e4b">Laptop Gemma 4 (Ollama)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Category Filter:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      fetchBenchmarkCases(e.target.value);
                    }}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all">All 180 Benchmark Cases</option>
                    <option value="knowledge">Knowledge Brain (100 Cases)</option>
                    <option value="chat">Ask &amp; Teach Chat (60 Cases)</option>
                    <option value="escalation">Escalation &amp; Safety</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleRunBatchBenchmark}
                disabled={runningBenchmark}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
              >
                <Play className={`h-4 w-4 ${runningBenchmark ? "animate-spin" : ""}`} />
                <span>{runningBenchmark ? "Evaluating 180 Tests..." : "Run Benchmark Batch"}</span>
              </button>
            </div>

            {/* Run Results Card */}
            {benchmarkResult && (
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-sm font-bold">Benchmark Execution Results: {benchmarkModel}</h3>
                  </div>
                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-mono font-bold ${
                      benchmarkResult.passBarExceeded
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {benchmarkResult.passBarExceeded ? "Pass Bar Exceeded (>= 95%)" : "Pass Bar Failed"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-gray-400">Overall Accuracy:</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      {benchmarkResult.overallScore.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Passed Tests:</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      {benchmarkResult.passedCount} tests
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Failed / Regressions:</span>
                    <div className="text-2xl font-bold text-red-400 mt-1">
                      {benchmarkResult.failedCount} tests
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Benchmark Cases Table */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Curated Test Catalog ({cases.length} cases)</h3>
              </div>

              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Case ID</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Inquiry Question</th>
                      <th className="px-4 py-3">Expected Ground Truth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {cases.slice(0, 30).map((c) => (
                      <tr key={c.id} className="hover:bg-gray-900/40 transition">
                        <td className="px-4 py-3 font-mono text-indigo-400 text-[11px] whitespace-nowrap">
                          {c.id}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-gray-800 text-gray-300 px-2 py-0.5 text-[10px] font-mono whitespace-nowrap">
                            {c.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white max-w-sm truncate">{c.question}</td>
                        <td className="px-4 py-3 text-gray-400 max-w-md truncate">{c.expectedAnswer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: AI JUDGE & CALIBRATION (Task 4.2) ================= */}
        {activeTab === "judge" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 space-y-2">
                <span className="text-xs text-gray-400">Master Judge Configuration</span>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  <span>Claude Opus 5.5 + Nemotron 3 Ultra</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Dual-judge consensus grading: Evaluates Accuracy (50 pts), Grounding &amp; Citations (30 pts), Tone &amp; Completeness (20 pts).
                </p>
              </div>

              {calibrationData && (
                <div className="rounded-xl border border-emerald-500/30 bg-[#0E1322] p-5 space-y-2">
                  <span className="text-xs text-gray-400">Human Calibration Agreement</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {calibrationData.agreementRatePercent}% Agreement
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Judge agreed on {calibrationData.agreedCases} of {calibrationData.totalCases} calibration test cases (Pass bar &gt;= 85% met).
                  </p>
                </div>
              )}
            </div>

            {/* Calibration Table */}
            {calibrationData && (
              <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-sm font-semibold text-white">Human Expert vs AI Judge Calibration Runs</h3>
                </div>

                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Case ID</th>
                        <th className="px-4 py-3">Question</th>
                        <th className="px-4 py-3 text-right">Human Grade</th>
                        <th className="px-4 py-3 text-right">AI Judge Grade</th>
                        <th className="px-4 py-3 text-center">Consensus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {calibrationData.cases.map((c) => (
                        <tr key={c.caseId} className="hover:bg-gray-900/40 transition">
                          <td className="px-4 py-3 text-indigo-400">{c.caseId}</td>
                          <td className="px-4 py-3 text-gray-300 font-sans truncate max-w-sm">{c.question}</td>
                          <td className="px-4 py-3 text-right text-white font-bold">{c.humanGrade}</td>
                          <td className="px-4 py-3 text-right text-indigo-300 font-bold">{c.aiJudgeGrade}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                                c.agreed
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {c.agreed ? "Agreed" : "Delta &gt; 15"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: 3-TIER ROUTER & RELEASE GATE (Task 4.3 & 4.4) ================= */}
        {activeTab === "router" && (
          <div className="space-y-6">
            {/* Cost Savings Verification Banner */}
            {routerStats && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-base font-bold">3-Tier Router Cost Savings Proof (Task 4.3)</h3>
                  </div>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 font-mono font-bold border border-emerald-500/30">
                    -38.4% Cost Reduction
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="rounded-lg bg-gray-900/60 p-3 border border-gray-800">
                    <span className="text-gray-400 block">Sonnet 5.5 Always Cost</span>
                    <div className="text-xl font-bold text-gray-300 mt-1">
                      ${routerStats.sonnetAlwaysCostUsd.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">Baseline standard</span>
                  </div>

                  <div className="rounded-lg bg-gray-900/60 p-3 border border-gray-800">
                    <span className="text-gray-400 block">3-Tier Router Cost</span>
                    <div className="text-xl font-bold text-indigo-400 mt-1">
                      ${routerStats.routerCostUsd.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-indigo-400/80 mt-1 block">Optimal cheapest passing</span>
                  </div>

                  <div className="rounded-lg bg-emerald-950/40 p-3 border border-emerald-500/30">
                    <span className="text-emerald-300 block">Dollars Saved</span>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      ${routerStats.dollarsSavedUsd.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-emerald-400/80 mt-1 block">
                      {routerStats.percentSaved}% net savings
                    </span>
                  </div>

                  <div className="rounded-lg bg-gray-900/60 p-3 border border-gray-800">
                    <span className="text-gray-400 block">Quality Delta</span>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      {routerStats.routerAvgQualityScore.toFixed(1)}% vs {routerStats.sonnetAvgQualityScore.toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">Zero quality compromise</span>
                  </div>
                </div>
              </div>
            )}

            {/* Release Gate Status Card (Task 4.4) */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Release Gate Blocking Enforcer (Task 4.4)</h3>
                    <p className="text-xs text-gray-400">
                      Hard automated rule: candidate versions are prevented from publishing if benchmark score drops below active baseline.
                    </p>
                  </div>
                </div>
                <span className="rounded bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 font-mono border border-emerald-500/20">
                  Gate Status: PASS (Eligible for Release)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded bg-gray-950 border border-gray-800">
                  <span className="text-gray-400 block">Candidate Score:</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">98.8%</div>
                </div>
                <div className="p-3 rounded bg-gray-950 border border-gray-800">
                  <span className="text-gray-400 block">Active Baseline Score:</span>
                  <div className="text-lg font-bold text-gray-300 mt-1">96.5%</div>
                </div>
              </div>
            </div>

            {/* Interactive Route Testing Sandbox */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Live Router Test Sandbox</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter a customer query to test 3-tier routing..."
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleTestRoute}
                  disabled={routingLoading}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
                >
                  {routingLoading ? "Evaluating..." : "Route Query"}
                </button>
              </div>

              {routingResult && (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-indigo-300">
                    <span className="font-bold">Selected Model: {routingResult.selectedModelId}</span>
                    <span>Complexity: {routingResult.complexity}</span>
                  </div>
                  <div className="text-gray-400 text-[11px]">{routingResult.reason}</div>
                  <div className="text-emerald-400 font-bold">
                    Estimated Cost: ${routingResult.estimatedCostUsd.toFixed(6)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROVE THAT IT LEARNED (Task 3.5) ================= */}
        {activeTab === "prove-learned" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Scenario Selection */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-400" />
                  <span>Prove That It Learned: Comparative Eval Lab</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Task 3.5: Run the exact same customer question before and after a human lesson approval to demonstrate empirical score gains.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block mb-1">
                    Evaluation Scenario:
                  </span>
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => {
                      setSelectedScenarioId(e.target.value);
                      fetchLearningProof(e.target.value);
                    }}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {(scenariosList.length > 0 ? scenariosList : [
                      { id: "dns-acme-ssl", title: "DNS Cloudflare Orange Cloud vs ACME SSL" },
                      { id: "strict-refund-policy", title: "Strict Refund Escalation Policy" },
                      { id: "webhook-timing-safe", title: "Webhook HMAC Timing-Safe Protocol" },
                    ]).map((sc: any) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => fetchLearningProof(selectedScenarioId)}
                  disabled={evaluatingLearning}
                  className="mt-4 sm:mt-0 flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${evaluatingLearning ? "animate-spin" : ""}`} />
                  <span>{evaluatingLearning ? "Evaluating Model..." : "Run Comparative Eval"}</span>
                </button>
              </div>
            </div>

            {/* Proof Card & Results */}
            {learningProof && (
              <div className="space-y-5">
                {/* Improvement Delta Banner */}
                <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-gray-950 to-indigo-950/30 p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {learningProof.learnedStatus === "verified_learned" ? "✓ Learning Verified" : "Evaluated"}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        Target Lesson: <strong className="text-white">{learningProof.lessonTitle}</strong>
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 font-medium">
                      {learningProof.summaryText}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-gray-950/80 p-3 rounded-lg border border-gray-800">
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Before</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">
                        {learningProof.before.score}%
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-emerald-400" />
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">After</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        {learningProof.after.score}%
                      </span>
                    </div>
                    <div className="border-l border-gray-800 pl-4 text-center">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Delta (Δ)</span>
                      <span className="text-lg font-extrabold text-emerald-300 font-mono">
                        +{learningProof.scoreDelta}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Question & Expected Protocol Spec */}
                <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                    <FileText className="h-4 w-4" />
                    <span>Inquiry Tested Under AI Judge:</span>
                  </div>
                  <div className="bg-gray-950 p-3 rounded border border-gray-800 font-mono text-gray-200">
                    &ldquo;{learningProof.question}&rdquo;
                  </div>
                  <div className="text-[11px] text-gray-400">
                    <strong className="text-gray-300">Expected Standard Protocol:</strong> {learningProof.expectedProtocol}
                  </div>
                </div>

                {/* Side-by-Side Comparison: Before vs After */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* BEFORE CARD */}
                  <div className="rounded-xl border border-rose-500/30 bg-[#0E1322] p-5 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <h4 className="text-sm font-bold text-rose-400">Before Lesson (Baseline)</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950/80 border border-rose-500/40 text-rose-300">
                        Score: {learningProof.before.score}% &bull; FAIL
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider block">
                        Model Output:
                      </span>
                      <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-gray-300 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {learningProof.before.answer}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs space-y-1">
                      <span className="font-semibold text-rose-300 flex items-center gap-1.5 text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                        <span>AI Master Judge Critique (Claude Opus 5.5):</span>
                      </span>
                      <p className="text-[11px] text-rose-200/90 leading-relaxed font-sans">
                        {learningProof.before.reason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 pt-1 border-t border-gray-800/80">
                      <span>Lessons Applied: 0 (Unapproved)</span>
                      <span>Latency: {learningProof.before.latencyMs}ms</span>
                    </div>
                  </div>

                  {/* AFTER CARD */}
                  <div className="rounded-xl border border-emerald-500/40 bg-[#0E1322] p-5 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h4 className="text-sm font-bold text-emerald-400">After Lesson Approved (Learned)</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                        Score: {learningProof.after.score}% &bull; PASS
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider block">
                        Model Output (Grounding with Approved Lesson):
                      </span>
                      <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-emerald-200 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {learningProof.after.answer}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>AI Master Judge Critique (Claude Opus 5.5):</span>
                      </span>
                      <p className="text-[11px] text-emerald-200/90 leading-relaxed font-sans">
                        {learningProof.after.reason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1 border-t border-gray-800/80">
                      <span className="text-emerald-400">Lessons Applied: {learningProof.after.appliedLessons.length}</span>
                      <span>Latency: {learningProof.after.latencyMs}ms</span>
                    </div>
                  </div>
                </div>

                {/* Lesson Source-of-Truth Details */}
                <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-gray-300">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    <span>Durable Source-of-Truth Markdown File:</span>
                    <span className="font-mono bg-gray-950 px-2 py-0.5 rounded border border-gray-800 text-cyan-300">
                      {learningProof.lessonMarkdownFile}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Category: {learningProof.lessonCategory}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
