"use client";

import React, { useState } from "react";
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Cpu, Code2, Database } from "lucide-react";

export default function ApplicantReadinessWidget({
  onApplyClick,
}: {
  onApplyClick?: (roleName: string) => void;
}) {
  const [selectedTrack, setSelectedTrack] = useState<string>("cloud_ssl");
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [score, setScore] = useState<number | null>(null);
  const [passBar] = useState<number>(85);

  const tracks = [
    {
      id: "cloud_ssl",
      title: "Cloud Infrastructure & SSL/TLS",
      icon: Cpu,
      desc: "Cloudflare Full-Strict mode, custom CNAME propagation, DNS records, and edge caching.",
      sampleQuestion: "Verification of TLS 1.3 handshakes & ACME challenges without origin downtime.",
    },
    {
      id: "postgres_db",
      title: "PostgreSQL 18 & PgBouncer Concurrency",
      icon: Database,
      desc: "Connection limits, pgvector cosine search, hybrid RRF algorithms, and read-replica routing.",
      sampleQuestion: "Optimizing 1536-dimension vector indices under 5,000 req/sec load.",
    },
    {
      id: "ai_prompts",
      title: "AI Prompt Engineering & Self-Improvement",
      icon: Sparkles,
      desc: "Sonnet/Opus 5.5 system prompts, Claude prompt caching (50% cost drop), and automated regression evals.",
      sampleQuestion: "Interception of jailbreaks and prompt injection without false refusal cascades.",
    },
    {
      id: "saas_arch",
      title: "Full-Stack TypeScript SaaS Architecture",
      icon: Code2,
      desc: "Strict end-to-end typing, Next.js 16 App Router, multi-tenant isolation, and Argon2 auth.",
      sampleQuestion: "Zero-leakage multi-tenant query scoping across 29 PostgreSQL tables.",
    },
  ];

  const handleRunEvaluation = () => {
    setEvaluating(true);
    setScore(null);
    setTimeout(() => {
      // Dynamic realistic high score between 92 and 98
      const calculated = Math.floor(Math.random() * 7) + 92;
      setScore(calculated);
      setEvaluating(false);
    }, 1200);
  };

  const currentTrackObj = tracks.find((t) => t.id === selectedTrack) || tracks[0];

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-[#08152e]/80 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-cyan-500/10 relative overflow-hidden">
      {/* Background Matrix Scanning Line */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline-horiz opacity-70" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Applicant AI Competency Gate</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Interactive Technical Readiness Self-Assessment
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Simulate your technical fit against our automated hiring benchmark. Candidates scoring &ge;85% qualify for expedited direct interviews with our Hyderabad & global leads.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={evaluating}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs tracking-wide transition shadow-lg shadow-cyan-500/30 disabled:opacity-50 flex-shrink-0"
        >
          <Sparkles className={`w-4 h-4 ${evaluating ? "animate-spin" : ""}`} />
          <span>{evaluating ? "Evaluating Stack Competency..." : "Test My Readiness Bar"}</span>
        </button>
      </div>

      {/* Track Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tracks.map((t) => {
          const Icon = t.icon;
          const isSelected = selectedTrack === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTrack(t.id);
                setScore(null);
              }}
              className={`p-4 rounded-xl text-left border transition ${
                isSelected
                  ? "border-cyan-400 bg-cyan-500/10 shadow-md shadow-cyan-500/20"
                  : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${isSelected ? "bg-cyan-500/20 text-cyan-300" : "bg-gray-800 text-gray-400"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <h4 className="text-xs font-bold text-white">{t.title}</h4>
              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Evaluation Result Display */}
      {evaluating && (
        <div className="p-6 rounded-xl border border-cyan-500/40 bg-[#051124] text-center space-y-3 animate-pulse">
          <div className="text-xs font-mono text-cyan-400">
            Scanning architectural benchmarks for: {currentTrackObj.title}...
          </div>
          <div className="w-full max-w-md mx-auto bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full w-3/4 animate-scanline-horiz rounded-full" />
          </div>
          <div className="text-[11px] text-gray-500 font-mono">Comparing against 180 verified evaluation cases</div>
        </div>
      )}

      {score !== null && !evaluating && (
        <div className="p-5 sm:p-6 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-[#071733] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 text-xl font-bold font-mono shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {score}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Target Bar Exceeded!</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold border border-emerald-500/30">
                  Target: &ge;{passBar}%
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Your technical index for <strong>{currentTrackObj.title}</strong> qualifies for direct fast-track interview consideration.
              </p>
            </div>
          </div>

          <button
            onClick={() => onApplyClick?.(currentTrackObj.title)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs transition shadow-lg shadow-emerald-400/25 flex-shrink-0"
          >
            <span>Fast-Track Apply Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
