import { parseFormula, type Expr } from "./expression";
import { formatSigFigs, parseFigure } from "./sigfigs";

/**
 * Quantities with units, for the calculator (step 8, master plan "Calculator"): a value in SI and
 * its dimensions as powers of the base units. "4.03 s² m⁻¹" and "4.03 s²/m" are the same thing;
 * adding a length to a time is refused; 4π² ⁄ (4.03 s² m⁻¹) comes out in m s⁻². Units are read
 * by the formula parser, so a unit is written the way a textbook writes it.
 */

/** Powers of m, kg, s, A and K. */
export type Dims = readonly [number, number, number, number, number];
export const BASE_UNITS = ["m", "kg", "s", "A", "K"] as const;
export const DIMENSIONLESS: Dims = [0, 0, 0, 0, 0];

export interface Quantity {
  /** In SI. */
  value: number;
  dims: Dims;
}

const d = (m = 0, kg = 0, s = 0, A = 0, K = 0): Dims => [m, kg, s, A, K];

/** Units the calculator knows, with their size in SI. */
export const UNIT_SYMBOLS: Readonly<Record<string, Quantity>> = {
  m: { value: 1, dims: d(1) },
  cm: { value: 1e-2, dims: d(1) },
  mm: { value: 1e-3, dims: d(1) },
  km: { value: 1e3, dims: d(1) },
  kg: { value: 1, dims: d(0, 1) },
  g: { value: 1e-3, dims: d(0, 1) },
  s: { value: 1, dims: d(0, 0, 1) },
  ms: { value: 1e-3, dims: d(0, 0, 1) },
  min: { value: 60, dims: d(0, 0, 1) },
  Hz: { value: 1, dims: d(0, 0, -1) },
  N: { value: 1, dims: d(1, 1, -2) },
  J: { value: 1, dims: d(2, 1, -2) },
  kJ: { value: 1e3, dims: d(2, 1, -2) },
  W: { value: 1, dims: d(2, 1, -3) },
  Pa: { value: 1, dims: d(-1, 1, -2) },
  A: { value: 1, dims: d(0, 0, 0, 1) },
  mA: { value: 1e-3, dims: d(0, 0, 0, 1) },
  C: { value: 1, dims: d(0, 0, 1, 1) },
  V: { value: 1, dims: d(2, 1, -3, -1) },
  mV: { value: 1e-3, dims: d(2, 1, -3, -1) },
  Ω: { value: 1, dims: d(2, 1, -3, -2) },
  kΩ: { value: 1e3, dims: d(2, 1, -3, -2) },
  K: { value: 1, dims: d(0, 0, 0, 0, 1) },
  // Angles have no dimension in SI; a degree is π ⁄ 180 of a radian.
  rad: { value: 1, dims: d() },
  "°": { value: Math.PI / 180, dims: d() },
};
const UNIT_NAMES = Object.keys(UNIT_SYMBOLS);

const sameDims = (a: Dims, b: Dims) => a.every((p, i) => Math.abs(p - b[i]!) < 1e-9);
export const dimensionless = (q: Dims) => sameDims(q, DIMENSIONLESS);
export const sameDimension = sameDims;

/** Why a calculation could not be done: a message key under calc.problem. */
export type CalcProblem =
  | "empty"
  | "unexpected"
  | "unclosed"
  | "unknown-unit"
  | "unlike-units"
  | "power-has-unit"
  | "needs-no-unit"
  | "undefined";

export type CalcResult =
  | { ok: true; quantity: Quantity; sigFigs: number | undefined }
  | { ok: false; problem: CalcProblem; near?: string | undefined };

class CalcError extends Error {
  constructor(readonly problem: CalcProblem) {
    super(problem);
  }
}

function evaluateQuantity(
  expr: Expr,
  symbols: Readonly<Record<string, Quantity>> = UNIT_SYMBOLS,
): Quantity {
  switch (expr.type) {
    case "number":
      return { value: expr.value, dims: DIMENSIONLESS };
    case "symbol": {
      const unit = symbols[expr.name];
      if (!unit) throw new CalcError("unknown-unit");
      return unit;
    }
    case "unary": {
      const q = evaluateQuantity(expr.arg, symbols);
      return { value: -q.value, dims: q.dims };
    }
    case "call": {
      const q = evaluateQuantity(expr.arg, symbols);
      if (expr.fn === "sqrt") {
        if (q.value < 0) throw new CalcError("undefined");
        return { value: Math.sqrt(q.value), dims: q.dims.map((p) => p / 2) as unknown as Dims };
      }
      if (!dimensionless(q.dims)) throw new CalcError("needs-no-unit");
      if (q.value <= 0) throw new CalcError("undefined");
      return {
        value: expr.fn === "log" ? Math.log10(q.value) : Math.log(q.value),
        dims: DIMENSIONLESS,
      };
    }
    case "binary": {
      const a = evaluateQuantity(expr.left, symbols);
      const b = evaluateQuantity(expr.right, symbols);
      switch (expr.op) {
        case "+":
        case "-":
          if (!sameDims(a.dims, b.dims)) throw new CalcError("unlike-units");
          return { value: expr.op === "+" ? a.value + b.value : a.value - b.value, dims: a.dims };
        case "*":
          return {
            value: a.value * b.value,
            dims: a.dims.map((p, i) => p + b.dims[i]!) as unknown as Dims,
          };
        case "/":
          if (b.value === 0) throw new CalcError("undefined");
          return {
            value: a.value / b.value,
            dims: a.dims.map((p, i) => p - b.dims[i]!) as unknown as Dims,
          };
        case "^":
          if (!dimensionless(b.dims)) throw new CalcError("power-has-unit");
          return {
            value: a.value ** b.value,
            dims: a.dims.map((p) => (p === 0 ? 0 : p * b.value)) as unknown as Dims,
          };
      }
    }
  }
}

/** The fewest significant figures among the numbers written with a unit: the measured values. */
function measuredSigFigs(expr: Expr): number | undefined {
  const found: number[] = [];
  const hasUnit = (e: Expr): boolean =>
    e.type === "symbol" ||
    (e.type === "binary" && (hasUnit(e.left) || hasUnit(e.right))) ||
    (e.type === "unary" && hasUnit(e.arg));
  const walk = (e: Expr) => {
    if (e.type === "binary") {
      // A number multiplied straight by a unit ("4.03 s²") is a measurement.
      if (e.op === "*" && e.left.type === "number" && hasUnit(e.right) && e.left.raw) {
        const f = parseFigure(e.left.raw);
        if (f) found.push(f.sigFigs);
      }
      walk(e.left);
      walk(e.right);
    } else if (e.type === "unary" || e.type === "call") walk(e.arg);
  };
  walk(expr);
  return found.length ? Math.min(...found) : undefined;
}

/**
 * Work out a calculation with units: "4π² / (4.03 s² m⁻¹)". The result is in SI. `sigFigs` is
 * the fewest significant figures among the measured values in it, which is how many the answer
 * can honestly carry; pure numbers such as 4 and π are exact.
 */
export function calculate(text: string): CalcResult {
  const parsed = parseFormula(text, UNIT_NAMES);
  if (!parsed.ok)
    return {
      ok: false,
      problem: parsed.problem === "unknown-symbol" ? "unknown-unit" : parsed.problem,
      near: parsed.near,
    };
  try {
    const quantity = evaluateQuantity(parsed.expr);
    if (!Number.isFinite(quantity.value)) return { ok: false, problem: "undefined" };
    return { ok: true, quantity, sigFigs: measuredSigFigs(parsed.expr) };
  } catch (e) {
    if (e instanceof CalcError) return { ok: false, problem: e.problem };
    throw e;
  }
}

/** Read a unit as written ("s² m⁻¹", "s^2/m", "m s-2" is not one): its dimensions and size. */
export function parseUnit(text: string): Quantity | undefined {
  if (text.trim() === "") return { value: 1, dims: DIMENSIONLESS };
  const r = calculate(text);
  return r.ok ? r.quantity : undefined;
}

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const superscript = (n: number) =>
  (n < 0 ? "⁻" : "") +
  String(Math.abs(n))
    .split("")
    .map((c) => SUPERSCRIPT[Number(c)])
    .join("");

/**
 * Dimensions written the way a textbook writes them: positive powers first, then negative, each
 * in the order m, kg, s, A, K: "m s⁻²", "s² m⁻¹", "kg m² s⁻²".
 */
export function formatDims(dims: Dims): string {
  const part = (i: number) => {
    const p = dims[i]!;
    return p === 1 ? BASE_UNITS[i]! : `${BASE_UNITS[i]}${superscript(p)}`;
  };
  const pos = dims.flatMap((p, i) => (p > 0 ? [part(i)] : []));
  const neg = dims.flatMap((p, i) => (p < 0 ? [part(i)] : []));
  return [...pos, ...neg].join(" ");
}

/** A quantity as an answer: its value to n significant figures in SI, and its unit. */
export const formatQuantity = (q: Quantity, sigFigs = 3) =>
  `${formatSigFigs(q.value, sigFigs)}${dimensionless(q.dims) ? "" : ` ${formatDims(q.dims)}`}`;

/** How a typed answer compares with the expected one, each part on its own. */
export interface AnswerCheck {
  value: "ok" | "wrong" | "missing" | "unreadable";
  unit: "ok" | "wrong" | "missing" | "unreadable";
  sigFigs: "ok" | "too-few" | "too-many" | "unknown";
  /** Significant figures as written. */
  written: number | undefined;
}

/**
 * Check a student's answer (as typed: a number and a unit) against the expected quantity. The
 * value is right if it is within 1% of the expected, or within the rounding its own figures
 * imply; it is compared in the student's unit when that unit is the right kind (so 403 s² cm⁻¹
 * is not 4.03 s² m⁻¹). The guide asks for three significant figures (mistake catalogue).
 */
export function checkAnswer(
  typed: { value: string; unit: string },
  expected: Quantity,
  sigFigs = 3,
): AnswerCheck {
  const figure = typed.value.trim() === "" ? undefined : parseFigure(typed.value);
  const unitText = typed.unit.trim();
  const unit = unitText === "" ? undefined : parseUnit(unitText);
  const unitState: AnswerCheck["unit"] = dimensionless(expected.dims)
    ? unitText === "" || (unit && dimensionless(unit.dims))
      ? "ok"
      : "wrong"
    : unitText === ""
      ? "missing"
      : !unit
        ? "unreadable"
        : sameDims(unit.dims, expected.dims)
          ? "ok"
          : "wrong";

  let value: AnswerCheck["value"] = "missing";
  if (typed.value.trim() !== "") value = figure ? "wrong" : "unreadable";
  if (figure) {
    const scale = unitState === "ok" && unit ? unit.value : 1;
    const si = figure.value * scale;
    const rounding = 0.6 * 10 ** -figure.decimals * scale;
    const tolerance = Math.max(Math.abs(expected.value) * 0.01, rounding);
    if (Math.abs(si - expected.value) <= tolerance) value = "ok";
  }
  const written = figure?.sigFigs;
  return {
    value,
    unit: unitState,
    sigFigs:
      written === undefined
        ? "unknown"
        : written < sigFigs
          ? "too-few"
          : written > sigFigs
            ? "too-many"
            : "ok",
    written,
  };
}

/**
 * The units a formula gives when each of its symbols stands for a quantity (a table column's
 * unit, say): "t / 20" with t in s gives s. Undefined when the formula cannot be read, or its
 * units do not combine (t + l).
 */
export function unitsOf(
  formula: string,
  symbols: Readonly<Record<string, Quantity>>,
): Quantity | undefined {
  const parsed = parseFormula(formula, Object.keys(symbols));
  if (!parsed.ok) return undefined;
  try {
    return evaluateQuantity(parsed.expr, symbols);
  } catch (e) {
    if (e instanceof CalcError) return undefined;
    throw e;
  }
}
