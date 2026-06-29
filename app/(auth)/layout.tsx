import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BuildTech | Autentificare",
  description: "Autentificare cont BuildTech",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-50">{children}</main>;
}
