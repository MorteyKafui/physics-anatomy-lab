"use client";

import { HOT_SOLID_VIEWBOX, HotSolidBench } from "@pa/apparatus";
import { EMPTY_GRAPH } from "@pa/engine";
import type { SolidSheet } from "@pa/experiments";
import type { Ref } from "react";

import { GRAPH_VIEWBOX, GraphDrawing, graphView } from "../../graph-sheet";
import { SHEET_GRAPH } from "../../sheets/figures";

/**
 * The hot-solid print sheets' figures: the bench in its paper tones, with the parts at work lit and
 * the rest faded, and the graph of θ against t for copper from the sheet's numbers. One SVG each,
 * drawn and printed alike.
 */

export const SHEET_HOT_SOLID = { width: HOT_SOLID_VIEWBOX.width, height: HOT_SOLID_VIEWBOX.height };

type Part =
  "balance" | "beaker" | "solid" | "jacket" | "calorimeter" | "lid" | "stirrer" | "thermometer";

export interface SolidStep {
  id: "weigh" | "heat" | "move" | "read" | "plot";
  focus?: readonly Part[];
  /** Where the solid is. */
  at?: "beaker" | "air" | "calorimeter";
}

/** The five steps, as the drawing's strip and the explainer show them. */
export const SOLID_STEPS: readonly SolidStep[] = [
  { id: "weigh", focus: ["balance", "calorimeter"], at: "beaker" },
  { id: "heat", focus: ["beaker", "solid"], at: "beaker" },
  { id: "move", focus: ["solid", "lid"], at: "air" },
  { id: "read", focus: ["thermometer", "stirrer"], at: "calorimeter" },
  { id: "plot" },
];

export function SheetHotSolid({
  sheet,
  step,
  ref,
}: {
  sheet: SolidSheet;
  step?: SolidStep;
  ref?: Ref<SVGSVGElement>;
}) {
  const lit = step?.focus
    ? `[data-part]{opacity:.22}${step.focus.map((p) => `[data-part="${p}"]`).join(",")}{opacity:1}`
    : "";
  const copper = sheet.metals[0]!;
  const at = step?.at ?? "calorimeter";
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-figure="paper"
      viewBox={`0 0 ${SHEET_HOT_SOLID.width} ${SHEET_HOT_SOLID.height}`}
      width={SHEET_HOT_SOLID.width}
      height={SHEET_HOT_SOLID.height}
      aria-hidden
    >
      {lit && <style>{lit}</style>}
      <rect
        width={SHEET_HOT_SOLID.width}
        height={SHEET_HOT_SOLID.height}
        fill="var(--pa-graph-paper)"
      />
      <HotSolidBench
        balance={sheet.solid}
        solid={at}
        wet={false}
        water={sheet.water}
        covered
        stirring={at === "calorimeter"}
        thermometer={at === "calorimeter" ? Math.max(...copper.minutes) : sheet.room}
      />
    </svg>
  );
}

/** θ against t for copper, read every minute, in black and white. */
export function SheetSolidGraph({ sheet, ref }: { sheet: SolidSheet; ref?: Ref<SVGSVGElement> }) {
  const data = sheet.metals[0]!.minutes.map((y, i) => ({ row: `r${i}`, x: i, y }));
  const view = graphView(EMPTY_GRAPH, data, { x: "t", y: "theta" }, true, "points");
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
      <GraphDrawing view={view} headings={{ x: "t/min", y: "θ/°C" }} mono mark={false} />
    </svg>
  );
}
