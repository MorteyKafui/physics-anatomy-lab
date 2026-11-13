import {
  combineSpreads,
  fitLine,
  leastCountSpread,
  mean,
  modelCheck,
  xIntercept,
  type ModelCheck,
} from "@pa/analysis";
import { METRE_RULE, quantise, substream, uniform } from "@pa/instruments";
import { bestFocus, lensForFocalLength } from "@pa/physics";

import { convergingLens, sharpScreenRange, type LensWorld } from "./converging-lens";
import { LENS_TEMPLATES } from "./converging-lens-table";
import type { CheckFinding, DataTemplate, LabCheck, LabRow, TemplateColumn } from "./lab-data";

/**
 * The converging lens's model check (data templates brief, decision 4): 1/v against 1/u. The
 * model's line is the exact lens's best focus, so its slope is −1 to within the lens's own
 * aberration; with the lens's marked focal length entered the line is fixed, and both intercepts
 * are 1/f. The student's v is judged against how wide the sharp image is.
 */

const C = convergingLens;
const L = C.lens;

/** What is read in the lab: u, and v twice (the screen brought in from each side); never 1/u or 1/v. */
const columns: TemplateColumn[] = LENS_TEMPLATES["two-repeats"]
  .filter((c) => c.role === "given" || c.role === "repeat" || c.role === "measured")
  .map((c) => ({
    id: c.id,
    symbol: c.symbol,
    kind: c.kind,
    unit: c.unit,
    role: c.role === "given" ? "setting" : "reading",
  }));
const images = columns.filter((c) => c.role === "reading").map((c) => c.id);

/** cm, as the bench's rule reads. */
const cm = (m: number) => Math.round(m * 1000) / 10;

export const LENS_DATA_TEMPLATE: DataTemplate = {
  experiment: C.id,
  version: 1,
  // The words are the web app's (messages "experiments.converging-lens.check.*").
  title: "experiments.converging-lens.title",
  note: "experiments.converging-lens.check.note",
  values: [
    {
      id: "f",
      label: "experiments.converging-lens.check.marked",
      kind: "length",
      unit: "cm",
      optional: true,
    },
  ],
  columns,
  settings: C.objectDistances.map((u) => [cm(u)]),
};

/** The approved school lens with a focal length, m: its exact shape, as the lab builds it. */
const lensOf = (f: number) => lensForFocalLength(f, L.index, L.aperture, L.edge);

/** The model's 1/v, cm⁻¹, at an object distance u, cm, for a lens of focal length f, cm. */
export const lensModelInvV = (u: number, f: number = cm(L.focalLength)) =>
  1 / (bestFocus(lensOf(f / 100), u / 100) * 100);

/**
 * A careful student's spread in 1/v, cm⁻¹, at u and v, cm, with `repeats` images found: the screen
 * anywhere in the range where the image looks sharp (half-width v × sharpness ⁄ aperture, a
 * uniform spread of half-width over √3), each place read on the rule at both holders, and u's own
 * two readings carried across by the slope of −1.
 */
export function lensCarefulSpread(u: number, v: number, repeats: number) {
  const rule = Math.SQRT2 * leastCountSpread(METRE_RULE.resolution);
  const judged = (v * (C.sharpness / L.aperture)) / Math.sqrt(3);
  const inV = combineSpreads(judged, rule) / Math.sqrt(Math.max(1, repeats)) / v ** 2;
  const inU = rule / u ** 2;
  return combineSpreads(inV, inU);
}

const MESSAGES = "experiments.converging-lens.check";

export interface LensResult {
  /** The intercepts on the 1/v axis and the 1/u axis, cm⁻¹, and f = 2 ⁄ (m₁ + m₂), cm. */
  m1: number;
  m2: number;
  f: number;
}

/** The model check of a student's lens readings, rows and values in the template's units (cm). */
export function lensCheck(
  rows: readonly LabRow[],
  values: Readonly<Record<string, number | undefined>> = {},
): LabCheck & { result?: LensResult } {
  const table: (number | undefined)[][] = [];
  const points: { x: number; y: number }[] = [];
  const spreads: number[] = [];
  for (const row of rows) {
    const u = row.u;
    const vs = images.map((id) => row[id]).filter((v): v is number => v !== undefined);
    const v = vs.length ? mean(vs) : undefined;
    const ok = u !== undefined && u > 0 && v !== undefined && v > 0;
    table.push([
      u,
      ...images.map((id) => row[id]),
      v,
      ok ? 1 / u : undefined,
      ok ? 1 / v : undefined,
    ]);
    if (ok) {
      points.push({ x: 1 / u, y: 1 / v });
      spreads.push(lensCarefulSpread(u, v, vs.length));
    }
  }
  if (points.length < 3 || new Set(points.map((p) => p.x)).size < 2) {
    return { table, points, model: [], modelLine: [], check: undefined, findings: [] };
  }

  const marked = values.f;
  const f = marked ?? cm(L.focalLength);
  const modelAt = (x: number) => lensModelInvV(1 / x, f);
  const xs = points.map((p) => p.x);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const modelLine = [lo, hi].map((x) => ({ x, y: modelAt(x) }));
  const modelSlope = (modelLine[1]!.y - modelLine[0]!.y) / (hi - lo);

  const fit = fitLine(points);
  // With a marking the line is fixed; without one only its slope is, so the shift is left out.
  const model =
    marked !== undefined
      ? points.map((p) => modelAt(p.x))
      : points.map((p) => fit.slope * p.x + fit.intercept);
  const base = modelCheck({ points, model, modelSlope, carefulSpread: mean(spreads) })!;
  let shift: ModelCheck["shift"] = { value: 0, error: 0, errors: 0, found: false };
  if (marked !== undefined) {
    // A lens may differ from its marking by its tolerance: 1/f out by that fraction of 1/f.
    const error = combineSpreads(base.shift.error, C.tolerance.focalLength / marked);
    const errors = base.shift.value / error;
    shift = { value: base.shift.value, error, errors, found: Math.abs(errors) > 2 };
  }
  const check: ModelCheck = { ...base, shift };

  const m1 = fit.intercept;
  const m2 = fit.slope < 0 ? xIntercept(fit).value : undefined;
  const result = m2 !== undefined && m1 + m2 > 0 ? { m1, m2, f: 2 / (m1 + m2) } : undefined;

  const findings: CheckFinding[] = [];
  if (check.tilt?.found) {
    const shallower = Math.abs(check.tilt.value) < Math.abs(check.tilt.model);
    findings.push({
      part: "tilt",
      cause: `${MESSAGES}.tilt.${shallower ? "shallower" : "steeper"}`,
      precaution: `${MESSAGES}.tilt.precaution`,
      params: { slope: check.tilt.value.toFixed(2), half: cm(C.holderHalfWidth) },
    });
  }
  if (shift.found && marked !== undefined && result) {
    findings.push({
      part: "shift",
      cause: `${MESSAGES}.shift.${result.f > marked ? "longer" : "shorter"}`,
      precaution: `${MESSAGES}.shift.precaution`,
      params: { f: result.f.toFixed(1), marked: marked.toFixed(1) },
    });
  }
  if (check.spread.found) {
    findings.push({
      part: "spread",
      cause: `${MESSAGES}.spread`,
      precaution: `${MESSAGES}.spread.precaution`,
      params: { times: check.spread.ratio.toFixed(1) },
    });
  }
  return {
    table,
    points,
    model: points.map((p) => modelAt(p.x)),
    modelLine,
    check,
    findings,
    ...(result ? { result } : {}),
  };
}

/** The table's columns as the lab's table heads them: u, v₁, v₂, v, 1/u, 1/v. */
export const LENS_CHECK_COLUMNS = LENS_TEMPLATES["two-repeats"].map((c) => ({
  id: c.id,
  symbol: c.symbol,
  unit: c.unit,
}));

/**
 * The example shown before a student brings in their own readings, labelled as example data: the
 * approved lens, the screen set twice at each u somewhere in the sharp range (seed fixed), read
 * to the millimetre.
 */
export function lensExample(): LabRow[] {
  const world: LensWorld = { focalLength: L.focalLength, lens: lensOf(L.focalLength) };
  const rng = substream(11, "converging-lens.example");
  return C.objectDistances.map((u) => {
    const range = sharpScreenRange(world, u);
    const v = () => quantise(uniform(rng, range.from, range.to) * 100, METRE_RULE.resolution);
    return { u: cm(u), v1: v(), v2: v() };
  });
}
