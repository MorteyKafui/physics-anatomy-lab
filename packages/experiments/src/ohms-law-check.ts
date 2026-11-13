import {
  combineSpreads,
  fitLine,
  leastCountSpread,
  MODEL_CHECK_FACTOR,
  mean,
  modelCheck,
  xIntercept,
  type ModelCheck,
} from "@pa/analysis";
import { AMMETER, substream, VOLTMETER } from "@pa/instruments";

import type { CheckFinding, DataTemplate, LabCheck, LabRow, TemplateColumn } from "./lab-data";
import { correctBench, meterReadings, ohmsLaw, recorded, type OhmsLawWorld } from "./ohms-law";
import { OHMS_LAW_STANDARD_TABLE } from "./ohms-law-table";

/**
 * Ohm's law's model check (data templates brief, decision 4). A real bench has no fixed model:
 * every pair of cells has its own E and r. So the check takes E and r from the student's own line
 * of I against V, judges how far the points scatter about it against what the meters' least
 * counts allow, and, with the cells' marked e.m.f. entered, compares E with it.
 */

const O = ohmsLaw;

/** What is read in the lab: PJ, and each meter twice; never the means. PJ is empty with no contact. */
const columns: TemplateColumn[] = OHMS_LAW_STANDARD_TABLE.filter(
  (c) => c.role === "given" || c.role === "repeat" || c.role === "measured",
).map((c) => ({
  id: c.id,
  symbol: c.symbol,
  kind: c.kind,
  unit: c.unit,
  role: c.role === "given" ? "setting" : "reading",
  ...(c.role === "given" ? { optional: true } : {}),
}));

const currents = columns.filter((c) => c.kind === "current").map((c) => c.id);
const voltages = columns.filter((c) => c.kind === "voltage").map((c) => c.id);

export const OHMS_LAW_DATA_TEMPLATE: DataTemplate = {
  experiment: O.id,
  version: 1,
  // The words are the web app's (messages "experiments.ohms-law.check.*").
  title: "experiments.ohms-law.title",
  note: "experiments.ohms-law.check.note",
  values: [
    {
      id: "emf",
      label: "experiments.ohms-law.check.marked",
      kind: "voltage",
      unit: "V",
      optional: true,
    },
  ],
  columns,
  // The first row is the reading with the jockey off the wire, so its PJ is left empty.
  settings: [[undefined], ...O.jockeyPositions.map((pj) => [Math.round(pj * 1000) / 10])],
};

/**
 * A careful student's spread in I, A, about the line of I against V with this slope: each meter
 * read to its least count, the voltmeter's carried across into I by the slope, over √repeats.
 */
export function ohmsLawCarefulSpread(slope: number, repeats: number) {
  return (
    combineSpreads(
      leastCountSpread(AMMETER.resolution),
      Math.abs(slope) * leastCountSpread(VOLTMETER.resolution),
    ) / Math.sqrt(Math.max(1, repeats))
  );
}

const MESSAGES = "experiments.ohms-law.check";

export interface OhmsLawResult {
  /** The cell's emf where the line meets the V axis, V, with its error; and r = −1 ⁄ slope, Ω. */
  E: { value: number; error: number };
  r: number;
}

/** The model check of a student's Ohm's law readings, rows and values in the template's units. */
export function ohmsLawCheck(
  rows: readonly LabRow[],
  values: Readonly<Record<string, number | undefined>> = {},
): LabCheck & { result?: OhmsLawResult } {
  const table: (number | undefined)[][] = [];
  const points: { x: number; y: number }[] = [];
  const repeats: number[] = [];
  for (const row of rows) {
    const is = currents.map((id) => row[id]).filter((v): v is number => v !== undefined);
    const vs = voltages.map((id) => row[id]).filter((v): v is number => v !== undefined);
    const I = is.length ? mean(is) : undefined;
    const V = vs.length ? mean(vs) : undefined;
    table.push([row.PJ, row.I1, row.I2, I, row.V1, row.V2, V]);
    if (I !== undefined && V !== undefined) {
      points.push({ x: V, y: I });
      repeats.push(Math.min(is.length, vs.length));
    }
  }

  const distinct = new Set(points.map((p) => p.x)).size;
  if (points.length < 3 || distinct < 2) {
    return { table, points, model: [], modelLine: [], check: undefined, findings: [] };
  }
  const fit = fitLine(points);
  const careful = ohmsLawCarefulSpread(fit.slope, Math.round(mean(repeats)));
  // No model line on a real bench: the points against their own line, for the scatter alone.
  const own = points.map((p) => fit.slope * p.x + fit.intercept);
  const spread = modelCheck({ points, model: own, carefulSpread: careful })!;

  const E = fit.slope < 0 ? xIntercept(fit) : undefined;
  const marked = values.emf;
  let shift: ModelCheck["shift"] = { value: 0, error: 0, errors: 0, found: false };
  if (E && marked !== undefined) {
    // E against the marking, allowing for the error in E and the cells' own spread from it.
    const error = combineSpreads(E.error, marked * O.tolerance.emf);
    const errors = (E.value - marked) / error;
    shift = {
      value: E.value - marked,
      error,
      errors,
      found: Math.abs(errors) > MODEL_CHECK_FACTOR,
    };
  }
  const check: ModelCheck = { ...spread, fit, shift };

  const findings: CheckFinding[] = [];
  if (shift.found && E && marked !== undefined) {
    findings.push({
      part: "shift",
      cause: `${MESSAGES}.shift.${shift.value < 0 ? "below" : "above"}`,
      precaution: `${MESSAGES}.shift.precaution`,
      params: { E: E.value.toFixed(2), marked: marked.toFixed(1) },
    });
  }
  if (check.spread.found) {
    findings.push({
      part: "spread",
      cause: `${MESSAGES}.spread`,
      precaution: `${MESSAGES}.spread.precaution`,
      params: { times: check.spread.ratio.toFixed(1) },
    });
  }

  // The line drawn across the graph, out to where it meets the V axis.
  const xs = points.map((p) => p.x);
  const hi = Math.max(...xs, E?.value ?? -Infinity);
  const lo = Math.min(...xs);
  const modelLine = [lo, hi].map((x) => ({ x, y: fit.slope * x + fit.intercept }));

  return {
    table,
    points,
    model: own,
    modelLine,
    check,
    findings,
    ...(E ? { result: { E, r: -1 / fit.slope } } : {}),
  };
}

/** The table's columns as the lab's standard table heads them: PJ, I₁, I₂, I, V₁, V₂, V. */
export const OHMS_LAW_CHECK_COLUMNS = OHMS_LAW_STANDARD_TABLE.map((c) => ({
  id: c.id,
  symbol: c.symbol,
  unit: c.unit,
}));

/**
 * The example shown before a student brings in their own readings, labelled as example data:
 * the bench at its nominal values, each position read twice by a careful student (seed fixed).
 */
export function ohmsLawExample(): LabRow[] {
  const world: OhmsLawWorld = {
    emf: O.cell.emf,
    internalResistance: O.cell.internalResistance,
    resistor: O.resistor,
    wireResistance: O.wire.resistance,
    wireLength: O.wire.length,
    ammeter: AMMETER,
    voltmeter: VOLTMETER,
  };
  const rng = substream(11, "ohms-law.example");
  return [undefined, ...O.jockeyPositions].map((pj) => {
    const read = () => meterReadings(world, correctBench(pj), { rng })!;
    const [a, b] = [read(), read()];
    return {
      ...(pj !== undefined ? { PJ: Math.round(pj * 1000) / 10 } : {}),
      I1: recorded(a.ammeter, AMMETER),
      I2: recorded(b.ammeter, AMMETER),
      V1: recorded(a.voltmeter, VOLTMETER),
      V2: recorded(b.voltmeter, VOLTMETER),
    };
  });
}
