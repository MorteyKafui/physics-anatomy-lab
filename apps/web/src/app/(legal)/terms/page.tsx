import type { Metadata } from "next";

import { accountsEnabled } from "../../accounts";
import { LegalDocument } from "../legal-document";
import open from "../terms-open.md?raw";
import markdown from "../terms.md?raw";

export const metadata: Metadata = { title: "Terms of Use (draft) · Physics Anatomy" };

/**
 * The Terms of Use from the Legal and Policy Pack, as a draft until UEW's review (D25). The text is
 * bundled at build time: pages render on each request for their CSP nonce, and the server has
 * no files to read.
 *
 * With accounts switched off (ADR 0047) it is the open lab's version, without the parts about
 * accounts, classes and AI.
 */
export default function Page() {
  return <LegalDocument markdown={accountsEnabled() ? markdown : open} />;
}
