import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Metadata } from "next";

import { LegalDocument } from "../legal-document";

export const metadata: Metadata = { title: "Terms of Use (draft) · Physics Anatomy" };
export const dynamic = "force-static";

/** The Terms of Use from the Legal and Policy Pack, as a draft until UEW's review (D25). */
export default async function Page() {
  const markdown = await readFile(join(process.cwd(), "src/app/(legal)/terms.md"), "utf8");
  return <LegalDocument markdown={markdown} />;
}
