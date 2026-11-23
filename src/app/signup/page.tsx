"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
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
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";

function SignUpContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";

  // Registration Form State - All fields start completely empty
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState("");

  // OTP Verification State
  const [step, setStep] = useState<"fill_details" | "enter_otp">("fill_details");
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpNotification, setOtpNotification] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Focus OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === "enter_otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Step 1: Send OTP to User's Email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setOtpNotification("");

    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Please enter a valid corporate work email address.");
      return;
    }

    if (!password || password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (!businessName.trim()) {
      setErrorMsg("Please enter your business or company name.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          businessName: businessName.trim(),
          purpose: "registration",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Failed to dispatch verification email.");
      } else {
        setCountdown(60);
        setOtpCode("");
        setStep("enter_otp");
        const notice = data.isRealSmtp
          ? `✓ 6-digit verification code sent to ${email.trim()}! Please check your inbox or spam.`
          : `Verification code dispatched! Enter the 6-digit code received in your email.`;
        setOtpNotification(notice);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error communicating with email dispatch service.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP and Atomically Create Workspace & Session
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifying(true);

    try {
      // 1. Verify OTP with backend
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otpCode: cleanOtp,
          purpose: "registration",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        setErrorMsg(verifyData.error || "Invalid or expired verification code. Please check your email or click resend.");
        setVerifying(false);
        return;
      }

      // 2. Register Tenant & Create Owner Session
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          businessName: businessName.trim(),
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok || registerData.error) {
        setErrorMsg(registerData.error || "Workspace creation failed. Please try again.");
      } else {
        const destination = redirectParam || registerData.redirectUrl || "/onboarding";
        setSuccessMsg("✓ Email verified! Tenant workspace initialized. Redirecting to onboarding...");
        setTimeout(() => {
          window.location.href = destination;
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error occurred during workspace registration.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[300px] bg-indigo-500/8 blur-[130px] rounded-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-serif text-2xl font-bold shadow-sm group-hover:brightness-105 transition">
            α
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[#0B1B3A] group-hover:text-[#2563EB] transition">
            AI Technologies &amp; Consulting
          </span>
        </Link>
        <p className="text-xs text-[#4A5B78] max-w-sm mx-auto">
          Create your tenant-isolated business workspace with verified email security.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 space-y-4 relative z-10">
        {/* Tab Toggle: Sign In vs Register (Sign Up) in --surface-subtle with white active pill */}
        <div className="flex rounded-xl bg-[#EEF4FF] p-1 border border-[#DCE6F5] shadow-inner">
          <Link
            href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
            className="flex-1 py-2 text-center text-xs font-semibold rounded-lg text-[#4A5B78] hover:text-[#0B1B3A] transition"
          >
            Sign In
          </Link>
          <Link
            href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
            className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-white text-[#2563EB] shadow-sm transition"
          >
            Create Workspace (Sign Up)
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-[#DCE6F5] sm:px-10">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {otpNotification && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0369A1] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <span>{otpNotification}</span>
            </div>
          )}

          {step === "fill_details" ? (
            /* STEP 1: Registration Information Form */
            <form onSubmit={handleSendOtp} autoComplete="off" className="space-y-4">
              {/* Decoy inputs to absorb browser autofill */}
              <input type="text" name="decoy_username" style={{ display: "none" }} tabIndex={-1} />
              <input type="password" name="decoy_password" style={{ display: "none" }} tabIndex={-1} />

              <div>
                <label className="block text-xs font-medium text-[#4A5B78] mb-1">
                  Full Name
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8AA6]">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Turner"
                    className="block w-full pl-10 pr-3 py-2 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5B78] mb-1">
                  Work Email Address
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8AA6]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@acmecorp.com"
                    className="block w-full pl-10 pr-3 py-2 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#4A5B78]">
                    Password (min. 8 characters)
                  </label>
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
                    name="new_account_password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="block w-full pl-10 pr-10 py-2 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5B78] mb-1">
                  Business / Company Name
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8AA6]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="block w-full pl-10 pr-3 py-2 text-sm bg-white border border-[#C3D3EA] rounded-lg text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 focus:outline-none transition disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${sendingOtp ? "animate-spin" : ""}`} />
                  <span>{sendingOtp ? "Sending 6-Digit OTP..." : "Send Verification Code (OTP) →"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Simplified 6-Digit OTP Entry with Instant Redirect */
            <form onSubmit={handleVerifyOtpAndRegister} autoComplete="off" className="space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] mb-1">
                  <KeyRound className="w-6 h-6 text-[#2563EB]" />
                </div>
                <h3 className="text-base font-bold text-[#0B1B3A]">
                  Enter 6-Digit Verification Code
                </h3>
                <p className="text-xs text-[#4A5B78]">
                  Code dispatched to <strong className="text-[#0B1B3A]">{email}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    className="block w-full px-4 py-3 text-center text-2xl font-mono font-extrabold tracking-[0.5em] bg-[#EEF4FF] border-2 border-[#BFDBFE] rounded-xl text-[#1D4ED8] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-blue-500/20"
                  />
                </div>
                <p className="text-[11px] text-center text-[#7B8AA6]">
                  Check your inbox or spam folder &bull; Code expires in 10 minutes
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={verifying || otpCode.trim().length < 6}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 focus:outline-none transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{verifying ? "Verifying & Initializing Workspace..." : "Verify OTP & Launch Workspace →"}</span>
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("fill_details");
                      setErrorMsg("");
                    }}
                    className="text-xs font-medium text-[#4A5B78] hover:text-[#0B1B3A] flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Edit details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={sendingOtp || countdown > 0}
                    className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition disabled:opacity-50"
                  >
                    {sendingOtp
                      ? "Resending..."
                      : countdown > 0
                      ? `Resend in ${countdown}s`
                      : "Resend Code"}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-6 text-center border-t border-[#DCE6F5] pt-4">
            <p className="text-xs text-[#4A5B78]">
              Already have an account?{" "}
              <Link
                href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
                className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition"
              >
                Sign in to your workspace &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Security & Isolation Guarantee Note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#7B8AA6] text-center">
          <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
          <span>Strict Zero-Leakage isolation &bull; Real OTP email verification</span>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F6F9FF] flex items-center justify-center text-[#2563EB]">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
