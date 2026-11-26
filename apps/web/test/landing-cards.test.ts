import { describe, expect, test } from "bun:test";

import {
  benchPeriod,
  convergingLens,
  correctBench,
  correctMixturesBench,
  correctSolidBench,
  hotSolid,
  lensPins,
  lensWorld,
  methodOfMixtures,
  mixturesPeak,
  ohmsLaw,
  ohmsLawWorld,
  solidPeak,
  solidWorld,
  trueReadings,
} from "@pa/experiments";
import { imageDistance } from "@pa/physics";

import { bentoData, CARD_SEED, cardsData, PENDULUM_LENGTHS } from "../src/app/_landing/cards-data";

const data = cardsData();

describe("the experiment cards' readings come from the lab's models (brief, decision 4)", () => {
  test("pendulum: the exact period at each length, and its square", () => {
    data.pendulum.bars.forEach((b, i) => {
      expect(b.l).toBe(PENDULUM_LENGTHS[i]!);
      expect(b.T).toBe(benchPeriod(9.81, b.l));
      expect(b.T2).toBe(b.T * b.T);
    });
  });

  test("Ohm's law: the seeded bench, solved at each of the lab's jockey positions", () => {
    const world = ohmsLawWorld(CARD_SEED);
    expect(data.circuit.rows).toHaveLength(ohmsLaw.jockeyPositions.length);
    ohmsLaw.jockeyPositions.forEach((pj, i) => {
      const r = trueReadings(world, correctBench(pj));
      if (!r.ok) throw new Error("unsafe bench");
      expect(data.circuit.rows[i]).toEqual([
        `PJ ${(pj * 100).toFixed(1)} cm`,
        `I ${r.current.toFixed(2)} A`,
        `V ${r.voltage.toFixed(2)} V`,
      ]);
    });
    expect(data.circuit.badge).toBe(`E = ${world.emf.toFixed(2)} V`);
  });

  test("lens: the seeded lens's image at each of the lab's object distances", () => {
    const f = lensWorld(CARD_SEED).focalLength;
    convergingLens.objectDistances.forEach((u, i) => {
      expect(data.lens.rows[i]![1]).toBe(`v ${(imageDistance(u, f) * 100).toFixed(1)} cm`);
    });
    expect(data.lens.badge).toBe(`f = ${(f * 100).toFixed(1)} cm`);
  });

  test("mixtures: the calorimeter's highest temperature for each of the lab's cold volumes", () => {
    methodOfMixtures.volumes.forEach((cold, i) => {
      const peak = mixturesPeak(correctMixturesBench(cold)).temperature;
      expect(data.mixtures.rows[i]![1]).toBe(`θ ${peak.toFixed(1)} °C`);
    });
  });

  test("the bento's graph gives back the g the periods were worked out with, near enough", () => {
    const { graph } = bentoData();
    // The periods include the 8° swing's small correction, so g comes out a little under 9.81.
    expect(graph.g).toBeGreaterThan(9.7);
    expect(graph.g).toBeLessThan(9.81);
    expect(graph.points).toHaveLength(PENDULUM_LENGTHS.length);
  });
});

describe("the hero bench's two pins and hot solid readings come from the lab's models", () => {
  test("two pins: the image of each object distance the question sets, and f from u and v", () => {
    const f = lensWorld(CARD_SEED).focalLength;
    expect(data.pins.rows).toHaveLength(lensPins.objectDistances.length);
    lensPins.objectDistances.forEach((u, i) => {
      const v = imageDistance(u, f);
      expect(data.pins.rows[i]).toEqual([
        `u ${(u * 100).toFixed(1)} cm`,
        `v ${(v * 100).toFixed(1)} cm`,
        `f ${(((u * v) / (u + v)) * 100).toFixed(1)} cm`,
      ]);
    });
  });

  test("a hot solid: the highest temperature for each metal, and the seeded bench's badge", () => {
    expect(data.solid.rows).toHaveLength(hotSolid.metals.length);
    hotSolid.metals.forEach((metal, i) => {
      const peak = solidPeak(correctSolidBench({ metal })).temperature;
      expect(data.solid.rows[i]![1]).toBe(`θ ${peak.toFixed(1)} °C`);
    });
    const seeded = solidPeak(correctSolidBench(solidWorld(CARD_SEED))).temperature;
    expect(data.solid.badge).toBe(`θ = ${seeded.toFixed(1)} °C`);
  });
});
