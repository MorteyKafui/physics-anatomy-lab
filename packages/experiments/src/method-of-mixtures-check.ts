import {
  combineSpreads,
  fitLine,
  leastCountSpread,
  MODEL_CHECK_FACTOR,
  mean,
  modelCheck,
  type ModelCheck,
} from "@pa/analysis";
import { MEASURING_CYLINDER, substream } from "@pa/instruments";
import { finalTemperature, WATER_SPECIFIC_HEAT_CAPACITY } from "@pa/physics";

import type { CheckFinding, DataTemplate, LabCheck, LabRow, TemplateColumn } from "./lab-data";
import {
  correctMixturesBench,
  methodOfMixtures,
  MIXTURES_THERMOMETER,
  readThermometer,
  recordedTemperature,
  mixturesPeak,
} from "./method-of-mixtures";
import { MIXTURES_TEMPLATES } from "./method-of-mixtures-table";

/**
 * The method of mixtures' model check (data templates brief, decision 4): V against 1/T. The heat
 * the hot water gives up warms the cold water and the calorimeter, so for each reading
 * T = V₀ (θₕ − θ₁) ⁄ (V + V₀ + W), and V = V₀ (θₕ − θ₁) ⁄ T − (V₀ + W): the slope is fixed by the
 * hot water the student used, and the line meets the V axis at −(V₀ + W). Heat lost before the
 * highest temperature is read lowers T and so lowers the slope.
 */

const M = methodOfMixtures;

/** What is read in the lab: V, the cold water's temperature θ₁, and the highest θ₂; never T or 1/T. */
const columns: TemplateColumn[] = MIXTURES_TEMPLATES.temperatures
  .filter((c) => c.role === "given" || c.role === "measured" || c.role === "repeat")
  .map((c) => ({
    id: c.id,
    symbol: c.symbol,
    kind: c.kind,
    unit: c.unit,
    role: c.role === "given" ? "setting" : "reading",
  }));

const P = "experiments.method-of-mixtures.check";

export const MIXTURES_DATA_TEMPLATE: DataTemplate = {
  experiment: M.id,
  version: 1,
  // The words are the web app's (messages "experiments.method-of-mixtures.check.*").
  title: "experiments.method-of-mixtures.title",
  note: `${P}.note`,
  values: [
    { id: "hotVolume", label: `${P}.hotVolume`, kind: "volume", unit: "cm³", value: M.hot.volume },
    {
      id: "hotTemperature",
      label: `${P}.hotTemperature`,
      kind: "temperature",
      unit: "°C",
      value: M.hot.temperature,
    },
    { id: "W", label: `${P}.W`, kind: "volume", unit: "cm³", optional: true },
  ],
  columns,
  settings: M.volumes.map((v) => [v]),
};

/** The rise T, °C, the heat balance gives for V cm³ of cold water at θ₁ (cm³ of water is g). */
export function mixturesModelRise(
  V: number,
  theta1: number,
  hot: { volume: number; temperature: number },
  W = 0,
) {
  const water = (cm3: number, temperature: number) => ({
    mass: cm3 / 1000,
    specificHeatCapacity: WATER_SPECIFIC_HEAT_CAPACITY,
    temperature,
  });
  return finalTemperature([water(hot.volume, hot.temperature), water(V + W, theta1)]) - theta1;
}

/**
 * A careful student's spread in V about the line, cm³: the cylinder read to 1 cm³, and T from two
 * thermometer readings to 0.1 °C carried into V by the slope (an error dT moves 1/T by dT ⁄ T²).
 */
export function mixturesCarefulSpread(T: number, slope: number) {
  const dT = Math.SQRT2 * leastCountSpread(MIXTURES_THERMOMETER.resolution);
  return combineSpreads(
    leastCountSpread(MEASURING_CYLINDER.resolution),
    (Math.abs(slope) * dT) / T ** 2,
  );
}

/**
 * What even a careful run loses (data templates brief, decision 5, as for a marked lens's
 * tolerance): with the lid on and stirring, some heat leaves before the highest temperature is
 * read, so every T comes out a little low. Worked out once from the lab's heat model at the book's
 * volumes: how far the careful run's line sits from the heat balance's, and how much lower its
 * slope is, as a fraction.
 */
let shortfall: { shift: number; slope: number } | undefined;
export function mixturesCarefulShortfall() {
  if (shortfall) return shortfall;
  const W =
    ((M.calorimeter.mass * M.calorimeter.specificHeatCapacity) / WATER_SPECIFIC_HEAT_CAPACITY) *
    1000;
  const careful = M.volumes.map((V) => ({
    x: 1 / (mixturesPeak(correctMixturesBench(V)).temperature - M.room),
    y: V,
  }));
  const s = M.hot.volume * (M.hot.temperature - M.room);
  const shift = mean(careful.map((p) => p.y - (s * p.x - (M.hot.volume + W))));
  shortfall = { shift: Math.abs(shift), slope: Math.abs(1 - fitLine(careful).slope / s) };
  return shortfall;
}

export interface MixturesResult {
  /** The slope, cm³ °C, where the line meets the V axis, cm³, and W = −intercept − V₀, cm³. */
  slope: number;
  intercept: number;
  W: number;
}

/** The model check of a student's mixtures readings, rows and values in the template's units. */
export function mixturesCheck(
  rows: readonly LabRow[],
  values: Readonly<Record<string, number | undefined>> = {},
): LabCheck & { result?: MixturesResult } {
  const table: (number | undefined)[][] = [];
  const points: { x: number; y: number }[] = [];
  const starts: number[] = [];
  for (const row of rows) {
    const { V, theta1, theta2 } = row;
    const T = theta1 !== undefined && theta2 !== undefined ? theta2 - theta1 : undefined;
    const ok = V !== undefined && T !== undefined && T > 0;
    table.push([V, theta1, theta2, T, ok ? 1 / T : undefined]);
    if (ok) {
      points.push({ x: 1 / T, y: V });
      starts.push(theta1!);
    }
  }
  const empty = { table, points, model: [], modelLine: [], check: undefined, findings: [] };
  const V0 = values.hotVolume;
  const hotT = values.hotTemperature;
  if (V0 === undefined || hotT === undefined) return { ...empty, needs: `${P}.needs` };
  if (points.length < 3 || new Set(points.map((p) => p.x)).size < 2) return empty;

  const W = values.W;
  // The slope of V against 1/T for a reading that started at θ₁: the heat the hot water can give.
  const slopeAt = (theta1: number) => V0 * (hotT - theta1);
  const modelSlope = slopeAt(mean(starts));
  const fit = fitLine(points);
  const careful = mean(points.map((p) => mixturesCarefulSpread(1 / p.x, modelSlope)));

  // With W the line is fixed for each reading's own θ₁; without it, only its slope is.
  const model = points.map((p, i) =>
    W !== undefined ? slopeAt(starts[i]!) * p.x - (V0 + W) : fit.slope * p.x + fit.intercept,
  );
  const base = modelCheck({ points, model, modelSlope, carefulSpread: careful })!;
  // The errors allow for what even a careful run loses.
  const allow = mixturesCarefulShortfall();
  const judged = (value: number, error: number) => {
    const errors = value / error;
    return { error, errors, found: Math.abs(errors) > MODEL_CHECK_FACTOR };
  };
  const shift: ModelCheck["shift"] =
    W !== undefined
      ? {
          value: base.shift.value,
          ...judged(base.shift.value, combineSpreads(base.shift.error, allow.shift)),
        }
      : { value: 0, error: 0, errors: 0, found: false };
  const tilt = base.tilt!;
  const check: ModelCheck = {
    ...base,
    shift,
    tilt: {
      ...tilt,
      ...judged(tilt.value - tilt.model, combineSpreads(tilt.error, allow.slope * tilt.model)),
    },
  };

  const xs = points.map((p) => p.x);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  // The model's line, drawn for the mean θ₁; without W it is drawn through the student's centroid.
  const at = (x: number) =>
    W !== undefined
      ? modelSlope * x - (V0 + W)
      : fit.centroid.y + modelSlope * (x - fit.centroid.x);
  const modelLine = [lo, hi].map((x) => ({ x, y: at(x) }));

  const findings: CheckFinding[] = [];
  if (check.tilt?.found) {
    const lower = check.tilt.value < check.tilt.model;
    findings.push({
      part: "tilt",
      cause: `${P}.tilt.${lower ? "lower" : "higher"}`,
      precaution: `${P}.tilt.${lower ? "lower" : "higher"}.precaution`,
      params: {
        percent: Math.abs((check.tilt.value / check.tilt.model - 1) * 100).toFixed(0),
      },
    });
  }
  if (shift.found && W !== undefined) {
    findings.push({
      part: "shift",
      cause: `${P}.shift`,
      precaution: `${P}.shift.precaution`,
      params: { W: (-fit.intercept - V0).toFixed(0), given: W.toFixed(0) },
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
    model: points.map((p, i) => slopeAt(starts[i]!) * p.x - (V0 + (W ?? 0))),
    modelLine,
    check: { ...check, fit },
    findings,
    result: { slope: fit.slope, intercept: fit.intercept, W: -fit.intercept - V0 },
  };
}

/** The table's columns as the lab's table heads them: V, θ₁, θ₂, T, 1/T. */
export const MIXTURES_CHECK_COLUMNS = MIXTURES_TEMPLATES.temperatures.map((c) => ({
  id: c.id,
  symbol: c.symbol,
  unit: c.unit,
}));

/**
 * The example shown before a student brings in their own readings, labelled as example data: the
 * careful run at each of the book's volumes on the lab's heat model, the highest temperature read
 * to 0.1 °C (seed fixed).
 */
export function mixturesExample(): LabRow[] {
  const rng = substream(11, "method-of-mixtures.example");
  return M.volumes.map((V) => {
    const bench = correctMixturesBench(V);
    const peak = mixturesPeak(bench);
    return {
      V,
      // θ₁ before the pour, θ₂ at the highest.
      theta1: recordedTemperature(readThermometer({ ...bench, pouredAfter: null }, 0, { rng })),
      theta2: recordedTemperature(readThermometer(bench, peak.at, { rng })),
    };
  });
}
