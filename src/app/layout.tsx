import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/trpc/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anto Trivia 🎵",
  description: "Quiz musical interactivo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full bg-[#0f0f1a] text-white antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
