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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0F19] text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
