import {
  addRepeat,
  checkAnswer,
  parseUnit,
  type DesignColumn,
  type DrawnLine,
  type Finding,
  type Quantity,
  type Rule,
  type SlopeTriangle,
  type TableDesign,
} from "@pa/analysis";
import type { Json } from "@pa/engine";
import { METRE_RULE } from "@pa/instruments";

import { ohmsLaw } from "./ohms-law";
import { slopeOf, typedQuantity, type TypedAnswer } from "./pendulum-analysis";

/**
 * Readings, the results table, the graph and the analysis for Ohm's law and the potentiometer
 * (steps 5 to 8), as the brief sets them: PJ, I and V, a graph of I against V, its slope, and the
 * value of V where I = 0. From I = (E − V) ⁄ r the slope is −1 ⁄ r and the intercept is E.
 */

/** A reading as Measure records it: what the two meters showed, at a jockey position. */
export interface OhmsLawReading {
  id: string;
  /** PJ, m; 0 for the reading with the jockey not touching, which cuts no wire out. */
  pj: number;
  /** I, A, and V, V, as recorded to each meter's least count. */
  current: number;
  voltage: number;
}

export function asOhmsLawReading(r: { id: string; data: Json }): OhmsLawReading | undefined {
  const d = (r.data ?? {}) as Record<string, Json>;
  if (typeof d.pj !== "number" || typeof d.current !== "number" || typeof d.voltage !== "number")
    return undefined;
  return { id: r.id, pj: d.pj, current: d.current, voltage: d.voltage };
}

/** The reading data to record, from the jockey's position and the two meters' recorded values. */
export const readingData = (pj: number | undefined, current: number, voltage: number) => ({
  pj: pj ?? 0,
  current,
  voltage,
});

const pjColumn: DesignColumn = {
  id: "PJ",
  symbol: "PJ",
  kind: "length",
  unit: "cm",
  role: "given",
  leastCount: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
};
const currentColumn: DesignColumn = {
  id: "I",
  symbol: "I",
  kind: "current",
  unit: "A",
  role: "measured",
  leastCount: { value: ohmsLaw.ammeter.resolution, unit: ohmsLaw.ammeter.unit },
};
const voltageColumn: DesignColumn = {
  id: "V",
  symbol: "V",
  kind: "voltage",
  unit: "V",
  role: "measured",
  leastCount: { value: ohmsLaw.voltmeter.resolution, unit: ohmsLaw.voltmeter.unit },
};

const withRepeats = (n: 1 | 2): DesignColumn[] => {
  let design: TableDesign = { columns: [pjColumn, currentColumn, voltageColumn], rows: [] };
  if (n === 2) design = addRepeat(addRepeat(design, "I"), "V");
  return design.columns;
};

/**
 * Templates: one reading at each position, or two (the book takes them with PJ increasing and
 * then decreasing) and their means.
 */
export const OHMS_LAW_TEMPLATES = {
  single: withRepeats(1),
  "two-repeats": withRepeats(2),
} as const;
export type OhmsLawTemplate = keyof typeof OHMS_LAW_TEMPLATES;

/** The standard table: PJ, then I and V, each read twice, and their means. */
export const OHMS_LAW_STANDARD_TABLE: readonly DesignColumn[] = OHMS_LAW_TEMPLATES["two-repeats"];

/** The instrument each kind of quantity is read with on this bench. */
export const OHMS_LAW_INSTRUMENTS: Partial<
  Record<DesignColumn["kind"], NonNullable<DesignColumn["leastCount"]>>
> = {
  length: { value: METRE_RULE.resolution, unit: METRE_RULE.unit },
  current: { value: ohmsLaw.ammeter.resolution, unit: ohmsLaw.ammeter.unit },
  voltage: { value: ohmsLaw.voltmeter.resolution, unit: ohmsLaw.voltmeter.unit },
};

/** What the graph plots: I against V. */
export const OHMS_LAW_PLOT = { x: "V", y: "I" } as const;

/** Six rows: no contact, then PJ = 40, 50, 60, 70 and 80 cm. */
export const OHMS_LAW_ROWS = 1 + ohmsLaw.jockeyPositions.length;

/**
 * The readings laid into the table, one row per jockey position in the order measured, repeats
 * in the repeat columns. Offered at the Auto help level only, as for the pendulum.
 */
export function ohmsLawReadingsIntoTable(
  design: TableDesign,
  readings: readonly OhmsLawReading[],
  newRowId: () => string,
): { row: string; column: string; value: string }[] {
  const pj = design.columns.find((c) => c.kind === "length" && c.role === "given");
  const cols = (kind: "current" | "voltage") =>
    design.columns.filter((c) => c.kind === kind && (c.role === "repeat" || c.role === "measured"));
  const iCols = cols("current");
  const vCols = cols("voltage");
  if (!pj || !iCols.length || !vCols.length) return [];
  const toUnit = pj.unit === "m" ? 1 : pj.unit === "mm" ? 1000 : 100;
  const places = pj.unit === "m" ? 3 : pj.unit === "mm" ? 0 : 1;
  const byPosition = new Map<number, OhmsLawReading[]>();
  for (const r of readings) byPosition.set(r.pj, [...(byPosition.get(r.pj) ?? []), r]);
  const out: { row: string; column: string; value: string }[] = [];
  let i = 0;
  for (const [position, rs] of byPosition) {
    const row = design.rows[i]?.id ?? newRowId();
    i += 1;
    out.push({ row, column: pj.id, value: (position * toUnit).toFixed(places) });
    rs.slice(0, Math.min(iCols.length, vCols.length)).forEach((r, k) => {
      out.push({ row, column: iCols[k]!.id, value: r.current.toFixed(2) });
      out.push({ row, column: vCols[k]!.id, value: r.voltage.toFixed(2) });
    });
  }
  return out;
}

// The analysis (step 8).

export const OHMS_LAW_ANSWERS = ["slope", "E", "r"] as const;
export type OhmsLawAnswer = (typeof OHMS_LAW_ANSWERS)[number];

/** Volts and ohms as dimension vectors, the same way the slope's units are worked out. */
const VOLT = parseUnit("V")!.dims;
const OHM = parseUnit("Ω")!.dims;

/** Where a line meets the V axis (I = 0): the cell's emf, from the student's own line. */
export function vInterceptOf(line: DrawnLine): number | undefined {
  const dy = line.to.y - line.from.y;
  if (dy === 0) return undefined;
  return line.from.x - (line.from.y * (line.to.x - line.from.x)) / dy;
}

/** r from a slope of I against V: −1 ⁄ slope, in Ω. */
export const rFromSlope = (slope: Quantity): Quantity => ({ value: -1 / slope.value, dims: OHM });

/** Is the graph the one the question asks for, I against V? */
export const plotsIAgainstV = (columns: { x: string; y: string }) =>
  columns.x === OHMS_LAW_PLOT.x && columns.y === OHMS_LAW_PLOT.y;

/**
 * What each answer should be, worked from what the student drew: the slope from their triangle,
 * E where their line meets the V axis (in the V column's unit), and r from the slope they wrote
 * (if it can be read), so a slip in the slope is not marked again in r.
 */
export function ohmsLawExpected(
  triangle: SlopeTriangle | undefined,
  line: DrawnLine | undefined,
  columns: { x: string; y: string },
  units: { x: string; y: string },
  answers: Partial<Record<OhmsLawAnswer, TypedAnswer>>,
): Partial<Record<OhmsLawAnswer, Quantity>> {
  const out: Partial<Record<OhmsLawAnswer, Quantity>> = {};
  const s = triangle && slopeOf(triangle, units);
  if (s) out.slope = s.slope;
  if (!plotsIAgainstV(columns)) return out;
  const x = line && vInterceptOf(line);
  const ux = parseUnit(units.x);
  if (x !== undefined && ux) out.E = { value: x * ux.value, dims: VOLT };
  if (s) out.r = rFromSlope(typedQuantity(answers.slope, s.slope) ?? s.slope);
  return out;
}

export interface OhmsLawAnalysisContext {
  answers: Partial<Record<OhmsLawAnswer, TypedAnswer>>;
  expected: Partial<Record<OhmsLawAnswer, Quantity>>;
}

/**
 * Each typed answer, checked for value, unit and significant figures, as for the pendulum. Shared
 * by the experiments whose analysis is a few typed answers (Ohm's law, the converging lens).
 */
export function typedAnswerFindings<Id extends string>(
  ids: readonly Id[],
  answers: Partial<Record<Id, TypedAnswer>>,
  expected: Partial<Record<Id, Quantity>>,
): Finding[] {
  return ids.flatMap((id): Finding[] => {
    const typed = answers[id];
    const want = expected[id];
    if (!typed || !want || (typed.value.trim() === "" && typed.unit.trim() === "")) return [];
    const c = checkAnswer(typed, want);
    const base = { skill: "analysis" as const, column: id, params: { name: id } };
    const out: Finding[] = [];
    if (c.value === "unreadable")
      out.push({
        ...base,
        rule: "analysis-unreadable",
        severity: "error",
        key: "analysis.unreadable",
        params: { ...base.params, typed: typed.value },
      });
    else if (c.value === "wrong")
      out.push({
        ...base,
        rule: "analysis-value",
        severity: "error",
        key: "analysis.valueWrong",
        params: { ...base.params, typed: typed.value },
      });
    if (c.unit === "missing")
      out.push({
        ...base,
        rule: "analysis-unit",
        severity: "error",
        key: "analysis.unitMissing",
      });
    else if (c.unit === "wrong" || c.unit === "unreadable")
      out.push({
        ...base,
        rule: "analysis-unit",
        severity: "error",
        key: "analysis.unitWrong",
        params: { ...base.params, typed: typed.unit },
      });
    if (c.sigFigs === "too-few" || c.sigFigs === "too-many")
      out.push({
        ...base,
        rule: "analysis-sig-figs",
        severity: "warning",
        key: "analysis.sigFigs",
        params: { ...base.params, written: c.written ?? 0 },
      });
    return out;
  });
}

/** Each typed answer, checked for value, unit and significant figures, as for the pendulum. */
export const ohmsLawAnswerRules: Rule<OhmsLawAnalysisContext> = {
  id: "analysis-answers",
  skill: "analysis",
  check: ({ answers, expected }) => typedAnswerFindings(OHMS_LAW_ANSWERS, answers, expected),
};

export const OHMS_LAW_ANALYSIS_RULES: Rule<OhmsLawAnalysisContext>[] = [ohmsLawAnswerRules];
