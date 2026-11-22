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
} from "lucide-react";

interface UserSessionType {
  userEmail: string;
  businessName: string;
  businessSlug: string;
}

// Module-level cache to eliminate layout shift / fluctuation on page navigation
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
  const [isLoaded, setIsLoaded] = useState(isSessionFetched);

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
          setIsLoaded(true);
        })
        .catch((e) => {
          console.error(e);
          isSessionFetched = true;
          setIsLoaded(true);
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

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Contact us", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#DCE6F5] bg-white/95 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-[#0284C7] to-[#2563EB] text-white font-serif text-xl font-bold shadow-sm group-hover:scale-105 transition">
            α
          </div>
          <span className="text-base font-bold tracking-tight text-[#0B1B3A] group-hover:text-[#2563EB] transition whitespace-nowrap">
            AI Technologies &amp; Consulting
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-150 py-1 relative ${
                  isActive
                    ? "text-[#2563EB] font-semibold after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:bg-[#2563EB]"
                    : "text-[#4A5B78] hover:text-[#2563EB]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 min-h-[36px]">
          {userSession ? (
            <>
              <Link
                href="/chat"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200 bg-[#EEF4FF] hover:bg-[#E0EDFF] text-[#1D4ED8] text-xs font-semibold transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>AI Consultant</span>
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#DCE6F5] text-xs text-[#0B1B3A] hover:border-[#BFDBFE] hover:bg-[#F6F9FF] transition shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span className="max-w-[120px] truncate">{userSession.businessName}</span>
              </Link>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-[#7B8AA6] hover:text-red-600 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="px-3 py-1.5 text-xs font-medium text-[#4A5B78] hover:text-[#1D4ED8] transition"
              >
                Sign In
              </Link>

              <Link
                href="/signup?redirect=/chat"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200 bg-[#EEF4FF] hover:bg-[#E0EDFF] text-[#1D4ED8] text-xs font-semibold transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Launch AI Consultant</span>
              </Link>
            </>
          )}

          <Link
            href="/contact"
            className="px-6 py-2 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition shadow-sm"
          >
            Contact us
          </Link>
        </div>

        {/* Mobile Menu Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[#4A5B78] hover:text-[#0B1B3A] hover:bg-[#EEF4FF] transition"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#DCE6F5] bg-white px-4 pt-3 pb-5 space-y-3 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-[#4A5B78] hover:text-[#0B1B3A] hover:bg-[#EEF4FF] transition"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-[#DCE6F5] flex flex-col gap-2">
            {userSession ? (
              <>
                <Link
                  href="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow-sm transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch AI Consultant</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="py-2 text-xs text-red-600 hover:text-red-700"
                >
                  Sign Out ({userSession.userEmail})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup?redirect=/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-2 rounded-full border border-blue-200 bg-[#EEF4FF] text-[#1D4ED8] text-xs font-semibold"
                >
                  <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                  <span>Launch with AI Consultant (Register)</span>
                </Link>
                <Link
                  href="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold text-center shadow-sm transition"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
