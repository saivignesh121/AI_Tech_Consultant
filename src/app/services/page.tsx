"use client";

import React, { useState } from "react";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
import ServicesSection from "@/components/ui/ServicesSection";
import ConnectModal from "@/components/ui/ConnectModal";

export default function ServicesPage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <WebsiteHeader onConnectClick={() => setConnectModalOpen(true)} />

      <main className="flex-1 relative overflow-hidden py-16 md:py-24">
        <CyberMatrixCanvas particleCount={45} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-mono font-medium shadow-xs">
              <span>Enterprise Practice Areas &bull; AI Technologies &amp; Consulting</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B1B3A] tracking-tight">
              Enterprise Technology &amp; Staffing Solutions
            </h1>
            <p className="text-base sm:text-lg text-[#4A5B78]">
              Transform your business with strong tech support, digitalization, and customized talent placement.
            </p>
          </div>

          <ServicesSection onConnectClick={() => setConnectModalOpen(true)} />
        </div>
      </main>

      <ConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </div>
  );
}
