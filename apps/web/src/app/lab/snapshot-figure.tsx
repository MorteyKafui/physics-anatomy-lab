"use client";

import { decimalsForResolution, fillDerived, heading, pointsFor } from "@pa/analysis";
import { BENCH_VIEWBOX, CIRCUIT_VIEWBOX, CircuitBench, PendulumBench } from "@pa/apparatus";
import {
  coachIsOn,
  coachProjection,
  eventsBefore,
  graphProjection,
  helpLevelFor,
  replay,
  STEPS,
  tableProjection,
  type Attempt,
  type CoachState,
  type LabEvent,
  type Snapshot,
} from "@pa/engine";
import {
  assemblyProjection,
  benchPeriod,
  bobAngle,
  lengthProjection,
  PENDULUM_PARTS,
  PENDULUM_PLOT,
  simplePendulum,
  type Assembly,
  type Lead,
  type PendulumPart,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { logo } from "@pa/ui";
import type { Ref } from "react";

import {
  GRAPH_VIEWBOX,
  GraphDrawing,
  graphColumnsFor,
  graphView,
  headingFor,
  type GraphView,
} from "./graph-sheet";

/**
 * A snapshot as a labelled figure (master plan, "Snapshots, labelled exports and research use"):
 * the figure number and a short title at the top, the drawing, a legend keying the lettered parts,
 * a one-line caption with the values that matter, and a footer that traces it (the mark, the
 * experiment and its version, when it was taken and the attempt's seed).
 *
 * The drawing is rebuilt from the events before the snapshot, so it is the lab exactly as it was,
 * and it is one SVG: the notebook shows it, and the exports are made from it.
 */

const E = simplePendulum;
const experimentName = () => t("experiments.simple-pendulum.title");

export type FigureDrawing =
  | {
      kind: "bench";
      assembly: Assembly;
      length: number;
      angle: number;
      stopwatch: number;
      letters: Partial<Record<PendulumPart, string>>;
    }
  | {
      /** The Ohm's law circuit as wired, the key open and the meters at rest. */
      kind: "circuit";
      leads: readonly Lead[];
      jockey: { at: number; pressed: boolean };
      wireLength: number;
    }
  | { kind: "table"; headings: string[]; rows: string[][] }
  | { kind: "graph"; view: GraphView; headings: { x: string; y: string } };

export interface FigureScene {
  snapshot: Snapshot;
  fig: number;
  title: string;
  /** What a screen reader hears for the drawing. */
  alt: string;
  legend: { letter: string; name: string }[];
  values: string[];
  footer: string;
  drawing: FigureDrawing;
}

const LETTERS = "ABCDEFGHIJ";

/** Dates on figures, in the app's language: "7 Nov 2026, 10:15". */
export const figureDate = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);

const levelOf = (state: CoachState, skill: "tabulation" | "graph") =>
  coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";

/** Everything a snapshot's figure shows, worked out from the events before it. Pure. */
export function figureScene(
  attempt: Attempt,
  events: readonly LabEvent[],
  snapshot: Snapshot,
  fig: number,
): FigureScene {
  const before = eventsBefore(events, snapshot.point);
  const state = replay(coachProjection, attempt, before);
  const footer = t("figure.footer", {
    experiment: experimentName(),
    version: E.version,
    date: figureDate(snapshot.takenAt),
    seed: attempt.seed,
  });
  const base = {
    snapshot,
    fig,
    title: t(`figure.title.${snapshot.kind}` as MessageKey, { experiment: experimentName() }),
    footer,
  };
  const caption = snapshot.caption || t(`lab.snapshot.yours.${snapshot.kind}` as MessageKey);

  if (snapshot.kind === "bench") {
    const assembly = replay(assemblyProjection, attempt, before);
    const length = replay(lengthProjection, attempt, before);
    const swinging = STEPS.indexOf(state.step) >= STEPS.indexOf("measure");
    const time = snapshot.bench?.time ?? 0;
    const stopwatch = snapshot.bench?.stopwatch ?? 0;
    const placed = PENDULUM_PARTS.filter((p) => assembly[p] !== undefined);
    const letters = Object.fromEntries(placed.map((p, i) => [p, LETTERS[i]!])) as Partial<
      Record<PendulumPart, string>
    >;
    return {
      ...base,
      alt: t("figure.alt.bench", { caption }),
      legend: placed.map((p) => ({
        letter: letters[p]!,
        name: t(`experiments.simple-pendulum.parts.${p}.name` as MessageKey),
      })),
      values: [
        t("figure.values.length", { length: length.toFixed(3) }),
        ...(stopwatch > 0
          ? [
              t("figure.values.stopwatch", {
                time: stopwatch.toFixed(decimalsForResolution(E.stopwatch.resolution)),
              }),
            ]
          : []),
      ],
      drawing: {
        kind: "bench",
        assembly,
        length,
        angle: swinging ? bobAngle(time, benchPeriod(DEFAULT_ENVIRONMENT.g, length)) : 0,
        stopwatch,
        letters,
      },
    };
  }

  // At Auto the worked-out cells and the graph were drawn for the student; the figure shows
  // what the lab showed.
  const table = replay(tableProjection, attempt, before);
  const shownTable = levelOf(state, "tabulation") === "auto" ? fillDerived(table) : table;

  if (snapshot.kind === "table") {
    const rows = shownTable.rows.map((r) => table.columns.map((c) => r.cells[c.id] ?? ""));
    return {
      ...base,
      alt: t("figure.alt.table", { caption }),
      legend: [],
      values: [
        rows.length === 1
          ? t("figure.values.rows.one")
          : t("figure.values.rows", { count: rows.length }),
      ],
      drawing: { kind: "table", headings: table.columns.map((c) => heading(c)), rows },
    };
  }

  const graph = replay(graphProjection, attempt, before);
  const columns = graphColumnsFor(graph, table.columns, PENDULUM_PLOT);
  const data = pointsFor(shownTable, columns.x, columns.y);
  const view = graphView(graph, data, columns, levelOf(state, "graph") === "auto");
  const headings = {
    x: headingFor(table.columns, columns.x),
    y: headingFor(table.columns, columns.y),
  };
  const symbol = (id: string) => table.columns.find((c) => c.id === id)?.symbol ?? id;
  return {
    ...base,
    alt: t("figure.alt.graph", { caption, y: symbol(columns.y), x: symbol(columns.x) }),
    legend: [],
    values: [
      view.plotted.length === 1
        ? t("figure.values.plotted.one")
        : t("figure.values.plotted", { count: view.plotted.length }),
    ],
    drawing: { kind: "graph", view, headings },
  };
}

// The sheet's layout, in SVG units (px at 1×).
const W = 720;
const PAD = 24;
const TOP = 56;

/** Split a caption into lines that fit the sheet (about 84 characters at 14 px). */
function wrap(text: string, width = 84): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawingHeight(d: FigureDrawing): number {
  if (d.kind === "bench" || d.kind === "circuit") return 400;
  if (d.kind === "graph") return 440;
  return 30 + 26 * Math.max(1, d.rows.length) + 2;
}

/** The sheet's size, for exporting it at a scale. */
export function sheetSize(scene: FigureScene): { width: number; height: number } {
  const legendRows = Math.ceil(scene.legend.length / 2);
  const captionLines = wrap(`${t("figure.fig", { n: scene.fig })} ${scene.snapshot.caption}`);
  const height =
    TOP +
    drawingHeight(scene.drawing) +
    (legendRows ? 20 + legendRows * 20 : 0) +
    28 +
    captionLines.length * 19 +
    22 +
    40;
  return { width: W, height };
}

const SANS = "var(--font-sans, system-ui, sans-serif)";
const MONO = "var(--font-mono, ui-monospace, monospace)";

/** The labelled figure, as one SVG. Its colours are the light print theme's (data-theme site). */
export function SnapshotSheet({
  scene,
  mono = false,
  ref,
  decorative = false,
}: {
  scene: FigureScene;
  /** Black-and-white graph (the WAEC print style). */
  mono?: boolean;
  ref?: Ref<SVGSVGElement>;
  /** A copy kept for exporting, hidden from assistive technology. */
  decorative?: boolean;
}) {
  const { width, height } = sheetSize(scene);
  const d = scene.drawing;
  const boxH = drawingHeight(d);
  const boxW = W - 2 * PAD;
  const legendRows = Math.ceil(scene.legend.length / 2);
  const legendTop = TOP + boxH + 20;
  const captionTop = TOP + boxH + (legendRows ? 20 + legendRows * 20 : 0) + 28;
  const figLabel = t("figure.fig", { n: scene.fig });
  const captionLines = wrap(`${figLabel} ${scene.snapshot.caption}`);
  const valuesTop = captionTop + captionLines.length * 19 + 2;
  const footerTop = valuesTop + 22;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-theme="site"
      data-snapshot={scene.snapshot.id}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `${figLabel}. ${scene.alt}`}
      aria-hidden={decorative || undefined}
      className="block h-auto max-w-full"
      fontFamily={SANS}
    >
      <rect x={0} y={0} width={width} height={height} fill="var(--pa-surface)" />
      {/* Figure number and title */}
      <text x={PAD} y={36} fontSize={15} fontWeight={600} fill="var(--pa-fg)">
        {figLabel}
      </text>
      <text x={W - PAD} y={36} fontSize={13} textAnchor="end" fill="var(--pa-fg-muted)">
        {scene.title}
      </text>

      {/* The drawing */}
      <rect
        x={PAD}
        y={TOP}
        width={boxW}
        height={boxH}
        fill={d.kind === "bench" || d.kind === "circuit" ? "var(--pa-ink-950)" : "var(--pa-bg)"}
        stroke="var(--pa-border)"
      />
      {d.kind === "bench" && (
        <svg
          x={PAD + (boxW - (380 * BENCH_VIEWBOX.width) / BENCH_VIEWBOX.height) / 2}
          y={TOP + 10}
          width={(380 * BENCH_VIEWBOX.width) / BENCH_VIEWBOX.height}
          height={380}
        >
          <PendulumBench
            angle={d.angle}
            stopwatchSeconds={d.stopwatch}
            length={d.length}
            assembly={d.assembly}
            letters={d.letters}
          />
        </svg>
      )}
      {d.kind === "circuit" && (
        <svg
          x={PAD + (boxW - (380 * CIRCUIT_VIEWBOX.width) / CIRCUIT_VIEWBOX.height) / 2}
          y={TOP + 10}
          width={(380 * CIRCUIT_VIEWBOX.width) / CIRCUIT_VIEWBOX.height}
          height={380}
        >
          <CircuitBench
            leads={d.leads}
            keyClosed={false}
            jockey={d.jockey}
            wireLength={d.wireLength}
            ammeter={0}
            voltmeter={0}
          />
        </svg>
      )}
      {d.kind === "graph" && (
        <svg
          x={PAD + (boxW - (420 * 234) / 276) / 2}
          y={TOP + 10}
          width={(420 * 234) / 276}
          height={420}
          viewBox={GRAPH_VIEWBOX}
        >
          <GraphDrawing view={d.view} headings={d.headings} mono={mono} mark={false} />
        </svg>
      )}
      {d.kind === "table" && (
        <SheetTable top={TOP} width={boxW} headings={d.headings} rows={d.rows} />
      )}

      {/* Legend: the lettered parts */}
      {scene.legend.map((item, i) => (
        <text
          key={item.letter}
          x={PAD + (i % 2) * (boxW / 2)}
          y={legendTop + Math.floor(i / 2) * 20 + 4}
          fontSize={13}
          fill="var(--pa-fg)"
        >
          {t("figure.legend", item)}
        </text>
      ))}

      {/* Caption, and the values that matter */}
      {captionLines.map((line, i) => (
        <text key={i} x={PAD} y={captionTop + i * 19} fontSize={14} fill="var(--pa-fg)">
          {i === 0 && line.startsWith(figLabel) ? (
            <>
              <tspan fontWeight={600}>{figLabel}</tspan>
              {line.slice(figLabel.length)}
            </>
          ) : (
            line
          )}
        </text>
      ))}
      <text x={PAD} y={valuesTop + 14} fontSize={12} fontFamily={MONO} fill="var(--pa-fg-soft)">
        {scene.values.join(" · ")}
      </text>

      {/* Footer: the mark and what traces the figure */}
      <line x1={PAD} x2={W - PAD} y1={footerTop} y2={footerTop} stroke="var(--pa-border)" />
      <svg x={PAD} y={footerTop + 12} width={14} height={14} viewBox={logo.viewBox}>
        <path d={logo.letter} fill="none" stroke="var(--pa-fg)" strokeWidth={18} />
        <line {...logo.thread} stroke="var(--pa-fg)" strokeWidth={5} />
        <circle {...logo.bob} fill={logo.bobColour} />
      </svg>
      <text x={PAD + 20} y={footerTop + 23} fontSize={11} fill="var(--pa-fg-muted)">
        <tspan fontWeight={600} fill="var(--pa-fg)">
          Physics Anatomy
        </tspan>
        {` · ${scene.footer}`}
      </text>
    </svg>
  );
}

/** A table drawn in SVG, ruled like an exercise book's. */
function SheetTable({
  top,
  width,
  headings,
  rows,
}: {
  top: number;
  width: number;
  headings: string[];
  rows: string[][];
}) {
  if (headings.length === 0)
    return (
      <text x={PAD + 16} y={top + 34} fontSize={13} fill="var(--pa-fg-muted)">
        {t("figure.empty.table")}
      </text>
    );
  const colW = width / headings.length;
  const x = (i: number) => PAD + i * colW;
  const bottom = top + 30 + 26 * Math.max(1, rows.length);
  return (
    <g fontFamily={MONO} fontSize={13} fill="var(--pa-on-paper, var(--pa-fg))">
      <rect x={PAD} y={top} width={width} height={bottom - top} fill="var(--pa-surface)" />
      {headings.map((h, i) => (
        <text key={i} x={x(i) + 8} y={top + 20} fontWeight={600} fill="var(--pa-fg)">
          {h}
        </text>
      ))}
      <line x1={PAD} x2={PAD + width} y1={top + 30} y2={top + 30} stroke="var(--pa-fg)" />
      {headings.slice(1).map((_, i) => (
        <line key={i} x1={x(i + 1)} x2={x(i + 1)} y1={top} y2={bottom} stroke="var(--pa-border)" />
      ))}
      {rows.map((row, r) =>
        row.map((cell, c) => (
          <text key={`${r}-${c}`} x={x(c) + 8} y={top + 30 + 26 * r + 18} fill="var(--pa-fg)">
            {cell}
          </text>
        )),
      )}
      <rect x={PAD} y={top} width={width} height={bottom - top} fill="none" stroke="var(--pa-fg)" />
    </g>
  );
}
