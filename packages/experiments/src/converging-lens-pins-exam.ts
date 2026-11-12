import type { Finding } from "@pa/analysis";

import { pinsSheet } from "./converging-lens-pins-sheets";
import type { Mark, MarkedSection } from "./pendulum-exam";

/**
 * Exam mode for the converging lens with two pins (master plan, "Exam mode"): the same WASSCE
 * hour and sections as the other practicals, with this practical's rubric and part (b).
 *
 * The rubric's marks and the questions are a draft for the physics reviewer (AGENTS.md rule 1),
 * drawn from the rules the lab already checks. 25 marks in all: set-up 2, tabulation 10, graph 8,
 * calculations 5.
 */

/** Everything the rubric looks at, worked out from the handed-in attempt. */
export interface PinsExamFacts {
  /** The tips level with the lens's axis, and every reading with the eye on the axis. */
  tipsLevel: boolean;
  eyeOnAxis: boolean;
  /** Distinct object distances read, and the readings taken with parallax still there. */
  distances: number;
  parallaxLeft: number;
  /** A table with readings in it, its findings (no "good" ones), and its formula columns. */
  tabulated: boolean;
  table: readonly Finding[];
  formulaColumns: readonly string[];
  /** Whether any point is plotted, the graph is xy against (x + y), a line and a triangle drawn. */
  plotted: boolean;
  rightGraph: boolean;
  line: boolean;
  triangle: boolean;
  graph: readonly Finding[];
  /** Answers written, and the findings on them. */
  slope: boolean;
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

/** Mark a handed-in two-pin script against the draft rubric. Pure. 25 marks in all. */
export function markPinsScript(f: PinsExamFacts): {
  sections: MarkedSection[];
  got: number;
  of: number;
} {
  const ruled = (...ids: string[]) => f.graph.filter((x) => ids.includes(x.rule));
  const worked = f.table.filter(
    (x) => x.rule === "table-derived-arithmetic" && f.formulaColumns.includes(x.column ?? ""),
  );
  const workedMark: Mark =
    f.formulaColumns.length < 2
      ? { id: "products", got: 0, of: 2, lost: { key: "noProducts" } }
      : twoLess("products", rows(worked), "rows");
  const noTable = (id: string, of: number): Mark => ({ id, got: 0, of, lost: { key: "noTable" } });
  const answered = (id: "slope" | "f", of: number) =>
    all(id, of, f[id] && !f.analysis.some((x) => x.column === id), {
      key: f[id] ? "answer" : "noAnswer",
    });

  const sections: MarkedSection[] = [
    {
      id: "diagram",
      of: 2,
      got: 0,
      items: [
        all("tipsLevel", 1, f.tipsLevel, { key: "tipsLevel" }),
        all("eyeOnAxis", 1, f.eyeOnAxis, { key: "eyeOnAxis" }),
      ],
    },
    {
      id: "tabulation",
      of: 10,
      got: 0,
      items: !f.tabulated
        ? [
            noTable("distances", 2),
            noTable("noParallax", 2),
            noTable("headings", 2),
            noTable("decimals", 2),
            noTable("products", 2),
          ]
        : [
            f.distances >= 4
              ? { id: "distances", got: 2, of: 2 }
              : {
                  id: "distances",
                  got: f.distances >= 3 ? 1 : 0,
                  of: 2,
                  lost: { key: "distances", params: { n: f.distances } },
                },
            twoLess("noParallax", f.parallaxLeft, "parallaxLeft"),
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
            workedMark,
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
            all("axes", 1, f.rightGraph, { key: "axesPins" }),
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
        answered("slope", 2),
        answered("f", 1),
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
 * Part (b): the follow-up questions the book sets with this practical (the simple microscope,
 * what focal length means, and f from the graph at a given xy), with every number worked from the
 * approved lens, never typed in.
 */
export function pinsFollowUps() {
  const s = pinsSheet();
  const at = s.points[1]!;
  // A value of xy on the line, from the sheet's own reading at the second object distance.
  const xy = Math.round(at.x * at.y * 1e4);
  // (x + y) as read off the line, to the rule's 0.1 cm; f worked from that, as the answer shows it.
  const sum = (xy / (s.slope * 100)).toFixed(1);
  return [
    { id: "from-graph", params: { xy, sum, f: (xy / Number(sum)).toFixed(1) } },
    { id: "focal-length", params: {} },
    { id: "microscope", params: { f: (s.focalLength * 100).toFixed(1) } },
  ] as const;
}
