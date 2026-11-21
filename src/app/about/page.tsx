"use client";

import React, { useState } from "react";
import Link from "next/link";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
import ConnectModal from "@/components/ui/ConnectModal";
import { MapPin, Clock, ShieldCheck, ArrowRight, Sparkles, Building2, Users, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050B18] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <WebsiteHeader onConnectClick={() => setConnectModalOpen(true)} />

      <main className="flex-1 relative overflow-hidden py-16 md:py-24">
        <CyberMatrixCanvas particleCount={40} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium">
              <span>About AI Technologies &amp; Consulting</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Uninterrupted Intelligence for a Connected World
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              We are a team of expert consultants who simplify decision-making for organizations through efficient staffing solutions and autonomous technical architectures.
            </p>
          </div>

          {/* Core Values / Story */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-gray-800 bg-[#081326] space-y-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold font-serif text-lg">
                α
              </div>
              <h3 className="text-base font-bold text-white">Approachable &amp; Committed</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                We take pride in delivering tailored solutions for the industries we serve, offering exceptional recruitment services and customized options to meet every client&apos;s needs.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-gray-800 bg-[#081326] space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI-Powered Decision Making</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Combining generative AI models, vector retrieval benchmarks, and self-improving prompt loops to resolve complex technical engineering inquiries instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-gray-800 bg-[#081326] space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Strict Multi-Tenant Security</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Complete data isolation, encrypted credential vaults, and automated PII scrubbing to protect enterprise privacy across all cloud and on-premise deployments.
              </p>
            </div>
          </div>

          {/* Headquarters Info */}
          <div className="rounded-2xl border border-cyan-500/30 bg-[#071530] p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
              <div>
                <span className="text-xs font-mono uppercase text-cyan-400 font-semibold">Global Operations</span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">Corporate Headquarters</h2>
              </div>
              <button
                onClick={() => setConnectModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-md shadow-cyan-500/25"
              >
                Connect with us
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Headquarters</div>
                  <div className="text-gray-400">Jubilee Enclave, Madhapur, Hyderabad, Telangana, India (500081)</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Operational Coverage</div>
                  <div className="text-gray-400">24/7 Global Technical Support and Enterprise Staffing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </div>
  );
}
