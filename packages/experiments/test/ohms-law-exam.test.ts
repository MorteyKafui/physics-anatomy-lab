import type { Finding } from "@pa/analysis";
import { describe, expect, test } from "bun:test";

import { markOhmsLawScript, ohmsLawFollowUps, ohmsLawSheet, type OhmsLawExamFacts } from "../src";

/** A careful candidate's script: everything the rubric looks for. */
const careful: OhmsLawExamFacts = {
  wired: true,
  voltmeterAcross: true,
  positions: 5,
  noContact: true,
  keyOpened: true,
  tabulated: true,
  table: [],
  meanColumns: ["Im", "Vm"],
  plotted: true,
  iAgainstV: true,
  line: true,
  triangle: true,
  graph: [],
  slope: true,
  E: true,
  r: true,
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

const item = (m: ReturnType<typeof markOhmsLawScript>, id: string) =>
  m.sections.flatMap((s) => s.items).find((i) => i.id === id)!;

describe("the Ohm's law rubric", () => {
  test("a careful script earns all 25 marks: diagram 2, tabulation 10, graph 8, calculations 5", () => {
    const m = markOhmsLawScript(careful);
    expect(m.of).toBe(25);
    expect(m.got).toBe(25);
    expect(m.sections.map((s) => [s.id, s.of])).toEqual([
      ["diagram", 2],
      ["tabulation", 10],
      ["graph", 8],
      ["calculations", 5],
    ]);
    // Every section's items add up to its total.
    for (const s of m.sections) expect(s.items.reduce((n, i) => n + i.of, 0)).toBe(s.of);
  });

  test("a voltmeter wired in series loses the circuit mark and the voltmeter mark", () => {
    const m = markOhmsLawScript({ ...careful, wired: false, voltmeterAcross: false });
    expect(m.sections[0]!.got).toBe(0);
    expect(item(m, "voltmeterAcross").lost?.key).toBe("voltmeterAcross");
  });

  test("three positions read earn one of the two reading marks", () => {
    const m = markOhmsLawScript({ ...careful, positions: 3 });
    expect(item(m, "positions")).toMatchObject({ got: 1, of: 2, lost: { params: { n: 3 } } });
  });

  test("the key left closed costs a mark", () => {
    expect(item(markOhmsLawScript({ ...careful, keyOpened: false }), "keyOpened").got).toBe(0);
  });

  test("a mean worked out wrongly in one row costs one mark; a finding on another column does not", () => {
    const m = markOhmsLawScript({
      ...careful,
      table: [
        finding("table-derived-arithmetic", { column: "Im", rows: ["r2"] }),
        finding("table-derived-arithmetic", { column: "PJ", rows: ["r3"] }),
      ],
    });
    expect(item(m, "means")).toMatchObject({ got: 1, of: 2 });
  });

  test("no table: none of the tabulation marks", () => {
    const m = markOhmsLawScript({ ...careful, tabulated: false });
    expect(m.sections[1]!.got).toBe(0);
    expect(m.sections[1]!.items.every((i) => i.lost?.key === "noTable")).toBe(true);
  });

  test("V against I, not I against V, loses the axes mark only", () => {
    const m = markOhmsLawScript({ ...careful, iAgainstV: false });
    expect(item(m, "axes").lost?.key).toBe("axesIV");
    expect(m.got).toBe(24);
  });

  test("a wrong r loses its mark; E and the slope keep theirs", () => {
    const m = markOhmsLawScript({
      ...careful,
      analysis: [finding("analysis-value", { skill: "analysis", column: "r" })],
    });
    expect([item(m, "slope").got, item(m, "E").got, item(m, "r").got]).toEqual([1, 1, 0]);
  });
});

describe("the part (b) questions", () => {
  const s = ohmsLawSheet();
  const q: Record<string, Record<string, string>> = Object.fromEntries(
    ohmsLawFollowUps().map((x) => [x.id, x.params as Record<string, string>]),
  );

  test("the lost volts at PJ = 80 cm are E − V, and r = lost volts ⁄ I comes out near 1.5 Ω", () => {
    const last = s.points.at(-1)!;
    expect(q["lost-volts"]).toMatchObject({ pj: "80", I: last.y.toFixed(2), V: last.x.toFixed(2) });
    expect(Number(q["lost-volts"]!.lost)).toBeCloseTo(s.emf - last.x, 2);
    expect(Number(q["lost-volts"]!.r)).toBeCloseTo(1.5, 1);
  });

  test("with the jockey off the wire, the cells still drive a current, so V is below E", () => {
    expect(Number(q["no-contact"]!.I)).toBeGreaterThan(0);
    expect(Number(q["no-contact"]!.V)).toBeLessThan(s.emf);
  });
});
