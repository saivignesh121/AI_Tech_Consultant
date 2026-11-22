"use client";

import React, { useState } from "react";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
import ServicesSection from "@/components/ui/ServicesSection";
import ConnectModal from "@/components/ui/ConnectModal";
import Link from "next/link";
import { Sparkles, Cpu, Layers } from "lucide-react";

export default function ServicesPage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <WebsiteHeader onConnectClick={() => setConnectModalOpen(true)} />

      {/* Flagship Hero Banner: Deep Oceanic Teal-Blue Gradient (From Screenshot 2) */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0B3B60] via-[#0E5B7A] to-[#093552] text-white py-16 md:py-24 border-b border-[#0B3B60]">
        {/* Cyber Matrix and Digital Wave Overlay */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <CyberMatrixCanvas particleCount={45} />
        </div>

        {/* Ambient Oceanic Glows */}
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-[450px] h-[450px] bg-blue-500/20 rounded-full blur-[130px] pointer-events-none" />

        {/* Decorative Wave SVGs */}
        <svg
          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
          viewBox="0 0 1440 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100 200 C300 100, 600 350, 1000 180 C1200 100, 1400 250, 1600 200"
            stroke="url(#oceanic-grad)"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
          <path
            d="M-100 240 C350 140, 650 390, 1050 220 C1250 140, 1450 290, 1650 240"
            stroke="url(#oceanic-grad)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="oceanic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>
        </svg>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Title & Dark Tag Pill (From Screenshot 2) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-xs font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Enterprise Practice Areas &bull; AI Technologies &amp; Consulting</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                AI Consulting and Services
              </h1>

              <p className="text-base sm:text-lg text-cyan-100/90 font-normal max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Transform your business with strong tech support, continuous learning, and multi-tenant autonomous intelligence.
              </p>

              {/* Twasta AI Dark Pill (Exact from Screenshot 2) */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-white font-semibold text-xs tracking-wide shadow-md transition"
                >
                  Twasta AI
                </button>

                <button
                  onClick={() => setConnectModalOpen(true)}
                  className="px-6 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs tracking-wide shadow-md transition"
                >
                  Book Demo
                </button>
              </div>
            </div>

            {/* Right Column: 3D Robot & AI Microchip Graphic Concept (From Screenshot 2) */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                {/* Glowing AI Microchip Card */}
                <div className="absolute bottom-4 w-56 h-36 bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-slate-950/90 rounded-2xl border-2 border-cyan-400/50 shadow-[0_0_40px_rgba(6,182,212,0.35)] p-4 flex flex-col justify-between transform rotate-[-8deg] hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                    <span className="text-[10px] font-mono text-cyan-300 font-semibold tracking-wider">
                      AI PROCESSOR
                    </span>
                    <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 py-1">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="h-2 rounded-sm bg-gradient-to-r from-cyan-400 to-blue-500 opacity-70"
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                    <span>1536-DIM VECTOR</span>
                    <span className="text-emerald-400">&bull; RRF ACTIVE</span>
                  </div>
                </div>

                {/* Friendly AI Robot Assistant Bubble */}
                <div className="absolute top-2 w-44 h-44 rounded-full bg-gradient-to-tr from-purple-400/90 via-indigo-300 to-cyan-200 p-1 shadow-2xl flex items-center justify-center border-4 border-white/30 transform hover:scale-105 transition-all">
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-indigo-900 to-purple-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                    {/* Glowing Eyes */}
                    <div className="flex items-center gap-6 mb-2">
                      <div className="w-4 h-4 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9] animate-pulse" />
                      <div className="w-4 h-4 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9] animate-pulse" />
                    </div>
                    {/* Robot Smile */}
                    <div className="w-8 h-2 rounded-full border-b-2 border-cyan-300" />
                    <span className="text-[10px] font-mono font-bold text-cyan-200 mt-3 tracking-widest">
                      AI CONSULTANT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services List Section */}
      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1B3A] tracking-tight">
              Comprehensive Technology &amp; Staffing Solutions
            </h2>
            <p className="text-base text-[#4A5B78]">
              Bridging cutting-edge artificial intelligence, resilient database architectures, and high-impact technical workforce solutions.
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
