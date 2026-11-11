"use client";

import {
  decimalsForResolution,
  DIVISIONS,
  heading,
  lineToXAxis,
  onPaper,
  readingDecimals,
  referenceLine,
  SHEET,
  suggestAxis,
  suggestTriangle,
  type Axis,
  type DesignColumn,
  type DrawnLine,
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
import { t } from "@pa/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AttemptHandle } from "./use-attempt";

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

/** A line carried on to meet both axes, from where it crosses x = 0 to where it crosses y = 0. */
export function lineAcrossAxes(line: DrawnLine): DrawnLine | undefined {
  const { from, to } = line;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 || dy === 0) return undefined;
  const y0 = from.y - (from.x * dy) / dx;
  const x0 = from.x - (from.y * dx) / dy;
  return { from: { x: 0, y: y0 }, to: { x: x0, y: 0 } };
}

export function graphView(
  state: GraphState,
  data: readonly PlottedPoint[],
  columns: { x: string; y: string },
  assist: boolean,
  /**
   * The graph is read where its line meets an axis (Ohm's law: E where I = 0), so even the worked
   * sheet at Auto starts both axes from zero, as the question asks. "both-axes": it is read where
   * the line meets each axis (the lens's two intercepts), so the worked line runs from one axis
   * to the other and the worked sheet reaches both.
   */
  fromOrigin: boolean | "both-axes" = false,
): GraphView {
  const fitted = referenceLine(data)?.line;
  const across = fromOrigin === "both-axes" && fitted ? lineAcrossAxes(fitted) : undefined;
  const sheet =
    state.sheet ??
    startingSheet(
      across && assist ? [...data, across.from, across.to] : data,
      columns,
      assist && !fromOrigin,
    );
  if (!assist)
    return {
      sheet,
      plotted: state.plotted,
      line: state.line,
      triangle: state.triangle,
      drawn: { sheet: false, plotted: false, line: false, triangle: false },
    };
  const plotted = state.plotted.length ? state.plotted : [...data];
  // Read where it meets the V axis: the worked line is carried on to the axis, as on paper.
  const line = state.line ?? across ?? (fitted && fromOrigin ? lineToXAxis(fitted) : fitted);
  // Read at both axes, the graph's slope is not asked for, so no triangle is drawn for it.
  const triangle =
    state.triangle ??
    (line && data.length >= 2 && fromOrigin !== "both-axes"
      ? suggestTriangle(sheet, line, data)
      : undefined);
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

export const VIEW = { x: -26, y: -10, w: 234, h: 276 };
export const svgY = (mm: number) => SHEET.heightMm - mm;
export const fmt = (axis: Axis, v: number) => v.toFixed(decimalsForResolution(axis.per2cm));
/** A value read off the sheet, to a small square: as the working in Analyse shows it. */
export const read = (axis: Axis, v: number) => v.toFixed(readingDecimals(axis));

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
