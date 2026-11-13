"use client";

import type { DataTemplate, LabCheck, LabRow } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn, Logo } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { labDataJson } from "../lab-data/json";
import { ExportMenu } from "../lab-data/export-menu";
import { completeRows, matchTemplate, type LabData } from "../lab-data/match";
import { problemText } from "../lab-data/problems";
import { readCells, type ReadProblem } from "../lab-data/read";
import {
  cellsCsv,
  heading,
  templateCsv,
  templateFileName,
  templateXlsx,
} from "../lab-data/template";
import { sheetXlsx } from "../report/xlsx";
import { save } from "../snapshot-export";

/**
 * The model check (the approved model check board; data templates brief): a student's own lab
 * readings, brought in from a data template, drawn over the model's line, with the verdict and
 * the export menu. Everything happens on this device; nothing is sent anywhere.
 */

export interface CheckPart {
  part: "shift" | "tilt" | "spread";
  found: boolean;
  /** Nothing to judge yet (Ohm's law with no marking): shown without a tick. */
  neutral?: boolean;
  text: string;
  figure: string;
}

export interface CheckExperiment {
  id: string;
  title: string;
  /** The data template, its words already in the student's language. */
  template: DataTemplate;
  /** The table's columns, as the lab's table heads them, worked columns included. */
  columns: readonly { symbol: string; unit: string; places: number }[];
  /** The check of the rows, with the apparatus values the file gives, in the template's units. */
  check: (
    rows: readonly LabRow[],
    values: Readonly<Record<string, number | undefined>>,
  ) => LabCheck;
  example: readonly LabRow[];
  /** The apparatus values the example data was taken with, where the model needs some. */
  exampleValues?: Readonly<Record<string, number>>;
  /** The graph's axes: the symbols with units, as the lab's graph writes them. */
  axes: { x: string; y: string };
  copy: {
    templateBody: string;
    tableNote: string;
    graphTitle: string;
    graphLabel: (n: number) => string;
    /** The title when nothing is found, where "agree with the model" does not fit. */
    agrees?: string;
    /** The model's line in the legend; left out where there is no model line (Ohm's law). */
    legendModel?: string;
    parts: (check: NonNullable<LabCheck["check"]>) => CheckPart[];
    /** The result the slope gives, as a sentence: "g from your slope: 9.84 N kg⁻¹." */
    result: (lab: LabCheck) => string;
    /** A finding's message key, in words. */
    finding: (key: string, params?: Readonly<Record<string, string | number>>) => string;
  };
}

/** The graph sheet: 480 by 400 inside its margins, as on the board and the lab's graph. */
const PLOT = { width: 480, height: 400 };
const SHEET = { width: 560, height: 480 };

/**
 * A round axis range with six major divisions, to match the graph sheet's grid, a little wider
 * than the values: steps of 1, 2 or 5 × 10ⁿ.
 */
function axis(values: readonly number[], divisions = 6) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.abs(hi) || 1;
  let p = 10 ** Math.floor(Math.log10(span / divisions));
  for (;;) {
    for (const m of [1, 2, 5]) {
      const step = m * p;
      const min = Math.floor(lo / step) * step;
      if (min + step * divisions >= hi - 1e-12) {
        const places = Math.max(0, 1 - Math.floor(Math.log10(step)));
        return { min, max: min + step * divisions, step, places };
      }
    }
    p *= 10;
  }
}

const STORE = (id: string) => `pa.labData.${id}`;

interface Source {
  kind: "file" | "typed";
  name: string;
  cells: string[][];
}

export function CheckScreen({ experiment: E }: { experiment: CheckExperiment }) {
  const T = E.template;
  const [source, setSource] = useState<Source | undefined>();
  const [readProblem, setReadProblem] = useState<ReadProblem | undefined>();
  const [typing, setTyping] = useState(false);
  const [mono, setMono] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const graph = useRef<SVGSVGElement>(null);

  // The last lab data brought in stays on this device, for when the student comes back.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE(E.id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring once, after mount
      if (saved) setSource(JSON.parse(saved) as Source);
    } catch {
      // No storage here (a private window): the page works without it.
    }
  }, [E.id]);
  const keep = (s: Source) => {
    setSource(s);
    setReadProblem(undefined);
    try {
      localStorage.setItem(STORE(E.id), JSON.stringify(s));
    } catch {
      // As above.
    }
  };

  const bringIn = async (file: File) => {
    const result = readCells(file.name, new Uint8Array(await file.arrayBuffer()));
    if (!result.ok) {
      setReadProblem(result.problem);
      return;
    }
    keep({ kind: "file", name: file.name, cells: result.cells });
    setTyping(false);
  };

  const data: LabData | undefined = useMemo(
    () => (source ? matchTemplate(source.cells, T) : undefined),
    [source, T],
  );
  const rows = data ? completeRows(data, T).map((r) => r.values) : E.example;
  const isExample = !data;
  const values = useMemo(() => (data ? data.values : (E.exampleValues ?? {})), [data, E]);
  const result = useMemo(() => E.check(rows, values), [E, rows, values]);
  const check = result.check;

  // The graph's scales, from the points and the model's line together.
  const xs = [...result.points.map((p) => p.x), ...result.modelLine.map((p) => p.x)];
  const ys = [...result.points.map((p) => p.y), ...result.modelLine.map((p) => p.y)];
  const ax = axis(xs.length ? xs : [0, 1]);
  const ay = axis(ys.length ? ys : [0, 1]);
  const X = (x: number) => ((x - ax.min) / (ax.max - ax.min)) * PLOT.width;
  const Y = (y: number) => PLOT.height - ((y - ay.min) / (ay.max - ay.min)) * PLOT.height;
  const tone = (part: string) => `var(--pa-graph-${mono ? "mono-" : ""}${part})`;

  const found = check ? (["shift", "tilt", "spread"] as const).filter((p) => check[p]?.found) : [];
  const verdictTitle = !check
    ? result.needs
      ? t(result.needs as MessageKey)
      : t("labData.check.verdict.few", { n: 3 })
    : found.length === 0
      ? (E.copy.agrees ?? t("labData.check.verdict.agrees"))
      : found.length > 1
        ? t("labData.check.verdict.several", { n: found.length })
        : t(`labData.check.verdict.${found[0]!}` as MessageKey);

  const tableRows = result.table.map((r) =>
    r.map((v, i) => (v === undefined ? "" : v.toFixed(E.columns[i]!.places))),
  );
  const headings = E.columns.map((c) => heading(c.symbol, c.unit));
  const left = data ? data.rows.length - completeRows(data, T).length : 0;

  return (
    <main className="flex min-h-dvh flex-col gap-3.5 bg-[var(--pa-ink-1000)] p-3.5 text-foreground">
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
            {E.title}
          </Link>
          <span aria-hidden>›</span>
          <h1 className="text-foreground" aria-current="page">
            {t("labData.check.title")}
          </h1>
        </nav>
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
          <Card id="check-template" title={t("labData.check.template")}>
            <p className="text-soft">{E.copy.templateBody}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => save(templateCsv(T), templateFileName(T, "csv"), "text/csv")}
              >
                {t("labData.check.downloadCsv")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  save(
                    templateXlsx(T),
                    templateFileName(T, "xlsx"),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  )
                }
              >
                {t("labData.check.downloadXlsx")}
              </Button>
            </div>
          </Card>

          <Card id="check-readings" title={t("labData.check.readings")}>
            {typing ? (
              <TypeIn
                template={T}
                start={source?.kind === "typed" ? source.cells : undefined}
                onChange={(cells) => keep({ kind: "typed", name: t("labData.check.typed"), cells })}
              />
            ) : (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2.5 border border-dashed p-3.5",
                  dragging ? "border-foreground bg-surface" : "border-input",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) void bringIn(file);
                }}
              >
                <Button onClick={() => input.current?.click()}>{t("labData.check.choose")}</Button>
                <span className="text-[13px] text-muted-foreground">{t("labData.check.drop")}</span>
                <input
                  ref={input}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={t("labData.check.choose")}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void bringIn(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
              {source && <span className="font-mono">{source.name}</span>}
              {data && (
                <span className="text-muted-foreground">
                  {left
                    ? t("labData.check.rowsLeft", { n: data.rows.length, left })
                    : t("labData.check.rows", { n: data.rows.length })}
                </span>
              )}
              <span className="flex-1" />
              <button
                type="button"
                className="text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setTyping((v) => !v)}
              >
                {typing ? t("labData.check.useFile") : t("labData.check.typeIn")}
              </button>
            </div>
            {(readProblem || (data && data.problems.length > 0)) && (
              <div
                role="alert"
                className="flex flex-col gap-1 border-l-[3px] border-warn bg-warn-wash px-3 py-2.5 text-[13px]"
              >
                {readProblem && <span>{problemText(readProblem)}</span>}
                {data?.problems.map((p, i) => (
                  <span key={i}>{problemText(p)}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">{t("labData.check.table")}</span>
              <span className="flex-1" />
              {isExample && (
                <span className="border border-input px-2 py-px text-xs text-soft">
                  {t("labData.check.example")}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[13px]">
                <thead>
                  <tr>
                    {headings.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-b border-border px-2 py-1.5 text-right font-sans text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={i}>
                      {r.map((v, j) => (
                        <td key={j} className="border-b border-border/60 px-2 py-1.5 text-right">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="text-xs text-muted-foreground">{E.copy.tableNote}</span>
          </Card>
        </div>

        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          <section aria-label={E.copy.graphTitle} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[13px] text-muted-foreground">{t("lab.graph.colours")}</span>
              <div
                role="group"
                aria-label={t("lab.graph.colours")}
                className="inline-flex border border-border"
              >
                {[false, true].map((m) => (
                  <button
                    key={String(m)}
                    type="button"
                    aria-pressed={mono === m}
                    onClick={() => setMono(m)}
                    className={cn(
                      "h-8 px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-ring",
                      mono === m ? "bg-foreground text-background" : "text-soft",
                    )}
                  >
                    {t(m ? "lab.graph.mono" : "lab.graph.colour")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 bg-[var(--pa-graph-paper)] px-4 pt-4 pb-3 text-[var(--pa-graph-label)]">
              <div className="flex flex-wrap justify-between gap-2 text-[13px]">
                <span className="font-semibold">{E.copy.graphTitle}</span>
                {isExample && <span className="font-mono">{t("labData.check.example")}</span>}
              </div>
              <svg
                ref={graph}
                viewBox={`-56 -16 ${SHEET.width} ${SHEET.height}`}
                width={SHEET.width}
                height={SHEET.height}
                className="block h-auto w-full"
                role="img"
                aria-label={E.copy.graphLabel(result.points.length)}
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x={-56}
                  y={-16}
                  width={SHEET.width}
                  height={SHEET.height}
                  fill={tone("paper")}
                />
                <Grid tone={tone} />
                {E.copy.legendModel && (
                  <polyline
                    points={result.modelLine.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")}
                    fill="none"
                    stroke={tone("triangle")}
                    strokeWidth={1.8}
                    strokeDasharray="8 5"
                  />
                )}
                {check?.fit && result.modelLine.length === 2 && (
                  <line
                    x1={X(result.modelLine[0]!.x)}
                    y1={Y(check.fit.slope * result.modelLine[0]!.x + check.fit.intercept)}
                    x2={X(result.modelLine[1]!.x)}
                    y2={Y(check.fit.slope * result.modelLine[1]!.x + check.fit.intercept)}
                    stroke={tone("fit")}
                    strokeWidth={1.8}
                  />
                )}
                <g stroke={tone("point")} strokeWidth={2}>
                  {result.points.map((p, i) => {
                    const x = X(p.x);
                    const y = Y(p.y);
                    return <path key={i} d={`M${x - 6} ${y - 6}l12 12M${x + 6} ${y - 6}l-12 12`} />;
                  })}
                </g>
                <g fontFamily="Geist Mono, monospace" fontSize={12} fill={tone("label")}>
                  {ticks(ax).map((v) => (
                    <text key={v} x={X(v)} y={420} textAnchor="middle">
                      {v.toFixed(ax.places)}
                    </text>
                  ))}
                  {ticks(ay).map((v) => (
                    <text key={v} x={-8} y={Y(v) + 4} textAnchor="end">
                      {v.toFixed(ay.places)}
                    </text>
                  ))}
                  <text x={240} y={446} textAnchor="middle">
                    {E.axes.x}
                  </text>
                  <text x={0} y={-6}>
                    {E.axes.y}
                  </text>
                  <text x={480} y={462} textAnchor="end" fontSize={11} fill={tone("mark")}>
                    Physics Anatomy · Fig. 1
                  </text>
                </g>
                <g fontFamily="Geist, sans-serif" fontSize={12} fill={tone("label")}>
                  <rect
                    x={14}
                    y={14}
                    width={220}
                    height={E.copy.legendModel ? 70 : 50}
                    fill={tone("paper")}
                    stroke={tone("frame")}
                    strokeWidth={0.8}
                  />
                  <path d="M26 26 l8 8 M34 26 l-8 8" stroke={tone("point")} strokeWidth={2} />
                  <text x={46} y={34}>
                    {t("labData.check.legend.points")}
                  </text>
                  <line x1={22} y1={50} x2={40} y2={50} stroke={tone("fit")} strokeWidth={1.8} />
                  <text x={46} y={54}>
                    {t("labData.check.legend.fit")}
                  </text>
                  {E.copy.legendModel && (
                    <>
                      <line
                        x1={22}
                        y1={70}
                        x2={40}
                        y2={70}
                        stroke={tone("triangle")}
                        strokeWidth={1.8}
                        strokeDasharray="8 5"
                      />
                      <text x={46} y={74}>
                        {E.copy.legendModel}
                      </text>
                    </>
                  )}
                </g>
              </svg>
            </div>
          </section>

          <section
            aria-labelledby="check-verdict"
            className={cn(
              "flex flex-col gap-3 border border-border border-l-[3px] bg-surface p-4",
              found.length ? "border-l-warn" : "border-l-ok",
            )}
          >
            <h2 id="check-verdict" className="m-0 text-[15px] font-semibold" aria-live="polite">
              {verdictTitle}
            </h2>
            {check && (
              <>
                <div className="flex flex-col">
                  {E.copy.parts(check).map((p) => (
                    <div
                      key={p.part}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 py-2"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "inline-flex size-5 items-center justify-center border-[1.5px] text-xs font-semibold",
                          p.neutral
                            ? "border-input text-muted-foreground"
                            : p.found
                              ? "border-warn text-warn"
                              : "border-ok text-ok",
                        )}
                      >
                        {p.neutral ? "–" : p.found ? "!" : "✓"}
                      </span>
                      <span className="w-[82px] font-semibold">
                        {t(`labData.check.part.${p.part}` as MessageKey)}
                      </span>
                      <span className="flex-[1_1_220px] text-soft">{p.text}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.figure}</span>
                    </div>
                  ))}
                </div>
                {result.findings.map((f) => (
                  <div key={f.part} className="flex flex-col gap-1.5">
                    <span>
                      <b>{t("labData.check.why")}</b> {E.copy.finding(f.cause, f.params)}
                    </span>
                    <span className="bg-accent-wash px-2.5 py-2">
                      <b>{t("labData.check.next")}</b> {E.copy.finding(f.precaution, f.params)}
                    </span>
                  </div>
                ))}
                <span className="text-[13px] text-muted-foreground">{E.copy.result(result)}</span>
              </>
            )}
          </section>

          <ExportMenu
            readings={{
              stem: `${E.id}-lab-data`,
              csv: () => cellsCsv([headings, ...tableRows]),
              xlsx: () => sheetXlsx(E.title, [headings, ...tableRows]),
              json: () =>
                labDataJson(
                  data ?? {
                    experiment: T.experiment,
                    version: T.version,
                    values: { ...E.exampleValues },
                    rows: E.example.map((values, i) => ({ row: i + 1, values: { ...values } })),
                    problems: [],
                  },
                  T,
                ),
            }}
            graph={{
              stem: `fig-1-${E.id}-lab-data`,
              svg: graph,
              width: SHEET.width,
              height: SHEET.height,
              title: E.copy.graphTitle,
              mono,
            }}
          />
        </div>
      </div>
    </main>
  );
}

function ticks(a: { min: number; max: number; step: number }) {
  const out: number[] = [];
  for (let v = a.min; v <= a.max + a.step / 2; v += a.step) out.push(Number(v.toFixed(10)));
  return out;
}

function Grid({ tone }: { tone: (part: string) => string }) {
  let minor = "";
  let major = "";
  for (let i = 0; i <= 30; i++) {
    const x = i * 16;
    if (i % 5 === 0) major += `M${x} 0V${PLOT.height}`;
    else minor += `M${x} 0V${PLOT.height}`;
  }
  for (let j = 0; j <= 30; j++) {
    const y = (j * PLOT.height) / 30;
    if (j % 5 === 0) major += `M0 ${y}H${PLOT.width}`;
    else minor += `M0 ${y}H${PLOT.width}`;
  }
  return (
    <>
      <rect x={0} y={0} width={PLOT.width} height={PLOT.height} fill="#FFFFFF" />
      <path d={minor} stroke={tone("grid-minor")} strokeWidth={0.6} fill="none" />
      <path d={major} stroke={tone("grid-major")} strokeWidth={1} fill="none" />
      <rect
        x={0}
        y={0}
        width={PLOT.width}
        height={PLOT.height}
        fill="none"
        stroke={tone("frame")}
        strokeWidth={1.2}
      />
    </>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 border border-border bg-surface p-4"
    >
      <h2 id={id} className="m-0 text-[15px] font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The readings typed in, for a student without a spreadsheet app: the template's own columns. */
function TypeIn({
  template,
  start,
  onChange,
}: {
  template: DataTemplate;
  start?: string[][];
  onChange: (cells: string[][]) => void;
}) {
  const head = template.columns.map((c) => heading(c.symbol, c.unit));
  const labels = template.values.map((v) => heading(v.label, v.unit));
  const at = start ? start.findIndex((r) => r[0] === head[0]) : -1;
  const [rows, setRows] = useState<string[][]>(() =>
    at >= 0
      ? start!.slice(at + 1)
      : template.settings.map((s) =>
          template.columns.map((_, i) => (s[i] !== undefined ? String(s[i]) : "")),
        ),
  );
  const [vals, setVals] = useState<string[]>(() =>
    labels.map((l, i) => {
      const v = template.values[i]!.value;
      return start?.find((r) => r[0] === l)?.[1] ?? (v !== undefined ? String(v) : "");
    }),
  );
  const emit = (r: string[][], v: string[]) =>
    onChange([...labels.map((l, i) => [l, v[i]!]), [], head, ...r]);
  const set = (next: string[][]) => {
    setRows(next);
    emit(next, vals);
  };
  return (
    <div className="flex flex-col gap-2">
      {labels.map((l, i) => (
        <label key={l} className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted-foreground">{l}</span>
          <input
            value={vals[i]}
            inputMode="decimal"
            onChange={(e) => {
              const next = vals.map((v, k) => (k === i ? e.target.value : v));
              setVals(next);
              emit(rows, next);
            }}
            className="h-9 w-24 border border-input bg-background px-2 text-right font-mono focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>
      ))}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px]">
          <thead>
            <tr>
              {head.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-1 py-1 text-left font-sans text-xs font-medium text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} className="px-1 py-0.5">
                    <input
                      value={v}
                      inputMode="decimal"
                      aria-label={`${head[j]}, ${t("labData.check.row", { n: i + 1 })}`}
                      onChange={(e) =>
                        set(
                          rows.map((row, a) =>
                            a === i ? row.map((c, b) => (b === j ? e.target.value : c)) : row,
                          ),
                        )
                      }
                      className="h-9 w-full min-w-[72px] border border-input bg-background px-2 text-right focus-visible:outline-2 focus-visible:outline-ring"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        className="self-start"
        onClick={() => set([...rows, head.map(() => "")])}
      >
        {t("labData.check.addRow")}
      </Button>
    </div>
  );
}
