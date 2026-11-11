"use client";

import { OPTICAL_VIEWBOX, OpticalBench } from "@pa/apparatus";
import { EMPTY_GRAPH } from "@pa/engine";
import { convergingLens, type LensSheet } from "@pa/experiments";
import type { Ref } from "react";

import { GRAPH_VIEWBOX, GraphDrawing, graphView } from "../../graph-sheet";
import { SHEET_GRAPH } from "../../sheets/figures";

/**
 * The converging lens print sheets' figures: the optical bench in its paper tones, with the parts
 * at work lit and the rest faded, and the graph of 1/v against 1/u from the sheet's numbers. The
 * image on the screen is the lens model's at each step. One SVG each, drawn and printed alike.
 */

export const SHEET_OPTICAL = { width: OPTICAL_VIEWBOX.width, height: OPTICAL_VIEWBOX.height };

type Part = "ray-box" | "gauze" | "lens" | "screen" | "light";

export interface LensStep {
  id: "setUp" | "distance" | "sharp" | "repeat" | "plot";
  focus?: readonly Part[];
  /** Where the screen stands: at the sharpest image, or short of it with the image blurred. */
  screen?: "sharp" | "short";
}

/** The five steps, as the drawing's strip and the explainer show them. */
export const LENS_STEPS: readonly LensStep[] = [
  { id: "setUp", focus: ["ray-box", "gauze", "lens"] },
  { id: "distance", focus: ["ray-box", "lens"], screen: "short" },
  { id: "sharp", focus: ["screen", "light"], screen: "sharp" },
  { id: "repeat", focus: ["lens", "screen"], screen: "sharp" },
  { id: "plot" },
];

/** The ray box stands at 10.0 cm on the rule, as in the lab. */
const OBJECT_AT = 0.1;

export function SheetOptical({
  sheet,
  step,
  ref,
}: {
  sheet: LensSheet;
  step?: LensStep;
  ref?: Ref<SVGSVGElement>;
}) {
  // Lit parts stay full; everything else fades back, as the Anatomy sheets show a step. A part's
  // holder goes with it.
  const lit = step?.focus
    ? `[data-part]{opacity:.22}${step.focus
        .flatMap((p) => [`[data-part="${p}"]`, `[data-part="${p}"] [data-part]`])
        .join(",")}{opacity:1}`
    : "";
  const first = sheet.points[0]!;
  const lens = OBJECT_AT + first.u;
  // Short of the image: the screen a fifth of the way back towards the lens.
  const at = step?.screen === "short" ? first.v * 0.8 : first.v;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-figure="paper"
      viewBox={`0 0 ${SHEET_OPTICAL.width} ${SHEET_OPTICAL.height}`}
      width={SHEET_OPTICAL.width}
      height={SHEET_OPTICAL.height}
      aria-hidden
    >
      {lit && <style>{lit}</style>}
      <rect
        width={SHEET_OPTICAL.width}
        height={SHEET_OPTICAL.height}
        fill="var(--pa-graph-paper)"
      />
      <OpticalBench
        object={OBJECT_AT}
        lens={lens}
        screen={lens + at}
        offAxis={0}
        objectHalfHeight={convergingLens.objectHalfHeight}
        image={{ at: first.v, magnification: first.v / first.u }}
      />
    </svg>
  );
}

/** 1/v against 1/u at the five object distances, the line carried to both axes, in black and white. */
export function SheetLensGraph({ sheet, ref }: { sheet: LensSheet; ref?: Ref<SVGSVGElement> }) {
  // In cm⁻¹, as the table and the graph are headed.
  const data = sheet.points.map((p, i) => ({
    row: `r${i}`,
    x: 1 / (p.u * 100),
    y: 1 / (p.v * 100),
  }));
  const view = graphView(EMPTY_GRAPH, data, { x: "invU", y: "invV" }, true, "both-axes");
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
      <GraphDrawing view={view} headings={{ x: "u⁻¹/cm⁻¹", y: "v⁻¹/cm⁻¹" }} mono mark={false} />
    </svg>
  );
}
