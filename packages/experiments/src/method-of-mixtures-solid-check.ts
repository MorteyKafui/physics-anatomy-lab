import {
  combineSpreads,
  fitLine,
  leastCountSpread,
  MODEL_CHECK_FACTOR,
  modelCheck,
  type ModelCheck,
} from "@pa/analysis";
import { substream, takeReading } from "@pa/instruments";
import { calorimeterAt, type Calorimeter, WATER_SPECIFIC_HEAT_CAPACITY } from "@pa/physics";

import type { CheckFinding, DataTemplate, LabCheck, LabRow, TemplateColumn } from "./lab-data";
import { methodOfMixtures, MIXTURES_THERMOMETER, recordedTemperature } from "./method-of-mixtures";
import {
  cFromReadings,
  correctSolidBench,
  hotSolid,
  solidAtEntry,
  solidThermometer,
  type SolidWorld,
} from "./method-of-mixtures-solid";
import { SOLID_TEMPLATES } from "./method-of-mixtures-solid-table";

/**
 * The hot solid's model check (data templates brief, decision 4): θ against t, a curve. The model
 * is the lab's heat model for the student's own masses and starting temperature, the solid moved
 * across quickly, the lid on and stirred. With the metal's c entered the curve is fixed, and
 * readings below it mean heat was lost on the way across; without it, c comes from the student's
 * own highest reading and the curve is checked for its shape alone.
 */

const H = hotSolid;
const M = methodOfMixtures;
const P = "experiments.method-of-mixtures-solid.check";

const columns: TemplateColumn[] = SOLID_TEMPLATES.single.map((c) => ({
  id: c.id,
  symbol: c.symbol,
  kind: c.kind,
  unit: c.unit,
  role: c.role === "given" ? "setting" : "reading",
}));

/** Every minute from the solid going in: the book reads until the temperature has turned. */
const MINUTES = [0, 1, 2, 3, 4, 5];
const calorimeterGrams = M.calorimeter.mass * 1000;

export const SOLID_DATA_TEMPLATE: DataTemplate = {
  experiment: H.id,
  version: 1,
  // The words are the web app's (messages "experiments.method-of-mixtures-solid.check.*").
  title: "experiments.method-of-mixtures-solid.title",
  note: `${P}.note`,
  values: [
    { id: "solid", label: `${P}.solid`, kind: "mass", unit: "g", value: H.solidMass },
    { id: "empty", label: `${P}.empty`, kind: "mass", unit: "g", value: calorimeterGrams },
    {
      id: "filled",
      label: `${P}.filled`,
      kind: "mass",
      unit: "g",
      value: calorimeterGrams + H.water,
    },
    { id: "boiling", label: `${P}.boiling`, kind: "temperature", unit: "°C", value: H.boiling },
    {
      id: "c",
      label: `${P}.c`,
      kind: "specific-heat-capacity",
      unit: "J kg⁻¹ K⁻¹",
      optional: true,
    },
  ],
  columns,
  settings: MINUTES.map((m) => [m]),
};

/** The student's own apparatus as the heat model's calorimeter, with the solid's c, masses in g. */
function calorimeterOf(
  v: { solid: number; empty: number; filled: number; boiling: number },
  c: number,
  start: number,
): Calorimeter {
  return {
    hot: [
      {
        mass: v.solid / 1000,
        specificHeatCapacity: c,
        // Moved across at once, as the careful run is: what it loses on the way is the lab's.
        temperature: solidAtEntry(0) - (H.boiling - v.boiling),
      },
    ],
    cold: [
      {
        mass: (v.filled - v.empty) / 1000,
        specificHeatCapacity: WATER_SPECIFIC_HEAT_CAPACITY,
        temperature: start,
      },
      { mass: v.empty / 1000, specificHeatCapacity: H.given.calorimeter, temperature: start },
    ],
    room: start,
    loss: M.loss.covered,
    mixing: H.sharing.stirred,
    lag: M.lag,
  };
}

/** A careful student's spread in a minute reading, °C: the thermometer read to 0.1 °C. */
export const solidCarefulSpread = () => leastCountSpread(MIXTURES_THERMOMETER.resolution);

export interface SolidResult {
  /** The highest reading, °C, and c from it by the book's equation, J kg⁻¹ K⁻¹. */
  highest: number;
  c: number;
}

/** The model check of a student's hot-solid readings, rows and values in the template's units. */
export function solidCheck(
  rows: readonly LabRow[],
  values: Readonly<Record<string, number | undefined>> = {},
): LabCheck & { result?: SolidResult } {
  const table: (number | undefined)[][] = [];
  const points: { x: number; y: number }[] = [];
  for (const row of rows) {
    table.push([row.t, row.theta]);
    if (row.t !== undefined && row.theta !== undefined) points.push({ x: row.t, y: row.theta });
  }
  points.sort((a, b) => a.x - b.x);
  const empty = { table, points, model: [], modelLine: [], check: undefined, findings: [] };
  const { solid, empty: emptyMass, filled, boiling } = values;
  if (
    solid === undefined ||
    emptyMass === undefined ||
    filled === undefined ||
    boiling === undefined
  )
    return { ...empty, needs: `${P}.needs` };
  // The start is the reading as the solid goes in; the curve after it is what is checked.
  const start = points.find((p) => p.x === 0)?.y;
  const after = points.filter((p) => p.x > 0);
  if (start === undefined || after.length < 3) return empty;

  const highest = Math.max(...after.map((p) => p.y));
  const c = cFromReadings({ solid, empty: emptyMass, filled, start, highest });
  const given = values.c;
  const v = { solid, empty: emptyMass, filled, boiling };
  const model = calorimeterOf(v, given ?? c, start);
  const at = (minutes: number) => calorimeterAt(model, minutes * 60).thermometer;

  const careful = solidCarefulSpread();
  const base = modelCheck({
    points: after,
    model: after.map((p) => at(p.x)),
    curve: true,
    carefulSpread: careful,
  })!;
  // The curve's shape: a steady trend in the differences from the model, minute by minute. Heat
  // leaving through an open lid makes the readings fall away faster; water not stirred makes them
  // reach their highest late. The scatter is then what is left about that trend.
  const trend = fitLine(after.map((p) => ({ x: p.x, y: p.y - at(p.x) })));
  const sd = Math.max(trend.residualSd, careful);
  const trendError = sd / Math.sqrt(after.reduce((a, p) => a + (p.x - trend.centroid.x) ** 2, 0));
  const shape = {
    value: trend.slope,
    model: 0,
    error: trendError,
    errors: trend.slope / trendError,
    found: Math.abs(trend.slope / trendError) > MODEL_CHECK_FACTOR,
  };
  const spread = {
    value: trend.residualSd,
    careful,
    ratio: trend.residualSd / careful,
    // A bent curve leaves a pattern, not scatter: scatter is judged only when the shape is right.
    found: !shape.found && trend.residualSd / careful > MODEL_CHECK_FACTOR,
  };
  // Readings near the peak are nearly equal, so rounding each to 0.1 °C errs the same way in all
  // of them: the mean is never surer than one reading's rounding. Without the metal's c the curve
  // is drawn through the student's own highest, so its level is theirs and is not judged.
  const error = combineSpreads(base.shift.error, solidCarefulSpread());
  const errors = base.shift.value / error;
  const check: ModelCheck =
    given !== undefined
      ? {
          ...base,
          tilt: shape,
          spread,
          shift: {
            value: base.shift.value,
            error,
            errors,
            found: Math.abs(errors) > MODEL_CHECK_FACTOR,
          },
        }
      : { ...base, tilt: shape, spread, shift: { value: 0, error: 0, errors: 0, found: false } };

  const last = Math.max(...points.map((p) => p.x));
  const modelLine = Array.from({ length: 41 }, (_, i) => (i * last) / 40).map((x) => ({
    x,
    y: x === 0 ? start : at(x),
  }));

  const findings: CheckFinding[] = [];
  if (check.shift.found && given !== undefined) {
    const below = check.shift.value < 0;
    findings.push({
      part: "shift",
      cause: `${P}.shift.${below ? "below" : "above"}`,
      precaution: `${P}.shift.${below ? "below" : "above"}.precaution`,
      params: {
        by: Math.abs(check.shift.value).toFixed(1),
        c: c.toFixed(0),
        given: given.toFixed(0),
      },
    });
  }
  if (shape.found) {
    const falls = shape.value < 0;
    findings.push({
      part: "tilt",
      cause: `${P}.tilt.${falls ? "falls" : "late"}`,
      precaution: `${P}.tilt.${falls ? "falls" : "late"}.precaution`,
      params: { rate: Math.abs(shape.value).toFixed(2) },
    });
  }
  if (check.spread.found) {
    findings.push({
      part: "spread",
      cause: `${P}.spread`,
      precaution: `${P}.spread.precaution`,
      params: { times: check.spread.ratio.toFixed(1) },
    });
  }
  return {
    table,
    points,
    model: after.map((p) => at(p.x)),
    modelLine,
    check,
    findings,
    result: { highest, c },
  };
}

/** The table's columns as the lab's table heads them: t, θ. */
export const SOLID_CHECK_COLUMNS = SOLID_TEMPLATES.single.map((c) => ({
  id: c.id,
  symbol: c.symbol,
  unit: c.unit,
}));

/**
 * The example shown before a student brings in their own readings, labelled as example data: the
 * careful run with a copper solid on the lab's heat model, read every minute to 0.1 °C (seed
 * fixed). Copper is the first of the lab's metals; the example does not say which it is.
 */
export function solidExample(): LabRow[] {
  const world: SolidWorld = { metal: H.metals[0]! };
  const bench = correctSolidBench(world);
  const rng = substream(11, "method-of-mixtures-solid.example");
  return MINUTES.map((m) => ({
    t: m,
    theta:
      m === 0
        ? M.room
        : recordedTemperature(
            takeReading(MIXTURES_THERMOMETER, solidThermometer(bench, m * 60), { rng }),
          ),
  }));
}
