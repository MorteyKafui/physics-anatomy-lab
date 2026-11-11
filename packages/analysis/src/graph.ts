import { fitLine, type LineFit, type Point } from "./fit";

/**
 * The graph sheet (master plan, "Graph sheet"): WAEC 2 mm graph paper at its real size, 20 cm
 * across and 24 cm up, so 2 cm squares give 10 divisions on x and 12 on y. Scales are only the
 * ones the guide accepts: 2 cm stands for 1, 2 or 5 times a power of ten. Values here are in the
 * columns' own units (l in m, T² in s²), as the student reads them off the sheet; positions on
 * the paper are in millimetres from the bottom-left corner.
 */

export const SHEET = { widthMm: 200, heightMm: 240, squareMm: 2, divisionMm: 20 } as const;
export const DIVISIONS = {
  x: SHEET.widthMm / SHEET.divisionMm,
  y: SHEET.heightMm / SHEET.divisionMm,
};

export interface Axis {
  /** The table column plotted along this axis. */
  column: string;
  /** The value at the corner of the sheet. */
  start: number;
  /** The value 2 cm stands for: 1, 2 or 5 times a power of ten. */
  per2cm: number;
}

export interface Sheet {
  x: Axis;
  y: Axis;
}

/** A point the student plotted for a table row, read in the columns' units. */
export interface PlottedPoint extends Point {
  row: string;
}

/** The student's best-fit line, through two points they chose. */
export interface DrawnLine {
  from: Point;
  to: Point;
}

/** The slope triangle: A and B on the line, C at the right angle (B's x, A's y). */
export interface SlopeTriangle {
  a: Point;
  b: Point;
}

/** Is a scale one the guide accepts? 1, 2 or 5 times a power of ten (to rounding). */
export function acceptedScale(per2cm: number): boolean {
  if (!(per2cm > 0) || !Number.isFinite(per2cm)) return false;
  const power = 10 ** Math.floor(Math.log10(per2cm) + 1e-9);
  const mantissa = per2cm / power;
  return [1, 2, 5].some((m) => Math.abs(mantissa - m) < 1e-6);
}

/** Accepted scales around a value, smallest first: …, 0.1, 0.2, 0.5, 1, 2, 5, … */
export function scalesAround(value: number, count = 9): number[] {
  const base = Math.floor(Math.log10(Math.abs(value) || 1)) - 2;
  const out: number[] = [];
  for (let k = base; out.length < count; k += 1)
    for (const m of [1, 2, 5])
      if (out.length < count) out.push(Number((m * 10 ** k).toPrecision(6)));
  return out;
}

/** The largest multiple of `step` at or below `value`, to rounding. */
const floorTo = (value: number, step: number) =>
  Number((Math.floor(value / step + 1e-9) * step).toPrecision(12));

/**
 * The scale a careful student would choose: the smallest accepted one that fits every value on
 * the axis, starting at a whole number of divisions below the smallest value. It uses at least
 * half the axis whenever any accepted scale can.
 */
export function suggestAxis(column: string, values: readonly number[], divisions: number): Axis {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.abs(max) || 1;
  for (const per2cm of scalesAround(range / divisions, 12)) {
    const start = floorTo(min, per2cm);
    if (start + divisions * per2cm >= max - 1e-12) return { column, start, per2cm };
  }
  const per2cm = scalesAround(range, 3).at(-1)!;
  return { column, start: floorTo(min, per2cm), per2cm };
}

/** A value's distance along an axis, in mm from the corner. */
export const toMm = (axis: Axis, value: number) =>
  ((value - axis.start) / axis.per2cm) * SHEET.divisionMm;
/** The value at a distance along an axis. */
export const fromMm = (axis: Axis, mm: number) =>
  axis.start + (mm / SHEET.divisionMm) * axis.per2cm;

/** A point's position on the paper, mm from the bottom-left corner. */
export const onPaper = (sheet: Sheet, p: Point): Point => ({
  x: toMm(sheet.x, p.x),
  y: toMm(sheet.y, p.y),
});

/**
 * The same straight line carried on to the x axis (y = 0), as a student extends a line on paper to
 * read where it meets the axis (Ohm's law: E, where I = 0). The end nearer the axis moves there;
 * the slope does not change. A line that never meets the axis is returned as it is.
 */
export function lineToXAxis(line: DrawnLine): DrawnLine {
  const { from, to } = line;
  const dy = to.y - from.y;
  if (dy === 0) return line;
  const end = { x: from.x - (from.y * (to.x - from.x)) / dy, y: 0 };
  return Math.abs(from.y) < Math.abs(to.y) ? { from: end, to } : { from, to: end };
}

/** The value at the end of each axis. */
export const axisEnd = (axis: Axis, divisions: number) => axis.start + divisions * axis.per2cm;

/** A position snapped to the nearest half of a small square, the precision of a sharp pencil. */
export const snapMm = (mm: number) => Math.round(mm / (SHEET.squareMm / 2)) * (SHEET.squareMm / 2);

/** Distance on the paper (mm) from a point to the line through two points. */
export function mmFromLine(sheet: Sheet, p: Point, line: DrawnLine): number {
  const a = onPaper(sheet, line.from);
  const b = onPaper(sheet, line.to);
  const q = onPaper(sheet, p);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len === 0) return Math.hypot(q.x - a.x, q.y - a.y);
  return Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / len;
}

export const lineSlope = (line: DrawnLine) => (line.to.y - line.from.y) / (line.to.x - line.from.x);

/** The point on a line at a given x. */
export const onLineAt = (line: DrawnLine, x: number): Point => ({
  x,
  y: line.from.y + lineSlope(line) * (x - line.from.x),
});

/** The least-squares line across the plotted range, as the marker's reference. */
export function referenceLine(
  points: readonly Point[],
): { fit: LineFit; line: DrawnLine } | undefined {
  if (points.length < 2 || new Set(points.map((p) => p.x)).size < 2) return undefined;
  const fit = fitLine(points);
  const xs = points.map((p) => p.x);
  const at = (x: number) => ({ x, y: fit.slope * x + fit.intercept });
  return { fit, line: { from: at(Math.min(...xs)), to: at(Math.max(...xs)) } };
}

/** Closer than this to a plotted point (mm), a triangle's corner is "on" it. */
export const ON_POINT_MM = 2;

/**
 * A large slope triangle on a line, as the guide draws one: its corners near the ends of the
 * plotted range, at whole small squares on x, and clear of the plotted points.
 */
export function suggestTriangle(
  sheet: Sheet,
  line: DrawnLine,
  points: readonly Point[],
): SlopeTriangle {
  const xs = points.map((p) => p.x);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const square = (sheet.x.per2cm * SHEET.squareMm) / SHEET.divisionMm;
  const clear = (x: number) =>
    points.every((p) => mmBetween(sheet, onLineAt(line, x), p) >= ON_POINT_MM);
  const pick = (target: number, direction: 1 | -1) => {
    let x = Math.round(target / square) * square;
    for (let i = 0; i < 20 && !clear(x); i += 1) x += direction * square;
    return Number(x.toPrecision(12));
  };
  const spread = hi - lo;
  return {
    a: onLineAt(line, pick(lo + 0.1 * spread, 1)),
    b: onLineAt(line, pick(hi - 0.1 * spread, -1)),
  };
}

/** Distance on the paper (mm) between two points. */
export function mmBetween(sheet: Sheet, p: Point, q: Point): number {
  const a = onPaper(sheet, p);
  const b = onPaper(sheet, q);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Decimal places a value read off an axis carries: to a small square, a tenth of the 2 cm
 * scale (0.2 s² per 2 cm reads to 0.02 s², so two places).
 */
export const readingDecimals = (axis: Axis) =>
  Math.max(0, -Math.floor(Math.log10(axis.per2cm / 10) + 1e-9));
