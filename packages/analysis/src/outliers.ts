import { fitLine, type Point } from "./fit";
import { studentTQuantile } from "./student-t";

/**
 * Finding a reading worth repeating on a short table.
 *
 * The standardised residual (fit.ts) cannot exceed √(n − 2), because a wild reading counts in its
 * own spread; with the 5 to 8 readings of a school table a fixed cut-off never fires. This uses
 * the externally studentised (deleted) residual instead: each reading is compared with the line
 * fitted to the other readings, so it cannot hide in its own spread. With one rogue reading
 * removed, the rest follow Student's t with n − 3 degrees of freedom.
 *
 * Testing every reading at once would flag something in a clean table too often, so the cut-off
 * is the Bonferroni one: a reading is flagged only if its |t| beats the two-sided 5% critical value
 * shared across all n readings. Cross-checked against NumPy refits and scipy.stats.t in
 * validation/.
 */

export interface DeletedResidual {
  /** Index in the points given. */
  index: number;
  /** The externally studentised residual. */
  t: number;
}

/** Each point's deleted residual. Needs at least 4 points and 3 distinct x values without each. */
export function deletedResiduals(points: readonly Point[]): DeletedResidual[] {
  const n = points.length;
  if (n < 4) throw new RangeError("deleted residuals need at least four points");
  return points.map((p, index) => {
    const others = points.filter((_, j) => j !== index);
    const fit = fitLine(others);
    const xs = others.map((o) => o.x);
    const mx = fit.centroid.x;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const predicted = fit.slope * p.x + fit.intercept;
    // Spread of a new reading at x about the line fitted without it.
    const se = fit.residualSd * Math.sqrt(1 + 1 / (n - 1) + (p.x - mx) ** 2 / sxx);
    const t = se > 0 ? (p.y - predicted) / se : 0;
    return { index, t };
  });
}

/** The Bonferroni critical |t| for n readings at overall significance `alpha` (two-sided). */
export function outlierCriticalValue(n: number, alpha = 0.05): number {
  if (!Number.isInteger(n) || n < 5)
    throw new RangeError("the outlier test needs at least five readings");
  return studentTQuantile(1 - alpha / (2 * n), n - 3);
}

/**
 * The reading most out of line, if it is out of line enough to be worth repeating; otherwise
 * undefined. Needs at least five readings (with four, one point decides the line alone).
 */
export function findOutlier(
  points: readonly Point[],
  alpha = 0.05,
): (DeletedResidual & { critical: number }) | undefined {
  if (points.length < 5) return undefined;
  const critical = outlierCriticalValue(points.length, alpha);
  const worst = deletedResiduals(points).reduce((a, b) => (Math.abs(b.t) > Math.abs(a.t) ? b : a));
  return Math.abs(worst.t) > critical ? { ...worst, critical } : undefined;
}
