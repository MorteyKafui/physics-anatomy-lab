import {
  addRepeat,
  parseUnit,
  type DesignColumn,
  type DrawnLine,
  type Finding,
  type Quantity,
  type Rule,
  type TableDesign,
} from "@pa/analysis";
import { METRE_RULE } from "@pa/instruments";

import type { LensReading } from "./converging-lens";
import { convergingLens } from "./converging-lens";
import { typedAnswerFindings } from "./ohms-law-table";
import { typedQuantity, type TypedAnswer } from "./pendulum-analysis";

/**
 * The results table, the graph and the analysis for the converging lens (steps 6 to 8), as the
 * question sets them: u and v, 1/u and 1/v, a graph of 1/v against 1/u, its vertical and
 * horizontal intercepts m₁ and m₂, and f = 2 ⁄ (m₁ + m₂). From 1/u + 1/v = 1/f the line has slope
 * −1 and meets both axes at 1/f, so the two intercepts are two readings of 1/f and f is the
 * reciprocal of their mean.
 */

const uColumn: DesignColumn = {
  id: "u",
  symbol: "u",
  kind: "length",
  unit: "cm",
  role: "given",
  leastCount: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};
const vColumn: DesignColumn = {
  id: "v",
  symbol: "v",
  kind: "length",
  unit: "cm",
  role: "measured",
  leastCount: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};
const inverseU: DesignColumn = {
  id: "invU",
  symbol: "u⁻¹",
  kind: "inverse-length",
  unit: "cm⁻¹",
  role: "derived",
  formula: "1 / u",
};
const inverseV: DesignColumn = {
  id: "invV",
  symbol: "v⁻¹",
  kind: "inverse-length",
  unit: "cm⁻¹",
  role: "derived",
  formula: "1 / v",
};

const withRepeats = (n: 1 | 2): DesignColumn[] => {
  let design: TableDesign = { columns: [uColumn, vColumn, inverseU, inverseV], rows: [] };
  if (n === 2) design = addRepeat(design, "v");
  return design.columns;
};

/**
 * Templates: one v at each u, or two (the screen brought in to the sharp image from each side)
 * and their mean.
 */
export const LENS_TEMPLATES = {
  single: withRepeats(1),
  "two-repeats": withRepeats(2),
} as const;
export type LensTemplate = keyof typeof LENS_TEMPLATES;

/** The standard table, as the question asks: u, v, 1/u and 1/v. */
export const LENS_STANDARD_TABLE: readonly DesignColumn[] = LENS_TEMPLATES.single;

/** Lengths on this bench are read on its metre rule. */
export const LENS_INSTRUMENTS: Partial<
  Record<DesignColumn["kind"], NonNullable<DesignColumn["leastCount"]>>
> = {
  length: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};

/** What the graph plots: 1/v against 1/u. */
export const LENS_PLOT = { x: "invU", y: "invV" } as const;

/** One row for each object distance the question sets. */
export const LENS_ROWS = convergingLens.objectDistances.length;

/**
 * The readings laid into the table, one row per object distance in the order measured, repeats
 * of v in the repeat columns. Offered at the Auto help level only, as for the other labs.
 */
export function lensReadingsIntoTable(
  design: TableDesign,
  readings: readonly LensReading[],
  newRowId: () => string,
): { row: string; column: string; value: string }[] {
  const u = design.columns.find((c) => c.kind === "length" && c.role === "given");
  const vCols = design.columns.filter(
    (c) => c.kind === "length" && (c.role === "repeat" || c.role === "measured"),
  );
  if (!u || !vCols.length) return [];
  // Readings are in cm, as read off the rule.
  const shown = (cm: number, unit: string) =>
    unit === "m" ? (cm / 100).toFixed(3) : unit === "mm" ? (cm * 10).toFixed(0) : cm.toFixed(1);
  const byU = new Map<number, LensReading[]>();
  for (const r of readings) byU.set(r.u, [...(byU.get(r.u) ?? []), r]);
  const out: { row: string; column: string; value: string }[] = [];
  let i = 0;
  for (const [at, rs] of byU) {
    const row = design.rows[i]?.id ?? newRowId();
    i += 1;
    out.push({ row, column: u.id, value: shown(at, u.unit) });
    rs.slice(0, vCols.length).forEach((r, k) => {
      const col = vCols[k]!;
      out.push({ row, column: col.id, value: shown(r.v, col.unit) });
    });
  }
  return out;
}

// The graph (step 7).

/** Is the graph the one the question asks for, 1/v against 1/u? */
export const plotsInverseVAgainstInverseU = (columns: { x: string; y: string }) =>
  columns.x === LENS_PLOT.x && columns.y === LENS_PLOT.y;

export interface LensGraphContext {
  /** The columns plotted, by id, and their symbols as headed. */
  columns: { x: string; y: string };
  symbols: { x: string; y: string };
}

/**
 * From the mistake catalogue: plotting v against u (or any other pair) instead of 1/v against
 * 1/u. Only that graph is a straight line meeting both axes at 1/f.
 */
export const wrongLensGraph: Rule<LensGraphContext> = {
  id: "lens-wrong-graph",
  skill: "graph",
  check: ({ columns, symbols }): Finding[] =>
    plotsInverseVAgainstInverseU(columns)
      ? []
      : [
          {
            rule: "lens-wrong-graph",
            severity: "error",
            skill: "graph",
            key: "findings.lens.wrongGraph",
            params: { x: symbols.x, y: symbols.y },
          },
        ],
};

export const LENS_GRAPH_RULES: Rule<LensGraphContext>[] = [wrongLensGraph];

/** Where a line meets the y axis (x = 0). */
export function yInterceptOf(line: DrawnLine): number | undefined {
  const dx = line.to.x - line.from.x;
  if (dx === 0) return undefined;
  return line.from.y - (line.from.x * (line.to.y - line.from.y)) / dx;
}

/** Where a line meets the x axis (y = 0). */
export function xInterceptOf(line: DrawnLine): number | undefined {
  const dy = line.to.y - line.from.y;
  if (dy === 0) return undefined;
  return line.from.x - (line.from.y * (line.to.x - line.from.x)) / dy;
}

// The analysis (step 8).

export const LENS_ANSWERS = ["m1", "m2", "f"] as const;
export type LensAnswer = (typeof LENS_ANSWERS)[number];

const PER_METRE = parseUnit("m⁻¹")!.dims;
const METRE = parseUnit("m")!.dims;

/** f = 2 ⁄ (m₁ + m₂): the reciprocal of the two intercepts' mean. */
export function focalLengthFrom(m1: Quantity, m2: Quantity): Quantity | undefined {
  const sum = m1.value + m2.value;
  return sum > 0 ? { value: 2 / sum, dims: METRE } : undefined;
}

/**
 * What each answer should be, worked from what the student drew: m₁ where their line meets the
 * 1/v axis and m₂ where it meets the 1/u axis (in the axes' unit), and f from the intercepts they
 * wrote (where they can be read), so a slip in an intercept is not marked again in f.
 */
export function lensExpected(
  line: DrawnLine | undefined,
  columns: { x: string; y: string },
  units: { x: string; y: string },
  answers: Partial<Record<LensAnswer, TypedAnswer>>,
): Partial<Record<LensAnswer, Quantity>> {
  const out: Partial<Record<LensAnswer, Quantity>> = {};
  if (!line || !plotsInverseVAgainstInverseU(columns)) return out;
  const ux = parseUnit(units.x);
  const uy = parseUnit(units.y);
  const y0 = yInterceptOf(line);
  const x0 = xInterceptOf(line);
  if (y0 !== undefined && uy) out.m1 = { value: y0 * uy.value, dims: PER_METRE };
  if (x0 !== undefined && ux) out.m2 = { value: x0 * ux.value, dims: PER_METRE };
  if (out.m1 && out.m2) {
    const m1 = typedQuantity(answers.m1, out.m1) ?? out.m1;
    const m2 = typedQuantity(answers.m2, out.m2) ?? out.m2;
    const f = focalLengthFrom(m1, m2);
    if (f) out.f = f;
  }
  return out;
}

export interface LensAnalysisContext {
  answers: Partial<Record<LensAnswer, TypedAnswer>>;
  expected: Partial<Record<LensAnswer, Quantity>>;
}

/** Each typed answer, checked for value, unit and significant figures. */
export const lensAnswerRules: Rule<LensAnalysisContext> = {
  id: "analysis-answers",
  skill: "analysis",
  check: ({ answers, expected }) => typedAnswerFindings(LENS_ANSWERS, answers, expected),
};

export const LENS_ANALYSIS_RULES: Rule<LensAnalysisContext>[] = [lensAnswerRules];
