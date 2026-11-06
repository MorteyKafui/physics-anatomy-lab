import { addRepeat, type DesignColumn, type TableDesign } from "@pa/analysis";
import type { Json, LabEvent, NewEvent, Projection } from "@pa/engine";
import { METRE_RULE } from "@pa/instruments";

import { simplePendulum } from "./simple-pendulum";

/**
 * Lengths and the results table for the simple pendulum (steps 5 and 6). The student times the
 * pendulum at several lengths, twice each, and tabulates l against the timings, the mean, the
 * period T = t / 20 and T², which is what the graph of T² against l needs.
 */

/** The lengths the bench can be set to: 0.400 m to 1.000 m in steps of 0.050 m. */
export const LENGTHS = { min: 0.4, max: 1.0, step: 0.05 } as const;

const onStep = (l: number) =>
  l >= LENGTHS.min - 1e-9 &&
  l <= LENGTHS.max + 1e-9 &&
  Math.abs((l - LENGTHS.min) / LENGTHS.step - Math.round((l - LENGTHS.min) / LENGTHS.step)) < 1e-6;

/** The length the bench is set to, rebuilt from events. Starts at the mockup's 0.800 m. */
export const lengthProjection: Projection<number> = {
  initial: () => simplePendulum.length,
  apply(length, e: LabEvent) {
    if (e.kind !== "pendulum.set-length") return length;
    const l = (e.data as Record<string, Json> | null)?.length;
    return typeof l === "number" && onStep(l) ? Number(l.toFixed(3)) : length;
  },
};

/** The event for setting a new length, or undefined if it is not one the bench allows. */
export function setLength(current: number, length: number): NewEvent | undefined {
  const l = Number(length.toFixed(3));
  if (!onStep(l) || l === current) return undefined;
  return { kind: "pendulum.set-length", data: { length: l } };
}

/** One step longer or shorter, within the bench's range. */
export const stepLength = (current: number, direction: 1 | -1) =>
  Number(
    Math.min(LENGTHS.max, Math.max(LENGTHS.min, current + direction * LENGTHS.step)).toFixed(3),
  );

/** A reading as Measure records it. Older readings, from before lengths could change, are 0.800 m. */
export interface PendulumReading {
  id: string;
  t: number;
  l: number;
}

export function asReading(r: { id: string; data: Json }): PendulumReading | undefined {
  const d = (r.data ?? {}) as Record<string, Json>;
  if (typeof d.t !== "number") return undefined;
  return { id: r.id, t: d.t, l: typeof d.l === "number" ? d.l : simplePendulum.length };
}

// The columns the pendulum table is built from. Lengths are read on a metre rule to 0.1 cm,
// timings on the 0.01 s stopwatch (ADR 0035).
const lengthColumn: DesignColumn = {
  id: "l",
  symbol: "l",
  kind: "length",
  unit: "m",
  role: "given",
  leastCount: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};
const timingColumn: DesignColumn = {
  id: "t",
  symbol: "t",
  kind: "time",
  unit: "s",
  role: "measured",
  leastCount: { value: simplePendulum.stopwatch.resolution, unit: simplePendulum.stopwatch.unit },
};
const periodColumn: DesignColumn = {
  id: "T",
  symbol: "T",
  kind: "time",
  unit: "s",
  role: "derived",
  formula: `t / ${simplePendulum.swings}`,
};
const periodSquaredColumn: DesignColumn = {
  id: "T2",
  symbol: "T²",
  kind: "time-squared",
  unit: "s²",
  role: "derived",
  formula: "T²",
};

const withRepeats = (n: number): DesignColumn[] => {
  let design: TableDesign = {
    columns: [lengthColumn, timingColumn, periodColumn, periodSquaredColumn],
    rows: [],
  };
  if (n >= 2) design = addRepeat(design, "t");
  for (let k = 3; k <= n; k += 1) design = addRepeat(design, "t1");
  return design.columns;
};

/** Templates the student can start from and then adjust (master plan, "Template"). */
export const PENDULUM_TEMPLATES = {
  single: withRepeats(1),
  "two-repeats": withRepeats(2),
  "three-repeats": withRepeats(3),
} as const;
export type PendulumTemplate = keyof typeof PENDULUM_TEMPLATES;

/** The standard WASSCE table: l, two timings of 20 oscillations, their mean, T and T². */
export const PENDULUM_STANDARD_TABLE: readonly DesignColumn[] = PENDULUM_TEMPLATES["two-repeats"];

/**
 * The instrument a column of each quantity is read with on this bench, for columns the student
 * adds: lengths on the metre rule, times on the stopwatch.
 */
export const PENDULUM_INSTRUMENTS: Partial<
  Record<DesignColumn["kind"], NonNullable<DesignColumn["leastCount"]>>
> = {
  length: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
  time: { value: simplePendulum.stopwatch.resolution, unit: simplePendulum.stopwatch.unit },
};

/** What the graph plots: T² against l. */
export const PENDULUM_PLOT = { x: "l", y: "T2" } as const;

/** WASSCE tables ask for at least five sets of readings, so a new table starts with five rows. */
export const STARTING_ROWS = 5;

/**
 * The student's readings laid into the table, one row per length in the order measured, the
 * timings in the repeat columns (or the single timing column). The app offers this at the Auto
 * help level only: elsewhere, writing the reading down is the skill (master plan).
 */
export function readingsIntoTable(
  design: TableDesign,
  readings: readonly PendulumReading[],
  newRowId: () => string,
): { row: string; column: string; value: string }[] {
  const lengthCol = design.columns.find((c) => c.kind === "length" && c.role === "given");
  const timeCols = design.columns.filter(
    (c) => c.kind === "time" && (c.role === "repeat" || c.role === "measured"),
  );
  if (!lengthCol || timeCols.length === 0) return [];
  const byLength = new Map<number, number[]>();
  for (const r of readings) byLength.set(r.l, [...(byLength.get(r.l) ?? []), r.t]);

  const toUnit = lengthCol.unit === "cm" ? 100 : lengthCol.unit === "mm" ? 1000 : 1;
  const lengthPlaces = lengthCol.unit === "cm" ? 1 : lengthCol.unit === "mm" ? 0 : 3;
  const out: { row: string; column: string; value: string }[] = [];
  let i = 0;
  for (const [l, times] of byLength) {
    const row = design.rows[i]?.id ?? newRowId();
    i += 1;
    out.push({ row, column: lengthCol.id, value: (l * toUnit).toFixed(lengthPlaces) });
    times.slice(0, timeCols.length).forEach((t, k) => {
      out.push({ row, column: timeCols[k]!.id, value: t.toFixed(2) });
    });
  }
  return out;
}
