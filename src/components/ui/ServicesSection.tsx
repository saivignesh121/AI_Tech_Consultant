"use client";

import React from "react";
import { Cpu, Database, Sparkles, Users, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ServicesSection({
  onConnectClick,
}: {
  onConnectClick?: () => void;
}) {
  const services = [
    {
      id: "digital-transformation",
      title: "Digital Transformation & Business Modernization",
      subtitle: "Forward-Thinking Enterprise Tech Stacks",
      icon: Cpu,
      badge: "Core Service",
      badgeColor: "bg-cyan-100/70 text-cyan-800 border-cyan-200",
      cardBg: "bg-[#E6F8F9] border-2 border-[#BCECEF]",
      iconBg: "bg-white text-cyan-600 border border-cyan-200",
      description:
        "Modernizing legacy enterprise systems with cloud-native microservices, strict multi-tenant isolation, and zero-downtime database migrations.",
      capabilities: [
        "Cloudflare Full-Strict SSL/TLS & CNAME Proxy routing",
        "Legacy REST to event-driven GraphQL/gRPC migrations",
        "Zero-Trust security architectures & Argon2 authentication",
        "Comprehensive CI/CD pipelines with automated regression gating",
      ],
      actionLabel: "Explore Architecture",
      actionHref: "/knowledge",
    },
    {
      id: "autonomous-consultant",
      title: "Autonomous AI Tech Support & Consultation",
      subtitle: "24/7 Grounded Engineering Problem Solver",
      icon: Sparkles,
      badge: "AI Powered",
      badgeColor: "bg-blue-100/70 text-blue-800 border-blue-200",
      cardBg: "bg-[#EEF5FD] border-2 border-[#D0E2FB]",
      iconBg: "bg-white text-blue-600 border border-blue-200",
      description:
        "Instant, verified answers with automated citation attribution. Combines dense vector similarity with sparse keyword matching using Reciprocal Rank Fusion.",
      capabilities: [
        "PostgreSQL 18 pgvector & tsvector hybrid search engine",
        "Prompt injection and jailbreak protection shield",
        "Multi-model routing (Claude 3.5 Sonnet, Gemini 3 Flash, Ollama)",
        "Inline customer teaching and autonomous prompt patching",
      ],
      actionLabel: "Launch Live Consultant",
      actionHref: "/chat",
    },
    {
      id: "cloud-devops",
      title: "Cloud Infrastructure & Database Engineering",
      subtitle: "High-Throughput, Low-Latency Resilience",
      icon: Database,
      badge: "Infrastructure",
      badgeColor: "bg-amber-100/70 text-amber-800 border-amber-200",
      cardBg: "bg-[#FFF4E8] border-2 border-[#FFE2C2]",
      iconBg: "bg-white text-amber-600 border border-amber-200",
      description:
        "Ensuring mission-critical database availability and sub-20ms retrieval latency across distributed multi-region deployments.",
      capabilities: [
        "PgBouncer connection pooling & max_connections management",
        "PostgreSQL 18 partitioning and automated vacuuming",
        "Encrypted multi-provider vault key management",
        "End-to-end model token and cost telemetry tracking",
      ],
      actionLabel: "Inspect Telemetry & Keys",
      actionHref: "/settings",
    },
    {
      id: "talent-staffing",
      title: "Strategic Talent & Staffing Intelligence",
      subtitle: "Approachable, Tailored Recruitment Solutions",
      icon: Users,
      badge: "Staffing Solutions",
      badgeColor: "bg-purple-100/70 text-purple-800 border-purple-200",
      cardBg: "bg-[#F5F3FF] border-2 border-[#DDD6FE]",
      iconBg: "bg-white text-purple-600 border border-purple-200",
      description:
        "Simplifying organizational decision-making through tailored technology recruitment, candidate skill benchmarking, and workforce augmentation.",
      capabilities: [
        "AI-assisted applicant screening & competency scoring",
        "Automated pass-bar evaluation against production benchmarks",
        "Flexible workforce scaling for retail, tech, and enterprise",
        "Direct access to top-tier verified engineering talent",
      ],
      actionLabel: "View Careers & Apply",
      actionHref: "#careers",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {services.map((srv) => {
          const Icon = srv.icon;
          return (
            <div
              key={srv.id}
              className={`rounded-3xl ${srv.cardBg} p-8 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-11 w-11 rounded-2xl ${srv.iconBg} flex items-center justify-center shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-[11px] font-mono font-semibold ${srv.badgeColor}`}>
                    {srv.badge}
                  </span>
                </div>

                <h4 className="text-xl font-bold text-[#0B1B3A] transition">
                  {srv.title}
                </h4>
                <div className="text-xs font-mono text-[#1D4ED8] mt-1 font-semibold">{srv.subtitle}</div>
                <p className="text-xs text-[#334155] mt-3 leading-relaxed">{srv.description}</p>

                <div className="space-y-2.5 mt-5">
                  {srv.capabilities.map((cap, cIdx) => (
                    <div key={cIdx} className="flex items-start gap-2.5 text-xs text-[#334155]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] flex-shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-black/5 mt-6 flex flex-wrap items-center justify-between gap-3">
                {srv.actionHref.startsWith("#") ? (
                  <a
                    href={srv.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline transition"
                  >
                    <span>{srv.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <Link
                    href={srv.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline transition"
                  >
                    <span>{srv.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                <button
                  onClick={onConnectClick}
                  className="px-5 py-2 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition shadow-sm"
                >
                  Consult an Expert
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
