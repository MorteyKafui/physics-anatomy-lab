import { fitLine } from "@pa/analysis";
import { terminalPdReadings } from "@pa/physics";

import { ohmsLaw } from "./ohms-law";

/**
 * The numbers on the Ohm's law print sheets (master plan, "Print sheets"), worked out by the
 * circuit solver on the approved bench (docs/content/ohms-law-brief.md), never typed in
 * (AGENTS.md rule 1). The meters' own resistances are in, so the sheet shows what the class will
 * see: the line meets the V axis a millivolt or so below E.
 */

/** The sheet's number in the Physics Anatomy series. */
export const OHMS_LAW_SHEET_NUMBER = "PA-002";

export interface OhmsLawSheet {
  /** Two dry cells in series: emf, V, and internal resistance, Ω. */
  emf: number;
  internalResistance: number;
  /** The fixed resistor R, Ω; the wire PQ, Ω and m. */
  resistor: number;
  wireResistance: number;
  wireLength: number;
  /** The meters: least count and full scale, A and V. */
  ammeter: { resolution: number; max: number };
  voltmeter: { resolution: number; max: number };
  /** The jockey positions the question sets, PJ in m. */
  positions: readonly number[];
  /** The true readings with the jockey off the wire, and at each position: V in V (x), I in A (y). */
  noContact: { x: number; y: number };
  points: { pj: number; x: number; y: number }[];
  /** The best line through the jockey readings: slope (A V⁻¹), where it meets the V axis (V), r (Ω). */
  slope: number;
  intercept: number;
  r: number;
  /** The volts lost inside the cells at the last position, I r, V. */
  lostVolts: number;
}

export function ohmsLawSheet(): OhmsLawSheet {
  const E = ohmsLaw;
  const read = (jockey: number | undefined) => {
    const r = terminalPdReadings({
      emf: E.cell.emf,
      internalResistance: E.cell.internalResistance,
      resistor: E.resistor,
      wireResistance: E.wire.resistance,
      wireLength: E.wire.length,
      ammeterResistance: E.ammeter.resistance,
      voltmeterResistance: E.voltmeter.resistance,
      jockey,
      keyClosed: true,
    });
    return { x: r.voltage, y: r.current, cell: r.cellCurrent };
  };
  const points = E.jockeyPositions.map((pj) => ({ pj, ...read(pj) }));
  const fit = fitLine(points);
  const last = points.at(-1)!;
  return {
    emf: E.cell.emf,
    internalResistance: E.cell.internalResistance,
    resistor: E.resistor,
    wireResistance: E.wire.resistance,
    wireLength: E.wire.length,
    ammeter: { resolution: E.ammeter.resolution, max: E.ammeter.scale![1] },
    voltmeter: { resolution: E.voltmeter.resolution, max: E.voltmeter.scale![1] },
    positions: E.jockeyPositions,
    noContact: (({ x, y }) => ({ x, y }))(read(undefined)),
    points: points.map(({ pj, x, y }) => ({ pj, x, y })),
    slope: fit.slope,
    intercept: -fit.intercept / fit.slope,
    r: -1 / fit.slope,
    lostVolts: E.cell.emf - last.x,
  };
}
