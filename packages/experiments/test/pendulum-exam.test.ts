import { describe, expect, test } from "bun:test";
import type { Finding } from "@pa/analysis";

import { EXAM_MINUTES, examClock, followUps, markScript, type ExamFacts } from "../src";

const perfect: ExamFacts = {
  assembled: true,
  threadInCork: true,
  lengths: 5,
  tabulated: true,
  table: [],
  columns: [
    { id: "l", symbol: "l" },
    { id: "t", symbol: "t" },
    { id: "T", symbol: "T" },
    { id: "T2", symbol: "T²" },
  ],
  plotted: true,
  tSquaredAgainstL: true,
  line: true,
  triangle: true,
  graph: [],
  slope: true,
  g: true,
  analysis: [],
  precautions: 2,
};
const finding = (rule: string, extra: Partial<Finding> = {}): Finding => ({
  rule,
  severity: "error",
  skill: "tabulation",
  key: rule,
  ...extra,
});

describe("the exam's hour", () => {
  test("is the guide's split: 5, 5, 5, 15, 5, 10, 10 and 5 minutes", () => {
    expect(EXAM_MINUTES).toBe(60);
    expect(examClock(0, 0)).toEqual({ left: 3_600_000, part: 0, partLeft: 300_000, over: false });
    // 18 min 48 s in: Performing (from 15 to 30 minutes), 11 min 12 s left in it.
    const c = examClock(0, (18 * 60 + 48) * 1000);
    expect(c.part).toBe(3);
    expect(c.partLeft).toBe((11 * 60 + 12) * 1000);
    expect(c.left).toBe((41 * 60 + 12) * 1000);
    expect(examClock(0, 61 * 60_000)).toEqual({ left: 0, part: 7, partLeft: 0, over: true });
  });
});

describe("the draft rubric", () => {
  test("gives a script with nothing wrong all 24 marks", () => {
    const m = markScript(perfect);
    expect([m.got, m.of]).toEqual([24, 24]);
    expect(m.sections.map((s) => [s.id, s.of])).toEqual([
      ["diagram", 2],
      ["tabulation", 10],
      ["graph", 8],
      ["calculations", 4],
    ]);
  });

  test("takes marks for what is wrong, and says why", () => {
    const m = markScript({
      ...perfect,
      threadInCork: false,
      lengths: 3,
      table: [
        finding("table-derived-arithmetic", { column: "T", rows: ["r4", "r5"] }),
        finding("table-heading-unit"),
      ],
      graph: [finding("graph-scale-small", { skill: "graph" })],
      triangle: false,
      precautions: 1,
    });
    const item = (s: string, i: string) =>
      m.sections.find((x) => x.id === s)!.items.find((x) => x.id === i)!;
    expect(item("diagram", "cork")).toMatchObject({ got: 0, lost: { key: "cork" } });
    expect(item("tabulation", "readings")).toMatchObject({ got: 1, lost: { params: { n: 3 } } });
    expect(item("tabulation", "headings").got).toBe(1);
    expect(item("tabulation", "period")).toMatchObject({ got: 0, lost: { params: { n: 2 } } });
    expect(item("graph", "scale").got).toBe(1);
    expect(item("graph", "triangle")).toMatchObject({ got: 0, lost: { key: "noTriangle" } });
    expect(item("calculations", "precautions").got).toBe(1);
    expect(m.got).toBe(24 - 1 - 1 - 1 - 2 - 1 - 2 - 1);
  });

  test("a script with no table earns none of the tabulation marks, however clean it looks", () => {
    const m = markScript({ ...perfect, tabulated: false });
    expect(m.sections.find((s) => s.id === "tabulation")!.got).toBe(0);
    expect(m.got).toBe(14);
  });

  test("a script with no graph loses the graph's 8 marks, never more", () => {
    const m = markScript({ ...perfect, plotted: false });
    expect(m.sections.find((s) => s.id === "graph")!.got).toBe(0);
    expect(m.got).toBe(16);
  });
});

describe("the follow-up questions", () => {
  test("work out the length of a 2.00 s pendulum from the physics: l = gT² ⁄ 4π²", () => {
    const seconds = followUps(9.81).find((q) => q.id === "seconds")!;
    expect(Number(seconds.params.l)).toBeCloseTo((9.81 * 4) / (4 * Math.PI ** 2), 3);
    expect(seconds.params.l).toBe("0.994");
  });
});
