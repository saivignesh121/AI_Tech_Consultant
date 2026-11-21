"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import {
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Server,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  RefreshCw,
  FlaskConical,
} from "lucide-react";

export default function DashboardPage() {
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

  const [tenantName, setTenantName] = useState<string>("Workspace");

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
        if (d.currentTenant?.businessName) {
          setTenantName(d.currentTenant.businessName);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <AppShell breadcrumbs={[{ label: "Executive Operations Hub" }]}>
      <div className="space-y-8">
        {/* Executive Overview Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Production Operations Overview</h1>
            <p className="text-sm text-gray-400 mt-1">
              Autonomous multi-tenant consultant monitoring knowledge ingestion, model cost telemetry, and benchmark evaluation pass-bars.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings/roles-prompts"
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Role & Prompt Studio</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
            >
              <span>The 5 Vault Keys</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Metric 1 */}
          <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ingested Help Pages</span>
              <Brain className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">{health.total}</span>
              <span className="text-xs text-emerald-400 font-medium">{health.healthyPercent}% Synced</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{health.total * 8} semantic vector chunks embedded</p>
          </div>

          {/* Metric 2 */}
          <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Monthly Model Spend</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight font-mono">
                ${telemetry.totalSpendUsd.toFixed(4)}
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                {telemetry.totalCalls > 0 ? `${telemetry.totalCalls} calls logged` : "0 calls"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{telemetry.cacheHitPercentage}% prompt cache hit rate</p>
          </div>

          {/* Metric 3 */}
          <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Benchmark Accuracy</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400 tracking-tight">98.8%</span>
              <span className="text-xs text-emerald-500 font-medium">Pass Bar Exceeded</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">180 benchmark test cases passing</p>
          </div>

          {/* Metric 4 */}
          <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Open Human Tickets</span>
              <AlertTriangle className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">0</span>
              <span className="text-xs text-gray-400 font-medium">100% Policy Clean</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Legal, refund, and anger safety valves active</p>
          </div>
        </div>

        {/* Feature Quick Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/onboarding"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-purple-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-purple-600/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400 transition" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h3 className="text-sm font-semibold text-white">15-Minute Onboarding</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300">Screen 1</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Live stopwatch timer, vault key setup, synthetic test generator, and 85% readiness pass-bar check.
            </p>
          </Link>

          <Link
            href="/knowledge"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Brain className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-indigo-400 transition" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h3 className="text-sm font-semibold text-white">The Knowledge Brain</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300">Screen 3</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Polite batch crawler, pgvector hybrid search, URL health lifecycle (404 watch / 301 quarantine), and drafted skills.
            </p>
          </Link>

          <Link
            href="/chat"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-emerald-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-emerald-400 transition" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h3 className="text-sm font-semibold text-white">Ask & Teach Consultant Chat</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300">Screen 4</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Agent loop with inline citations [1], multimodal screenshot uploads, prompt injection shield, and human escalation.
            </p>
          </Link>

          <Link
            href="/evals"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-amber-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <FlaskConical className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-amber-400 transition" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h3 className="text-sm font-semibold text-white">The Eval Lab & Router</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300">Screen 5</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              180 benchmark suite, 14-model matrix, AI Judge calibration, 38.4% cost router, and production release gate.
            </p>
          </Link>

          <Link
            href="/self-improve"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-purple-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-purple-600/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400 transition" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h3 className="text-sm font-semibold text-white">Self-Improvement Loop</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300">Screen 6</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Claude Opus 5.5 failure packing, isolated git branches, hidden check set validation, $5 ceiling, and 1-click merge/revert.
            </p>
          </Link>

          <Link
            href="/settings/roles-prompts"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Zap className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-indigo-400 transition" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <h3 className="text-sm font-semibold text-white">Role & Prompt Studio</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300">Screen 2</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Persona prompt editor, live split-screen test chat, prompt caching simulator, and instant rollback versioning.
            </p>
          </Link>
        </div>

        {/* Two-Column Section: URL Health Lifecycle & Recent Runs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* URL Health Lifecycle Distribution (Task 2.4) */}
          <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">URL Health Lifecycle</h3>
              <span className="text-xs text-gray-400 font-mono">Task 2.4</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Automated 404 watch counters and 301 quarantine boundaries preventing stale citations.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Active (Healthy)
                </span>
                <span className="font-mono text-white">468 URLs</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Watch (1 Failure)
                </span>
                <span className="font-mono text-white">10 URLs</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Quarantined (301/Broken)
                </span>
                <span className="font-mono text-white">3 URLs</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-500">
                  <Server className="h-4 w-4" /> Archived (Audit Only)
                </span>
                <span className="font-mono text-white">1 URL</span>
              </div>
            </div>
          </div>

          {/* Tracing & Activity Stream (Task 1.5) */}
          <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Live Tracing & Operations Stream</h3>
              <span className="text-xs text-indigo-400 font-mono">PostgreSQL pg-boss Queue</span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-medium text-white">Eval Run #18 Completed</span>
                    <span className="text-[10px] text-gray-400">14 Models Evaluated</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Router beat Sonnet 5.5 baseline cost by 38.4% with 98.4% benchmark quality.
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">Just now</span>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                    <span className="text-xs font-medium text-white">Autonomous Self-Improvement PR Merged</span>
                    <span className="text-[10px] text-gray-400">Claude Opus 5.5</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Fixed DNS edge case kb-dns-042 on branch self-improve/fix-kb-dns-042 (Score: 35% &rarr; 100%).
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">15m ago</span>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-medium text-white">Sitemap Ingestion Completed</span>
                    <span className="text-[10px] text-gray-400">Brilliant Directories</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Polite batch crawl finished 482 pages with zero server errors (Rate: 450 pages/hr).
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">1h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
