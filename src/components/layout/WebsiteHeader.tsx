"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Building2,
  ChevronDown,
  User,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

export default function WebsiteHeader({
  onConnectClick,
}: {
  onConnectClick?: () => void;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Careers", href: "/careers" },
    { label: "Contact us", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800/80 bg-[#050B18]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo matching user screenshot */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black border border-gray-700 text-white font-serif text-xl font-bold shadow-md shadow-cyan-500/10 group-hover:border-cyan-400 transition">
            α
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-300 transition">
              AI Technologies &amp; Consulting
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links matching user screenshot */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  isActive
                    ? "text-cyan-400 font-semibold"
                    : "text-gray-300 hover:text-white hover:text-cyan-300"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Consultant</span>
          </Link>

          <button
            onClick={onConnectClick}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-md shadow-cyan-500/25"
          >
            <span>Connect with us</span>
          </button>
        </div>

        {/* Mobile Menu Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-800 bg-[#071126] px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-800 flex flex-col gap-2">
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs font-semibold"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Launch AI Consultant Chat</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onConnectClick?.();
              }}
              className="w-full py-2.5 rounded-lg bg-cyan-500 text-black text-xs font-bold text-center"
            >
              Connect with us
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
