"use client";

import React, { useState, useEffect } from "react";
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
  ExternalLink,
} from "lucide-react";

interface TenantContext {
  businessId: string;
  businessName: string;
  businessSlug: string;
  userEmail: string;
  userRole: string;
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
  const [localOnlyMode, setLocalOnlyMode] = useState(false);
  const [switching, setSwitching] = useState(false);

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
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
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

          {/* Active Workspace Pill & Dropdown */}
          <div className="relative mb-6">
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
              <div className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-gray-700 bg-[#141A2D] p-2 shadow-2xl z-50">
                <div className="text-[10px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
                  Switch Tenant (Zero Leakage)
                </div>
                {allTenants.map((t) => {
                  const isActive = t.businessSlug === currentTenant.businessSlug;
                  return (
                    <button
                      key={t.businessSlug}
                      onClick={() => switchTenant(t.businessSlug)}
                      disabled={switching}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md transition ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30"
                          : "text-gray-300 hover:bg-gray-800/80"
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{t.businessName}</div>
                        <div className="text-[10px] text-gray-500">{t.userEmail}</div>
                      </div>
                      {isActive && <Check className="h-4 w-4 text-indigo-400" />}
                    </button>
                  );
                })}
                <div className="border-t border-gray-700/60 my-1 pt-1">
                  <Link
                    href="/signin"
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white rounded hover:bg-gray-800"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Switch or Sign In
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
        <header className="h-16 border-b border-gray-800 px-8 flex items-center justify-between bg-[#0E1322]/50 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">{currentTenant.businessName}</span>
            <span className="text-gray-600">/</span>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc.label}>
                {idx > 0 && <span className="text-gray-600">/</span>}
                {bc.href ? (
                  <Link href={bc.href} className="text-gray-400 hover:text-white">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="font-medium text-white">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
            {breadcrumbs.length === 0 && (
              <span className="font-medium text-white">Executive Operations Hub</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              Prompt Injection Shield Active
            </span>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white shadow-md">
                {currentTenant.businessSlug === "acme-corp" ? "AC" : "BD"}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-white">{currentTenant.userEmail}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider capitalize">
                  {currentTenant.userRole}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 max-w-7xl w-full">{children}</div>
      </main>
    </div>
  );
}
