"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  ShieldAlert,
  Server,
  Building2,
  AlertTriangle,
  RotateCw,
  PlusCircle,
  Ban,
  CheckCircle2,
  DollarSign,
  Activity,
  Layers,
  Lock,
} from "lucide-react";

interface BusinessFleetItem {
  id: string;
  name: string;
  slug: string;
  readinessScore: number;
  status: "active" | "suspended";
  totalCalls: number;
  totalSpendUsd: number;
  createdAt: string;
}

interface FailedJobItem {
  id: string;
  businessId: string;
  queueName: string;
  retryCount: number;
  lastAttemptAt: string;
  errorStack: string | null;
}

interface FleetSummary {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalCalls: number;
  totalSpendUsd: number;
  failedJobCount: number;
}

export default function AdminPage() {
  const [businesses, setBusinesses] = useState<BusinessFleetItem[]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJobItem[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/businesses");
      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg("Access Denied: Platform Admin role required. Use the role switcher in the top right to select 'Platform Admin'.");
          return;
        }
        throw new Error("Failed to load platform data");
      }
      const data = await res.json();
      setBusinesses(data.businesses || []);
      setFailedJobs(data.failedJobs || []);
      setSummary(data.fleetSummary || null);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to communicate with fleet management API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleSuspend = async (businessId: string) => {
    setActionLoading(`suspend-${businessId}`);
    try {
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_suspend", businessId }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message);
        setTimeout(() => setToastMessage(""), 4000);
        await fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeedDemo = async () => {
    setActionLoading("seed");
    try {
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_demo" }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message);
        setTimeout(() => setToastMessage(""), 4000);
        await fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppShell breadcrumbs={[{ label: "Platform Admin", href: "/admin" }]}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DCE6F5] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-[#BFDBFE] text-cyan-400 text-xs font-mono font-medium mb-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>SaaS Operator Fleet Command</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#0B1B3A] tracking-tight">
              Platform Admin Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Multi-tenant fleet monitoring, usage telemetry, and tenant lifecycle governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedDemo}
              disabled={Boolean(actionLoading)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{actionLoading === "seed" ? "Seeding..." : "Seed Demo Workspaces"}</span>
            </button>

            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="p-2 rounded-xl border border-[#C3D3EA] bg-white text-slate-600 hover:text-slate-900 hover:border-cyan-400 transition"
              title="Refresh Fleet"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-4 rounded-xl bg-blue-50 border border-[#BFDBFE] text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Access Restriction Error */}
        {errorMsg && (
          <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200">
            <div className="flex items-center gap-3 font-semibold text-sm mb-1">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span>Permission Notice</span>
            </div>
            <p className="text-xs text-amber-300/80">{errorMsg}</p>
          </div>
        )}

        {/* Zero-Leakage Architecture Banner */}
        <div className="rounded-2xl border border-[#DCE6F5] bg-gradient-to-r from-[#040f26] to-[#081b3d] p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-[#BFDBFE] text-cyan-400">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Strict Zero-Leakage Guarantee (Step 2 Architecture)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Enforced
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                As Platform Admin, you can view aggregate fleet telemetry, monitor failed background jobs, and manage workspace suspension.
                Under our strict multi-tenant boundary, <strong>you cannot view or inspect any business&apos;s private knowledge chunks, prompts, API keys, or chat conversations.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Fleet KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-white">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Total Workspaces</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B1B3A] mt-2 font-mono">
                {summary.totalBusinesses}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                <span className="text-emerald-400 font-semibold">{summary.activeBusinesses} active</span> &bull; {summary.suspendedBusinesses} suspended
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-white">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-indigo-400" />
                <span>Fleet Invocations</span>
              </div>
              <div className="text-3xl font-extrabold text-[#2563EB] mt-2 font-mono">
                {summary.totalCalls}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Across 14 Supported Models</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-white">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                <span>Total Fleet Spend</span>
              </div>
              <div className="text-3xl font-extrabold text-[#15803D] mt-2 font-mono">
                ${summary.totalSpendUsd.toFixed(4)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Ready for Billing Invoicing</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#DCE6F5] bg-white">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>Failed Background Jobs</span>
              </div>
              <div className="text-3xl font-extrabold text-[#B45309] mt-2 font-mono">
                {summary.failedJobCount}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">pg-boss Worker Runner</div>
            </div>
          </div>
        )}

        {/* Businesses Table */}
        <div className="rounded-2xl border border-[#DCE6F5] bg-white overflow-hidden">
          <div className="p-5 border-b border-[#DCE6F5] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Registered Business Tenants</span>
            </h2>
            <span className="text-xs font-mono text-gray-400">{businesses.length} Tenants</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF4FF] text-[#4A5B78] uppercase font-mono border-b border-[#DCE6F5] font-semibold">
                <tr>
                  <th className="py-3 px-4">Business / Slug</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Readiness</th>
                  <th className="py-3 px-4">Cloud Calls</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {businesses.map((biz) => {
                  const isSuspended = biz.status === "suspended";
                  return (
                    <tr key={biz.id} className="hover:bg-[#EEF4FF]/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{biz.name}</div>
                        <div className="font-mono text-gray-400 text-[11px]">{biz.slug}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold font-mono ${
                            isSuspended
                              ? "bg-red-500/10 text-red-400 border border-red-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? "bg-red-400" : "bg-emerald-400"}`} />
                          <span>{biz.status.toUpperCase()}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        {biz.readinessScore}%
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-200">
                        {biz.totalCalls}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                        ${biz.totalSpendUsd.toFixed(4)}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 font-mono">
                        {new Date(biz.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleSuspend(biz.id)}
                          disabled={actionLoading === `suspend-${biz.id}`}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ml-auto ${
                            isSuspended
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20"
                          }`}
                        >
                          <Ban className="h-3 w-3" />
                          <span>{isSuspended ? "Reactivate" : "Suspend"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {businesses.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No businesses registered yet. Click &quot;Seed Demo Workspaces&quot; to initialize test tenants.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failed Background Jobs Table */}
        <div className="rounded-2xl border border-[#DCE6F5] bg-white overflow-hidden">
          <div className="p-5 border-b border-[#DCE6F5] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Failed Background Jobs Log</span>
            </h2>
            <span className="text-xs font-mono text-gray-400">{failedJobs.length} Failed Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF4FF] text-[#4A5B78] uppercase font-mono border-b border-[#DCE6F5] font-semibold">
                <tr>
                  <th className="py-3 px-4">Queue Name</th>
                  <th className="py-3 px-4">Business ID</th>
                  <th className="py-3 px-4">Retry Count</th>
                  <th className="py-3 px-4">Last Attempt</th>
                  <th className="py-3 px-4">Error Stack Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {failedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#EEF4FF]/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {job.queueName}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                      {job.businessId}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400">
                      {job.retryCount}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {new Date(job.lastAttemptAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-400 truncate max-w-xs font-mono text-[11px]">
                      {job.errorStack || "Execution timeout or network failure."}
                    </td>
                  </tr>
                ))}

                {failedJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-emerald-400 font-mono">
                      ✓ Zero failed jobs across the background queue. Workers healthy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
