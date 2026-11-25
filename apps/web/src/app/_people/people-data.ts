import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

/**
 * The people pages' data (docs/content/people-pages-brief.md, decision 2): three files Mortey
 * approves. Nobody appears on the site without the date they agreed to be listed, and no logo
 * without the date of written permission: an entry without one fails the build, never the page.
 */
const day = z.iso.date();
const sitePath = z.string().regex(/^\/[\w./-]+$/, "a path under apps/web/public, starting with /");

export const TeamMember = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  photo: sitePath.optional(),
  agreed: day,
});

export const Partner = z.object({
  name: z.string().min(2),
  kind: z.enum(["partner", "sponsor", "donor"]),
  logo: sitePath,
  link: z.url().optional(),
  permission: day,
});

export const Contributor = z.object({
  name: z.string().min(2),
  contribution: z.string().min(2),
  agreed: day,
});

export type TeamMember = z.infer<typeof TeamMember>;
export type Partner = z.infer<typeof Partner>;
export type Contributor = z.infer<typeof Contributor>;

/** A list file's entries, checked against its schema; a bad entry names its file and fails. */
export function readList<T>(file: string, schema: z.ZodType<T>, text?: string): T[] {
  const raw: unknown = parse(text ?? readFileSync(file, "utf8")) ?? [];
  const result = z.array(schema).safeParse(raw);
  if (!result.success) {
    throw new Error(`${file} has an entry the site can't show:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

// Read when the pages are built (they are static). Literal paths, so the build traces only these.
const cwd = process.cwd();
export const team = () => readList(join(cwd, "content/team.yml"), TeamMember);
export const partners = () => readList(join(cwd, "content/partners.yml"), Partner);
export const contributors = () => readList(join(cwd, "../../CONTRIBUTORS.yml"), Contributor);

/** The project's public repository (ADR 0037). */
export const REPOSITORY = "https://github.com/MorteyKafui/physics-anatomy-lab";
