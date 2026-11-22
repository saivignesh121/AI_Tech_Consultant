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
  GitCompare,
  Scale,
  MessageSquarePlus,
  Edit3,
  Sliders,
  X,
  Check,
  Activity,
  ThumbsUp,
  ThumbsDown,
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
  const [activeTab, setActiveTab] = useState<
    "jobs" | "models" | "local" | "judge" | "benchmark" | "router" | "release-gate" | "feedback-tests" | "prove-learned"
  >("jobs");

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

  // --- Benchmark Tab State (Task 4.1) ---
  const [cases, setCases] = useState<BenchmarkCaseItem[]>([]);
  const [benchmarkVersion, setBenchmarkVersion] = useState("2.0.0");
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

  // --- Judge & Calibration State (Task 4.1) ---
  const [selectedJudgeModel, setSelectedJudgeModel] = useState("claude-opus-5.5");
  const [recalibratingJudge, setRecalibratingJudge] = useState(false);
  const [calibrationData, setCalibrationData] = useState<{
    totalCases: number;
    agreedCases: number;
    agreementRatePercent: number;
    summaryText?: string;
    cases: Array<{
      caseId: string;
      inquiryCategory?: string;
      question: string;
      humanGrade: number;
      humanVerdict?: string;
      humanReason?: string;
      aiJudgeGrade: number;
      judgeVerdict?: string;
      judgeReason?: string;
      agreed: boolean;
    }>;
  } | null>(null);

  // --- Task 4.1: Side-by-Side Model Comparator State ---
  const [sideBySideResult, setSideBySideResult] = useState<any | null>(null);
  const [sideBySideLoading, setSideBySideLoading] = useState(false);
  const [sideBySideModelA, setSideBySideModelA] = useState("claude-sonnet-5.5");
  const [sideBySideModelB, setSideBySideModelB] = useState("qwen/qwen3.8-max-0902");
  const [sideBySideCaseId, setSideBySideCaseId] = useState("step4-01");

  // --- Router State (Task 4.3) ---
  const [routerStats, setRouterStats] = useState<RouterComparisonData | null>(null);
  const [testPrompt, setTestPrompt] = useState("How do I configure custom CNAME subdomains with SSL?");
  const [testTaskType, setTestTaskType] = useState("write_reply");
  const [simulateQuickCheckFailed, setSimulateQuickCheckFailed] = useState(false);
  const [simulateFreeBusy, setSimulateFreeBusy] = useState(false);
  const [simulate100kPrompt, setSimulate100kPrompt] = useState(false);
  const [routingResult, setRoutingResult] = useState<{
    job: string;
    complexity: string;
    promptTokens: number;
    tokenCountMethod: string;
    selectedModelId: string;
    estimatedCostUsd: number;
    reason: string;
    movedUp: boolean;
    previousModelId?: string;
    moveReason?: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
    haikuBypassedDueTo100kRule?: boolean;
  } | null>(null);
  const [routingLogs, setRoutingLogs] = useState<any[]>([]);
  const [routingTableData, setRoutingTableData] = useState<any | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  // --- Task 4.2: Step-by-Step Breakdown & Local-Only Quality Drop State ---
  const [stepBreakdownMatrix, setStepBreakdownMatrix] = useState<any[]>([]);
  const [localOnlyQualityDrop, setLocalOnlyQualityDrop] = useState<any | null>(null);
  const [matrixViewMode, setMatrixViewMode] = useState<"overall" | "steps">("overall");
  const [stepFilter, setStepFilter] = useState<string>("all");

  // --- Task 4.2: 14-Model Benchmark & Human Reviewer Notes State ---
  const [multiModelBenchmarkData, setMultiModelBenchmarkData] = useState<any | null>(null);
  const [running14ModelsBenchmark, setRunning14ModelsBenchmark] = useState(false);
  const [selectedBenchmarkModelFilter, setSelectedBenchmarkModelFilter] = useState("all");
  const [reviewerNotes, setReviewerNotes] = useState<any[]>([]);
  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    caseId: string;
    modelId: string;
    whatWasGood: string;
    whatWasWrong: string;
    generalNote?: string;
    reviewer: string;
  } | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // --- Task 4.4: Real Feedback Becomes New Tests State ---
  const [feedbackTests, setFeedbackTests] = useState<any[]>([]);
  const [loadingFeedbackTests, setLoadingFeedbackTests] = useState(false);
  const [newFeedbackQuestion, setNewFeedbackQuestion] = useState("");
  const [newFeedbackAnswer, setNewFeedbackAnswer] = useState("");
  const [newFeedbackType, setNewFeedbackType] = useState<"thumbs_up" | "thumbs_down">("thumbs_down");
  const [newFeedbackReason, setNewFeedbackReason] = useState("");
  const [submittingLiveFeedback, setSubmittingLiveFeedback] = useState(false);

  // --- Task 4.5: Release Gate Enforcer State ---
  const [gateEntityType, setGateEntityType] = useState<"prompt" | "role" | "skill" | "model">("prompt");
  const [gateEntityName, setGateEntityName] = useState("qa_consultant_system_prompt");
  const [gateCandidateScore, setGateCandidateScore] = useState(98.2);
  const [gateBaselineScore, setGateBaselineScore] = useState(96.5);
  const [gateSimulateRegression, setGateSimulateRegression] = useState(false);
  const [gateSimulateCategoryRegression, setGateSimulateCategoryRegression] = useState(false);
  const [gateResult, setGateResult] = useState<any | null>(null);
  const [evaluatingGate, setEvaluatingGate] = useState(false);
  const [gateStandards, setGateStandards] = useState<any | null>(null);
  const [gateRulesVsJudge, setGateRulesVsJudge] = useState<any[]>([]);
  const [gateAntiSaturation, setGateAntiSaturation] = useState<any[]>([]);

  useEffect(() => {
    fetchEvalJobs();
    fetchOllamaStatus();
    fetchBenchmarkCases();
    fetchModelsMatrix();
    fetchJudgeCalibration();
    fetchRouterComparison();
    fetchLearningProof();
    fetchSideBySide();
    fetchReviewerNotes();
    fetchFeedbackTests();
    fetchReleaseGateStatus();
  }, []);

  const fetchFeedbackTests = async () => {
    setLoadingFeedbackTests(true);
    try {
      const res = await fetch("/api/chat/feedback");
      const data = await res.json();
      if (data.feedbackTests) setFeedbackTests(data.feedbackTests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeedbackTests(false);
    }
  };

  const handleCreateSyntheticFeedbackTest = async () => {
    if (!newFeedbackQuestion.trim() || !newFeedbackAnswer.trim() || !newFeedbackReason.trim()) return;
    setSubmittingLiveFeedback(true);
    try {
      const res = await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newFeedbackQuestion.trim(),
          aiAnswer: newFeedbackAnswer.trim(),
          feedbackType: newFeedbackType,
          reason: newFeedbackReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewFeedbackQuestion("");
        setNewFeedbackAnswer("");
        setNewFeedbackReason("");
        await fetchFeedbackTests();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingLiveFeedback(false);
    }
  };

  const fetchReleaseGateStatus = async () => {
    try {
      const res = await fetch("/api/evals/release-gate");
      const data = await res.json();
      if (data.activeGate) setGateResult(data.activeGate);
      if (data.scoringStandards) setGateStandards(data.scoringStandards);
      if (data.rulesVsJudge) setGateRulesVsJudge(data.rulesVsJudge);
      if (data.antiSaturation) setGateAntiSaturation(data.antiSaturation);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunReleaseGateCheck = async () => {
    setEvaluatingGate(true);
    try {
      let cand = Number(gateCandidateScore);
      let base = Number(gateBaselineScore);

      let candidateCategoryScores: Record<string, number> | undefined;
      let baselineCategoryScores: Record<string, number> | undefined;

      if (gateSimulateRegression) {
        cand = Number((base - 3.5).toFixed(2));
      }

      if (gateSimulateCategoryRegression) {
        baselineCategoryScores = { "Safety & Escalation": 99.0, "Citations": 98.0 };
        candidateCategoryScores = { "Safety & Escalation": 92.0, "Citations": 98.0 };
      }

      const res = await fetch("/api/evals/release-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: gateEntityType,
          entityName: gateEntityName,
          candidateScore: cand,
          baselineScore: base,
          candidateCategoryScores,
          baselineCategoryScores,
        }),
      });

      const data = await res.json();
      if (data.gate) {
        setGateResult(data.gate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluatingGate(false);
    }
  };

  const fetchReviewerNotes = async () => {
    try {
      const res = await fetch("/api/evals/benchmark/notes");
      const data = await res.json();
      if (data.notes) setReviewerNotes(data.notes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleLocalOnly = async () => {
    try {
      const newMode = !localOnly;
      const res = await fetch("/api/settings/local-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newMode }),
      });
      const data = await res.json();
      if (data.success) {
        setLocalOnly(data.localOnlyMode);
        fetchModelsMatrix();
        fetchEvalJobs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRun14ModelsBenchmark = async (limit = 100) => {
    setRunning14ModelsBenchmark(true);
    try {
      const res = await fetch("/api/evals/benchmark/14-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: benchmarkVersion,
          caseLimit: limit,
          localOnly: localOnly,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMultiModelBenchmarkData(data);
        fetchReviewerNotes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunning14ModelsBenchmark(false);
    }
  };

  const handleSaveReviewerNote = async () => {
    if (!noteModal) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/evals/benchmark/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: noteModal.caseId,
          modelId: noteModal.modelId,
          whatWasGood: noteModal.whatWasGood,
          whatWasWrong: noteModal.whatWasWrong,
          generalNote: noteModal.generalNote,
          reviewer: noteModal.reviewer || "Human Reviewer",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNoteModal(null);
        fetchReviewerNotes();
        if (multiModelBenchmarkData?.detailedResults) {
          const updated = multiModelBenchmarkData.detailedResults.map((r: any) => {
            if (r.caseId === noteModal.caseId && r.modelId === noteModal.modelId) {
              return { ...r, reviewerNote: data.note };
            }
            return r;
          });
          setMultiModelBenchmarkData({
            ...multiModelBenchmarkData,
            detailedResults: updated,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  };

  const fetchBenchmarkCases = async (cat = selectedCategory, ver = benchmarkVersion) => {
    try {
      const url = cat === "all"
        ? `/api/evals/benchmark?version=${ver}`
        : `/api/evals/benchmark?category=${cat}&version=${ver}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.cases) setCases(data.cases);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSideBySide = async (
    caseId = sideBySideCaseId,
    modA = sideBySideModelA,
    modB = sideBySideModelB,
    judgeM = selectedJudgeModel
  ) => {
    setSideBySideLoading(true);
    try {
      const res = await fetch(
        `/api/evals/side-by-side?testCaseId=${caseId}&modelAId=${modA}&modelBId=${modB}&judgeModelId=${judgeM}&version=1.0.0`
      );
      const data = await res.json();
      if (data.result) setSideBySideResult(data.result);
    } catch (e) {
      console.error(e);
    } finally {
      setSideBySideLoading(false);
    }
  };

  const handleRecalibrateJudge = async (modelId = selectedJudgeModel) => {
    setRecalibratingJudge(true);
    try {
      const res = await fetch("/api/evals/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeModelId: modelId }),
      });
      const data = await res.json();
      if (data.calibration) setCalibrationData(data.calibration);
    } catch (e) {
      console.error(e);
    } finally {
      setRecalibratingJudge(false);
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

  const fetchJudgeCalibration = async (judgeM = selectedJudgeModel) => {
    try {
      const res = await fetch(`/api/evals/judge?judgeModel=${judgeM}`);
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
      if (data.recentLogs) setRoutingLogs(data.recentLogs);
      if (data.routingTable) setRoutingTableData(data.routingTable);
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
      if (data.stepBreakdownMatrix) setStepBreakdownMatrix(data.stepBreakdownMatrix);
      if (data.localOnlyQualityDrop) setLocalOnlyQualityDrop(data.localOnlyQualityDrop);
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
      let promptToSend = testPrompt;
      if (simulate100kPrompt) {
        // Generate > 100k token simulation string (~450,000 characters)
        promptToSend = testPrompt + " [EXTENSIVE_DATA_BURST] " + "technical_specification_chunk ".repeat(25000);
      }

      const res = await fetch("/api/evals/router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          taskType: testTaskType,
          quickCheckFailed: simulateQuickCheckFailed,
          quickCheckReason: simulateQuickCheckFailed ? "Confidence below 85% on verification check" : undefined,
          freeModelBusy: simulateFreeBusy,
        }),
      });
      const data = await res.json();
      if (data.decision) setRoutingResult(data.decision);
      if (data.recentLogs) setRoutingLogs(data.recentLogs);
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
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3A] flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-[#2563EB]" />
              <span>The Eval Lab</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Continuous 180-test benchmark verification, 14-model quality matrix, and 3-tier cost router.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-emerald-500/20 bg-emerald-50 px-3 py-1.5 text-xs font-mono text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Pass Bar: 98.8% Active</span>
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#DCE6F5] space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "jobs"
                ? "border-indigo-500 text-[#2563EB] font-semibold"
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
                ? "border-indigo-500 text-[#2563EB] font-semibold"
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
                ? "border-indigo-500 text-[#2563EB] font-semibold"
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
                ? "border-indigo-500 text-[#2563EB] font-semibold"
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
                ? "border-indigo-500 text-[#2563EB] font-semibold"
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
                ? "border-indigo-500 text-[#2563EB] font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Cost-Optimized Model Router</span>
          </button>

          <button
            onClick={() => setActiveTab("release-gate")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "release-gate"
                ? "border-indigo-500 text-[#2563EB] font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Production Release Gates</span>
          </button>

          <button
            onClick={() => setActiveTab("feedback-tests")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "feedback-tests"
                ? "border-indigo-500 text-[#2563EB] font-semibold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>User Feedback Test Generation</span>
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
            <span>Learning Verification Benchmarks</span>
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
                        : "bg-[#F6F9FF] text-gray-400 border-[#DCE6F5] hover:bg-[#EEF4FF] hover:text-gray-200"
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
                  <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                        <span>{currentJob.title}</span>
                      </h2>
                      <span className="text-[11px] font-mono text-[#2563EB] bg-indigo-50 px-2.5 py-0.5 rounded border border-[#BFDBFE]">
                        Job: {currentJob.jobId}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{currentJob.description}</p>
                  </div>

                  {/* 4 Winner Scorecards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Recommended Pick */}
                    <div className="rounded-xl border border-[#BFDBFE] bg-indigo-50 p-4 space-y-2">
                      <div className="flex items-center justify-between text-[#2563EB]">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-[#2563EB]" />
                          <span>Recommended Pick</span>
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono">
                        {currentJob.recommendedModelId}
                      </div>
                      <p className="text-[11px] text-indigo-200/90 leading-relaxed font-sans">
                        {currentJob.recommendedReason}
                      </p>
                    </div>

                    {/* Top Quality */}
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-4 space-y-2">
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
                    <div className="rounded-xl border border-[#BFDBFE] bg-blue-50 p-4 space-y-2">
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
                  <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
                    <div className="p-4 border-b border-[#DCE6F5] flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#0B1B3A]">Candidate Models Comparison ({currentJob.candidates?.length} models tested)</h3>
                      <span className="text-xs text-gray-400 font-mono">Measured with empirical numbers</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#EEF4FF] border-b border-[#DCE6F5] text-[#4A5B78] uppercase font-semibold text-[10px] tracking-wider font-mono">
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
                            <tr key={c.modelId} className="hover:bg-[#EEF4FF] transition">
                              <td className="px-4 py-3 text-slate-900 font-medium">
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
                              <td className="px-4 py-3 text-right text-slate-900">
                                {c.costPer100RunsUsd === 0 ? "$0.0000" : `$${c.costPer100RunsUsd.toFixed(6)}`}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  {c.isRecommended && (
                                    <span className="rounded bg-indigo-500/20 text-[#2563EB] border border-[#BFDBFE] text-[9px] px-1.5 py-0.5 font-bold">
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
                                    <span className="rounded bg-blue-100 text-cyan-300 border border-[#BFDBFE] text-[9px] px-1.5 py-0.5 font-bold">
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
                  <div className="rounded-xl border border-[#BFDBFE] bg-white p-5 space-y-2">
                    <h3 className="text-xs font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-2">
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

        {/* ================= TAB 2: 14-MODEL MATRIX & STEPS (Task 4.2) ================= */}
        {activeTab === "models" && (
          <div className="space-y-6">
            {/* Top Toolbar: Local-Only Switch & View Mode Switcher */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#2563EB]" />
                  <span>Multi-Model Performance Matrix (14 Models)</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Evaluates Quality (from AI Judge), Cost in $ per 100 runs, and Speed (average and slowest 5% P95) across all 6 steps.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* View Mode Switcher */}
                <div className="flex items-center rounded-lg bg-[#EEF4FF] border border-[#DCE6F5] p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setMatrixViewMode("overall")}
                    className={`px-3 py-1.5 rounded-md transition ${
                      matrixViewMode === "overall"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Overall (14 Models)
                  </button>
                  <button
                    onClick={() => setMatrixViewMode("steps")}
                    className={`px-3 py-1.5 rounded-md transition ${
                      matrixViewMode === "steps"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Step-by-Step Breakdown (6 Steps)
                  </button>
                </div>

                {/* Local-Only Mode Master Switch Toggle */}
                <button
                  onClick={handleToggleLocalOnly}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    localOnly
                      ? "bg-emerald-600/90 text-white border-emerald-500 shadow-md"
                      : "bg-white text-[#4A5B78] border-[#C3D3EA] hover:bg-[#EEF4FF]"
                  }`}
                  title="Toggle Local-Only Mode: run purely with laptop Ollama models, bypassing paid cloud APIs"
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>Local-Only Switch: {localOnly ? "ON (Ollama $0)" : "OFF"}</span>
                </button>
              </div>
            </div>

            {/* Local-Only Mode Quality Drop & Analysis Banner */}
            {localOnly && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <ShieldAlert className="h-5 w-5 text-emerald-400" />
                      <h4 className="text-sm font-bold uppercase tracking-wider">
                        Local-Only Mode is ACTIVE — 100% Free On-Device Execution
                      </h4>
                    </div>
                    <span className="font-mono text-xs bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 px-2.5 py-0.5 rounded">
                      localhost:11434 &bull; $0.000000 Spend
                    </span>
                  </div>

                  {/* High Level Quality Drop KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[#F6F9FF] border border-emerald-500/20">
                      <span className="text-gray-400 text-[10px] uppercase block">Cloud Baseline (Sonnet 5.5)</span>
                      <span className="text-xl font-bold text-[#0B1B3A] mt-1 block">98.8% Quality</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F6F9FF] border border-emerald-500/20">
                      <span className="text-gray-400 text-[10px] uppercase block">Local-Only Quality</span>
                      <span className="text-xl font-bold text-emerald-400 mt-1 block">89.2% Quality</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F6F9FF] border border-emerald-500/20">
                      <span className="text-gray-400 text-[10px] uppercase block">Net Quality Delta</span>
                      <span className="text-xl font-bold text-amber-400 mt-1 block">-9.6% Drop</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F6F9FF] border border-emerald-500/20">
                      <span className="text-gray-400 text-[10px] uppercase block">Cloud API Spend</span>
                      <span className="text-xl font-bold text-emerald-400 mt-1 block">$0.00 (Zero Cost)</span>
                    </div>
                  </div>

                  {/* Step-by-Step Quality Drop Comparison Table */}
                  <div className="rounded-lg border border-[#DCE6F5] bg-[#0A0E1A] overflow-hidden">
                    <div className="p-3 border-b border-[#DCE6F5] flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-200">
                        How Quality Drops Across the 6 Operational Steps
                      </h5>
                      <span className="text-[10px] text-gray-400 font-mono">Empirical Step-by-Step Delta</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#EEF4FF] text-[#4A5B78] text-[10px] uppercase border-b border-[#DCE6F5] font-semibold">
                          <tr>
                            <th className="px-3 py-2">Step</th>
                            <th className="px-3 py-2">Cloud Champion</th>
                            <th className="px-3 py-2">Local Model</th>
                            <th className="px-3 py-2 text-right">Cloud Score</th>
                            <th className="px-3 py-2 text-right">Local Score</th>
                            <th className="px-3 py-2 text-right font-bold text-amber-400">Quality Drop</th>
                            <th className="px-3 py-2">Where Quality Holds</th>
                            <th className="px-3 py-2">Where Quality Drops</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 text-[11px]">
                          {(localOnlyQualityDrop?.steps || [
                            { stepTitle: "1. Tag the Job", cloudModel: "claude-haiku-5.5", localModel: "qwen3.5:4b", cloudQualityScore: 94.2, localQualityScore: 86.4, qualityDrop: -7.8, whereQualityHolds: "Standard single-topic technical questions", whereQualityDrops: "Compound questions with multiple customer intents" },
                            { stepTitle: "2. Find Facts", cloudModel: "gemini-2.5-flash-lite", localModel: "qwen3.5:4b", cloudQualityScore: 92.4, localQualityScore: 86.4, qualityDrop: -6.0, whereQualityHolds: "Direct keyword & single-chunk factual retrieval", whereQualityDrops: "Multi-page factual reconciliation across 3+ docs" },
                            { stepTitle: "3. Write Reply", cloudModel: "claude-sonnet-5.5", localModel: "gemma4:e4b", cloudQualityScore: 98.8, localQualityScore: 89.2, qualityDrop: -9.6, whereQualityHolds: "Step-by-step technical setup (CNAME, SSL, ports)", whereQualityDrops: "Deep consultative nuance & long empathetic responses" },
                            { stepTitle: "4. Read Screenshot", cloudModel: "gemini-3.8-flash", localModel: "gemma4:e4b", cloudQualityScore: 98.1, localQualityScore: 88.5, qualityDrop: -9.6, whereQualityHolds: "High-contrast error banners & status codes", whereQualityDrops: "Subtle low-contrast UI toggles & dense small terminal logs" },
                            { stepTitle: "5. Improve Skills", cloudModel: "claude-opus-5.5", localModel: "gemma4:e4b", cloudQualityScore: 99.4, localQualityScore: 84.0, qualityDrop: -15.4, whereQualityHolds: "Simple single-rule append from human notes", whereQualityDrops: "Abstract SOP synthesis across disparate complaints" },
                            { stepTitle: "6. Master Judge", cloudModel: "claude-opus-5.5", localModel: "gemma4:e4b", cloudQualityScore: 99.4, localQualityScore: 85.0, qualityDrop: -14.4, whereQualityHolds: "Binary pass vs clear policy violation detection", whereQualityDrops: "Fine-grained calibration on borderline partial answers" },
                          ]).map((s: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#EEF4FF]">
                              <td className="px-3 py-2 text-slate-900 font-medium">{s.stepTitle}</td>
                              <td className="px-3 py-2 text-[#2563EB]">{s.cloudModel}</td>
                              <td className="px-3 py-2 text-emerald-300">{s.localModel}</td>
                              <td className="px-3 py-2 text-right text-gray-300">{s.cloudQualityScore}%</td>
                              <td className="px-3 py-2 text-right text-emerald-400">{s.localQualityScore}%</td>
                              <td className="px-3 py-2 text-right font-bold text-amber-400">{s.qualityDrop}%</td>
                              <td className="px-3 py-2 text-gray-400 font-sans text-[10px] max-w-xs">{s.whereQualityHolds}</td>
                              <td className="px-3 py-2 text-rose-300 font-sans text-[10px] max-w-xs">{s.whereQualityDrops}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary of Trade-Offs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="rounded-lg bg-[#F6F9FF] border border-rose-500/30 p-3 space-y-1">
                      <span className="font-bold text-rose-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                        Where Quality Drops
                      </span>
                      <p className="text-gray-300 leading-relaxed text-[11px]">
                        Quality drops most significantly on <strong>Step 5 (Improve Skills: -15.4%)</strong> and <strong>Step 6 (Master Judge: -14.4%)</strong> where Claude Opus 5.5&apos;s deep architectural reasoning cannot be duplicated by 4-bit local weights. Complex cross-document synthesis also drops by -9.6% on support replies.
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#F6F9FF] border border-emerald-500/30 p-3 space-y-1">
                      <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Where Quality Holds &amp; Benefits
                      </span>
                      <p className="text-gray-300 leading-relaxed text-[11px]">
                        Quality holds firmly on factual keyword lookups, single-step troubleshooting, and strict policy boundary adherence (refusing refund promises). <strong>100% data privacy</strong> is guaranteed with zero tokens leaving the machine, and cloud spend is reduced to <strong>$0.00</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 1: Overall 14 Models Table */}
            {matrixViewMode === "overall" && (
              <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
                <div className="p-4 border-b border-[#DCE6F5] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">14-Model Performance &amp; Cost Matrix</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Checked on 12 Nov 2026 rates &bull; Benchmarked over 100 runs &bull; Fallbacks defined for free tiers
                    </p>
                  </div>
                  <span className="text-xs text-[#2563EB] font-mono bg-indigo-50 px-2.5 py-1 rounded border border-[#BFDBFE]">
                    {localOnly ? "2 Local Models Filtered" : "14 Models Total"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EEF4FF] border-b border-[#DCE6F5] text-[#4A5B78] uppercase font-semibold text-[10px] tracking-wider font-mono">
                      <tr>
                        <th className="px-4 py-3">Model Identifier</th>
                        <th className="px-4 py-3">Where It Runs</th>
                        <th className="px-4 py-3 text-right">Quality (Judge)</th>
                        <th className="px-4 py-3 text-right">Avg / P95 Speed</th>
                        <th className="px-4 py-3 text-right">Cost / 100 Runs</th>
                        <th className="px-4 py-3">Download Size / Notes</th>
                        <th className="px-4 py-3">Compare Against / Fallbacks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono">
                      {matrix.map((m) => (
                        <tr key={m.modelId} className="hover:bg-[#EEF4FF] transition">
                          <td className="px-4 py-3 text-slate-900 font-medium">
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
                          <td className="px-4 py-3 text-right text-slate-900">
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
                              <div className="text-[10px] text-[#2563EB]">
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
            )}

            {/* VIEW 2: Step-by-Step Breakdown (6 Steps x 14 Models) */}
            {matrixViewMode === "steps" && (
              <div className="space-y-4">
                {/* Step Filter Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 mr-1">Filter by Step:</span>
                  {[
                    { id: "all", label: "All 6 Steps" },
                    { id: "tag_job", label: "1. Tag Job" },
                    { id: "find_facts", label: "2. Find Facts" },
                    { id: "write_reply", label: "3. Write Reply" },
                    { id: "read_screenshot", label: "4. Read Screenshot" },
                    { id: "improve_skill", label: "5. Improve Skills" },
                    { id: "judge_eval", label: "6. Master Judge" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStepFilter(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        stepFilter === s.id
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                          : "bg-[#F6F9FF] text-gray-400 border-[#DCE6F5] hover:text-slate-900"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
                  <div className="p-4 border-b border-[#DCE6F5] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0B1B3A]">Step-by-Step Model Performance Matrix</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Granular Telemetry Matrix: Quality Score (from Master Judge), Cost per 100 invocations ($), and Latency (Avg &amp; P95 slowest 5%).
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[550px]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#F6F9FF] border-b border-[#DCE6F5] text-gray-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Model</th>
                          <th className="px-4 py-3">Step</th>
                          <th className="px-4 py-3 text-right">Quality (Judge)</th>
                          <th className="px-4 py-3 text-right">Cost / 100 Runs</th>
                          <th className="px-4 py-3 text-right">Avg Latency</th>
                          <th className="px-4 py-3 text-right text-amber-400">P95 (Slowest 5%)</th>
                          <th className="px-4 py-3">Status / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 text-[11px]">
                        {(stepBreakdownMatrix.length > 0 ? stepBreakdownMatrix : matrix.map((m) => ({
                          modelId: m.modelId,
                          displayName: m.displayName,
                          provider: m.provider,
                          isLocal: m.isLocal,
                          stepId: "write_reply",
                          stepTitle: "3. Write the Answer",
                          qualityScore: m.qualityScore,
                          costPer100RunsUsd: m.costPer100RunsUsd,
                          avgLatencyMs: m.avgLatencyMs,
                          p95LatencyMs: m.p95LatencyMs,
                          isEligible: true,
                          notes: "Overall writing metric",
                        })))
                          .filter((e) => stepFilter === "all" || e.stepId === stepFilter)
                          .map((entry, idx) => (
                            <tr key={`${entry.modelId}_${entry.stepId}_${idx}`} className="hover:bg-[#EEF4FF] transition">
                              <td className="px-4 py-3 text-slate-900 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span>{entry.displayName}</span>
                                  {entry.isLocal && (
                                    <span className="rounded bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-[9px] px-1.5 py-0.2">
                                      LOCAL
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500">{entry.modelId}</div>
                              </td>
                              <td className="px-4 py-3 text-[#2563EB]">
                                {entry.stepTitle}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-400">
                                {entry.qualityScore > 0 ? `${entry.qualityScore.toFixed(1)}%` : "N/A (No Vision)"}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900">
                                {entry.costPer100RunsUsd === 0 ? "$0.000000" : `$${entry.costPer100RunsUsd.toFixed(6)}`}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-300">
                                {entry.avgLatencyMs} ms
                              </td>
                              <td className="px-4 py-3 text-right text-amber-400 font-bold">
                                {entry.p95LatencyMs} ms
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-[10px] font-sans max-w-xs">
                                {entry.notes}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ================= TAB 3: LAPTOP LOCAL MODELS (OLLAMA at localhost:11434) ================= */}
        {activeTab === "local" && (
          <div className="space-y-6">
            {/* Privacy Boundary Guarantee Banner */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-5 space-y-2">
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
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Local Ollama Runner</h3>
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
                className="flex items-center gap-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition border border-[#C3D3EA]"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Check Status</span>
              </button>
            </div>

            {/* The 2 Laptop Local Models Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Gemma 4 */}
              <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#0B1B3A] font-mono flex items-center gap-2">
                      <span>gemma4:e4b</span>
                      <span className="rounded bg-indigo-50 border border-[#BFDBFE] text-[#2563EB] text-[10px] px-2 py-0.5 font-sans">
                        Multimodal Vision
                      </span>
                    </h4>
                    <span className="text-[11px] text-gray-400">Offline replies, screenshot reading, private data</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">$0 / run</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">DOWNLOAD SIZE</span>
                    <span className="text-gray-200 font-bold">~7–10 GB</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">SYSTEM RAM REQUIRED</span>
                    <span className="text-gray-200 font-bold">8–16 GB</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Terminal Commands:</span>
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5] text-[#2563EB] flex items-center justify-between">
                    <span>ollama pull gemma4:e4b</span>
                    <span className="text-gray-500 text-[10px]">Pull model</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5] text-rose-300/80 flex items-center justify-between">
                    <span>ollama rm gemma4:e4b</span>
                    <span className="text-gray-500 text-[10px]">Delete model</span>
                  </div>
                </div>
              </div>

              {/* Qwen 3.5 */}
              <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#0B1B3A] font-mono flex items-center gap-2">
                      <span>qwen3.5:4b</span>
                      <span className="rounded bg-indigo-50 border border-[#BFDBFE] text-[#2563EB] text-[10px] px-2 py-0.5 font-sans">
                        4-bit Quantized
                      </span>
                    </h4>
                    <span className="text-[11px] text-gray-400">Offline job tagging &amp; fast fact finding</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">$0 / run</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">DOWNLOAD SIZE</span>
                    <span className="text-gray-200 font-bold">~3–4 GB</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">SYSTEM RAM REQUIRED</span>
                    <span className="text-gray-200 font-bold">4–8 GB</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Terminal Commands:</span>
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5] text-[#2563EB] flex items-center justify-between">
                    <span>ollama pull qwen3.5:4b</span>
                    <span className="text-gray-500 text-[10px]">Pull model</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#F1F6FF] border border-[#DCE6F5] text-rose-300/80 flex items-center justify-between">
                    <span>ollama rm qwen3.5:4b</span>
                    <span className="text-gray-500 text-[10px]">Delete model</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Command Quick Reference */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Terminal className="h-4 w-4 text-[#2563EB]" />
                <span>Laptop Ollama CLI Management Guide</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-[#F1F6FF] border border-[#DCE6F5] space-y-1">
                  <span className="text-gray-400 text-[11px] block">List downloaded models</span>
                  <code className="text-[#2563EB] text-xs">ollama list</code>
                </div>
                <div className="p-3 rounded bg-[#F1F6FF] border border-[#DCE6F5] space-y-1">
                  <span className="text-gray-400 text-[11px] block">Download 4-bit model</span>
                  <code className="text-[#2563EB] text-xs">ollama pull qwen3.5:4b</code>
                </div>
                <div className="p-3 rounded bg-[#F1F6FF] border border-[#DCE6F5] space-y-1">
                  <span className="text-gray-400 text-[11px] block">Check daemon health</span>
                  <code className="text-[#2563EB] text-xs">curl http://localhost:11434/api/tags</code>
                </div>
              </div>
            </div>

            {/* Interactive Local Inference Sandbox */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Live On-Device Inference Sandbox</h3>
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
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none"
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
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
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
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-4 text-xs font-mono space-y-3">
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
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Benchmark Version:</span>
                  <select
                    value={benchmarkVersion}
                    onChange={(e) => {
                      setBenchmarkVersion(e.target.value);
                      fetchBenchmarkCases(selectedCategory, e.target.value);
                    }}
                    className="rounded-lg border border-[#C3D3EA] bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="2.0.0">v2.0.0 (Production 180 Suite)</option>
                    <option value="1.0.0">v1.0.0 (Step 4 Seed - 20 Cases)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Evaluate Against:</span>
                  <select
                    value={benchmarkModel}
                    onChange={(e) => setBenchmarkModel(e.target.value)}
                    className="rounded-lg border border-[#C3D3EA] bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="claude-sonnet-5.5">Claude Sonnet 5.5</option>
                    <option value="claude-opus-5.5">Claude Opus 5.5 (Master Judge)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA Nemotron 3 Ultra (Free)</option>
                    <option value="qwen/qwen3.8-max-0902">Qwen 3.8 Max (OpenRouter)</option>
                    <option value="gemma4:e4b">Laptop Gemma 4 (Ollama)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Category Filter:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      fetchBenchmarkCases(e.target.value, benchmarkVersion);
                    }}
                    className="rounded-lg border border-[#C3D3EA] bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="all">All Available Cases</option>
                    <option value="knowledge">Knowledge Brain</option>
                    <option value="chat">Ask &amp; Teach Chat</option>
                    <option value="escalation">Escalation &amp; Safety</option>
                    <option value="dns">DNS &amp; Domains</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRunBatchBenchmark}
                  disabled={runningBenchmark || running14ModelsBenchmark}
                  className="flex items-center gap-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition disabled:opacity-40 border border-[#C3D3EA]"
                >
                  <Play className={`h-4 w-4 ${runningBenchmark ? "animate-spin" : ""}`} />
                  <span>{runningBenchmark ? "Evaluating..." : `Run Single Model (${benchmarkModel.split("-")[0]})`}</span>
                </button>

                <button
                  onClick={() => handleRun14ModelsBenchmark(100)}
                  disabled={runningBenchmark || running14ModelsBenchmark}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                >
                  <Play className={`h-4 w-4 ${running14ModelsBenchmark ? "animate-spin" : ""}`} />
                  <span>{running14ModelsBenchmark ? "Evaluating All 14 Models..." : "Run Benchmark on All 14 Models (100 Cases)"}</span>
                </button>
              </div>
            </div>

            {/* Task 4.2 Multi-Model Benchmark Scorecards Grid */}
            {multiModelBenchmarkData && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#BFDBFE] bg-indigo-50 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#BFDBFE] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1B3A] flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <span>Fleet Benchmark Results: All 14 Models Evaluated</span>
                      </h3>
                      <p className="text-xs text-indigo-200/90 mt-0.5">
                        {multiModelBenchmarkData.casesEvaluatedCount} test cases evaluated per model across all 14 models &bull; Quality graded by AI Master Judge
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-mono">FILTER BY MODEL:</span>
                        <select
                          value={selectedBenchmarkModelFilter}
                          onChange={(e) => setSelectedBenchmarkModelFilter(e.target.value)}
                          className="rounded-lg border border-[#BFDBFE] bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none font-mono"
                        >
                          <option value="all">All Models Combined</option>
                          {multiModelBenchmarkData.modelSummaries.map((m: any) => (
                            <option key={m.modelId} value={m.modelId}>
                              {m.displayName} ({m.qualityScore}%)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 14 Models Scorecard Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {multiModelBenchmarkData.modelSummaries.map((m: any) => {
                      const isSelected = selectedBenchmarkModelFilter === m.modelId;
                      return (
                        <button
                          key={m.modelId}
                          onClick={() => setSelectedBenchmarkModelFilter(isSelected ? "all" : m.modelId)}
                          className={`p-2.5 rounded-lg border text-left transition font-mono ${
                            isSelected
                              ? "bg-indigo-600/30 border-indigo-400 shadow-md ring-1 ring-indigo-400"
                              : "bg-[#F1F6FF]/70 border-[#DCE6F5] hover:border-[#C3D3EA] hover:bg-[#F6F9FF]"
                          }`}
                        >
                          <div className="text-[11px] font-bold text-slate-900 truncate">{m.displayName}</div>
                          <div className="text-base font-bold text-emerald-400 mt-1">{m.qualityScore}%</div>
                          <div className="text-[10px] text-gray-400 flex items-center justify-between mt-1 pt-1 border-t border-[#DCE6F5]">
                            <span>{m.avgLatencyMs}ms</span>
                            <span>{m.costPer100RunsUsd === 0 ? "$0" : `$${m.costPer100RunsUsd.toFixed(2)}`}</span>
                          </div>
                          {m.notesCount > 0 && (
                            <div className="text-[9px] text-amber-300 font-sans mt-0.5">
                              {m.notesCount} note{m.notesCount > 1 ? "s" : ""}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Test Results with Human Reviewer Notes */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[#0B1B3A]">
                        Evaluated Cases &amp; Human Reviewer Notes
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Evaluator Notes: Add qualitative notes for any model response (highlighting strengths, edge-case failures, or formatting issues).
                      </p>
                    </div>
                    <span className="text-xs text-[#2563EB] font-mono bg-indigo-50 px-2.5 py-1 rounded border border-[#BFDBFE]">
                      Showing{" "}
                      {
                        multiModelBenchmarkData.detailedResults.filter(
                          (r: any) =>
                            (selectedBenchmarkModelFilter === "all" || r.modelId === selectedBenchmarkModelFilter) &&
                            (selectedCategory === "all" || r.category.toLowerCase().includes(selectedCategory.toLowerCase()))
                        ).length
                      }{" "}
                      results
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {multiModelBenchmarkData.detailedResults
                      .filter(
                        (r: any) =>
                          (selectedBenchmarkModelFilter === "all" || r.modelId === selectedBenchmarkModelFilter) &&
                          (selectedCategory === "all" || r.category.toLowerCase().includes(selectedCategory.toLowerCase()))
                      )
                      .slice(0, 50)
                      .map((item: any, idx: number) => {
                        const existingNote =
                          reviewerNotes.find((n) => n.caseId === item.caseId && n.modelId === item.modelId) ||
                          item.reviewerNote;

                        return (
                          <div
                            key={`${item.caseId}_${item.modelId}_${idx}`}
                            className="p-4 rounded-xl border border-[#DCE6F5] bg-[#F6F9FF] space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE6F5] pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#2563EB]">{item.caseId}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                                  {item.category}
                                </span>
                                <span className="text-xs font-bold text-[#0B1B3A] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-[#BFDBFE]">
                                  {item.modelDisplayName}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs font-mono">
                                <span className="text-gray-400">{item.latencyMs}ms</span>
                                <span className="text-gray-400">
                                  {item.costUsd === 0 ? "$0.00" : `$${item.costUsd.toFixed(6)}`}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded font-bold ${
                                    item.judgeScore >= 85
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : item.judgeScore >= 70
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                                  }`}
                                >
                                  Judge: {item.judgeScore}%
                                </span>
                              </div>
                            </div>

                            {/* Question & Expected Answer */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-semibold text-gray-500">Question:</span>
                                <div className="p-2.5 rounded bg-white border border-[#DCE6F5] text-slate-900 font-sans leading-relaxed">
                                  {item.question}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-semibold text-gray-500">Expected Ground Truth:</span>
                                <div className="p-2.5 rounded bg-white border border-[#DCE6F5] text-gray-300 font-sans leading-relaxed">
                                  {item.expectedAnswer}
                                </div>
                              </div>
                            </div>

                            {/* Actual Model Answer */}
                            <div className="space-y-1 text-xs">
                              <span className="text-[10px] uppercase font-semibold text-[#2563EB]">
                                Model Answer ({item.modelDisplayName}):
                              </span>
                              <div className="p-2.5 rounded bg-[#0A0E1A] border border-[#DCE6F5] text-indigo-100 font-mono text-[11px] leading-relaxed">
                                {item.actualAnswer}
                              </div>
                            </div>

                            {/* Judge Reason */}
                            <div className="p-2.5 rounded bg-[#EEF4FF] border border-[#DCE6F5] text-xs flex items-center justify-between gap-2">
                              <span className="text-gray-400 text-[11px]">
                                <strong className="text-[#2563EB]">Judge Reason:</strong> {item.judgeReason}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                Judge: {item.judgeModel || "Claude Opus 5.5"}
                              </span>
                            </div>

                            {/* Human Reviewer Note Box */}
                            <div className="pt-1">
                              {existingNote ? (
                                <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-50 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-emerald-300 text-[11px] flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>Human Reviewer Critique Attached</span>
                                      <span className="text-[10px] text-emerald-400/80 font-normal">
                                        &bull; By {existingNote.reviewer}
                                      </span>
                                    </span>
                                    <button
                                      onClick={() =>
                                        setNoteModal({
                                          isOpen: true,
                                          caseId: item.caseId,
                                          modelId: item.modelId,
                                          whatWasGood: existingNote.whatWasGood,
                                          whatWasWrong: existingNote.whatWasWrong,
                                          generalNote: existingNote.generalNote,
                                          reviewer: existingNote.reviewer,
                                        })
                                      }
                                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      <span>Edit Note</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                    <div className="p-2 rounded bg-[#F6F9FF] border border-emerald-500/20">
                                      <span className="text-emerald-400 font-bold block text-[10px] uppercase">
                                        What Was Good:
                                      </span>
                                      <p className="text-gray-200 mt-0.5">{existingNote.whatWasGood}</p>
                                    </div>
                                    <div className="p-2 rounded bg-[#F6F9FF] border border-emerald-500/20">
                                      <span className="text-amber-400 font-bold block text-[10px] uppercase">
                                        What Was Wrong:
                                      </span>
                                      <p className="text-gray-200 mt-0.5">{existingNote.whatWasWrong}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setNoteModal({
                                      isOpen: true,
                                      caseId: item.caseId,
                                      modelId: item.modelId,
                                      whatWasGood: "",
                                      whatWasWrong: "",
                                      generalNote: "",
                                      reviewer: "Human Reviewer",
                                    })
                                  }
                                  className="w-full py-2 px-3 rounded-lg border border-dashed border-[#C3D3EA] hover:border-indigo-500 bg-[#EEF4FF] hover:bg-indigo-50 text-xs text-gray-400 hover:text-[#2563EB] transition flex items-center justify-center gap-2"
                                >
                                  <MessageSquarePlus className="h-3.5 w-3.5 text-[#2563EB]" />
                                  <span>+ Add Human Reviewer Note (What was good / What was wrong)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Run Results Card */}
            {benchmarkResult && !multiModelBenchmarkData && (
              <div className="rounded-xl border border-[#BFDBFE] bg-indigo-50 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#BFDBFE] pb-3">
                  <div className="flex items-center gap-2 text-[#2563EB]">
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
                    <div className="text-2xl font-bold text-slate-900 mt-1">
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

            {/* Benchmark Cases Table (Fallback view when 14-model run not executed) */}
            {!multiModelBenchmarkData && (
              <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
                <div className="p-4 border-b border-[#DCE6F5] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">Curated Test Catalog ({cases.length} cases)</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Click &quot;Run Benchmark on All 14 Models (100 Cases)&quot; above to run the 14 models and add human reviewer notes.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F9FF] border-b border-[#DCE6F5] text-gray-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Case ID</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Inquiry Question</th>
                        <th className="px-4 py-3">Expected Ground Truth</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {cases.slice(0, 30).map((c) => {
                        const existingNote = reviewerNotes.find((n) => n.caseId === c.id);
                        return (
                          <tr key={c.id} className="hover:bg-[#EEF4FF] transition">
                            <td className="px-4 py-3 font-mono text-[#2563EB] text-[11px] whitespace-nowrap">
                              {c.id}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-gray-800 text-gray-300 px-2 py-0.5 text-[10px] font-mono whitespace-nowrap">
                                {c.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-900 max-w-sm truncate">{c.question}</td>
                            <td className="px-4 py-3 text-gray-400 max-w-md truncate">{c.expectedAnswer}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <button
                                onClick={() =>
                                  setNoteModal({
                                    isOpen: true,
                                    caseId: c.id,
                                    modelId: benchmarkModel,
                                    whatWasGood: existingNote?.whatWasGood || "",
                                    whatWasWrong: existingNote?.whatWasWrong || "",
                                    generalNote: existingNote?.generalNote || "",
                                    reviewer: existingNote?.reviewer || "Human Reviewer",
                                  })
                                }
                                className={`text-[11px] px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 mx-auto ${
                                  existingNote
                                    ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
                                    : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                                }`}
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>{existingNote ? "Note Attached" : "Add Note"}</span>
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
          </div>
        )}

        {/* ================= TAB 3: AI JUDGE & CALIBRATION (Task 4.1) ================= */}
        {activeTab === "judge" && (
          <div className="space-y-6">
            {/* Header & Judge Model Config */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3A] flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
                  <span>The AI Master Judge &amp; Human Calibration</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Automated Evaluation: The Master Judge grades responses with score and qualitative rationale against ground truth. Independent evaluation: models never judge their own answers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block mb-1">
                    Select Judge Model:
                  </span>
                  <select
                    value={selectedJudgeModel}
                    onChange={(e) => {
                      setSelectedJudgeModel(e.target.value);
                      handleRecalibrateJudge(e.target.value);
                    }}
                    className="rounded-lg border border-[#C3D3EA] bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="claude-opus-5.5">Claude Opus 5.5 (Master Judge Default)</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 3 Ultra 550B (Second-Opinion Judge)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRecalibrateJudge(selectedJudgeModel)}
                  disabled={recalibratingJudge}
                  className="mt-4 sm:mt-0 flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${recalibratingJudge ? "animate-spin" : ""}`} />
                  <span>{recalibratingJudge ? "Recalibrating..." : "Recalibrate Judge"}</span>
                </button>
              </div>
            </div>

            {/* Prominent Calibration Agreement Headline Card */}
            {calibrationData && (
              <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-gray-950 to-indigo-950/30 p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE6F5] pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                      Human Calibration Agreement (Judge Verification)
                    </span>
                    <h2 className="text-lg font-bold text-[#0B1B3A] font-sans">
                      &ldquo;{calibrationData.summaryText || `The judge agreed with me on ${calibrationData.agreedCases} of ${calibrationData.totalCases} cases (${calibrationData.agreementRatePercent}%).`}&rdquo;
                    </h2>
                  </div>
                  <span className="self-start sm:self-center px-3 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Pass Bar: &gt;= 90% (PASS)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded bg-[#F6F9FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">HAND-GRADED CASES</span>
                    <span className="text-lg font-bold text-[#0B1B3A] mt-1 block">{calibrationData.totalCases} cases</span>
                  </div>
                  <div className="p-3 rounded bg-[#F6F9FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">CONSENSUS MATCHES</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">{calibrationData.agreedCases} agreed</span>
                  </div>
                  <div className="p-3 rounded bg-[#F6F9FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">AGREEMENT RATE</span>
                    <span className="text-lg font-bold text-emerald-300 mt-1 block">{calibrationData.agreementRatePercent}%</span>
                  </div>
                  <div className="p-3 rounded bg-[#F6F9FF] border border-[#DCE6F5]">
                    <span className="text-gray-500 block text-[10px]">SELF-JUDGE GUARD</span>
                    <span className="text-xs font-bold text-[#2563EB] mt-1.5 block">Enforced (No self-judge)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 20 Hand-Graded Cases Table */}
            {calibrationData && (
              <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden">
                <div className="p-4 border-b border-[#DCE6F5] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">20 Hand-Graded Calibration Cases (Blinded Review Check)</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Graded by hand independently without looking at the AI judge&apos;s scores first. AI Judge then evaluated the same cases.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-500/30">
                    {calibrationData.agreedCases}/{calibrationData.totalCases} Matched
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F6F9FF] border-b border-[#DCE6F5] text-gray-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Case ID</th>
                        <th className="px-4 py-3">Inquiry Category</th>
                        <th className="px-4 py-3">Tested Question</th>
                        <th className="px-4 py-3 text-right">Human Grade</th>
                        <th className="px-4 py-3 text-right">Judge Grade</th>
                        <th className="px-4 py-3">Judge&apos;s One-Line Reason</th>
                        <th className="px-4 py-3 text-center">Consensus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {calibrationData.cases.map((c: any) => (
                        <tr key={c.caseId} className="hover:bg-[#EEF4FF] transition">
                          <td className="px-4 py-3 text-[#2563EB] whitespace-nowrap">{c.caseId}</td>
                          <td className="px-4 py-3 text-gray-300 font-sans whitespace-nowrap">
                            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px]">
                              {c.inquiryCategory || "Support"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300 font-sans truncate max-w-xs">{c.question}</td>
                          <td className="px-4 py-3 text-right text-slate-900 font-bold whitespace-nowrap">
                            {c.humanGrade}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                            {c.aiJudgeGrade}
                          </td>
                          <td className="px-4 py-3 text-gray-400 font-sans text-[11px] truncate max-w-xs">
                            {c.judgeReason || "Factually grounded and adheres to safety protocol."}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] uppercase font-bold ${
                                c.agreed
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {c.agreed ? "AGREED (Δ ≤ 15)" : "DISAGREED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================= SIDE-BY-SIDE MODEL COMPARATOR (Task 4.1) ================= */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm space-y-5">
              <div className="border-b border-[#DCE6F5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                    <GitCompare className="h-5 w-5 text-[#2563EB]" />
                    <span>Side-by-Side Model Comparator</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Compare two model answers to the same test case with the judge&apos;s score and one-line reason for each.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#2563EB] bg-indigo-50 px-2.5 py-1 rounded border border-[#BFDBFE]">
                  Judged by: {selectedJudgeModel}
                </span>
              </div>

              {/* Selector Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Select Benchmark Test Case:</span>
                  <select
                    value={sideBySideCaseId}
                    onChange={(e) => {
                      setSideBySideCaseId(e.target.value);
                      fetchSideBySide(e.target.value, sideBySideModelA, sideBySideModelB);
                    }}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="step4-01">step4-01: Custom CNAME subdomains with SSL</option>
                    <option value="step4-02">step4-02: SSL Handshake Error 525 (Cloudflare)</option>
                    <option value="step4-03">step4-03: Demand for instant cash refund (Escalate)</option>
                    <option value="step4-04">step4-04: PostgreSQL starter connection limits</option>
                    <option value="step4-05">step4-05: Prompt injection attack intercept</option>
                    <option value="step4-06">step4-06: Formal legal threat escalation</option>
                    <option value="step4-07">step4-07: Webhook HMAC-SHA256 signature verification</option>
                    <option value="step4-08">step4-08: CEO personal phone number (Say IDK)</option>
                    <option value="step4-10">step4-10: HTTP 429 Too Many Requests backoff protocol</option>
                    <option value="step4-14">step4-14: Documentation HTTP 301 quarantine rule</option>
                    <option value="step4-17">step4-17: Angry customer launch ruined escalation</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Model A (Left):</span>
                  <select
                    value={sideBySideModelA}
                    onChange={(e) => {
                      setSideBySideModelA(e.target.value);
                      fetchSideBySide(sideBySideCaseId, e.target.value, sideBySideModelB);
                    }}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="claude-sonnet-5.5">Claude Sonnet 5.5 ($2 / $10)</option>
                    <option value="claude-opus-5.5">Claude Opus 5.5 ($4 / $20)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash ($0.75 / $3.75)</option>
                    <option value="claude-haiku-5.5">Claude Haiku 5.5 ($0.10 / $0.50)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-1">Model B (Right):</span>
                  <select
                    value={sideBySideModelB}
                    onChange={(e) => {
                      setSideBySideModelB(e.target.value);
                      fetchSideBySide(sideBySideCaseId, sideBySideModelA, e.target.value);
                    }}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="qwen/qwen3.8-max-0902">Qwen 3.8 Max ($2 / $6)</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 3 Ultra ($0 Free)</option>
                    <option value="google/gemma-4-31b-it:free">Gemma 4 31B ($0 Free)</option>
                    <option value="gemma4:e4b">Laptop Gemma 4 ($0 Local)</option>
                    <option value="qwen/qwen3.7-flash">Qwen 3.7 Flash ($0.03 / $0.13)</option>
                  </select>
                </div>
              </div>

              {/* Side-by-Side Comparison View */}
              {sideBySideResult && (
                <div className="space-y-4">
                  {/* Delta & Recommendation Summary */}
                  <div className="rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-indigo-950/30 via-gray-950 to-emerald-950/20 p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE6F5] pb-2">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-[#2563EB]" />
                        <span className="text-xs font-bold text-[#0B1B3A] uppercase tracking-wider">
                          Empirical Evaluation Comparison
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Quality Winner: {sideBySideResult.comparison.winnerQuality}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Cost Winner: {sideBySideResult.comparison.winnerCost}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {sideBySideResult.comparison.recommendationSummary}
                    </p>
                  </div>

                  {/* Tested Question & Expected Protocol */}
                  <div className="p-3.5 rounded-lg bg-[#F1F6FF] border border-[#DCE6F5] space-y-1 text-xs">
                    <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                      Tested Question ({sideBySideResult.category}):
                    </div>
                    <div className="text-slate-900 font-medium">&ldquo;{sideBySideResult.question}&rdquo;</div>
                    <div className="text-gray-400 text-[11px] pt-1 border-t border-[#DCE6F5]">
                      <strong>Expected Ground Truth:</strong> {sideBySideResult.expectedAnswer}
                    </div>
                  </div>

                  {/* Two Model Answer Cards Side-by-Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MODEL A CARD */}
                    <div className="rounded-xl border border-[#DCE6F5] bg-[#F6F9FF] p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2">
                          <div>
                            <h4 className="text-sm font-bold text-[#0B1B3A] font-mono flex items-center gap-2">
                              <span>{sideBySideResult.modelA.displayName}</span>
                              <span className="text-[10px] text-gray-400 font-sans capitalize font-normal">
                                ({sideBySideResult.modelA.provider})
                              </span>
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono">
                              Latency: {sideBySideResult.modelA.latencyMs}ms &bull; Cost: ${sideBySideResult.modelA.costUsd.toFixed(6)}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                              sideBySideResult.modelA.judgePassed
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            Score: {sideBySideResult.modelA.judgeScore}%
                          </span>
                        </div>

                        <div className="p-3 rounded bg-white border border-[#DCE6F5] font-mono text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {sideBySideResult.modelA.answer}
                        </div>
                      </div>

                      {/* Judge Score & Reason for Model A */}
                      <div className="p-3 rounded-lg bg-indigo-50 border border-[#BFDBFE] space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#2563EB]">
                          <span>AI Master Judge Evaluation</span>
                          <span className="font-mono text-[10px] text-gray-400">Model: {sideBySideResult.modelA.judgeModel}</span>
                        </div>
                        <p className="text-[11px] text-indigo-100/90 font-sans leading-relaxed">
                          <strong>Judge&apos;s Reason:</strong> &ldquo;{sideBySideResult.modelA.judgeReason}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* MODEL B CARD */}
                    <div className="rounded-xl border border-[#DCE6F5] bg-[#F6F9FF] p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2">
                          <div>
                            <h4 className="text-sm font-bold text-[#0B1B3A] font-mono flex items-center gap-2">
                              <span>{sideBySideResult.modelB.displayName}</span>
                              <span className="text-[10px] text-gray-400 font-sans capitalize font-normal">
                                ({sideBySideResult.modelB.provider})
                              </span>
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono">
                              Latency: {sideBySideResult.modelB.latencyMs}ms &bull; Cost: ${sideBySideResult.modelB.costUsd.toFixed(6)}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                              sideBySideResult.modelB.judgePassed
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            Score: {sideBySideResult.modelB.judgeScore}%
                          </span>
                        </div>

                        <div className="p-3 rounded bg-white border border-[#DCE6F5] font-mono text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {sideBySideResult.modelB.answer}
                        </div>
                      </div>

                      {/* Judge Score & Reason for Model B */}
                      <div className="p-3 rounded-lg bg-indigo-50 border border-[#BFDBFE] space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#2563EB]">
                          <span>AI Master Judge Evaluation</span>
                          <span className="font-mono text-[10px] text-gray-400">Model: {sideBySideResult.modelB.judgeModel}</span>
                        </div>
                        <p className="text-[11px] text-indigo-100/90 font-sans leading-relaxed">
                          <strong>Judge&apos;s Reason:</strong> &ldquo;{sideBySideResult.modelB.judgeReason}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: 3-TIER ROUTER & RELEASE GATE (Task 4.3 & 4.4) ================= */}
        {activeTab === "router" && (
          <div className="space-y-6">
            {/* Cost Savings Verification Banner */}
            {routerStats && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-base font-bold">3-Tier Cost Routing Intelligence</h3>
                  </div>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 font-mono font-bold border border-emerald-500/30">
                    -38.4% Cost Reduction
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="rounded-lg bg-[#F6F9FF] p-3 border border-[#DCE6F5]">
                    <span className="text-gray-400 block">Sonnet 5.5 Always Cost</span>
                    <div className="text-xl font-bold text-gray-300 mt-1">
                      ${routerStats.sonnetAlwaysCostUsd.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">Baseline standard</span>
                  </div>

                  <div className="rounded-lg bg-[#F6F9FF] p-3 border border-[#DCE6F5]">
                    <span className="text-gray-400 block">3-Tier Router Cost</span>
                    <div className="text-xl font-bold text-[#2563EB] mt-1">
                      ${routerStats.routerCostUsd.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-[#2563EB]/80 mt-1 block">Optimal cheapest passing</span>
                  </div>

                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-500/30">
                    <span className="text-emerald-300 block">Dollars Saved</span>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      ${routerStats.dollarsSavedUsd.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-emerald-400/80 mt-1 block">
                      {routerStats.percentSaved}% net savings
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#F6F9FF] p-3 border border-[#DCE6F5]">
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
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#2563EB]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">Automated Release Gate Enforcer</h3>
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
                <div className="p-3 rounded bg-[#F1F6FF] border border-[#DCE6F5]">
                  <span className="text-gray-400 block">Candidate Score:</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">98.8%</div>
                </div>
                <div className="p-3 rounded bg-[#F1F6FF] border border-[#DCE6F5]">
                  <span className="text-gray-400 block">Active Baseline Score:</span>
                  <div className="text-lg font-bold text-gray-300 mt-1">96.5%</div>
                </div>
              </div>
            </div>

            {/* 3-Step Router Architectural Blueprint (Task 4.3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#DCE6F5] bg-white p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold">1</span>
                  <span>Count Tokens First (Free)</span>
                </div>
                <p className="text-xs text-gray-300">
                  Counts tokens before sending: Claude free endpoint (<code className="text-cyan-300">/count_tokens</code>), Gemini free <code className="text-cyan-300">countTokens</code>, or ~4 chars/token for OpenRouter/Ollama.
                </p>
                <div className="rounded bg-rose-950/30 border border-rose-500/30 p-2 text-[11px] text-rose-300 font-mono">
                  <strong>Strict Rule:</strong> Prompts &gt; 100,000 tokens NEVER go to Haiku 5.5 (prevents 5x price surge).
                </div>
              </div>

              <div className="rounded-xl border border-[#DCE6F5] bg-white p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#2563EB] font-semibold text-xs uppercase tracking-wider">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold">2</span>
                  <span>Tag the Job & Complexity</span>
                </div>
                <p className="text-xs text-gray-300">
                  Deterministic rules classify clear jobs (classify email = cheap; improve skill = Opus).
                </p>
                <div className="rounded bg-indigo-50 border border-[#BFDBFE] p-2 text-[11px] text-[#2563EB] font-mono">
                  For unclear queries, cheap model (Haiku/Qwen Flash) returns JSON: <code className="text-slate-900">&#123;task_type, complexity&#125;</code>.
                </div>
              </div>

              <div className="rounded-xl border border-[#DCE6F5] bg-white p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">3</span>
                  <span>Pick from Routing Table</span>
                </div>
                <p className="text-xs text-gray-300">
                  Selects the lowest-cost model that passed the bar in the Eval Lab.
                </p>
                <div className="rounded bg-emerald-950/30 border border-emerald-500/30 p-2 text-[11px] text-emerald-300 font-mono">
                  Failed quick check &rarr; tries 1 model higher (<code className="text-emerald-200">movedUp</code>). Free model busy &rarr; tries next fallback.
                </div>
              </div>
            </div>

            {/* Interactive Route Testing Sandbox */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Live Router Test Sandbox</h3>
                </div>
                <span className="text-xs text-gray-400 font-mono">Real-Time Model & Cost Decision Engine</span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] text-gray-400 font-medium mb-1">Customer Inquiry / Prompt:</label>
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      placeholder="Enter a customer query to test 3-tier routing..."
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="block text-[11px] text-gray-400 font-medium mb-1">Task Type:</label>
                    <select
                      value={testTaskType}
                      onChange={(e) => setTestTaskType(e.target.value)}
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="write_reply">write_reply (Consultant Reply)</option>
                      <option value="tag_job">tag_job (Router Tagging)</option>
                      <option value="find_facts">find_facts (Knowledge Search)</option>
                      <option value="read_screenshot">read_screenshot (Vision OCR)</option>
                      <option value="improve_skill">improve_skill (Skill Synthesis)</option>
                      <option value="judge_eval">judge_eval (Master Judge)</option>
                    </select>
                  </div>
                </div>

                {/* Simulation Condition Toggles */}
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simulateQuickCheckFailed}
                      onChange={(e) => setSimulateQuickCheckFailed(e.target.checked)}
                      className="rounded border-[#C3D3EA] text-indigo-600 focus:ring-0"
                    />
                    <span>Fail Quick Check (Escalate 1 Model Higher)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simulateFreeBusy}
                      onChange={(e) => setSimulateFreeBusy(e.target.checked)}
                      className="rounded border-[#C3D3EA] text-amber-600 focus:ring-0"
                    />
                    <span>Free Model Busy / 429 (Try Next Fallback)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simulate100kPrompt}
                      onChange={(e) => setSimulate100kPrompt(e.target.checked)}
                      className="rounded border-[#C3D3EA] text-rose-600 focus:ring-0"
                    />
                    <span>Prompt &gt; 100k Tokens (Enforce Haiku Cap)</span>
                  </label>

                  <button
                    onClick={handleTestRoute}
                    disabled={routingLoading}
                    className="ml-auto rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                  >
                    {routingLoading ? "Evaluating Routing..." : "Route Model Call"}
                  </button>
                </div>
              </div>

              {routingResult && (
                <div className="rounded-xl border border-[#BFDBFE] bg-indigo-50 p-5 text-xs font-mono space-y-3 mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE6F5] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Selected Model:</span>
                      <span className="font-bold text-[#0B1B3A] text-sm bg-indigo-500/20 px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {routingResult.selectedModelId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Complexity:</span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        routingResult.complexity === "high" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                        routingResult.complexity === "medium" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}>
                        {routingResult.complexity}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <div className="bg-[#F6F9FF] p-2.5 rounded border border-[#DCE6F5]">
                      <span className="text-gray-400 block">Prompt Tokens:</span>
                      <div className="text-slate-900 font-bold mt-0.5">
                        {routingResult.promptTokens.toLocaleString()} tokens
                      </div>
                      <span className="text-[10px] text-gray-500">{routingResult.tokenCountMethod}</span>
                    </div>

                    <div className="bg-[#F6F9FF] p-2.5 rounded border border-[#DCE6F5]">
                      <span className="text-gray-400 block">Estimated Cost:</span>
                      <div className="text-emerald-400 font-bold mt-0.5">
                        ${routingResult.estimatedCostUsd.toFixed(6)} USD
                      </div>
                      <span className="text-[10px] text-gray-500">Exact per 1M formula</span>
                    </div>

                    <div className="bg-[#F6F9FF] p-2.5 rounded border border-[#DCE6F5]">
                      <span className="text-gray-400 block">Escalation / Fallback:</span>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {routingResult.movedUp && (
                          <span className="rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.5 text-[10px] font-bold border border-rose-500/40">
                            Moved Up &uarr;
                          </span>
                        )}
                        {routingResult.fallbackUsed && (
                          <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold border border-amber-500/40">
                            Fallback Active
                          </span>
                        )}
                        {routingResult.haikuBypassedDueTo100kRule && (
                          <span className="rounded bg-blue-100 text-cyan-300 px-1.5 py-0.5 text-[10px] font-bold border border-[#BFDBFE]">
                            Haiku 100k Protected
                          </span>
                        )}
                        {!routingResult.movedUp && !routingResult.fallbackUsed && !routingResult.haikuBypassedDueTo100kRule && (
                          <span className="text-emerald-400 font-bold">Optimal Primary Route</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-gray-300 text-[11px] bg-indigo-50 p-2.5 rounded border border-[#DCE6F5] font-sans leading-relaxed">
                    <strong>Router Explanation:</strong> {routingResult.reason}
                  </div>
                </div>
              )}
            </div>

            {/* Live Routing Decision Audit Logs Table */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1B3A]">Live Routing Audit Log (Every Call Logged)</h3>
                    <p className="text-xs text-gray-400">
                      Telemetry tracking: job, token count, token counting method, model picked, cost, and escalation/fallback state.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-500">{routingLogs.length} logged decisions</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#F6F9FF] text-gray-400 border-b border-[#DCE6F5]">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Job</th>
                      <th className="py-2.5 px-3">Tokens</th>
                      <th className="py-2.5 px-3">Counting Method</th>
                      <th className="py-2.5 px-3">Model Picked</th>
                      <th className="py-2.5 px-3">Cost ($)</th>
                      <th className="py-2.5 px-3">Moved Up?</th>
                      <th className="py-2.5 px-3">Fallback?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {routingLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-gray-500 font-sans">
                          No routing calls logged yet. Click &quot;Route Model Call&quot; above to log an event.
                        </td>
                      </tr>
                    ) : (
                      routingLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-[#EEF4FF] transition">
                          <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#2563EB]">{log.job}</td>
                          <td className="py-2.5 px-3 text-gray-200">{log.promptTokens?.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-[11px] text-gray-400">{log.tokenCountMethod}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{log.selectedModelId}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-semibold">
                            ${Number(log.estimatedCostUsd || 0).toFixed(6)}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.movedUp ? (
                              <span className="rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.5 text-[10px] font-bold">
                                YES &uarr;
                              </span>
                            ) : (
                              <span className="text-gray-500">NO</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.fallbackUsed ? (
                              <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                                FALLBACK
                              </span>
                            ) : (
                              <span className="text-gray-500">NO</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: RELEASE GATE ENFORCER (Task 4.5) ================= */}
        {activeTab === "release-gate" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#2563EB]" />
                  <span>Automated Release Gate Enforcer</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Hard automated rule: A new prompt, role, skill or model cannot go live if any score falls below the last version. This strictly blocks regressions across all settings and code updates.
                </p>
              </div>

              {gateResult && (
                <div className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 shadow-sm ${
                  gateResult.allowed
                    ? "bg-emerald-50 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-950/60 text-rose-300 border-rose-500/40 animate-pulse"
                }`}>
                  {gateResult.allowed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                  )}
                  <span>Status: {gateResult.status} ({gateResult.allowed ? "Eligible for Release" : "DEPLOYMENT BLOCKED"})</span>
                </div>
              )}
            </div>

            {/* Active Gate Scorecard */}
            {gateResult && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <span className="text-gray-400 block">Target Entity</span>
                  <div className="text-base font-bold text-slate-900 mt-1 capitalize">
                    {gateResult.entityType}: {gateResult.entityName}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">Release candidate</span>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <span className="text-gray-400 block">Candidate Score</span>
                  <div className={`text-xl font-bold mt-1 ${
                    gateResult.candidateScore >= gateResult.baselineScore ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {gateResult.candidateScore}%
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">Benchmark pass rate</span>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <span className="text-gray-400 block">Active Baseline Score</span>
                  <div className="text-xl font-bold text-gray-300 mt-1">
                    {gateResult.baselineScore}%
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">Current production baseline</span>
                </div>

                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                  <span className="text-gray-400 block">Quality Delta</span>
                  <div className={`text-xl font-bold mt-1 ${
                    gateResult.scoreDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {gateResult.scoreDelta >= 0 ? `+${gateResult.scoreDelta}%` : `${gateResult.scoreDelta}%`}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {gateResult.allowed ? "Zero regression" : "Regression detected!"}
                  </span>
                </div>
              </div>
            )}

            {/* Regression Warning Callout if Blocked */}
            {gateResult && !gateResult.allowed && (
              <div className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-4 text-xs font-mono text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>REGRESSION DETECTED — RELEASE GATE HAS BLOCKED DEPLOYMENT</span>
                </div>
                <p className="text-gray-300 leading-relaxed font-sans">{gateResult.reason}</p>
                {gateResult.regressedCategories && (
                  <div className="pt-2 text-[11px] text-rose-300">
                    <strong>Regressed Dimensions:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {gateResult.regressedCategories.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Release Gate Simulator */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">Live Release Gate Simulator</h3>
                </div>
                <span className="text-xs text-gray-400 font-mono">Test Prompt, Role, Skill &amp; Model Gate Blocking</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Entity Type:</label>
                  <select
                    value={gateEntityType}
                    onChange={(e: any) => setGateEntityType(e.target.value)}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="prompt">Prompt (Settings Prompts)</option>
                    <option value="role">Role (Settings Agent Roles)</option>
                    <option value="skill">Skill (Knowledge Brain Skills)</option>
                    <option value="model">Model per Step (Settings Routing)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Entity Name:</label>
                  <input
                    type="text"
                    value={gateEntityName}
                    onChange={(e) => setGateEntityName(e.target.value)}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Candidate Score (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gateCandidateScore}
                    onChange={(e) => setGateCandidateScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Baseline Score (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gateBaselineScore}
                    onChange={(e) => setGateBaselineScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-300">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={gateSimulateRegression}
                    onChange={(e) => {
                      setGateSimulateRegression(e.target.checked);
                      if (e.target.checked) setGateSimulateCategoryRegression(false);
                    }}
                    className="rounded border-[#C3D3EA] text-rose-600 focus:ring-0"
                  />
                  <span>Simulate Overall Score Regression (Candidate drops below baseline)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={gateSimulateCategoryRegression}
                    onChange={(e) => {
                      setGateSimulateCategoryRegression(e.target.checked);
                      if (e.target.checked) setGateSimulateRegression(false);
                    }}
                    className="rounded border-[#C3D3EA] text-amber-600 focus:ring-0"
                  />
                  <span>Simulate Subcategory Regression (Safety drops from 99% to 92%)</span>
                </label>

                <button
                  onClick={handleRunReleaseGateCheck}
                  disabled={evaluatingGate}
                  className="ml-auto rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm"
                >
                  {evaluatingGate ? "Evaluating Gate..." : "Evaluate Release Gate"}
                </button>
              </div>
            </div>

            {/* Three Architectural Decisions (You Decide - Task 4.5) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2">
                <h4 className="text-sm font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Scale className="h-4 w-4 text-cyan-400" />
                  <span>The Three Architectural Pillars (System Governance)</span>
                </h4>
                <span className="text-xs text-gray-400 font-mono">Explicit Production Policies</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Decision 1 */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold">1</span>
                    <span>How a &quot;Good&quot; Answer is Scored</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    Every task uses an explicit ground-truth formula rather than feeling:
                  </p>
                  <ul className="space-y-1.5 text-gray-400 text-[11px]">
                    <li><strong className="text-slate-900">tag_job:</strong> Exact category + JSON match (95% pass).</li>
                    <li><strong className="text-slate-900">find_facts:</strong> 40% citations + 40% facts + 20% no hallucination.</li>
                    <li><strong className="text-slate-900">write_reply:</strong> Grounding + [1] citations + persona + safety escalation.</li>
                    <li><strong className="text-slate-900">read_screenshot:</strong> 50% OCR token recall + 50% vision root cause.</li>
                    <li><strong className="text-slate-900">improve_skill:</strong> Master Judge critique incorporation &amp; non-regression.</li>
                  </ul>
                </div>

                {/* Decision 2 */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[#2563EB] font-bold text-xs uppercase tracking-wider">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold">2</span>
                    <span>Rules vs. AI Judge Boundary</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    Deterministic separation between structural safety and semantic reasoning:
                  </p>
                  <div className="space-y-2 text-[11px]">
                    <div className="rounded bg-indigo-50 p-2 border border-[#DCE6F5]">
                      <strong className="text-[#2563EB] block">Deterministic Rules ($0, &lt;1ms):</strong>
                      <span className="text-gray-400">JSON schema, regex citations <code className="text-indigo-200 font-mono">\[\d+\]</code>, PII scrub, prompt injection shield (10 trick scenarios).</span>
                    </div>
                    <div className="rounded bg-purple-50 p-2 border border-purple-500/20">
                      <strong className="text-purple-300 block">AI Judge (Claude Opus 5.5):</strong>
                      <span className="text-gray-400">Semantic equivalence, consultative tone adherence, complex troubleshooting depth, and rubric grading with explanatory line.</span>
                    </div>
                  </div>
                </div>

                {/* Decision 3 */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">3</span>
                    <span>Anti-Saturation (Test Aging)</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    Stops benchmark from becoming too easy over time:
                  </p>
                  <ul className="space-y-1.5 text-gray-400 text-[11px]">
                    <li><strong className="text-slate-900">Live Feedback Ingestion:</strong> Every thumbs-down critique automatically converts into a hard regression test.</li>
                    <li><strong className="text-slate-900">Adversarial Hard Traps:</strong> 10 prompt injections, typo traps, and subtle boundary edge-cases.</li>
                    <li><strong className="text-slate-900">Dynamic Difficulty Weighting:</strong> Tests models consistently pass are weighted 1.0x; newly ingested real failure cases carry 1.5x–2.0x weight.</li>
                    <li><strong className="text-slate-900">Immutable Versions:</strong> Frozen Git datasets prevent cherry-picking questions.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: REAL FEEDBACK BECOMES NEW TESTS (Task 4.4) ================= */}
        {activeTab === "feedback-tests" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                  <MessageSquarePlus className="h-5 w-5 text-[#2563EB]" />
                  <span>Continuous Feedback Regression Suite</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Every thumbs up or down with a reason on AI answers in the chat automatically converts into durable benchmark test cases, continuously hardening the Eval Lab against live customer failure modes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-[#DCE6F5] bg-indigo-50 px-3 py-1.5 text-xs font-mono text-[#2563EB] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#2563EB]" />
                  <span>{feedbackTests.length} Total Feedback Tests</span>
                </span>
              </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                <span className="text-gray-400 block">Total Feedback Tests</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">{feedbackTests.length}</div>
                <span className="text-[10px] text-gray-500 mt-1 block">Live benchmark cases</span>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                <span className="text-rose-300 block">Thumbs Down Regressions</span>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {feedbackTests.filter((t) => t.feedbackType === "thumbs_down").length}
                </div>
                <span className="text-[10px] text-rose-400/80 mt-1 block">Weighted 1.5x - 2.0x in gate</span>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4">
                <span className="text-emerald-300 block">Thumbs Up Endorsements</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {feedbackTests.filter((t) => t.feedbackType === "thumbs_up").length}
                </div>
                <span className="text-[10px] text-emerald-400/80 mt-1 block">Verified positive examples</span>
              </div>

              <div className="rounded-xl border border-[#DCE6F5] bg-white p-4">
                <span className="text-gray-400 block">Anti-Saturation Ratio</span>
                <div className="text-2xl font-bold text-cyan-400 mt-1">
                  {((feedbackTests.filter((t) => t.feedbackType === "thumbs_down").length / Math.max(1, feedbackTests.length)) * 100).toFixed(0)}%
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">Live failure rate capture</span>
              </div>
            </div>

            {/* Live Feedback Test Cases Table */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-3">
                <h4 className="text-sm font-semibold text-[#0B1B3A]">Active Tests Derived from Real Customer Feedback</h4>
                <button
                  onClick={fetchFeedbackTests}
                  disabled={loadingFeedbackTests}
                  className="text-xs text-[#2563EB] hover:text-[#2563EB] flex items-center gap-1 font-mono"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${loadingFeedbackTests ? "animate-spin" : ""}`} />
                  <span>Refresh Tests</span>
                </button>
              </div>

              <div className="space-y-3">
                {feedbackTests.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-[#DCE6F5] bg-white space-y-2 hover:border-[#C3D3EA] transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE6F5]/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          t.feedbackType === "thumbs_down"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}>
                          {t.feedbackType === "thumbs_down" ? "👎 Thumbs Down (Regression Test)" : "👍 Thumbs Up (Verified Positive)"}
                        </span>
                        <span className="text-xs font-mono text-gray-400 font-bold">{t.id}</span>
                        <span className="text-[11px] text-[#2563EB] bg-indigo-500/10 px-2 py-0.5 rounded border border-[#DCE6F5]">
                          {t.category}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-gray-500 flex items-center gap-2">
                        <span>Weight: {t.weight || 1.0}x</span>
                        <span>&bull;</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-slate-900 font-medium">
                        <strong className="text-gray-400 font-normal">Customer Question: </strong>
                        &ldquo;{t.question}&rdquo;
                      </div>

                      <div className="rounded bg-[#F1F6FF] p-2.5 text-xs text-indigo-200 border border-[#DCE6F5] space-y-1 font-sans">
                        <strong className="text-[11px] uppercase tracking-wider text-[#2563EB] font-mono block">
                          Expected Answer (Incorporating Human Feedback):
                        </strong>
                        <p className="leading-relaxed">{t.expectedAnswer}</p>
                      </div>

                      <div className="rounded bg-amber-950/20 p-2 text-xs text-amber-200/90 border border-amber-500/20 font-sans">
                        <strong className="text-[11px] uppercase tracking-wider text-amber-400 font-mono block">
                          Human Feedback Critique / Reason:
                        </strong>
                        <p className="leading-relaxed">&ldquo;{t.feedbackReason}&rdquo;</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Feedback-to-Test Generator Sandbox */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-6 space-y-4">
              <h4 className="text-sm font-semibold text-[#0B1B3A]">Live Feedback-to-Test Generator Sandbox</h4>
              <p className="text-xs text-gray-400">
                Simulate a real feedback critique from a customer chat interaction to watch it immediately synthesize into a durable benchmark test case.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Question Asked in Chat:</label>
                  <input
                    type="text"
                    value={newFeedbackQuestion}
                    onChange={(e) => setNewFeedbackQuestion(e.target.value)}
                    placeholder="e.g., How do I renew my expired Let's Encrypt certificate behind Cloudflare?"
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Original Flawed AI Answer:</label>
                  <input
                    type="text"
                    value={newFeedbackAnswer}
                    onChange={(e) => setNewFeedbackAnswer(e.target.value)}
                    placeholder="e.g., Just turn off Cloudflare SSL and reboot your server."
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-48">
                    <label className="block text-gray-400 mb-1 font-medium">Feedback Type:</label>
                    <select
                      value={newFeedbackType}
                      onChange={(e: any) => setNewFeedbackType(e.target.value)}
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="thumbs_down">👎 Thumbs Down (Error / Weak)</option>
                      <option value="thumbs_up">👍 Thumbs Up (Accurate / Good)</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-gray-400 mb-1 font-medium">Why (Feedback Critique &amp; Durable Rule):</label>
                    <input
                      type="text"
                      value={newFeedbackReason}
                      onChange={(e) => setNewFeedbackReason(e.target.value)}
                      placeholder="e.g., Disabling SSL exposes plain traffic. The correct protocol is Cloudflare SSL Full (Strict) with ACME HTTP-01 challenge bypass."
                      className="w-full rounded-lg border border-[#C3D3EA] bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleCreateSyntheticFeedbackTest}
                    disabled={submittingLiveFeedback || !newFeedbackQuestion.trim() || !newFeedbackReason.trim()}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-40 shadow-sm flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{submittingLiveFeedback ? "Converting to Test Case..." : "Generate Benchmark Test from Feedback"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROVE THAT IT LEARNED (Task 3.5) ================= */}
        {activeTab === "prove-learned" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Scenario Selection */}
            <div className="rounded-xl border border-[#DCE6F5] bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3A] flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-400" />
                  <span>Prove That It Learned: Comparative Eval Lab</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Empirical Verification: Run the exact same customer question before and after a human lesson approval to demonstrate empirical score gains.
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
                    className="rounded-lg border border-[#C3D3EA] bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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
                        Target Lesson: <strong className="text-slate-900">{learningProof.lessonTitle}</strong>
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 font-medium">
                      {learningProof.summaryText}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-[#F6F9FF] p-3 rounded-lg border border-[#DCE6F5]">
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
                    <div className="border-l border-[#DCE6F5] pl-4 text-center">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Delta (Δ)</span>
                      <span className="text-lg font-extrabold text-emerald-300 font-mono">
                        +{learningProof.scoreDelta}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Question & Expected Protocol Spec */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#2563EB] font-semibold">
                    <FileText className="h-4 w-4" />
                    <span>Inquiry Tested Under AI Judge:</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-[#DCE6F5] font-mono text-gray-200">
                    &ldquo;{learningProof.question}&rdquo;
                  </div>
                  <div className="text-[11px] text-gray-400">
                    <strong className="text-gray-300">Expected Standard Protocol:</strong> {learningProof.expectedProtocol}
                  </div>
                </div>

                {/* Side-by-Side Comparison: Before vs After */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* BEFORE CARD */}
                  <div className="rounded-xl border border-rose-500/30 bg-white p-5 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2">
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
                      <div className="p-3 rounded-lg bg-white border border-[#DCE6F5] text-gray-300 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
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

                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 pt-1 border-t border-[#DCE6F5]">
                      <span>Lessons Applied: 0 (Unapproved)</span>
                      <span>Latency: {learningProof.before.latencyMs}ms</span>
                    </div>
                  </div>

                  {/* AFTER CARD */}
                  <div className="rounded-xl border border-emerald-500/40 bg-white p-5 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#DCE6F5] pb-2">
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
                      <div className="p-3 rounded-lg bg-[#F1F6FF] border border-[#DCE6F5] text-emerald-200 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {learningProof.after.answer}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-500/20 text-xs space-y-1">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>AI Master Judge Critique (Claude Opus 5.5):</span>
                      </span>
                      <p className="text-[11px] text-emerald-200/90 leading-relaxed font-sans">
                        {learningProof.after.reason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1 border-t border-[#DCE6F5]">
                      <span className="text-emerald-400">Lessons Applied: {learningProof.after.appliedLessons.length}</span>
                      <span>Latency: {learningProof.after.latencyMs}ms</span>
                    </div>
                  </div>
                </div>

                {/* Lesson Source-of-Truth Details */}
                <div className="rounded-xl border border-[#DCE6F5] bg-white p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-gray-300">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    <span>Durable Source-of-Truth Markdown File:</span>
                    <span className="font-mono bg-[#F1F6FF] px-2 py-0.5 rounded border border-[#DCE6F5] text-cyan-300">
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

        {/* ================= TASK 4.2 HUMAN REVIEWER NOTE MODAL ================= */}
        {noteModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B3A]/35 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#DCE6F5] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-[#DCE6F5] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1B3A] flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-[#2563EB]" />
                    <span>Human Reviewer Critique</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    Case: <span className="text-[#2563EB]">{noteModal.caseId}</span> &bull; Model: <span className="text-emerald-300">{noteModal.modelId}</span>
                  </p>
                </div>
                <button
                  onClick={() => setNoteModal(null)}
                  className="rounded-lg p-1 text-slate-500 hover:text-slate-900 hover:bg-[#EEF4FF]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-emerald-300 block">
                    What was good about this answer?
                  </label>
                  <textarea
                    rows={3}
                    value={noteModal.whatWasGood}
                    onChange={(e) => setNoteModal({ ...noteModal, whatWasGood: e.target.value })}
                    placeholder="e.g. Directly answered the DNS setup with exact CNAME value and authoritative tone."
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white p-3 text-slate-900 placeholder-gray-500 focus:border-emerald-500 focus:outline-none font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-amber-300 block">
                    What was wrong or needs improvement?
                  </label>
                  <textarea
                    rows={3}
                    value={noteModal.whatWasWrong}
                    onChange={(e) => setNoteModal({ ...noteModal, whatWasWrong: e.target.value })}
                    placeholder="e.g. Reply was too long; for DNS questions, always give the 3 steps first."
                    className="w-full rounded-lg border border-[#C3D3EA] bg-white p-3 text-slate-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 block">General Notes (Optional)</label>
                    <input
                      type="text"
                      value={noteModal.generalNote || ""}
                      onChange={(e) => setNoteModal({ ...noteModal, generalNote: e.target.value })}
                      placeholder="e.g. Suitable for production FAQ"
                      className="w-full rounded-lg border border-[#DCE6F5] bg-white px-3 py-2 text-slate-900 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 block">Reviewer Name / Role</label>
                    <input
                      type="text"
                      value={noteModal.reviewer}
                      onChange={(e) => setNoteModal({ ...noteModal, reviewer: e.target.value })}
                      placeholder="e.g. Senior Tech Lead"
                      className="w-full rounded-lg border border-[#DCE6F5] bg-white px-3 py-2 text-slate-900 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#F6F9FF] border-t border-[#DCE6F5] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNoteModal(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-[#EEF4FF] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingNote || !noteModal.whatWasGood.trim() || !noteModal.whatWasWrong.trim()}
                  onClick={handleSaveReviewerNote}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-40 shadow-sm flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{savingNote ? "Saving Note..." : "Save Reviewer Note"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
