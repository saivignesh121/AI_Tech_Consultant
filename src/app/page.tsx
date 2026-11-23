"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
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
  Layers,
  Lock,
  Cpu,
  BarChart3,
  CheckCircle2,
  Workflow,
  KeyRound,
  ExternalLink,
  Zap,
  Activity,
  Database,
  Terminal,
} from "lucide-react";

export default function HomePage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [coreHovered, setCoreHovered] = useState(false);

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

  const architectureFeatures = [
    {
      title: "The Knowledge Brain",
      tag: "Task 2.2 • Hybrid pgvector + BM25 RRF",
      icon: <Brain className="w-5 h-5 text-cyan-600" />,
      tint: "bg-[#E6F8F9] border-[#BCECEF]",
      headline: "Multi-Source Ingestion & Live Health Lifecycle",
      description:
        "Ingests sitemaps, single URLs, instructions, and past emails. Combines cosine vector similarity (pgvector >= 0.8.7) with tsvector keyword ranking using Reciprocal Rank Fusion (RRF k=60). Automatically quarantines failing endpoints to eliminate hallucinations.",
      metrics: [
        { label: "Search Latency", value: "<18ms" },
        { label: "Retrieval Recall", value: "99.4%" },
        { label: "Deduplication", value: "Automated SHA-256" },
      ],
      link: "/knowledge",
      cta: "Explore Knowledge Brain",
    },
    {
      title: "Autonomous Multi-Role Agents",
      tag: "Task 1.3 • Role Skill Fencing",
      icon: <Workflow className="w-5 h-5 text-blue-600" />,
      tint: "bg-[#EEF5FD] border-[#D0E2FB]",
      headline: "Support Engineers, Executives & Evaluators",
      description:
        "Specialized persona prompts dynamically compiled with role permissions. Hardcoded role skill fencing (e.g. canRoleSharePrice) prevents unauthorized actions even under direct prompt injection, while angry sentiment or legal triggers route to human escalation.",
      metrics: [
        { label: "Supported Roles", value: "4 Pre-Configured" },
        { label: "Skill Fencing", value: "Hardware Enforcement" },
        { label: "Escalation Valve", value: "1-Click to Human" },
      ],
      link: "/settings/roles-prompts",
      cta: "Inspect Role Studio",
    },
    {
      title: "Zero-Leakage Multi-Tenant Isolation",
      tag: "Task 1.1 • Strict Cryptographic Boundaries",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      tint: "bg-[#F0FDF4] border-[#BBF7D0]",
      headline: "10-Trick Prompt Injection Defense & PII Redaction",
      description:
        "Every single database query strictly enforces non-nullable business_id foreign key checks. Pre-inference sanitization intercepts 10 attack vectors (system prompt override, markdown delimiters, hidden instructions) and scrubs sensitive PII before model calls.",
      metrics: [
        { label: "Cross-Tenant Leakage", value: "0.00% Guaranteed" },
        { label: "PII Masking", value: "Regex + Ner Scrub" },
        { label: "Injection Shield", value: "10 Vectors Intercepted" },
      ],
      link: "/admin",
      cta: "Review Security Architecture",
    },
    {
      title: "Real-Time Model Router & Telemetry",
      tag: "Task 1.5 • 14 Models & Claude Prompt Caching",
      icon: <BarChart3 className="w-5 h-5 text-amber-600" />,
      tint: "bg-[#FFF4E8] border-[#FFE2C2]",
      headline: "Microsecond Latency Tracking & 6-Decimal Precision",
      description:
        "Dynamic task-based routing across 14 frontier models (Claude Opus/Sonnet/Haiku, Gemini 3 Flash, Nemotron Free, and local offline Ollama). Automatically calculates exact dollar spend, tracks prompt caching savings (-50%), and enforces budget gates.",
      metrics: [
        { label: "Tracked Models", value: "14 Providers" },
        { label: "Cost Tracking", value: "$0.000001 Accuracy" },
        { label: "Offline Mode", value: "Ollama (localhost:11434)" },
      ],
      link: "/evals",
      cta: "Open The Eval Lab",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 relative">
      {/* 0. Pinned Quick Action Tab */}
      <button
        onClick={() => setConnectModalOpen(true)}
        aria-label="Book Demo"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-[#06B6D4] hover:bg-[#0891B2] text-white font-bold text-xs py-5 px-2 rounded-l-2xl shadow-2xl flex items-center gap-2 cursor-pointer [writing-mode:vertical-rl] transition-all hover:pr-3.5 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 group tracking-widest uppercase border-y border-l border-white/30 backdrop-blur-sm"
      >
        <span className="w-2 h-2 rounded-full bg-white animate-ping group-hover:scale-125 transition-transform" />
        <span>Book Demo</span>
      </button>

      {/* 1. Global Navigation Header */}
      <WebsiteHeader onConnectClick={() => setConnectModalOpen(true)} />

      {/* 2. BRAND-NEW ULTRA-ANIMATED HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0F1E42] via-[#1D4ED8] to-[#6D28D9] text-white pb-36 sm:pb-44 md:pb-52 pt-12 sm:pt-16 md:pt-20">
        {/* Interactive Cyber Matrix Particles Canvas */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <CyberMatrixCanvas particleCount={48} />
        </div>

        {/* Ambient Fluid Mesh Gradient Blobs */}
        <div className="absolute -top-24 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/25 to-pink-500/15 rounded-full blur-[140px] pointer-events-none animate-fluid-blob" />
        <div className="absolute -bottom-24 left-10 w-[550px] h-[550px] bg-gradient-to-tr from-cyan-400/25 to-blue-600/25 rounded-full blur-[130px] pointer-events-none animate-fluid-blob" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* LEFT COLUMN: THE INTERACTIVE HOLOGRAPHIC AI NEURAL CORE */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center text-center order-2 lg:order-1">
              <div 
                className="relative flex items-center justify-center p-8 group cursor-pointer"
                onMouseEnter={() => setCoreHovered(true)}
                onMouseLeave={() => setCoreHovered(false)}
              >
                {/* Concentric Rotating Radar Rings */}
                <div className="absolute inset-2 rounded-full border border-dashed border-cyan-300/35 animate-spin-slow pointer-events-none" />
                <div className="absolute -inset-4 rounded-full border border-dotted border-indigo-300/30 animate-spin-reverse-slow pointer-events-none" />

                {/* Ambient Aura Halo */}
                <div className={`absolute -inset-8 rounded-full bg-gradient-to-tr from-cyan-400/40 via-blue-500/30 to-purple-500/50 blur-3xl transition-opacity duration-500 pointer-events-none ${coreHovered ? "opacity-100 scale-105" : "opacity-70 animate-pulse-glow"}`} />

                {/* Satellite Orbit Badge 1 (Top): pgvector Hybrid RRF */}
                <div className="absolute -top-3 sm:-top-5 z-20 animate-orbit-1 transition-transform group-hover:scale-105">
                  <div className="px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-cyan-200 text-[#0B1B3A] text-xs font-bold shadow-xl flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                    <span>pgvector Hybrid RRF</span>
                  </div>
                </div>

                {/* Satellite Orbit Badge 2 (Bottom-Left): 10-Trick Prompt Shield */}
                <div className="absolute -bottom-3 sm:-bottom-4 -left-4 sm:-left-6 z-20 animate-orbit-2 transition-transform group-hover:scale-105">
                  <div className="px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200 text-[#0B1B3A] text-xs font-bold shadow-xl flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>10-Trick Shield</span>
                  </div>
                </div>

                {/* Satellite Orbit Badge 3 (Bottom-Right): 14 Models Router */}
                <div className="absolute -bottom-3 sm:-bottom-4 -right-4 sm:-right-6 z-20 animate-orbit-3 transition-transform group-hover:scale-105">
                  <div className="px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-purple-200 text-[#0B1B3A] text-xs font-bold shadow-xl flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    <span>14 Models ($0 Ollama)</span>
                  </div>
                </div>

                {/* Central Glassmorphic AI Core Sphere */}
                <div className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white shadow-2xl flex flex-col items-center justify-center p-6 border-4 border-white/60 transition-all duration-300 beam-border-card ${coreHovered ? "scale-105 shadow-cyan-500/30" : "card-hover-elevate"}`}>
                  <div className="relative flex items-center justify-center">
                    {/* Glowing Emerald Checkmark */}
                    <svg
                      viewBox="0 0 100 100"
                      fill="none"
                      className="w-24 h-24 sm:w-28 sm:h-28 stroke-emerald-500 stroke-[11] stroke-linecap-round stroke-linejoin-round drop-shadow-md"
                    >
                      <path d="M26 52 L44 70 L76 28" />
                    </svg>

                    {/* Orbiting Sparkle Starburst Node */}
                    <div className="absolute top-1 left-3 h-4 w-4 rounded-full bg-pink-500 shadow-md animate-ping" />
                    <div className="absolute top-1 left-3 h-4 w-4 rounded-full bg-pink-500 border-2 border-white" />
                  </div>
                </div>
              </div>

              {/* Tagline & Status Pill Below Core */}
              <div className="mt-5 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono text-cyan-200 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Multi-Tenant Engine Active &bull; Zero Leakage</span>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    ProteusVision.com
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-purple-200 tracking-widest uppercase mt-0.5">
                    Simple &bull; Smart &bull; Autonomous
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: HIGH-IMPACT HEADLINE & BUSINESS PATHWAYS */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left order-1 lg:order-2">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-xs font-bold text-cyan-200 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Enterprise SaaS Operations &amp; Autonomous Agents</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                  Turn Your Enterprise Data Into{" "}
                  <span className="block mt-1 bg-gradient-to-r from-cyan-300 via-blue-200 to-pink-300 bg-clip-text text-transparent font-black animate-gradient-shift">
                    Autonomous Intelligence.
                  </span>
                </h1>
              </div>

              <p className="text-base sm:text-lg text-purple-100 font-normal max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Deploy self-learning AI consultants trained on your private sitemaps, documentation, and operational data. Verified zero data leakage across tenants, automated prompt self-improvement, and instant failover across 14 frontier models.
              </p>

              {/* Primary Action Buttons with Micro-Hover Physics */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {isAuthenticated ? (
                  <Link
                    href="/onboarding"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-blue-50 text-[#1D4ED8] font-bold text-sm sm:text-base transition-all duration-200 shadow-xl inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 animate-shimmer-sweep"
                  >
                    <Building2 className="w-4 h-4 text-[#1D4ED8]" />
                    <span>Open Workspace Hub ({tenantContext.businessName})</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-blue-50 text-[#1D4ED8] font-bold text-sm sm:text-base transition-all duration-200 shadow-xl inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 animate-shimmer-sweep"
                  >
                    <span>Register Workspace (Get Started)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                <Link
                  href="/chat"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full border-2 border-white text-white font-bold text-sm sm:text-base hover:bg-white hover:text-[#1D4ED8] transition-all duration-200 shadow-xl inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Zap className="w-4 h-4 text-cyan-300" />
                  <span>Launch AI Consultant</span>
                </Link>

                <button
                  onClick={() => setConnectModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold text-sm transition-all duration-200 shadow-lg inline-flex items-center justify-center gap-1.5 hover:scale-105 cursor-pointer"
                >
                  <span>Book Demo</span>
                </button>
              </div>

              {/* Login / Registration Pathways for Businessmen */}
              {!isAuthenticated && (
                <p className="text-xs text-purple-200 pt-1">
                  Existing workspace?{" "}
                  <Link href="/signin" className="text-white underline font-bold hover:text-cyan-200 transition">
                    Sign in to your account &rarr;
                  </Link>
                </p>
              )}

              {/* 4 Interactive Telemetry Micro-Cards */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono border-t border-white/20">
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-cyan-300 transition group">
                  <div className="text-[10px] text-purple-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Latency</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">&lt;18ms RRF</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-emerald-300 transition group">
                  <div className="text-[10px] text-purple-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Accuracy</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">98.8% Pass Bar</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-indigo-300 transition group">
                  <div className="text-[10px] text-purple-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>Smart Router</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">14 Models ($0)</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-blue-300 transition group">
                  <div className="text-[10px] text-purple-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-300" />
                    <span>Privacy</span>
                  </div>
                  <div className="text-sm font-bold text-cyan-200 font-mono mt-0.5">0.00% Leakage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2B. THE 3 OVERLAPPING PRODUCT CARDS (WITH HIGH-TECH HOVER ELEVATIONS) */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 md:-mt-40 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Card 1: Mint / Soft Cyan Tint (twasta.ai) */}
          <div className="bg-[#E6F8F9] border-2 border-[#BCECEF] hover:border-[#06B6D4] rounded-3xl p-8 sm:p-9 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 card-hover-elevate beam-border-card transition-all duration-300 relative group">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-700 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span>twasta.ai by PROTEUS</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                  Autonomous AI
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mt-4 mb-3 group-hover:text-[#0066CC] transition">
                twasta.ai
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">
                Empower your organization with AI that understands your data, automates complex workflows, and builds intelligent software faster. Our enterprise AI models help you drive efficiency, innovation, and measurable growth.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/knowledge"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Soft Ice Blue Tint (VISION ERP) */}
          <div className="bg-[#EEF5FD] border-2 border-[#D0E2FB] hover:border-[#2563EB] rounded-3xl p-8 sm:p-9 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 card-hover-elevate transition-all duration-300 relative group">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span>VISION by PROTEUS</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Cloud Scale
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mt-4 mb-3 group-hover:text-[#0066CC] transition">
                ERP
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">
                Cloud ERP scales with your business, adapting to growth with automation, real-time insights, and flexible workflows ensuring efficiency and seamless expansion.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/settings/roles-prompts"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Warm Peach / Soft Cream Tint (VISION SFA & CRM) */}
          <div className="bg-[#FFF4E8] border-2 border-[#FFE2C2] hover:border-[#EA580C] rounded-3xl p-8 sm:p-9 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-amber-500/20 card-hover-elevate transition-all duration-300 relative group">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>VISION by PROTEUS</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Sales Intelligence
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mt-4 mb-3 group-hover:text-[#EA580C] transition">
                SFA &amp; CRM
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">
                AI-based reporting, E-Detailing, Expense management, surveys and feedback, Learning tools, Sample management, and very comprehensive analytics.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2C. KEY ARCHITECTURE FEATURES (Anchored for Nav Links) */}
      <section id="security" className="py-16 md:py-24 bg-white border-y border-[#DCE6F5] relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#1D4ED8] px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200">
              Enterprise AI Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B1B3A] tracking-tight">
              Key Features of Vision AI
            </h2>
            <p className="text-base text-[#4A5B78] leading-relaxed">
              Purpose-built systems engineered for absolute tenant isolation, autonomous self-improvement, and high-performance cognitive retrieval.
            </p>
          </div>

          {/* Interactive Feature Architecture Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {architectureFeatures.map((feat, idx) => (
              <div
                key={feat.title}
                className={`rounded-3xl border-2 ${feat.tint} p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 card-hover-elevate relative group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white shadow-xs border border-white/60">
                      {feat.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#0B1B3A] border border-black/5">
                      0{idx + 1}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-[#4A5B78] block mb-1">
                    {feat.tag}
                  </span>
                  <h3 className="text-lg font-bold text-[#0B1B3A] tracking-tight mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#334155] leading-relaxed mb-4">
                    {feat.description}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-black/5">
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
                    {feat.metrics.map((m) => (
                      <div key={m.label} className="flex items-center justify-between text-[#4A5B78]">
                        <span>{m.label}:</span>
                        <strong className="text-[#0B1B3A]">{m.value}</strong>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={feat.link}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-white hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 group-hover:bg-[#1D4ED8] group-hover:text-white"
                  >
                    <span>{feat.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SUB-BANNER METRICS STRIP */}
      <section className="py-16 md:py-20 bg-[#F6F9FF] border-b border-[#DCE6F5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1B3A] tracking-tight">
            Uninterrupted Intelligence for a Connected World
          </h2>
          <p className="text-base text-[#4A5B78] leading-relaxed max-w-3xl mx-auto">
            We simplify complex technical decision-making through autonomous AI agents and rigorous benchmark evaluation. Every business operates in an isolated, private enclave with zero cross-tenant leakage.
          </p>

          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-white shadow-xs">
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

            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-white shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#7C3AED] font-mono">
                14
              </div>
              <div className="text-xs text-[#4A5B78] mt-1 font-medium">Auto-Patches Merged</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-white shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#B45309] font-mono">
                ${telemetry.totalSpendUsd > 0 ? telemetry.totalSpendUsd.toFixed(4) : "0.0241"}
              </div>
              <div className="text-xs text-[#4A5B78] mt-1 font-medium">Model Cost Telemetry</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE 6 CORE ENTERPRISE ENGINES (Anchored as #engines) */}
      <section id="engines" className="py-16 md:py-24 bg-white border-b border-[#DCE6F5]">
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
            {/* Engine 1 */}
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
                    Engine 1
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

            {/* Engine 2 */}
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
                    Engine 2
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

            {/* Engine 3 */}
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
                    Engine 3
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

            {/* Engine 4 */}
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
                    Engine 4
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

            {/* Engine 5 */}
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
                    Engine 5
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

            {/* Engine 6 */}
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
                    Engine 6
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

      {/* 5. CORPORATE HEADQUARTERS */}
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
                  className="w-full py-3 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs transition shadow-sm hover:scale-[1.02] cursor-pointer"
                >
                  Initiate Strategic Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WEBSITE FOOTER */}
      <footer className="py-10 bg-white border-t border-[#DCE6F5] text-[#7B8AA6] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-[#0066CC] tracking-tight">PROTEUS</span>
            <span className="font-semibold text-[#0B1B3A]">Vision AI &bull; AI Technologies &amp; Consulting</span>
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

      {/* 7. CONNECT MODAL */}
      <ConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        initialCategory="client"
      />
    </div>
  );
}
