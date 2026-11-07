"use client";

import {
  decideReport,
  MAX_SECTION,
  replay,
  REPORT_FORMATS,
  reportProjection,
  type ReportCommand,
} from "@pa/engine";
import { simplePendulum } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn, Logo } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { csvText, pngBytes, save, svgText, zipBytes } from "../snapshot-export";
import { sheetSize, SnapshotSheet } from "../snapshot-figure";
import { useAttempt } from "../use-attempt";
import { PRECAUTIONS_NEEDED, reportContent, type ReportSection } from "./content";
import { reportDocx } from "./docx";
import { BenchDrawing, GraphFigure } from "./drawings";
import { makeReportPdf, reportImages } from "./make";
import type { Paper } from "./pdf";
import { tableXlsx } from "./xlsx";

const E = simplePendulum;
const KINDS = ["pdf", "docx", "figures", "data"] as const;
type Kind = (typeof KINDS)[number];
const INCLUDES = ["captions", "mark", "logo", "notes"] as const;
type Include = (typeof INCLUDES)[number];

/** One section on the paper: the student's words or the attempt's, and an editor when asked. */
function SectionText({ section }: { section: ReportSection }) {
  const lines = section.text.split("\n").filter((l) => l.trim() !== "");
  const items = lines.filter((l) => /^\s*[-•]\s+/.test(l));
  if (lines.length === 0)
    return <p className="text-[var(--pa-on-paper-muted)] italic">{t("report.toDo")}</p>;
  if (section.id === "calculation")
    return (
      <div className="flex flex-col gap-0.5 font-mono text-[12.5px]">
        {lines.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    );
  if (section.id === "precautions" || section.id === "sources" || section.id === "apparatus")
    return (
      <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
        {lines.map((l, i) => (
          <li key={i}>{l.replace(/^\s*[-•]\s+/, "")}</li>
        ))}
      </ul>
    );
  return (
    <div className="flex flex-col gap-1">
      {lines.map((l, i) =>
        items.includes(l) ? (
          <span key={i} className="pl-4 -indent-3">
            • {l.replace(/^\s*[-•]\s+/, "")}
          </span>
        ) : (
          <p key={i} className="m-0">
            {l}
          </p>
        ),
      )}
    </div>
  );
}

/**
 * Step 10: the lab report (approved board Report.dc.html), written from the attempt in the WASSCE
 * or university format. The student edits any section; the PDF, Word file, figures and data are
 * made on this device.
 */
export function ReportScreen() {
  const handle = useAttempt(E.id);
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<Kind>("pdf");
  const [mono, setMono] = useState(false);
  const [include, setInclude] = useState<Record<Include, boolean>>({
    captions: true,
    mark: true,
    logo: false,
    notes: false,
  });
  const [paper, setPaper] = useState<Paper>("a4");
  const [toast, setToast] = useState<string>();
  const [busy, setBusy] = useState(false);
  const bench = useRef<SVGSVGElement>(null);
  const graph = useRef<SVGSVGElement>(null);
  const benchSheet = useRef<SVGSVGElement>(null);
  const graphSheet = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const events = handle?.events;
  const attempt = handle?.attempt;
  const content = useMemo(
    () => (attempt && events ? reportContent(attempt, events) : undefined),
    [attempt, events],
  );

  if (!handle || !content) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground"
        aria-busy="true"
      >
        {t("lab.loading")}
      </main>
    );
  }

  const run = async (c: ReportCommand) => {
    const d = decideReport(replay(reportProjection, handle.attempt, handle.events), c);
    if (d.ok) await handle.record(d.events);
  };

  const open = (s: ReportSection) => {
    setEditing(s.id);
    setDraft(s.text);
    requestAnimationFrame(() =>
      document.getElementById(`report-${s.id}`)?.scrollIntoView({ block: "nearest" }),
    );
  };
  const finish = async (s: ReportSection) => {
    setEditing(undefined);
    const text = draft.replace(/\s+$/, "");
    if (text === s.text) return;
    await run(
      text === s.generated
        ? { type: "reset", section: s.id }
        : { type: "edit", section: s.id, text },
    );
  };

  const options = { paper, captions: include.captions, mark: include.mark, notes: include.notes };
  const colours = t(mono ? "report.colours.mono" : "report.colours.colour");
  const download = async () => {
    setBusy(true);
    try {
      if (kind === "pdf") {
        const pdf = await makeReportPdf(
          content,
          bench.current ?? undefined,
          graph.current ?? undefined,
          options,
        );
        save(pdf.bytes, `${E.id}-report.pdf`, "application/pdf");
        setToast(
          pdf.pages === 1
            ? t("report.made.pdf.one", { colours })
            : t("report.made.pdf", { pages: pdf.pages, colours }),
        );
      } else if (kind === "docx") {
        const images = await reportImages(bench.current ?? undefined, graph.current ?? undefined);
        save(
          reportDocx(content, images, options),
          `${E.id}-report.docx`,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        setToast(t("report.made.docx", { colours }));
      } else if (kind === "figures") {
        const files: Record<string, Uint8Array | string> = {};
        for (const [el, scene, stem] of [
          [benchSheet.current, content.bench, `fig-1-${E.id}-bench`],
          [graphSheet.current, content.graph, `fig-2-${E.id}-graph`],
        ] as const) {
          if (!el) continue;
          const svg = svgText(el);
          const { width, height } = sheetSize(scene);
          files[`${stem}.svg`] = svg;
          files[`${stem}.png`] = await pngBytes(svg, width, height);
        }
        save(zipBytes(files), `${E.id}-figures.zip`, "application/zip");
        setToast(t("report.made.figures", { colours }));
      } else {
        const { headings, rows } = content.table;
        save(
          zipBytes({
            "table-1.csv": csvText(headings, rows),
            "table-1.xlsx": tableXlsx(t("report.table"), headings, rows),
          }),
          `${E.id}-data.zip`,
          "application/zip",
        );
        setToast(t("report.made.data"));
      }
    } finally {
      setBusy(false);
    }
  };

  const seg = (on: boolean) =>
    cn(
      "h-[30px] px-2.5 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-ring",
      on ? "bg-foreground text-background" : "bg-transparent text-soft",
    );
  const statusOf = (s: ReportSection) =>
    s.status.kind === "count"
      ? t("report.status.count", { n: s.status.n, of: PRECAUTIONS_NEEDED })
      : s.status.kind === "todo"
        ? t("report.status.todo")
        : "";
  const precautions = content.sections.find((s) => s.id === "precautions");
  const short =
    precautions?.status.kind === "count" ? PRECAUTIONS_NEEDED - precautions.status.n : 0;

  const figure = (s: ReportSection) => {
    if (s.figure === "bench")
      return (
        <figure className="m-0 flex flex-col items-center gap-1.5">
          <BenchDrawing scene={content.bench} label={content.bench.alt} />
          {include.captions && s.text && (
            <figcaption className="text-[12.5px]">{s.text}</figcaption>
          )}
        </figure>
      );
    if (s.figure === "graph")
      return (
        <figure className="m-0 flex flex-col items-center gap-1.5">
          <GraphFigure scene={content.graph} mono={mono} label={content.graph.alt} />
          {include.captions && s.text && (
            <figcaption className="text-[12.5px]">{s.text}</figcaption>
          )}
        </figure>
      );
    if (s.figure === "table") {
      const { headings, rows } = content.table;
      return (
        <div className="flex flex-col gap-1.5">
          {s.id === "observations" ? (
            <SectionText section={s} />
          ) : (
            include.captions && s.text && <b className="text-[12.5px]">{s.text}</b>
          )}
          {headings.length > 0 && (
            // Scrolls sideways on a phone, so the keyboard can reach it too.
            <div
              className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-[var(--pa-ring)]"
              tabIndex={0}
              role="region"
              aria-label={t("report.table")}
            >
              <table className="w-full border-collapse border border-[var(--pa-on-paper)] font-mono text-[12.5px]">
                <thead>
                  <tr className="border-b border-[var(--pa-on-paper)]">
                    {headings.map((h, i) => (
                      <th key={i} scope="col" className="px-2 py-1 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j} className="px-2 py-1">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="flex min-h-dvh flex-col gap-3.5 bg-[var(--pa-ink-1000)] p-3.5 text-foreground">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border border-border bg-[var(--pa-ink-900)] px-4 py-3">
        <Link
          href="/"
          aria-label={t("lab.rail.home")}
          className="flex size-[30px] items-center justify-center bg-foreground text-background"
        >
          <Logo size={20} />
        </Link>
        <nav
          aria-label={t("review.back")}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Link href={`/lab/${E.id}`} className="hover:text-foreground">
            {t("experiments.simple-pendulum.title")}
          </Link>
          <span aria-hidden>›</span>
          <h1 className="text-foreground" aria-current="page">
            {t("report.title")}
          </h1>
        </nav>
        <span className="border border-input px-2 py-0.5 text-xs text-soft">
          {t("report.stepOf")}
        </span>
        <span className="flex-1" />
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full bg-[var(--pa-ok)]" />
          {t("report.saved")}
        </span>
      </header>

      <div className="flex flex-wrap items-start gap-3.5">
        {/* Sections */}
        <nav
          aria-label={t("report.sections")}
          className="flex min-w-0 flex-[1_1_240px] flex-col border border-border bg-[var(--pa-ink-900)] lg:max-w-[280px]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-3">
            <span className="text-[15px] font-medium">{t("report.sections")}</span>
            <div
              role="group"
              aria-label={t("report.formatGroup")}
              className="flex border border-input"
            >
              {REPORT_FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={content.format === f}
                  onClick={() => void run({ type: "format", format: f })}
                  className={seg(content.format === f)}
                >
                  {t(`report.format.${f}` as MessageKey)}
                </button>
              ))}
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col p-1.5">
            {content.sections.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => open(s)}
                  className="flex w-full items-center gap-2.5 px-2 py-2 text-left text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-[18px] shrink-0 items-center justify-center border text-xs",
                      s.status.kind === "done" ? "border-ok text-ok" : "border-warn",
                    )}
                  >
                    {s.status.kind === "done" && <CheckIcon className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{s.title}</span>
                  <span className="text-xs text-warn">{statusOf(s)}</span>
                  <span className="sr-only">
                    {s.status.kind === "done" ? t("lab.coach.done") : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* The paper */}
        <section
          aria-label={t("report.preview")}
          className="flex min-w-0 flex-[999_1_560px] justify-center border border-border bg-surface p-4 md:p-6"
        >
          <article
            data-theme="site"
            className="flex w-full max-w-[720px] flex-col gap-4 bg-[var(--pa-surface)] px-6 py-6 text-[14px] leading-relaxed text-[var(--pa-fg)] md:px-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--pa-border)] pb-3">
              <span className="flex flex-col">
                <span className="text-lg font-semibold">{content.title}</span>
                <span className="text-xs text-[var(--pa-fg-muted)]">{content.date}</span>
              </span>
              {include.mark && (
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Logo size={14} />
                  Physics Anatomy
                </span>
              )}
            </div>
            {content.sections.map((s) => (
              <div key={s.id} id={`report-${s.id}`} className="flex scroll-mt-4 flex-col gap-1.5">
                <h2 className="m-0 flex items-center justify-between gap-2 text-[14px] font-bold">
                  {s.title}
                  {editing !== s.id && (
                    <button
                      type="button"
                      onClick={() => open(s)}
                      className="text-xs font-medium text-[var(--pa-accent-text)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--pa-ring)]"
                    >
                      {t("report.edit", { section: s.title })}
                    </button>
                  )}
                </h2>
                {editing === s.id ? (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1 text-xs text-[var(--pa-fg-muted)]">
                      {t("report.editLabel", { section: s.title })}
                      <textarea
                        autoFocus
                        value={draft}
                        maxLength={MAX_SECTION}
                        rows={Math.min(12, Math.max(3, draft.split("\n").length + 1))}
                        onChange={(e) => setDraft(e.target.value)}
                        className="border border-[var(--pa-control)] bg-[var(--pa-bg)] p-2 text-[14px] text-[var(--pa-fg)] focus-visible:outline-2 focus-visible:outline-[var(--pa-ring)]"
                      />
                    </label>
                    <span className="text-xs text-[var(--pa-fg-muted)]">
                      {t("report.editHint")}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <Button className="h-8" onClick={() => void finish(s)}>
                        {t("report.done")}
                      </Button>
                      {s.edited && (
                        <Button
                          variant="outline"
                          className="h-8 border-[var(--pa-control)] bg-transparent text-[var(--pa-fg)]"
                          onClick={() => {
                            setEditing(undefined);
                            void run({ type: "reset", section: s.id });
                          }}
                        >
                          {t("report.useGenerated")}
                        </Button>
                      )}
                    </span>
                  </div>
                ) : s.figure ? (
                  figure(s)
                ) : (
                  <SectionText section={s} />
                )}
                {s.id === "precautions" && short > 0 && (
                  <p className="m-0 text-xs text-[var(--pa-warn-fg)]">
                    {short === 1
                      ? t("report.precautionsNeeded", { n: short })
                      : t("report.precautionsNeeded.many", { n: short })}
                  </p>
                )}
              </div>
            ))}
            {include.notes && content.notes.length > 0 && (
              <div className="border border-[var(--pa-border)] bg-[var(--pa-raised)] px-3 py-2 text-[13px]">
                <b>{t("report.notes")}</b> {content.notes.join(" ")}
              </div>
            )}
          </article>
        </section>

        {/* Download */}
        <aside
          aria-label={t("report.download")}
          className="flex min-w-0 flex-[1_1_280px] flex-col border border-border bg-[var(--pa-ink-900)] lg:max-w-[340px]"
        >
          <div className="border-b border-border px-4 py-3 text-[15px] font-medium">
            {t("report.download")}
          </div>
          <div className="flex flex-col gap-4 px-4 py-3.5">
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className="mb-1.5 text-xs text-muted-foreground">{t("report.what")}</legend>
              {KINDS.map((k) => (
                <label
                  key={k}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 border px-2.5 py-2 text-sm",
                    kind === k ? "border-foreground bg-surface" : "border-input",
                  )}
                >
                  <input
                    type="radio"
                    name="report-kind"
                    className="size-3.5 accent-primary"
                    checked={kind === k}
                    onChange={() => setKind(k)}
                  />
                  <span className="flex flex-col">
                    <span>{t(`report.kind.${k}` as MessageKey)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(`report.kind.${k}.sub` as MessageKey)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">{t("report.colours")}</span>
              <div
                role="group"
                aria-label={t("report.colours")}
                className="flex self-start border border-input"
              >
                <button
                  type="button"
                  aria-pressed={!mono}
                  onClick={() => setMono(false)}
                  className={seg(!mono)}
                >
                  {t("report.colour")}
                </button>
                <button
                  type="button"
                  aria-pressed={mono}
                  onClick={() => setMono(true)}
                  className={seg(mono)}
                >
                  {t("report.mono")}
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {t(mono ? "report.monoNote" : "report.colourNote")}
              </span>
            </div>
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className="mb-1.5 text-xs text-muted-foreground">
                {t("report.include")}
              </legend>
              {INCLUDES.map((k) => (
                <label
                  key={k}
                  className={cn(
                    "flex items-center gap-2.5 text-sm",
                    k === "logo" && "text-muted-foreground",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={include[k]}
                    disabled={k === "logo"}
                    aria-describedby={k === "logo" ? "report-logo-later" : undefined}
                    onChange={(e) => setInclude((x) => ({ ...x, [k]: e.target.checked }))}
                  />
                  {t(`report.include.${k}` as MessageKey)}
                </label>
              ))}
              <span id="report-logo-later" className="text-xs text-muted-foreground">
                {t("report.include.logoLater")}
              </span>
            </fieldset>
            <label className="flex items-center justify-between gap-3 text-sm">
              {t("report.paper")}
              <select
                value={paper}
                onChange={(e) => setPaper(e.target.value as Paper)}
                className="h-9 border border-input bg-surface px-2 text-sm text-foreground"
              >
                <option value="a4">{t("report.paper.a4")}</option>
                <option value="letter">{t("report.paper.letter")}</option>
              </select>
            </label>
            <Button
              className="h-[38px] font-semibold"
              disabled={busy}
              onClick={() => void download()}
            >
              {t(`report.do.${kind}` as MessageKey)}
            </Button>
            <span className="text-xs text-muted-foreground">{t("report.offline")}</span>
          </div>
        </aside>
      </div>

      {/* The copies the files are made from, kept out of sight. */}
      <div hidden data-theme="site">
        <BenchDrawing scene={content.bench} ref={bench} />
        <GraphFigure scene={content.graph} mono={mono} ref={graph} />
        <SnapshotSheet scene={content.bench} decorative ref={benchSheet} />
        <SnapshotSheet scene={content.graph} mono={mono} decorative ref={graphSheet} />
      </div>

      <div
        role="status"
        className="pointer-events-none fixed right-4 bottom-4 z-40 md:right-7 md:bottom-7"
      >
        {toast && (
          <div className="flex max-w-[380px] items-start gap-3 bg-foreground px-3.5 py-3 text-background">
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--pa-ok)]">
              <CheckIcon className="size-[11px]" strokeWidth={3.5} aria-hidden />
            </span>
            <span className="flex-1 text-[13px]">{toast}</span>
          </div>
        )}
      </div>
    </main>
  );
}
