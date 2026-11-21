"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Brain,
  MessageSquare,
  Sparkles,
  FlaskConical,
  RefreshCw,
  Settings,
  ShieldCheck,
  Server,
  Building2,
  ChevronDown,
  Check,
  LogOut,
  User,
  PlusCircle,
  ArrowRight,
} from "lucide-react";

interface TenantContext {
  businessId: string;
  businessName: string;
  businessSlug: string;
  userEmail: string;
  userRole: string;
  userId?: string;
}

export default function AppShell({
  children,
  breadcrumbs = [],
}: {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentTenant, setCurrentTenant] = useState<TenantContext>({
    businessId: "11111111-1111-4111-8111-111111111111",
    businessName: "Acme Corporation",
    businessSlug: "acme-corp",
    userEmail: "alex@acme.com",
    userRole: "owner",
  });
  const [allTenants, setAllTenants] = useState<TenantContext[]>([]);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [localOnlyMode, setLocalOnlyMode] = useState(false);
  const [switching, setSwitching] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const tenantMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch auth context
    fetch("/api/auth/context")
      .then((res) => res.json())
      .then((data) => {
        if (data.currentTenant) setCurrentTenant(data.currentTenant);
        if (data.workspaces) setAllTenants(data.workspaces);
      })
      .catch(console.error);

    // Fetch local mode state
    fetch("/api/settings/local-mode")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.localOnlyMode === "boolean") setLocalOnlyMode(data.localOnlyMode);
      })
      .catch(console.error);

    // Click outside listener
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (tenantMenuRef.current && !tenantMenuRef.current.contains(event.target as Node)) {
        setTenantDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchTenant = async (slug: string) => {
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: slug }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentTenant(data.activeTenant);
        setTenantDropdownOpen(false);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      window.location.href = "/signin";
    }
  };

  const toggleLocalMode = async () => {
    const nextVal = !localOnlyMode;
    setLocalOnlyMode(nextVal);
    await fetch("/api/settings/local-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextVal }),
    });
    router.refresh();
  };

  const getInitials = (emailStr: string) => {
    if (!emailStr) return "AI";
    const prefix = emailStr.split("@")[0].replace(/[^a-zA-Z]/g, "");
    return prefix.substring(0, 2).toUpperCase() || "AI";
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "15-Min Onboarding", href: "/onboarding", icon: Sparkles },
    { label: "Knowledge Brain", href: "/knowledge", icon: Brain },
    { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
    { label: "Role & Prompt Studio", href: "/settings/roles-prompts", icon: Sparkles },
    { label: "The Eval Lab", href: "/evals", icon: FlaskConical },
    { label: "Self-Improve Loop", href: "/self-improve", icon: RefreshCw },
    { label: "Settings & Keys", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-[#0E1322] flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-gray-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">AI Tech Consultant</h1>
              <span className="text-[11px] text-gray-400">Enterprise SaaS</span>
            </div>
          </Link>

          {/* Active Workspace Selector in Sidebar */}
          <div className="relative mb-6" ref={tenantMenuRef}>
            <button
              onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
              className="w-full text-left rounded-lg border border-gray-800 bg-gray-900/60 p-2.5 hover:border-gray-700 transition flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-indigo-400" />
                  Active Workspace
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-white truncate max-w-[130px]">
                    {currentTenant.businessName}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-medium text-emerald-400 border border-emerald-500/20">
                    Isolated
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {tenantDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-gray-700 bg-[#141A2D] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
                  Switch Tenant Workspace
                </div>
                {allTenants.map((t) => {
                  const isActive = t.businessSlug === currentTenant.businessSlug;
                  return (
                    <button
                      key={t.businessSlug}
                      onClick={() => switchTenant(t.businessSlug)}
                      disabled={switching}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30"
                          : "text-gray-300 hover:bg-gray-800/80"
                      }`}
                    >
                      <div className="text-left truncate mr-2">
                        <div className="font-semibold text-white truncate">{t.businessName}</div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">{t.businessSlug}</div>
                      </div>
                      {isActive && <Check className="h-4 w-4 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
                <div className="border-t border-gray-700/60 my-1 pt-1 space-y-1">
                  <Link
                    href="/signin"
                    onClick={() => setTenantDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-300 hover:text-white rounded-lg hover:bg-indigo-950/30 transition"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Workspace Picker / Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setTenantDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-950/30 transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Create New Workspace</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                      : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Local-Only Mode Pill */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-gray-400" />
              Local-Only Mode
            </span>
            <button
              onClick={toggleLocalMode}
              className={`text-[10px] rounded px-2 py-0.5 font-mono font-medium transition ${
                localOnlyMode
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {localOnlyMode ? "ON" : "OFF"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {localOnlyMode
              ? "Local Ollama active (localhost:11434). Cloud APIs bypassed."
              : "Running 14-model cloud router. Toggle to use laptop Ollama."}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-gray-800 px-8 flex items-center justify-between bg-[#0E1322]/80 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">{currentTenant.businessName}</span>
            <span className="text-gray-600">/</span>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc.label}>
                {idx > 0 && <span className="text-gray-600">/</span>}
                {bc.href ? (
                  <Link href={bc.href} className="text-gray-400 hover:text-white transition">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-white">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
            {breadcrumbs.length === 0 && (
              <span className="font-semibold text-white">Executive Operations Hub</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              Prompt Injection Shield Active
            </span>

            {/* Interactive User Account Section & Dropdown Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl border border-gray-800 bg-gray-900/80 hover:border-indigo-500/50 hover:bg-gray-800 transition focus:outline-none"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  {getInitials(currentTenant.userEmail)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {currentTenant.userEmail}
                  </div>
                  <div className="text-[10px] text-gray-400 capitalize flex items-center gap-1.5 mt-0.5">
                    <span className="text-indigo-400 font-medium truncate max-w-[100px]">{currentTenant.businessName}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-semibold">{currentTenant.userRole}</span>
                  </div>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* User Account Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-gray-700 bg-[#141A2D] p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Account Header */}
                  <div className="pb-3 mb-2 border-b border-gray-700/80">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
                        {getInitials(currentTenant.userEmail)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">{currentTenant.userEmail}</div>
                        <div className="text-[11px] text-gray-400 truncate">{currentTenant.businessName}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                        {currentTenant.businessSlug}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30 uppercase">
                        {currentTenant.userRole}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                    >
                      <LayoutDashboard className="h-4 w-4 text-indigo-400" />
                      <span>Dashboard Hub</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      <span>Workspace Settings & Keys</span>
                    </Link>

                    <Link
                      href="/onboarding"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                    >
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>15-Minute Setup Wizard</span>
                    </Link>
                  </div>

                  {/* Registration and Sign In Options */}
                  <div className="border-t border-gray-700/80 my-2 pt-2 space-y-1">
                    <Link
                      href="/signin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-indigo-300 hover:text-white rounded-lg hover:bg-indigo-950/40 transition"
                    >
                      <Building2 className="h-4 w-4 text-indigo-400" />
                      <span>Switch Workspace / Sign In</span>
                    </Link>

                    <Link
                      href="/signup"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-950/40 transition"
                    >
                      <PlusCircle className="h-4 w-4 text-emerald-400" />
                      <span>Register New Workspace (Sign Up)</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-gray-700/80 my-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/30 transition text-left"
                    >
                      <LogOut className="h-4 w-4 text-red-400" />
                      <span>Sign Out (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 max-w-7xl w-full">{children}</div>
      </main>
    </div>
  );
}
