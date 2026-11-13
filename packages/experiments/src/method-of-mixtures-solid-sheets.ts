import { BALANCE } from "@pa/instruments";

import { methodOfMixtures, MIXTURES_THERMOMETER } from "./method-of-mixtures";
import {
  cFromReadings,
  correctSolidBench,
  hotSolid,
  solidPeak,
  solidThermometer,
  type Metal,
} from "./method-of-mixtures-solid";

/**
 * The numbers on the method of mixtures with a hot solid print sheets (master plan, "Print
 * sheets"), worked out by the heat model on the approved bench (decisions 6 to 10), never typed
 * in (AGENTS.md rule 1).
 */

/** The sheet's number in the Physics Anatomy series. */
export const SOLID_SHEET_NUMBER = "PA-006";

export interface SolidSheetMetal {
  metal: Metal;
  /** The readings every minute from the start, °C, to 0.1 °C. */
  minutes: number[];
  /** The true highest and when, s after the solid goes in; and c worked from the minute readings. */
  peak: { at: number; temperature: number };
  c: number;
}

export interface SolidSheet {
  /** The solid, the calorimeter and the water, g; the boiling water and the room, °C. */
  solid: number;
  calorimeter: number;
  water: number;
  boiling: number;
  room: number;
  /** The given specific heat capacities, J kg⁻¹ K⁻¹. */
  given: { calorimeter: number; water: number };
  /** The least counts: g and °C. */
  balance: number;
  thermometer: number;
  /** The solid's air cooling, % a minute, and its sharing time, s, stirred. */
  airPerMinute: number;
  sharing: number;
  /** Each metal, done carefully and read every minute for four minutes. */
  metals: SolidSheetMetal[];
}

const round = (c: number) => Math.round(c * 10) / 10;

export function solidSheet(): SolidSheet {
  const M = methodOfMixtures;
  const calorimeter = M.calorimeter.mass * 1000;
  const metals = hotSolid.metals.map((metal) => {
    const b = correctSolidBench({ metal });
    const minutes = [0, 1, 2, 3, 4].map((m) =>
      m === 0 ? M.room : round(solidThermometer(b, m * 60)),
    );
    const highest = Math.max(...minutes);
    return {
      metal,
      minutes,
      peak: solidPeak(b),
      c: cFromReadings({
        solid: hotSolid.solidMass,
        empty: calorimeter,
        filled: calorimeter + hotSolid.water,
        start: M.room,
        highest,
      }),
    };
  });
  return {
    solid: hotSolid.solidMass,
    calorimeter,
    water: hotSolid.water,
    boiling: hotSolid.boiling,
    room: M.room,
    given: { ...hotSolid.given },
    balance: BALANCE.resolution,
    thermometer: MIXTURES_THERMOMETER.resolution,
    airPerMinute: hotSolid.air * 60 * 100,
    sharing: hotSolid.sharing.stirred,
    metals,
  };
}
