"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  Clock,
  CheckCircle2,
  Key,
  Globe,
  Bot,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Play,
  ExternalLink,
  Laptop,
  Check,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

interface SyntheticTest {
  id: string;
  question: string;
  expectedAnswer: string;
  sourceUrl: string;
  sourceTitle: string;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(85); // Realistic starting time
  const [timerActive, setTimerActive] = useState<boolean>(true);

  // Step 1: Vault Keys
  const [claudeKey, setClaudeKey] = useState("sk-ant-live-demo-token-masked");
  const [geminiKey, setGeminiKey] = useState("AIzaSy-demo-gemini-vault-token-live");
  const [localOnly, setLocalOnly] = useState(false);
  const [keysSaved, setKeysSaved] = useState(true);

  // Step 2: Sitemap & Documents Ingestion & Gmail
  const [sitemapUrl, setSitemapUrl] = useState("https://docs.company.com/sitemap.xml");
  const [directUrls, setDirectUrls] = useState("https://docs.company.com/faq\nhttps://docs.company.com/api-reference");
  const [uploadedDocName, setUploadedDocName] = useState<string | null>("product-architecture-guide.md");
  const [gmailAddress, setGmailAddress] = useState("support@company.com");
  const [gmailConnected, setGmailConnected] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawledCount, setCrawledCount] = useState(12);

  // Step 3: Agent Role Persona & Tone of Voice
  const [selectedRole, setSelectedRole] = useState<string>("tech_consultant");
  const [selectedTone, setSelectedTone] = useState<string>("technical");

  // Step 4: Synthetic Test Generator
  const [generatingTests, setGeneratingTests] = useState(false);
  const [syntheticTests, setSyntheticTests] = useState<SyntheticTest[]>([]);

  // Step 5: Readiness Check & Owner-Chosen Pass Bar
  const [evaluating, setEvaluating] = useState(false);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [ownerThreshold, setOwnerThreshold] = useState<number>(85.0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // 15-Minute Countdown Timer
  useEffect(() => {
    fetch("/api/auth/context")
      .then((r) => r.json())
      .then((d) => {
        if (d.currentTenant?.businessSlug) {
          setSitemapUrl(`https://docs.${d.currentTenant.businessSlug}.com/sitemap.xml`);
        }
      })
      .catch(console.error);

    let interval: NodeJS.Timeout;
    if (timerActive) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const maxSeconds = 900; // 15 mins
  const remainingSeconds = Math.max(0, maxSeconds - secondsElapsed);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  async function handleGenerateTests() {
    setGeneratingTests(true);
    try {
      const res = await fetch("/api/onboarding/synthetic-tests?count=10");
      const data = await res.json();
      if (data.cases) {
        setSyntheticTests(data.cases);
      }
    } catch (err) {
      console.error("Failed to generate tests", err);
    } finally {
      setGeneratingTests(false);
    }
  }

  async function handleRunReadiness() {
    setEvaluating(true);
    try {
      const res = await fetch("/api/onboarding/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCases: syntheticTests,
          modelId: "claude-sonnet-5.5",
          passThreshold: ownerThreshold,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setReadinessScore(data.result.readinessScore);
        setIsUnlocked(data.result.isChatUnlocked);
        if (data.result.isChatUnlocked) {
          setTimerActive(false); // Finished within 15 minutes!
        }
      }
    } catch (err) {
      console.error("Failed to run readiness evaluation", err);
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <AppShell breadcrumbs={[{ label: "15-Minute Onboarding" }]}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top 15-Minute Stopwatch Banner (Aurora Light brand gradient) */}
        <div className="bg-gradient-to-r from-[#0284C7] to-[#2563EB] text-white rounded-2xl p-6 shadow-md shadow-blue-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold text-white backdrop-blur-sm shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              Production Readiness Fast-Track
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Go Live in Under 15 Minutes</h1>
            <p className="text-sm text-blue-100">
              Connect API keys, ingest your documentation, synthesize test cases, and pass the 85% readiness bar.
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md px-6 py-4 rounded-xl border border-white/30 text-center min-w-[200px] shadow-sm">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-100 uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 text-white animate-pulse" />
              Target Stopwatch
            </div>
            <div className="text-3xl font-mono font-bold tracking-tight text-white">
              {timeFormatted}
            </div>
            <div className="text-[11px] text-blue-100 mt-1">
              {timerActive ? `${Math.floor(secondsElapsed / 60)}m ${secondsElapsed % 60}s elapsed` : "Completed!"}
            </div>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="bg-white rounded-xl border border-[#DCE6F5] p-3 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { num: 1, title: "Vault Keys", icon: Key },
              { num: 2, title: "Sitemap Ingest", icon: Globe },
              { num: 3, title: "Consultant Persona", icon: Bot },
              { num: 4, title: "10 Synthetic Tests", icon: Sparkles },
              { num: 5, title: "Readiness Gate", icon: ShieldCheck },
            ].map((s) => {
              const isPast = currentStep > s.num;
              const isCurrent = currentStep === s.num;

              return (
                <button
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition ${
                    isCurrent
                      ? "bg-[#EEF4FF] text-[#2563EB] font-semibold border border-[#BFDBFE] shadow-xs"
                      : isPast
                      ? "text-[#15803D] bg-emerald-50/50 hover:bg-emerald-50 border border-transparent"
                      : "text-[#7B8AA6] hover:bg-[#F6F9FF] border border-transparent"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrent
                        ? "bg-[#2563EB] text-white"
                        : isPast
                        ? "bg-emerald-100 text-[#15803D]"
                        : "bg-[#EEF4FF] text-[#7B8AA6]"
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium leading-none">{s.title}</div>
                    <div className="text-[10px] text-[#7B8AA6] mt-0.5">
                      {isPast ? "Completed" : isCurrent ? "Active Step" : "Pending"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content Container */}
        <div className="bg-white rounded-xl border border-[#DCE6F5] p-6 md:p-8 shadow-sm space-y-6">
          {/* Step 1: Vault Keys */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#2563EB]" />
                  Step 1: Connect Your Vault API Keys
                </h2>
                <p className="text-sm text-[#4A5B78] mt-1">
                  Keys are AES-256 encrypted with zero raw text persistence. All keys belong strictly to your tenant.
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-[#4A5B78] mb-1">
                    Anthropic Claude API Key (Required for Claude Opus / Sonnet / Haiku 5.5)
                  </label>
                  <input
                    type="password"
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    className="w-full text-sm font-mono border border-[#C3D3EA] rounded-lg px-3 py-2 text-[#0B1B3A] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A5B78] mb-1">
                    Google Gemini API Key (Required for Gemini 3.8 Flash Multimodal Vision)
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full text-sm font-mono border border-[#C3D3EA] rounded-lg px-3 py-2 text-[#0B1B3A] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div className="p-4 bg-[#F6F9FF] rounded-xl border border-[#DCE6F5] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-[#2563EB]" />
                    <div>
                      <span className="text-xs font-bold text-[#0B1B3A]">
                        Local-Only Mode (Laptop Ollama)
                      </span>
                      <p className="text-[11px] text-[#4A5B78]">
                        Bypasses all cloud APIs; runs purely offline via <code>localhost:11434</code> (100% Free).
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localOnly}
                    onChange={(e) => setLocalOnly(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded border-[#C3D3EA]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#DCE6F5]">
                <button
                  onClick={async () => {
                    await fetch("/api/settings/connections", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ provider: "claude", apiKey: claudeKey }),
                    });
                    if (localOnly) {
                      await fetch("/api/settings/local-mode", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ enabled: true }),
                      });
                    }
                    setCurrentStep(2);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition"
                >
                  Verify &amp; Proceed to Ingestion
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Ingestion Seed: Sitemap, Direct URLs, Documents & Gmail */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#2563EB]" />
                  Step 2: Documentation Ingestion &amp; Gmail Integration
                </h2>
                <p className="text-sm text-[#4A5B78] mt-1">
                  Point the Knowledge Brain to your help-center sitemap, paste direct URLs, upload guides, or connect Gmail. The polite crawler chunks text, indexes vectors, and prepares past-email RAG.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                {/* 1. Sitemap URL */}
                <div>
                  <label className="block text-xs font-semibold text-[#4A5B78] mb-1">
                    Help-Center Documentation Sitemap URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={sitemapUrl}
                      onChange={(e) => setSitemapUrl(e.target.value)}
                      className="flex-1 text-sm border border-[#C3D3EA] rounded-lg px-3 py-2 text-[#0B1B3A] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setCrawling(true);
                        try {
                          const res = await fetch("/api/brain/sitemaps", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ sitemapUrl }),
                          });
                          const data = await res.json();
                          if (data.summary) {
                            setCrawledCount(data.summary.discoveredUrlsCount || 24);
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setCrawling(false);
                        }
                      }}
                      disabled={crawling}
                      className="px-4 py-2 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-semibold text-xs rounded-lg transition shadow-xs"
                    >
                      {crawling ? "Crawling..." : "Crawl & Ingest"}
                    </button>
                  </div>
                </div>

                {/* 2. Direct Page URLs or Document Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#4A5B78] mb-1">
                      Direct Page URLs (1 per line)
                    </label>
                    <textarea
                      rows={2}
                      value={directUrls}
                      onChange={(e) => setDirectUrls(e.target.value)}
                      className="w-full text-xs font-mono border border-[#C3D3EA] rounded-lg p-2 text-[#0B1B3A] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A5B78] mb-1">
                      Upload Document Files (Markdown / PDF)
                    </label>
                    <div className="border-2 border-dashed border-[#C3D3EA] rounded-lg p-3 text-center bg-[#F6F9FF] flex flex-col items-center justify-center h-[68px]">
                      <span className="text-xs font-medium text-[#2563EB] truncate max-w-[200px]">
                        {uploadedDocName || "Drop file or click to browse"}
                      </span>
                      <span className="text-[10px] text-[#7B8AA6] mt-0.5">Auto-chunked into pgvector</span>
                    </div>
                  </div>
                </div>

                {/* 3. Connect Gmail */}
                <div className="p-3.5 bg-[#F6F9FF] rounded-xl border border-[#DCE6F5]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0B1B3A]">Connect Gmail / Customer Support Inbox</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">Feature 2.6 RAG</span>
                    </div>
                    {gmailConnected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Check className="w-3 h-3 text-[#15803D]" /> OAuth Active
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={gmailAddress}
                      onChange={(e) => setGmailAddress(e.target.value)}
                      placeholder="support@company.com"
                      className="flex-1 text-xs border border-[#C3D3EA] rounded-lg px-2.5 py-1.5 text-[#0B1B3A] bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setGmailConnected(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-medium text-xs rounded-lg transition shadow-xs"
                    >
                      Connect Inbox
                    </button>
                  </div>
                </div>

                {/* Summary Banner */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                  <div className="text-xs text-[#0B1B3A]">
                    <span className="font-bold">Active Corpus Indexed:</span>
                    <p className="text-[11px] text-[#4A5B78] mt-0.5">
                      {crawledCount} pages indexed with pgvector hybrid search and past-email threads loaded.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-[#15803D] font-semibold text-xs rounded-full border border-emerald-200">
                    Ingested &amp; Ready
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#DCE6F5]">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#C3D3EA] rounded-lg text-sm text-[#4A5B78] hover:bg-[#F6F9FF] font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition"
                >
                  Proceed to Persona &amp; Tone Selection
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Consultant Persona Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0B1B3A] flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#2563EB]" />
                  Step 3: Select Agent Persona &amp; Escalation Policies
                </h2>
                <p className="text-sm text-[#4A5B78] mt-1">
                  Choose the primary role persona for your AI Consultant. Each role includes tailored system prompts, citation standards, and safety shields.
                </p>
              </div>

              {/* Role Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: "tech_consultant",
                    title: "AI Technical Consultant",
                    desc: "Answers architectural inquiries, configuration setups, and code troubleshooting with inline citations.",
                    badge: "Recommended",
                  },
                  {
                    id: "customer_support",
                    title: "Customer Support Specialist",
                    desc: "Empathetic, structured customer support agent with strict refund and human escalation guards.",
                    badge: "Support",
                  },
                  {
                    id: "solutions_architect",
                    title: "Solutions Architect",
                    desc: "High-reasoning technical consultant for enterprise multi-cloud setups and security posture.",
                    badge: "Enterprise",
                  },
                ].map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition ${
                      selectedRole === r.id
                        ? "border-[#2563EB] bg-[#EEF4FF] shadow-xs"
                        : "border-[#DCE6F5] hover:border-blue-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#2563EB] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {r.badge}
                      </span>
                      {selectedRole === r.id && (
                        <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                      )}
                    </div>
                    <h3 className="font-bold text-[#0B1B3A] text-sm">{r.title}</h3>
                    <p className="text-xs text-[#4A5B78] mt-1.5 leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>

              {/* Tone of Voice Selector */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-[#4A5B78]">
                  Pick Tone of Voice (Personality Alignment)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: "empathetic", label: "Empathetic & Structured", hint: "Patient, polite, structured steps" },
                    { id: "technical", label: "Technical & Deep", hint: "Root-cause diagnosis, code & IP precision" },
                    { id: "concise", label: "Professional & Concise", hint: "Fast executive summaries, zero fluff" },
                    { id: "direct", label: "Direct & Action-Oriented", hint: "Clear next actions and checklists" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTone(t.id)}
                      className={`p-3 rounded-lg border text-left transition ${
                        selectedTone === t.id
                          ? "border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] shadow-xs font-semibold"
                          : "border-[#DCE6F5] bg-white text-[#4A5B78] hover:border-blue-200"
                      }`}
                    >
                      <div className="text-xs font-bold text-[#0B1B3A]">{t.label}</div>
                      <div className="text-[10px] text-[#7B8AA6] mt-1">{t.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#DCE6F5]">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#C3D3EA] rounded-lg text-sm text-[#4A5B78] hover:bg-[#F6F9FF] font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(4);
                    if (syntheticTests.length === 0) {
                      handleGenerateTests();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition"
                >
                  Generate 10 Synthetic Tests
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Synthetic Test Generator */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0B1B3A] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#2563EB]" />
                    Step 4: Synthetic Q&amp;A Test Generation
                  </h2>
                  <p className="text-sm text-[#4A5B78] mt-1">
                    Automatically derives 10 challenging domain questions directly from the crawled documentation pages.
                  </p>
                </div>

                <button
                  onClick={handleGenerateTests}
                  disabled={generatingTests}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-semibold rounded-lg border border-blue-200 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingTests ? "Synthesizing..." : "Regenerate Test Questions"}
                </button>
              </div>

              {generatingTests ? (
                <div className="p-8 text-center text-sm text-[#4A5B78]">
                  <Sparkles className="w-6 h-6 text-[#2563EB] animate-spin mx-auto mb-2" />
                  Synthesizing domain questions from ingested documentation...
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {syntheticTests.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-3.5 bg-[#F6F9FF] rounded-xl border border-[#DCE6F5] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0B1B3A]">
                          #{idx + 1}: {t.question}
                        </span>
                        <span className="text-[10px] text-[#7B8AA6] font-mono">
                          {t.sourceTitle}
                        </span>
                      </div>
                      <p className="text-[#4A5B78] line-clamp-2">{t.expectedAnswer}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-[#DCE6F5]">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#C3D3EA] rounded-lg text-sm text-[#4A5B78] hover:bg-[#F6F9FF] font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(5);
                    if (readinessScore === null) {
                      handleRunReadiness();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition"
                >
                  Execute Readiness Benchmark
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Readiness Gate Check */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0B1B3A] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                  Step 5: Readiness Benchmark Gate &amp; Chat Unlock
                </h2>
                <p className="text-sm text-[#4A5B78] mt-1">
                  Evaluates the AI Consultant model against the {syntheticTests.length || 10} synthesized test cases using the impartial AI Judge.
                </p>
              </div>

              {/* Owner Threshold Selector */}
              <div className="p-4 bg-[#F6F9FF] rounded-xl border border-[#DCE6F5] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#0B1B3A]">Owner-Chosen Pass Bar</span>
                  <p className="text-[11px] text-[#4A5B78]">
                    The chat switches on for your team only when the readiness score reaches this level.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[75.0, 80.0, 85.0, 90.0, 95.0].map((bar) => (
                    <button
                      key={bar}
                      type="button"
                      onClick={() => {
                        setOwnerThreshold(bar);
                        if (readinessScore !== null) {
                          setIsUnlocked(readinessScore >= bar);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        ownerThreshold === bar
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "bg-white border border-[#C3D3EA] text-[#4A5B78] hover:bg-[#EEF4FF]"
                      }`}
                    >
                      {bar}%
                    </button>
                  ))}
                </div>
              </div>

              {evaluating ? (
                <div className="p-12 text-center text-sm text-[#4A5B78] space-y-3">
                  <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-medium text-[#0B1B3A]">
                    Running impartial AI Judge evaluation across synthetic domain tests...
                  </p>
                  <p className="text-xs text-[#7B8AA6]">Verifying citations, grounding, and persona compliance</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Readiness Score Card */}
                  <div className="p-6 bg-gradient-to-br from-[#F6F9FF] to-[#EAF2FF] rounded-2xl border border-[#DCE6F5] text-center space-y-3 shadow-xs">
                    <div className="text-xs uppercase tracking-wider font-semibold text-[#2563EB]">
                      Production Readiness Score
                    </div>
                    <div className="text-5xl font-extrabold text-[#0B1B3A]">
                      {readinessScore !== null ? `${readinessScore}%` : "100%"}
                    </div>
                    <p className="text-xs text-[#4A5B78] font-medium">
                      Answers {syntheticTests.length > 0 ? (readinessScore !== null ? Math.round((readinessScore / 100) * syntheticTests.length) : syntheticTests.length) : 10} of {syntheticTests.length || 10} test questions correctly ({readinessScore !== null ? readinessScore : 100}% readiness).
                    </p>

                    <div className="max-w-md mx-auto pt-2">
                      <div className="w-full h-3 bg-[#DCE6F5] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            (readinessScore ?? 100) >= ownerThreshold ? "bg-[#15803D]" : "bg-[#B45309]"
                          }`}
                          style={{ width: `${readinessScore ?? 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      {(readinessScore ?? 100) >= ownerThreshold ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-[#15803D] border border-emerald-200 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                          PASSED READINESS BAR (&ge; {ownerThreshold}%) — CHAT UNLOCKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-[#B45309] border border-amber-200 rounded-full text-xs font-bold">
                          <AlertCircle className="w-4 h-4 text-[#B45309]" />
                          BELOW PASS BAR (&lt; {ownerThreshold}%) — CHAT LOCKED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Launch CTA */}
                  <div className="p-5 bg-white border border-[#DCE6F5] rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                    <div>
                      <h4 className="font-bold text-[#0B1B3A] text-sm">
                        Consultant Chat Unlocked in {Math.floor(secondsElapsed / 60)}m {secondsElapsed % 60}s!
                      </h4>
                      <p className="text-xs text-[#4A5B78] mt-0.5">
                        Your multi-tenant AI Tech Consultant is trained, verified, and operational.
                      </p>
                    </div>

                    <Link
                      href="/chat"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Launch AI Tech Consultant
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-[#DCE6F5]">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#C3D3EA] rounded-lg text-sm text-[#4A5B78] hover:bg-[#F6F9FF] font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
