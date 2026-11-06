import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CORRECT_ASSEMBLY } from "@pa/experiments";

import {
  BENCH_VIEWBOX,
  lensViewBox,
  Magnifier,
  PendulumBench,
  slotPoint,
  SNAP_RADIUS,
  snapSlot,
} from "../src";

const draw = (angle: number, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(PendulumBench, { angle, stopwatchSeconds: 0, label: "Fig. 1", ...extra }),
  );

/** The bob is the 13-unit circle filled with the accent. */
function bobCentre(svg: string) {
  const m = svg.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="13" fill="var\(--pa-accent-fill\)"/);
  if (!m) throw new Error("no bob drawn");
  return { x: Number(m[1]), y: Number(m[2]) };
}

describe("the pendulum bench figure", () => {
  test("at rest, the bob hangs on the mark below the pivot", () => {
    expect(bobCentre(draw(0))).toEqual({ x: 300, y: 322 });
  });

  test("a positive angle swings the bob to the right, on a thread of fixed length", () => {
    const angle = (8 * Math.PI) / 180;
    const bob = bobCentre(draw(angle));
    expect(bob.x).toBeGreaterThan(300);
    expect(Math.hypot(bob.x - 300, bob.y - 148)).toBeCloseTo(174, 6);
  });

  test("is labelled for screen readers and shows a demonstration count when asked", () => {
    expect(draw(0)).toContain('role="img" aria-label="Fig. 1"');
    expect(draw(0, { markLabel: "1" })).toContain(">1</text>");
  });

  test("uses figure tones and theme roles, never its own colours (AGENTS.md rule 3)", () => {
    const svg = draw(0.1);
    expect(svg.match(/#[0-9a-fA-F]{3,6}\b/g)).toBeNull();
  });
});

describe("building on the bench", () => {
  test("an empty bench draws no parts; each placed part appears", () => {
    const empty = draw(0, { assembly: {} });
    expect(empty).not.toContain("data-part");
    const some = draw(0, { assembly: { base: "bench", rod: "base-socket" } });
    expect(some).toContain('data-part="base"');
    expect(some).toContain('data-part="rod"');
    expect(some).not.toContain('data-part="bob"');
  });

  test("a thread tied round the clamp hangs from the arm, not the cork", () => {
    const wrong = { ...CORRECT_ASSEMBLY, thread: "clamp-arm" as const };
    const bob = bobCentre(draw(0, { assembly: wrong }));
    expect(bob).toEqual({ x: slotPoint("clamp-arm").x, y: slotPoint("clamp-arm").y + 174 });
  });

  test("lights the slots a part can go to", () => {
    const svg = draw(0, { assembly: {}, lit: ["bench", "bench-corner"] });
    expect(svg).toContain('data-bench-slot="bench"');
    expect(svg).toContain('data-bench-slot="bench-corner"');
  });

  test("a dropped part snaps to the nearest open slot within reach, or not at all", () => {
    const cork = slotPoint("cork");
    const arm = slotPoint("clamp-arm");
    const both = ["cork", "clamp-arm"] as const;
    expect(snapSlot({ x: cork.x + 5, y: cork.y + 5 }, both, CORRECT_ASSEMBLY)).toBe("cork");
    expect(snapSlot({ x: arm.x - 3, y: arm.y }, both, CORRECT_ASSEMBLY)).toBe("clamp-arm");
    expect(snapSlot({ x: 20, y: 20 }, both, CORRECT_ASSEMBLY)).toBeUndefined();
    expect(snapSlot({ x: cork.x, y: cork.y + SNAP_RADIUS + 1 }, ["cork"], {})).toBeUndefined();
  });
});

describe("the magnifier", () => {
  test("shows a smaller part of the figure, centred where it is held", () => {
    expect(lensViewBox({ x: 300, y: 141 }, 3, 132)).toBe("278 119 44 44");
  });

  test("redraws the live figure inside a round lens, hidden from screen readers", () => {
    const html = renderToStaticMarkup(
      createElement(Magnifier, {
        at: { x: 210, y: 230 },
        figure: BENCH_VIEWBOX,
        children: (viewBox: string) =>
          createElement(PendulumBench, { angle: 0, stopwatchSeconds: 0, viewBox }),
      }),
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('viewBox="188 208 44 44"');
    expect(html).toContain("left:34.28");
    expect(html.match(/#[0-9a-fA-F]{3,6}\b/g)).toBeNull();
  });
});

describe("the length of the thread", () => {
  test("is drawn to scale: a 1.000 m pendulum hangs 1.25 times as far as 0.800 m", () => {
    const short = bobCentre(draw(0));
    const long = bobCentre(draw(0, { length: 1 }));
    expect((long.y - 148) / (short.y - 148)).toBeCloseTo(1.25, 9);
  });
});
