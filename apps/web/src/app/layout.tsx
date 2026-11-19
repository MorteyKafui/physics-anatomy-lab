import { colour } from "@pa/ui";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Offline } from "./offline";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const viewport: Viewport = { themeColor: colour.ink950 };

const DESCRIPTION =
  "Physics from first principles. Build real experiments, take your own readings, and get coached.";

/**
 * The site's own address, which social cards need in full (logo set brief, decision 6). Set
 * SITE_URL when building for staging or production; until the domain is chosen, local builds
 * use the dev server.
 */
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${geist.variable} ${geistMono.variable} ${bricolage.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Offline />
      </body>
    </html>
  );
}
