"use client";

import React, { useState } from "react";
import WebsiteHeader from "@/components/layout/WebsiteHeader";
import CyberMatrixCanvas from "@/components/ui/CyberMatrixCanvas";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, User, Briefcase } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState("Client Technology Consultation");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <WebsiteHeader />

      <main className="flex-1 relative overflow-hidden py-16 md:py-24">
        <CyberMatrixCanvas particleCount={45} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium">
              <span>Direct Hotline &bull; AI Technologies &amp; Consulting</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Connect with Our Engineering &amp; Staffing Leads
            </h1>
            <p className="text-base sm:text-lg text-gray-300">
              Reach out for enterprise digital transformation, technical support engineering, or talent recruitment advisory.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Office & Info */}
            <div className="lg:col-span-5 rounded-2xl border border-gray-800 bg-[#071329] p-8 space-y-6">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black border border-gray-700 text-cyan-400 font-bold font-serif text-xl mb-4">
                  α
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Corporate Headquarters</h3>
                <p className="text-xs text-gray-400 mt-1">
                  AI Technologies &amp; Consulting Global Operational Hub
                </p>
              </div>

              <div className="space-y-4 pt-2 text-xs text-gray-300 border-t border-gray-800">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Address</div>
                    <div className="text-gray-400">Jubilee Enclave, Madhapur, Hyderabad, Telangana, India (500081)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Operational Hours</div>
                    <div className="text-gray-400">24/7 Continuous Autonomous Support &amp; Consultation</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Direct Correspondence</div>
                    <div className="text-gray-400">contact@aitechconsults.com</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/30 text-xs text-cyan-300 space-y-1">
                <div className="font-semibold">Fast Response Guarantee</div>
                <div className="text-[11px] text-gray-300">
                  Client and applicant inquiries are routed into our automated task queue and assigned within 4 business hours.
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-7 rounded-2xl border border-cyan-500/30 bg-[#08152e] p-8 shadow-xl">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Inquiry Transmitted!</h3>
                  <p className="text-sm text-gray-300 max-w-md mx-auto">
                    Thank you, {name}. Your transmission has been received by our engineering leads in Hyderabad.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-lg font-bold text-white">Send Direct Transmission</h3>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Your Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@organization.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Inquiry Category</label>
                    <select
                      value={inquiryType}
                      onChange={(e) => setInquiryType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option>Client Technology Consultation</option>
                      <option>Enterprise Staffing &amp; Recruitment</option>
                      <option>Career Opportunity / Job Applicant</option>
                      <option>AI Model Architecture &amp; Evals</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Outline your requirements or candidate background..."
                      className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs tracking-wide transition shadow-lg shadow-cyan-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? "Transmitting..." : "Send Transmission to Leads"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
