import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import SupportButton from "@/components/SupportButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TechPoint | Magazinul Tău",
  description: "E-commerce creat pentru licență",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className={inter.className}>
        {children}
        <SupportButton />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
