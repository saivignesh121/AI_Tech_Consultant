"use client";

import React from "react";

export default function HolographicAiHead({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Ambient Pulsing Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/10 rounded-full blur-3xl animate-pulse-glow" />

      {/* Vertical Laser Scanner Beam */}
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00F0FF] animate-laser-vertical z-20 pointer-events-none" />

      {/* Floating Cyber Circuit SVG Illustration */}
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full max-w-[420px] max-h-[420px] drop-shadow-[0_0_25px_rgba(0,240,255,0.4)] relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cyberCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="wireGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Circular Targeting Reticle */}
        <circle cx="250" cy="250" r="210" stroke="rgba(0,240,255,0.15)" strokeWidth="1" strokeDasharray="6 8" />
        <circle cx="250" cy="250" r="185" stroke="rgba(56,189,248,0.25)" strokeWidth="1.5" />
        <circle cx="250" cy="250" r="160" stroke="rgba(129,140,248,0.2)" strokeWidth="1" strokeDasharray="4 6" />

        {/* Head Contour (Profile Silhouette & Neural Matrix) */}
        {/* Forehead to Crown */}
        <path
          d="M 210 110 C 270 100, 340 130, 360 200 C 370 240, 365 290, 345 330 C 320 375, 270 410, 220 415"
          stroke="url(#cyberCyan)"
          strokeWidth="2.5"
          filter="url(#glowFilter)"
        />

        {/* Brow, Nose, Lips, Chin Contour */}
        <path
          d="M 210 110 C 185 140, 175 170, 180 205 L 170 235 L 188 245 L 175 275 L 195 285 L 180 320 L 220 355 L 230 415"
          stroke="url(#cyberCyan)"
          strokeWidth="3"
          filter="url(#glowFilter)"
        />

        {/* Inner Facial Grid Lines (Polygon Matrix) */}
        <path d="M 180 205 L 250 200 L 290 230 L 250 270 L 175 275" stroke="rgba(0,240,255,0.4)" strokeWidth="1" />
        <path d="M 250 200 L 290 150 L 330 180 L 290 230" stroke="rgba(0,240,255,0.35)" strokeWidth="1" />
        <path d="M 290 230 L 345 250 L 340 300 L 285 305 L 250 270" stroke="rgba(0,240,255,0.4)" strokeWidth="1" />
        <path d="M 250 270 L 285 305 L 270 360 L 220 355" stroke="rgba(0,240,255,0.4)" strokeWidth="1" />
        <path d="M 285 305 L 340 300 L 320 360 L 270 360" stroke="rgba(0,240,255,0.35)" strokeWidth="1" />
        <path d="M 290 150 L 240 130 L 210 160 L 250 200" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />

        {/* Eye Neural Node */}
        <circle cx="215" cy="215" r="7" fill="#00F0FF" filter="url(#glowFilter)" />
        <circle cx="215" cy="215" r="3" fill="#FFFFFF" />

        {/* Brain Cortex Circuit Traces */}
        <path d="M 290 150 L 320 120 L 350 120" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="350" cy="120" r="3" fill="#00F0FF" />

        <path d="M 330 180 L 380 170 L 400 190" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="400" cy="190" r="3" fill="#38BDF8" />

        <path d="M 345 250 L 390 260 L 410 240" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="410" cy="240" r="3" fill="#00F0FF" />

        <path d="M 340 300 L 390 320 L 415 320" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="415" cy="320" r="3" fill="#818CF8" />

        <path d="M 320 360 L 360 380 L 380 400" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="380" cy="400" r="3" fill="#00F0FF" />

        {/* Forehead Node & Diagonal Traces */}
        <circle cx="250" cy="165" r="4" fill="#00F0FF" />
        <circle cx="290" cy="230" r="5" fill="#38BDF8" />
        <circle cx="250" cy="270" r="4" fill="#00F0FF" />
        <circle cx="285" cy="305" r="4.5" fill="#818CF8" />
        <circle cx="270" cy="360" r="4" fill="#00F0FF" />

        {/* Tech Coordinate / Telemetry Crosshairs */}
        <g stroke="rgba(0,240,255,0.4)" strokeWidth="1">
          <line x1="80" y1="250" x2="110" y2="250" />
          <line x1="95" y1="235" x2="95" y2="265" />
          <circle cx="95" cy="250" r="6" fill="none" />
        </g>

        {/* Data Stream Code Matrix on Left */}
        <text x="60" y="160" fill="rgba(0,240,255,0.7)" fontSize="9" fontFamily="monospace">
          AI.matrix_v2
        </text>
        <text x="60" y="175" fill="rgba(0,240,255,0.5)" fontSize="8" fontFamily="monospace">
          01101001 01110011
        </text>
        <text x="60" y="190" fill="rgba(0,240,255,0.6)" fontSize="8" fontFamily="monospace">
          &gt; CONNECT: POOL_READY
        </text>
        <text x="60" y="320" fill="rgba(0,240,255,0.5)" fontSize="9" fontFamily="monospace">
          DATA_STREAM [ACTIVE]
        </text>
        <text x="60" y="335" fill="rgba(56,189,248,0.7)" fontSize="8" fontFamily="monospace">
          LATENCY: &lt; 18ms
        </text>
        <text x="60" y="350" fill="rgba(0,240,255,0.5)" fontSize="8" fontFamily="monospace">
          RRF_SCORE: 0.9882
        </text>
      </svg>
    </div>
  );
}
