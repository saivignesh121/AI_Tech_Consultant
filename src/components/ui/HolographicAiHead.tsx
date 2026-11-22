"use client";

import React from "react";

export default function HolographicAiHead({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Circle Behind the Head: radial gradient #DBEAFE to #BFDBFE at ~60% opacity */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#DBEAFE]/60 to-[#BFDBFE]/60 rounded-full blur-2xl animate-pulse-glow" />

      {/* Vertical Laser Scanner Beam: cyan gradient with low opacity (.35) */}
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#06B6D4]/35 to-transparent shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-laser-vertical z-20 pointer-events-none" />

      {/* Floating Circuit SVG Illustration */}
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full max-w-[420px] max-h-[420px] [filter:drop-shadow(0_0_6px_rgba(37,99,235,0.35))] relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="auroraBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0284C7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="wireGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#2563EB" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
          </linearGradient>
          <filter id="softGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Orbit Rings in #93C5FD */}
        <circle cx="250" cy="250" r="210" stroke="#93C5FD" strokeWidth="1" strokeDasharray="6 8" strokeOpacity="0.7" />
        <circle cx="250" cy="250" r="185" stroke="#93C5FD" strokeWidth="1.5" strokeOpacity="0.8" />
        <circle cx="250" cy="250" r="160" stroke="#93C5FD" strokeWidth="1" strokeDasharray="4 6" strokeOpacity="0.6" />

        {/* Head Contour (Profile Silhouette & Neural Matrix) in #2563EB */}
        {/* Forehead to Crown */}
        <path
          d="M 210 110 C 270 100, 340 130, 360 200 C 370 240, 365 290, 345 330 C 320 375, 270 410, 220 415"
          stroke="url(#auroraBlue)"
          strokeWidth="2.5"
          filter="url(#softGlowFilter)"
        />

        {/* Brow, Nose, Lips, Chin Contour */}
        <path
          d="M 210 110 C 185 140, 175 170, 180 205 L 170 235 L 188 245 L 175 275 L 195 285 L 180 320 L 220 355 L 230 415"
          stroke="url(#auroraBlue)"
          strokeWidth="3"
          filter="url(#softGlowFilter)"
        />

        {/* Inner Facial Grid Lines (Polygon Matrix) */}
        <path d="M 180 205 L 250 200 L 290 230 L 250 270 L 175 275" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.7" />
        <path d="M 250 200 L 290 150 L 330 180 L 290 230" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.65" />
        <path d="M 290 230 L 345 250 L 340 300 L 285 305 L 250 270" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.7" />
        <path d="M 250 270 L 285 305 L 270 360 L 220 355" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.7" />
        <path d="M 285 305 L 340 300 L 320 360 L 270 360" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.65" />
        <path d="M 290 150 L 240 130 L 210 160 L 250 200" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.6" />

        {/* Eye Neural Node */}
        <circle cx="215" cy="215" r="7" fill="#2563EB" filter="url(#softGlowFilter)" />
        <circle cx="215" cy="215" r="3" fill="#FFFFFF" />

        {/* Brain Cortex Circuit Traces */}
        <path d="M 290 150 L 320 120 L 350 120" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="350" cy="120" r="3.5" fill="#2563EB" />

        <path d="M 330 180 L 380 170 L 400 190" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="400" cy="190" r="3.5" fill="#06B6D4" />

        <path d="M 345 250 L 390 260 L 410 240" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="410" cy="240" r="3.5" fill="#2563EB" />

        <path d="M 340 300 L 390 320 L 415 320" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="415" cy="320" r="3.5" fill="#4F46E5" />

        <path d="M 320 360 L 360 380 L 380 400" stroke="url(#wireGlow)" strokeWidth="1.5" />
        <circle cx="380" cy="400" r="3.5" fill="#06B6D4" />

        {/* Forehead Node & Diagonal Traces */}
        <circle cx="250" cy="165" r="4" fill="#2563EB" />
        <circle cx="290" cy="230" r="5" fill="#06B6D4" />
        <circle cx="250" cy="270" r="4" fill="#2563EB" />
        <circle cx="285" cy="305" r="4.5" fill="#2563EB" />
        <circle cx="270" cy="360" r="4" fill="#06B6D4" />

        {/* Tech Coordinate / Telemetry Crosshairs */}
        <g stroke="#93C5FD" strokeWidth="1" strokeOpacity="0.8">
          <line x1="80" y1="250" x2="110" y2="250" />
          <line x1="95" y1="235" x2="95" y2="265" />
          <circle cx="95" cy="250" r="6" fill="none" />
        </g>

        {/* Data Stream Code Matrix on Left (#1E3A8A at ~70% opacity) */}
        <text x="60" y="160" fill="rgba(30, 58, 138, 0.7)" fontSize="9" fontFamily="monospace" fontWeight="600">
          AI.matrix_v2
        </text>
        <text x="60" y="175" fill="rgba(30, 58, 138, 0.6)" fontSize="8" fontFamily="monospace">
          01101001 01110011
        </text>
        <text x="60" y="190" fill="rgba(30, 58, 138, 0.7)" fontSize="8" fontFamily="monospace">
          &gt; CONNECT: POOL_READY
        </text>
        <text x="60" y="320" fill="rgba(30, 58, 138, 0.65)" fontSize="9" fontFamily="monospace" fontWeight="600">
          DATA_STREAM [ACTIVE]
        </text>
        <text x="60" y="335" fill="rgba(30, 58, 138, 0.75)" fontSize="8" fontFamily="monospace">
          LATENCY: &lt; 18ms
        </text>
        <text x="60" y="350" fill="rgba(30, 58, 138, 0.65)" fontSize="8" fontFamily="monospace">
          RRF_SCORE: 0.9882
        </text>
      </svg>
    </div>
  );
}
