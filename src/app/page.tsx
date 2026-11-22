"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
import HolographicAiHead from "@/components/ui/HolographicAiHead";
import ConnectModal from "@/components/ui/ConnectModal";
import ServicesSection from "@/components/ui/ServicesSection";
import {
  Brain,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronRight,
  Server,
  RefreshCw,
  FlaskConical,
  MessageSquare,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    userEmail: "",
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
        if (d.currentTenant && d.currentTenant.userEmail) {
          setIsAuthenticated(true);
          setTenantContext({
            businessName: d.currentTenant.businessName,
            businessSlug: d.currentTenant.businessSlug,
            userEmail: d.currentTenant.userEmail,
          });
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Global Navigation Header */}
      <WebsiteHeader onConnectClick={() => setConnectModalOpen(true)} />

      {/* 2. Flagship Hero Banner: Royal Blue to Violet/Purple Gradient (ProteusVision Theme) */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white">
        {/* Subtle Cyber Waves & Matrix Particles Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <CyberMatrixCanvas particleCount={40} />
        </div>

        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-blue-400/25 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-28 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">
            {/* Left Column: Circular Emblem Badge & Brand Tagline (from Screenshot 1) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center text-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white shadow-2xl flex items-center justify-center p-6 border-4 border-white/20 transform hover:scale-105 transition-all duration-300">
                <div className="relative flex items-center justify-center">
                  {/* Tech Green Checkmark */}
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    className="w-24 h-24 sm:w-28 sm:h-28 stroke-emerald-500 stroke-[10] stroke-linecap-round stroke-linejoin-round drop-shadow-sm"
                  >
                    <path d="M26 52 L44 70 L76 30" />
                  </svg>
                  {/* Tech Sparkle Nodes */}
                  <div className="absolute top-1 left-2 h-3.5 w-3.5 rounded-full bg-pink-500 shadow-sm animate-ping" />
                  <div className="absolute top-1 left-2 h-3.5 w-3.5 rounded-full bg-pink-500" />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  ProteusVision.com
                </h3>
                <p className="text-xs sm:text-sm font-medium text-purple-200 tracking-wider mt-1">
                  Simple . Smart . Intelligent
                </p>
              </div>
            </div>

            {/* Right Column: Hero Headline & Action Buttons (from Screenshot 1) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div>
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-blue-100 tracking-tight block">
                  Why Spend Hours?
                </span>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mt-2">
                  leverage AI in your Enterprise
                </h1>
              </div>

              <p className="text-base sm:text-lg text-purple-100 font-normal max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Transform your business with strong tech support, continuous learning, and multi-tenant autonomous intelligence.
              </p>

              {/* Action Buttons: Outlined Pill Button + Solid White Pill Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => setConnectModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full border-2 border-white text-white font-semibold text-sm sm:text-base hover:bg-white hover:text-[#1D4ED8] transition-all duration-200 shadow-lg inline-flex items-center justify-center gap-2"
                >
                  <span>Learn how AI can transform your business</span>
                </button>

                <Link
                  href={isAuthenticated ? "/chat" : "/signup?redirect=/chat"}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-blue-50 text-[#1D4ED8] font-bold text-sm sm:text-base transition-all duration-200 shadow-lg inline-flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                  <span>Launch AI Consultant</span>
                </Link>
              </div>

              {/* Registration / Login helper text */}
              {!isAuthenticated && (
                <p className="text-xs text-purple-200 pt-1">
                  New enterprise?{" "}
                  <Link href="/signup?redirect=/chat" className="text-white underline font-semibold hover:text-purple-100">
                    Register Workspace
                  </Link>{" "}
                  &bull; Already registered?{" "}
                  <Link href="/signin?redirect=/chat" className="text-white underline font-semibold hover:text-purple-100">
                    Sign In &rarr;
                  </Link>
                </p>
              )}

              {/* Stats Strip with Small Pills and Blue/Green Dots */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-mono border-t border-white/20">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xs text-white">
                  <span className="w-2 h-2 rounded-full bg-cyan-300" />
                  Latency: &lt;18ms
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xs text-white">
                  <span className="w-2 h-2 rounded-full bg-blue-300" />
                  Hybrid pgvector RRF
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 backdrop-blur-md border border-emerald-300/40 shadow-xs text-emerald-200 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  98.8% Accuracy Pass Bar
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2B. The 3 Pastel Tinted Product Cards (Exact Format from Example Screenshot 1) */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Card 1: Mint / Soft Cyan Tint */}
          <div className="bg-[#E6F8F9] border-2 border-[#BCECEF] rounded-3xl p-8 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>twasta.ai by PROTEUS</span>
              </div>
              <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-4 mb-3">
                twasta.ai
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">
                Empower your organization with AI that understands your data, automates complex workflows, and builds intelligent software faster. Our enterprise AI models help you drive efficiency, innovation, and measurable growth.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/knowledge"
                className="inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow-sm transition"
              >
                Know More
              </Link>
            </div>
          </div>

          {/* Card 2: Soft Ice Blue Tint */}
          <div className="bg-[#EEF5FD] border-2 border-[#D0E2FB] rounded-3xl p-8 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                <Brain className="w-4 h-4 text-blue-600" />
                <span>VISION by PROTEUS</span>
              </div>
              <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-4 mb-3">
                ERP
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">
                Cloud ERP scales with your business, adapting to growth with automation, real-time insights, and flexible workflows ensuring efficiency and seamless expansion.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/settings/roles-prompts"
                className="inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow-sm transition"
              >
                Know More
              </Link>
            </div>
          </div>

          {/* Card 3: Warm Peach / Soft Cream Tint */}
          <div className="bg-[#FFF4E8] border-2 border-[#FFE2C2] rounded-3xl p-8 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>VISION by PROTEUS</span>
              </div>
              <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-4 mb-3">
                SFA &amp; CRM
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">
                AI-based reporting, E-Detailing, Expense management, surveys and feedback, Learning tools, Sample management, and very comprehensive analytics.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow-sm transition"
              >
                Know More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sub-Banner matching user screenshot */}
      <section className="py-16 md:py-24 bg-white border-b border-[#DCE6F5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B1B3A] tracking-tight">
            Uninterrupted Intelligence for a Connected World
          </h2>
          <p className="text-base sm:text-lg text-[#4A5B78] leading-relaxed max-w-3xl mx-auto">
            We are a team of expert consultants who simplify decision-making for organizations through efficient staffing solutions. We take pride in being approachable and committed to delivering tailored solutions for the industries we serve, offering exceptional recruitment services and customized options to meet every client&apos;s needs.
          </p>

          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-[#F6F9FF] shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#2563EB] font-mono">
                {health.total > 0 ? health.total : "480+"}
              </div>
              <div className="text-xs text-[#4A5B78] mt-1 font-medium">Ingested Tech Docs</div>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#15803D] font-mono">
                98.8%
              </div>
              <div className="text-xs text-[#15803D] mt-1 font-medium">Benchmark Pass Bar</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-[#F6F9FF] shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#7C3AED] font-mono">
                14
              </div>
              <div className="text-xs text-[#4A5B78] mt-1 font-medium">Auto-Patches Merged</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-[#F6F9FF] shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#B45309] font-mono">
                ${telemetry.totalSpendUsd > 0 ? telemetry.totalSpendUsd.toFixed(4) : "0.0241"}
              </div>
              <div className="text-xs text-[#4A5B78] mt-1 font-medium">Model Cost Telemetry</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Services & Solutions Section */}
      <section id="services" className="py-16 md:py-24 bg-[#F6F9FF] border-b border-[#DCE6F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#2563EB]">
              Enterprise Practice Areas
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1B3A] tracking-tight">
              Comprehensive Technology &amp; Staffing Solutions
            </h2>
            <p className="text-sm text-[#4A5B78]">
              Bridging cutting-edge artificial intelligence, resilient database architectures, and high-impact technical workforce solutions.
            </p>
          </div>

          <ServicesSection onConnectClick={() => setConnectModalOpen(true)} />
        </div>
      </section>

      {/* 5. The 6 Core Enterprise SaaS Operations Engines */}
      <section className="py-16 md:py-24 bg-white border-b border-[#DCE6F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#2563EB]">
                Workspace Operations Hub
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B3A] tracking-tight mt-1">
                The 6 Autonomous SaaS Engines
              </h2>
              <p className="text-xs text-[#4A5B78] mt-1">
                Active Tenant: <strong className="text-[#0B1B3A]">{tenantContext.businessName}</strong> ({tenantContext.businessSlug})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/signin"
                className="px-3.5 py-1.5 rounded-lg border border-[#DCE6F5] bg-white hover:bg-[#EEF4FF] text-xs font-semibold text-[#0B1B3A] transition shadow-xs"
              >
                Switch Tenant
              </Link>
              <Link
                href="/settings"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white text-xs font-bold transition shadow-xs"
              >
                Open Workspace Vault
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Screen 1 */}
            <Link
              href="/onboarding"
              className="rounded-2xl border border-[#DCE6F5] bg-white p-6 hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                    Screen 1
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                  15-Minute Onboarding
                </h3>
                <p className="text-xs text-[#4A5B78] mt-2 leading-relaxed">
                  Live countdown stopwatch, encrypted vault key setup, synthetic test cases, and the 85% readiness pass-bar check.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DCE6F5] mt-4 flex items-center justify-between text-xs text-[#2563EB] font-semibold">
                <span>Start Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 2 */}
            <Link
              href="/settings"
              className="rounded-2xl border border-[#DCE6F5] bg-white p-6 hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                    Screen 2
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                  Vault Keys &amp; Prompt Studio
                </h3>
                <p className="text-xs text-[#4A5B78] mt-2 leading-relaxed">
                  The 5 encrypted connection keys, Laptop Ollama runner switch, Claude prompt caching savings (-50%), and pg-boss queue runner.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DCE6F5] mt-4 flex items-center justify-between text-xs text-[#2563EB] font-semibold">
                <span>Manage Keys &amp; Roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 3 */}
            <Link
              href="/knowledge"
              className="rounded-2xl border border-[#DCE6F5] bg-white p-6 hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                    Screen 3
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                  The Knowledge Brain
                </h3>
                <p className="text-xs text-[#4A5B78] mt-2 leading-relaxed">
                  Sitemap crawler, hybrid pgvector cosine + tsvector search with RRF scoring, URL health quarantine lifecycle, and SOP drafting.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DCE6F5] mt-4 flex items-center justify-between text-xs text-[#2563EB] font-semibold">
                <span>Explore Brain</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 4 */}
            <Link
              href="/chat"
              className="rounded-2xl border border-[#DCE6F5] bg-white p-6 hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    Screen 4
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                  Ask &amp; Teach Consultant Chat
                </h3>
                <p className="text-xs text-[#4A5B78] mt-2 leading-relaxed">
                  Dynamic citations [1][2], prompt injection safety shield, human escalation valves (legal, refund, anger), and inline teaching lessons.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DCE6F5] mt-4 flex items-center justify-between text-xs text-[#2563EB] font-semibold">
                <span>Start Consultation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 5 */}
            <Link
              href="/evals"
              className="rounded-2xl border border-[#DCE6F5] bg-white p-6 hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    Screen 5
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                  The Eval Lab &amp; Model Matrix
                </h3>
                <p className="text-xs text-[#4A5B78] mt-2 leading-relaxed">
                  180-case benchmark harness, LLM-as-a-Judge grading rubrics, side-by-side model comparator, release gate, and smart cost router.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DCE6F5] mt-4 flex items-center justify-between text-xs text-[#2563EB] font-semibold">
                <span>Launch Benchmarks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Screen 6 */}
            <Link
              href="/self-improve"
              className="rounded-2xl border border-[#DCE6F5] bg-white p-6 hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                    Screen 6
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                  Self-Improvement Loop
                </h3>
                <p className="text-xs text-[#4A5B78] mt-2 leading-relaxed">
                  Autonomous Opus 5.5 failure diagnosis, isolated git branch fixes, hidden holdout test set verification, and 1-click PR merge.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DCE6F5] mt-4 flex items-center justify-between text-xs text-[#2563EB] font-semibold">
                <span>Inspect Auto-Fixes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Headquarters & Corporate Profile Section */}
      <section id="about" className="py-16 md:py-20 bg-[#F6F9FF] border-b border-[#DCE6F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#2563EB]">
                Corporate Headquarters
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B3A] tracking-tight">
                AI Technologies &amp; Consulting
              </h2>
              <p className="text-sm text-[#4A5B78] leading-relaxed">
                Operating at the intersection of enterprise software engineering, autonomous generative AI agents, and strategic workforce staffing. We deliver bespoke technical architectures and recruitment intelligence to organizations worldwide.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs text-[#4A5B78]">
                  <MapPin className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <span>Jubilee Enclave, Madhapur, Hyderabad, Telangana, India (500081)</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#4A5B78]">
                  <Clock className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <span>Global 24/7 Operations &bull; Distributed Tech Support Network</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#4A5B78]">
                  <ShieldCheck className="w-4 h-4 text-[#15803D] flex-shrink-0 mt-0.5" />
                  <span>Strict Multi-Tenant Isolation &bull; End-to-End PII Redaction</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#DCE6F5] bg-white p-8 shadow-sm space-y-4">
              <h4 className="text-base font-bold text-[#0B1B3A]">Direct Connect Hotline</h4>
              <p className="text-xs text-[#4A5B78] leading-relaxed">
                Need customized staffing or urgent technical architecture consultation? Connect directly with our enterprise team.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setConnectModalOpen(true)}
                  className="w-full py-3 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs transition shadow-sm"
                >
                  Initiate Strategic Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Website Footer */}
      <footer className="py-10 bg-white border-t border-[#DCE6F5] text-[#7B8AA6] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-serif text-xs font-bold shadow-xs">
              α
            </div>
            <span className="font-semibold text-[#0B1B3A]">AI Technologies &amp; Consulting</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#2563EB] transition">Home</Link>
            <Link href="/about" className="hover:text-[#2563EB] transition">About</Link>
            <Link href="/services" className="hover:text-[#2563EB] transition">Services</Link>
            <Link href="/contact" className="hover:text-[#2563EB] transition">Contact us</Link>
            <Link href="/chat" className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition">Consultant</Link>
          </div>
        </div>
      </footer>

      {/* 8. Interactive Connect Modal */}
      <ConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        initialCategory="client"
      />
    </div>
  );
}
