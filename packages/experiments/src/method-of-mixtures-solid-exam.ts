import type { Finding } from "@pa/analysis";
import { heatCapacity } from "@pa/physics";

import type { Mark, MarkedSection } from "./pendulum-exam";

/**
 * Exam mode for the method of mixtures with a hot solid (master plan, "Exam mode"): the same WASSCE
 * hour and sections as the other practicals, with this practical's rubric and part (b).
 *
 * The rubric's marks and the questions are a draft for the physics reviewer (AGENTS.md rule 1),
 * drawn from the rules the lab already checks. 25 marks in all: set-up 2, tabulation 10, graph 6,
 * calculations 7. The graph is a curve read for its highest point, so it has no line or triangle
 * to mark, and the calculation carries the marks a slope would have.
 */

/** Everything the rubric looks at, worked out from the handed-in attempt. */
export interface SolidExamFacts {
  /** The lid on and the water stirred, for the run handed in. */
  covered: boolean;
  stirred: boolean;
  /** The solid, the calorimeter empty and with its water, each weighed. */
  weighed: number;
  /** Mistakes in moving the solid across: too slow, not shaken, dropped in. */
  transfer: number;
  /** Readings taken after the start, and whether the last came after the highest. */
  minutes: number;
  pastHighest: boolean;
  /** A table with readings in it, and its findings (no "good" ones). */
  tabulated: boolean;
  table: readonly Finding[];
  /** Whether any point is plotted, and the graph is θ against t; its findings. */
  plotted: boolean;
  rightGraph: boolean;
  graph: readonly Finding[];
  /** Answers written, and the findings on them. */
  T: boolean;
  c: boolean;
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

/** Two marks, one off for each, none left after two. */
const twoLess = (id: string, n: number, lost: string): Mark =>
  n === 0
    ? { id, got: 2, of: 2 }
    : { id, got: Math.max(0, 2 - n), of: 2, lost: { key: lost, params: { n } } };

/** Mark a handed-in hot-solid script against the draft rubric. Pure. 25 marks in all. */
export function markSolidScript(f: SolidExamFacts): {
  sections: MarkedSection[];
  got: number;
  of: number;
} {
  const ruled = (...ids: string[]) => f.graph.filter((x) => ids.includes(x.rule));
  const noTable = (id: string, of: number): Mark => ({ id, got: 0, of, lost: { key: "noTable" } });
  const answered = (id: "T" | "c", of: number) =>
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
      items: [
        f.weighed >= 3
          ? { id: "weighed", got: 2, of: 2 }
          : {
              id: "weighed",
              got: f.weighed >= 2 ? 1 : 0,
              of: 2,
              lost: { key: "weighed", params: { n: f.weighed } },
            },
        twoLess("transfer", f.transfer, "transfer"),
        ...(!f.tabulated
          ? [noTable("minutes", 2), noTable("headings", 2), noTable("decimals", 2)]
          : [
              f.minutes >= 3 && f.pastHighest
                ? { id: "minutes", got: 2, of: 2 }
                : {
                    id: "minutes",
                    got: f.minutes >= 2 ? 1 : 0,
                    of: 2,
                    lost: {
                      key: f.pastHighest ? "minutes" : "stoppedEarly",
                      params: { n: f.minutes },
                    },
                  },
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
            ]),
      ],
    },
    {
      id: "graph",
      of: 6,
      got: 0,
      items: !f.plotted
        ? [
            { id: "axes", got: 0, of: 2, lost: { key: "noGraph" } },
            { id: "scale", got: 0, of: 2, lost: { key: "noGraph" } },
            { id: "points", got: 0, of: 2, lost: { key: "noGraph" } },
          ]
        : [
            all("axes", 2, f.rightGraph, { key: "axesSolid" }),
            byFindings("scale", ruled("graph-scale-small", "graph-off-sheet"), "scale"),
            byFindings("points", ruled("graph-misplotted", "graph-points-missing"), "points"),
          ],
    },
    {
      id: "calculations",
      of: 7,
      got: 0,
      items: [
        answered("T", 2),
        answered("c", 3),
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
 * Part (b): the follow-up questions the book sets with this practical (what heat capacity is, what
 * a specific heat capacity of 400 J kg⁻¹ K⁻¹ means, and the heat a piece of aluminium takes in
 * warming), with every number worked by packages/physics, never typed in.
 */
export function solidFollowUps() {
  const aluminium = { mass: 0.04, specificHeatCapacity: 900, temperature: 25 };
  const warmed = 75;
  const q = heatCapacity(aluminium) * (warmed - aluminium.temperature);
  return [
    { id: "heat-capacity", params: {} },
    { id: "meaning", params: { c: 400 } },
    {
      id: "aluminium",
      params: {
        m: aluminium.mass,
        c: aluminium.specificHeatCapacity,
        from: aluminium.temperature,
        to: warmed,
        rise: warmed - aluminium.temperature,
        q: q.toFixed(0),
      },
    },
  ] as const;
}
