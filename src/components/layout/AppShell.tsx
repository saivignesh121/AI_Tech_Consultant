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
  ShieldAlert,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from "lucide-react";

export type AppUserRole = "owner" | "admin" | "team" | "expert" | "member";

interface TenantContext {
  businessId: string;
  businessName: string;
  businessSlug: string;
  userEmail: string;
  userRole: AppUserRole;
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
  const [switchingRole, setSwitchingRole] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const tenantMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch auth context
    fetch("/api/auth/context")
      .then((res) => res.json())
      .then((data) => {
        if (data.currentTenant && data.currentTenant.userEmail) {
          setCurrentTenant(data.currentTenant);
          if (data.workspaces) setAllTenants(data.workspaces);
        } else {
          // Gated access: Only after registration / signin can user enter inside workspace pages
          const publicRoutes = ["/", "/about", "/services", "/contact", "/signin", "/signup"];
          if (!publicRoutes.includes(pathname)) {
            window.location.href = `/signup?redirect=${encodeURIComponent(pathname)}`;
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });

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
  }, [pathname]);

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

  const switchRole = async (role: AppUserRole) => {
    setSwitchingRole(true);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentTenant(data.activeTenant);
        setUserMenuOpen(false);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwitchingRole(false);
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

  // --- Dynamic Role-Tailored Navigation Items ---
  const role = currentTenant.userRole || "owner";

  let navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "15-Min Onboarding", href: "/onboarding", icon: Sparkles },
    { label: "Knowledge Brain", href: "/knowledge", icon: Brain },
    { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
    { label: "Role & Prompt Studio", href: "/settings/roles-prompts", icon: Sparkles },
    { label: "The Eval Lab", href: "/evals", icon: FlaskConical },
    { label: "Self-Improve Loop", href: "/self-improve", icon: RefreshCw },
    { label: "Approvals Inbox", href: "/approvals", icon: CheckCircle2 },
    { label: "Settings & Keys", href: "/settings", icon: Settings },
  ];

  if (role === "team" || role === "member") {
    navItems = [
      { label: "Dashboard Hub", href: "/", icon: LayoutDashboard },
      { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
      { label: "Knowledge Brain", href: "/knowledge", icon: Brain },
    ];
  } else if (role === "expert") {
    navItems = [
      { label: "Dashboard Hub", href: "/", icon: LayoutDashboard },
      { label: "Approvals Inbox", href: "/approvals", icon: CheckCircle2 },
      { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
      { label: "Knowledge Brain", href: "/knowledge", icon: Brain },
      { label: "The Eval Lab", href: "/evals", icon: FlaskConical },
    ];
  } else if (role === "admin" || role === "owner") {
    navItems = [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "15-Min Onboarding", href: "/onboarding", icon: Sparkles },
      { label: "Knowledge Brain", href: "/knowledge", icon: Brain },
      { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
      { label: "Role & Prompt Studio", href: "/settings/roles-prompts", icon: Sparkles },
      { label: "The Eval Lab", href: "/evals", icon: FlaskConical },
      { label: "Self-Improve Loop", href: "/self-improve", icon: RefreshCw },
      { label: "Approvals Inbox", href: "/approvals", icon: CheckCircle2 },
      { label: "Settings & Keys", href: "/settings", icon: Settings },
      { label: "Platform Fleet Admin", href: "/admin", icon: ShieldAlert },
    ];
  }

  // --- Granular Route Access Control Enforcement ---
  const isTeam = role === "team" || role === "member";
  const isExpert = role === "expert";
  const isAdmin = role === "admin";
  const isOwner = role === "owner";

  let accessDeniedReason: string | null = null;
  let requiredRole: string | null = null;

  if (pathname.startsWith("/admin") && !isAdmin && !isOwner) {
    accessDeniedReason = "Platform Admin Fleet Access: Only the SaaS Operator or Workspace Admin can access the fleet governance dashboard.";
    requiredRole = "Platform Admin (admin) or Business Owner (owner)";
  } else if (pathname.startsWith("/approvals") && !isExpert && !isOwner && !isAdmin) {
    accessDeniedReason = "Approvals Inbox Access: Only the Expert / Approver or Business Owner/Admin can review escalations, approve learned skills, and merge PRs.";
    requiredRole = "Expert / Approver (expert) or Business Owner (owner)";
  } else if (isTeam && (pathname.startsWith("/settings") || pathname.startsWith("/onboarding") || pathname.startsWith("/evals") || pathname.startsWith("/self-improve"))) {
    accessDeniedReason = "Admin Privilege Required: As a Team Member (Support Specialist), you have access to Ask & Teach Chat and the Knowledge Base. Settings, API vault keys, prompt editing, and workspace onboarding are restricted to Business Owners and Admins.";
    requiredRole = "Business Owner (owner) or Admin (admin)";
  } else if (isExpert && pathname.startsWith("/settings")) {
    accessDeniedReason = "Admin Privilege Required: As an Expert / Approver, you have authority over escalations, lessons, and PRs. Modifying raw API vault keys or deleting the business is reserved for the Business Owner or Admin.";
    requiredRole = "Business Owner (owner) or Admin (admin)";
  }

  return (
    <div className="flex min-h-screen bg-[#050B18] text-gray-100 selection:bg-cyan-500 selection:text-black font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-cyan-950/40 bg-[#040b1a] flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-gray-800/80 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black border border-gray-700 text-white font-serif text-xl font-bold shadow-md shadow-cyan-500/20 group-hover:border-cyan-400 transition">
              α
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white group-hover:text-cyan-300 transition">
                AI Technologies &amp; Consulting
              </h1>
              <span className="text-[10px] font-mono text-cyan-400">Enterprise Operations</span>
            </div>
          </Link>

          {/* Active Workspace Selector in Sidebar */}
          <div className="relative mb-6" ref={tenantMenuRef}>
            <button
              onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
              className="w-full text-left rounded-xl border border-cyan-500/30 bg-[#071329] p-2.5 hover:border-cyan-400/60 transition flex items-center justify-between shadow-sm"
            >
              <div>
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-cyan-400" />
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
              <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-cyan-500/30 bg-[#071329] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-semibold text-cyan-400 px-2 py-1 uppercase tracking-wider">
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
                          ? "bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30"
                          : "text-gray-300 hover:bg-gray-800/80"
                      }`}
                    >
                      <div className="text-left truncate mr-2">
                        <div className="font-semibold text-white truncate">{t.businessName}</div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">{t.businessSlug}</div>
                      </div>
                      {isActive && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
                <div className="border-t border-gray-700/60 my-1 pt-1 space-y-1">
                  <Link
                    href="/signin"
                    onClick={() => setTenantDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-cyan-300 hover:text-white rounded-lg hover:bg-cyan-950/30 transition"
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
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)] font-semibold"
                      : "text-gray-400 hover:bg-cyan-950/20 hover:text-cyan-200"
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
        <div className="rounded-xl border border-cyan-950/60 bg-[#071329]/80 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-300 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-cyan-400" />
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
        <header className="h-16 border-b border-cyan-950/40 px-8 flex items-center justify-between bg-[#050B18]/90 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">{currentTenant.businessName}</span>
            <span className="text-gray-600">/</span>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc.label}>
                {idx > 0 && <span className="text-gray-600">/</span>}
                {bc.href ? (
                  <Link href={bc.href} className="text-gray-400 hover:text-cyan-300 transition">
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
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Prompt Injection Shield Active
            </span>

            {/* Interactive User Account Section & Role Switcher */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl border border-cyan-950/60 bg-[#071329] hover:border-cyan-500/40 hover:bg-[#091834] transition focus:outline-none"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-xs text-black shadow-md shadow-cyan-500/20">
                  {getInitials(currentTenant.userEmail)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {currentTenant.userEmail}
                  </div>
                  <div className="text-[10px] text-gray-400 capitalize flex items-center gap-1.5 mt-0.5">
                    <span className="text-cyan-400 font-medium truncate max-w-[100px]">{currentTenant.businessName}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-semibold uppercase">{currentTenant.userRole}</span>
                  </div>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* User Account & Role Switcher Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-cyan-500/30 bg-[#071329] p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Account Header */}
                  <div className="pb-3 mb-2 border-b border-gray-700/80">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-black font-extrabold flex items-center justify-center text-sm shadow">
                        {getInitials(currentTenant.userEmail)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">{currentTenant.userEmail}</div>
                        <div className="text-[11px] text-gray-400 truncate">{currentTenant.businessName}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                        {currentTenant.businessSlug}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30 uppercase">
                        Role: {currentTenant.userRole}
                      </span>
                    </div>
                  </div>

                  {/* Role Switcher Section for Live Localhost RBAC Testing */}
                  <div className="pb-2.5 mb-2 border-b border-gray-700/80">
                    <div className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-cyan-400" />
                      <span>Switch Role (RBAC Testing)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "owner", label: "Owner", sub: "Full Access" },
                        { id: "team", label: "Team", sub: "Chat & Knowledge" },
                        { id: "expert", label: "Expert", sub: "Approvals & Tasks" },
                        { id: "admin", label: "Admin", sub: "Fleet Operator" },
                      ].map((r) => {
                        const isCurrent = currentTenant.userRole === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => switchRole(r.id as AppUserRole)}
                            disabled={switchingRole}
                            className={`p-2 rounded-lg text-left transition border ${
                              isCurrent
                                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200"
                                : "border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700 hover:text-white"
                            }`}
                          >
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span>{r.label}</span>
                              {isCurrent && <Check className="h-3 w-3 text-cyan-400" />}
                            </div>
                            <div className="text-[9px] text-gray-400 truncate mt-0.5">{r.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Dashboard Hub</span>
                    </Link>

                    {isOwner && (
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                      >
                        <Settings className="h-3.5 w-3.5 text-gray-400" />
                        <span>Workspace Settings &amp; Keys</span>
                      </Link>
                    )}

                    {(isExpert || isOwner) && (
                      <Link
                        href="/approvals"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                        <span>Approvals Inbox</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Platform Fleet Admin</span>
                      </Link>
                    )}
                  </div>

                  {/* Workspace switcher / sign up */}
                  <div className="border-t border-gray-700/80 my-2 pt-2 space-y-1">
                    <Link
                      href="/signin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-cyan-300 hover:text-white rounded-lg hover:bg-cyan-950/40 transition"
                    >
                      <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Switch Workspace / Sign In</span>
                    </Link>

                    <Link
                      href="/signup"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-950/40 transition"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Register New Workspace</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-gray-700/80 my-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/30 transition text-left"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-400" />
                      <span>Sign Out (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body with RBAC Guard */}
        <div className="p-8 max-w-7xl w-full">
          {accessDeniedReason ? (
            <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl border border-red-500/40 bg-[#071329] shadow-2xl shadow-red-500/10 text-center space-y-5 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <Lock className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white">
                  Access Restricted by Role
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                  <span>Current Role:</span>
                  <strong className="uppercase">{currentTenant.userRole}</strong>
                </div>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed max-w-lg mx-auto">
                {accessDeniedReason}
              </p>

              {requiredRole && (
                <div className="p-3.5 rounded-xl border border-gray-800 bg-[#040f26] text-xs font-mono text-gray-400">
                  Required Role: <span className="text-cyan-400 font-bold">{requiredRole}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs transition"
                >
                  Return to Dashboard
                </Link>

                <button
                  onClick={() => switchRole("owner")}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-lg shadow-cyan-500/20"
                >
                  Switch to Owner (Test Mode)
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
