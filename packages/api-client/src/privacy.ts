// Joining a data export's pages into the one file a person downloads (ADR 0042). The API pages
// the attempts so a dropped connection costs one page; a failed page is tried again a few times.
import type { Result } from "./client";
import type { AttemptFile, ExportAttemptsPage, StudentExport, TeacherExport } from "./generated";

/** The downloaded file: the summary, then every attempt as the lab's own attempt file. */
export type ExportFile = (TeacherExport | StudentExport) & { attempt_files: AttemptFile[] };

const TRIES = 3;

export async function collectExport(
  summary: () => Promise<Result<TeacherExport | StudentExport>>,
  page: (after: string | null) => Promise<Result<ExportAttemptsPage>>,
): Promise<Result<ExportFile>> {
  const head = await summary();
  if (!head.ok) return head;
  const files: AttemptFile[] = [];
  let after: string | null = null;
  for (;;) {
    let got = await page(after);
    for (let i = 1; i < TRIES && !got.ok && got.status === 0; i++) got = await page(after);
    if (!got.ok) return got;
    files.push(...got.data.attempts);
    if (!got.data.more) break;
    after = got.data.cursor;
  }
  return { ok: true, data: { ...head.data, attempt_files: files } };
}

/** A file name for the download, such as physics-anatomy-data-2026-11-19.json. */
export function exportFileName(exportedAt: string, who = "data"): string {
  const day = exportedAt.slice(0, 10);
  const safe = who.replace(/[^\w.-]+/g, "_");
  return `physics-anatomy-${safe}-${day}.json`;
}
