"use client";

import React, { useState } from "react";
import { X, Send, Sparkles, CheckCircle2, User, Mail, Briefcase, MessageSquare } from "lucide-react";

export default function ConnectModal({
  isOpen,
  onClose,
  initialCategory = "client",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: "client" | "advisory";
}) {
  const [category, setCategory] = useState<"client" | "advisory">(initialCategory);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleOrTopic, setRoleOrTopic] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  const handleReset = () => {
    setSubmitted(false);
    setName("");
    setEmail("");
    setRoleOrTopic("");
    setMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B3A]/35 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#DCE6F5] bg-white p-6 shadow-2xl text-[#0B1B3A] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 inset-x-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#0284C7] to-[#2563EB]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7B8AA6] hover:text-[#0B1B3A] p-1.5 rounded-lg hover:bg-[#EEF4FF] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0B1B3A] tracking-tight">Transmission Acknowledged!</h3>
            <p className="text-sm text-[#4A5B78] max-w-sm mx-auto">
              Thank you, {name || "Client"}. Our senior AI engineering consultants have received your inquiry and will reach out within 4 business hours.
            </p>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-semibold text-xs transition shadow-md shadow-blue-500/20"
              >
                Close &amp; Return
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-bold font-serif text-sm shadow-sm">
                α
              </div>
              <h2 className="text-lg font-bold text-[#0B1B3A] tracking-tight">Connect with AI Technologies &amp; Consulting</h2>
            </div>
            <p className="text-xs text-[#4A5B78] mb-5">
              Enterprise digital transformation, autonomous tech support engineering, and customized AI architectures.
            </p>

            {/* Category Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#EEF4FF] border border-[#DCE6F5] mb-5">
              <button
                type="button"
                onClick={() => setCategory("client")}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  category === "client"
                    ? "bg-white text-[#2563EB] shadow-sm"
                    : "text-[#4A5B78] hover:text-[#0B1B3A]"
                }`}
              >
                Enterprise AI Consultation
              </button>
              <button
                type="button"
                onClick={() => setCategory("advisory")}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  category === "advisory"
                    ? "bg-white text-[#2563EB] shadow-sm"
                    : "text-[#4A5B78] hover:text-[#0B1B3A]"
                }`}
              >
                Architecture &amp; Strategy
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A5B78] mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[#7B8AA6]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="David Miller (CTO / VP Engineering)"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5B78] mb-1">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#7B8AA6]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5B78] mb-1">Target Initiative / Architecture Scope</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-[#7B8AA6]" />
                  <input
                    type="text"
                    value={roleOrTopic}
                    onChange={(e) => setRoleOrTopic(e.target.value)}
                    placeholder="e.g. Migration to Postgres 18 pgvector, SLA Automation"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A5B78] mb-1">Project Details / Requirements</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Outline current tech stack, pain points, or staffing timeline..."
                  className="w-full p-2.5 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#4A5B78] hover:text-[#0B1B3A] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Transmitting..." : "Send Request"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
