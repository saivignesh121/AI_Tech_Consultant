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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-[#071126] p-6 shadow-2xl shadow-cyan-500/20 text-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Glowing Top Ambient Beam */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00F0FF]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Transmission Acknowledged!</h3>
            <p className="text-sm text-gray-300 max-w-sm mx-auto">
              Thank you, {name || "Client"}. Our senior AI engineering consultants have received your inquiry and will reach out within 4 business hours.
            </p>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-lg shadow-cyan-500/30"
              >
                Close &amp; Return
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black border border-gray-700 text-cyan-400 font-bold font-serif text-sm">
                α
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Connect with AI Technologies &amp; Consulting</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Enterprise digital transformation, autonomous tech support engineering, and customized AI architectures.
            </p>

            {/* Category Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-900/80 border border-gray-800 mb-5">
              <button
                type="button"
                onClick={() => setCategory("client")}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  category === "client"
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Enterprise AI Consultation
              </button>
              <button
                type="button"
                onClick={() => setCategory("advisory")}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  category === "advisory"
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Architecture &amp; Strategy
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="David Miller (CTO / VP Engineering)"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Target Initiative / Architecture Scope</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={roleOrTopic}
                    onChange={(e) => setRoleOrTopic(e.target.value)}
                    placeholder="e.g., Autonomous Support Agent, Hybrid Vector Ingestion, Cloud LLM Routing"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Detailed Technical Requirements</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Outline your timeline, current tech stack, and goals..."
                  className="w-full p-2.5 rounded-lg bg-gray-900/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Encrypting & Transmitting..." : "Submit Strategic Consultation"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
