import {
  combineSpreads,
  fitLine,
  leastCountSpread,
  MODEL_CHECK_FACTOR,
  mean,
  modelCheck,
  type ModelCheck,
} from "@pa/analysis";
import { METRE_RULE, quantise, substream, uniform } from "@pa/instruments";
import { lensForFocalLength } from "@pa/physics";

import { convergingLens, type LensWorld } from "./converging-lens";
import { lensPins, lineUpAt, noParallaxStretch } from "./converging-lens-pins";
import { PINS_TEMPLATES } from "./converging-lens-pins-table";
import type { CheckFinding, DataTemplate, LabCheck, LabRow, TemplateColumn } from "./lab-data";

/**
 * The lens with two pins' model check (data templates brief, decision 4): xy against (x + y). From
 * 1/x + 1/y = 1/f, xy = f (x + y): a line through the origin whose slope is f. The model's line is
 * the exact lens's, found where the tips line up with the eye on the axis, as the lab finds it.
 * Without a marked f only the origin can be checked; with one, the slope too.
 */

const P = lensPins;
const L = convergingLens.lens;

/** What is read in the lab: x, and y twice; never xy or x + y. */
const columns: TemplateColumn[] = PINS_TEMPLATES["two-repeats"]
  .filter((c) => c.role === "given" || c.role === "repeat" || c.role === "measured")
  .map((c) => ({
    id: c.id,
    symbol: c.symbol,
    kind: c.kind,
    unit: c.unit,
    role: c.role === "given" ? "setting" : "reading",
  }));
const images = columns.filter((c) => c.role === "reading").map((c) => c.id);

const cm = (m: number) => Math.round(m * 1000) / 10;

export const PINS_DATA_TEMPLATE: DataTemplate = {
  experiment: P.id,
  version: 1,
  // The words are the web app's (messages "experiments.converging-lens-pins.check.*").
  title: "experiments.converging-lens-pins.title",
  note: "experiments.converging-lens-pins.check.note",
  values: [
    {
      id: "f",
      label: "experiments.converging-lens-pins.check.marked",
      kind: "length",
      unit: "cm",
      optional: true,
    },
  ],
  columns,
  settings: P.objectDistances.map((x) => [cm(x)]),
};

const worldOf = (fCm: number): LensWorld => {
  const f = fCm / 100;
  return { focalLength: f, lens: lensForFocalLength(f, L.index, L.aperture, L.edge) };
};

/**
 * The model's line of xy against (x + y), cm² against cm, for a lens of focal length f, cm: the
 * straight line through the exact lens's points at the book's object distances. Its slope is f to
 * within the lens's aberration and it passes within a hair of the origin.
 */
const lines = new Map<number, { slope: number; intercept: number }>();

export function pinsModelLine(f: number = cm(L.focalLength)) {
  const known = lines.get(f);
  if (known) return known;
  const world = worldOf(f);
  const points = P.objectDistances.map((x) => {
    const y = lineUpAt(world, x, 0);
    return { x: cm(x) + y * 100, y: cm(x) * y * 100 };
  });
  const line = fitLine(points);
  const out = { slope: line.slope, intercept: line.intercept };
  lines.set(f, out);
  return out;
}

/**
 * A careful student's spread in xy about the line, cm², at x and y, cm: the search pin anywhere in
 * the stretch with no parallax (uniform, half-width over √3), both read on the rule, over √repeats;
 * x read on the rule at two holders. An error dy moves a point off the line of slope f by (x − f) dy,
 * and dx by (y − f) dx.
 */
export function pinsCarefulSpread(
  x: number,
  y: number,
  repeats: number,
  f: number = cm(L.focalLength),
) {
  const stretch = stretchOf(f, x);
  const rule = Math.SQRT2 * leastCountSpread(METRE_RULE.resolution);
  const judged = ((stretch.to - stretch.from) * 100) / 2 / Math.sqrt(3);
  const dy = combineSpreads(judged, rule) / Math.sqrt(Math.max(1, repeats));
  return combineSpreads(Math.abs(x - f) * dy, Math.abs(y - f) * rule);
}

/** The stretch with no parallax for a lens of f at x, both cm: found once, as it is slow to find. */
const stretches = new Map<string, { from: number; to: number }>();
function stretchOf(f: number, x: number) {
  const key = `${f}:${x}`;
  let s = stretches.get(key);
  if (!s) {
    s = noParallaxStretch(worldOf(f), x / 100);
    stretches.set(key, s);
  }
  return s;
}

const MESSAGES = "experiments.converging-lens-pins.check";

export interface PinsResult {
  /** f from the slope, cm, and where the line meets the xy axis, cm². */
  f: number;
  intercept: number;
}

/** The model check of a student's two-pins readings, rows and values in the template's units. */
export function pinsCheck(
  rows: readonly LabRow[],
  values: Readonly<Record<string, number | undefined>> = {},
): LabCheck & { result?: PinsResult } {
  const table: (number | undefined)[][] = [];
  const points: { x: number; y: number }[] = [];
  const spreads: number[] = [];
  const marked = values.f;
  const f = marked ?? cm(L.focalLength);
  for (const row of rows) {
    const x = row.x;
    const ys = images.map((id) => row[id]).filter((v): v is number => v !== undefined);
    const y = ys.length ? mean(ys) : undefined;
    const ok = x !== undefined && x > 0 && y !== undefined && y > 0;
    table.push([
      x,
      ...images.map((id) => row[id]),
      y,
      ok ? x * y : undefined,
      ok ? x + y : undefined,
    ]);
    if (ok) {
      points.push({ x: x + y, y: x * y });
      spreads.push(pinsCarefulSpread(x, y, ys.length, f));
    }
  }
  if (points.length < 3 || new Set(points.map((p) => p.x)).size < 2) {
    return { table, points, model: [], modelLine: [], check: undefined, findings: [] };
  }

  const line = pinsModelLine(f);
  const modelAt = (X: number) => line.slope * X + line.intercept;
  const xs = points.map((p) => p.x);
  const modelLine = [0, Math.max(...xs)].map((x) => ({ x, y: modelAt(x) }));
  const fit = fitLine(points);

  // The points spread more at some x than others. What a careful student's residual spread about a
  // fitted line comes to is each point's variance weighted by 1 − hᵢ, its leverage taken off, over
  // n − 2: the expectation of the sum of squared residuals for unequal spreads.
  const n = points.length;
  const sxx = points.reduce((a, p) => a + (p.x - fit.centroid.x) ** 2, 0);
  const careful = Math.sqrt(
    points.reduce(
      (a, p, i) => a + (1 - 1 / n - (p.x - fit.centroid.x) ** 2 / sxx) * spreads[i]! ** 2,
      0,
    ) /
      (n - 2),
  );
  const own = points.map((p) => fit.slope * p.x + fit.intercept);
  const base = modelCheck({ points, model: own, carefulSpread: careful })!;
  // The errors use the larger of the points' own spread and a careful student's, as modelCheck's do.
  const scale = Math.max(1, careful / Math.max(fit.residualSd, Number.MIN_VALUE));

  // Shifted: the line should meet the xy axis where the model's does, a hair from the origin.
  const shiftError = fit.interceptError * scale;
  const shiftValue = fit.intercept - line.intercept;
  const shiftErrors = shiftError > 0 ? shiftValue / shiftError : 0;
  const shift = {
    value: shiftValue,
    error: shiftError,
    errors: shiftErrors,
    found: Math.abs(shiftErrors) > MODEL_CHECK_FACTOR,
  };
  // Tilted, with a marking only: the slope is f, against the marked lens's, with the lens's tolerance.
  let tilt: ModelCheck["tilt"];
  if (marked !== undefined) {
    const error = combineSpreads(
      fit.slopeError * scale,
      convergingLens.tolerance.focalLength * marked,
    );
    const errors = (fit.slope - line.slope) / error;
    tilt = {
      value: fit.slope,
      model: line.slope,
      error,
      errors,
      found: Math.abs(errors) > MODEL_CHECK_FACTOR,
    };
  }
  const check: ModelCheck = { ...base, fit, shift, ...(tilt ? { tilt } : {}) };

  const findings: CheckFinding[] = [];
  if (check.shift.found) {
    findings.push({
      part: "shift",
      cause: `${MESSAGES}.shift`,
      precaution: `${MESSAGES}.shift.precaution`,
      params: { intercept: fit.intercept.toFixed(0) },
    });
  }
  if (check.tilt?.found && marked !== undefined) {
    findings.push({
      part: "tilt",
      cause: `${MESSAGES}.tilt.${fit.slope > line.slope ? "longer" : "shorter"}`,
      precaution: `${MESSAGES}.tilt.precaution`,
      params: { f: fit.slope.toFixed(1), marked: marked.toFixed(1) },
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
    result: { f: fit.slope, intercept: fit.intercept },
  };
}

/** The table's columns as the lab's table heads them: x, y₁, y₂, y, xy, (x + y). */
export const PINS_CHECK_COLUMNS = PINS_TEMPLATES["two-repeats"].map((c) => ({
  id: c.id,
  symbol: c.symbol,
  unit: c.unit,
}));

/**
 * The example shown before a student brings in their own readings, labelled as example data: the
 * approved lens, the search pin set twice in the stretch with no parallax at each x (seed fixed),
 * read to the millimetre.
 */
export function pinsExample(): LabRow[] {
  const world = worldOf(cm(L.focalLength));
  const rng = substream(11, "converging-lens-pins.example");
  return P.objectDistances.map((x) => {
    const s = noParallaxStretch(world, x);
    const y = () => quantise(uniform(rng, s.from, s.to) * 100, METRE_RULE.resolution);
    return { x: cm(x), y1: y(), y2: y() };
  });
}
