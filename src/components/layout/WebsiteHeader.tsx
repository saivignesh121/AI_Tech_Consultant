"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Building2,
  LogOut,
  ChevronDown,
  Brain,
  ShieldCheck,
  Server,
  FlaskConical,
  MessageSquare,
  Layers,
  Lock,
  Cpu,
} from "lucide-react";

interface UserSessionType {
  userEmail: string;
  businessName: string;
  businessSlug: string;
}

// Module-level cache to eliminate layout shift on page navigation
let cachedUserSession: UserSessionType | null = null;
let isSessionFetched = false;

export default function WebsiteHeader({
  onConnectClick,
}: {
  onConnectClick?: () => void;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<UserSessionType | null>(cachedUserSession);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isSessionFetched) {
      fetch("/api/auth/context")
        .then((r) => r.json())
        .then((d) => {
          isSessionFetched = true;
          if (d.currentTenant && d.currentTenant.userEmail) {
            const sess: UserSessionType = {
              userEmail: d.currentTenant.userEmail,
              businessName: d.currentTenant.businessName,
              businessSlug: d.currentTenant.businessSlug,
            };
            cachedUserSession = sess;
            setUserSession(sess);
          } else {
            cachedUserSession = null;
            setUserSession(null);
          }
        })
        .catch((e) => {
          console.error(e);
          isSessionFetched = true;
        });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      cachedUserSession = null;
      isSessionFetched = false;
      window.location.href = "/signin";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#DCE6F5] bg-white/95 backdrop-blur-xl shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo - Proteus Vision AI */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex items-center">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#0066CC] flex items-center group-hover:text-[#0052A3] transition">
              PROTEUS
            </span>
            {/* Geometric Cyan Upward Triangle Mark */}
            <span className="inline-block w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-[#06B6D4] ml-1 mb-1 transform group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-center border-l border-[#DCE6F5] pl-2.5 ml-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              Vision AI
            </span>
          </div>
        </Link>

        {/* Clean, Focused Core Navigation (No Bloat, No Wrapping) */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link
            href="/"
            className={`text-sm font-semibold transition-colors duration-150 py-1 relative ${
              pathname === "/"
                ? "text-[#0066CC] font-bold after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:bg-[#0066CC]"
                : "text-[#4A5B78] hover:text-[#0066CC]"
            }`}
          >
            Home
          </Link>

          {/* Solutions Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setSolutionsDropdownOpen(true)}
            onMouseLeave={() => setSolutionsDropdownOpen(false)}
          >
            <button
              onClick={() => setSolutionsDropdownOpen(!solutionsDropdownOpen)}
              className={`text-sm font-semibold transition-colors duration-150 py-1 flex items-center gap-1 cursor-pointer ${
                solutionsDropdownOpen ? "text-[#0066CC]" : "text-[#4A5B78] hover:text-[#0066CC]"
              }`}
            >
              <span>Solutions</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  solutionsDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {solutionsDropdownOpen && (
              <div className="absolute top-full left-0 w-80 bg-white rounded-2xl shadow-2xl border border-[#DCE6F5] p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <Link
                  href="/knowledge"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#EEF4FF] transition group"
                >
                  <div className="p-2 rounded-lg bg-[#E6F8F9] text-cyan-700 mt-0.5">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1B3A] group-hover:text-[#0066CC] transition">
                      The Knowledge Brain
                    </div>
                    <div className="text-[11px] text-[#7B8AA6] leading-tight mt-0.5">
                      Hybrid pgvector vector search &amp; sitemap crawler
                    </div>
                  </div>
                </Link>

                <Link
                  href="/chat"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#EEF4FF] transition group"
                >
                  <div className="p-2 rounded-lg bg-[#EEF5FD] text-blue-700 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1B3A] group-hover:text-[#0066CC] transition">
                      Ask &amp; Teach Consultant
                    </div>
                    <div className="text-[11px] text-[#7B8AA6] leading-tight mt-0.5">
                      Grounding with dynamic citations &amp; safety shield
                    </div>
                  </div>
                </Link>

                <Link
                  href="/settings/roles-prompts"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#EEF4FF] transition group"
                >
                  <div className="p-2 rounded-lg bg-[#FFF4E8] text-amber-700 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1B3A] group-hover:text-[#0066CC] transition">
                      Role &amp; Security Studio
                    </div>
                    <div className="text-[11px] text-[#7B8AA6] leading-tight mt-0.5">
                      Fenced agent skills &amp; human escalation valve
                    </div>
                  </div>
                </Link>

                <Link
                  href="/evals"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#EEF4FF] transition group"
                >
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-700 mt-0.5">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1B3A] group-hover:text-[#0066CC] transition">
                      The Eval Lab &amp; Router
                    </div>
                    <div className="text-[11px] text-[#7B8AA6] leading-tight mt-0.5">
                      180-case benchmark harness &amp; LLM-as-a-Judge
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/#engines"
            className="text-sm font-semibold text-[#4A5B78] hover:text-[#0066CC] transition-colors duration-150 py-1"
          >
            Architecture
          </Link>

          <Link
            href="/#security"
            className="text-sm font-semibold text-[#4A5B78] hover:text-[#0066CC] transition-colors duration-150 py-1"
          >
            Security &amp; Isolation
          </Link>

          <Link
            href="/evals"
            className="text-sm font-semibold text-[#4A5B78] hover:text-[#0066CC] transition-colors duration-150 py-1 flex items-center gap-1.5"
          >
            <span>14 Models</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Free Tier
            </span>
          </Link>
        </nav>

        {/* Right Action Area - Tailored for Business Users & Authentication */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 min-h-[38px]">
          {userSession ? (
            /* Logged In State: Active Workspace Badge + Direct Dashboard Access */
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EEF4FF] border border-blue-200 text-xs font-semibold text-[#1D4ED8]">
                <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="max-w-[130px] truncate">{userSession.businessName}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Isolated
                </span>
              </div>

              <Link
                href="/onboarding"
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white text-xs font-bold transition shadow-sm hover:shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span>Workspace Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-[#7B8AA6] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Logged Out State: Clear Sign In for Existing Users & Register Workspace for Business Leaders */
            <>
              <Link
                href="/signin"
                className="px-4 py-2 text-xs font-bold text-[#4A5B78] hover:text-[#0066CC] transition"
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white text-xs font-bold transition shadow-sm hover:shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 animate-shimmer-sweep"
              >
                <span>Register Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={onConnectClick || (() => (window.location.href = "/contact"))}
                className="px-4 py-2 rounded-full border border-[#DCE6F5] hover:border-blue-300 hover:bg-[#EEF4FF] text-[#0B1B3A] text-xs font-semibold transition cursor-pointer"
              >
                Book Demo
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-[#4A5B78] hover:text-[#0B1B3A] hover:bg-[#EEF4FF] transition"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#DCE6F5] bg-white px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-bold text-[#0066CC] bg-[#EEF4FF]"
          >
            Home
          </Link>

          <div className="px-3 py-1 text-xs font-bold text-[#7B8AA6] uppercase tracking-wider">
            Solutions
          </div>
          <Link
            href="/knowledge"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-5 py-1.5 text-sm font-medium text-[#0B1B3A] hover:text-[#0066CC]"
          >
            The Knowledge Brain
          </Link>
          <Link
            href="/chat"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-5 py-1.5 text-sm font-medium text-[#0B1B3A] hover:text-[#0066CC]"
          >
            Ask &amp; Teach Consultant
          </Link>
          <Link
            href="/settings/roles-prompts"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-5 py-1.5 text-sm font-medium text-[#0B1B3A] hover:text-[#0066CC]"
          >
            Role &amp; Security Studio
          </Link>
          <Link
            href="/evals"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-5 py-1.5 text-sm font-medium text-[#0B1B3A] hover:text-[#0066CC]"
          >
            The Eval Lab &amp; 14 Models
          </Link>

          <div className="pt-3 border-t border-[#DCE6F5] space-y-2">
            {userSession ? (
              <>
                <Link
                  href="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] to-[#2563EB] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Open Workspace Hub ({userSession.businessName})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-center py-2 text-xs text-red-600 font-semibold"
                >
                  Sign Out ({userSession.userEmail})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] to-[#2563EB] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Register Workspace (Sign Up)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 rounded-full border border-[#DCE6F5] text-xs font-semibold text-[#4A5B78]"
                >
                  Sign In to Existing Workspace
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
