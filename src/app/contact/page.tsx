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

      {/* Flagship Hero Banner: Royal Blue to Violet/Purple Gradient (ProteusVision Theme) */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#1D4ED8] via-[#4338CA] to-[#7E22CE] text-white py-16 md:py-24 border-b border-[#1D4ED8]">
        {/* Cyber Matrix Canvas */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <CyberMatrixCanvas particleCount={45} />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-blue-400/25 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-xs font-mono font-medium">
            <span>Direct Hotline &bull; AI Technologies &amp; Consulting</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Connect with Our Engineering &amp; Staffing Leads
          </h1>
          <p className="text-base sm:text-lg text-purple-100 max-w-2xl mx-auto leading-relaxed">
            Reach out for enterprise digital transformation, technical support engineering, or talent recruitment advisory.
          </p>
        </div>
      </section>

      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Office & Info (Ice Blue Pastel Tint from Proteus Theme) */}
            <div className="lg:col-span-5 rounded-3xl border-2 border-[#D0E2FB] bg-[#EEF5FD] p-8 space-y-6 shadow-sm">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-blue-200 text-[#1D4ED8] font-bold font-serif text-xl mb-4 shadow-xs">
                  α
                </div>
                <h3 className="text-2xl font-bold text-[#0B1B3A] tracking-tight">Corporate Headquarters</h3>
                <p className="text-xs text-[#334155] mt-1 font-medium">
                  AI Technologies &amp; Consulting Global Operational Hub
                </p>
              </div>

              <div className="space-y-4 pt-4 text-xs text-[#334155] border-t border-blue-200/60">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#0B1B3A]">Address</div>
                    <div className="text-[#334155]">Jubilee Enclave, Madhapur, Hyderabad, Telangana, India (500081)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#0B1B3A]">Operational Hours</div>
                    <div className="text-[#334155]">24/7 Continuous Autonomous Support &amp; Consultation</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#0B1B3A]">Direct Correspondence</div>
                    <div className="text-[#334155]">contact@aitechconsults.com</div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-blue-200 bg-white/80 text-xs space-y-1 shadow-xs">
                <div className="font-semibold text-[#0B1B3A]">Fast Response Guarantee</div>
                <div className="text-[11px] text-[#4A5B78] leading-relaxed">
                  Client and applicant inquiries are routed into our automated task queue and assigned within 4 business hours.
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-7 rounded-3xl border border-[#DCE6F5] bg-white p-8 sm:p-10 shadow-sm">
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
                    className="mt-4 px-7 py-2.5 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs shadow-sm transition"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-xl font-bold text-[#0B1B3A]">Send Direct Transmission</h3>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A5B78] mb-1.5">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-[#7B8AA6]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A5B78] mb-1.5">Your Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#7B8AA6]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@organization.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A5B78] mb-1.5">Inquiry Category</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-[#7B8AA6]" />
                      <select
                        value={inquiryType}
                        onChange={(e) => setInquiryType(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Client Technology Consultation">Client Technology Consultation</option>
                        <option value="Enterprise Architecture Strategy">Enterprise Architecture Strategy</option>
                        <option value="Talent Staffing & Recruitment">Talent Staffing &amp; Recruitment</option>
                        <option value="Partnership & Integration">Partnership &amp; Integration</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A5B78] mb-1.5">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your enterprise requirements or technical objectives..."
                      className="w-full p-3 rounded-xl bg-white border border-[#C3D3EA] text-xs text-[#0B1B3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
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
