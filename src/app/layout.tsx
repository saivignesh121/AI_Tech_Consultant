import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Tech Consultant — Multi-Tenant SaaS",
  description: "Enterprise multi-tenant AI tech consultant with self-improving knowledge brain and model telemetry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F6F9FF] text-[#0B1B3A] antialiased">
        {children}
      </body>
    </html>
  );
}
