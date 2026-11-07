"use client";

import { heading } from "@pa/analysis";
import {
  frontier,
  MAX_CAPTION,
  replay,
  STEPS,
  tableProjection,
  toAttemptFile,
  visibleSnapshots,
  type Snapshot,
  type SnapshotKind,
} from "@pa/engine";
import { simplePendulum } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn, Logo } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@pa/ui/components/popover";
import { CheckIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  figureDate,
  figureScene,
  sheetSize,
  SnapshotSheet,
  type FigureScene,
} from "./snapshot-figure";
import { csvText, fileStem, pngBytes, save, svgText, zipBytes } from "./snapshot-export";
import { reportContent } from "./report/content";
import { BenchDrawing, GraphFigure } from "./report/drawings";
import { makeReportPdf } from "./report/make";
import { useAttempt } from "./use-attempt";
import { useSnapshots } from "./use-snapshots";

const E = simplePendulum;
const stepName = (s: (typeof STEPS)[number]) => t(`lab.steps.${s}` as MessageKey);

type Format = "png" | "svg" | "pdf";
const TYPES: Record<Format, string> = {
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

/** A figure's three files, made from its hidden export copy. */
async function figureFiles(svg: SVGSVGElement, scene: FigureScene) {
  const { width, height } = sheetSize(scene);
  const text = svgText(svg);
  const png = await pngBytes(text, width, height);
  const { pdfBytes } = await import("./snapshot-pdf");
  const pdf = await pdfBytes(
    png,
    width,
    height,
    `${t("figure.fig", { n: scene.fig })} ${scene.snapshot.caption}`,
  );
  return { svg: text, png, pdf };
}

/**
 * The snapshot notebook (approved mockup Notebook.dc.html): every snapshot of the attempt as a
 * labelled figure, with its caption, its place in the order, and its downloads.
 */
export function NotebookScreen() {
  const handle = useAttempt(E.id);
  const shots = useSnapshots(handle);
  const router = useRouter();
  const list = visibleSnapshots(shots.state);
  const [chosen, setChosen] = useState<string>();
  const selected = list.find((s) => s.id === chosen) ?? list.at(-1);
  const [toast, setToast] = useState<{ text: string; undo?: () => void }>();
  const [formats, setFormats] = useState(false);
  const exportCopies = useRef(new Map<string, SVGSVGElement>());
  const reportBench = useRef<SVGSVGElement>(null);
  const reportGraph = useRef<SVGSVGElement>(null);
  const options = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const events = handle?.events;
  const attempt = handle?.attempt;
  const report = useMemo(
    () => (attempt && events ? reportContent(attempt, events) : undefined),
    [attempt, events],
  );
  const scenes = useMemo(() => {
    if (!attempt || !events) return new Map<string, FigureScene>();
    return new Map(list.map((s, i) => [s.id, figureScene(attempt, events, s, i + 1)] as const));
    // The list is derived from the events, so they are the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, events]);

  if (!handle) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground"
        aria-busy="true"
      >
        {t("lab.loading")}
      </main>
    );
  }

  const yours = list.filter((s) => !s.auto).length;
  const index = selected ? list.indexOf(selected) : -1;
  const scene = selected && scenes.get(selected.id);

  const pick = (s: Snapshot | undefined, focus = false) => {
    if (!s) return;
    setChosen(s.id);
    if (focus) requestAnimationFrame(() => options.current.get(s.id)?.focus());
  };

  const move = async (by: -1 | 1) => {
    if (!selected) return;
    const to = index + by;
    if (await shots.run({ type: "move", id: selected.id, index: to }))
      setToast({ text: t("notebook.moved", { n: to + 1 }) });
  };

  const remove = async () => {
    if (!selected) return;
    const fig = index + 1;
    const id = selected.id;
    if (!(await shots.run({ type: "delete", id }))) return;
    const rest = list.filter((s) => s.id !== id);
    pick(rest[Math.min(index, rest.length - 1)]);
    setToast({
      text: t("notebook.deleted", { n: fig }),
      undo: () => {
        void shots.run({ type: "restore", id }).then((ok) => ok && setChosen(id));
        setToast(undefined);
      },
    });
  };

  const reopen = async () => {
    if (!selected) return;
    const reachable = STEPS.indexOf(selected.step) <= STEPS.indexOf(frontier(handle.state));
    if (reachable && handle.state.step !== selected.step)
      await handle.dispatch({ type: "go-to-step", step: selected.step });
    router.push(`/lab/${E.id}`);
  };

  const download = async (format: Format) => {
    if (!selected || !scene) return;
    const svg = exportCopies.current.get(selected.id);
    if (!svg) return;
    const files = await figureFiles(svg, scene);
    save(files[format], `${fileStem(scene.fig, E.id, selected.kind)}.${format}`, TYPES[format]);
    setToast({ text: t("notebook.downloaded", { n: scene.fig }) });
  };

  const downloadAll = async () => {
    const files: Record<string, Uint8Array | string> = {};
    for (const s of list) {
      const sc = scenes.get(s.id);
      const svg = exportCopies.current.get(s.id);
      if (!sc || !svg) continue;
      const made = await figureFiles(svg, sc);
      const stem = fileStem(sc.fig, E.id, s.kind);
      files[`${stem}.svg`] = made.svg;
      files[`${stem}.png`] = made.png;
      files[`${stem}.pdf`] = made.pdf;
    }
    const table = replay(tableProjection, handle.attempt, handle.events);
    if (table.columns.length)
      files["results-table.csv"] = csvText(
        table.columns.map((c) => heading(c)),
        table.rows.map((r) => table.columns.map((c) => r.cells[c.id] ?? "")),
      );
    files["attempt.json"] = JSON.stringify(toAttemptFile(handle.attempt, handle.events), null, 2);
    // The report as it stands, as the student would download it from step 10.
    if (report) {
      const pdf = await makeReportPdf(
        report,
        reportBench.current ?? undefined,
        reportGraph.current ?? undefined,
        { paper: "a4", captions: true, mark: true, notes: false },
      );
      files[`${E.id}-report.pdf`] = pdf.bytes;
    }
    save(zipBytes(files), `${E.id}-notebook.zip`, "application/zip");
    setToast({ text: t("notebook.zipped", { count: list.length }) });
  };

  const onListKey = (e: ReactKeyboardEvent) => {
    const to =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? index + 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? index - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? list.length - 1
              : undefined;
    if (to === undefined) return;
    e.preventDefault();
    pick(list[Math.max(0, Math.min(list.length - 1, to))], true);
  };

  const kindName = (s: Snapshot, long = false) =>
    t(`notebook.${long ? "kindLong" : "kind"}.${s.auto ? "auto" : "yours"}` as MessageKey);
  const chip = (s: Snapshot) =>
    cn(
      "border px-[7px] py-px text-xs",
      s.auto ? "border-border bg-surface text-soft" : "border-topic-light text-topic-light",
    );
  const stepLine = (s: Snapshot) =>
    t("notebook.stepValue", { n: STEPS.indexOf(s.step) + 1, step: stepName(s.step) });

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
          aria-label={t("notebook.back")}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Link href={`/lab/${E.id}`} className="hover:text-foreground">
            {t("experiments.simple-pendulum.title")}
          </Link>
          <span aria-hidden>›</span>
          <h1 className="text-foreground" aria-current="page">
            {t("notebook.title")}
          </h1>
        </nav>
        <span className="border border-input px-2 py-0.5 text-xs text-soft">
          {list.length === 1
            ? t("notebook.count.one", { yours })
            : t("notebook.count", { count: list.length, yours })}
        </span>
        <span className="flex-1" />
        <Button
          className="h-8 bg-foreground font-semibold text-background hover:bg-soft"
          disabled={list.length === 0}
          onClick={() => void downloadAll()}
        >
          {t("notebook.zip")}
        </Button>
      </header>

      <div className="flex flex-wrap items-stretch gap-3.5">
        {/* Preview: the labelled figure exactly as it exports */}
        <section
          aria-label={t("notebook.preview")}
          className="flex min-w-0 flex-[999_1_640px] items-center justify-center border border-border bg-surface p-6"
        >
          {scene ? (
            <figure className="m-0 w-full max-w-[720px]">
              <SnapshotSheet scene={scene} />
            </figure>
          ) : (
            <p className="py-20 text-muted-foreground">{t("notebook.empty")}</p>
          )}
        </section>

        {/* Details */}
        {selected && scene && (
          <aside
            aria-label={t("notebook.details")}
            className="flex max-w-[380px] flex-[1_1_320px] flex-col border border-border bg-[var(--pa-ink-900)]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <span className="text-[15px] font-medium">{t("figure.fig", { n: scene.fig })}</span>
              <span className={chip(selected)}>{kindName(selected, true)}</span>
            </div>
            <div className="flex flex-1 flex-col gap-4 px-4 py-3.5">
              <CaptionField
                key={selected.id}
                caption={selected.caption}
                onSave={(caption) => void shots.run({ type: "caption", id: selected.id, caption })}
              />
              <dl className="flex flex-col gap-1.5 text-[13px]">
                {(
                  [
                    ["notebook.step", stepLine(selected)],
                    ["notebook.taken", figureDate(selected.takenAt)],
                    ["notebook.saved", t("notebook.savedValue")],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t(label)}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-col gap-2">
                <Button className="h-[38px] font-semibold" onClick={() => void reopen()}>
                  {t("notebook.reopen")}
                </Button>
                <Popover open={formats} onOpenChange={setFormats}>
                  <PopoverTrigger className="h-[38px] border border-input bg-transparent text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    {t("notebook.download")}
                  </PopoverTrigger>
                  <PopoverContent align="center" className="w-56">
                    <div className="flex gap-2">
                      {(["png", "svg", "pdf"] as const).map((f) => (
                        <Button
                          key={f}
                          variant="outline"
                          className="flex-1 font-mono"
                          onClick={() => {
                            setFormats(false);
                            void download(f);
                          }}
                        >
                          {f.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <span className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-[34px] flex-1 text-soft"
                    disabled={index <= 0}
                    onClick={() => void move(-1)}
                  >
                    {t("notebook.earlier")}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-[34px] flex-1 text-soft"
                    disabled={index >= list.length - 1}
                    onClick={() => void move(1)}
                  >
                    {t("notebook.later")}
                  </Button>
                </span>
                <Button
                  variant="outline"
                  className="h-[34px] border-danger text-danger"
                  onClick={() => void remove()}
                >
                  {t("notebook.delete")}
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Timeline */}
      <section
        aria-label={t("notebook.timeline")}
        className="flex flex-col border border-border bg-[var(--pa-ink-900)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-medium">{t("notebook.timeline")}</h2>
          <span className="text-xs text-muted-foreground">{t("notebook.timelineHint")}</span>
        </div>
        {/* Scrolls sideways on a narrow screen; with no snapshots in it, the keyboard can still reach it. */}
        <div
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
          tabIndex={list.length === 0 ? 0 : undefined}
          role={list.length === 0 ? "group" : undefined}
          aria-label={list.length === 0 ? t("notebook.timeline") : undefined}
        >
          <div className="flex min-w-[980px] flex-col gap-2.5 px-4 pt-3.5 pb-4">
            <div aria-hidden className="flex gap-1">
              {STEPS.map((s) => (
                <span
                  key={s}
                  className={cn(
                    "flex-1 border-t-[3px] py-1 text-center text-[11px]",
                    selected?.step === s
                      ? "border-primary text-foreground"
                      : list.some((x) => x.step === s)
                        ? "border-ok text-muted-foreground"
                        : "border-raised text-muted-foreground",
                  )}
                >
                  {stepName(s)}
                </span>
              ))}
            </div>
            {list.length === 0 ? (
              <p className="py-5 text-muted-foreground">{t("notebook.empty")}</p>
            ) : (
              <div
                role="listbox"
                aria-label={t("notebook.list")}
                aria-orientation="horizontal"
                className="flex gap-2.5"
                onKeyDown={onListKey}
              >
                {list.map((s, i) => (
                  <button
                    key={s.id}
                    ref={(el) => {
                      if (el) options.current.set(s.id, el);
                      else options.current.delete(s.id);
                    }}
                    type="button"
                    role="option"
                    aria-selected={s.id === selected?.id}
                    tabIndex={s.id === selected?.id ? 0 : -1}
                    onClick={() => pick(s)}
                    className={cn(
                      "flex flex-[0_0_150px] cursor-pointer flex-col gap-1.5 border bg-background p-2 text-left text-[13px] hover:border-[var(--pa-figure-base-edge)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      s.id === selected?.id ? "border-primary" : "border-border",
                    )}
                  >
                    <span className="flex h-[66px] items-center justify-center overflow-hidden bg-[var(--pa-paper)]">
                      <Thumbnail kind={s.kind} />
                    </span>
                    <span className="flex justify-between gap-1.5 text-xs">
                      <b className="font-semibold">{t("figure.fig", { n: i + 1 })}</b>
                      <span className="text-muted-foreground">{kindName(s)}</span>
                    </span>
                    <span className="truncate text-xs text-soft">{s.caption}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The copies the exports are made from: every figure, kept out of sight. */}
      <div hidden data-theme="site">
        {report && (
          <>
            <BenchDrawing scene={report.bench} ref={reportBench} />
            <GraphFigure scene={report.graph} mono={false} ref={reportGraph} />
          </>
        )}
        {list.map((s) => {
          const sc = scenes.get(s.id);
          return (
            sc && (
              <SnapshotSheet
                key={s.id}
                scene={sc}
                decorative
                ref={(el) => {
                  if (el) exportCopies.current.set(s.id, el);
                  else exportCopies.current.delete(s.id);
                }}
              />
            )
          );
        })}
      </div>

      <div
        role="status"
        className="pointer-events-none fixed right-4 bottom-4 z-40 md:right-7 md:bottom-7"
      >
        {toast && (
          <div className="pointer-events-auto flex max-w-[380px] items-start gap-3 bg-foreground px-3.5 py-3 text-background">
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--pa-ok)]">
              <CheckIcon className="size-[11px]" strokeWidth={3.5} aria-hidden />
            </span>
            <span className="flex-1 text-[13px]">{toast.text}</span>
            {toast.undo && (
              <Button
                size="xs"
                className="h-[26px] bg-background px-2.5 font-semibold text-foreground hover:bg-raised"
                onClick={toast.undo}
              >
                {t("notebook.undo")}
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/** The caption, saved when the student leaves the field or presses Enter. */
function CaptionField({ caption, onSave }: { caption: string; onSave: (caption: string) => void }) {
  const [draft, setDraft] = useState(caption);
  const commit = () => {
    const next = draft.trim();
    if (next !== caption) onSave(next);
  };
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      {t("notebook.caption")}
      <input
        type="text"
        value={draft}
        maxLength={MAX_CAPTION}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="h-[38px] border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </label>
  );
}

/** A small picture of what a snapshot shows, for the timeline (drawn, not the figure). */
function Thumbnail({ kind }: { kind: SnapshotKind }) {
  const ink = "var(--pa-on-paper)";
  if (kind === "bench")
    return (
      <svg width={70} height={58} viewBox="0 0 300 240" aria-hidden>
        <line x1={60} y1={220} x2={60} y2={20} stroke={ink} strokeWidth={8} />
        <line x1={60} y1={34} x2={170} y2={34} stroke={ink} strokeWidth={7} />
        <line x1={170} y1={40} x2={170} y2={182} stroke={ink} strokeWidth={4} />
        <circle cx={170} cy={192} r={16} fill="var(--pa-accent)" />
      </svg>
    );
  if (kind === "table")
    return (
      <svg width={80} height={54} viewBox="0 0 80 54" aria-hidden>
        <rect x={1} y={1} width={78} height={52} fill="var(--pa-graph-paper)" stroke={ink} />
        <path
          d="M1 11H79M1 22H79M1 32H79M1 43H79M20 1V53M40 1V53M60 1V53"
          stroke={ink}
          strokeWidth={0.6}
        />
      </svg>
    );
  return (
    <svg width={84} height={56} viewBox="0 0 84 56" aria-hidden>
      <rect
        x={1}
        y={1}
        width={82}
        height={54}
        fill="var(--pa-graph-paper)"
        stroke="var(--pa-graph-frame)"
      />
      <line x1={8} y1={48} x2={78} y2={8} stroke="var(--pa-graph-fit)" strokeWidth={1.6} />
      <path
        d="M18 40l4 4M22 40l-4 4M38 29l4 4M42 29l-4 4M58 18l4 4M62 18l-4 4"
        stroke="var(--pa-graph-point)"
        strokeWidth={1.4}
      />
    </svg>
  );
}
