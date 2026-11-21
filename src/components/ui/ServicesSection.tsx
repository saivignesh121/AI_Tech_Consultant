"use client";

import React, { useState } from "react";
import { Cpu, Database, Sparkles, Users, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ServicesSection({
  onConnectClick,
}: {
  onConnectClick?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<number>(0);

  const services = [
    {
      id: "digital-transformation",
      title: "Digital Transformation & Business Modernization",
      subtitle: "Forward-Thinking Enterprise Tech Stacks",
      icon: Cpu,
      badge: "Core Service",
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {services.map((srv, idx) => {
          const Icon = srv.icon;
          return (
            <div
              key={srv.id}
              className="rounded-2xl border border-gray-800 bg-gradient-to-b from-[#0B152A] to-[#060D1E] p-6 hover:border-cyan-500/50 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-gray-300 text-[10px] font-mono">
                    {srv.badge}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">
                  {srv.title}
                </h4>
                <div className="text-xs font-mono text-cyan-400 mt-0.5">{srv.subtitle}</div>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">{srv.description}</p>

                <div className="space-y-2 mt-5">
                  {srv.capabilities.map((cap, cIdx) => (
                    <div key={cIdx} className="flex items-start gap-2 text-xs text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800/80 mt-6 flex items-center justify-between">
                {srv.actionHref.startsWith("#") ? (
                  <a
                    href={srv.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <span>{srv.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <Link
                    href={srv.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <span>{srv.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                <button
                  onClick={onConnectClick}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-medium transition"
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
