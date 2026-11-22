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
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <WebsiteHeader onConnectClick={() => setConnectModalOpen(true)} />

      {/* Flagship Hero Banner: Royal Blue to Violet/Purple Gradient (ProteusVision Theme) */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white py-16 md:py-24 border-b border-[#1D4ED8]">
        {/* Cyber Matrix Canvas */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <CyberMatrixCanvas particleCount={40} />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-blue-400/25 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-xs font-mono font-medium">
            <span>About AI Technologies &amp; Consulting</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Uninterrupted Intelligence for a Connected World
          </h1>
          <p className="text-base sm:text-lg text-purple-100 max-w-2xl mx-auto leading-relaxed">
            We are a team of expert consultants who simplify decision-making for organizations through efficient staffing solutions and autonomous technical architectures.
          </p>
        </div>
      </section>

      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Core Values / Story in 3 Pastel Tinted Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Mint / Soft Cyan */}
            <div className="p-8 rounded-3xl bg-[#E6F8F9] border-2 border-[#BCECEF] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-white border border-cyan-200 text-cyan-600 flex items-center justify-center font-bold font-serif text-lg shadow-xs">
                  α
                </div>
                <h3 className="text-xl font-bold text-[#0B1B3A] mt-4">Approachable &amp; Committed</h3>
                <p className="text-xs text-[#334155] leading-relaxed mt-2">
                  We take pride in delivering tailored solutions for the industries we serve, offering exceptional recruitment services and customized options to meet every client&apos;s needs.
                </p>
              </div>
            </div>

            {/* Card 2: Soft Ice Blue */}
            <div className="p-8 rounded-3xl bg-[#EEF5FD] border-2 border-[#D0E2FB] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-white border border-blue-200 text-[#1D4ED8] flex items-center justify-center font-bold text-lg shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#0B1B3A] mt-4">AI-Powered Decision Making</h3>
                <p className="text-xs text-[#334155] leading-relaxed mt-2">
                  Combining generative AI models, vector retrieval benchmarks, and self-improving prompt loops to resolve complex technical engineering inquiries instantly.
                </p>
              </div>
            </div>

            {/* Card 3: Soft Peach / Cream */}
            <div className="p-8 rounded-3xl bg-[#FFF4E8] border-2 border-[#FFE2C2] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-white border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-lg shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#0B1B3A] mt-4">Strict Multi-Tenant Security</h3>
                <p className="text-xs text-[#334155] leading-relaxed mt-2">
                  Complete data isolation, encrypted credential vaults, and automated PII scrubbing to protect enterprise privacy across all cloud and on-premise deployments.
                </p>
              </div>
            </div>
          </div>

          {/* Headquarters Info */}
          <div className="rounded-3xl border border-[#DCE6F5] bg-white p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DCE6F5] pb-6">
              <div>
                <span className="text-xs font-mono uppercase text-[#1D4ED8] font-semibold">Global Operations</span>
                <h2 className="text-2xl font-bold text-[#0B1B3A] tracking-tight mt-1">Corporate Headquarters</h2>
              </div>
              <button
                onClick={() => setConnectModalOpen(true)}
                className="px-6 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition shadow-sm"
              >
                Connect with us
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#4A5B78]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#0B1B3A]">Headquarters</div>
                  <div className="text-[#4A5B78]">Jubilee Enclave, Madhapur, Hyderabad, Telangana, India (500081)</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#0B1B3A]">Operational Coverage</div>
                  <div className="text-[#4A5B78]">24/7 Global Technical Support and Enterprise Staffing</div>
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
