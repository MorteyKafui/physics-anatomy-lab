import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PendulumBench } from "../src";

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
