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
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
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
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
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
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
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
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((srv) => {
          const Icon = srv.icon;
          return (
            <div
              key={srv.id}
              className="rounded-2xl border border-[#DCE6F5] bg-white p-7 shadow-sm hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-[#EEF4FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-medium ${srv.badgeColor}`}>
                    {srv.badge}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-[#0B1B3A] group-hover:text-[#2563EB] transition">
                  {srv.title}
                </h4>
                <div className="text-xs font-mono text-[#2563EB] mt-1">{srv.subtitle}</div>
                <p className="text-xs text-[#4A5B78] mt-3 leading-relaxed">{srv.description}</p>

                <div className="space-y-2.5 mt-5">
                  {srv.capabilities.map((cap, cIdx) => (
                    <div key={cIdx} className="flex items-start gap-2.5 text-xs text-[#4A5B78]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] flex-shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[#DCE6F5] mt-6 flex items-center justify-between">
                {srv.actionHref.startsWith("#") ? (
                  <a
                    href={srv.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition"
                  >
                    <span>{srv.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <Link
                    href={srv.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition"
                  >
                    <span>{srv.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                <button
                  onClick={onConnectClick}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#EEF4FF] border border-[#2563EB] text-[#2563EB] text-xs font-semibold transition shadow-xs"
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
