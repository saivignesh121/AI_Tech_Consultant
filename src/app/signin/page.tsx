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
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      {/* Background Ambient Glow (faint radial blue/cyan gradient) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[300px] bg-indigo-500/8 blur-[130px] rounded-full" />
      </div>

      <div className="relative max-w-md w-full space-y-6 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-serif text-2xl font-bold shadow-sm group-hover:brightness-105 transition">
              α
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#0B1B3A] group-hover:text-[#2563EB] transition">
              AI Technologies &amp; Consulting
            </span>
          </Link>
          <p className="text-xs text-[#4A5B78] max-w-sm mx-auto">
            Sign in to access your tenant-isolated Knowledge Brain, Agent Studios, and live chat.
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Register (Sign Up) in --surface-subtle with white active pill */}
        <div className="flex rounded-xl bg-[#EEF4FF] p-1 border border-[#DCE6F5] shadow-inner">
          <Link
            href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
            className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-white text-[#2563EB] shadow-sm transition"
          >
            Sign In
          </Link>
          <Link
            href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
            className="flex-1 py-2 text-center text-xs font-semibold rounded-lg text-[#4A5B78] hover:text-[#0B1B3A] transition"
          >
            Create Workspace (Sign Up)
          </Link>
        </div>

        {/* Active Session Banner: white card with blue accent */}
        {activeSession && (
          <div className="p-3.5 rounded-xl bg-white border border-[#DCE6F5] border-l-4 border-l-[#2563EB] shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-[#4A5B78]">
                Active session: <strong className="text-[#0B1B3A]">{activeSession.userEmail}</strong>
              </div>
              <div className="text-[11px] text-[#2563EB] font-medium mt-0.5">
                {activeSession.businessName} &bull; <span className="capitalize">{activeSession.userRole}</span>
              </div>
            </div>
            <Link
              href={redirectParam || "/"}
              className="px-3 py-1.5 bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-sm shrink-0"
            >
              <span>{redirectParam ? "Proceed" : "Go to Dashboard"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Demo Logins Quick-Select Selector */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-[#7B8AA6] uppercase tracking-wider text-center">
            Demo Tenant Quick-Select (Argon2 Verified)
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectDemoAccount("acme")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "acme"
                  ? "border-[#2563EB] bg-[#EEF4FF] shadow-xs"
                  : "border-[#DCE6F5] bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  Acme
                </span>
                {selectedDemo === "acme" && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
              </div>
              <div className="text-xs font-semibold text-[#0B1B3A] mt-1.5 truncate">Alex Turner</div>
              <div className="text-[10px] text-[#7B8AA6]">Owner (1 Biz)</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount("beta")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "beta"
                  ? "border-[#2563EB] bg-[#EEF4FF] shadow-xs"
                  : "border-[#DCE6F5] bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                  Beta
                </span>
                {selectedDemo === "beta" && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
              </div>
              <div className="text-xs font-semibold text-[#0B1B3A] mt-1.5 truncate">Sarah Chen</div>
              <div className="text-[10px] text-[#7B8AA6]">Owner (1 Biz)</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount("multi")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedDemo === "multi"
                  ? "border-[#2563EB] bg-[#EEF4FF] shadow-xs"
                  : "border-[#DCE6F5] bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Multi
                </span>
                {selectedDemo === "multi" && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
              </div>
              <div className="text-xs font-semibold text-[#0B1B3A] mt-1.5 truncate">Morgan Lee</div>
              <div className="text-[10px] text-[#7B8AA6]">Multi-Biz Picker</div>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="rounded-2xl border border-[#DCE6F5] bg-white p-6 shadow-md space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#4A5B78] mb-1">Work Email</label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8AA6]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A5B78] mb-1">Password</label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8AA6]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 px-4 py-3 text-sm font-bold text-white transition shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <span>{loading ? "Verifying Credentials..." : "Sign In to Workspace"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#DCE6F5] text-center">
            <p className="text-xs text-[#4A5B78]">
              Need to register a new company?{" "}
              <Link
                href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
                className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition"
              >
                Create new business workspace &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Security Isolation Callout */}
        <div className="rounded-xl border border-[#DCE6F5] bg-white p-3.5 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="h-5 w-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#4A5B78] leading-relaxed">
            <strong className="text-[#0B1B3A]">Strict Multi-Tenant Guarantee:</strong> Passwords checked against Argon2id hashes. Every session is stored in PostgreSQL with <code className="text-[#2563EB] font-mono bg-blue-50 px-1 py-0.5 rounded">business_id</code> scoping. Rate-limited to prevent brute force attacks.
          </p>
        </div>
      </div>

      {/* Multi-Business Picker Modal */}
      {businessPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B3A]/35 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#DCE6F5] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-[#2563EB] rounded-xl border border-blue-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0B1B3A]">Select Workspace</h3>
                <p className="text-xs text-[#4A5B78]">
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
                  className="w-full p-3.5 rounded-xl border border-[#DCE6F5] hover:border-[#2563EB] bg-white hover:bg-[#EEF4FF] text-left transition flex items-center justify-between group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2563EB] font-bold text-xs flex items-center justify-center border border-blue-200">
                      {b.businessName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                        {b.businessName}
                      </div>
                      <div className="text-[11px] text-[#7B8AA6] font-mono">
                        Role: <span className="text-[#0B1B3A] font-medium capitalize">{b.role}</span> &bull; {b.businessSlug}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#7B8AA6] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#DCE6F5]">
              <button
                type="button"
                onClick={() => setBusinessPickerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4A5B78] hover:text-[#0B1B3A] transition"
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
    <Suspense fallback={<div className="min-h-screen bg-[#F6F9FF] flex items-center justify-center text-[#2563EB]">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
