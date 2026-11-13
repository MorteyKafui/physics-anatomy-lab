import { fitLine, mean, type LineFit, type Point } from "./fit";

/**
 * The model check's verdict (data templates brief, decision 5 as amended on 2026-11-13): a
 * student's own lab readings set against the model's line, in three separate parts, each found
 * or not, so a run can have any of them or none.
 *
 * - Shifted: the mean of the points' differences from the model's line is more than
 *   MODEL_CHECK_FACTOR standard errors from zero.
 * - Tilted: the fitted slope is more than MODEL_CHECK_FACTOR standard errors from the model's.
 *   Only where the model has a slope (Ohm's law on a real bench has none) and the graph is a line.
 * - Scattered: the points spread about their own line (or, for a curve, about the model's curve
 *   moved by the shift) more than MODEL_CHECK_FACTOR times what a careful student's readings
 *   give.
 *
 * A careful student's spread is also the smallest the errors are allowed to be: a run whose points
 * happen to lie closer than care allows does not get a hair trigger for a shift or a tilt.
 * Checked against the independent model in validation/pa_validation/model_check.py.
 */

/** How many standard errors (or times the careful spread) before a part is found. */
export const MODEL_CHECK_FACTOR = 2;

/** The fewest points the verdict is given for: two points always lie on their own line. */
export const MODEL_CHECK_MIN_POINTS = 3;

export interface ModelCheckInput {
  /** The plotted points, in the graph's own quantities. */
  points: readonly Point[];
  /** The model's y at each point's x, in the same order and units. */
  model: readonly number[];
  /** The model line's slope, for the tilt part; left out where the model has none. */
  modelSlope?: number;
  /** The graph is a curve: no fitted line, no tilt, the scatter is about the model's curve. */
  curve?: boolean;
  /** The spread in y a careful student's readings give, 1σ, in y's units. */
  carefulSpread: number;
}

export interface ModelCheck {
  n: number;
  /** The straight line through the points; absent for a curve. */
  fit?: LineFit;
  shift: { value: number; error: number; errors: number; found: boolean };
  tilt?: { value: number; model: number; error: number; errors: number; found: boolean };
  spread: { value: number; careful: number; ratio: number; found: boolean };
}

/** A least count's own spread, 1σ: a reading rounded to it is out by up to half either way. */
export function leastCountSpread(leastCount: number): number {
  return leastCount / Math.sqrt(12);
}

/** Independent spreads combined: the square root of the sum of their squares. */
export function combineSpreads(...spreads: readonly number[]): number {
  return Math.hypot(...spreads);
}

export function modelCheck(input: ModelCheckInput): ModelCheck | undefined {
  const { points, model, carefulSpread } = input;
  const n = points.length;
  if (n < MODEL_CHECK_MIN_POINTS || model.length !== n) return undefined;
  if (!(carefulSpread > 0)) throw new RangeError("A careful spread must be above zero.");

  const differences = points.map((p, i) => p.y - model[i]!);
  const shiftValue = mean(differences);

  let spreadValue: number;
  let fit: LineFit | undefined;
  if (input.curve) {
    const ss = differences.reduce((s, d) => s + (d - shiftValue) ** 2, 0);
    spreadValue = Math.sqrt(ss / (n - 1));
  } else {
    fit = fitLine(points);
    spreadValue = fit.residualSd;
  }

  // The errors use the larger of the points' own spread and a careful student's.
  const sd = Math.max(spreadValue, carefulSpread);
  const shiftError = sd / Math.sqrt(n);
  const shiftErrors = shiftValue / shiftError;

  let tilt: ModelCheck["tilt"];
  if (fit && input.modelSlope !== undefined) {
    const sxx = points.reduce((s, p) => s + (p.x - fit.centroid.x) ** 2, 0);
    const error = sd / Math.sqrt(sxx);
    const errors = (fit.slope - input.modelSlope) / error;
    tilt = {
      value: fit.slope,
      model: input.modelSlope,
      error,
      errors,
      found: Math.abs(errors) > MODEL_CHECK_FACTOR,
    };
  }

  const ratio = spreadValue / carefulSpread;
  return {
    n,
    ...(fit ? { fit } : {}),
    shift: {
      value: shiftValue,
      error: shiftError,
      errors: shiftErrors,
      found: Math.abs(shiftErrors) > MODEL_CHECK_FACTOR,
    },
    ...(tilt ? { tilt } : {}),
    spread: {
      value: spreadValue,
      careful: carefulSpread,
      ratio,
      found: ratio > MODEL_CHECK_FACTOR,
    },
  };
}
