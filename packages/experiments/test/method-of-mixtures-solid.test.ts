import { runRules } from "@pa/analysis";
import { replay, type Attempt, type LabEvent } from "@pa/engine";
import { describe, expect, test } from "bun:test";

import {
  asSolidReading,
  cFromReadings,
  correctSolidBench,
  decideSolid,
  hotSolid as H,
  initialSolidBench,
  SOLID_PROCEDURE_RULES,
  solidAtEntry,
  solidPeak,
  solidProjection,
  solidReadingData,
  solidThermometer,
  solidWorld,
  type SolidBench,
  type SolidCommand,
} from "../src";

const attempt: Attempt = {
  id: "a1",
  experimentId: H.id,
  mode: "guided",
  seed: 424242,
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_000_000,
  formatVersion: 1,
};

function run(commands: SolidCommand[], a = attempt) {
  let b = initialSolidBench(a);
  const events: LabEvent[] = [];
  const refusals: string[] = [];
  commands.forEach((c, i) => {
    const d = decideSolid(b, c);
    if (!d.ok) {
      refusals.push(d.reason);
      return;
    }
    for (const ne of d.events) {
      const e: LabEvent = {
        ...ne,
        id: `e${events.length + 1}`,
        attemptId: a.id,
        seq: events.length + 1,
        device: "d",
        at: a.createdAt + (i + 1) * 1000,
      };
      events.push(e);
      b = solidProjection.apply(b, e);
    }
  });
  return { b, events, refusals };
}

/** A run as the student records it: weighed, the start and the highest at time t, to 0.1 °C. */
function reading(b: SolidBench, t: number, id = "r1", thermometerAngle = 0) {
  const round = (c: number) => Math.round(c * 10) / 10;
  const weighed = {
    solid: H.solidMass,
    empty: 50,
    filled: 50 + (b.water ?? 0),
  };
  const data = solidReadingData(
    { ...b, weighed },
    { start: 28, highest: round(solidThermometer(b, t)), t, thermometerAngle },
  )!;
  return asSolidReading({ id, data })!;
}
const findings = (b: SolidBench, t: number, angle = 0) =>
  runRules(SOLID_PROCEDURE_RULES, { readings: [reading(b, t, "r1", angle)] });
const copper = { metal: H.metals[0] };
const careful = () => correctSolidBench(copper);
const atPeak = (b: SolidBench) => solidPeak(b).at;

describe("the solid", () => {
  test("is the same metal for the same seed, and every one of the four turns up", () => {
    expect(solidWorld(attempt.seed)).toEqual(solidWorld(attempt.seed));
    const seen = new Set(Array.from({ length: 200 }, (_, i) => solidWorld(i * 7919 + 13).metal.id));
    expect([...seen].sort()).toEqual(["aluminium", "brass", "copper", "iron"]);
  });

  test("cools in the air on the way across: 0.6 °C in 10 s, 1.8 °C in 30 s", () => {
    expect(solidAtEntry(0)).toBe(100);
    expect(100 - solidAtEntry(10)).toBeCloseTo(0.6, 1);
    expect(100 - solidAtEntry(30)).toBeCloseTo(1.8, 1);
  });
});

describe("the bench", () => {
  test("replays to the same bench from its events, and refuses what a bench would", () => {
    const { b, events, refusals } = run([
      { type: "transfer", after: 0, shaken: true, gently: true },
      { type: "weigh", what: "filled" },
      { type: "weigh", what: "solid" },
      { type: "weigh", what: "empty" },
      { type: "fill", to: 50 },
      { type: "weigh", what: "empty" },
      { type: "weigh", what: "filled" },
      { type: "cover", on: true },
      { type: "stir", on: true },
      { type: "transfer", after: 4, shaken: true, gently: true },
      { type: "stir", on: false },
    ]);
    expect(refusals).toEqual([
      "fill-first",
      "not-on-the-balance",
      "not-on-the-balance",
      "already-in",
    ]);
    expect(replay(solidProjection, attempt, events)).toEqual(b);
    expect(b.weighed).toEqual({ solid: 100, empty: 50, filled: 100 });
    expect(b.transfer).toEqual({ after: 4, shaken: true, gently: true });
    const emptied = run([
      { type: "weigh", what: "solid" },
      { type: "fill", to: 50 },
      { type: "empty" },
    ]).b;
    expect([emptied.water, emptied.weighed]).toEqual([null, { solid: 100 }]);
  });
});

describe("c, done carefully", () => {
  test("for each metal comes out 1 to 3% low, read at the highest, about 79 s in", () => {
    for (const metal of H.metals) {
      const b = correctSolidBench({ metal });
      const r = reading(b, atPeak(b));
      const c = cFromReadings(r);
      expect(atPeak(b)).toBeGreaterThan(70);
      expect(atPeak(b)).toBeLessThan(90);
      expect(c / metal.c).toBeGreaterThan(0.97);
      expect(c / metal.c).toBeLessThan(1);
      expect(findings(b, atPeak(b))).toEqual([]);
    }
  });
});

describe("the seven mistakes, each with its effect on c", () => {
  const caught = (b: SolidBench, t = atPeak(b), angle = 0) => findings(b, t, angle);

  test("read at 30 s, before the highest", () => {
    const [f] = caught(careful(), 30);
    expect(f?.rule).toBe("solid-read-before-peak");
    expect(f?.params?.celsius).toBeGreaterThan(0.1);
  });

  test("30 s in the air: the solid goes in at 98.2 °C and c is about 3% low", () => {
    const b = { ...careful(), transfer: { after: 30, shaken: true, gently: true } };
    const [f] = caught(b);
    expect(f?.rule).toBe("solid-slow-transfer");
    expect(f?.params?.entry).toBe(98.2);
    expect(f?.params?.percent).toBeLessThan(-2);
    expect(f?.params?.percent).toBeGreaterThan(-5);
  });

  test("not shaken: a gram of boiling water goes in, and c is about 11% high", () => {
    const b = { ...careful(), transfer: { after: 0, shaken: false, gently: true } };
    const [f] = caught(b);
    expect(f?.rule).toBe("solid-water-carried");
    expect(f?.params?.percent).toBeGreaterThan(8);
    expect(f?.params?.percent).toBeLessThan(13);
  });

  test("dropped in: 3 g splashes out, and c is about 6% high", () => {
    const b = { ...careful(), transfer: { after: 0, shaken: true, gently: false } };
    const [f] = caught(b);
    expect(f?.rule).toBe("solid-splashed");
    expect(f?.params?.percent).toBeGreaterThan(3);
    expect(f?.params?.percent).toBeLessThan(8);
  });

  test("not stirred: the highest comes at 8 minutes, and c is about 9% low", () => {
    const b = { ...careful(), stirring: false };
    const [f] = caught(b);
    expect(f?.rule).toBe("solid-not-stirred");
    expect(f?.params?.minutes).toBe(8);
    expect(f?.params?.percent).toBeLessThan(-5);
  });

  test("the lid off: c is about 7% low", () => {
    const b = { ...careful(), covered: false };
    const [f] = caught(b);
    expect(f?.rule).toBe("solid-not-covered");
    expect(f?.params?.percent).toBeLessThan(-5);
  });

  test("the thermometer read at 20°", () => {
    const [f] = caught(careful(), undefined, 20);
    expect(f?.rule).toBe("solid-thermometer-at-angle");
    expect(f?.params?.celsius).toBe(0.2);
  });

  test("read every minute as the book asks, the highest minute reading is no mistake", () => {
    // Aluminium's highest comes between the 1- and 2-minute readings, 0.1 °C above both.
    const b = correctSolidBench({ metal: H.metals[3] });
    const minute = [60, 120, 180].map((t) => ({ t, at: solidThermometer(b, t) }));
    const best = minute.reduce((x, m) => (m.at > x.at ? m : x));
    const data = solidReadingData(
      { ...b, weighed: { solid: 100, empty: 50, filled: 100 } },
      { start: 28, highest: Math.round(best.at * 10) / 10, t: best.t, last: 180 },
    )!;
    const r = asSolidReading({ id: "r1", data })!;
    expect(runRules(SOLID_PROCEDURE_RULES, { readings: [r] })).toEqual([]);
  });

  test("a few seconds to move it, shaken and lowered in, is no mistake", () => {
    const b = { ...careful(), transfer: { after: 5, shaken: true, gently: true } };
    expect(caught(b)).toEqual([]);
  });
});
