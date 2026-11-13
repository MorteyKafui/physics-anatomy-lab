import { combineSpreads, leastCountSpread, mean, modelCheck } from "@pa/analysis";
import {
  ANTICIPATED_EVENT,
  createRng,
  DEFAULT_ENVIRONMENT,
  handTimedInterval,
  quantise,
} from "@pa/instruments";

import type { CheckFinding, DataTemplate, LabCheck, LabRow, TemplateColumn } from "./lab-data";
import { SHEET_LENGTHS } from "./pendulum-sheets";
import { PENDULUM_STANDARD_TABLE } from "./pendulum-table";
import { benchPeriod, simplePendulum } from "./simple-pendulum";

/**
 * The simple pendulum's model check (data templates brief, decisions 2, 4 and 5): the data
 * template from the lab's standard table, the model's line of T² against l, a careful student's
 * spread, and the cause and precaution for each part of the verdict that is found.
 */

const P = simplePendulum;

/** What is read in the lab: the length set, and the timings; never the mean, T or T². */
const columns: TemplateColumn[] = PENDULUM_STANDARD_TABLE.filter(
  (c) => c.role === "given" || c.role === "repeat" || c.role === "measured",
).map((c) => ({
  id: c.id,
  symbol: c.symbol,
  kind: c.kind,
  unit: c.unit,
  role: c.role === "given" ? "setting" : "reading",
}));

const timings = columns.filter((c) => c.role === "reading").map((c) => c.id);

export const PENDULUM_DATA_TEMPLATE: DataTemplate = {
  experiment: P.id,
  version: 1,
  // The words are the web app's (messages "experiments.simple-pendulum.check.*").
  title: "experiments.simple-pendulum.title",
  note: "experiments.simple-pendulum.check.note",
  values: [],
  columns,
  settings: SHEET_LENGTHS.map((l) => [l]),
};

/** The model's T² at a length, s²: the exact period at the lab's swing, at the local g. */
export const pendulumModelT2 = (l: number, g: number = DEFAULT_ENVIRONMENT.g) =>
  benchPeriod(g, l) ** 2;

/**
 * A careful student's spread in T², s², at a period T with `repeats` timings averaged: the
 * stopwatch's least count and the two presses' reaction times (ANTICIPATED_EVENT), over the
 * swings timed, carried through T² (σ of T² is 2T σ of T).
 */
export function pendulumCarefulSpread(T: number, repeats: number) {
  const oneTiming = combineSpreads(
    Math.SQRT2 * ANTICIPATED_EVENT.delaySd,
    leastCountSpread(P.stopwatch.resolution),
  );
  return (2 * T * oneTiming) / Math.sqrt(Math.max(1, repeats)) / P.swings;
}

const MESSAGES = "experiments.simple-pendulum.check";

/** The model check of a student's pendulum readings, rows in the template's units. */
export function pendulumCheck(
  rows: readonly LabRow[],
  g: number = DEFAULT_ENVIRONMENT.g,
): LabCheck {
  const table: (number | undefined)[][] = [];
  const points: { x: number; y: number }[] = [];
  const repeats: number[] = [];
  for (const row of rows) {
    const l = row.l;
    const ts = timings.map((id) => row[id]).filter((v): v is number => v !== undefined);
    const t = ts.length ? mean(ts) : undefined;
    const T = t !== undefined ? t / P.swings : undefined;
    const T2 = T !== undefined ? T * T : undefined;
    table.push([l, ...timings.map((id) => row[id]), t, T, T2]);
    if (l !== undefined && T2 !== undefined) {
      points.push({ x: l, y: T2 });
      repeats.push(ts.length);
    }
  }

  const model = points.map((p) => pendulumModelT2(p.x, g));
  const xs = points.map((p) => p.x);
  const lo = Math.min(...xs, SHEET_LENGTHS[0]!);
  const hi = Math.max(...xs, SHEET_LENGTHS[SHEET_LENGTHS.length - 1]!);
  const modelLine = [lo, hi].map((x) => ({ x, y: pendulumModelT2(x, g) }));
  // The exact period's T² is a straight line in l at a fixed swing: its slope from two points.
  const modelSlope = (modelLine[1]!.y - modelLine[0]!.y) / (hi - lo || 1);

  const meanT = points.length ? Math.sqrt(mean(points.map((p) => p.y))) : 0;
  const check = points.length
    ? modelCheck({
        points,
        model,
        modelSlope,
        carefulSpread: pendulumCarefulSpread(meanT, Math.round(mean(repeats))),
      })
    : undefined;

  const findings: CheckFinding[] = [];
  if (check?.shift.found) {
    const above = check.shift.value > 0;
    // The length the shift stands for, cm: a whole line moved by Δ(T²) is a length out by Δ / slope.
    const cm = Math.abs(check.shift.value / modelSlope) * 100;
    findings.push({
      part: "shift",
      cause: `${MESSAGES}.shift.${above ? "above" : "below"}`,
      precaution: `${MESSAGES}.shift.precaution`,
      params: { shift: Math.abs(check.shift.value).toFixed(3), cm: cm.toFixed(1) },
    });
  }
  if (check?.tilt?.found) {
    const steeper = check.tilt.value > check.tilt.model;
    findings.push({
      part: "tilt",
      cause: `${MESSAGES}.tilt.${steeper ? "steeper" : "shallower"}`,
      precaution: `${MESSAGES}.tilt.${steeper ? "steeper" : "shallower"}.precaution`,
      params: { swings: P.swings, counted: P.swings - 1 },
    });
  }
  if (check?.spread.found) {
    findings.push({
      part: "spread",
      cause: `${MESSAGES}.spread`,
      precaution: `${MESSAGES}.spread.precaution`,
      params: { swings: P.swings, times: check.spread.ratio.toFixed(1) },
    });
  }
  return { table, points, model, modelLine, check, findings };
}

/** The table's columns as the lab's standard table heads them: l, t₁, t₂, t, T, T². */
export const PENDULUM_CHECK_COLUMNS = PENDULUM_STANDARD_TABLE.map((c) => ({
  id: c.id,
  symbol: c.symbol,
  unit: c.unit,
}));

/**
 * The example shown before a student brings in their own readings, labelled as example data
 * (AGENTS.md rule 2): a careful student's two timings at each of the template's lengths, from the
 * hand-timing model on the exact period (seed fixed, so it is the same each time).
 */
export function pendulumExample(g: number = DEFAULT_ENVIRONMENT.g): LabRow[] {
  const rng = createRng(11);
  return SHEET_LENGTHS.map((l) => {
    const time = () =>
      quantise(
        handTimedInterval(rng, P.swings * benchPeriod(g, l), ANTICIPATED_EVENT),
        P.stopwatch.resolution,
      );
    return { l, t1: time(), t2: time() };
  });
}
