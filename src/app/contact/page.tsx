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
    <div className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <WebsiteHeader />

      <main className="flex-1 relative overflow-hidden py-16 md:py-24">
        <CyberMatrixCanvas particleCount={45} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-mono font-medium shadow-xs">
              <span>Direct Hotline &bull; AI Technologies &amp; Consulting</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B1B3A] tracking-tight">
              Connect with Our Engineering &amp; Staffing Leads
            </h1>
            <p className="text-base sm:text-lg text-[#4A5B78]">
              Reach out for enterprise digital transformation, technical support engineering, or talent recruitment advisory.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Office & Info */}
            <div className="lg:col-span-5 rounded-2xl border border-[#DCE6F5] bg-white p-8 space-y-6 shadow-sm">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284C7] to-[#2563EB] text-white font-bold font-serif text-xl mb-4 shadow-sm">
                  α
                </div>
                <h3 className="text-xl font-bold text-[#0B1B3A] tracking-tight">Corporate Headquarters</h3>
                <p className="text-xs text-[#4A5B78] mt-1">
                  AI Technologies &amp; Consulting Global Operational Hub
                </p>
              </div>

              <div className="space-y-4 pt-2 text-xs text-[#4A5B78] border-t border-[#DCE6F5]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#0B1B3A]">Address</div>
                    <div className="text-[#4A5B78]">Jubilee Enclave, Madhapur, Hyderabad, Telangana, India (500081)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#0B1B3A]">Operational Hours</div>
                    <div className="text-[#4A5B78]">24/7 Continuous Autonomous Support &amp; Consultation</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#0B1B3A]">Direct Correspondence</div>
                    <div className="text-[#4A5B78]">contact@aitechconsults.com</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-[#0369A1] space-y-1">
                <div className="font-semibold text-[#0B1B3A]">Fast Response Guarantee</div>
                <div className="text-[11px] text-[#4A5B78]">
                  Client and applicant inquiries are routed into our automated task queue and assigned within 4 business hours.
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-7 rounded-2xl border border-[#DCE6F5] bg-white p-8 shadow-sm">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0B1B3A]">Inquiry Transmitted!</h3>
                  <p className="text-sm text-[#4A5B78] max-w-md mx-auto">
                    Thank you, {name}. Your transmission has been received by our engineering leads in Hyderabad.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-bold text-xs shadow-md shadow-blue-500/20"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-lg font-bold text-[#0B1B3A]">Send Direct Transmission</h3>

                  <div>
                    <label className="block text-xs font-medium text-[#4A5B78] mb-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-[#7B8AA6]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A5B78] mb-1">Your Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#7B8AA6]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@organization.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A5B78] mb-1">Inquiry Category</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-[#7B8AA6]" />
                      <select
                        value={inquiryType}
                        onChange={(e) => setInquiryType(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Client Technology Consultation">Client Technology Consultation</option>
                        <option value="Enterprise Architecture Strategy">Enterprise Architecture Strategy</option>
                        <option value="Talent Staffing & Recruitment">Talent Staffing &amp; Recruitment</option>
                        <option value="Partnership & Integration">Partnership &amp; Integration</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A5B78] mb-1">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your enterprise requirements or technical objectives..."
                      className="w-full p-3 rounded-lg bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:brightness-105 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? "Transmitting..." : "Send Transmission"}</span>
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
