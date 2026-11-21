"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Building2, ShieldCheck, ArrowRight, Check } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("alex@acme.com");
  const [password, setPassword] = useState("••••••••••••");
  const [loading, setLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("acme-corp");

  const handleSignIn = async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: slug }),
      });
      if (res.ok) {
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col justify-center items-center px-4">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/20 mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Tech Consultant</h1>
          <p className="text-sm text-gray-400">
            Select your enterprise workspace to access your tenant-isolated Knowledge Brain and Agent Studios.
          </p>
        </div>

        {/* 1-Click Fast Switch Demo Cards (Task 1.1) */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
            Demo Tenant Quick-Select
          </div>

          <div
            onClick={() => {
              setSelectedSlug("acme-corp");
              setEmail("alex@acme.com");
            }}
            className={`cursor-pointer rounded-xl border p-4 transition flex items-center justify-between ${
              selectedSlug === "acme-corp"
                ? "border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10"
                : "border-gray-800 bg-[#0E1322] hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                AC
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  Acme Corporation
                  <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium px-1.5 py-0.5 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <div className="text-xs text-gray-400">alex@acme.com &bull; Business Owner</div>
              </div>
            </div>
            {selectedSlug === "acme-corp" ? (
              <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
            ) : (
              <Building2 className="h-4 w-4 text-gray-500" />
            )}
          </div>

          <div
            onClick={() => {
              setSelectedSlug("beta-dynamics");
              setEmail("sarah@beta-tech.com");
            }}
            className={`cursor-pointer rounded-xl border p-4 transition flex items-center justify-between ${
              selectedSlug === "beta-dynamics"
                ? "border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10"
                : "border-gray-800 bg-[#0E1322] hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-sm border border-purple-500/30">
                BD
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  Beta Dynamics
                  <span className="rounded bg-gray-800 text-gray-400 text-[10px] font-medium px-1.5 py-0.5 border border-gray-700">
                    Tenant
                  </span>
                </div>
                <div className="text-xs text-gray-400">sarah@beta-tech.com &bull; Business Owner</div>
              </div>
            </div>
            {selectedSlug === "beta-dynamics" ? (
              <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
            ) : (
              <Building2 className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </div>

        {/* Credentials Form */}
        <div className="rounded-xl border border-gray-800 bg-[#0E1322] p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleSignIn(selectedSlug)}
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <span>{loading ? "Authenticating..." : `Launch ${selectedSlug === "acme-corp" ? "Acme Corporation" : "Beta Dynamics"}`}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Security Isolation Callout */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3.5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-200">Strict Multi-Tenant Guarantee:</strong> Every knowledge vector chunk, chat trace, prompt version, and model telemetry log is keyed by <code className="text-indigo-300 font-mono">business_id</code>. Zero cross-tenant data leakage.
          </p>
        </div>
      </div>
    </div>
  );
}
