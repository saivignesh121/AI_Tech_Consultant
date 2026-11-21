"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight,
  Check,
  Lock,
  Mail,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

interface BusinessChoice {
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: string;
}

export default function SignInPage() {
  const [email, setEmail] = useState("alex@acme.com");
  const [password, setPassword] = useState("AcmePass123!");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedDemo, setSelectedDemo] = useState("acme");
  const [activeSession, setActiveSession] = useState<{
    userEmail: string;
    businessName: string;
    userRole: string;
  } | null>(null);

  // Multi-Business Picker Modal State
  const [businessPickerOpen, setBusinessPickerOpen] = useState(false);
  const [businessChoices, setBusinessChoices] = useState<BusinessChoice[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    fetch("/api/auth/context")
      .then((r) => r.json())
      .then((d) => {
        if (d.currentTenant && d.currentTenant.userEmail) {
          setActiveSession({
            userEmail: d.currentTenant.userEmail,
            businessName: d.currentTenant.businessName,
            userRole: d.currentTenant.userRole,
          });
        }
      })
      .catch(console.error);
  }, []);

  // Fast demo credential pre-fills
  const selectDemoAccount = (account: "acme" | "beta" | "multi") => {
    setSelectedDemo(account);
    setErrorMsg("");
    if (account === "acme") {
      setEmail("alex@acme.com");
      setPassword("AcmePass123!");
    } else if (account === "beta") {
      setEmail("sarah@beta-tech.com");
      setPassword("BetaPass123!");
    } else {
      setEmail("multi@consultant.com");
      setPassword("MultiPass123!");
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Authentication failed. Please verify credentials.");
      } else if (data.requiresBusinessChoice) {
        // Multi-Tenant User: Display Business Picker (Task Rule)
        setBusinessChoices(data.businesses || []);
        setPendingUserId(data.user?.id || null);
        setBusinessPickerOpen(true);
      } else {
        // Single business: Direct entry to dashboard
        window.location.href = data.redirectUrl || "/";
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error communicating with authentication service.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusinessWorkspace = async (businessId: string) => {
    if (!pendingUserId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/select-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUserId, businessId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = data.redirectUrl || "/";
      } else {
        setErrorMsg(data.error || "Failed to switch into selected workspace.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error selecting workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative max-w-md w-full space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/20 mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Tech Consultant</h1>
          <p className="text-sm text-gray-400">
            Sign in to access your tenant-isolated Knowledge Brain and Agent Studios.
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Register (Sign Up) */}
        <div className="flex rounded-xl bg-gray-900/80 p-1 border border-gray-800">
          <Link
            href="/signin"
            className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="flex-1 py-2 text-center text-xs font-semibold rounded-lg text-gray-400 hover:text-white transition"
          >
            Create Workspace (Sign Up)
          </Link>
        </div>

        {/* Already Logged In / User Present Notification */}
        {activeSession && (
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-300">
                Active session: <strong className="text-white">{activeSession.userEmail}</strong>
              </div>
              <div className="text-[11px] text-indigo-400 font-medium mt-0.5">
                {activeSession.businessName} &bull; <span className="capitalize">{activeSession.userRole}</span>
              </div>
            </div>
            <Link
              href="/"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm shrink-0"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Demo Logins Quick-Select Selector */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
            Demo Tenant Quick-Select (Argon2 Verified)
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectDemoAccount("acme")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "acme"
                  ? "border-indigo-500 bg-indigo-950/40 shadow-sm"
                  : "border-gray-800 bg-[#0E1322] hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  Acme
                </span>
                {selectedDemo === "acme" && <Check className="w-3 h-3 text-indigo-400" />}
              </div>
              <div className="text-xs font-semibold text-white mt-1 truncate">Alex Turner</div>
              <div className="text-[10px] text-gray-400">Owner (1 Biz)</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount("beta")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "beta"
                  ? "border-indigo-500 bg-indigo-950/40 shadow-sm"
                  : "border-gray-800 bg-[#0E1322] hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  Beta
                </span>
                {selectedDemo === "beta" && <Check className="w-3 h-3 text-indigo-400" />}
              </div>
              <div className="text-xs font-semibold text-white mt-1 truncate">Sarah Chen</div>
              <div className="text-[10px] text-gray-400">Owner (1 Biz)</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount("multi")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "multi"
                  ? "border-indigo-500 bg-indigo-950/40 shadow-sm"
                  : "border-gray-800 bg-[#0E1322] hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Multi
                </span>
                {selectedDemo === "multi" && <Check className="w-3 h-3 text-indigo-400" />}
              </div>
              <div className="text-xs font-semibold text-white mt-1 truncate">Morgan Lee</div>
              <div className="text-[10px] text-gray-400">Multi-Biz Picker</div>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="rounded-2xl border border-gray-800 bg-[#0E1322] p-6 shadow-xl space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Work Email</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <span>{loading ? "Verifying Credentials..." : "Sign In to Workspace"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-400">
              Need to register a new company?{" "}
              <Link href="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300 transition">
                Create new business workspace &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Security Isolation Callout */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3.5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-200">Strict Multi-Tenant Guarantee:</strong> Passwords checked against Argon2id hashes. Every session is stored in PostgreSQL with <code className="text-indigo-300 font-mono">business_id</code> scoping. Rate-limited to prevent brute force attacks.
          </p>
        </div>
      </div>

      {/* Multi-Business Picker Modal */}
      {businessPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0E1322] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Select Workspace</h3>
                <p className="text-xs text-gray-400">
                  Your account belongs to {businessChoices.length} businesses. Select which one to enter:
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {businessChoices.map((b) => (
                <button
                  key={b.businessId}
                  onClick={() => handleSelectBusinessWorkspace(b.businessId)}
                  disabled={loading}
                  className="w-full p-3.5 rounded-xl border border-gray-800 hover:border-indigo-500 bg-gray-950/60 hover:bg-indigo-950/20 text-left transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20">
                      {b.businessName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition">
                        {b.businessName}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        Role: <span className="text-gray-300 font-medium capitalize">{b.role}</span> &bull; {b.businessSlug}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-800/80">
              <button
                type="button"
                onClick={() => setBusinessPickerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
