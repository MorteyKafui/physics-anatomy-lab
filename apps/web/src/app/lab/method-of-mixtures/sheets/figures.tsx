"use client";

import { Calorimeter, CALORIMETER_VIEWBOX } from "@pa/apparatus";
import { EMPTY_GRAPH } from "@pa/engine";
import type { MixturesSheet } from "@pa/experiments";
import type { Ref } from "react";

import { GRAPH_VIEWBOX, GraphDrawing, graphView } from "../../graph-sheet";
import { SHEET_GRAPH } from "../../sheets/figures";

/**
 * The mixtures print sheets' figures: the calorimeter in its paper tones, with the parts at work
 * lit and the rest faded, and the graph of V against 1/T from the sheet's numbers, its line
 * carried back to the V axis. One SVG each, drawn and printed alike.
 */

export const SHEET_CALORIMETER = {
  width: CALORIMETER_VIEWBOX.width,
  height: CALORIMETER_VIEWBOX.height,
};

type Part = "jacket" | "calorimeter" | "lid" | "stirrer" | "thermometer" | "beaker";

export interface MixturesStep {
  id: "measure" | "pour" | "stir" | "read" | "plot";
  focus?: readonly Part[];
  /** Whether the hot water is still in the beaker, or poured in. */
  poured?: boolean;
}

/** The five steps, as the drawing's strip and the explainer show them. */
export const MIXTURES_STEPS: readonly MixturesStep[] = [
  { id: "measure", focus: ["calorimeter", "beaker"], poured: false },
  { id: "pour", focus: ["beaker", "calorimeter", "lid"], poured: false },
  { id: "stir", focus: ["stirrer", "lid", "jacket"], poured: true },
  { id: "read", focus: ["thermometer"], poured: true },
  { id: "plot" },
];

export function SheetCalorimeter({
  sheet,
  step,
  ref,
}: {
  sheet: MixturesSheet;
  step?: MixturesStep;
  ref?: Ref<SVGSVGElement>;
}) {
  const lit = step?.focus
    ? `[data-part]{opacity:.22}${step.focus.map((p) => `[data-part="${p}"]`).join(",")}{opacity:1}`
    : "";
  const first = sheet.points[0]!;
  const poured = step?.poured ?? true;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-figure="paper"
      viewBox={`0 0 ${SHEET_CALORIMETER.width} ${SHEET_CALORIMETER.height}`}
      width={SHEET_CALORIMETER.width}
      height={SHEET_CALORIMETER.height}
      aria-hidden
    >
      {lit && <style>{lit}</style>}
      <rect
        width={SHEET_CALORIMETER.width}
        height={SHEET_CALORIMETER.height}
        fill="var(--pa-graph-paper)"
      />
      <Calorimeter
        calorimeterWater={first.volume + (poured ? sheet.hotVolume : 0)}
        beakerWater={poured ? 0 : sheet.hotVolume}
        covered
        stirring={poured}
        thermometer={poured ? sheet.room + first.rise : sheet.room}
        layered={0}
      />
    </svg>
  );
}

/** V against 1/T at the four volumes, its line carried back to the V axis, in black and white. */
export function SheetMixturesGraph({
  sheet,
  ref,
}: {
  sheet: MixturesSheet;
  ref?: Ref<SVGSVGElement>;
}) {
  const data = sheet.points.map((p, i) => ({ row: `r${i}`, x: 1 / p.rise, y: p.volume }));
  const view = graphView(EMPTY_GRAPH, data, { x: "invT", y: "V" }, true, "y-axis");
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
      <GraphDrawing view={view} headings={{ x: "1/T/°C⁻¹", y: "V/cm³" }} mono mark={false} />
    </svg>
  );
}
