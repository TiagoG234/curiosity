import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Curiosity - Learning Interest Tracker",
  description: "Track your learning interests with guilt-free exploration."
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
