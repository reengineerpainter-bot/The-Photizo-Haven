import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { CapacitorProvider } from "@/components/native/CapacitorProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "The Photizo Haven",
  description: "Secure group giving tracker — Tithe, PCO Seed, Haven Dues, Welfare & Local Partnership",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <CapacitorProvider>{children}</CapacitorProvider>
      </body>
    </html>
  );
}
