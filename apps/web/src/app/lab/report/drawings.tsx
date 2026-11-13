"use client";

import {
  BENCH_VIEWBOX,
  Calorimeter,
  HotSolidBench,
  CIRCUIT_FIGURE,
  CircuitBench,
  OPTICAL_VIEWBOX,
  OpticalBench,
  PendulumBench,
  PinsBench,
} from "@pa/apparatus";
import type { Ref } from "react";

import { GRAPH_VIEWBOX, GraphDrawing } from "../graph-sheet";
import type { FigureScene } from "../snapshot-figure";

/**
 * The report's two figures as plain drawings, without the snapshot sheet around them: the report
 * gives each its own number and caption. The bench is in its paper tones, as a report prints it. One SVG each, so the screen shows them and the PDF and
 * Word files are made from them.
 */

export const BENCH_SIZE = {
  width: 360,
  height: (360 * BENCH_VIEWBOX.height) / BENCH_VIEWBOX.width,
};
export const CIRCUIT_SIZE = {
  width: 440,
  height: (440 * CIRCUIT_FIGURE.height) / CIRCUIT_FIGURE.width,
};
export const OPTICAL_SIZE = {
  width: 440,
  height: (440 * OPTICAL_VIEWBOX.height) / OPTICAL_VIEWBOX.width,
};
export const GRAPH_SIZE = { width: 400, height: (400 * 276) / 234 };

export function BenchDrawing({
  scene,
  label,
  ref,
}: {
  scene: FigureScene;
  label?: string;
  ref?: Ref<SVGSVGElement>;
}) {
  const d = scene.drawing;
  if (
    d.kind !== "bench" &&
    d.kind !== "circuit" &&
    d.kind !== "optical" &&
    d.kind !== "pins" &&
    d.kind !== "calorimeter" &&
    d.kind !== "hot-solid"
  )
    return null;
  const size =
    d.kind === "bench"
      ? BENCH_SIZE
      : d.kind === "optical" ||
          d.kind === "pins" ||
          d.kind === "calorimeter" ||
          d.kind === "hot-solid"
        ? OPTICAL_SIZE
        : CIRCUIT_SIZE;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      data-figure="paper"
      viewBox={`0 0 ${size.width} ${size.height}`}
      width={size.width}
      height={size.height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="block h-auto max-w-full"
    >
      <rect width={size.width} height={size.height} fill="var(--pa-graph-paper)" />
      <svg x={0} y={0} width={size.width} height={size.height}>
        {d.kind === "bench" ? (
          <PendulumBench
            angle={d.angle}
            stopwatchSeconds={d.stopwatch}
            length={d.length}
            assembly={d.assembly}
            letters={d.letters}
          />
        ) : d.kind === "optical" ? (
          <OpticalBench
            object={d.object}
            lens={d.lens}
            screen={d.screen}
            offAxis={d.offAxis}
            objectHalfHeight={d.objectHalfHeight}
            image={d.image}
          />
        ) : d.kind === "hot-solid" ? (
          <HotSolidBench
            balance={d.balance}
            solid="calorimeter"
            wet={false}
            water={d.water}
            covered={d.covered}
            stirring={d.stirring}
            thermometer={d.thermometer}
          />
        ) : d.kind === "calorimeter" ? (
          <Calorimeter
            calorimeterWater={d.water}
            beakerWater={0}
            covered={d.covered}
            stirring={d.stirring}
            thermometer={d.thermometer}
            layered={0}
          />
        ) : d.kind === "pins" ? (
          <PinsBench
            object={d.object}
            lens={d.lens}
            pin={d.pin}
            objectTip={0}
            pinTip={0}
            eye={0}
            image={d.image}
          />
        ) : (
          <CircuitBench
            leads={d.leads}
            keyClosed={false}
            jockey={d.jockey}
            wireLength={d.wireLength}
            ammeter={0}
            voltmeter={0}
            figure
          />
        )}
      </svg>
    </svg>
  );
}

export function GraphFigure({
  scene,
  mono,
  label,
  ref,
}: {
  scene: FigureScene;
  mono: boolean;
  label?: string;
  ref?: Ref<SVGSVGElement>;
}) {
  const d = scene.drawing;
  if (d.kind !== "graph") return null;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={GRAPH_VIEWBOX}
      width={GRAPH_SIZE.width}
      height={GRAPH_SIZE.height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="block h-auto max-w-full"
      fontFamily="var(--font-mono, ui-monospace, monospace)"
    >
      <GraphDrawing view={d.view} headings={d.headings} mono={mono} mark={false} />
    </svg>
  );
}
