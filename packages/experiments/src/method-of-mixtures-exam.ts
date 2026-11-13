import type { Finding } from "@pa/analysis";
import { finalTemperature, WATER_SPECIFIC_HEAT_CAPACITY } from "@pa/physics";

import { methodOfMixtures } from "./method-of-mixtures";
import { mixturesSheet } from "./method-of-mixtures-sheets";
import type { Mark, MarkedSection } from "./pendulum-exam";

/**
 * Exam mode for the method of mixtures (master plan, "Exam mode"): the same WASSCE hour and
 * sections as the other practicals, with this practical's rubric and part (b).
 *
 * The rubric's marks and the questions are a draft for the physics reviewer (AGENTS.md rule 1),
 * drawn from the rules the lab already checks. 25 marks in all: set-up 2, tabulation 10, graph 8,
 * calculations 5.
 */

/** Everything the rubric looks at, worked out from the handed-in attempt. */
export interface MixturesExamFacts {
  /** Every mixture with the lid on, and stirred. */
  covered: boolean;
  stirred: boolean;
  /** Distinct volumes read, and readings taken before the thermometer stopped rising. */
  volumes: number;
  early: number;
  /** A table with readings in it, its findings (no "good" ones), and its formula columns. */
  tabulated: boolean;
  table: readonly Finding[];
  formulaColumns: readonly string[];
  /** Whether any point is plotted, the graph is V against 1/T, a line and a triangle drawn. */
  plotted: boolean;
  rightGraph: boolean;
  line: boolean;
  triangle: boolean;
  graph: readonly Finding[];
  /** Answers written, and the findings on them. */
  slope: boolean;
  intercept: boolean;
  W: boolean;
  analysis: readonly Finding[];
  /** Precautions the student wrote. */
  precautions: number;
}

const all = (id: string, of: number, ok: boolean, lost?: Mark["lost"]): Mark =>
  ok ? { id, got: of, of } : { id, got: 0, of, ...(lost ? { lost } : {}) };

/** Two marks, one off for each finding, none left after two. */
const byFindings = (id: string, findings: readonly Finding[], lost: string): Mark => {
  const got = Math.max(0, 2 - findings.length);
  return got === 2
    ? { id, got, of: 2 }
    : { id, got, of: 2, lost: { key: lost, params: { n: findings.length } } };
};

const rows = (fs: readonly Finding[]) => new Set(fs.flatMap((f) => f.rows ?? [f.rule])).size;

/** Two marks, one off for each, none left after two. */
const twoLess = (id: string, n: number, lost: string): Mark =>
  n === 0
    ? { id, got: 2, of: 2 }
    : { id, got: Math.max(0, 2 - n), of: 2, lost: { key: lost, params: { n } } };

/** Mark a handed-in mixtures script against the draft rubric. Pure. 25 marks in all. */
export function markMixturesScript(f: MixturesExamFacts): {
  sections: MarkedSection[];
  got: number;
  of: number;
} {
  const ruled = (...ids: string[]) => f.graph.filter((x) => ids.includes(x.rule));
  const worked = f.table.filter(
    (x) => x.rule === "table-derived-arithmetic" && f.formulaColumns.includes(x.column ?? ""),
  );
  const inverseMark: Mark =
    f.formulaColumns.length < 1
      ? { id: "inverse", got: 0, of: 2, lost: { key: "noInverse" } }
      : twoLess("inverse", rows(worked), "rows");
  const noTable = (id: string, of: number): Mark => ({ id, got: 0, of, lost: { key: "noTable" } });
  const answered = (id: "slope" | "intercept" | "W", of: number) =>
    all(id, of, f[id] && !f.analysis.some((x) => x.column === id), {
      key: f[id] ? "answer" : "noAnswer",
    });

  const sections: MarkedSection[] = [
    {
      id: "diagram",
      of: 2,
      got: 0,
      items: [
        all("covered", 1, f.covered, { key: "covered" }),
        all("stirred", 1, f.stirred, { key: "stirred" }),
      ],
    },
    {
      id: "tabulation",
      of: 10,
      got: 0,
      items: !f.tabulated
        ? [
            noTable("volumes", 2),
            noTable("highest", 2),
            noTable("headings", 2),
            noTable("decimals", 2),
            noTable("inverse", 2),
          ]
        : [
            f.volumes >= 4
              ? { id: "volumes", got: 2, of: 2 }
              : {
                  id: "volumes",
                  got: f.volumes >= 3 ? 1 : 0,
                  of: 2,
                  lost: { key: "volumes", params: { n: f.volumes } },
                },
            twoLess("highest", f.early, "early"),
            byFindings(
              "headings",
              f.table.filter((x) => x.rule === "table-heading-unit"),
              "headings",
            ),
            byFindings(
              "decimals",
              f.table.filter((x) =>
                [
                  "table-precision-vs-instrument",
                  "table-inconsistent-decimals",
                  "table-unit-slip",
                ].includes(x.rule),
              ),
              "thermometerDecimals",
            ),
            inverseMark,
          ],
    },
    {
      id: "graph",
      of: 8,
      got: 0,
      items: !f.plotted
        ? [
            { id: "axes", got: 0, of: 1, lost: { key: "noGraph" } },
            { id: "scale", got: 0, of: 2, lost: { key: "noGraph" } },
            { id: "points", got: 0, of: 2, lost: { key: "noGraph" } },
            { id: "line", got: 0, of: 1, lost: { key: "noGraph" } },
            { id: "triangle", got: 0, of: 2, lost: { key: "noGraph" } },
          ]
        : [
            all("axes", 1, f.rightGraph, { key: "axesMixtures" }),
            byFindings("scale", ruled("graph-scale-small", "graph-off-sheet"), "scale"),
            byFindings("points", ruled("graph-misplotted", "graph-points-missing"), "points"),
            all(
              "line",
              1,
              f.line &&
                ruled("graph-line-slope", "graph-line-unbalanced", "graph-line-mean").length === 0,
              { key: f.line ? "lineFit" : "noLine" },
            ),
            f.triangle
              ? byFindings(
                  "triangle",
                  ruled(
                    "graph-triangle-small",
                    "graph-triangle-off-line",
                    "graph-triangle-on-point",
                  ),
                  "triangle",
                )
              : { id: "triangle", got: 0, of: 2, lost: { key: "noTriangle" } },
          ],
    },
    {
      id: "calculations",
      of: 5,
      got: 0,
      items: [
        answered("slope", 1),
        answered("intercept", 1),
        answered("W", 1),
        f.precautions >= 2
          ? { id: "precautions", got: 2, of: 2 }
          : {
              id: "precautions",
              got: f.precautions,
              of: 2,
              lost: { key: "precautions", params: { n: f.precautions } },
            },
      ],
    },
  ];
  for (const s of sections) s.got = s.items.reduce((n, i) => n + i.got, 0);
  return {
    sections,
    got: sections.reduce((n, s) => n + s.got, 0),
    of: sections.reduce((n, s) => n + s.of, 0),
  };
}

/**
 * Part (b): the follow-up questions the book sets with this practical (one mixing worked out by
 * hand, the vacuum flask, and the clinical thermometer), with every number worked from the
 * approved apparatus, never typed in.
 */
export function mixturesFollowUps() {
  const M = methodOfMixtures;
  const s = mixturesSheet();
  const W = Math.round(s.waterEquivalent * 10) / 10;
  const cold = M.volumes[0];
  const water = (grams: number, temperature: number) => ({
    mass: grams / 1000,
    specificHeatCapacity: WATER_SPECIFIC_HEAT_CAPACITY,
    temperature,
  });
  // The calorimeter as its water equivalent, at the cold water's temperature.
  const final = finalTemperature([water(M.hot.volume, M.hot.temperature), water(cold + W, M.room)]);
  return [
    {
      id: "one-mixing",
      params: {
        hot: M.hot.volume,
        hotT: M.hot.temperature.toFixed(0),
        cold,
        coldT: M.room.toFixed(0),
        W: W.toFixed(1),
        coldW: (cold + W).toFixed(1),
        total: (M.hot.volume + cold + W).toFixed(1),
        final: final.toFixed(1),
      },
    },
    { id: "flask", params: {} },
    { id: "clinical", params: {} },
  ] as const;
}
