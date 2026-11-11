import { runRules } from "@pa/analysis";
import { replay, type Attempt, type LabEvent } from "@pa/engine";
import { describe, expect, test } from "bun:test";

import {
  asLensReading,
  decideLensBench,
  HOLDER_GAP,
  initialLensBench,
  LENS_PROCEDURE_RULES,
  lensBenchProjection,
  lensReadingData,
  screenImage,
  type LensBenchCommand,
} from "../src";

const attempt: Attempt = {
  id: "a1",
  experimentId: "converging-lens",
  mode: "guided",
  seed: 424242,
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_000_000,
  formatVersion: 1,
};

/** Run commands through decide and the projection, one second apart. */
function run(commands: LensBenchCommand[]) {
  let b = initialLensBench(attempt);
  const events: LabEvent[] = [];
  const refusals: string[] = [];
  commands.forEach((c, i) => {
    const d = decideLensBench(b, c);
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
      b = lensBenchProjection.apply(b, e);
    }
  });
  return { b, events, refusals };
}

describe("the lens bench", () => {
  test("starts with the holders on the rule and the gauze off the lens's axis, to be set right", () => {
    const b = initialLensBench(attempt);
    expect(b.object).toBeLessThan(b.lens);
    expect(b.lens).toBeLessThan(b.screen);
    expect(Math.abs(b.offAxis)).toBeGreaterThan(0.003);
  });

  test("replays to the same bench from its events", () => {
    const { b, events } = run([
      { type: "set-height", to: 0 },
      { type: "move", part: "screen", to: 0.85 },
    ]);
    expect(replay(lensBenchProjection, attempt, events)).toEqual(b);
  });

  test("refuses a holder off the rule, holders passing each other, and the gauze out of reach", () => {
    const { refusals, b } = run([
      { type: "move", part: "screen", to: 1.2 },
      { type: "move", part: "lens", to: 0.1 + HOLDER_GAP / 2 },
      { type: "set-height", to: 0.05 },
    ]);
    expect(refusals).toEqual(["off-the-rule", "holders-cross", "gauze-out-of-reach"]);
    expect(b).toEqual(initialLensBench(attempt));
  });

  test("notes each object distance where the screen was moved with no image to find", () => {
    const { b } = run([
      { type: "move", part: "lens", to: 0.22 },
      { type: "move", part: "screen", to: 0.6 },
      { type: "move", part: "screen", to: 0.65 },
    ]);
    expect(b.noImageAt).toEqual([0.12]);
    expect(
      runRules(LENS_PROCEDURE_RULES, { readings: [], noImageAt: b.noImageAt }).map((f) => f.rule),
    ).toEqual(["lens-inside-focal-length"]);
  });
});

describe("a reading", () => {
  test("records the bench as it stood, and reads back as the mistake catalogue's reading", () => {
    const { b } = run([{ type: "set-height", to: 0 }]);
    const image = screenImage(b.world, b);
    const data = lensReadingData(b, { u: 20.0, v: 40.0 })!;
    expect(data).toMatchObject({ u: 20, v: 40, offAxis: 0, readFrom: "centre", viewAngleDeg: 0 });
    if (image.kind === "image") expect(data.blur).toBe(image.blur);
    expect(asLensReading({ id: "r1", data })).toMatchObject({ id: "r1", u: 20, v: 40 });
  });

  test("cannot be taken with no image on the screen", () => {
    const { b } = run([{ type: "move", part: "lens", to: 0.22 }]);
    expect(lensReadingData(b, { u: 12, v: 48 })).toBeUndefined();
  });

  test("is not a lens reading without its numbers", () => {
    expect(asLensReading({ id: "r1", data: { u: 20 } })).toBeUndefined();
  });
});
