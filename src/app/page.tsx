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
    totalSpendUsd: 0.015245,
    totalCalls: 5,
    avgLatencyMs: 412,
    cacheHitPercentage: 42.8,
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
              <span className="text-3xl font-bold text-white tracking-tight">482</span>
              <span className="text-xs text-emerald-400 font-medium">100% Synced</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">3,842 semantic vector chunks embedded</p>
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
              <span className="text-xs text-emerald-400 font-medium">-38.4% via Router</span>
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
            href="/settings/roles-prompts"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-indigo-400 transition" />
            </div>
            <h3 className="text-sm font-semibold text-white mt-4">Role & Prompt Studio</h3>
            <p className="text-xs text-gray-400 mt-1">
              Configure Support Engineer, Executive, and Consultant personas with live split-screen test chat and prompt caching simulation.
            </p>
          </Link>

          <Link
            href="/settings"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Zap className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-amber-400 transition" />
            </div>
            <h3 className="text-sm font-semibold text-white mt-4">The 5 Connections & Keys</h3>
            <p className="text-xs text-gray-400 mt-1">
              Manage AES-256 encrypted keys for Claude, Gemini, OpenRouter, and Ollama localhost:11434 with live latency testing.
            </p>
          </Link>

          <Link
            href="/settings?tab=telemetry"
            className="rounded-xl border border-gray-800 bg-[#0E1322] p-5 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <TrendingUp className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-emerald-400 transition" />
            </div>
            <h3 className="text-sm font-semibold text-white mt-4">Model Cost Telemetry</h3>
            <p className="text-xs text-gray-400 mt-1">
              Inspect granular USD costs down to 6 decimals, token counters, and p95 latency across all 14 supported models.
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
