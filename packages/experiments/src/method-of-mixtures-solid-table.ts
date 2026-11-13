import {
  evaluate,
  parseFormula,
  parseUnit,
  readingUncertainty,
  worstCase,
  type DesignColumn,
  type Finding,
  type Point,
  type Quantity,
  type Rule,
} from "@pa/analysis";

import { BALANCE } from "@pa/instruments";

import { MIXTURES_THERMOMETER } from "./method-of-mixtures";
import { cFromReadings, hotSolid, type SolidReading } from "./method-of-mixtures-solid";
import { typedAnswerFindings } from "./ohms-law-table";
import { typedQuantity, type TypedAnswer } from "./pendulum-analysis";

/**
 * The results table, the graph and the analysis for the method of mixtures with a hot solid
 * (Experiment 64, steps 6 to 8; decision 9): the minute readings tabulated, the temperature
 * plotted against time to find the highest, T, and the solid's specific heat capacity from the
 * book's equation, m_s c_s (T_s − T) = (m_c c_c + m_w c_w)(T − T₀). The graph is a curve: it is
 * read for its highest point, not a slope.
 */

const timeColumn: DesignColumn = {
  id: "t",
  symbol: "t",
  kind: "time",
  unit: "min",
  role: "given",
};
const temperatureColumn: DesignColumn = {
  id: "theta",
  symbol: "θ",
  kind: "temperature",
  unit: "°C",
  role: "measured",
  leastCount: { value: MIXTURES_THERMOMETER.resolution, unit: MIXTURES_THERMOMETER.unit },
};

/** The one template: the time since the solid went in, and the temperature read then. */
export const SOLID_TEMPLATES = {
  single: [timeColumn, temperatureColumn],
} as const satisfies Record<string, readonly DesignColumn[]>;
export const SOLID_STANDARD_TABLE: readonly DesignColumn[] = SOLID_TEMPLATES.single;

/** Temperatures are read on the thermometer. */
export const SOLID_INSTRUMENTS: Partial<
  Record<DesignColumn["kind"], NonNullable<DesignColumn["leastCount"]>>
> = {
  temperature: { value: MIXTURES_THERMOMETER.resolution, unit: MIXTURES_THERMOMETER.unit },
};

/** What the graph plots: θ against t. */
export const SOLID_PLOT = { x: "t", y: "theta" } as const;

/** The run tabulated: the last one recorded, whose minute readings the student has. */
export const tabulatedRun = (readings: readonly SolidReading[]) => readings.at(-1);

/**
 * The run's readings laid into the table, one row for each, the start first. Offered at the Auto
 * help level only, as for the other labs.
 */
export function solidReadingsIntoTable(
  design: { columns: readonly DesignColumn[]; rows: readonly { id: string }[] },
  run: SolidReading | undefined,
  newRowId: () => string,
): { row: string; column: string; value: string }[] {
  const time = design.columns.find((c) => c.kind === "time");
  const temperature = design.columns.find((c) => c.kind === "temperature");
  if (!run || !time || !temperature) return [];
  const shown = (s: number) => (time.unit === "s" ? s.toFixed(0) : (s / 60).toFixed(1));
  return run.series.flatMap((p, i) => {
    const row = design.rows[i]?.id ?? newRowId();
    return [
      { row, column: time.id, value: shown(p.t) },
      { row, column: temperature.id, value: p.reading.toFixed(1) },
    ];
  });
}

// The graph (step 7).

/** Is the graph the one the question asks for, θ against t? */
export const plotsThetaAgainstT = (columns: { x: string; y: string }) =>
  columns.x === SOLID_PLOT.x && columns.y === SOLID_PLOT.y;

export interface SolidGraphContext {
  columns: { x: string; y: string };
  symbols: { x: string; y: string };
}

/** Plotting anything but θ against t: only that graph shows where the temperature is highest. */
export const wrongSolidGraph: Rule<SolidGraphContext> = {
  id: "solid-wrong-graph",
  skill: "graph",
  check: ({ columns, symbols }): Finding[] =>
    plotsThetaAgainstT(columns)
      ? []
      : [
          {
            rule: "solid-wrong-graph",
            severity: "error",
            skill: "graph",
            key: "findings.mixturesSolid.wrongGraph",
            params: { x: symbols.x, y: symbols.y },
          },
        ],
};

export const SOLID_GRAPH_RULES: Rule<SolidGraphContext>[] = [wrongSolidGraph];

// The analysis (step 8).

export const SOLID_ANSWERS = ["T", "c"] as const;
export type SolidAnswer = (typeof SOLID_ANSWERS)[number];

const CELSIUS = parseUnit("°C")!;
const SPECIFIC = parseUnit("J kg⁻¹ K⁻¹")!;

/**
 * What each answer should be, worked from what the student plotted and recorded: T, the highest
 * point on their graph of θ against t; and c from the book's equation with the run's own masses
 * and starting temperature, and the T they wrote (where it can be read), so a slip in T is not
 * marked again in c.
 */
export function solidExpected(
  plotted: readonly Point[],
  columns: { x: string; y: string },
  run: SolidReading | undefined,
  answers: Partial<Record<SolidAnswer, TypedAnswer>>,
): Partial<Record<SolidAnswer, Quantity>> {
  const out: Partial<Record<SolidAnswer, Quantity>> = {};
  if (!plotsThetaAgainstT(columns) || plotted.length === 0) return out;
  const highest = Math.max(...plotted.map((p) => p.y));
  out.T = { value: highest * CELSIUS.value, dims: CELSIUS.dims };
  if (!run) return out;
  const T = (typedQuantity(answers.T, out.T) ?? out.T).value / CELSIUS.value;
  if (!(T > run.start && T < hotSolid.boiling)) return out;
  out.c = { value: cFromReadings({ ...run, highest: T }) * SPECIFIC.value, dims: SPECIFIC.dims };
  return out;
}

export interface SolidAnalysisContext {
  answers: Partial<Record<SolidAnswer, TypedAnswer>>;
  expected: Partial<Record<SolidAnswer, Quantity>>;
}

/** Each typed answer, checked for value, unit and significant figures. */
export const solidAnswerRules: Rule<SolidAnalysisContext> = {
  id: "analysis-answers",
  skill: "analysis",
  check: ({ answers, expected }) => typedAnswerFindings(SOLID_ANSWERS, answers, expected),
};

export const SOLID_ANALYSIS_RULES: Rule<SolidAnalysisContext>[] = [solidAnswerRules];

/** The metal the solid is, by its specific heat capacity: for naming it once c is found. */
export const metalOf = (c: number) => hotSolid.metals.find((m) => m.c === c);

/**
 * c with its uncertainty (the uncertainty layer, docs/content/uncertainty-brief.md, decision 3):
 * the book's equation, m_s c (T_s − T) = (m_c c_c + m_w c_w)(T − T₀), worked through by worst-case
 * propagation from each reading's own uncertainty: the three masses on the balance to its last
 * digit, the starting and highest temperatures to half the thermometer's least count. The boiling
 * water's temperature and the given c's are the question's, with none.
 */
export function cWithUncertainty(
  run: Pick<SolidReading, "solid" | "empty" | "filled" | "start">,
  highest: number,
): { value: number; uncertainty: number } {
  const parsed = parseFormula("(e*k + (f - e)*w)*(h - a)/(s*(b - h))", [
    "s",
    "e",
    "f",
    "a",
    "h",
    "b",
    "k",
    "w",
  ]);
  if (!parsed.ok) throw new Error("the book's equation must parse");
  const values = {
    s: run.solid,
    e: run.empty,
    f: run.filled,
    a: run.start,
    h: highest,
    b: hotSolid.boiling,
    k: hotSolid.given.calorimeter,
    w: hotSolid.given.water,
  };
  const balance = readingUncertainty(BALANCE.resolution, BALANCE.digital ? "digital" : "scale");
  const thermometer = readingUncertainty(MIXTURES_THERMOMETER.resolution, "scale");
  return {
    value: evaluate(parsed.expr, values),
    uncertainty: worstCase(parsed.expr, values, {
      s: balance,
      e: balance,
      f: balance,
      a: thermometer,
      h: thermometer,
    }),
  };
}
