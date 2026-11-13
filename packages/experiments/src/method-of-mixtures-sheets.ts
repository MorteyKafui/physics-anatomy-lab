import { fitLine } from "@pa/analysis";
import { MEASURING_CYLINDER } from "@pa/instruments";
import { finalTemperature, waterEquivalent } from "@pa/physics";

import {
  correctMixturesBench,
  methodOfMixtures,
  mixturesCalorimeter,
  mixturesPeak,
  MIXTURES_THERMOMETER,
} from "./method-of-mixtures";

/**
 * The numbers on the method of mixtures print sheets (master plan, "Print sheets"), worked out
 * by the heat model on the approved bench (brief decisions 1 to 5), never typed in (AGENTS.md
 * rule 1).
 */

/** The sheet's number in the Physics Anatomy series. */
export const MIXTURES_SHEET_NUMBER = "PA-005";

export interface MixturesSheet {
  /** The hot water: cm³ and °C; the room and the tap water, °C. */
  hotVolume: number;
  hotTemperature: number;
  room: number;
  /** The copper calorimeter: kg and J kg⁻¹ K⁻¹; its water equivalent, cm³. */
  calorimeterMass: number;
  calorimeterC: number;
  waterEquivalent: number;
  /** The model's constants: loss, % a minute; mixing time stirred, s; thermometer lag, s. */
  lossPerMinute: number;
  mixing: number;
  lag: number;
  /** The least counts: °C and cm³. */
  thermometer: number;
  cylinder: number;
  /** For each volume the question sets: the highest rise and when, and the rise with no loss. */
  points: { volume: number; rise: number; at: number; ideal: number }[];
  /** The best line through V against 1/T: its slope, cm³ °C, and where it meets the V axis, cm³. */
  slope: number;
  intercept: number;
}

export function mixturesSheet(): MixturesSheet {
  const M = methodOfMixtures;
  const points = M.volumes.map((volume) => {
    const bench = correctMixturesBench(volume);
    const peak = mixturesPeak(bench);
    const c = mixturesCalorimeter(bench);
    return {
      volume,
      rise: peak.temperature - M.room,
      at: peak.at,
      ideal: finalTemperature([c.hot, ...c.cold]) - M.room,
    };
  });
  const fit = fitLine(points.map((p) => ({ x: 1 / p.rise, y: p.volume })));
  return {
    hotVolume: M.hot.volume,
    hotTemperature: M.hot.temperature,
    room: M.room,
    calorimeterMass: M.calorimeter.mass,
    calorimeterC: M.calorimeter.specificHeatCapacity,
    waterEquivalent: waterEquivalent({ ...M.calorimeter, temperature: M.room }) * 1000,
    lossPerMinute: M.loss.covered * 60 * 100,
    mixing: M.mixing.stirred,
    lag: M.lag,
    thermometer: MIXTURES_THERMOMETER.resolution,
    cylinder: MEASURING_CYLINDER.resolution,
    points,
    slope: fit.slope,
    intercept: fit.intercept,
  };
}
