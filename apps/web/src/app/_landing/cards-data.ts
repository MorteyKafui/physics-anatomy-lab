import {
  benchPeriod,
  convergingLens,
  correctBench,
  correctMixturesBench,
  lensWorld,
  methodOfMixtures,
  mixturesPeak,
  ohmsLaw,
  ohmsLawWorld,
  trueReadings,
} from "@pa/experiments";
import { imageDistance } from "@pa/physics";

/**
 * The experiment cards' readings (landing page brief, decisions 4 and 5), worked out on the server
 * when the page is built, so the lab's solvers never ship with the landing page. Each card runs
 * its experiment as the lab does, on one bench: the same seed always builds the same apparatus,
 * so a screenshot can be checked against the lab.
 */
export const CARD_SEED = 1;
const G = 9.81;

/** Three values a card's feed shows in one row, already formatted. */
export type FeedRow = readonly [string, string, string];

export interface CardsData {
  pendulum: { rows: FeedRow[]; bars: { l: number; T: number; T2: number }[] };
  circuit: { rows: FeedRow[]; badge: string; resistor: number; positions: number };
  lens: { rows: FeedRow[]; badge: string; focalLengthCm: number };
  mixtures: { rows: FeedRow[]; badges: string[]; calorimeterKg: number };
}

/** The pendulum card's six lengths, m: the ones its bars stand for. */
export const PENDULUM_LENGTHS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

export function cardsData(): CardsData {
  const bars = PENDULUM_LENGTHS.map((l) => {
    const T = benchPeriod(G, l);
    return { l, T, T2: T * T };
  });

  const world = ohmsLawWorld(CARD_SEED);
  const circuitRows = ohmsLaw.jockeyPositions.map((pj): FeedRow => {
    const r = trueReadings(world, correctBench(pj));
    if (!r.ok) throw new Error("The card's circuit must be the lab's safe, correct one");
    return [
      `PJ ${(pj * 100).toFixed(1)} cm`,
      `I ${r.current.toFixed(2)} A`,
      `V ${r.voltage.toFixed(2)} V`,
    ];
  });

  const f = lensWorld(CARD_SEED).focalLength;
  const lensRows = convergingLens.objectDistances.map((u): FeedRow => {
    const v = imageDistance(u, f);
    const fromUV = (u * v) / (u + v);
    return [
      `u ${(u * 100).toFixed(1)} cm`,
      `v ${(v * 100).toFixed(1)} cm`,
      `f ${(fromUV * 100).toFixed(1)} cm`,
    ];
  });

  const hot = methodOfMixtures.hot;
  const peaks = methodOfMixtures.volumes.map(
    (cold) => mixturesPeak(correctMixturesBench(cold)).temperature,
  );

  return {
    pendulum: {
      bars,
      rows: bars.map((b) => [
        `l ${b.l.toFixed(3)} m`,
        `T ${b.T.toFixed(3)} s`,
        `T² ${b.T2.toFixed(2)} s²`,
      ]),
    },
    circuit: {
      rows: circuitRows,
      resistor: world.resistor,
      positions: ohmsLaw.jockeyPositions.length,
      // The cells' emf, the quantity the student finds from the graph of V against I.
      badge: `E = ${world.emf.toFixed(2)} V`,
    },
    lens: { rows: lensRows, focalLengthCm: f * 100, badge: `f = ${(f * 100).toFixed(1)} cm` },
    mixtures: {
      rows: methodOfMixtures.volumes.map((cold, i): FeedRow => [
        `cold ${cold} cm³`,
        `θ ${peaks[i]!.toFixed(1)} °C`,
        `hot ${hot.volume} cm³`,
      ]),
      badges: peaks.map((p) => `θ = ${p.toFixed(1)} °C`),
      calorimeterKg: methodOfMixtures.calorimeter.mass,
    },
  };
}
