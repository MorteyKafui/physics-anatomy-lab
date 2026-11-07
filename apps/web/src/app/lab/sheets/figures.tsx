"use client";

import { BENCH_VIEWBOX, PendulumBench } from "@pa/apparatus";
import { EMPTY_GRAPH } from "@pa/engine";
import {
  CORRECT_ASSEMBLY,
  PENDULUM_PARTS,
  simplePendulum,
  type Assembly,
  type PendulumPart,
  type PendulumSheet,
} from "@pa/experiments";
import type { Ref } from "react";

import { GRAPH_VIEWBOX, GraphDrawing, graphView } from "../graph-sheet";

/**
 * The print sheets' figures (master plan, "Print sheets": drawn from the same figure as the lab):
 * the bench in its paper tones with numbered pins, the steps with their working parts lit and the
 * rest greyed, and the graph of T² against l from the model. Each is one SVG, so it is drawn on
 * the page and printed from the same markup.
 */

export const SHEET_BENCH = { width: BENCH_VIEWBOX.width, height: BENCH_VIEWBOX.height };
export const SHEET_GRAPH = { width: 234 * 2, height: 276 * 2 };

/** Every part numbered in the order it is built: 1 base plate … 7 stopwatch. */
export const PIN_NUMBERS = Object.fromEntries(
  PENDULUM_PARTS.map((p, i) => [p, String(i + 1)]),
) as Record<PendulumPart, string>;

const only = (parts: readonly PendulumPart[]): Assembly =>
  Object.fromEntries(parts.map((p) => [p, CORRECT_ASSEMBLY[p]])) as Assembly;

export interface SheetStep {
  id: "build" | "cork" | "swing" | "time" | "plot";
  /** The bench as it stands at this step, and the parts at work. */
  assembly?: Assembly;
  focus?: readonly PendulumPart[];
  angle?: number;
}

/** The five steps of the pendulum, as the drawing's strip and the explainer show them. */
export const SHEET_STEPS: readonly SheetStep[] = [
  { id: "build", assembly: only(["base", "rod", "clamp"]), focus: ["base", "rod", "clamp"] },
  {
    id: "cork",
    assembly: only(["base", "rod", "clamp", "cork", "thread", "bob"]),
    focus: ["cork", "thread", "bob"],
  },
  {
    id: "swing",
    assembly: CORRECT_ASSEMBLY,
    focus: ["thread", "bob"],
    angle: (simplePendulum.amplitudeDeg * Math.PI) / 180,
  },
  { id: "time", assembly: CORRECT_ASSEMBLY, focus: ["watch", "bob"] },
  { id: "plot" },
];

export function SheetBench({
  assembly = CORRECT_ASSEMBLY,
  focus,
  angle = 0,
  pins = false,
  ref,
}: {
  assembly?: Assembly;
  focus?: readonly PendulumPart[];
  angle?: number;
  pins?: boolean;
  ref?: Ref<SVGSVGElement>;
}) {
  // Lit parts stay black; everything else fades back, as the Anatomy sheets show a step.
  const lit = focus
    ? `[data-part]{opacity:.22}${focus.map((p) => `[data-part="${p}"]`).join(",")}{opacity:1}`
    : "";
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-figure="paper"
      viewBox={`0 0 ${SHEET_BENCH.width} ${SHEET_BENCH.height}`}
      width={SHEET_BENCH.width}
      height={SHEET_BENCH.height}
      aria-hidden
    >
      {lit && <style>{lit}</style>}
      <rect width={SHEET_BENCH.width} height={SHEET_BENCH.height} fill="var(--pa-graph-paper)" />
      <svg x={0} y={0} width={SHEET_BENCH.width} height={SHEET_BENCH.height}>
        <PendulumBench
          angle={angle}
          stopwatchSeconds={0}
          length={simplePendulum.length}
          assembly={assembly}
          letters={pins ? PIN_NUMBERS : undefined}
          pins={pins}
        />
      </svg>
    </svg>
  );
}

/** T² against l at the sheet's five lengths, drawn the book's way, in black and white. */
export function SheetGraph({ sheet, ref }: { sheet: PendulumSheet; ref?: Ref<SVGSVGElement> }) {
  const data = sheet.points.map((p, i) => ({ row: `r${i}`, ...p }));
  const view = graphView(EMPTY_GRAPH, data, { x: "l", y: "T2" }, true);
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={GRAPH_VIEWBOX}
      width={SHEET_GRAPH.width}
      height={SHEET_GRAPH.height}
      fontFamily="var(--font-mono, ui-monospace, monospace)"
      aria-hidden
    >
      <GraphDrawing view={view} headings={{ x: "l/m", y: "T²/s²" }} mono mark={false} />
    </svg>
  );
}
