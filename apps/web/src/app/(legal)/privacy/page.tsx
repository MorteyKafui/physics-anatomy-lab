import type { Metadata } from "next";

import { accountsEnabled } from "../../accounts";
import { LegalDocument } from "../legal-document";
import open from "../privacy-open.md?raw";
import markdown from "../privacy.md?raw";

export const metadata: Metadata = { title: "Privacy Policy (draft) · Physics Anatomy" };

/**
 * The Privacy Policy from the Legal and Policy Pack, as a draft until UEW's review (D25). The text is
 * bundled at build time: pages render on each request for their CSP nonce, and the server has
 * no files to read.
 *
 * With accounts switched off (ADR 0047) it is the open lab's version: no accounts, classes,
 * teachers or AI, and nothing kept about a visitor but the anonymous counts (ADR 0048).
 */
export default function Page() {
  return <LegalDocument markdown={accountsEnabled() ? markdown : open} />;
}
