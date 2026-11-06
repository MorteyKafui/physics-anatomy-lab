import type { Finding, Rule } from "./findings";
import {
  axisEnd,
  DIVISIONS,
  lineSlope,
  mmBetween,
  mmFromLine,
  ON_POINT_MM,
  onLineAt,
  onPaper,
  referenceLine,
  type DrawnLine,
  type PlottedPoint,
  type Sheet,
  type SlopeTriangle,
} from "./graph";

/**
 * Checks on the student's graph, from the WASSCE marking guide and the mistake catalogue: a scale
 * that uses at least half of each axis, every point on the sheet and plotted where it belongs, a
 * best-fit line through the mean point with the points balanced about it, and a large slope
 * triangle with its corners on the line and off the plotted points.
 */

export interface GraphContext {
  sheet: Sheet;
  /** The headings' symbols, for the coach's words ("T²"). */
  symbols: { x: string; y: string };
  /** Where each table row's point belongs, in the columns' units. */
  data: PlottedPoint[];
  /** What the student plotted. */
  plotted: PlottedPoint[];
  line?: DrawnLine | undefined;
  triangle?: SlopeTriangle | undefined;
}

export type GraphRule = Rule<GraphContext>;

const finding = (f: Omit<Finding, "skill">): Finding => ({ skill: "graph", ...f });

/** A point plotted further than this (mm, half a small square) from its place is misplotted. */
export const PLOT_TOLERANCE_MM = 1;

export const scaleTooSmall: GraphRule = {
  id: "graph-scale-small",
  skill: "graph",
  check: ({ sheet, symbols, data }) => {
    if (data.length < 2) return [];
    return (["x", "y"] as const).flatMap((axis) => {
      const values = data.map((p) => p[axis]);
      const used =
        (Math.max(...values) - Math.min(...values)) / (DIVISIONS[axis] * sheet[axis].per2cm);
      // Exactly half is enough; the tolerance keeps 0.85 − 0.80 from falling just short.
      return used < 0.5 - 1e-9
        ? [
            finding({
              rule: "graph-scale-small",
              severity: "warning",
              key: "graph.scaleSmall",
              params: { symbol: symbols[axis], percent: Math.round(used * 100) },
              column: sheet[axis].column,
            }),
          ]
        : [];
    });
  },
};

export const offTheSheet: GraphRule = {
  id: "graph-off-sheet",
  skill: "graph",
  check: ({ sheet, symbols, data }) =>
    (["x", "y"] as const).flatMap((axis) => {
      const end = axisEnd(sheet[axis], DIVISIONS[axis]);
      const off = data.filter((p) => p[axis] < sheet[axis].start - 1e-12 || p[axis] > end + 1e-12);
      return off.length
        ? [
            finding({
              rule: "graph-off-sheet",
              severity: "error",
              key: "graph.offSheet",
              params: { symbol: symbols[axis], count: off.length },
              rows: off.map((p) => p.row),
            }),
          ]
        : [];
    }),
};

export const pointsMissing: GraphRule = {
  id: "graph-points-missing",
  skill: "graph",
  check: ({ data, plotted }) => {
    const missing = data.filter((d) => !plotted.some((p) => p.row === d.row));
    return missing.length && plotted.length
      ? [
          finding({
            rule: "graph-points-missing",
            severity: "warning",
            key: "graph.pointsMissing",
            params: { plotted: data.length - missing.length, total: data.length },
            rows: missing.map((p) => p.row),
          }),
        ]
      : [];
  },
};

export const misplotted: GraphRule = {
  id: "graph-misplotted",
  skill: "graph",
  check: ({ sheet, data, plotted }) => {
    const wrong = plotted.filter((p) => {
      const d = data.find((x) => x.row === p.row);
      return d !== undefined && mmBetween(sheet, p, d) > PLOT_TOLERANCE_MM;
    });
    return wrong.length
      ? [
          finding({
            rule: "graph-misplotted",
            severity: "error",
            key: "graph.misplotted",
            params: { count: wrong.length },
            rows: wrong.map((p) => p.row),
          }),
        ]
      : [];
  },
};

/** The guide's rule: a best-fit line passes through the mean point, the points balanced about it. */
export const lineMissesMean: GraphRule = {
  id: "graph-line-mean",
  skill: "graph",
  check: ({ sheet, data, line }) => {
    const ref = referenceLine(data);
    if (!line || !ref) return [];
    const mm = mmFromLine(sheet, ref.fit.centroid, line);
    return mm > 2
      ? [
          finding({
            rule: "graph-line-mean",
            severity: "warning",
            key: "graph.lineMean",
            params: { mm: Math.round(mm) },
          }),
        ]
      : [];
  },
};

export const lineUnbalanced: GraphRule = {
  id: "graph-line-unbalanced",
  skill: "graph",
  check: ({ sheet, data, line }) => {
    if (!line || data.length < 4) return [];
    let above = 0;
    let below = 0;
    for (const p of data) {
      if (mmFromLine(sheet, p, line) < 0.5) continue;
      if (onPaper(sheet, p).y > onPaper(sheet, onLineAt(line, p.x)).y) above += 1;
      else below += 1;
    }
    return Math.abs(above - below) > Math.max(1, Math.floor(data.length / 4))
      ? [
          finding({
            rule: "graph-line-unbalanced",
            severity: "warning",
            key: "graph.lineUnbalanced",
            params: { above, below },
          }),
        ]
      : [];
  },
};

/** Against the least-squares slope: a hand-drawn line within 5% is a good line. */
export const lineSlopeOff: GraphRule = {
  id: "graph-line-slope",
  skill: "graph",
  check: ({ data, line }) => {
    const ref = referenceLine(data);
    if (!line || !ref || ref.fit.slope === 0 || line.to.x === line.from.x) return [];
    const percent = Math.abs(lineSlope(line) / ref.fit.slope - 1) * 100;
    return percent > 5
      ? [
          finding({
            rule: "graph-line-slope",
            severity: "warning",
            key: "graph.lineSlope",
            params: { percent: Math.round(percent) },
          }),
        ]
      : [];
  },
};

export const triangleOffLine: GraphRule = {
  id: "graph-triangle-off-line",
  skill: "graph",
  check: ({ sheet, line, triangle }) => {
    if (!line || !triangle) return [];
    const off = [triangle.a, triangle.b].some((p) => mmFromLine(sheet, p, line) > 1);
    return off
      ? [
          finding({
            rule: "graph-triangle-off-line",
            severity: "error",
            key: "graph.triangleOffLine",
          }),
        ]
      : [];
  },
};

/** "Large": the triangle spans at least half the plotted range of x. */
export const triangleSmall: GraphRule = {
  id: "graph-triangle-small",
  skill: "graph",
  check: ({ data, triangle }) => {
    if (!triangle || data.length < 2) return [];
    const xs = data.map((p) => p.x);
    const spread = Math.max(...xs) - Math.min(...xs);
    const width = Math.abs(triangle.b.x - triangle.a.x);
    return spread > 0 && width < 0.5 * spread
      ? [
          finding({
            rule: "graph-triangle-small",
            severity: "warning",
            key: "graph.triangleSmall",
            params: { percent: Math.round((width / spread) * 100) },
          }),
        ]
      : [];
  },
};

export const triangleOnPoint: GraphRule = {
  id: "graph-triangle-on-point",
  skill: "graph",
  check: ({ sheet, data, triangle }) => {
    if (!triangle) return [];
    const near = data.filter((p) =>
      [triangle.a, triangle.b].some((corner) => mmBetween(sheet, corner, p) < ON_POINT_MM),
    );
    return near.length
      ? [
          finding({
            rule: "graph-triangle-on-point",
            severity: "warning",
            key: "graph.triangleOnPoint",
            rows: near.map((p) => p.row),
          }),
        ]
      : [];
  },
};

export const GRAPH_RULES: GraphRule[] = [
  offTheSheet,
  scaleTooSmall,
  pointsMissing,
  misplotted,
  lineMissesMean,
  lineUnbalanced,
  lineSlopeOff,
  triangleOffLine,
  triangleSmall,
  triangleOnPoint,
];
