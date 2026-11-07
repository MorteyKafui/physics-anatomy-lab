import { colour } from "@pa/ui";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Offline } from "./offline";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const viewport: Viewport = { themeColor: colour.ink950 };

export const metadata: Metadata = {
  title: "Physics Anatomy",
  description:
    "Physics from first principles. Build real experiments, take your own readings, and get coached.",
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
