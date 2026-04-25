// app/layout.tsx
// The root layout wraps EVERY page in the app.
// It loads the font, sets the page title, and wraps everything in the
// SessionProvider so any page can check if the user is logged in.

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";

// Geist Sans — the font that ships with Next.js
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap", // Prevents invisible text while font loads
});

// SEO metadata shown in browser tabs and Google search results
export const metadata: Metadata = {
  title: {
    default: "Blu — Find Trusted Tradespeople in Ghana",
    template: "%s | Blu",
  },
  description:
    "Connect with verified plumbers, electricians, masons, and more across Ghana. Safe payments, real reviews, guaranteed work.",
  keywords: ["tradespeople", "Ghana", "plumber", "electrician", "mason", "Accra"],
};

// Mobile viewport settings — prevent iOS from zooming in on input fields
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Stops iOS auto-zoom on form inputs
  userScalable: false,
  themeColor: "#1A56DB", // Sets the browser chrome color on Android
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="font-[--font-geist-sans] bg-white text-text-primary">
        {/*
          Providers wraps the app in SessionProvider (NextAuth) so every page
          can call useSession() to check who is logged in.
        */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
