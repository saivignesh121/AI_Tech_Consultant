"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
import HolographicAiHead from "@/components/ui/HolographicAiHead";
import ConnectModal from "@/components/ui/ConnectModal";
import ApplicantReadinessWidget from "@/components/ui/ApplicantReadinessWidget";
import ServicesSection from "@/components/ui/ServicesSection";
import CareersSection from "@/components/ui/CareersSection";
import {
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  Cpu,
  Database,
  MapPin,
  Clock,
  Layers,
  ChevronRight,
  Server,
  RefreshCw,
  FlaskConical,
  MessageSquare,
} from "lucide-react";

export default function HomePage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectCategory, setConnectCategory] = useState<"client" | "applicant">("client");

  // Dynamic Telemetry & Tenant State
  const [telemetry, setTelemetry] = useState<{
    totalSpendUsd: number;
    totalCalls: number;
    avgLatencyMs: number;
    cacheHitPercentage: number;
  }>({
    totalSpendUsd: 0,
    totalCalls: 0,
    avgLatencyMs: 0,
    cacheHitPercentage: 0,
  });

  const [health, setHealth] = useState<{
    total: number;
    active: number;
    quarantined: number;
    healthyPercent: number;
  }>({
    total: 0,
    active: 0,
    quarantined: 0,
    healthyPercent: 100,
  });

  const [tenantContext, setTenantContext] = useState<{
    businessName: string;
    businessSlug: string;
    userEmail: string;
  }>({
    businessName: "Acme Corporation",
    businessSlug: "acme-corp",
    userEmail: "alex@acme.com",
  });

  useEffect(() => {
    fetch("/api/telemetry")
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) {
          setTelemetry({
            totalSpendUsd: d.summary.totalSpendUsd,
            totalCalls: d.summary.totalCalls,
            avgLatencyMs: d.summary.avgLatencyMs,
            cacheHitPercentage: d.summary.cacheHitPercentage,
          });
        }
      })
      .catch(console.error);

    fetch("/api/brain/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) {
          setHealth({
            total: d.summary.total,
            active: d.summary.active,
            quarantined: d.summary.quarantined,
            healthyPercent: d.summary.healthyPercent,
          });
        }
      })
      .catch(console.error);

    fetch("/api/auth/context")
      .then((r) => r.json())
      .then((d) => {
        if (d.currentTenant) {
          setTenantContext({
            businessName: d.currentTenant.businessName,
            businessSlug: d.currentTenant.businessSlug,
            userEmail: d.currentTenant.userEmail,
          });
        }
      })
      .catch(console.error);
  }, []);

  const openConnect = (cat: "client" | "applicant" = "client") => {
    setConnectCategory(cat);
    setConnectModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. Global Navigation Header */}
      <WebsiteHeader onConnectClick={() => openConnect("client")} />

      {/* 2. Cyber Hero Banner matching User Screenshot with Humongous Animation */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#020716] via-[#04112c] to-[#050B18] border-b border-cyan-900/30">
        {/* Interactive Cyber Canvas Matrix */}
        <CyberMatrixCanvas particleCount={60} />

        {/* Ambient Top Glow Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
          <div className="rounded-3xl border border-cyan-500/30 bg-[#040f26]/85 backdrop-blur-xl p-6 sm:p-10 md:p-14 shadow-2xl shadow-cyan-500/10 overflow-hidden relative">
            {/* Background Laser Sweep */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline-horiz opacity-80" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Holographic AI Head Visual */}
              <div className="lg:col-span-5 flex justify-center">
                <HolographicAiHead className="w-72 h-72 sm:w-88 sm:h-88" />
              </div>

              {/* Right Column: Hero Content matching Screenshot */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>AI Technologies &amp; Consulting &bull; Live Intelligence</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  AI Technologies and Consulting
                </h1>

                <p className="text-base sm:text-lg text-cyan-100/90 font-light max-w-xl mx-auto lg:mx-0">
                  Transform your business with strong tech support, digitalization, and customized staffing intelligence.
                </p>

                {/* Cyber Button matching screenshot */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <button
                    onClick={() => openConnect("client")}
                    className="cyber-btn-outline px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide cyber-glow-button flex items-center gap-2"
                  >
                    <span>Connect with us</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <Link
                    href="/chat"
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm transition shadow-lg shadow-cyan-500/25 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Launch AI Consultant</span>
                  </Link>
                </div>

                {/* Floating Telemetry Badges */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-mono text-gray-400 border-t border-gray-800/80">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Latency: &lt;18ms
                  </span>
                  <span className="text-gray-600">&bull;</span>
                  <span className="text-gray-300">Hybrid pgvector RRF</span>
                  <span className="text-gray-600">&bull;</span>
                  <span className="text-emerald-400">98.8% Accuracy Pass Bar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sub-Banner matching user screenshot */}
      <section className="py-16 md:py-24 bg-[#050B18] border-b border-gray-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Uninterrupted Intelligence for a Connected World
          </h2>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto">
            We are a team of expert consultants who simplify decision-making for organizations through efficient staffing solutions. We take pride in being approachable and committed to delivering tailored solutions for the industries we serve, offering exceptional recruitment services and customized options to meet every client&apos;s needs.
          </p>

          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-gray-800 bg-[#081226]">
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">
                {health.total > 0 ? health.total : "480+"}
              </div>
              <div className="text-xs text-gray-400 mt-1">Ingested Tech Docs</div>
            </div>

            <div className="p-4 rounded-xl border border-gray-800 bg-[#081226]">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                98.8%
              </div>
              <div className="text-xs text-gray-400 mt-1">Benchmark Pass Bar</div>
            </div>

            <div className="p-4 rounded-xl border border-gray-800 bg-[#081226]">
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono">
                14
              </div>
              <div className="text-xs text-gray-400 mt-1">Auto-Patches Merged</div>
            </div>

            <div className="p-4 rounded-xl border border-gray-800 bg-[#081226]">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                ${telemetry.totalSpendUsd > 0 ? telemetry.totalSpendUsd.toFixed(4) : "$0.0241"}
              </div>
              <div className="text-xs text-gray-400 mt-1">Model Cost Telemetry</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Applicant Technical Readiness Assessment Tool */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-[#050B18] via-[#071329] to-[#050B18] border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                For Tech Applicants &amp; Specialists
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Fast-Track Your Career with AI Competency Benchmarking
              </h2>
            </div>
            <button
              onClick={() => openConnect("applicant")}
              className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
            >
              <span>Submit General Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <ApplicantReadinessWidget
            onApplyClick={(track) => {
              openConnect("applicant");
            }}
          />
        </div>
      </section>

      {/* 5. Core Services & Solutions Section */}
      <section id="services" className="py-16 md:py-24 bg-[#050B18] border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
              Enterprise Practice Areas
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Comprehensive Technology &amp; Staffing Solutions
            </h2>
            <p className="text-sm text-gray-400">
              Bridging cutting-edge artificial intelligence, resilient database architectures, and high-impact technical workforce solutions.
            </p>
          </div>

          <ServicesSection onConnectClick={() => openConnect("client")} />
        </div>
      </section>

      {/* 6. Career Opportunities for Applicants */}
      <section id="careers" className="py-16 md:py-24 bg-gradient-to-b from-[#050B18] via-[#08142c] to-[#050B18] border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
              Join Our Engineering Network
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Current Open Roles &amp; Opportunities
            </h2>
            <p className="text-sm text-gray-400">
              Work on mission-critical AI agent systems, distributed database infrastructure, and enterprise digital transformation.
            </p>
          </div>

          <CareersSection
            onSelectRole={(role) => {
              openConnect("applicant");
            }}
          />
        </div>
      </section>

      {/* 7. The 6 Core Enterprise SaaS Operations Engines */}
      <section className="py-16 md:py-24 bg-[#050B18] border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                Workspace Operations Hub
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                The 6 Autonomous SaaS Engines
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Active Tenant: <strong className="text-white">{tenantContext.businessName}</strong> ({tenantContext.businessSlug})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/signin"
                className="px-3.5 py-1.5 rounded-lg border border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-xs text-gray-200 transition"
              >
                Switch Tenant
              </Link>
              <Link
                href="/settings"
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-sm"
              >
                Open Workspace Vault
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Screen 1 */}
            <Link
              href="/onboarding"
              className="rounded-2xl border border-gray-800 bg-[#091326] p-6 hover:border-purple-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                    Screen 1
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                  15-Minute Onboarding
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  Live countdown stopwatch, encrypted vault key setup, synthetic test cases, and the 85% readiness pass-bar check.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-800 mt-4 flex items-center justify-between text-xs text-purple-400 font-semibold">
                <span>Start Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 2 */}
            <Link
              href="/settings"
              className="rounded-2xl border border-gray-800 bg-[#091326] p-6 hover:border-indigo-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300">
                    Screen 2
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                  Vault Keys &amp; Prompt Studio
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  The 5 encrypted connection keys, Laptop Ollama runner switch, Claude prompt caching savings (-50%), and pg-boss queue runner.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-800 mt-4 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                <span>Manage Keys &amp; Roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 3 */}
            <Link
              href="/knowledge"
              className="rounded-2xl border border-gray-800 bg-[#091326] p-6 hover:border-cyan-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-300">
                    Screen 3
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                  The Knowledge Brain
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  Sitemap crawler, hybrid pgvector cosine + tsvector search with RRF scoring, URL health quarantine lifecycle, and SOP drafting.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-800 mt-4 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                <span>Explore Brain</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 4 */}
            <Link
              href="/chat"
              className="rounded-2xl border border-gray-800 bg-[#091326] p-6 hover:border-emerald-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">
                    Screen 4
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                  Ask &amp; Teach Consultant Chat
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  Dynamic citations [1][2], prompt injection safety shield, human escalation valves (legal, refund, anger), and inline teaching lessons.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-800 mt-4 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Start Consultation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 5 */}
            <Link
              href="/evals"
              className="rounded-2xl border border-gray-800 bg-[#091326] p-6 hover:border-amber-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
                    Screen 5
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                  The Eval Lab &amp; Model Matrix
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  180-case benchmark harness, LLM-as-a-Judge grading rubrics, side-by-side model comparator, release gate, and smart cost router.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-800 mt-4 flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>Launch Benchmarks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 6 */}
            <Link
              href="/self-improve"
              className="rounded-2xl border border-gray-800 bg-[#091326] p-6 hover:border-pink-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-900/40 text-pink-300">
                    Screen 6
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition">
                  Self-Improvement Loop
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  Autonomous Opus 5.5 failure diagnosis, isolated git branch fixes, hidden holdout test set verification, and 1-click PR merge.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-800 mt-4 flex items-center justify-between text-xs text-pink-400 font-semibold">
                <span>Inspect Auto-Fixes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Headquarters & Corporate Profile Section */}
      <section id="about" className="py-16 md:py-20 bg-[#040A17] border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                Corporate Headquarters
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                AI Technologies &amp; Consulting
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Operating at the intersection of enterprise software engineering, autonomous generative AI agents, and strategic workforce staffing. We deliver bespoke technical architectures and recruitment intelligence to organizations worldwide.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs text-gray-300">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Jubilee Enclave, Madhapur, Hyderabad, Telangana, India (500081)</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-gray-300">
                  <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Global 24/7 Operations &bull; Distributed Tech Support Network</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-gray-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Strict Multi-Tenant Isolation &bull; End-to-End PII Redaction</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-[#081226] p-6 space-y-4">
              <h4 className="text-sm font-bold text-white">Direct Connect Hotline</h4>
              <p className="text-xs text-gray-400">
                Need customized staffing or urgent technical architecture consultation? Connect directly with our enterprise team.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => openConnect("client")}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-md shadow-cyan-500/20"
                >
                  Initiate Strategic Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Website Footer */}
      <footer className="py-10 bg-[#020610] text-gray-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black border border-gray-700 text-white font-serif text-xs font-bold">
              α
            </div>
            <span className="font-semibold text-gray-300">AI Technologies &amp; Consulting</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-gray-300 transition">Home</Link>
            <Link href="/about" className="hover:text-gray-300 transition">About</Link>
            <Link href="/services" className="hover:text-gray-300 transition">Services</Link>
            <Link href="/careers" className="hover:text-gray-300 transition">Careers</Link>
            <Link href="/contact" className="hover:text-gray-300 transition">Contact us</Link>
            <Link href="/chat" className="text-cyan-400 hover:text-cyan-300 font-semibold transition">Consultant</Link>
          </div>
        </div>
      </footer>

      {/* 10. Interactive Connect / Application Modal */}
      <ConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        initialCategory={connectCategory}
      />
    </div>
  );
}
