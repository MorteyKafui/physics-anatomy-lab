import { runRules } from "@pa/analysis";
import { replay, type Attempt, type LabEvent } from "@pa/engine";
import { createRng } from "@pa/instruments";
import { finalTemperature } from "@pa/physics";
import { describe, expect, test } from "bun:test";

import {
  asMixturesReading,
  correctMixturesBench,
  decideMixtures,
  filledVolume,
  hotAtPour,
  initialMixturesBench,
  methodOfMixtures as M,
  MIXTURES_PROCEDURE_RULES,
  mixturesCalorimeter,
  mixturesPeak,
  mixturesProjection,
  mixturesReadingData,
  readThermometer,
  recordedTemperature,
  thermometerTruth,
  type MixturesBench,
  type MixturesCommand,
} from "../src";

const attempt: Attempt = {
  id: "a1",
  experimentId: M.id,
  mode: "guided",
  seed: 424242,
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_000_000,
  formatVersion: 1,
};

function run(commands: MixturesCommand[]) {
  let b = initialMixturesBench();
  const events: LabEvent[] = [];
  const refusals: string[] = [];
  commands.forEach((c, i) => {
    const d = decideMixtures(b, c);
    if (!d.ok) {
      refusals.push(d.reason);
      return;
    }
    for (const ne of d.events) {
      const e: LabEvent = {
        ...ne,
        id: `e${events.length + 1}`,
        attemptId: attempt.id,
        seq: events.length + 1,
        device: "d",
        at: attempt.createdAt + (i + 1) * 1000,
      };
      events.push(e);
      b = mixturesProjection.apply(b, e);
    }
  });
  return { b, events, refusals };
}

/** A row read off the bench: V as filled, the start, and the thermometer at t, all to 0.1 °C. */
function read(b: MixturesBench, t: number, id = "r1", thermometerAngle = 0) {
  const rng = createRng(7);
  const data = mixturesReadingData(b, {
    volume: 40,
    start: recordedTemperature(readThermometer({ ...b, pouredAfter: null }, 0, { rng })),
    highest: recordedTemperature(readThermometer(b, t, { rng, viewAngleDeg: thermometerAngle })),
    t,
    thermometerAngle,
  })!;
  return asMixturesReading({ id, data })!;
}
const findings = (b: MixturesBench, t: number, angle = 0) =>
  runRules(MIXTURES_PROCEDURE_RULES, { readings: [read(b, t, "r1", angle)] });
const careful = (v: number) => correctMixturesBench(v);

describe("the mixtures bench", () => {
  test("starts empty, uncovered and not stirred, for the student to set up", () => {
    const b = initialMixturesBench();
    expect([b.cold, b.hot, b.covered, b.stirring, b.pouredAfter]).toEqual([
      null,
      null,
      false,
      false,
      null,
    ]);
  });

  test("replays to the same bench from its events, and refuses what a bench would", () => {
    const { b, events, refusals } = run([
      { type: "pour", after: 0 },
      { type: "fill", vessel: "cold", to: 140 },
      { type: "fill", vessel: "cold", to: 40 },
      { type: "fill", vessel: "hot", to: 50, viewAngleDeg: 20 },
      { type: "cover", on: true },
      { type: "stir", on: true },
      { type: "pour", after: 3 },
      { type: "stir", on: false },
      { type: "fill", vessel: "cold", to: 60 },
    ]);
    expect(refusals).toEqual(["fill-both", "cylinder-holds", "already-poured", "already-poured"]);
    expect(replay(mixturesProjection, attempt, events)).toEqual(b);
    expect(b.cold).toBe(40);
    expect(b.hot).toBeCloseTo(50 - Math.tan((20 * Math.PI) / 180), 12);
    expect([b.covered, b.stirring, b.pouredAfter]).toEqual([true, true, 3]);
    const emptied = run([
      { type: "fill", vessel: "cold", to: 40 },
      { type: "fill", vessel: "hot", to: 50 },
      { type: "cover", on: true },
      { type: "pour", after: 0 },
      { type: "empty" },
    ]).b;
    expect([emptied.cold, emptied.hot, emptied.pouredAfter, emptied.covered]).toEqual([
      null,
      null,
      null,
      true,
    ]);
  });

  test("read from above, the cylinder is filled short of what it shows", () => {
    expect(filledVolume(40)).toBe(40);
    expect(filledVolume(40, 30)).toBeLessThan(40);
    expect(filledVolume(40, -30)).toBeGreaterThan(40);
  });
});

describe("the thermometer on the bench", () => {
  test("reads the cold water before the pour, and the heat model after it", () => {
    const b = careful(50);
    expect(thermometerTruth({ ...b, pouredAfter: null }, 0)).toBe(M.room);
    const ideal = finalTemperature([...mixturesCalorimeter(b).cold, mixturesCalorimeter(b).hot]);
    const peak = mixturesPeak(b);
    expect(peak.temperature).toBeLessThan(ideal);
    expect(ideal - peak.temperature).toBeLessThan(0.25);
    expect(thermometerTruth(b, peak.at)).toBeCloseTo(peak.temperature, 12);
  });

  test("done carefully at each volume, the rise is the brief's: 19.4 °C at 40 cm³ down to 14.7 °C at 70", () => {
    const rises = M.volumes.map((v) =>
      Number((mixturesPeak(careful(v)).temperature - M.room).toFixed(1)),
    );
    expect(rises).toEqual([19.4, 17.5, 16.0, 14.7]);
  });

  test("the hot water cools in the open beaker while it waits", () => {
    expect(hotAtPour(0)).toBe(65);
    expect(hotAtPour(30)).toBeLessThan(65);
    expect(hotAtPour(30)).toBeGreaterThan(63);
  });
});

describe("the mistakes, each with its real effect", () => {
  test("a careful run, read at its peak, square-on, has none", () => {
    const b = careful(40);
    expect(findings(b, mixturesPeak(b).at)).toEqual([]);
  });

  test("read at 30 s, before the peak: about 1 °C short", () => {
    const [f] = findings(careful(40), 30);
    expect(f?.rule).toBe("mixtures-read-before-peak");
    expect(f?.params?.celsius).toBeGreaterThan(0.8);
    expect(f?.params?.celsius).toBeLessThan(1.3);
    // Read just after the peak, as the thermometer begins to fall, is no mistake.
    const b = careful(40);
    expect(findings(b, mixturesPeak(b).at + 20)).toEqual([]);
  });

  test("not stirred: the highest reading is over 1 °C lower", () => {
    const b = { ...careful(40), stirring: false };
    const [f] = findings(b, mixturesPeak(b).at);
    expect(f?.rule).toBe("mixtures-not-stirred");
    expect(f?.params?.celsius).toBeGreaterThan(1);
  });

  test("the lid off: about 0.9 °C lower", () => {
    const b = { ...careful(40), covered: false };
    const [f] = findings(b, mixturesPeak(b).at);
    expect(f?.rule).toBe("mixtures-not-covered");
    expect(f?.params?.celsius).toBeGreaterThan(0.6);
    expect(f?.params?.celsius).toBeLessThan(1.2);
  });

  test("poured 30 s late: the hot water went in cooler, and the reading is lower", () => {
    const b = { ...careful(40), pouredAfter: 30 };
    const [f] = findings(b, mixturesPeak(b).at);
    expect(f?.rule).toBe("mixtures-slow-pour");
    expect(f?.params?.hot).toBeLessThan(65);
    expect(f?.params?.celsius).toBeGreaterThan(0.3);
    // A few seconds to carry it over is no mistake.
    const quick = { ...careful(40), pouredAfter: 5 };
    expect(findings(quick, mixturesPeak(quick).at)).toEqual([]);
  });

  test("the thermometer read at 20°, and the cylinder at 20°, are caught with their shifts", () => {
    const b = careful(40);
    const [t] = findings(b, mixturesPeak(b).at, 20);
    expect(t?.rule).toBe("mixtures-thermometer-at-angle");
    expect(t?.params?.celsius).toBe(0.2);
    const slanted = { ...b, coldAngle: 20 };
    const [c] = findings(slanted, mixturesPeak(slanted).at);
    expect(c?.rule).toBe("mixtures-cylinder-at-angle");
    expect(c?.params?.cm3).toBe(0.4);
  });
});
