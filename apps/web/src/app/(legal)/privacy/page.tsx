import type { Metadata } from "next";

import markdown from "../privacy.md?raw";
import { LegalDocument } from "../legal-document";

export const metadata: Metadata = { title: "Privacy Policy (draft) · Physics Anatomy" };

/**
 * The Privacy Policy from the Legal and Policy Pack, as a draft until UEW's review (D25). The text is
 * bundled at build time: pages render on each request for their CSP nonce, and the server has
 * no files to read.
 */
export default function Page() {
  return <LegalDocument markdown={markdown} />;
}
