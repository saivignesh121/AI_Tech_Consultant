"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  User,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

function SignUpContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeSession, setActiveSession] = useState<{
    userEmail: string;
    businessName: string;
    userRole: string;
  } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim() || !email.trim() || !password || !businessName.trim()) {
      setErrorMsg("Please fill out all registration fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          businessName: businessName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Registration failed. Please try again.");
      } else {
        const destination = redirectParam || data.redirectUrl || "/onboarding";
        setSuccessMsg("Account and workspace created! Launching setup...");
        setTimeout(() => {
          window.location.href = destination;
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[300px] bg-indigo-600/10 blur-[130px] rounded-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black border border-gray-700 text-white font-serif text-2xl font-bold shadow-md shadow-cyan-500/20 group-hover:border-cyan-400 transition">
            α
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-cyan-300 transition">
            AI Technologies &amp; Consulting
          </span>
        </Link>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Sign up to initialize your isolated business tenant and launch the autonomous AI consultant.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 space-y-4 relative z-10">
        {/* Tab Toggle: Sign In vs Register (Sign Up) */}
        <div className="flex rounded-xl bg-[#071329] p-1 border border-cyan-950/60 shadow-inner">
          <Link
            href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
            className="flex-1 py-2 text-center text-xs font-semibold rounded-lg text-gray-400 hover:text-cyan-300 transition"
          >
            Sign In
          </Link>
          <Link
            href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
            className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-cyan-500 text-black shadow-md shadow-cyan-500/25 transition"
          >
            Create Workspace (Sign Up)
          </Link>
        </div>

        {/* Already Logged In / User Present Notification */}
        {activeSession && (
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-300">
                Signed in as: <strong className="text-white">{activeSession.userEmail}</strong>
              </div>
              <div className="text-[11px] text-cyan-400 font-medium mt-0.5">
                {activeSession.businessName} &bull; <span className="capitalize">{activeSession.userRole}</span>
              </div>
            </div>
            <Link
              href={redirectParam || "/"}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-md shadow-cyan-500/20 shrink-0"
            >
              <span>{redirectParam ? "Proceed" : "Dashboard"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="bg-[#040f26]/90 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-cyan-500/10 rounded-2xl border border-cyan-500/30 sm:px-10">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Turner"
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-[#071329] border border-cyan-950/60 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Work Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@acmecorp.com"
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-[#071329] border border-cyan-950/60 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Password (min. 8 characters)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-[#071329] border border-cyan-950/60 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Business / Company Name
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Building2 className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-[#071329] border border-cyan-950/60 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/25 text-sm font-bold text-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 focus:outline-none transition disabled:opacity-50"
              >
                <span>{loading ? "Creating Tenant Workspace..." : "Create Account & Workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Already have an account?{" "}
              <Link
                href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
                className="font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                Sign in to your workspace &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Security & Isolation Guarantee Note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 text-center">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Atomic registration in 1 transaction with owner role &amp; Postgres session scoping.</span>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050B18] flex items-center justify-center text-cyan-400">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
