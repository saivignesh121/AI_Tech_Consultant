"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight,
  Check,
  Lock,
  Mail,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface BusinessChoice {
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: string;
}

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";

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
        // Multi-Tenant User: Display Business Picker
        setBusinessChoices(data.businesses || []);
        setPendingUserId(data.user?.id || null);
        setBusinessPickerOpen(true);
      } else {
        // Direct entry: redirect to intended destination or dashboard
        const destination = redirectParam || data.redirectUrl || "/";
        window.location.href = destination;
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
        const destination = redirectParam || data.redirectUrl || "/";
        window.location.href = destination;
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
    <div className="min-h-screen bg-[#050B18] text-gray-100 flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[300px] bg-indigo-600/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative max-w-md w-full space-y-6 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black border border-gray-700 text-white font-serif text-2xl font-bold shadow-md shadow-cyan-500/20 group-hover:border-cyan-400 transition">
              α
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-cyan-300 transition">
              AI Technologies &amp; Consulting
            </span>
          </Link>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Sign in to access your tenant-isolated Knowledge Brain, Agent Studios, and live chat.
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Register (Sign Up) */}
        <div className="flex rounded-xl bg-[#071329] p-1 border border-cyan-950/60 shadow-inner">
          <Link
            href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
            className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-cyan-500 text-black shadow-md shadow-cyan-500/25 transition"
          >
            Sign In
          </Link>
          <Link
            href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
            className="flex-1 py-2 text-center text-xs font-semibold rounded-lg text-gray-400 hover:text-cyan-300 transition"
          >
            Create Workspace (Sign Up)
          </Link>
        </div>

        {/* Already Logged In / User Present Notification */}
        {activeSession && (
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-300">
                Active session: <strong className="text-white">{activeSession.userEmail}</strong>
              </div>
              <div className="text-[11px] text-cyan-400 font-medium mt-0.5">
                {activeSession.businessName} &bull; <span className="capitalize">{activeSession.userRole}</span>
              </div>
            </div>
            <Link
              href={redirectParam || "/"}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-md shadow-cyan-500/20 shrink-0"
            >
              <span>{redirectParam ? "Proceed" : "Go to Dashboard"}</span>
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
                  ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                  : "border-gray-800 bg-[#071329] hover:border-cyan-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  Acme
                </span>
                {selectedDemo === "acme" && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="text-xs font-semibold text-white mt-1 truncate">Alex Turner</div>
              <div className="text-[10px] text-gray-400">Owner (1 Biz)</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount("beta")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "beta"
                  ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                  : "border-gray-800 bg-[#071329] hover:border-cyan-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  Beta
                </span>
                {selectedDemo === "beta" && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="text-xs font-semibold text-white mt-1 truncate">Sarah Chen</div>
              <div className="text-[10px] text-gray-400">Owner (1 Biz)</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount("multi")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "multi"
                  ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                  : "border-gray-800 bg-[#071329] hover:border-cyan-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Multi
                </span>
                {selectedDemo === "multi" && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="text-xs font-semibold text-white mt-1 truncate">Morgan Lee</div>
              <div className="text-[10px] text-gray-400">Multi-Biz Picker</div>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="rounded-2xl border border-cyan-500/30 bg-[#040f26]/90 backdrop-blur-xl p-6 shadow-2xl shadow-cyan-500/10 space-y-4">
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
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-[#071329] border border-cyan-950/60 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
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
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-[#071329] border border-cyan-950/60 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-3 text-sm font-bold text-black transition shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              <span>{loading ? "Verifying Credentials..." : "Sign In to Workspace"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-400">
              Need to register a new company?{" "}
              <Link
                href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
                className="font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                Create new business workspace &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Security Isolation Callout */}
        <div className="rounded-xl border border-gray-800 bg-[#071329]/60 p-3.5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-200">Strict Multi-Tenant Guarantee:</strong> Passwords checked against Argon2id hashes. Every session is stored in PostgreSQL with <code className="text-cyan-300 font-mono">business_id</code> scoping. Rate-limited to prevent brute force attacks.
          </p>
        </div>
      </div>

      {/* Multi-Business Picker Modal */}
      {businessPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#071329] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30">
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
                  className="w-full p-3.5 rounded-xl border border-gray-800 hover:border-cyan-500 bg-[#040f26] hover:bg-cyan-950/20 text-left transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/20">
                      {b.businessName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition">
                        {b.businessName}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        Role: <span className="text-gray-300 font-medium capitalize">{b.role}</span> &bull; {b.businessSlug}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
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

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050B18] flex items-center justify-center text-cyan-400">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
