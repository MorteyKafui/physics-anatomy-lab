import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { Logo } from "@pa/ui";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A legal document from the Legal and Policy Pack (D25), shown as the draft it is until UEW's
 * legal and ethics review. The text is the pack's, word for word, kept as Markdown beside each
 * page; blanks the pack leaves for the operator to fill, such as [[Contact email]], are shown as
 * marked gaps, never filled in with guesses.
 *
 * Only the Markdown the pack uses is read: headings, paragraphs, bullet lists, tables, bold and
 * links. Rendered on the server, so the page ships no script of its own.
 */
export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <div className="min-h-dvh bg-[var(--pa-paper)] text-[var(--pa-on-paper)]">
      <header className="border-b border-[var(--pa-paper-line)]">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-4 py-4 sm:px-8">
          <Link
            prefetch={false}
            href="/"
            className="flex items-center gap-2.5 text-[var(--pa-on-paper)] no-underline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]"
          >
            <Logo size={24} />
            <span className="font-display text-base font-bold">Physics Anatomy</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-12 sm:px-8">
        <p
          role="note"
          className="m-0 border border-[var(--pa-warn)] bg-[color-mix(in_srgb,var(--pa-warn)_12%,white)] px-4 py-3 text-[15px]"
        >
          {t("legal.draft")}
        </p>
        {blocks(markdown)}
      </main>
    </div>
  );
}

/** Bold, links and the pack's [[blanks]] inside one line of text. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)]+)\)/g;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > at) out.push(text.slice(at, m.index));
    if (m[1]) out.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2])
      out.push(
        <mark
          key={m.index}
          data-blank
          title={t("legal.blank")}
          className="bg-[color-mix(in_srgb,var(--pa-warn)_25%,white)] px-1 text-[var(--pa-on-paper)]"
        >
          {m[2]}
        </mark>,
      );
    else
      out.push(
        <a key={m.index} href={m[4]} className="text-[var(--pa-on-paper)] underline">
          {m[3]}
        </a>,
      );
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

function blocks(markdown: string): ReactNode[] {
  const out: ReactNode[] = [];
  const groups = markdown.trim().split(/\n\s*\n/);
  groups.forEach((group, i) => {
    const lines = group.split("\n");
    const first = lines[0]!;
    if (first.startsWith("# ")) {
      out.push(
        <h1
          key={i}
          className="m-0 font-display text-[clamp(36px,6vw,56px)] font-extrabold leading-none tracking-[-0.03em]"
        >
          {first.slice(2)}
        </h1>,
      );
    } else if (first.startsWith("## ")) {
      out.push(
        <h2 key={i} className="m-0 mt-4 text-2xl font-semibold">
          {inline(first.slice(3))}
        </h2>,
      );
    } else if (first.startsWith("- ")) {
      out.push(
        <ul key={i} className="m-0 flex list-disc flex-col gap-1.5 pl-6">
          {lines.map((l, j) => (
            <li key={j}>{inline(l.slice(2))}</li>
          ))}
        </ul>,
      );
    } else if (first.startsWith("|")) {
      const [head, , ...rows] = lines;
      out.push(
        <div key={i} className="overflow-x-auto">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr>
                {cells(head!).map((c, j) => (
                  <th
                    key={j}
                    scope="col"
                    className="border border-[var(--pa-paper-line)] bg-[var(--pa-paper-2)] px-3 py-2 text-left font-semibold"
                  >
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, j) => (
                <tr key={j}>
                  {cells(r).map((c, k) => (
                    <td
                      key={k}
                      className="border border-[var(--pa-paper-line)] px-3 py-2 align-top"
                    >
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else {
      out.push(
        <p
          key={i}
          className={`m-0 leading-relaxed ${i === 1 ? "text-sm text-[var(--pa-on-paper-muted)]" : ""}`}
        >
          {inline(lines.join(" "))}
        </p>,
      );
    }
  });
  return out;
}
