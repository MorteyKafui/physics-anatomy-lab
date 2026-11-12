import type { Finding } from "@pa/analysis";

import { lensSheet } from "./converging-lens-sheets";
import type { Mark, MarkedSection } from "./pendulum-exam";

/**
 * Exam mode for the converging lens (master plan, "Exam mode"): the same WASSCE hour and sections
 * as the other practicals, with this practical's marking rubric and its part (b) questions.
 *
 * The rubric's marks and the questions are a draft for the physics reviewer (AGENTS.md rule 1),
 * drawn from the rules the lab already checks, to the plan's totals (tabulation about 10–12,
 * graph about 8). 25 marks in all: set-up 2, tabulation 10, graph 8, calculations 5.
 */

/** Everything the rubric looks at, worked out from the handed-in attempt. */
export interface LensExamFacts {
  /** No reading taken with the gauze off the lens's axis, or from a holder's edge. */
  coaxial: boolean;
  centreMarks: boolean;
  /** Distinct object distances read, and the readings taken with the image still blurred. */
  distances: number;
  blurred: number;
  /** A table with readings in it: without one, the tabulation marks cannot be earned. */
  tabulated: boolean;
  /** The table's findings (no "good" ones), and the ids of its formula columns (1/u, 1/v). */
  table: readonly Finding[];
  reciprocalColumns: readonly string[];
  /** Whether any point is plotted, the graph is 1/v against 1/u, a line is drawn. */
  plotted: boolean;
  rightGraph: boolean;
  line: boolean;
  /** How many of the line's two intercepts fall on the sheet, where they can be read: 0, 1 or 2. */
  intercepts: number;
  graph: readonly Finding[];
  /** Answers written, and the findings on them. */
  m1: boolean;
  m2: boolean;
  f: boolean;
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

/** Mark a handed-in converging lens script against the draft rubric. Pure. 25 marks in all. */
export function markLensScript(f: LensExamFacts): {
  sections: MarkedSection[];
  got: number;
  of: number;
} {
  const ruled = (...ids: string[]) => f.graph.filter((x) => ids.includes(x.rule));
  const reciprocals = f.table.filter(
    (x) => x.rule === "table-derived-arithmetic" && f.reciprocalColumns.includes(x.column ?? ""),
  );
  const reciprocalsMark: Mark =
    f.reciprocalColumns.length < 2
      ? { id: "reciprocals", got: 0, of: 2, lost: { key: "noReciprocals" } }
      : twoLess("reciprocals", rows(reciprocals), "rows");
  const noTable = (id: string, of: number): Mark => ({
    id,
    got: 0,
    of,
    lost: { key: "noTable" },
  });
  const answered = (id: "m1" | "m2" | "f") =>
    all(id, 1, f[id] && !f.analysis.some((x) => x.column === id), {
      key: f[id] ? "answer" : "noAnswer",
    });

  const sections: MarkedSection[] = [
    {
      id: "diagram",
      of: 2,
      got: 0,
      items: [
        all("coaxial", 1, f.coaxial, { key: "coaxial" }),
        all("centreMarks", 1, f.centreMarks, { key: "centreMarks" }),
      ],
    },
    {
      id: "tabulation",
      of: 10,
      got: 0,
      items: !f.tabulated
        ? [
            noTable("distances", 2),
            noTable("sharp", 2),
            noTable("headings", 2),
            noTable("decimals", 2),
            noTable("reciprocals", 2),
          ]
        : [
            f.distances >= 5
              ? { id: "distances", got: 2, of: 2 }
              : {
                  id: "distances",
                  got: f.distances >= 3 ? 1 : 0,
                  of: 2,
                  lost: { key: "distances", params: { n: f.distances } },
                },
            twoLess("sharp", f.blurred, "blurred"),
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
              "ruleDecimals",
            ),
            reciprocalsMark,
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
            { id: "intercepts", got: 0, of: 2, lost: { key: "noGraph" } },
          ]
        : [
            all("axes", 1, f.rightGraph, { key: "axesLens" }),
            byFindings("scale", ruled("graph-scale-small", "graph-off-sheet"), "scale"),
            byFindings("points", ruled("graph-misplotted", "graph-points-missing"), "points"),
            all(
              "line",
              1,
              f.line &&
                ruled("graph-line-slope", "graph-line-unbalanced", "graph-line-mean").length === 0,
              { key: f.line ? "lineFit" : "noLine" },
            ),
            f.line && f.rightGraph
              ? f.intercepts === 2
                ? { id: "intercepts", got: 2, of: 2 }
                : {
                    id: "intercepts",
                    got: f.intercepts,
                    of: 2,
                    lost: { key: "intercepts", params: { n: f.intercepts } },
                  }
              : { id: "intercepts", got: 0, of: 2, lost: { key: "noLine" } },
          ],
    },
    {
      id: "calculations",
      of: 5,
      got: 0,
      items: [
        answered("m1"),
        answered("m2"),
        answered("f"),
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
 * Part (b): the follow-up questions the brief sets (lens properties, f from one u and v, and
 * m = v ⁄ f − 1), with every number worked out from the approved lens, never typed in. As an
 * exam's part (b) does, they use the thin-lens formula.
 */
export function lensFollowUps() {
  const s = lensSheet();
  const cm = (m: number) => (m * 100).toFixed(1);
  const f = s.focalLength;
  const one = s.points[2]!;
  const first = s.points[0]!;
  const fromOne = 1 / (1 / one.u + 1 / one.thin);
  return [
    {
      id: "one-reading",
      params: { u: cm(one.u), v: cm(one.thin), f: cm(fromOne) },
    },
    {
      id: "magnification",
      params: {
        u: cm(first.u),
        v: cm(first.thin),
        f: cm(f),
        m: (first.thin / f - 1).toFixed(2),
      },
    },
    { id: "no-image", params: { f: cm(f) } },
  ] as const;
}
