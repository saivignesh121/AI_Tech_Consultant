"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Check,
  Lock,
  Mail,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  UserCheck,
  FlaskConical,
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

  // Authentication inputs - strictly blank by default
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Demo accounts drawer toggle - collapsed by default for clean enterprise privacy
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  // Multi-Business Picker Modal State
  const [businessPickerOpen, setBusinessPickerOpen] = useState(false);
  const [businessChoices, setBusinessChoices] = useState<BusinessChoice[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Demo credential selectors (only activated if reviewer explicitly opens the drawer and clicks)
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

    if (!email.trim()) {
      setErrorMsg("Please enter your work email address.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Invalid email or password. Please verify credentials.");
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
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[300px] bg-indigo-500/8 blur-[130px] rounded-full" />
      </div>

      <div className="relative max-w-md w-full space-y-5 z-10">
        {/* Clean Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-serif text-2xl font-bold shadow-sm group-hover:brightness-105 transition">
              α
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#0B1B3A] group-hover:text-[#2563EB] transition">
              AI Technologies &amp; Consulting
            </span>
          </Link>
          <p className="text-xs text-[#4A5B78]">
            Sign in to your enterprise workspace
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Create Workspace */}
        <div className="flex rounded-xl bg-[#EEF4FF] p-1 border border-[#DCE6F5] shadow-inner">
          <Link
            href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
            className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-white text-[#2563EB] shadow-xs transition"
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

        {/* Main Credentials Form Card */}
        <div className="rounded-2xl border border-[#DCE6F5] bg-white p-6 sm:p-8 shadow-md space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            {/* Decoy inputs to absorb browser autofill */}
            <input type="text" name="decoy_username" style={{ display: "none" }} tabIndex={-1} />
            <input type="password" name="decoy_password" style={{ display: "none" }} tabIndex={-1} />

            <div>
              <label className="block text-xs font-medium text-[#4A5B78] mb-1.5">Work Email</label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8AA6]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="enterprise_work_email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#4A5B78]">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8AA6]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="enterprise_user_password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 px-4 py-3 text-sm font-bold text-white transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Signing In..." : "Sign In to Workspace"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-xs text-[#4A5B78]">
              New company?{" "}
              <Link
                href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
                className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition"
              >
                Create new workspace &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Collapsible Evaluation / Test Credentials Drawer (Hidden by default for privacy) */}
        <div className="rounded-xl border border-[#DCE6F5] bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowDemoDrawer(!showDemoDrawer)}
            className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-[#4A5B78] hover:text-[#0B1B3A] hover:bg-[#F6F9FF] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Evaluation Test Profiles (Roles &amp; Access Fencing)</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#7B8AA6] transition-transform duration-200 ${showDemoDrawer ? "rotate-180" : ""}`} />
          </button>

          {showDemoDrawer && (
            <div className="px-4 pb-4 pt-2 border-t border-[#DCE6F5] bg-[#F6F9FF]/60 space-y-3 animate-in fade-in duration-150">
              <p className="text-[11px] text-[#4A5B78] leading-relaxed">
                Click a test persona below to auto-fill verified credentials. Each persona validates strict tenant isolation and role permissions:
              </p>

              <div className="grid grid-cols-1 gap-2">
                {/* Acme - Alex Turner */}
                <button
                  type="button"
                  onClick={() => selectDemoAccount("acme")}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    selectedDemo === "acme"
                      ? "border-[#2563EB] bg-white shadow-xs"
                      : "border-[#DCE6F5] bg-white hover:border-blue-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        Acme Corp
                      </span>
                      <span className="text-xs font-bold text-[#0B1B3A]">Alex Turner</span>
                      <span className="text-[10px] font-medium text-[#2563EB] bg-[#EEF4FF] px-1.5 py-0.2 rounded">Owner / Admin</span>
                    </div>
                    <p className="text-[11px] text-[#4A5B78] mt-1 leading-snug">
                      Full access to Acme&apos;s isolated knowledge base, agent roles, evals, and fleet admin. Cannot view Beta Dynamics data.
                    </p>
                  </div>
                  {selectedDemo === "acme" && <Check className="w-4 h-4 text-[#2563EB] shrink-0 ml-2" />}
                </button>

                {/* Beta - Sarah Chen */}
                <button
                  type="button"
                  onClick={() => selectDemoAccount("beta")}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    selectedDemo === "beta"
                      ? "border-[#2563EB] bg-white shadow-xs"
                      : "border-[#DCE6F5] bg-white hover:border-blue-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                        Beta Tech
                      </span>
                      <span className="text-xs font-bold text-[#0B1B3A]">Sarah Chen</span>
                      <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">Owner / Admin</span>
                    </div>
                    <p className="text-[11px] text-[#4A5B78] mt-1 leading-snug">
                      Separate isolated tenant. Verifies that Company B cannot view or access Company A&apos;s chats, API keys, or documents.
                    </p>
                  </div>
                  {selectedDemo === "beta" && <Check className="w-4 h-4 text-[#2563EB] shrink-0 ml-2" />}
                </button>

                {/* Multi - Morgan Lee */}
                <button
                  type="button"
                  onClick={() => selectDemoAccount("multi")}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    selectedDemo === "multi"
                      ? "border-[#2563EB] bg-white shadow-xs"
                      : "border-[#DCE6F5] bg-white hover:border-blue-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Cross-Tenant
                      </span>
                      <span className="text-xs font-bold text-[#0B1B3A]">Morgan Lee</span>
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Consultant</span>
                    </div>
                    <p className="text-[11px] text-[#4A5B78] mt-1 leading-snug">
                      Member of both Acme and Beta. Demonstrates the secure multi-workspace picker modal upon login.
                    </p>
                  </div>
                  {selectedDemo === "multi" && <Check className="w-4 h-4 text-[#2563EB] shrink-0 ml-2" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clean 1-Line Trust Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-[#7B8AA6] pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
          <span>Strict Zero-Leakage isolation &bull; Argon2id password security</span>
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
                  className="w-full p-3.5 rounded-xl border border-[#DCE6F5] hover:border-[#2563EB] bg-white hover:bg-[#EEF4FF] text-left transition flex items-center justify-between group shadow-xs cursor-pointer"
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
                className="px-4 py-2 text-xs font-semibold text-[#4A5B78] hover:text-[#0B1B3A] transition cursor-pointer"
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
