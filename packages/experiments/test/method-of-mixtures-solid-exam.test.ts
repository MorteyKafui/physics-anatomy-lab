import type { Finding } from "@pa/analysis";
import { describe, expect, test } from "bun:test";

import {
  hotSolid as H,
  markSolidScript,
  SOLID_SHEET_NUMBER,
  solidFollowUps,
  solidSheet,
  type SolidExamFacts,
} from "../src";

const perfect: SolidExamFacts = {
  covered: true,
  stirred: true,
  weighed: 3,
  transfer: 0,
  minutes: 4,
  pastHighest: true,
  tabulated: true,
  table: [],
  plotted: true,
  rightGraph: true,
  graph: [],
  T: true,
  c: true,
  analysis: [],
  precautions: 2,
};

const finding = (rule: string, extra: Partial<Finding> = {}): Finding => ({
  rule,
  severity: "error",
  skill: "analysis",
  key: rule,
  ...extra,
});

describe("the hot-solid rubric", () => {
  test("gives a perfect script 25 of 25, in the four WASSCE sections", () => {
    const m = markSolidScript(perfect);
    expect([m.got, m.of]).toEqual([25, 25]);
    expect(m.sections.map((s) => [s.id, s.of])).toEqual([
      ["diagram", 2],
      ["tabulation", 10],
      ["graph", 6],
      ["calculations", 7],
    ]);
  });

  test("takes marks for the catalogue's mistakes: no lid, not stirred, a careless transfer", () => {
    const m = markSolidScript({ ...perfect, covered: false, stirred: false, transfer: 1 });
    expect(m.sections[0]!.got).toBe(0);
    expect(m.sections[1]!.items.find((i) => i.id === "transfer")).toMatchObject({
      got: 1,
      lost: { key: "transfer" },
    });
    expect(m.got).toBe(22);
  });

  test("marks stopping before the highest, and a missing weighing", () => {
    const m = markSolidScript({ ...perfect, pastHighest: false, minutes: 1, weighed: 2 });
    const tab = m.sections[1]!.items;
    expect(tab.find((i) => i.id === "minutes")).toMatchObject({
      got: 0,
      lost: { key: "stoppedEarly" },
    });
    expect(tab.find((i) => i.id === "weighed")).toMatchObject({ got: 1, lost: { key: "weighed" } });
  });

  test("gives the axes marks only for θ against t, and nothing for a graph not drawn", () => {
    expect(markSolidScript({ ...perfect, rightGraph: false }).sections[2]!.items[0]).toMatchObject({
      got: 0,
      lost: { key: "axesSolid" },
    });
    expect(markSolidScript({ ...perfect, plotted: false }).sections[2]!.got).toBe(0);
  });

  test("marks T and c on their own: a wrong T costs its own marks, not c's", () => {
    const m = markSolidScript({
      ...perfect,
      analysis: [finding("analysis-answers", { column: "T" })],
    });
    const calc = m.sections[3]!.items;
    expect(calc.find((i) => i.id === "T")).toMatchObject({ got: 0 });
    expect(calc.find((i) => i.id === "c")).toMatchObject({ got: 3 });
  });
});

describe("the hot-solid print sheets", () => {
  const s = solidSheet();

  test("are numbered in the series after the method of mixtures'", () => {
    expect(SOLID_SHEET_NUMBER).toBe("PA-006");
  });

  test("give every metal read every minute within 4% of its own c, the highest at about 79 s", () => {
    expect(s.metals.map((m) => m.metal.id)).toEqual(H.metals.map((m) => m.id));
    for (const m of s.metals) {
      expect(Math.abs(m.c / m.metal.c - 1)).toBeLessThan(0.04);
      expect(m.peak.at).toBeGreaterThan(70);
      expect(m.peak.at).toBeLessThan(90);
      expect(m.minutes[0]).toBe(28);
      // The highest minute reading is at 1 or 2 minutes, and they fall after it.
      expect(m.minutes.at(-1)!).toBeLessThan(Math.max(...m.minutes));
    }
  });
});

describe("part (b)", () => {
  test("works the aluminium's heat as m c (θ₂ − θ₁): 0.04 × 900 × 50 = 1800 J", () => {
    const [, , al] = solidFollowUps();
    expect(al.params.q).toBe("1800");
    expect(solidFollowUps().map((q) => q.id)).toEqual(["heat-capacity", "meaning", "aluminium"]);
  });
});
