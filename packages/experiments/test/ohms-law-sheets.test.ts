import { describe, expect, test } from "bun:test";

import { OHMS_LAW_SHEET_NUMBER, ohmsLawSheet } from "../src";

// The readings the brief lists for the approved bench (docs/content/ohms-law-brief.md), from the
// same solver the lab uses, with the meters' own resistances in.
const BRIEF = [
  { pj: 0.4, I: 0.606, V: 2.09 },
  { pj: 0.5, I: 0.659, V: 2.011 },
  { pj: 0.6, I: 0.723, V: 1.915 },
  { pj: 0.7, I: 0.8, V: 1.8 },
  { pj: 0.8, I: 0.895, V: 1.656 },
];

describe("the Ohm's law print sheet's numbers", () => {
  const s = ohmsLawSheet();

  test("are the brief's readings", () => {
    expect(s.points.map((p) => p.pj)).toEqual(BRIEF.map((b) => b.pj));
    s.points.forEach((p, i) => {
      expect(p.y).toBeCloseTo(BRIEF[i]!.I, 3);
      expect(p.x).toBeCloseTo(BRIEF[i]!.V, 3);
    });
    expect(s.noContact.y).toBeCloseTo(0.458, 3);
    expect(s.noContact.x).toBeCloseTo(2.312, 3);
  });

  test("give the brief's line: slope −0.667 A V⁻¹, r = 1.500 Ω, meeting the V axis at 2.999 V", () => {
    expect(s.slope).toBeCloseTo(-0.667, 3);
    expect(s.r).toBeCloseTo(1.5, 3);
    expect(s.intercept).toBeCloseTo(2.999, 3);
    // A millivolt or so below E: the voltmeter's own current.
    expect(s.emf - s.intercept).toBeGreaterThan(0);
    expect(s.emf - s.intercept).toBeLessThan(0.005);
  });

  test("the volts lost inside the cells at PJ = 80 cm are I r", () => {
    const last = s.points.at(-1)!;
    expect(s.lostVolts).toBeCloseTo(last.y * s.internalResistance, 2);
  });

  test("is the second sheet in the series", () => {
    expect(OHMS_LAW_SHEET_NUMBER).toBe("PA-002");
  });
});
