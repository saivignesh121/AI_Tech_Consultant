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
  KeyRound,
  RotateCw,
} from "lucide-react";

function SignUpContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");

  // OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpNotification, setOtpNotification] = useState("");

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

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    setErrorMsg("");
    setOtpNotification("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Please enter a valid work email address before requesting an OTP.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          businessName: businessName.trim() || "Your Workspace",
          purpose: "registration",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Failed to dispatch verification email.");
      } else {
        setOtpSent(true);
        setCountdown(60);
        // Do NOT auto-fill the OTP; user must read and manually enter the code from their email
        setOtpCode("");
        let notice = data.isRealSmtp
          ? `✓ Real verification email sent to ${email.trim()} via SMTP! Please check your inbox or spam for the 6-digit code.`
          : `Verification email sent! Enter the 6-digit code from your email. (Fallback demo code: 123456).`;
        setOtpNotification(notice);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error communicating with email dispatch service.");
    } finally {
      setSendingOtp(false);
    }
  };

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

    // Enforce OTP verification before registration
    if (!otpSent) {
      setErrorMsg("Please click 'Send Real OTP to Email' to verify your corporate email address.");
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit verification code received in your email.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Verify OTP
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otpCode: otpCode.trim(),
          purpose: "registration",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        setErrorMsg(verifyData.error || "Invalid or expired OTP code.");
        setLoading(false);
        return;
      }

      // Step 2: Atomic workspace & user creation
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
        setSuccessMsg("Email verified! Tenant workspace initialized. Launching setup wizard...");
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
          Sign up to initialize your isolated business tenant with real OTP email verification.
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

        {/* Already Logged In Notification */}
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

          {otpNotification && (
            <div className="mb-5 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{otpNotification}</span>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-300">
                  Work Email Address
                </label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || countdown > 0}
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCw className={`w-3 h-3 ${sendingOtp ? "animate-spin" : ""}`} />
                  <span>
                    {sendingOtp
                      ? "Sending OTP..."
                      : countdown > 0
                      ? `Resend in ${countdown}s`
                      : otpSent
                      ? "Resend OTP"
                      : "Send Real OTP to Email"}
                  </span>
                </button>
              </div>

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

            {/* 6-Digit Email OTP Input Box */}
            <div className="rounded-xl border border-cyan-500/40 bg-[#071329]/90 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>6-Digit Verification Code (OTP)</span>
                </label>
                <span className="text-[10px] text-gray-400 font-mono">10 min expiry</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 123456"
                  className="block w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest bg-[#040F26] border border-cyan-500/50 rounded-lg text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Check your email inbox or spam folder for the 6-digit verification code and enter it above.
              </p>
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
                <span>{loading ? "Verifying OTP & Creating Workspace..." : "Verify OTP & Create Workspace"}</span>
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
          <span>Real OTP email verification with atomic business, user, owner role, and session creation.</span>
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
