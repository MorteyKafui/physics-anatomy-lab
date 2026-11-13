import {
  parseUnit,
  type DesignColumn,
  type DrawnLine,
  type Finding,
  type Quantity,
  type Rule,
  type SlopeTriangle,
} from "@pa/analysis";
import { MEASURING_CYLINDER } from "@pa/instruments";

import { yInterceptOf } from "./converging-lens-table";
import { methodOfMixtures, MIXTURES_THERMOMETER, type MixturesReading } from "./method-of-mixtures";
import { typedAnswerFindings } from "./ohms-law-table";
import { slopeOf, typedQuantity, type TypedAnswer } from "./pendulum-analysis";

/**
 * The results table, the graph and the analysis for the method of mixtures (Experiment 62, steps
 * 6 to 8), as the question sets them: V, T and 1/T, a graph of V against 1/T, its slope, and V
 * where 1/T = 0. From 50 (65 − θ₀ − T) = (V + W) T, V = 50 (65 − θ₀) ⁄ T − (50 + W): a straight
 * line meeting the V axis at −(50 + W), which gives the calorimeter's water equivalent W.
 */

const CYLINDER = { value: MEASURING_CYLINDER.resolution, unit: MEASURING_CYLINDER.unit };
const THERMOMETER = { value: MIXTURES_THERMOMETER.resolution, unit: MIXTURES_THERMOMETER.unit };

const vColumn: DesignColumn = {
  id: "V",
  symbol: "V",
  kind: "volume",
  unit: "cm³",
  role: "given",
  leastCount: CYLINDER,
};
const riseColumn: DesignColumn = {
  id: "T",
  symbol: "T",
  kind: "temperature-difference",
  unit: "°C",
  role: "measured",
  leastCount: THERMOMETER,
};
const inverseColumn: DesignColumn = {
  id: "invT",
  symbol: "1/T",
  kind: "inverse-temperature-difference",
  unit: "°C⁻¹",
  role: "derived",
  formula: "1 / T",
};
const startColumn: DesignColumn = {
  id: "theta1",
  symbol: "θ₁",
  kind: "temperature",
  unit: "°C",
  role: "measured",
  leastCount: THERMOMETER,
};
const highestColumn: DesignColumn = {
  id: "theta2",
  symbol: "θ₂",
  kind: "temperature",
  unit: "°C",
  role: "measured",
  leastCount: THERMOMETER,
};

/**
 * Templates: V, T and 1/T as the question tabulates them, or with the starting and highest
 * temperatures θ₁ and θ₂ written down too, and T worked out from them.
 */
export const MIXTURES_TEMPLATES = {
  single: [vColumn, riseColumn, inverseColumn],
  temperatures: [
    vColumn,
    startColumn,
    highestColumn,
    { ...riseColumn, role: "derived", formula: "θ₂ − θ₁" } satisfies DesignColumn,
    inverseColumn,
  ],
} as const satisfies Record<string, readonly DesignColumn[]>;
export type MixturesTemplate = keyof typeof MIXTURES_TEMPLATES;

/** The standard table, as the question asks: V, T and 1/T. */
export const MIXTURES_STANDARD_TABLE: readonly DesignColumn[] = MIXTURES_TEMPLATES.single;

/** Volumes are read on the measuring cylinder, temperatures on the thermometer. */
export const MIXTURES_INSTRUMENTS: Partial<
  Record<DesignColumn["kind"], NonNullable<DesignColumn["leastCount"]>>
> = {
  volume: CYLINDER,
  temperature: THERMOMETER,
  "temperature-difference": THERMOMETER,
};

/** What the graph plots: V against 1/T. */
export const MIXTURES_PLOT = { x: "invT", y: "V" } as const;

/** One row for each volume the question sets. */
export const MIXTURES_ROWS = methodOfMixtures.volumes.length;

/**
 * The readings laid into the table, one row per volume in the order measured (the last reading
 * at a volume, if it was taken more than once). Offered at the Auto help level only, as for the
 * other labs.
 */
export function mixturesReadingsIntoTable(
  design: { columns: readonly DesignColumn[]; rows: readonly { id: string }[] },
  readings: readonly MixturesReading[],
  newRowId: () => string,
): { row: string; column: string; value: string }[] {
  const col = (role: DesignColumn["role"], kind: DesignColumn["kind"]) =>
    design.columns.find((c) => c.role === role && c.kind === kind);
  const v = col("given", "volume");
  const rise = col("measured", "temperature-difference");
  const temps = design.columns.filter((c) => c.role === "measured" && c.kind === "temperature");
  if (!v || (!rise && temps.length < 2)) return [];
  const byV = new Map<number, MixturesReading>();
  for (const r of readings) byV.set(r.volume, r);
  const out: { row: string; column: string; value: string }[] = [];
  let i = 0;
  for (const [volume, r] of byV) {
    const row = design.rows[i]?.id ?? newRowId();
    i += 1;
    out.push({ row, column: v.id, value: String(volume) });
    if (rise) out.push({ row, column: rise.id, value: (r.highest - r.start).toFixed(1) });
    else {
      out.push({ row, column: temps[0]!.id, value: r.start.toFixed(1) });
      out.push({ row, column: temps[1]!.id, value: r.highest.toFixed(1) });
    }
  }
  return out;
}

// The graph (step 7).

/** Is the graph the one the question asks for, V against 1/T? */
export const plotsVAgainstInverseT = (columns: { x: string; y: string }) =>
  columns.x === MIXTURES_PLOT.x && columns.y === MIXTURES_PLOT.y;

export interface MixturesGraphContext {
  /** The columns plotted, by id, and their symbols as headed. */
  columns: { x: string; y: string };
  symbols: { x: string; y: string };
}

/**
 * The sixth approved mistake (brief, "The mistakes"): plotting V against T, or any other pair,
 * where the question asks for V against 1/T. V against T is a curve; only V against 1/T is a
 * straight line meeting the V axis at −(50 + W).
 */
export const wrongMixturesGraph: Rule<MixturesGraphContext> = {
  id: "mixtures-wrong-graph",
  skill: "graph",
  check: ({ columns, symbols }): Finding[] =>
    plotsVAgainstInverseT(columns)
      ? []
      : [
          {
            rule: "mixtures-wrong-graph",
            severity: "error",
            skill: "graph",
            key: "findings.mixtures.wrongGraph",
            params: { x: symbols.x, y: symbols.y },
          },
        ],
};

export const MIXTURES_GRAPH_RULES: Rule<MixturesGraphContext>[] = [wrongMixturesGraph];

// The analysis (step 8).

export const MIXTURES_ANSWERS = ["slope", "intercept", "W"] as const;
export type MixturesAnswer = (typeof MIXTURES_ANSWERS)[number];

const VOLUME = parseUnit("cm³")!;

/** The water equivalent from where the line meets the V axis: W = −(intercept) − 50 cm³. */
export function waterEquivalentFrom(intercept: Quantity): Quantity {
  return {
    value: -intercept.value - methodOfMixtures.hot.volume * VOLUME.value,
    dims: VOLUME.dims,
  };
}

/**
 * What each answer should be, worked from what the student drew: the slope from their triangle
 * (in the axes' units, cm³ over °C⁻¹ is cm³ °C), V where their line meets the V axis (1/T = 0),
 * and W from the intercept they wrote (where it can be read), so a slip in the intercept is not
 * marked again in W.
 */
export function mixturesExpected(
  triangle: SlopeTriangle | undefined,
  line: DrawnLine | undefined,
  columns: { x: string; y: string },
  units: { x: string; y: string },
  answers: Partial<Record<MixturesAnswer, TypedAnswer>>,
): Partial<Record<MixturesAnswer, Quantity>> {
  const out: Partial<Record<MixturesAnswer, Quantity>> = {};
  const s = triangle && slopeOf(triangle, units);
  if (s) out.slope = s.slope;
  if (!line || !plotsVAgainstInverseT(columns)) return out;
  const uy = parseUnit(units.y);
  const y0 = yInterceptOf(line);
  if (y0 === undefined || !uy) return out;
  out.intercept = { value: y0 * uy.value, dims: uy.dims };
  out.W = waterEquivalentFrom(typedQuantity(answers.intercept, out.intercept) ?? out.intercept);
  return out;
}

export interface MixturesAnalysisContext {
  answers: Partial<Record<MixturesAnswer, TypedAnswer>>;
  expected: Partial<Record<MixturesAnswer, Quantity>>;
}

/** Each typed answer, checked for value, unit and significant figures. */
export const mixturesAnswerRules: Rule<MixturesAnalysisContext> = {
  id: "analysis-answers",
  skill: "analysis",
  check: ({ answers, expected }) => typedAnswerFindings(MIXTURES_ANSWERS, answers, expected),
};

export const MIXTURES_ANALYSIS_RULES: Rule<MixturesAnalysisContext>[] = [mixturesAnswerRules];
