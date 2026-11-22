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
        {/* Header Banner: Proteus Royal Blue to Violet/Purple Gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white p-8 md:p-10 shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-xs font-mono font-medium">
                <ShieldAlert className="h-3.5 w-3.5 text-cyan-300" />
                <span>SaaS Operator Fleet Command</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Platform Admin Dashboard
              </h1>
              <p className="text-sm text-purple-100 max-w-xl leading-relaxed">
                Multi-tenant fleet monitoring, usage telemetry, and tenant lifecycle governance.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleSeedDemo}
                disabled={Boolean(actionLoading)}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-blue-50 text-[#1D4ED8] font-bold text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4 text-[#1D4ED8]" />
                <span>{actionLoading === "seed" ? "Seeding..." : "Seed Demo Workspaces"}</span>
              </button>

              <button
                onClick={fetchAdminData}
                disabled={loading}
                className="p-2.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition shadow-sm"
                title="Refresh Fleet"
              >
                <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-300" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Access Restriction Error */}
        {errorMsg && (
          <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-900 shadow-sm">
            <div className="flex items-center gap-3 font-bold text-sm mb-1 text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Permission Notice</span>
            </div>
            <p className="text-xs text-amber-800/90">{errorMsg}</p>
          </div>
        )}

        {/* Zero-Leakage Architecture Card (Ice Blue Pastel Tint) */}
        <div className="rounded-3xl border-2 border-[#D0E2FB] bg-[#EEF5FD] p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white border border-[#D0E2FB] text-[#1D4ED8] shadow-xs">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-[#0B1B3A] flex items-center gap-2">
                <span>Strict Zero-Leakage Guarantee (Step 2 Architecture)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                  Enforced
                </span>
              </div>
              <p className="text-xs text-[#334155] leading-relaxed">
                As Platform Admin, you can view aggregate fleet telemetry, monitor failed background jobs, and manage workspace suspension.
                Under our strict multi-tenant boundary, <strong>you cannot view or inspect any business&apos;s private knowledge chunks, prompts, API keys, or chat conversations.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Fleet KPI Cards in 4 Pastel Tinted Styles */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {/* Card 1: Mint / Soft Cyan */}
            <div className="p-6 rounded-3xl border-2 border-[#BCECEF] bg-[#E6F8F9] shadow-sm hover:shadow-md transition">
              <div className="text-xs font-mono text-cyan-800 uppercase tracking-wider flex items-center gap-2 font-semibold">
                <Building2 className="h-4 w-4 text-cyan-600" />
                <span>Total Workspaces</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B1B3A] mt-2 font-mono">
                {summary.totalBusinesses}
              </div>
              <div className="text-[11px] text-[#334155] mt-1 font-medium">
                <span className="text-emerald-700 font-bold">{summary.activeBusinesses} active</span> &bull; {summary.suspendedBusinesses} suspended
              </div>
            </div>

            {/* Card 2: Ice Blue */}
            <div className="p-6 rounded-3xl border-2 border-[#D0E2FB] bg-[#EEF5FD] shadow-sm hover:shadow-md transition">
              <div className="text-xs font-mono text-blue-800 uppercase tracking-wider flex items-center gap-2 font-semibold">
                <Activity className="h-4 w-4 text-[#1D4ED8]" />
                <span>Fleet Invocations</span>
              </div>
              <div className="text-3xl font-extrabold text-[#1D4ED8] mt-2 font-mono">
                {summary.totalCalls}
              </div>
              <div className="text-[11px] text-[#334155] mt-1 font-medium">Across 14 Supported Models</div>
            </div>

            {/* Card 3: Warm Peach / Cream */}
            <div className="p-6 rounded-3xl border-2 border-[#FFE2C2] bg-[#FFF4E8] shadow-sm hover:shadow-md transition">
              <div className="text-xs font-mono text-amber-800 uppercase tracking-wider flex items-center gap-2 font-semibold">
                <DollarSign className="h-4 w-4 text-amber-600" />
                <span>Total Fleet Spend</span>
              </div>
              <div className="text-3xl font-extrabold text-[#15803D] mt-2 font-mono">
                ${summary.totalSpendUsd.toFixed(4)}
              </div>
              <div className="text-[11px] text-[#334155] mt-1 font-medium">Ready for Billing Invoicing</div>
            </div>

            {/* Card 4: Soft Lavender */}
            <div className="p-6 rounded-3xl border-2 border-[#DDD6FE] bg-[#F5F3FF] shadow-sm hover:shadow-md transition">
              <div className="text-xs font-mono text-purple-800 uppercase tracking-wider flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-purple-600" />
                <span>Failed Background Jobs</span>
              </div>
              <div className="text-3xl font-extrabold text-[#B45309] mt-2 font-mono">
                {summary.failedJobCount}
              </div>
              <div className="text-[11px] text-[#334155] mt-1 font-medium">pg-boss Worker Runner</div>
            </div>
          </div>
        )}

        {/* Businesses Table */}
        <div className="rounded-3xl border border-[#DCE6F5] bg-white overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#DCE6F5] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#1D4ED8]" />
              <span>Registered Business Tenants</span>
            </h2>
            <span className="text-xs font-mono text-[#7B8AA6]">{businesses.length} Tenants</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF4FF] text-[#0B1B3A] uppercase font-mono border-b border-[#DCE6F5] font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Business / Slug</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Readiness</th>
                  <th className="py-3.5 px-5">Cloud Calls</th>
                  <th className="py-3.5 px-5">Total Cost</th>
                  <th className="py-3.5 px-5">Created Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F5]">
                {businesses.map((biz) => {
                  const isSuspended = biz.status === "suspended";
                  return (
                    <tr key={biz.id} className="hover:bg-[#EEF4FF]/40 transition">
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#0B1B3A] text-sm">{biz.name}</div>
                        <div className="font-mono text-[#7B8AA6] text-[11px]">{biz.slug}</div>
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold font-mono ${
                            isSuspended
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? "bg-red-500" : "bg-emerald-500"}`} />
                          <span>{biz.status.toUpperCase()}</span>
                        </span>
                      </td>

                      <td className="py-4 px-5 font-mono font-bold text-[#1D4ED8]">
                        {biz.readinessScore}%
                      </td>

                      <td className="py-4 px-5 font-mono text-[#0B1B3A]">
                        {biz.totalCalls}
                      </td>

                      <td className="py-4 px-5 font-mono text-[#15803D] font-bold">
                        ${biz.totalSpendUsd.toFixed(4)}
                      </td>

                      <td className="py-4 px-5 text-[#7B8AA6] font-mono">
                        {new Date(biz.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleToggleSuspend(biz.id)}
                          disabled={actionLoading === `suspend-${biz.id}`}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition border flex items-center gap-1.5 ml-auto shadow-xs ${
                            isSuspended
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
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
                    <td colSpan={7} className="py-8 text-center text-[#7B8AA6]">
                      No businesses registered yet. Click &quot;Seed Demo Workspaces&quot; to initialize test tenants.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failed Background Jobs Table */}
        <div className="rounded-3xl border border-[#DCE6F5] bg-white overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#DCE6F5] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Failed Background Jobs Log</span>
            </h2>
            <span className="text-xs font-mono text-[#7B8AA6]">{failedJobs.length} Failed Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF4FF] text-[#0B1B3A] uppercase font-mono border-b border-[#DCE6F5] font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Queue Name</th>
                  <th className="py-3.5 px-5">Business ID</th>
                  <th className="py-3.5 px-5">Retry Count</th>
                  <th className="py-3.5 px-5">Last Attempt</th>
                  <th className="py-3.5 px-5">Error Stack Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F5]">
                {failedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#EEF4FF]/40 transition">
                    <td className="py-4 px-5 font-mono font-bold text-[#1D4ED8]">
                      {job.queueName}
                    </td>
                    <td className="py-4 px-5 font-mono text-[#7B8AA6] text-[11px]">
                      {job.businessId}
                    </td>
                    <td className="py-4 px-5 font-mono text-amber-700 font-bold">
                      {job.retryCount}
                    </td>
                    <td className="py-4 px-5 font-mono text-[#7B8AA6]">
                      {new Date(job.lastAttemptAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-5 text-[#4A5B78] truncate max-w-xs font-mono text-[11px]">
                      {job.errorStack || "Execution timeout or network failure."}
                    </td>
                  </tr>
                ))}

                {failedJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-emerald-700 font-mono font-semibold">
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
