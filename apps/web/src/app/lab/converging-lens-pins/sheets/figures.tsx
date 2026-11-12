"use client";

import { OPTICAL_VIEWBOX, PinsBench } from "@pa/apparatus";
import { EMPTY_GRAPH } from "@pa/engine";
import type { PinsSheet } from "@pa/experiments";
import type { Ref } from "react";

import { GRAPH_VIEWBOX, GraphDrawing, graphView } from "../../graph-sheet";
import { SHEET_GRAPH } from "../../sheets/figures";

/**
 * The two-pin print sheets' figures: the bench in its paper tones, with the parts at work lit and
 * the rest faded, and the graph of xy against (x + y) from the sheet's numbers. The image is where
 * the model puts it. One SVG each, drawn and printed alike.
 */

export const SHEET_PINS = { width: OPTICAL_VIEWBOX.width, height: OPTICAL_VIEWBOX.height };

type Part = "object-pin" | "lens" | "image" | "search-pin" | "eye" | "light";

export interface PinsStep {
  id: "level" | "look" | "find" | "repeat" | "plot";
  focus?: readonly Part[];
  /** Where the search pin stands: at the image, or short of it. */
  pin?: "at" | "short";
}

/** The five steps, as the drawing's strip and the explainer show them. */
export const PINS_STEPS: readonly PinsStep[] = [
  { id: "level", focus: ["object-pin", "lens", "search-pin"], pin: "short" },
  { id: "look", focus: ["eye", "light", "image"], pin: "short" },
  { id: "find", focus: ["search-pin", "image"], pin: "at" },
  { id: "repeat", focus: ["lens", "search-pin"], pin: "at" },
  { id: "plot" },
];

/** The object pin stands at 10.0 cm on the rule, as in the lab. */
const OBJECT_AT = 0.1;

export function SheetPins({
  sheet,
  step,
  ref,
}: {
  sheet: PinsSheet;
  step?: PinsStep;
  ref?: Ref<SVGSVGElement>;
}) {
  const lit = step?.focus
    ? `[data-part]{opacity:.22}${step.focus.map((p) => `[data-part="${p}"]`).join(",")}{opacity:1}`
    : "";
  const first = sheet.points[0]!;
  const lens = OBJECT_AT + first.x;
  // Short of the image: the search pin a tenth of the way back towards the lens.
  const y = step?.pin === "short" ? first.y * 0.9 : first.y;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-figure="paper"
      viewBox={`0 0 ${SHEET_PINS.width} ${SHEET_PINS.height}`}
      width={SHEET_PINS.width}
      height={SHEET_PINS.height}
      aria-hidden
    >
      {lit && <style>{lit}</style>}
      <rect width={SHEET_PINS.width} height={SHEET_PINS.height} fill="var(--pa-graph-paper)" />
      <PinsBench
        object={OBJECT_AT}
        lens={lens}
        pin={lens + y}
        objectTip={0}
        pinTip={0}
        eye={0}
        image={{ at: first.y, magnification: first.y / first.x }}
      />
    </svg>
  );
}

/** xy against (x + y) at the four object distances, with its slope triangle, in black and white. */
export function SheetPinsGraph({ sheet, ref }: { sheet: PinsSheet; ref?: Ref<SVGSVGElement> }) {
  // In cm² and cm, as the table and the graph are headed.
  const data = sheet.points.map((p, i) => ({
    row: `r${i}`,
    x: (p.x + p.y) * 100,
    y: p.x * p.y * 1e4,
  }));
  const view = graphView(EMPTY_GRAPH, data, { x: "xPlusY", y: "xy" }, true);
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
      <GraphDrawing view={view} headings={{ x: "(x + y)/cm", y: "xy/cm²" }} mono mark={false} />
    </svg>
  );
}
