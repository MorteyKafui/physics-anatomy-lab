import { runRules } from "@pa/analysis";
import { replay, type Attempt, type LabEvent } from "@pa/engine";
import { imageDistance } from "@pa/physics";
import { describe, expect, test } from "bun:test";

import {
  asPinsReading,
  correctPinsBench,
  decidePinsBench,
  initialPinsBench,
  lensPins,
  lensWorld,
  lineUpAt,
  PINS_PROCEDURE_RULES,
  pinsBenchProjection,
  pinsReadingData,
  pinsView,
  type PinsBenchCommand,
  type PinsBenchState,
} from "../src";

const attempt: Attempt = {
  id: "a1",
  experimentId: lensPins.id,
  mode: "guided",
  seed: 424242,
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_000_000,
  formatVersion: 1,
};
const world = lensWorld(attempt.seed);
const ARCMIN = lensPins.view.acuity;

function run(commands: PinsBenchCommand[]) {
  let b = initialPinsBench(attempt);
  const events: LabEvent[] = [];
  const refusals: string[] = [];
  commands.forEach((c, i) => {
    const d = decidePinsBench(b, c);
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
      b = pinsBenchProjection.apply(b, e);
    }
  });
  return { b, events, refusals };
}

/** A reading of the bench as it stands, x and y to the millimetre, from the centre marks. */
const read = (b: PinsBenchState, readFrom: "centre" | "edge" = "centre") => {
  const data = pinsReadingData(b, {
    x: Number(((b.lens - b.object) * 100).toFixed(1)),
    y: Number(((b.pin - b.lens) * 100).toFixed(1)),
    readFrom,
  })!;
  return asPinsReading({ id: `r${Math.round(b.pin * 1e4)}${readFrom}`, data })!;
};
const rules = (bs: { b: PinsBenchState; from?: "edge" }[]) =>
  runRules(PINS_PROCEDURE_RULES, { readings: bs.map(({ b, from }) => read(b, from)) }).map(
    (f) => f.rule,
  );

describe("the two-pin bench", () => {
  test("starts with the object pin's tip off the axis, to be set level", () => {
    const b = initialPinsBench(attempt);
    expect(b.object).toBeLessThan(b.lens);
    expect(b.lens).toBeLessThan(b.pin);
    expect(b.objectTip).toBeGreaterThan(lensPins.tipTolerance);
  });

  test("replays to the same bench from its events, and refuses what a bench would", () => {
    const { b, events, refusals } = run([
      { type: "set-tip", pin: "object", to: 0 },
      { type: "move", part: "pin", to: 0.85 },
      { type: "set-eye", to: 0.004 },
      { type: "move", part: "pin", to: 1.2 },
      { type: "move", part: "lens", to: 0.105 },
      { type: "set-tip", pin: "search", to: 0.05 },
    ]);
    expect(refusals).toEqual(["off-the-rule", "holders-cross", "out-of-reach"]);
    expect(replay(pinsBenchProjection, attempt, events)).toEqual(b);
    expect([b.objectTip, b.pin, b.eye]).toEqual([0, 0.85, 0.004]);
  });
});

describe("the view through the lens", () => {
  test("no parallax at the pin when the bench is set right, near the thin-lens image", () => {
    for (const x of lensPins.objectDistances) {
      const v = pinsView(world, correctPinsBench(world, x));
      if (v.kind !== "image") throw new Error("no image");
      expect(v.clear).toBe(true);
      expect(v.left).toBeLessThanOrEqual(ARCMIN);
      expect(v.tipGap).toBe(0);
      expect(Math.abs(v.y - imageDistance(x, world.focalLength)) / v.y).toBeLessThan(0.025);
    }
  });

  test("the image is inverted: the tips meet only with the search pin's tip at −m times the object's", () => {
    const right = correctPinsBench(world, 0.3);
    const tipped = { ...right, objectTip: 0.002 };
    const v = pinsView(world, tipped);
    if (v.kind !== "image") throw new Error("no image");
    expect(v.tipGap).toBeCloseTo(v.magnification * 0.002, 12);
    const met = pinsView(world, { ...tipped, pinTip: -v.magnification * 0.002 });
    expect(met.kind === "image" && met.tipGap).toBeLessThan(1e-12);
  });

  test("inside the focal length there is no real image to find", () => {
    expect(pinsView(world, { ...correctPinsBench(world, 0.3), lens: 0.22 }).kind).toBe("no-image");
  });
});

describe("no parallax, as the eye view shows it (decision 12)", () => {
  test("is reachable at every x for every lens, and a millimetre's press either way cannot jump it", () => {
    for (const seed of [1, 2, 3, 7, 99, 987654]) {
      const w = lensWorld(seed);
      for (const x of lensPins.objectDistances) {
        const b = { ...correctPinsBench(w, x), world: w };
        const at = (mm: number) => pinsView(w, { ...b, pin: b.pin + mm / 1000 });
        for (const mm of [-1, 0, 1]) {
          const v = at(mm);
          expect(v.kind === "image" && v.clear, `seed ${seed}, x = ${x} m, ${mm} mm`).toBe(true);
        }
        const far = at(8);
        expect(far.kind === "image" && far.clear).toBe(false);
      }
    }
  });

  test("where the views line up is short of the thin-lens image, by the lens's aberration", () => {
    for (const x of lensPins.objectDistances) {
      const v = imageDistance(x, world.focalLength);
      const at = lineUpAt(world, x, 0);
      expect(at).toBeLessThan(v * 1.01);
      expect(at).toBeGreaterThan(v * 0.95);
    }
  });
});

describe("the mistakes", () => {
  test("a careful reading at each distance raises none", () => {
    expect(
      rules(lensPins.objectDistances.map((x) => ({ b: { ...correctPinsBench(world, x), world } }))),
    ).toEqual([]);
  });

  test("the eye off the axis: the place moves nearer the lens, by the model's own amount", () => {
    const right = correctPinsBench(world, 0.2);
    const offEye = { ...right, eye: 0.005 };
    const v = pinsView(world, offEye);
    if (v.kind !== "image") throw new Error("no image");
    const b = { ...offEye, pin: offEye.lens + v.at, world };
    const findings = runRules(PINS_PROCEDURE_RULES, { readings: [read(b)] });
    const f = findings.find((x) => x.rule === "pins-eye-off-axis")!;
    expect(f.params).toMatchObject({ mm: 5 });
    expect(Number(f.params!.cm)).toBeGreaterThan(0.5);
  });

  test("tips not level, parallax left, and readings from the edge", () => {
    const right = { ...correctPinsBench(world, 0.3), world };
    expect(rules([{ b: { ...right, objectTip: 0.003 } }])).toEqual(["pins-tips-off-axis"]);
    expect(rules([{ b: { ...right, pin: right.pin - 0.02 } }])).toEqual(["pins-parallax-left"]);
    expect(rules([{ b: right, from: "edge" }])).toEqual(["pins-read-from-edge"]);
  });
});

describe("a reading", () => {
  test("cannot be taken with no real image behind the lens, and is not one without its numbers", () => {
    const b = { ...correctPinsBench(world, 0.3), lens: 0.22, world };
    expect(pinsReadingData(b, { x: 12, y: 50 })).toBeUndefined();
    expect(asPinsReading({ id: "r1", data: { x: 20 } })).toBeUndefined();
  });
});
