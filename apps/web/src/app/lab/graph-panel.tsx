"use client";

import {
  DIVISIONS,
  fromMm,
  heading,
  mmFromLine,
  onLineAt,
  onPaper,
  scalesAround,
  SHEET,
  snapMm,
  suggestAxis,
  worstLines,
  type Axis,
  type DesignColumn,
  type Finding,
  type PlottedPoint,
  type Point,
} from "@pa/analysis";
import { type GraphCommand, type GraphState } from "@pa/engine";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon, EraserIcon, TriangleAlertIcon } from "@pa/ui/icons";
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

import { fmt, GraphDrawing, read, svgY, VIEW, type GraphView } from "./graph-sheet";

const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
/**
 * An axis heading "symbol/unit" split at its last slash, so a symbol with a slash in it keeps it:
 * "1/T/°C⁻¹" is 1/T in °C⁻¹. A heading with no slash is a symbol with no unit.
 */
const splitAt = (h: string) => h.lastIndexOf("/");
const symbolOf = (h: string) => (splitAt(h) > 0 ? h.slice(0, splitAt(h)) : h);
const unitOf = (h: string) => (splitAt(h) > 0 ? h.slice(splitAt(h) + 1) : "");

type Tool = "plot" | "line" | "triangle";

/** Step 7: the WAEC graph sheet, its scales, and the tools to plot, draw the line and the triangle. */
export function GraphPanel({
  state,
  view,
  data,
  headings,
  numericColumns,
  flaggedRows,
  partFindings,
  showChecks,
  onRun,
  latest,
  below,
  bars,
  worstLinesOffered = true,
}: {
  state: GraphState;
  view: GraphView;
  data: readonly PlottedPoint[];
  headings: { x: string; y: string };
  numericColumns: readonly DesignColumn[];
  flaggedRows: ReadonlySet<string>;
  /** The findings for each part of the graph, shown at Check my work. */
  partFindings: Record<"scale" | "points" | "line" | "triangle", Finding[]>;
  showChecks: boolean;
  onRun: (commands: GraphCommand[]) => Promise<void>;
  /** The graph including changes still being saved, so quick changes build on each other. */
  latest: () => GraphState;
  below: ReactNode;
  /** The uncertainty layer's error bars by row, in the axes' units, drawn at true size. */
  bars?: ReadonlyMap<string, { dx: number; dy: number }> | undefined;
  /** Whether the worst lines can be drawn: not on a curve (the hot solid's θ against t). */
  worstLinesOffered?: boolean;
}) {
  const [showWorst, setShowWorst] = useState(false);
  const [tool, setTool] = useState<Tool>("plot");
  const [target, setTarget] = useState<string>();
  const [pending, setPending] = useState<Point>();
  const [cursor, setCursor] = useState({ x: 100, y: 120 });
  const [showCursor, setShowCursor] = useState(false);
  const [mono, setMono] = useState(() => {
    try {
      return window.localStorage.getItem("pa:graph-colours") === "mono";
    } catch {
      return false;
    }
  });
  const svg = useRef<SVGSVGElement>(null);
  const { sheet } = view;
  const tone = (part: string) => `var(--pa-graph-${mono ? "mono-" : ""}${part})`;

  const chooseMono = (next: boolean) => {
    setMono(next);
    try {
      window.localStorage.setItem("pa:graph-colours", next ? "mono" : "colour");
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
  };

  const nextRow =
    data.find((d) => d.row === target && !state.plotted.some((p) => p.row === d.row)) ??
    data.find((d) => !state.plotted.some((p) => p.row === d.row));
  const value = (mm: Point): Point => ({
    x: Number(fromMm(sheet.x, mm.x).toPrecision(6)),
    y: Number(fromMm(sheet.y, mm.y).toPrecision(6)),
  });
  // The student's own axes are saved the first time they mark the sheet.
  const withAxes = (commands: GraphCommand[]): GraphCommand[] =>
    state.sheet ? commands : [{ type: "set-axes", sheet }, ...commands];

  const pick = (mm: Point) => {
    const at = value(mm);
    if (tool === "plot") {
      if (!nextRow) return;
      void onRun(withAxes([{ type: "plot", point: { row: nextRow.row, ...at } }]));
      setTarget(undefined);
    } else if (tool === "line") {
      if (!pending) setPending(at);
      else if (at.x !== pending.x) {
        void onRun(withAxes([{ type: "draw-line", line: { from: pending, to: at } }]));
        setPending(undefined);
      }
    } else {
      // A corner picked close to the line goes on it, as a student's pencil would.
      const line = view.line;
      const onIt = line && mmFromLine(sheet, at, line) <= 2 ? onLineAt(line, at.x) : at;
      if (!pending) setPending(onIt);
      else if (onIt.x !== pending.x) {
        void onRun(withAxes([{ type: "draw-triangle", triangle: { a: pending, b: onIt } }]));
        setPending(undefined);
      }
    }
  };

  const toMmPoint = (clientX: number, clientY: number): Point | undefined => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return undefined;
    const x = VIEW.x + ((clientX - box.left) / box.width) * VIEW.w;
    const y = SHEET.heightMm - (VIEW.y + ((clientY - box.top) / box.height) * VIEW.h);
    // A click just over the edge (a point on the axis itself) still counts, at the edge.
    const edge = 2;
    if (x < -edge || x > SHEET.widthMm + edge || y < -edge || y > SHEET.heightMm + edge)
      return undefined;
    const clamp = (v: number, max: number) => Math.min(max, Math.max(0, snapMm(v)));
    return { x: clamp(x, SHEET.widthMm), y: clamp(y, SHEET.heightMm) };
  };

  const onKey = (e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 10 : SHEET.squareMm / 2;
    const move = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }[e.key];
    if (move) {
      e.preventDefault();
      setShowCursor(true);
      setCursor((c) => ({
        x: Math.min(SHEET.widthMm, Math.max(0, c.x + move[0]!)),
        y: Math.min(SHEET.heightMm, Math.max(0, c.y + move[1]!)),
      }));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(cursor);
    } else if (e.key === "Escape") setPending(undefined);
  };

  const rubOut = () => {
    setPending(undefined);
    if (tool === "plot") {
      const last = target ?? state.plotted.at(-1)?.row;
      if (last) void onRun([{ type: "unplot", row: last }]);
    } else if (tool === "line") void onRun([{ type: "erase-line" }]);
    else void onRun([{ type: "erase-triangle" }]);
  };

  const setAxis = (which: "x" | "y", change: (prev: Axis) => Axis) => {
    const saved = latest();
    const base = saved.sheet ?? sheet;
    const axis = change(base[which]);
    const next = { ...base, [which]: axis };
    const columnChanged = axis.column !== base[which].column;
    void onRun([
      // A different quantity on an axis starts the graph again: the old marks mean nothing.
      ...(columnChanged
        ? [
            ...saved.plotted.map((p) => ({ type: "unplot" as const, row: p.row })),
            { type: "erase-line" as const },
          ]
        : []),
      { type: "set-axes", sheet: next },
    ]);
  };

  const status =
    tool === "plot"
      ? nextRow
        ? t("lab.graph.next", {
            row: data.findIndex((d) => d.row === nextRow.row) + 1,
            x: read(sheet.x, nextRow.x),
            y: read(sheet.y, nextRow.y),
          })
        : data.length
          ? t("lab.graph.allPlotted")
          : t("lab.graph.noPoints")
      : tool === "line"
        ? pending
          ? t("lab.graph.lineStarted")
          : t("lab.graph.lineHow")
        : pending
          ? t("lab.graph.triangleStarted")
          : t("lab.graph.triangleHow");

  const cursorValue = value(cursor);
  const segment = (on: boolean) =>
    cn(
      "h-9 px-3 text-sm font-medium",
      on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
    );
  const field = "h-9 border border-input bg-background px-2 text-sm text-foreground";

  const axisForm = (which: "x" | "y") => {
    const axis = sheet[which];
    const values = data.map((p) => p[which]);
    const lo = values.length ? Math.min(...values) : 0;
    const scales = scalesAround((Math.max(...values, lo + 1) - lo) / DIVISIONS[which] || 1, 9);
    const base = Math.floor(lo / axis.per2cm + 1e-9);
    const starts = [
      ...new Set([0, ...Array.from({ length: 6 }, (_, k) => (base - k) * axis.per2cm), axis.start]),
    ]
      .map((v) => Number(v.toPrecision(10)))
      .filter((v) => v <= lo + 1e-9 || v === axis.start)
      .sort((a, b) => a - b);
    return (
      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="mb-1 text-xs text-muted-foreground">
          {which === "x" ? t("lab.graph.axisX") : t("lab.graph.axisY")}
        </legend>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("lab.graph.column")}
          <select
            className={cn(field, "font-mono")}
            value={axis.column}
            onChange={(e) => {
              const column = e.target.value;
              const pts = data.length ? data.map((p) => p[which]) : [0, 1];
              setAxis(which, () => suggestAxis(column, [0, ...pts], DIVISIONS[which]));
            }}
          >
            {numericColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {heading(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("lab.graph.per2cm")}
          <select
            className={cn(field, "font-mono")}
            value={axis.per2cm}
            onChange={(e) => {
              const per2cm = Number(e.target.value);
              setAxis(which, (prev) => ({
                ...prev,
                per2cm,
                start: Number((Math.floor(prev.start / per2cm + 1e-9) * per2cm).toPrecision(10)),
              }));
            }}
          >
            {[...new Set([...scales, axis.per2cm])]
              .sort((a, b) => a - b)
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("lab.graph.start")}
          <select
            className={cn(field, "font-mono")}
            value={axis.start}
            onChange={(e) => {
              const start = Number(e.target.value);
              setAxis(which, (prev) => ({ ...prev, start }));
            }}
          >
            {starts.map((s) => (
              <option key={s} value={s}>
                {fmt(axis, s)}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
    );
  };

  // The steepest and least steep lines through the error bars, when the student asks for them.
  const barred = bars
    ? view.plotted.flatMap((p) => {
        const b = bars.get(p.row);
        return b ? [{ x: p.x, y: p.y, dx: b.dx, dy: b.dy }] : [];
      })
    : [];
  const worst =
    showWorst && barred.length >= 2 && new Set(barred.map((p) => p.x)).size >= 2
      ? worstLines(barred)
      : undefined;

  const triangleC = view.triangle && { x: view.triangle.b.x, y: view.triangle.a.y };
  const paperOf = (p: Point) => {
    const q = onPaper(sheet, p);
    return { x: q.x, y: svgY(q.y) };
  };

  return (
    <section aria-label={t("lab.graph.label")} className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 border border-border bg-surface p-3">
        <div
          role="group"
          aria-label={t("lab.graph.tools")}
          className="inline-flex border border-border"
        >
          {(["plot", "line", "triangle"] as const).map((k, i) => (
            <button
              key={k}
              type="button"
              aria-pressed={tool === k}
              className={cn(segment(tool === k), i > 0 && "border-l border-border")}
              onClick={() => {
                setTool(k);
                setPending(undefined);
              }}
            >
              {msg(`lab.graph.tool.${k}`)}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={rubOut}>
          <EraserIcon aria-hidden />
          {t("lab.graph.rubOut")}
        </Button>
        <span className="flex-1" />
        <span className="text-sm text-muted-foreground">{t("lab.graph.colours")}</span>
        <div
          role="group"
          aria-label={t("lab.graph.colours")}
          className="inline-flex border border-border"
        >
          <button
            type="button"
            aria-pressed={!mono}
            className={segment(!mono)}
            onClick={() => chooseMono(false)}
          >
            {t("lab.graph.colour")}
          </button>
          <button
            type="button"
            aria-pressed={mono}
            className={cn(segment(mono), "border-l border-border")}
            onClick={() => chooseMono(true)}
          >
            {t("lab.graph.mono")}
          </button>
        </div>
      </div>
      {bars && worstLinesOffered && (
        <label className="flex items-center gap-2 text-sm text-soft">
          <input
            type="checkbox"
            className="size-4"
            checked={showWorst}
            onChange={(e) => setShowWorst(e.target.checked)}
          />
          {t("lab.graph.worstLines")}
        </label>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <figure
          className="flex w-full max-w-[min(520px,calc((100dvh-330px)*0.85))] min-w-72 flex-col gap-2 p-4 pb-3"
          style={{ background: tone("paper"), color: tone("label") }}
        >
          <figcaption className="flex flex-wrap justify-between gap-2 text-[13px]">
            <span className="font-semibold">
              {t("lab.graph.title", { x: symbolOf(headings.x), y: symbolOf(headings.y) })}
            </span>
            <span className="font-mono">
              {t("lab.graph.scale", {
                x: `${sheet.x.per2cm} ${unitOf(headings.x)}`.trim(),
                xs: symbolOf(headings.x),
                y: `${sheet.y.per2cm} ${unitOf(headings.y)}`.trim(),
                ys: symbolOf(headings.y),
              })}
            </span>
          </figcaption>
          <svg
            ref={svg}
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
            role="application"
            tabIndex={0}
            aria-label={t("lab.graph.sheetLabel", {
              plotted: view.plotted.length,
              total: data.length,
            })}
            aria-describedby="graph-status"
            className="block h-auto w-full cursor-crosshair touch-none focus-visible:outline-2 focus-visible:outline-ring"
            onKeyDown={onKey}
            onFocus={() => setShowCursor(true)}
            onBlur={() => setShowCursor(false)}
            onPointerMove={(e) => {
              const mm = toMmPoint(e.clientX, e.clientY);
              if (mm) {
                setCursor(mm);
                setShowCursor(true);
              }
            }}
            onPointerLeave={() => setShowCursor(document.activeElement === svg.current)}
            onClick={(e) => {
              const mm = toMmPoint(e.clientX, e.clientY);
              if (mm) {
                setCursor(mm);
                pick(mm);
              }
            }}
          >
            <GraphDrawing
              view={view}
              headings={headings}
              mono={mono}
              flaggedRows={flaggedRows}
              {...(bars ? { bars } : {})}
              {...(worst ? { worst } : {})}
            />
            {pending && (
              <circle
                {...(() => {
                  const q = paperOf(pending);
                  return { cx: q.x, cy: q.y };
                })()}
                r={1.2}
                fill={tone("fit")}
              />
            )}
            {showCursor && (
              <g stroke={tone("frame")} strokeWidth={0.25} pointerEvents="none" data-graph="cursor">
                <line x1={cursor.x} y1={0} x2={cursor.x} y2={SHEET.heightMm} />
                <line x1={0} y1={svgY(cursor.y)} x2={SHEET.widthMm} y2={svgY(cursor.y)} />
              </g>
            )}
          </svg>
        </figure>

        <div className="flex min-w-64 flex-1 flex-col gap-4 border border-border bg-surface p-4">
          <p id="graph-status" role="status" className="text-sm">
            {status}
          </p>
          <p className="sr-only" aria-live="polite">
            {showCursor
              ? t("lab.graph.cross", {
                  x: `${symbolOf(headings.x)} = ${fmt(sheet.x, cursorValue.x)}`,
                  y: `${symbolOf(headings.y)} = ${fmt(sheet.y, cursorValue.y)}`,
                })
              : ""}
          </p>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t("lab.graph.axes")}</h3>
            {axisForm("x")}
            {axisForm("y")}
            {view.drawn.sheet && (
              <span className="text-xs text-muted-foreground">{t("lab.graph.drawnForYou")}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold">{t("lab.graph.points")}</h3>
            {data.length === 0 && <p className="text-sm text-soft">{t("lab.graph.noPoints")}</p>}
            <ul className="flex flex-col gap-1 font-mono text-sm">
              {data.map((d, i) => {
                const done = state.plotted.some((p) => p.row === d.row) || view.drawn.plotted;
                return (
                  <li key={d.row}>
                    <button
                      type="button"
                      aria-pressed={nextRow?.row === d.row && tool === "plot"}
                      className={cn(
                        "flex min-h-9 w-full items-center gap-2 px-2 text-left hover:bg-raised",
                        nextRow?.row === d.row && tool === "plot" && "bg-raised",
                      )}
                      onClick={() => {
                        setTool("plot");
                        setTarget(d.row);
                      }}
                    >
                      {t("lab.graph.point", {
                        row: i + 1,
                        x: read(sheet.x, d.x),
                        y: read(sheet.y, d.y),
                      })}
                      {done && (
                        <CheckIcon
                          className="size-3.5 text-ok"
                          aria-label={t("lab.graph.plotted")}
                        />
                      )}
                      {flaggedRows.has(d.row) && (
                        <TriangleAlertIcon className="size-3.5 text-warn" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {view.triangle && triangleC && (
            <div className="flex flex-col gap-1 font-mono text-sm">
              {(
                [
                  ["A", view.triangle.a],
                  ["B", view.triangle.b],
                  ["C", triangleC],
                ] as const
              ).map(([name, p]) => (
                <span key={name}>
                  {t("lab.graph.corner", { name, x: read(sheet.x, p.x), y: read(sheet.y, p.y) })}
                </span>
              ))}
            </div>
          )}
          {showChecks && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold">{t("lab.graph.checks")}</h3>
              {(["scale", "points", "line", "triangle"] as const).map((part) => {
                const found = partFindings[part];
                const drawnYet =
                  part === "scale" ||
                  (part === "points"
                    ? state.plotted.length > 0
                    : part === "line"
                      ? !!state.line
                      : !!state.triangle);
                return (
                  <div key={part} className="flex items-start gap-2 text-sm">
                    {!drawnYet ? (
                      <span className="size-3.5" aria-hidden />
                    ) : found.length ? (
                      <TriangleAlertIcon
                        className="mt-0.5 size-3.5 shrink-0 text-warn"
                        aria-hidden
                      />
                    ) : (
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden />
                    )}
                    <span>
                      <span className="font-medium">{msg(`lab.graph.part.${part}`)}: </span>
                      {!drawnYet
                        ? t("lab.graph.part.notYet")
                        : found.length
                          ? found.map((f) => msg(`${f.key}.title`, f.params)).join("; ")
                          : t("lab.graph.part.fine")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("lab.graph.keys")}</p>
        </div>
      </div>
      {below}
    </section>
  );
}
