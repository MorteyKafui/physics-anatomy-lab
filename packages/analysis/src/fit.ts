/**
 * Straight-line fits. These run beside the student's own hand-drawn line: they are the marker's
 * reference, never shown before the student has drawn theirs. Merged from Physics Bench's
 * regression and the earlier fitLine in packages/physics, so there is one fit, not two.
 *
 * Cross-checked against SciPy's linregress and NumPy's least squares in validation/.
 */

export interface Point {
  x: number;
  y: number;
}

export interface LineFit {
  slope: number;
  intercept: number;
  /** Standard error of the slope (0 with only two points). */
  slopeError: number;
  /** Standard error of the intercept (0 with only two points). */
  interceptError: number;
  /** Coefficient of determination, 1 for points exactly on a line. */
  r2: number;
  /** Residual standard deviation: the scatter about the line, in y units. */
  residualSd: number;
  n: number;
  /** The mean point, which every least-squares line passes through. */
  centroid: Point;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError("mean needs at least one value");
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function assertFinite(points: readonly Point[]) {
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      throw new RangeError(`fit needs finite points, got (${p.x}, ${p.y})`);
    }
  }
}

/** Ordinary least-squares line y = slope·x + intercept, with standard errors. */
export function fitLine(points: readonly Point[]): LineFit {
  const n = points.length;
  if (n < 2) throw new RangeError("fitLine needs at least two points");
  assertFinite(points);

  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  if (sxx === 0) throw new RangeError("fitLine needs at least two distinct x values");

  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const sse = points.reduce((acc, p) => acc + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const residualSd = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;
  const slopeError = n > 2 ? residualSd / Math.sqrt(sxx) : 0;
  const interceptError = n > 2 ? residualSd * Math.sqrt(1 / n + mx ** 2 / sxx) : 0;
  // r² cannot leave [0, 1], but with values near the limits of floating point (1e-162 squared
  // underflows) the ratio can round past 1; keep it where the mathematics puts it.
  const r2 = syy === 0 ? 1 : Math.min(1, Math.max(0, (sxy * sxy) / (sxx * syy)));

  return {
    slope,
    intercept,
    slopeError,
    interceptError,
    r2,
    residualSd,
    n,
    centroid: { x: mx, y: my },
  };
}

/** A line forced through the origin (y = kx), for relations the theory says are proportional. */
export function fitThroughOrigin(points: readonly Point[]): { slope: number; slopeError: number } {
  if (points.length < 1) throw new RangeError("fitThroughOrigin needs at least one point");
  assertFinite(points);
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
  if (sxx === 0) throw new RangeError("fitThroughOrigin needs a non-zero x");
  const slope = sxy / sxx;
  const n = points.length;
  const sse = points.reduce((a, p) => a + (p.y - slope * p.x) ** 2, 0);
  const slopeError = n > 1 ? Math.sqrt(sse / (n - 1) / sxx) : 0;
  return { slope, slopeError };
}

/**
 * Residuals divided by the residual standard deviation. A large one marks a reading worth
 * repeating, but note the limit: the reading counts in its own spread, so with n readings no
 * value can exceed √(n − 2), which is 2.45 for 8 readings. A fixed cut-off such as 2.5 never fires
 * on a short school table, so the table check needs a rule that suits 5 to 8 readings.
 */
export function residuals(points: readonly Point[], fit: LineFit): number[] {
  return points.map((p) => {
    const r = p.y - (fit.slope * p.x + fit.intercept);
    return fit.residualSd > 0 ? r / fit.residualSd : 0;
  });
}

/** (measured − accepted) / accepted, as a percentage. */
export function percentDifference(measured: number, accepted: number): number {
  if (accepted === 0) throw new RangeError("percentDifference needs a non-zero accepted value");
  return ((measured - accepted) / accepted) * 100;
}

/**
 * Where a fitted line meets the x axis (y = 0), x₀ = −intercept ⁄ slope, with its standard error
 * from the slope's and intercept's errors and their covariance (−x̄ times the slope's variance):
 * σ² = (σₐ² + x₀² σ_b² + 2 x₀ cov(a, b)) ⁄ b². For Ohm's law, the cell's emf E where I against V
 * meets the V axis. Checked against NumPy's covariance in validation (model-check.json).
 */
export function xIntercept(fit: LineFit): { value: number; error: number } {
  if (fit.slope === 0) throw new RangeError("A flat line never meets the x axis");
  const value = -fit.intercept / fit.slope;
  const cov = -fit.centroid.x * fit.slopeError ** 2;
  const variance =
    (fit.interceptError ** 2 + value ** 2 * fit.slopeError ** 2 + 2 * value * cov) / fit.slope ** 2;
  return { value, error: Math.sqrt(Math.max(0, variance)) };
}
