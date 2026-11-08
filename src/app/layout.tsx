import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

// Mukta carries Latin and Devanagari in one family, so Hindi and Marathi text matches English.
const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-mukta",
});

export const metadata: Metadata = {
  title: "POD Desk",
  description: "Proof of delivery capture and billing for Company A",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1F4E5F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mukta.variable}>
      <body className="font-sans min-h-dvh"><RegisterServiceWorker />{children}</body>
    </html>
  );
}
