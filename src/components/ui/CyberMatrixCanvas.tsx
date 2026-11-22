"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export default function CyberMatrixCanvas({
  className = "",
  particleCount = 55,
}: {
  className?: string;
  particleCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse coordinates for interactive connection
    const mouse = { x: -1000, y: -1000, radius: 120 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove);
      parent.addEventListener("mouseleave", handleMouseLeave);
    }

    // Color palette for Aurora Light: #93C5FD at 40-60% opacity and accents in cyan/indigo
    const colors = [
      "rgba(147, 197, 253, ",
      "rgba(37, 99, 235, ",
      "rgba(6, 182, 212, ",
      "rgba(79, 70, 229, ",
    ];

    // Initialize particles
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.6,
        vy: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.2 + 0.4, // 40-60% opacity
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Floating DATA / JSON / AI labels in #93C5FD / #1E3A8A
    const codeTokens = ["01", "10", "AI.run", "sys.conn", "DATA", "SSL", "RRF", "HTTP/2", "TOKEN", "JSON"];
    const floatingTokens = Array.from({ length: 8 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: prefersReducedMotion ? 0 : -0.2 - Math.random() * 0.25,
      text: codeTokens[Math.floor(Math.random() * codeTokens.length)],
      alpha: 0.35 + Math.random() * 0.25,
    }));

    // Animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw floating code tokens in #93C5FD at 40-60% opacity
      ctx.font = "10px monospace";
      for (const tok of floatingTokens) {
        ctx.fillStyle = `rgba(147, 197, 253, ${tok.alpha})`;
        ctx.fillText(tok.text, tok.x, tok.y);
        tok.y += tok.vy;
        if (tok.y < -20) {
          tok.y = height + 20;
          tok.x = Math.random() * width;
        }
      }

      // 2. Update & Draw Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Bounce on boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.shadowColor = "rgba(37, 99, 235, 0.25)";
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect to mouse if close
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < mouse.radius) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          const mouseAlpha = (1 - distMouse / mouse.radius) * 0.45;
          ctx.strokeStyle = `rgba(147, 197, 253, ${mouseAlpha})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }

        // Connect to neighboring particles with #93C5FD at 40-60% opacity
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / 110) * 0.35;
            ctx.strokeStyle = `rgba(147, 197, 253, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
    />
  );
}
