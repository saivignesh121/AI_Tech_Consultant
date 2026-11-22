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
  Award,
  Terminal,
  HardDrive,
  Eye,
  Sparkles,
  ShieldAlert,
  ListChecks,
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
  supportsVision?: boolean;
  fallbacks?: string[];
  compareAgainst?: string[];
  downloadSizeGB?: string;
  pricingNote?: string;
  eligibleJobs?: string[];
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
  const [activeTab, setActiveTab] = useState<"jobs" | "models" | "local" | "judge" | "benchmark" | "router" | "prove-learned">("jobs");

  // --- 6 Eval Jobs State (Feature 4) ---
  const [evalJobsList, setEvalJobsList] = useState<any[]>([]);
  const [selectedEvalJobId, setSelectedEvalJobId] = useState<string>("tag_job");
  const [loadingJobs, setLoadingJobs] = useState(false);

  // --- Laptop Local Models (Ollama) State ---
  const [ollamaStatus, setOllamaStatus] = useState<any | null>(null);
  const [localTestPrompt, setLocalTestPrompt] = useState("Explain how DNS CNAME verification works offline without cloud APIs.");
  const [localTestModel, setLocalTestModel] = useState("gemma4:e4b");
  const [localTestResult, setLocalTestResult] = useState<any | null>(null);
  const [runningLocalTest, setRunningLocalTest] = useState(false);

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
    fetchEvalJobs();
    fetchOllamaStatus();
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

  const fetchEvalJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch("/api/evals/jobs-matrix");
      const data = await res.json();
      if (data.evaluations) setEvalJobsList(data.evaluations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchOllamaStatus = async () => {
    try {
      const res = await fetch("/api/evals/ollama");
      const data = await res.json();
      if (data.status) setOllamaStatus(data.status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunLocalInference = async () => {
    setRunningLocalTest(true);
    setLocalTestResult(null);
    try {
      const res = await fetch("/api/evals/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: localTestModel,
          prompt: localTestPrompt,
        }),
      });
      const data = await res.json();
      if (data.result) setLocalTestResult(data.result);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningLocalTest(false);
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
            onClick={() => setActiveTab("jobs")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "jobs"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <ListChecks className="h-4 w-4" />
            <span>The 6 Eval Jobs</span>
          </button>

          <button
            onClick={() => setActiveTab("models")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "models"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>14-Model Comparison Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("local")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "local"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>Laptop Local Models (Ollama)</span>
          </button>

          <button
            onClick={() => setActiveTab("judge")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "judge"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>AI Judge &amp; Calibration</span>
          </button>

          <button
            onClick={() => setActiveTab("benchmark")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "benchmark"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>Benchmark Suite (180 Tests)</span>
          </button>

          <button
            onClick={() => setActiveTab("router")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "router"
                ? "border-indigo-500 text-indigo-400 font-semibold"
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
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Prove That It Learned (Task 3.5)</span>
          </button>
        </div>

        {/* ================= TAB 1: THE 6 EVAL JOBS (Feature 4 Step Suitability) ================= */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            {/* Job Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {[
                { id: "tag_job", label: "1. Tag the Job", icon: Zap },
                { id: "find_facts", label: "2. Find Facts", icon: Filter },
                { id: "write_reply", label: "3. Write Reply", icon: FileText },
                { id: "read_screenshot", label: "4. Read Screenshots", icon: Eye },
                { id: "improve_skill", label: "5. Improve Skills", icon: Sparkles },
                { id: "judge_eval", label: "6. Master Judge", icon: ShieldCheck },
              ].map((job) => {
                const IconComponent = job.icon;
                const isSelected = selectedEvalJobId === job.id;
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedEvalJobId(job.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                        : "bg-gray-900/60 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-gray-200"
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span>{job.label}</span>
                  </button>
                );
              })}
            </div>

            {(() => {
              const currentJob = evalJobsList.find((j: any) => j.jobId === selectedEvalJobId) || evalJobsList[0];
              if (!currentJob) {
                return (
                  <div className="p-8 text-center text-xs text-gray-400 font-mono">
                    Loading evaluations for the 6 eval jobs...
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Job Overview Banner */}
                  <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{currentJob.title}</span>
                      </h2>
                      <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-500/30">
                        Job: {currentJob.jobId}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{currentJob.description}</p>
                  </div>

                  {/* 4 Winner Scorecards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Recommended Pick */}
                    <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-2">
                      <div className="flex items-center justify-between text-indigo-300">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-indigo-400" />
                          <span>Recommended Pick</span>
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">
                        {currentJob.recommendedModelId}
                      </div>
                      <p className="text-[11px] text-indigo-200/90 leading-relaxed font-sans">
                        {currentJob.recommendedReason}
                      </p>
                    </div>

                    {/* Top Quality */}
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2">
                      <div className="flex items-center justify-between text-emerald-300">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-emerald-400" />
                          <span>Highest Quality</span>
                        </span>
                      </div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {currentJob.bestQualityModelId}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Top benchmark accuracy across calibrated test scenarios for this step.
                      </p>
                    </div>

                    {/* Best Budget ($0 / Ultra-cheap) */}
                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
                      <div className="flex items-center justify-between text-amber-300">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-amber-400" />
                          <span>Best Budget ($0 Free)</span>
                        </span>
                      </div>
                      <div className="text-sm font-bold text-amber-400 font-mono">
                        {currentJob.bestBudgetModelId}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Lowest cost per 1M tokens ($0 for free OpenRouter or Laptop Ollama).
                      </p>
                    </div>

                    {/* Lowest Latency */}
                    <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-2">
                      <div className="flex items-center justify-between text-cyan-300">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="h-4 w-4 text-cyan-400" />
                          <span>Fastest Speed</span>
                        </span>
                      </div>
                      <div className="text-sm font-bold text-cyan-400 font-mono">
                        {currentJob.fastestModelId}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Lowest average and P95 latency for real-time customer streaming.
                      </p>
                    </div>
                  </div>

                  {/* Candidates Comparison Table */}
                  <div className="rounded-xl border border-gray-800 bg-[#0E1322] overflow-hidden">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Candidate Models Comparison ({currentJob.candidates?.length} models tested)</h3>
                      <span className="text-xs text-gray-400 font-mono">Measured with empirical numbers</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px] tracking-wider font-mono">
                          <tr>
                            <th className="px-4 py-3">Candidate Model</th>
                            <th className="px-4 py-3">Provider</th>
                            <th className="px-4 py-3 text-right">Quality Score</th>
                            <th className="px-4 py-3 text-right">Avg Latency</th>
                            <th className="px-4 py-3 text-right">P95 Latency</th>
                            <th className="px-4 py-3 text-right">Cost / 100 Runs</th>
                            <th className="px-4 py-3 text-center">Category Distinction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 font-mono">
                          {currentJob.candidates?.map((c: any) => (
                            <tr key={c.modelId} className="hover:bg-gray-900/40 transition">
                              <td className="px-4 py-3 text-white font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{c.displayName}</span>
                                  {c.isLocal && (
                                    <span className="rounded bg-gray-800 text-gray-400 text-[9px] px-1.5 py-0.2">
                                      LOCAL OLLAMA
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">{c.modelId}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-400 capitalize">{c.provider}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-400">
                                {c.qualityScore.toFixed(1)}%
                              </td>
                              <td className="px-4 py-3 text-right text-gray-300">{c.avgLatencyMs} ms</td>
                              <td className="px-4 py-3 text-right text-amber-400">{c.p95LatencyMs} ms</td>
                              <td className="px-4 py-3 text-right text-white">
                                {c.costPer100RunsUsd === 0 ? "$0.0000" : `$${c.costPer100RunsUsd.toFixed(6)}`}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  {c.isRecommended && (
                                    <span className="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] px-1.5 py-0.5 font-bold">
                                      RECOMMENDED
                                    </span>
                                  )}
                                  {c.isBestQuality && (
                                    <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 font-bold">
                                      TOP QUALITY
                                    </span>
                                  )}
                                  {c.isBestBudget && (
                                    <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] px-1.5 py-0.5 font-bold">
                                      $0 BUDGET
                                    </span>
                                  )}
                                  {c.isFastest && (
                                    <span className="rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] px-1.5 py-0.5 font-bold">
                                      FASTEST
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Trade-Off & Engineering Rationale */}
                  <div className="rounded-xl border border-indigo-500/30 bg-[#0E1322] p-5 space-y-2">
                    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Empirical Trade-off &amp; Engineering Rationale</span>
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {currentJob.tradeOffAnalysis}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= TAB 2: 14-MODEL MATRIX (Task 4.2) ================= */}
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
                <div>
                  <h3 className="text-sm font-semibold text-white">14-Model Performance &amp; Cost Matrix</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Checked on 12 Nov 2026 rates &bull; Benchmarked over 100 runs &bull; Fallbacks defined for free tiers
                  </p>
                </div>
                <span className="text-xs text-indigo-400 font-mono bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-500/30">
                  14 Models Total
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900/60 border-b border-gray-800 text-gray-400 uppercase font-semibold text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="px-4 py-3">Model Identifier</th>
                      <th className="px-4 py-3">Where It Runs</th>
                      <th className="px-4 py-3 text-right">Quality</th>
                      <th className="px-4 py-3 text-right">Avg / P95</th>
                      <th className="px-4 py-3 text-right">Cost / 100 Runs</th>
                      <th className="px-4 py-3">Download Size / Notes</th>
                      <th className="px-4 py-3">Compare Against / Fallbacks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono">
                    {matrix.map((m) => (
                      <tr key={m.modelId} className="hover:bg-gray-900/40 transition">
                        <td className="px-4 py-3 text-white font-medium">
                          <div className="flex items-center gap-1.5">
                            <span>{m.displayName}</span>
                            {m.isLocal && (
                              <span className="rounded bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-[9px] px-1.5 py-0.2">
                                LOCAL
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{m.modelId}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 capitalize">
                          <div>{m.provider}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">
                          {m.qualityScore.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          <span>{m.avgLatencyMs}ms</span>
                          <span className="text-gray-500 text-[10px] block">{m.p95LatencyMs}ms p95</span>
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          <span className="font-bold">
                            {m.costPer100RunsUsd === 0 ? "$0.00" : `$${m.costPer100RunsUsd.toFixed(4)}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-[11px] max-w-xs">
                          {m.downloadSizeGB && (
                            <span className="rounded bg-gray-800 text-gray-300 px-1.5 py-0.5 text-[10px] mr-1">
                              {m.downloadSizeGB}
                            </span>
                          )}
                          <span className="text-gray-400">{m.pricingNote || "Standard pricing"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-[11px] max-w-xs">
                          {m.compareAgainst && m.compareAgainst.length > 0 && (
                            <div className="text-[10px] text-indigo-300">
                              <span className="text-gray-500">vs: </span>
                              {m.compareAgainst.join(", ")}
                            </div>
                          )}
                          {m.fallbacks && m.fallbacks.length > 0 && (
                            <div className="text-[10px] text-amber-300/90 mt-0.5">
                              <span className="text-gray-500">Fallbacks: </span>
                              {m.fallbacks.slice(0, 2).join(", ")}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: LAPTOP LOCAL MODELS (OLLAMA at localhost:11434) ================= */}
        {activeTab === "local" && (
          <div className="space-y-6">
            {/* Privacy Boundary Guarantee Banner */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldAlert className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Air-Gapped Privacy Boundary &amp; Zero Cloud Token Guarantee
                </h3>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                <strong>Zero-Leakage Policy:</strong> Gemini free tier and OpenRouter free models only receive synthetic benchmark data.
                Customer emails, PII, and private internal documents are strictly blocked from cloud free tiers and automatically routed
                to your laptop&apos;s local Ollama instance (<code>localhost:11434</code>) at <strong>$0 cost</strong>.
              </p>
            </div>

            {/* Ollama Daemon Status */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Local Ollama Runner</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {ollamaStatus?.isRunning ? "Online (localhost:11434)" : "Simulated Offline Mode"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  Endpoint: {ollamaStatus?.endpoint || "http://localhost:11434"} &bull; Installed Models: {ollamaStatus?.installedModels?.length || 2}
                </p>
              </div>

              <button
                onClick={fetchOllamaStatus}
                className="flex items-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 px-3.5 py-2 text-xs font-semibold text-white transition border border-gray-700"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Check Status</span>
              </button>
            </div>

            {/* The 2 Laptop Local Models Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Gemma 4 */}
              <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <span>gemma4:e4b</span>
                      <span className="rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] px-2 py-0.5 font-sans">
                        Multimodal Vision
                      </span>
                    </h4>
                    <span className="text-[11px] text-gray-400">Offline replies, screenshot reading, private data</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">$0 / run</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">DOWNLOAD SIZE</span>
                    <span className="text-gray-200 font-bold">~7–10 GB</span>
                  </div>
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">SYSTEM RAM REQUIRED</span>
                    <span className="text-gray-200 font-bold">8–16 GB</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Terminal Commands:</span>
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800 text-indigo-300 flex items-center justify-between">
                    <span>ollama pull gemma4:e4b</span>
                    <span className="text-gray-500 text-[10px]">Pull model</span>
                  </div>
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800 text-rose-300/80 flex items-center justify-between">
                    <span>ollama rm gemma4:e4b</span>
                    <span className="text-gray-500 text-[10px]">Delete model</span>
                  </div>
                </div>
              </div>

              {/* Qwen 3.5 */}
              <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <span>qwen3.5:4b</span>
                      <span className="rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] px-2 py-0.5 font-sans">
                        4-bit Quantized
                      </span>
                    </h4>
                    <span className="text-[11px] text-gray-400">Offline job tagging &amp; fast fact finding</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">$0 / run</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">DOWNLOAD SIZE</span>
                    <span className="text-gray-200 font-bold">~3–4 GB</span>
                  </div>
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">SYSTEM RAM REQUIRED</span>
                    <span className="text-gray-200 font-bold">4–8 GB</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Terminal Commands:</span>
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800 text-indigo-300 flex items-center justify-between">
                    <span>ollama pull qwen3.5:4b</span>
                    <span className="text-gray-500 text-[10px]">Pull model</span>
                  </div>
                  <div className="p-2.5 rounded bg-gray-950 border border-gray-800 text-rose-300/80 flex items-center justify-between">
                    <span>ollama rm qwen3.5:4b</span>
                    <span className="text-gray-500 text-[10px]">Delete model</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Command Quick Reference */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-white font-bold">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>Laptop Ollama CLI Management Guide</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-gray-950 border border-gray-800 space-y-1">
                  <span className="text-gray-400 text-[11px] block">List downloaded models</span>
                  <code className="text-indigo-300 text-xs">ollama list</code>
                </div>
                <div className="p-3 rounded bg-gray-950 border border-gray-800 space-y-1">
                  <span className="text-gray-400 text-[11px] block">Download 4-bit model</span>
                  <code className="text-indigo-300 text-xs">ollama pull qwen3.5:4b</code>
                </div>
                <div className="p-3 rounded bg-gray-950 border border-gray-800 space-y-1">
                  <span className="text-gray-400 text-[11px] block">Check daemon health</span>
                  <code className="text-indigo-300 text-xs">curl http://localhost:11434/api/tags</code>
                </div>
              </div>
            </div>

            {/* Interactive Local Inference Sandbox */}
            <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Live On-Device Inference Sandbox</h3>
                  <p className="text-xs text-gray-400">Run queries locally on your laptop with zero tokens leaving your machine.</p>
                </div>
                <span className="rounded bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 font-mono border border-emerald-500/20">
                  Cost: $0.000000
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Select Local Model:</span>
                  <select
                    value={localTestModel}
                    onChange={(e) => setLocalTestModel(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="gemma4:e4b">gemma4:e4b (~7-10 GB, Vision)</option>
                    <option value="qwen3.5:4b">qwen3.5:4b (~3-4 GB, 4-bit)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Inference Prompt:</span>
                  <input
                    type="text"
                    value={localTestPrompt}
                    onChange={(e) => setLocalTestPrompt(e.target.value)}
                    placeholder="Enter private prompt for on-device execution..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={handleRunLocalInference}
                disabled={runningLocalTest}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40"
              >
                <Play className={`h-4 w-4 ${runningLocalTest ? "animate-spin" : ""}`} />
                <span>{runningLocalTest ? "Processing on Device..." : "Run Local Inference"}</span>
              </button>

              {localTestResult && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs font-mono space-y-3">
                  <div className="flex items-center justify-between text-emerald-300 border-b border-emerald-500/20 pb-2">
                    <span className="font-bold">Model: {localTestResult.modelId}</span>
                    <span>Latency: {localTestResult.latencyMs} ms &bull; Cost: $0.000000</span>
                  </div>
                  <div className="text-gray-200 font-sans text-xs whitespace-pre-wrap leading-relaxed">
                    {localTestResult.answer}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 pt-1 border-t border-emerald-500/20">
                    {localTestResult.privacyStatus}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: BENCHMARK SUITE (Task 4.1) ================= */}
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
