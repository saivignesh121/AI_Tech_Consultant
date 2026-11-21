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
  initialCategory?: "client" | "applicant";
}) {
  const [category, setCategory] = useState<"client" | "applicant">(initialCategory);
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
              {category === "applicant"
                ? `Thank you, ${name || "Applicant"}. Your technical profile has been logged in our talent intelligence engine. Our recruitment leads will review your credentials.`
                : `Thank you, ${name || "Client"}. Our senior AI engineering consultants have received your inquiry and will reach out within 4 business hours.`}
            </p>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-lg shadow-cyan-500/30"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black border border-gray-700 text-cyan-400 font-bold font-serif text-sm">
                α
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Connect with AI Technologies & Consulting</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Enterprise digital transformation, autonomous tech support engineering, and customized talent staffing.
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
                Enterprise Client Inquiry
              </button>
              <button
                type="button"
                onClick={() => setCategory("applicant")}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  category === "applicant"
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Applicant / Career Portal
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
                    placeholder={category === "applicant" ? "Sarah Jenkins (Senior AI Architect)" : "David Miller (CTO)"}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Professional Email</label>
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
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  {category === "applicant" ? "Role Applying For / Primary Skill" : "Project Objective / Stack"}
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={roleOrTopic}
                    onChange={(e) => setRoleOrTopic(e.target.value)}
                    placeholder={category === "applicant" ? "Cloud Systems Architect / PostgreSQL 18" : "Digital Transformation & Support Automation"}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Message / Requirements</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={category === "applicant" ? "Summarize your architectural expertise, portfolio link, or availability..." : "Tell us about your technical support scaling goals or modernization timeline..."}
                    className="w-full p-2.5 rounded-lg bg-gray-900/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Transmitting..." : "Send Transmission"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
