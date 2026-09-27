import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const logoFile = path.join(process.cwd(), "public", "brand", "impact-beauty-studio-logo.png");

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Impact Beauty Studio by Vee",
    template: "%s · Impact Beauty Studio",
  },
  description: "Premium wig installation and makeup by Vee. Choose a service, pick an available time, and receive confirmation.",
  icons: existsSync(logoFile) ? { icon: "/brand/impact-beauty-studio-logo.png" } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-3 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
