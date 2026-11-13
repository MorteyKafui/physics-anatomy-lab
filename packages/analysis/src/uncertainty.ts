import { evaluate, type Expr } from "./expression";
import { fitLine, type Point } from "./fit";

/**
 * The advanced uncertainty layer (docs/content/uncertainty-brief.md, decisions 2, 3, 5 and 6), as
 * school error analysis teaches it: one reading's uncertainty from its instrument, worst-case
 * propagation through a worked column's formula, the steepest and least steep lines through the
 * error bars, and the checks on a result quoted with its uncertainty. Checked against an
 * independent SymPy model in validation/pa_validation/uncertainty.py.
 */

/** How an instrument shows a reading: on a scale read by eye, or on a digital display. */
export type ReadingStyle = "scale" | "digital";

/** One reading's uncertainty: ± half the least count on a scale, ± the last digit on a display. */
export function readingUncertainty(leastCount: number, style: ReadingStyle): number {
  return style === "digital" ? leastCount : leastCount / 2;
}

/**
 * Repeated readings of the same thing: ± half their range, never less than one reading's own
 * uncertainty, since two repeats that agree are not more certain than the instrument.
 */
export function repeatsUncertainty(values: readonly number[], single: number): number {
  if (values.length < 2) return single;
  const range = Math.max(...values) - Math.min(...values);
  return Math.max(range / 2, single);
}

/** The derivative of a formula with respect to one symbol, as a formula. */
export function derivative(expr: Expr, by: string): Expr {
  const n = (value: number): Expr => ({ type: "number", value });
  const bin = (op: "+" | "-" | "*" | "/" | "^", left: Expr, right: Expr): Expr => ({
    type: "binary",
    op,
    left,
    right,
  });
  switch (expr.type) {
    case "number":
      return n(0);
    case "symbol":
      return n(expr.name === by ? 1 : 0);
    case "unary":
      return { type: "unary", op: "-", arg: derivative(expr.arg, by) };
    case "call": {
      const inner = derivative(expr.arg, by);
      if (expr.fn === "sqrt") return bin("/", inner, bin("*", n(2), expr));
      if (expr.fn === "ln") return bin("/", inner, expr.arg);
      return bin("/", inner, bin("*", expr.arg, n(Math.LN10)));
    }
    case "binary": {
      const { op, left: a, right: b } = expr;
      const da = derivative(a, by);
      const db = derivative(b, by);
      if (op === "+" || op === "-") return bin(op, da, db);
      if (op === "*") return bin("+", bin("*", da, b), bin("*", a, db));
      if (op === "/")
        return bin("/", bin("-", bin("*", da, b), bin("*", a, db)), bin("^", b, n(2)));
      // a^b = e^(b ln a): d = a^b (b' ln a + b a' / a). With a constant power, b' is 0 and the
      // ln a term (undefined for a ≤ 0) is left out.
      const constantPower = !mentions(b, by);
      const term = constantPower
        ? bin("/", bin("*", b, da), a)
        : bin("+", bin("*", db, { type: "call", fn: "ln", arg: a }), bin("/", bin("*", b, da), a));
      return bin("*", expr, term);
    }
  }
}

function mentions(expr: Expr, name: string): boolean {
  switch (expr.type) {
    case "number":
      return false;
    case "symbol":
      return expr.name === name;
    case "unary":
    case "call":
      return mentions(expr.arg, name);
    case "binary":
      return mentions(expr.left, name) || mentions(expr.right, name);
  }
}

/**
 * The worst-case uncertainty of a worked value: each input's uncertainty times how fast the formula
 * changes with it, all added (decision 3). To first order this is the manual's rules exactly:
 * absolute uncertainties add for sums and differences, percentages add for products and
 * quotients, a power multiplies the percentage and a reciprocal keeps it.
 */
export function worstCase(
  expr: Expr,
  values: Readonly<Record<string, number>>,
  uncertainties: Readonly<Record<string, number>>,
): number {
  let total = 0;
  for (const [name, u] of Object.entries(uncertainties)) {
    if (!u || !mentions(expr, name)) continue;
    total += Math.abs(evaluate(derivative(expr, name), values)) * u;
  }
  return total;
}

/** An uncertainty as a percentage of its value. */
export const percentUncertainty = (value: number, uncertainty: number) =>
  value === 0 ? Infinity : (Math.abs(uncertainty) / Math.abs(value)) * 100;

/**
 * An uncertainty rounded as it is quoted (decision 6): to one significant figure, or two if it
 * starts with a 1, and the decimal place the value is then given to.
 */
export function quotedUncertainty(u: number): { value: number; figures: 1 | 2; decimals: number } {
  if (!(u > 0)) return { value: 0, figures: 1, decimals: 0 };
  const exponent = Math.floor(Math.log10(u));
  const lead = Math.floor(u / 10 ** exponent + 1e-9);
  const figures: 1 | 2 = lead === 1 ? 2 : 1;
  const decimals = Math.max(0, figures - 1 - exponent);
  const scale = 10 ** (exponent - figures + 1);
  return { value: Math.round(u / scale) * scale, figures, decimals };
}

/** A point with its error bars: ± dx across, ± dy up and down. */
export interface BarPoint extends Point {
  dx: number;
  dy: number;
}

/**
 * The steepest and least steep lines that still pass through the error bars (decision 5, the
 * graphical method): through the corners of the first and last points' error boxes. Half the
 * difference of their slopes is the graphical uncertainty in the slope.
 */
export function worstLines(points: readonly BarPoint[]): {
  steepest: { slope: number; intercept: number };
  leastSteep: { slope: number; intercept: number };
  half: number;
} {
  if (points.length < 2) throw new RangeError("worstLines needs at least two points");
  const sorted = [...points].sort((p, q) => p.x - q.x);
  const a = sorted[0]!;
  const b = sorted[sorted.length - 1]!;
  const up = fitLine(points).slope >= 0 ? 1 : -1;
  const through = (p: Point, q: Point) => {
    const slope = (q.y - p.y) / (q.x - p.x);
    return { slope, intercept: p.y - slope * p.x };
  };
  // For a rising line the steepest runs from the first box's bottom right to the last box's top
  // left; a falling line is the same with up and down swapped.
  const steepest = through(
    { x: a.x + a.dx, y: a.y - up * a.dy },
    { x: b.x - b.dx, y: b.y + up * b.dy },
  );
  const leastSteep = through(
    { x: a.x - a.dx, y: a.y + up * a.dy },
    { x: b.x + b.dx, y: b.y - up * b.dy },
  );
  return { steepest, leastSteep, half: Math.abs(steepest.slope - leastSteep.slope) / 2 };
}

/** What the student quoted, checked (decision 6). */
export interface QuoteCheck {
  /** Their uncertainty within a factor of two of the one worked from the slope. */
  uncertainty: boolean;
  /** Their uncertainty to one significant figure (two if it starts with 1). */
  figures: boolean;
  /** Their value to the same decimal place as their uncertainty. */
  decimals: boolean;
  /** How many of their uncertainties the accepted value is away; within one is agreement. */
  away?: number;
  agrees?: boolean;
}

const decimalsOf = (raw: string) => {
  const m = /\.(\d*)/.exec(raw.trim());
  return m ? m[1]!.length : 0;
};
const significantOf = (raw: string) => raw.replace(/^[^1-9]*/, "").replace(/\./, "").length;

export function checkQuote(
  typed: { value: string; uncertainty: string },
  worked: number,
  accepted?: number,
): QuoteCheck {
  const value = Number(typed.value);
  const u = Number(typed.uncertainty);
  const ok = Number.isFinite(u) && u > 0;
  const lead = typed.uncertainty.replace(/^[^1-9]*/, "")[0];
  const out: QuoteCheck = {
    uncertainty: ok && worked > 0 && u <= 2 * worked && u >= worked / 2,
    figures: ok && significantOf(typed.uncertainty) === (lead === "1" ? 2 : 1),
    decimals: ok && decimalsOf(typed.value) === decimalsOf(typed.uncertainty),
  };
  if (accepted !== undefined && ok && Number.isFinite(value)) {
    out.away = Math.abs(value - accepted) / u;
    out.agrees = out.away <= 1;
  }
  return out;
}
