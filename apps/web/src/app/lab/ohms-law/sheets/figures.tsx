"use client";

import { CIRCUIT_FIGURE, CircuitBench } from "@pa/apparatus";
import { EMPTY_GRAPH } from "@pa/engine";
import { CORRECT_LEADS, type OhmsLawSheet } from "@pa/experiments";
import type { Ref } from "react";

import { GRAPH_VIEWBOX, GraphDrawing, graphView } from "../../graph-sheet";
import { SHEET_GRAPH } from "../../sheets/figures";

/**
 * The Ohm's law print sheets' figures: the circuit wired right, in its paper tones, with the
 * parts at work lit and the rest faded, and the graph of I against V from the sheet's numbers.
 * The needles show the solver's readings at each step. One SVG each, drawn and printed alike.
 */

export const SHEET_CIRCUIT = { width: CIRCUIT_FIGURE.width, height: CIRCUIT_FIGURE.height };

type Part = "cells" | "key" | "resistor" | "ammeter" | "voltmeter" | "wire" | "jockey";

export interface CircuitStep {
  id: "wire" | "noContact" | "jockey" | "positions" | "plot";
  focus?: readonly Part[];
  keyClosed?: boolean;
  /** PJ, m, where the jockey is pressed; lifted otherwise. */
  pressed?: number;
}

/** The five steps, as the drawing's strip and the explainer show them. */
export const CIRCUIT_STEPS: readonly CircuitStep[] = [
  { id: "wire", focus: ["cells", "key", "resistor", "ammeter", "voltmeter", "wire"] },
  { id: "noContact", focus: ["key", "ammeter", "voltmeter"], keyClosed: true },
  {
    id: "jockey",
    focus: ["jockey", "wire", "ammeter", "voltmeter"],
    keyClosed: true,
    pressed: 0.6,
  },
  { id: "positions", focus: ["jockey", "wire", "key"] },
  { id: "plot" },
];

/** The reading the solver gives at a step, as needle positions (fractions of full scale). */
function needles(sheet: OhmsLawSheet, step: CircuitStep | undefined) {
  if (!step?.keyClosed) return { ammeter: 0, voltmeter: 0 };
  const r =
    step.pressed === undefined
      ? sheet.noContact
      : (sheet.points.find((p) => p.pj === step.pressed) ?? sheet.noContact);
  return { ammeter: r.y / sheet.ammeter.max, voltmeter: r.x / sheet.voltmeter.max };
}

export function SheetCircuit({
  sheet,
  step,
  ref,
}: {
  sheet: OhmsLawSheet;
  step?: CircuitStep;
  ref?: Ref<SVGSVGElement>;
}) {
  // Lit parts stay black; everything else fades back, as the Anatomy sheets show a step.
  const lit = step?.focus
    ? `[data-part]{opacity:.22}${step.focus.map((p) => `[data-part="${p}"]`).join(",")}{opacity:1}`
    : "";
  const n = needles(sheet, step);
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-figure="paper"
      viewBox={`0 0 ${SHEET_CIRCUIT.width} ${SHEET_CIRCUIT.height}`}
      width={SHEET_CIRCUIT.width}
      height={SHEET_CIRCUIT.height}
      aria-hidden
    >
      {lit && <style>{lit}</style>}
      <rect
        width={SHEET_CIRCUIT.width}
        height={SHEET_CIRCUIT.height}
        fill="var(--pa-graph-paper)"
      />
      <svg x={0} y={0} width={SHEET_CIRCUIT.width} height={SHEET_CIRCUIT.height}>
        <CircuitBench
          figure
          leads={CORRECT_LEADS}
          keyClosed={step?.keyClosed ?? false}
          jockey={{
            at: (step?.pressed ?? sheet.positions.at(-1)!) * sheet.wireLength,
            pressed: step?.pressed !== undefined,
          }}
          wireLength={sheet.wireLength}
          ammeter={n.ammeter}
          voltmeter={n.voltmeter}
        />
      </svg>
    </svg>
  );
}

/** I against V at the five positions, the line carried to the V axis, in black and white. */
export function SheetIvGraph({ sheet, ref }: { sheet: OhmsLawSheet; ref?: Ref<SVGSVGElement> }) {
  const data = sheet.points.map((p, i) => ({ row: `r${i}`, x: p.x, y: p.y }));
  const view = graphView(EMPTY_GRAPH, data, { x: "V", y: "I" }, true, true);
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
      <GraphDrawing view={view} headings={{ x: "V/V", y: "I/A" }} mono mark={false} />
    </svg>
  );
}
