import {
  checkAnswer,
  parseUnit,
  sameDimension,
  type Finding,
  type Quantity,
  type Rule,
  type SlopeTriangle,
} from "@pa/analysis";

import { PENDULUM_PLOT } from "./pendulum-table";

/**
 * Analysing the pendulum (step 8): the slope of T² against l from the student's own slope
 * triangle, then g = 4π² ⁄ slope (from T² = (4π² ⁄ g) l). Everything is worked from what the
 * student drew, so a good method on a poor graph still earns its marks, as in WASSCE marking:
 * an error is carried forward, not counted twice.
 */

export const PENDULUM_ANSWERS = ["slope", "g"] as const;
export type PendulumAnswer = (typeof PENDULUM_ANSWERS)[number];

/** What the student typed for an answer: the number and the unit, exactly as written. */
export interface TypedAnswer {
  value: string;
  unit: string;
}

/** The units of g: m s⁻². */
export const G_DIMS: Quantity["dims"] = [1, 0, -2, 0, 0];

/** The slope a triangle gives, in SI, from the plotted columns' units ("s²" over "m"). */
export function slopeOf(
  triangle: SlopeTriangle,
  units: { x: string; y: string },
): { rise: number; run: number; slope: Quantity } | undefined {
  const ux = parseUnit(units.x);
  const uy = parseUnit(units.y);
  const run = triangle.b.x - triangle.a.x;
  const rise = triangle.b.y - triangle.a.y;
  if (!ux || !uy || run === 0) return undefined;
  return {
    rise,
    run,
    slope: {
      value: (rise * uy.value) / (run * ux.value),
      dims: uy.dims.map((p, i) => p - ux.dims[i]!) as unknown as Quantity["dims"],
    },
  };
}

/** g from a slope of T² against l: 4π² ⁄ slope, in m s⁻². */
export const gFromSlope = (slope: Quantity): Quantity => ({
  value: (4 * Math.PI ** 2) / slope.value,
  dims: slope.dims.map((p) => (p === 0 ? 0 : -p)) as unknown as Quantity["dims"],
});

/** Is the graph the one the theory asks for, so its slope gives g? */
export const plotsTSquaredAgainstL = (columns: { x: string; y: string }) =>
  columns.x === PENDULUM_PLOT.x && columns.y === PENDULUM_PLOT.y;

/** The student's slope as a quantity, when it can be read with a unit of the right kind. */
export function typedQuantity(
  typed: TypedAnswer | undefined,
  like: Quantity,
): Quantity | undefined {
  if (!typed) return undefined;
  const value = Number(typed.value.trim());
  const unit = parseUnit(typed.unit);
  if (
    !Number.isFinite(value) ||
    typed.value.trim() === "" ||
    !unit ||
    !sameDimension(unit.dims, like.dims)
  )
    return undefined;
  return { value: value * unit.value, dims: like.dims };
}

export interface AnalysisContext {
  answers: Partial<Record<PendulumAnswer, TypedAnswer>>;
  /** What each answer should be, worked from the student's own triangle and slope. */
  expected: Partial<Record<PendulumAnswer, Quantity>>;
}

const NAMES: Record<PendulumAnswer, string> = { slope: "slope", g: "g" };

/** Each typed answer, checked for value, unit and significant figures separately. */
export const answerRules: Rule<AnalysisContext> = {
  id: "analysis-answers",
  skill: "analysis",
  check: ({ answers, expected }) =>
    PENDULUM_ANSWERS.flatMap((id): Finding[] => {
      const typed = answers[id];
      const want = expected[id];
      if (!typed || !want || (typed.value.trim() === "" && typed.unit.trim() === "")) return [];
      const c = checkAnswer(typed, want);
      const base = { skill: "analysis" as const, column: id, params: { name: NAMES[id] } };
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
    }),
};

export const ANALYSIS_RULES: Rule<AnalysisContext>[] = [answerRules];

/**
 * What each answer should be: the slope from the student's triangle, and g from the slope the
 * student wrote (if it can be read), so a slip in the slope is not marked again in g.
 */
export function expectedAnswers(
  triangle: SlopeTriangle | undefined,
  columns: { x: string; y: string },
  units: { x: string; y: string },
  answers: Partial<Record<PendulumAnswer, TypedAnswer>>,
): Partial<Record<PendulumAnswer, Quantity>> {
  if (!triangle) return {};
  const s = slopeOf(triangle, units);
  if (!s) return {};
  const out: Partial<Record<PendulumAnswer, Quantity>> = { slope: s.slope };
  if (plotsTSquaredAgainstL(columns)) {
    const own = typedQuantity(answers.slope, s.slope);
    out.g = gFromSlope(own ?? s.slope);
  }
  return out;
}
