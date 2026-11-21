"use client";

import React, { useState } from "react";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
import CareersSection from "@/components/ui/CareersSection";
import ApplicantReadinessWidget from "@/components/ui/ApplicantReadinessWidget";
import ConnectModal from "@/components/ui/ConnectModal";

export default function CareersPage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050B18] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <WebsiteHeader onConnectClick={() => setConnectModalOpen(true)} />

      <main className="flex-1 relative overflow-hidden py-16 md:py-24">
        <CyberMatrixCanvas particleCount={50} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium">
              <span>Careers &amp; Talent &bull; AI Technologies &amp; Consulting</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Join Our Engineering &amp; Consulting Network
            </h1>
            <p className="text-base sm:text-lg text-gray-300">
              Work on cutting-edge autonomous AI agent loops, distributed cloud architectures, and enterprise digitalization.
            </p>
          </div>

          {/* Interactive Applicant Readiness Diagnostic */}
          <ApplicantReadinessWidget
            onApplyClick={() => {
              setConnectModalOpen(true);
            }}
          />

          {/* Job Listings Grid */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Active Job Openings</h2>
            <CareersSection
              onSelectRole={() => {
                setConnectModalOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      <ConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        initialCategory="applicant"
      />
    </div>
  );
}
