import React from "react";
import {
  LayoutDashboard,
  Brain,
  MessageSquare,
  Sparkles,
  FlaskConical,
  RefreshCw,
  Settings,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Server,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-[#0E1322] flex flex-col justify-between p-4">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-gray-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">AI Tech Consultant</h1>
              <span className="text-[11px] text-gray-400">Enterprise SaaS</span>
            </div>
          </div>

          {/* Workspace Pill */}
          <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900/60 p-2.5">
            <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Active Workspace</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-medium text-white">Acme Corporation</span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                Tenant Isolated
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <a href="/" className="flex items-center gap-3 rounded-lg bg-indigo-600/10 px-3 py-2 text-sm font-medium text-indigo-400 border border-indigo-500/20">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </a>
            <a href="#knowledge" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition">
              <Brain className="h-4 w-4" />
              <span>Knowledge Brain</span>
            </a>
            <a href="#chat" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition">
              <MessageSquare className="h-4 w-4" />
              <span>Ask & Teach Chat</span>
            </a>
            <a href="#roles" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition">
              <Sparkles className="h-4 w-4" />
              <span>Roles & Prompts</span>
            </a>
            <a href="#evals" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition">
              <FlaskConical className="h-4 w-4" />
              <span>The Eval Lab</span>
            </a>
            <a href="#self-improve" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition">
              <RefreshCw className="h-4 w-4" />
              <span>Self-Improve Loop</span>
            </a>
            <a href="#settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition">
              <Settings className="h-4 w-4" />
              <span>Settings & Keys</span>
            </a>
          </nav>
        </div>

        {/* Local-Only Mode Pill */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-gray-500" />
              Local-Only Mode
            </span>
            <span className="text-[10px] rounded bg-gray-800 px-1.5 py-0.5 text-gray-400 font-mono">OFF</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Running 14-model cloud router. Toggle to use laptop Ollama models only.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-gray-800 px-8 flex items-center justify-between bg-[#0E1322]/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Workspace</span>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-medium text-white">Executive Operations Hub</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              Prompt Injection Shield Active
            </span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white shadow-md">
              AC
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 space-y-8 max-w-7xl">
          {/* Executive Overview Banner */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Production Operations Overview</h2>
            <p className="text-sm text-gray-400 mt-1">
              Autonomous multi-tenant consultant monitoring knowledge ingestion, model cost telemetry, and benchmark evaluation pass-bars.
            </p>
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
                <span className="text-3xl font-bold text-white tracking-tight">$14.28</span>
                <span className="text-xs text-emerald-400 font-medium">-38.4% via Router</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">$21.40 saved via Prompt Caching</p>
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
      </main>
    </div>
  );
}
