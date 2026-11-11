"use client";

import {
  decimalsForResolution,
  DIVISIONS,
  fromMm,
  heading,
  mmFromLine,
  onLineAt,
  onPaper,
  readingDecimals,
  referenceLine,
  scalesAround,
  SHEET,
  snapMm,
  suggestAxis,
  suggestTriangle,
  type Axis,
  type DesignColumn,
  type DrawnLine,
  type Finding,
  type PlottedPoint,
  type Point,
  type Sheet,
  type SlopeTriangle,
} from "@pa/analysis";
import {
  decideGraph,
  EMPTY_GRAPH,
  graphProjection,
  replay,
  type GraphCommand,
  type GraphState,
} from "@pa/engine";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon, EraserIcon, TriangleAlertIcon } from "@pa/ui/icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import type { AttemptHandle } from "./use-attempt";

const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

/** The graph as of every decided change, even one still being saved. */
export function useGraph(handle: AttemptHandle | undefined) {
  const saved = useMemo(
    () => (handle ? replay(graphProjection, handle.attempt, handle.events) : EMPTY_GRAPH),
    [handle],
  );
  // What the student just did, shown at once while it is saved, so a scale they pick never
  // flicks back to the old one for a moment.
  const [pendingView, setPendingView] = useState<GraphState>();
  const graph = pendingView ?? saved;
  const live = useRef<GraphState>(EMPTY_GRAPH);
  const saving = useRef(0);
  useEffect(() => {
    if (saving.current === 0) live.current = saved;
  }, [saved]);

  const run = useCallback(
    async (commands: readonly GraphCommand[]) => {
      if (!handle) return;
      const news = [];
      let state = live.current;
      for (const c of commands) {
        const d = decideGraph(state, c);
        if (!d.ok) continue;
        news.push(...d.events);
        state = d.events.reduce(
          (s, e) =>
            graphProjection.apply(s, { ...e, id: "", attemptId: "", seq: 0, device: "", at: 0 }),
          state,
        );
      }
      if (!news.length) return;
      live.current = state;
      setPendingView(state);
      saving.current += 1;
      try {
        await handle.record(news);
      } finally {
        saving.current -= 1;
        if (saving.current === 0) setPendingView(undefined);
      }
    },
    [handle],
  );
  const now = useCallback(() => live.current, []);
  return { graph, run, now };
}

/** What the sheet shows: the student's own work, or at Auto what is drawn for them. */
export interface GraphView {
  sheet: Sheet;
  plotted: PlottedPoint[];
  line: DrawnLine | undefined;
  triangle: SlopeTriangle | undefined;
  /** Which parts the app drew (Auto) rather than the student. */
  drawn: { sheet: boolean; plotted: boolean; line: boolean; triangle: boolean };
}

/**
 * The columns the graph plots: the ones the student set the axes to, else the experiment's own
 * plot (T² against l) when the table has both, else the first and last numeric columns.
 */
export function graphColumnsFor(
  state: GraphState,
  columns: readonly DesignColumn[],
  preferred: { x: string; y: string },
): { x: string; y: string } {
  if (state.sheet) return { x: state.sheet.x.column, y: state.sheet.y.column };
  const numeric = columns.filter((c) => c.role !== "notes");
  const has = (id: string) => numeric.some((c) => c.id === id);
  if (has(preferred.x) && has(preferred.y)) return preferred;
  return { x: numeric[0]?.id ?? preferred.x, y: numeric.at(-1)?.id ?? preferred.y };
}

/** An axis heading for a column, "T²/s²", or the column's id if it has gone. */
export const headingFor = (columns: readonly DesignColumn[], id: string) => {
  const c = columns.find((x) => x.id === id);
  return c ? heading(c) : id;
};

/** The scales the app starts from: at Auto the careful choice, otherwise axes from zero. */
export function startingSheet(
  data: readonly Point[],
  columns: { x: string; y: string },
  assist: boolean,
): Sheet {
  const xs = data.map((p) => p.x);
  const ys = data.map((p) => p.y);
  const pad = (v: number[]) => (v.length ? v : [0, 1]);
  return assist
    ? {
        x: suggestAxis(columns.x, pad(xs), DIVISIONS.x),
        y: suggestAxis(columns.y, pad(ys), DIVISIONS.y),
      }
    : {
        x: suggestAxis(columns.x, [0, ...pad(xs)], DIVISIONS.x),
        y: suggestAxis(columns.y, [0, ...pad(ys)], DIVISIONS.y),
      };
}

export function graphView(
  state: GraphState,
  data: readonly PlottedPoint[],
  columns: { x: string; y: string },
  assist: boolean,
  /**
   * The graph is read where its line meets an axis (Ohm's law: E where I = 0), so even the worked
   * sheet at Auto starts both axes from zero, as the question asks.
   */
  fromOrigin = false,
): GraphView {
  const sheet = state.sheet ?? startingSheet(data, columns, assist && !fromOrigin);
  if (!assist)
    return {
      sheet,
      plotted: state.plotted,
      line: state.line,
      triangle: state.triangle,
      drawn: { sheet: false, plotted: false, line: false, triangle: false },
    };
  const plotted = state.plotted.length ? state.plotted : [...data];
  const line = state.line ?? referenceLine(data)?.line;
  const triangle =
    state.triangle ?? (line && data.length >= 2 ? suggestTriangle(sheet, line, data) : undefined);
  return {
    sheet,
    plotted,
    line,
    triangle,
    drawn: {
      sheet: !state.sheet,
      plotted: !state.plotted.length && data.length > 0,
      line: !state.line && line !== undefined,
      triangle: !state.triangle && triangle !== undefined,
    },
  };
}

const VIEW = { x: -26, y: -10, w: 234, h: 276 };
const svgY = (mm: number) => SHEET.heightMm - mm;
const fmt = (axis: Axis, v: number) => v.toFixed(decimalsForResolution(axis.per2cm));
/** A value read off the sheet, to a small square: as the working in Analyse shows it. */
const read = (axis: Axis, v: number) => v.toFixed(readingDecimals(axis));

function gridPath(step: number, skip: number | undefined) {
  let d = "";
  for (let x = 0; x <= SHEET.widthMm + 1e-9; x += step)
    if (!skip || Math.round(x) % skip !== 0) d += `M${x} 0V${SHEET.heightMm}`;
  for (let y = 0; y <= SHEET.heightMm + 1e-9; y += step)
    if (!skip || Math.round(y) % skip !== 0) d += `M0 ${y}H${SHEET.widthMm}`;
  return d;
}
const MINOR = gridPath(SHEET.squareMm, 10);
const MEDIUM = gridPath(10, SHEET.divisionMm);
const MAJOR = gridPath(SHEET.divisionMm, undefined);

/**
 * The sheet itself: ruling, scales, labels, the points, the line and the slope triangle. The Plot
 * step draws it with its tools on top; snapshots and exports draw it on its own.
 */
export function GraphDrawing({
  view,
  headings,
  mono,
  flaggedRows = new Set(),
  mark = true,
}: {
  view: GraphView;
  headings: { x: string; y: string };
  mono: boolean;
  flaggedRows?: ReadonlySet<string>;
  /** The sheet's own mark; a labelled figure carries the mark in its footer instead. */
  mark?: boolean;
}) {
  const { sheet } = view;
  const tone = (part: string) => `var(--pa-graph-${mono ? "mono-" : ""}${part})`;
  const triangleC = view.triangle && { x: view.triangle.b.x, y: view.triangle.a.y };
  const paperOf = (p: Point) => {
    const q = onPaper(sheet, p);
    return { x: q.x, y: svgY(q.y) };
  };
  return (
    <>
      <rect x={0} y={0} width={SHEET.widthMm} height={SHEET.heightMm} fill={tone("paper")} />
      <path d={MINOR} stroke={tone("grid-minor")} strokeWidth={0.15} fill="none" />
      <path d={MEDIUM} stroke={tone("grid-major")} strokeWidth={0.3} fill="none" />
      <path d={MAJOR} stroke={tone("grid-major")} strokeWidth={0.55} fill="none" />
      <rect
        x={0}
        y={0}
        width={SHEET.widthMm}
        height={SHEET.heightMm}
        fill="none"
        stroke={tone("frame")}
        strokeWidth={0.6}
      />

      <g fontFamily="var(--font-mono)" fontSize={4.2} fill={tone("label")}>
        {Array.from({ length: DIVISIONS.x + 1 }, (_, k) => (
          <text key={`x${k}`} x={k * SHEET.divisionMm} y={SHEET.heightMm + 6} textAnchor="middle">
            {fmt(sheet.x, sheet.x.start + k * sheet.x.per2cm)}
          </text>
        ))}
        {Array.from({ length: DIVISIONS.y + 1 }, (_, k) => (
          <text key={`y${k}`} x={-2} y={svgY(k * SHEET.divisionMm) + 1.5} textAnchor="end">
            {fmt(sheet.y, sheet.y.start + k * sheet.y.per2cm)}
          </text>
        ))}
        <text x={SHEET.widthMm / 2} y={SHEET.heightMm + 13} textAnchor="middle" fontSize={5}>
          {headings.x}
        </text>
        <text x={-24} y={-4} fontSize={5}>
          {headings.y}
        </text>
        {mark && (
          <text
            x={SHEET.widthMm}
            y={SHEET.heightMm + 13}
            textAnchor="end"
            fontSize={3.6}
            fill={tone("mark")}
          >
            {t("lab.graph.mark")}
          </text>
        )}
      </g>

      {view.line && (
        <line
          {...(() => {
            const a = paperOf(view.line.from);
            const b = paperOf(view.line.to);
            return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
          })()}
          stroke={tone("fit")}
          strokeWidth={0.7}
          strokeDasharray={view.drawn.line ? "3 1.5" : undefined}
          data-graph="line"
        />
      )}
      {view.triangle && triangleC && (
        <g data-graph="triangle">
          <polygon
            points={[view.triangle.a, triangleC, view.triangle.b]
              .map(paperOf)
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            fill={mono ? "none" : tone("triangle")}
            fillOpacity={0.1}
            stroke={tone("triangle")}
            strokeWidth={0.5}
            strokeDasharray="2 1.2"
          />
          <g fontFamily="var(--font-mono)" fontSize={5} fill={tone("triangle")}>
            {(
              [
                ["A", view.triangle.a, -5, -2],
                ["B", view.triangle.b, 2, -2],
                ["C", triangleC, 2, 5],
              ] as const
            ).map(([name, p, dx, dy]) => {
              const q = paperOf(p);
              return (
                <text key={name} x={q.x + dx} y={q.y + dy}>
                  {name}
                </text>
              );
            })}
          </g>
        </g>
      )}
      <g stroke={tone("point")} strokeWidth={0.6} data-graph="points">
        {view.plotted.map((p) => {
          const q = paperOf(p);
          return (
            <g key={p.row} data-row={p.row}>
              <line x1={q.x - 1.5} y1={q.y - 1.5} x2={q.x + 1.5} y2={q.y + 1.5} />
              <line x1={q.x - 1.5} y1={q.y + 1.5} x2={q.x + 1.5} y2={q.y - 1.5} />
              {flaggedRows.has(p.row) && (
                <circle
                  cx={q.x}
                  cy={q.y}
                  r={3.2}
                  fill="none"
                  stroke={tone("label")}
                  strokeDasharray="1 0.8"
                  strokeWidth={0.4}
                />
              )}
            </g>
          );
        })}
      </g>
    </>
  );
}

/** The sheet's drawing area in its own units, mm with margins for the scales. */
export const GRAPH_VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;

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
}) {
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

      <div className="flex flex-wrap items-start gap-4">
        <figure
          className="flex w-full max-w-[min(520px,calc((100dvh-330px)*0.85))] min-w-72 flex-col gap-2 p-4 pb-3"
          style={{ background: tone("paper"), color: tone("label") }}
        >
          <figcaption className="flex flex-wrap justify-between gap-2 text-[13px]">
            <span className="font-semibold">
              {t("lab.graph.title", { x: headings.x.split("/")[0]!, y: headings.y.split("/")[0]! })}
            </span>
            <span className="font-mono">
              {t("lab.graph.scale", {
                x: `${sheet.x.per2cm} ${headings.x.split("/")[1] ?? ""}`.trim(),
                xs: headings.x.split("/")[0]!,
                y: `${sheet.y.per2cm} ${headings.y.split("/")[1] ?? ""}`.trim(),
                ys: headings.y.split("/")[0]!,
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
            <GraphDrawing view={view} headings={headings} mono={mono} flaggedRows={flaggedRows} />
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
                  x: `${headings.x.split("/")[0]} = ${fmt(sheet.x, cursorValue.x)}`,
                  y: `${headings.y.split("/")[0]} = ${fmt(sheet.y, cursorValue.y)}`,
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
