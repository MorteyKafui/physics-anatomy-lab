import type { Metadata } from "next";
import { connection } from "next/server";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./admin.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  title: "Physics Anatomy admin",
  description: "Admin portal for the Physics Anatomy team. Runs behind Cloudflare Access.",
};

/** Every page renders on its request, so it can carry that request's CSP nonce (src/proxy.ts). */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html
      lang="en-GB"
      data-theme="lab"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${geistMono.variable} ${bricolage.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
