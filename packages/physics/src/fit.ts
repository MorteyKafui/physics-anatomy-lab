export interface LineFit {
  readonly slope: number;
  readonly intercept: number;
  /** Coefficient of determination, 1 for a perfect line. */
  readonly r2: number;
}

/** Ordinary least-squares straight line through (x, y) points. Needs at least two distinct x values. */
export function fitLine(points: ReadonlyArray<readonly [number, number]>): LineFit {
  const n = points.length;
  if (n < 2) throw new RangeError("fitLine needs at least two points");
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const [x, y] of points) {
    sxx += (x - mx) * (x - mx);
    sxy += (x - mx) * (y - my);
    syy += (y - my) * (y - my);
  }
  if (sxx === 0) throw new RangeError("fitLine needs at least two distinct x values");
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}
