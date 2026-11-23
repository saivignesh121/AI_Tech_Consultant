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
  Menu,
  X,
} from "lucide-react";

export type AppUserRole = "owner" | "admin" | "team" | "expert" | "member" | "customer";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localOnlyMode, setLocalOnlyMode] = useState(false);
  const [switching, setSwitching] = useState(false);

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

    // Close mobile menu on route change
    setMobileMenuOpen(false);

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
    { label: "Role & Security Studio", href: "/settings/roles-prompts", icon: Sparkles },
    { label: "The Eval Lab", href: "/evals", icon: FlaskConical },
    { label: "Self-Improve Loop", href: "/self-improve", icon: RefreshCw },
    { label: "Approvals Inbox", href: "/approvals", icon: CheckCircle2 },
    { label: "Settings & Keys", href: "/settings", icon: Settings },
  ];

  if (role === "customer") {
    navItems = [
      { label: "Live AI Support", href: "/chat", icon: MessageSquare },
    ];
  } else if (role === "team" || role === "member") {
    navItems = [
      { label: "Dashboard Hub", href: "/", icon: LayoutDashboard },
      { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
      { label: "Knowledge Brain (View)", href: "/knowledge", icon: Brain },
      { label: "The Eval Lab (View)", href: "/evals", icon: FlaskConical },
    ];
  } else if (role === "expert") {
    navItems = [
      { label: "Dashboard Hub", href: "/", icon: LayoutDashboard },
      { label: "Approvals Inbox", href: "/approvals", icon: CheckCircle2 },
      { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
      { label: "Knowledge Brain (View)", href: "/knowledge", icon: Brain },
      { label: "The Eval Lab (Grade)", href: "/evals", icon: FlaskConical },
      { label: "Self-Improve Reports", href: "/self-improve", icon: RefreshCw },
    ];
  } else if (role === "admin" || role === "owner") {
    navItems = [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "15-Min Onboarding", href: "/onboarding", icon: Sparkles },
      { label: "Knowledge Brain", href: "/knowledge", icon: Brain },
      { label: "Ask & Teach Chat", href: "/chat", icon: MessageSquare },
      { label: "Role & Security Studio", href: "/settings/roles-prompts", icon: Sparkles },
      { label: "The Eval Lab", href: "/evals", icon: FlaskConical },
      { label: "Self-Improve Loop", href: "/self-improve", icon: RefreshCw },
      { label: "Approvals Inbox", href: "/approvals", icon: CheckCircle2 },
      { label: "Settings & Keys", href: "/settings", icon: Settings },
      { label: "Platform Fleet Admin", href: "/admin", icon: ShieldAlert },
    ];
  }

  // --- Granular Route Access Control Enforcement ---
  const isCustomer = role === "customer";
  const isTeam = role === "team" || role === "member";
  const isExpert = role === "expert";
  const isAdmin = role === "admin";
  const isOwner = role === "owner";

  let accessDeniedReason: string | null = null;
  let requiredRole: string | null = null;

  if (isCustomer && pathname !== "/chat" && pathname !== "/") {
    accessDeniedReason = "Customer / Guest Access: As an external customer or guest, access is strictly limited to Live AI Consultation. Internal knowledge curation, evaluation labs, approval gates, and administrative settings are restricted.";
    requiredRole = "Team Member, Expert, or Workspace Admin";
  } else if (pathname.startsWith("/admin") && !isAdmin && !isOwner) {
    accessDeniedReason = "Platform Admin Fleet Access: Only the SaaS Operator or Workspace Admin can access the fleet governance dashboard.";
    requiredRole = "Platform Admin (admin) or Business Owner (owner)";
  } else if (pathname.startsWith("/approvals") && !isExpert && !isOwner && !isAdmin) {
    accessDeniedReason = "Approvals Inbox Access: Only the Expert Reviewer or Business Owner/Admin can review escalations, approve learned skills, and merge PRs. Blocked for Team Members and Customers.";
    requiredRole = "Expert / Reviewer (expert) or Business Owner (owner)";
  } else if (pathname.startsWith("/settings/roles-prompts") && !isAdmin && !isOwner) {
    accessDeniedReason = "Role & Security Studio Access: Modifying agent system prompts, role definitions, or authorized skills requires Admin or Owner privileges.";
    requiredRole = "Business Owner (owner) or Admin (admin)";
  } else if (pathname.startsWith("/settings") && !isAdmin && !isOwner) {
    accessDeniedReason = "Settings & Vault Access: Modifying raw API vault keys, pricing routing, or business settings is reserved exclusively for Workspace Admins and Owners.";
    requiredRole = "Business Owner (owner) or Admin (admin)";
  } else if (isTeam && (pathname.startsWith("/self-improve") || pathname.startsWith("/onboarding"))) {
    accessDeniedReason = "Admin Privilege Required: As a Team Member (Support Specialist), you have access to Chat, Knowledge Base (View), and Eval Lab (View Only). Self-improvement loop deployments and onboarding configurations are restricted.";
    requiredRole = "Business Owner (owner) or Admin (admin)";
  }

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Logo */}
        <div className="flex items-center justify-between px-2 py-3 mb-6 border-b border-[#DCE6F5]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0284C7] to-[#2563EB] text-white font-serif text-xl font-bold shadow-sm group-hover:scale-105 transition">
              α
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                AI Technologies &amp; Consulting
              </h1>
              <span className="text-[10px] font-mono text-[#2563EB] font-semibold">Enterprise Operations</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#7B8AA6] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
            aria-label="Close Navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Workspace Selector in Sidebar */}
        <div className="relative mb-6" ref={tenantMenuRef}>
          <button
            onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
            className="w-full text-left rounded-xl border border-[#DCE6F5] bg-white p-2.5 hover:border-[#BFDBFE] transition flex items-center justify-between shadow-sm"
          >
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#7B8AA6] tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-[#2563EB]" />
                Active Workspace
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-[#0B1B3A] truncate max-w-[130px]">
                  {currentTenant.businessName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Isolated
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#7B8AA6]" />
          </button>

          {/* Dropdown Menu */}
          {tenantDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-[#DCE6F5] bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-semibold text-[#2563EB] px-2 py-1 uppercase tracking-wider">
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
                        ? "bg-[#EEF4FF] text-[#2563EB] font-medium border border-[#DCE6F5]"
                        : "text-[#4A5B78] hover:bg-[#F6F9FF]"
                    }`}
                  >
                    <div className="text-left truncate mr-2">
                      <div className="font-semibold text-[#0B1B3A] truncate">{t.businessName}</div>
                      <div className="text-[10px] text-[#7B8AA6] font-mono truncate">{t.businessSlug}</div>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-[#2563EB] shrink-0" />}
                  </button>
                );
              })}
              <div className="border-t border-[#DCE6F5] my-1 pt-1 space-y-1">
                <Link
                  href="/signin"
                  onClick={() => setTenantDropdownOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#2563EB] hover:bg-[#EEF4FF] rounded-lg transition"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Workspace Picker / Sign In</span>
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setTenantDropdownOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
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
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#EEF5FD] text-[#1D4ED8] border-l-4 border-[#1D4ED8] shadow-xs font-bold"
                    : "text-[#4A5B78] hover:bg-[#EEF4FF] hover:text-[#0B1B3A]"
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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#0B1B3A] font-semibold flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-emerald-600" />
            Local-Only Mode
          </span>
          <button
            onClick={toggleLocalMode}
            className={`text-[10px] rounded px-2 py-0.5 font-mono font-medium transition ${
              localOnlyMode
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {localOnlyMode ? "ON" : "OFF"}
          </button>
        </div>
        <p className="text-[11px] text-[#4A5B78] leading-relaxed">
          {localOnlyMode
            ? "Local Ollama active (localhost:11434). Cloud APIs bypassed."
            : "Running 14-model cloud router. Toggle to use laptop Ollama."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F6F9FF] text-[#0B1B3A] selection:bg-[#2563EB] selection:text-white font-sans relative">
      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1B3A]/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white border-r border-[#DCE6F5] flex flex-col justify-between p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[#DCE6F5] bg-white flex-col justify-between p-4 flex-shrink-0 shadow-sm sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        {/* Ambient Fluid Background Mesh */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 opacity-30">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-[#1D4ED8]/20 to-[#06B6D4]/20 blur-3xl animate-fluid-blob" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-gradient-to-bl from-[#7E22CE]/20 to-[#2563EB]/20 blur-3xl animate-fluid-blob" style={{ animationDelay: "-4s" }} />
        </div>

        {/* Top Brand Accent Bar (Proteus Royal Blue to Violet/Purple Gradient) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] flex-shrink-0" />

        {/* Top Header */}
        <header className="h-16 border-b border-[#DCE6F5] px-4 sm:px-8 flex items-center justify-between bg-white/95 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#1D4ED8] hover:bg-[#EEF4FF] transition mr-1"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-[#7B8AA6] font-medium hidden sm:inline">{currentTenant.businessName}</span>
            <span className="text-[#C3D3EA] hidden sm:inline">/</span>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc.label}>
                {idx > 0 && <span className="text-[#C3D3EA]">/</span>}
                {bc.href ? (
                  <Link href={bc.href} className="text-[#4A5B78] hover:text-[#2563EB] transition truncate max-w-[120px] sm:max-w-none">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-[#0B1B3A] truncate max-w-[140px] sm:max-w-none">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
            {breadcrumbs.length === 0 && (
              <span className="font-semibold text-[#0B1B3A]">Executive Operations Hub</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 relative">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Prompt Injection Shield Active
            </span>

            {/* Interactive User Account Section & Role Switcher */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl border border-[#DCE6F5] bg-white hover:border-[#BFDBFE] transition focus:outline-none shadow-sm"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                  {getInitials(currentTenant.userEmail)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-[#0B1B3A] leading-tight">
                    {currentTenant.userEmail}
                  </div>
                  <div className="text-[10px] text-[#7B8AA6] capitalize flex items-center gap-1.5 mt-0.5">
                    <span className="text-[#2563EB] font-medium truncate max-w-[100px]">{currentTenant.businessName}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-700 font-semibold uppercase">{currentTenant.userRole}</span>
                  </div>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-[#7B8AA6] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* User Account & Role Switcher Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[#DCE6F5] bg-white p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Account Header */}
                  <div className="pb-3 mb-2 border-b border-[#DCE6F5]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                        {getInitials(currentTenant.userEmail)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-[#0B1B3A] truncate">{currentTenant.userEmail}</div>
                        <div className="text-[11px] text-[#7B8AA6] truncate">{currentTenant.businessName}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-[#EEF4FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB] border border-[#BFDBFE]">
                        {currentTenant.businessSlug}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 uppercase">
                        Role: {currentTenant.userRole}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[#4A5B78] hover:text-[#0B1B3A] rounded-lg hover:bg-[#EEF4FF] transition"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span>Dashboard Hub</span>
                    </Link>

                    {isOwner && (
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[#4A5B78] hover:text-[#0B1B3A] rounded-lg hover:bg-[#EEF4FF] transition"
                      >
                        <Settings className="h-3.5 w-3.5 text-[#7B8AA6]" />
                        <span>Workspace Settings &amp; Keys</span>
                      </Link>
                    )}

                    {(isExpert || isOwner) && (
                      <Link
                        href="/approvals"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[#4A5B78] hover:text-[#0B1B3A] rounded-lg hover:bg-[#EEF4FF] transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                        <span>Approvals Inbox</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[#4A5B78] hover:text-[#0B1B3A] rounded-lg hover:bg-[#EEF4FF] transition"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-[#2563EB]" />
                        <span>Platform Fleet Admin</span>
                      </Link>
                    )}
                  </div>

                  {/* Workspace switcher / sign up */}
                  <div className="border-t border-[#DCE6F5] my-2 pt-2 space-y-1">
                    <Link
                      href="/signin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[#2563EB] hover:bg-[#EEF4FF] rounded-lg transition"
                    >
                      <Building2 className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span>Switch Workspace / Sign In</span>
                    </Link>

                    <Link
                      href="/signup"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Register New Workspace</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-[#DCE6F5] my-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition text-left"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-600" />
                      <span>Sign Out (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body with RBAC Guard */}
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full">
          {accessDeniedReason ? (
            <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 rounded-3xl border-2 border-[#D0E2FB] bg-white shadow-xl shadow-blue-500/5 text-center space-y-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] flex items-center justify-center mx-auto shadow-xs">
                <Lock className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-[#0B1B3A]">
                  Access Restricted by Role
                </h2>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs font-mono font-semibold">
                  <span>Current Role:</span>
                  <strong className="uppercase">{currentTenant.userRole}</strong>
                </div>
              </div>

              <p className="text-sm text-[#4A5B78] leading-relaxed max-w-lg mx-auto">
                {accessDeniedReason}
              </p>

              {requiredRole && (
                <div className="p-4 rounded-2xl border border-[#DCE6F5] bg-[#EEF4FF] text-xs font-mono text-[#4A5B78]">
                  Required Role: <span className="text-[#1D4ED8] font-bold">{requiredRole}</span>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/"
                  className="px-6 py-2.5 rounded-full bg-white border border-[#DCE6F5] hover:bg-[#EEF4FF] text-[#0B1B3A] font-semibold text-xs transition shadow-xs"
                >
                  Return to Dashboard
                </Link>

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
