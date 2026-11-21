"use client";

import React, { useState } from "react";
import { Briefcase, MapPin, Clock, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

interface JobRole {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  skills: string[];
  description: string;
}

export default function CareersSection({
  onSelectRole,
}: {
  onSelectRole: (roleTitle: string) => void;
}) {
  const [selectedDept, setSelectedDept] = useState<string>("all");

  const jobs: JobRole[] = [
    {
      id: "job-1",
      title: "Senior AI Agent & LLM Systems Engineer",
      department: "AI & Platform Engineering",
      location: "Hyderabad, India / Hybrid",
      type: "Full-Time",
      experience: "4-7 Years",
      skills: ["Sonnet/Opus 5.5", "TypeScript", "Prompt Caching", "Eval Frameworks"],
      description: "Architect self-improving agent loops, dynamic citation attribution, and subagent orchestration pipelines.",
    },
    {
      id: "job-2",
      title: "Principal PostgreSQL & Cloud Systems Architect",
      department: "Cloud & Infrastructure",
      location: "Hyderabad, India / Remote",
      type: "Full-Time",
      experience: "5+ Years",
      skills: ["PostgreSQL 18", "pgvector", "PgBouncer", "Cloudflare Full-Strict SSL"],
      description: "Scale high-throughput connection pools, manage hybrid Reciprocal Rank Fusion vector indices, and zero-downtime migrations.",
    },
    {
      id: "job-3",
      title: "Enterprise Technical Consultant & Staffing Lead",
      department: "Consulting & Talent Solutions",
      location: "Hyderabad, India",
      type: "Full-Time",
      experience: "3-6 Years",
      skills: ["Client Solutions", "Tech Recruitment", "Decision Modeling", "SaaS Modernization"],
      description: "Interface with enterprise CTOs and founders, delivering customized talent placement and technology modernization advisory.",
    },
    {
      id: "job-4",
      title: "Full-Stack SaaS Specialist (Next.js 16 & TypeScript)",
      department: "Product Engineering",
      location: "Remote / Hybrid",
      type: "Full-Time",
      experience: "3-5 Years",
      skills: ["Next.js 16", "React 19", "Tailwind CSS", "Drizzle ORM", "Argon2"],
      description: "Build ultra-responsive, accessible user interfaces with zero-leakage multi-tenant security architecture.",
    },
  ];

  const filteredJobs =
    selectedDept === "all" ? jobs : jobs.filter((j) => j.department.toLowerCase().includes(selectedDept.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Department Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All Opportunities (4)" },
          { id: "ai", label: "AI & Platform" },
          { id: "cloud", label: "Cloud & Infrastructure" },
          { id: "consulting", label: "Consulting & Staffing" },
          { id: "product", label: "Product Engineering" },
        ].map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedDept === d.id
                ? "bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="rounded-2xl border border-gray-800 bg-[#0A1326] p-6 hover:border-cyan-500/50 transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                    {job.department}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1 group-hover:text-cyan-300 transition">
                    {job.title}
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-[10px] font-mono">
                  {job.type}
                </span>
              </div>

              <p className="text-xs text-gray-400 mt-2 line-clamp-2">{job.description}</p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {job.experience}
                </span>
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {job.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-gray-300 text-[11px] font-mono"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-800/80 mt-5 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 font-mono">Benchmark: Fast-Track &ge;85%</span>
              <button
                onClick={() => onSelectRole(job.title)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black font-semibold text-xs transition"
              >
                <span>Apply / Submit Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
