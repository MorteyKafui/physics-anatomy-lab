import {
  addRepeat,
  type DesignColumn,
  type Finding,
  type Quantity,
  type Rule,
  type SlopeTriangle,
  type TableDesign,
} from "@pa/analysis";
import { METRE_RULE } from "@pa/instruments";

import { lensPins, type PinsReading } from "./converging-lens-pins";
import { typedAnswerFindings } from "./ohms-law-table";
import { slopeOf, typedQuantity, type TypedAnswer } from "./pendulum-analysis";

/**
 * The results table, the graph and the analysis for the converging lens with two pins (Experiment
 * 96, steps 6 to 8), as the question sets them: x and y, xy and (x + y), a graph of xy against
 * (x + y), and its slope. From 1/x + 1/y = 1/f, xy = f (x + y): a straight line through the origin
 * whose slope is f.
 */

const xColumn: DesignColumn = {
  id: "x",
  symbol: "x",
  kind: "length",
  unit: "cm",
  role: "given",
  leastCount: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};
const yColumn: DesignColumn = {
  id: "y",
  symbol: "y",
  kind: "length",
  unit: "cm",
  role: "measured",
  leastCount: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};
const productColumn: DesignColumn = {
  id: "xy",
  symbol: "xy",
  kind: "area",
  unit: "cm²",
  role: "derived",
  formula: "x * y",
};
const sumColumn: DesignColumn = {
  id: "xPlusY",
  symbol: "x + y",
  kind: "length",
  unit: "cm",
  role: "derived",
  formula: "x + y",
};

const withRepeats = (n: 1 | 2): DesignColumn[] => {
  let design: TableDesign = { columns: [xColumn, yColumn, productColumn, sumColumn], rows: [] };
  if (n === 2) design = addRepeat(design, "y");
  return design.columns;
};

/** Templates: one y at each x, or two (the search pin brought in from each side) and their mean. */
export const PINS_TEMPLATES = {
  single: withRepeats(1),
  "two-repeats": withRepeats(2),
} as const;
export type PinsTemplate = keyof typeof PINS_TEMPLATES;

/** The standard table, as the question asks: x, y, xy and (x + y). */
export const PINS_STANDARD_TABLE: readonly DesignColumn[] = PINS_TEMPLATES.single;

/** Lengths on this bench are read on its metre rule. */
export const PINS_INSTRUMENTS: Partial<
  Record<DesignColumn["kind"], NonNullable<DesignColumn["leastCount"]>>
> = {
  length: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};

/** What the graph plots: xy against (x + y). */
export const PINS_PLOT = { x: "xPlusY", y: "xy" } as const;

/** One row for each object distance the question sets. */
export const PINS_ROWS = lensPins.objectDistances.length;

/**
 * The readings laid into the table, one row per object distance in the order measured, repeats
 * of y in the repeat columns. Offered at the Auto help level only, as for the other labs.
 */
export function pinsReadingsIntoTable(
  design: TableDesign,
  readings: readonly PinsReading[],
  newRowId: () => string,
): { row: string; column: string; value: string }[] {
  const x = design.columns.find((c) => c.kind === "length" && c.role === "given");
  const yCols = design.columns.filter(
    (c) => c.kind === "length" && (c.role === "repeat" || c.role === "measured"),
  );
  if (!x || !yCols.length) return [];
  // Readings are in cm, as read off the rule.
  const shown = (cm: number, unit: string) =>
    unit === "m" ? (cm / 100).toFixed(3) : unit === "mm" ? (cm * 10).toFixed(0) : cm.toFixed(1);
  const byX = new Map<number, PinsReading[]>();
  for (const r of readings) byX.set(r.x, [...(byX.get(r.x) ?? []), r]);
  const out: { row: string; column: string; value: string }[] = [];
  let i = 0;
  for (const [at, rs] of byX) {
    const row = design.rows[i]?.id ?? newRowId();
    i += 1;
    out.push({ row, column: x.id, value: shown(at, x.unit) });
    rs.slice(0, yCols.length).forEach((r, k) => {
      const col = yCols[k]!;
      out.push({ row, column: col.id, value: shown(r.y, col.unit) });
    });
  }
  return out;
}

// The graph (step 7).

/** Is the graph the one the question asks for, xy against (x + y)? */
export const plotsXyAgainstXPlusY = (columns: { x: string; y: string }) =>
  columns.x === PINS_PLOT.x && columns.y === PINS_PLOT.y;

export interface PinsGraphContext {
  /** The columns plotted, by id, and their symbols as headed. */
  columns: { x: string; y: string };
  symbols: { x: string; y: string };
}

/**
 * The fifth approved mistake (decision 11): plotting anything but xy against (x + y), such as y
 * against x or 1/y against 1/x. Only that graph is a straight line whose slope is f.
 */
export const wrongPinsGraph: Rule<PinsGraphContext> = {
  id: "pins-wrong-graph",
  skill: "graph",
  check: ({ columns, symbols }): Finding[] =>
    plotsXyAgainstXPlusY(columns)
      ? []
      : [
          {
            rule: "pins-wrong-graph",
            severity: "error",
            skill: "graph",
            key: "findings.pins.wrongGraph",
            params: { x: symbols.x, y: symbols.y },
          },
        ],
};

export const PINS_GRAPH_RULES: Rule<PinsGraphContext>[] = [wrongPinsGraph];

// The analysis (step 8).

export const PINS_ANSWERS = ["slope", "f"] as const;
export type PinsAnswer = (typeof PINS_ANSWERS)[number];

/**
 * What each answer should be, worked from what the student drew: the slope from their triangle,
 * in the axes' units (cm² over cm is cm), and f, which is the slope, from the slope they wrote
 * (where it can be read), so a slip in the slope is not marked again in f.
 */
export function pinsExpected(
  triangle: SlopeTriangle | undefined,
  columns: { x: string; y: string },
  units: { x: string; y: string },
  answers: Partial<Record<PinsAnswer, TypedAnswer>>,
): Partial<Record<PinsAnswer, Quantity>> {
  const out: Partial<Record<PinsAnswer, Quantity>> = {};
  const s = triangle && slopeOf(triangle, units);
  if (!s) return out;
  out.slope = s.slope;
  if (plotsXyAgainstXPlusY(columns)) out.f = typedQuantity(answers.slope, s.slope) ?? s.slope;
  return out;
}

export interface PinsAnalysisContext {
  answers: Partial<Record<PinsAnswer, TypedAnswer>>;
  expected: Partial<Record<PinsAnswer, Quantity>>;
}

/** Each typed answer, checked for value, unit and significant figures. */
export const pinsAnswerRules: Rule<PinsAnalysisContext> = {
  id: "analysis-answers",
  skill: "analysis",
  check: ({ answers, expected }) => typedAnswerFindings(PINS_ANSWERS, answers, expected),
};

export const PINS_ANALYSIS_RULES: Rule<PinsAnalysisContext>[] = [pinsAnswerRules];
