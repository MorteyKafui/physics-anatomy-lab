import { colour } from "@pa/ui";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import { Offline } from "./offline";
import { SITE_URL } from "./site";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const viewport: Viewport = { themeColor: colour.ink950 };

const DESCRIPTION =
  "Physics from first principles. Build real experiments, take your own readings, and get coached.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Physics Anatomy",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Physics Anatomy",
    title: "Physics Anatomy",
    description: DESCRIPTION,
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: "Physics Anatomy", description: DESCRIPTION },
  applicationName: "Physics Anatomy",
  appleWebApp: { capable: true, title: "Physics Anatomy", statusBarStyle: "black" },
};

/**
 * Every page renders on its request, so it can carry that request's CSP nonce (src/proxy.ts and
 * docs/security/asvs-review-brief.md). The service worker still keeps every page for offline use.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en-GB" className={`${geist.variable} ${geistMono.variable} ${bricolage.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Offline />
      </body>
    </html>
  );
}
