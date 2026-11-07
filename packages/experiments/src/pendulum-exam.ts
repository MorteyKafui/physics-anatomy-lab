import type { Finding } from "@pa/analysis";
import { gFromPeriod } from "@pa/physics";

/**
 * Exam mode for the simple pendulum (master plan, "Exam mode"): the WASSCE hour with the guide's
 * time split, a marking rubric, and likely follow-up questions.
 *
 * The rubric's marks and the follow-up questions were drafted from the WASSCE rules the lab
 * already checks, to the plan's totals (tabulation about 10–12, graph about 8), and approved by
 * the physics reviewer with the pull request that added them. Changes need that approval again
 * (AGENTS.md rule 1). */

/** The guide's split of the hour, in minutes. */
export const EXAM_PARTS = [
  { id: "reading", minutes: 5 },
  { id: "diagram", minutes: 5 },
  { id: "setup", minutes: 5 },
  { id: "performing", minutes: 15 },
  { id: "tabulation", minutes: 5 },
  { id: "graph", minutes: 10 },
  { id: "part-b", minutes: 10 },
  { id: "calculations", minutes: 5 },
] as const;
export type ExamPart = (typeof EXAM_PARTS)[number]["id"];

export const EXAM_MINUTES = EXAM_PARTS.reduce((n, p) => n + p.minutes, 0);
const MINUTE = 60_000;

/** Where the clock stands: time left, the part the guide expects now, and time left in it. */
export function examClock(startedAt: number, now: number) {
  const elapsed = Math.max(0, now - startedAt);
  const left = Math.max(0, EXAM_MINUTES * MINUTE - elapsed);
  let end = 0;
  for (const [i, p] of EXAM_PARTS.entries()) {
    end += p.minutes * MINUTE;
    if (elapsed < end) return { left, part: i, partLeft: end - elapsed, over: false };
  }
  return { left: 0, part: EXAM_PARTS.length - 1, partLeft: 0, over: true };
}

/** Everything the rubric looks at, worked out from the handed-in attempt. */
export interface ExamFacts {
  /** Every part on the bench, in its right place. */
  assembled: boolean;
  threadInCork: boolean;
  /** Distinct lengths timed. */
  lengths: number;
  /** A table with readings in it: without one, the tabulation marks cannot be earned. */
  tabulated: boolean;
  /** The table's findings (no "good" ones), and the columns they point at. */
  table: readonly Finding[];
  columns: readonly { id: string; symbol: string }[];
  /** Whether any point is plotted, T² is against l, a line and a triangle are drawn. */
  plotted: boolean;
  tSquaredAgainstL: boolean;
  line: boolean;
  triangle: boolean;
  graph: readonly Finding[];
  /** Answers written, and the findings on them. */
  slope: boolean;
  g: boolean;
  analysis: readonly Finding[];
  /** Precautions the student wrote. */
  precautions: number;
}

export interface Mark {
  id: string;
  got: number;
  of: number;
  /** Why marks were lost: a message key under exam.lost, and its params. */
  lost?: { key: string; params?: Record<string, string | number> };
}

export interface MarkedSection {
  id: "diagram" | "tabulation" | "graph" | "calculations";
  got: number;
  of: number;
  items: Mark[];
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

/** Mark a handed-in script against the draft rubric. Pure. 24 marks in all. */
export function markScript(f: ExamFacts): { sections: MarkedSection[]; got: number; of: number } {
  const on = (symbol: string) => {
    const ids = new Set(f.columns.filter((c) => c.symbol === symbol).map((c) => c.id));
    return f.table.filter((x) => x.rule === "table-derived-arithmetic" && ids.has(x.column ?? ""));
  };
  const derived = (id: string, symbol: string): Mark => {
    if (!f.columns.some((c) => c.symbol === symbol))
      return { id, got: 0, of: 2, lost: { key: "noColumn", params: { symbol } } };
    const n = rows(on(symbol));
    const got = Math.max(0, 2 - n);
    return got === 2
      ? { id, got, of: 2 }
      : { id, got, of: 2, lost: { key: "rows", params: { n } } };
  };
  const ruled = (...ids: string[]) => f.graph.filter((x) => ids.includes(x.rule));

  const sections: MarkedSection[] = [
    {
      id: "diagram",
      of: 2,
      got: 0,
      items: [
        all("setup", 1, f.assembled, { key: "setup" }),
        all("cork", 1, f.threadInCork, { key: "cork" }),
      ],
    },
    {
      id: "tabulation",
      of: 10,
      got: 0,
      items: !f.tabulated
        ? ["readings", "headings", "decimals", "period", "square"].map((id) => ({
            id,
            got: 0,
            of: 2,
            lost: { key: "noTable" },
          }))
        : [
            f.lengths >= 5
              ? { id: "readings", got: 2, of: 2 }
              : {
                  id: "readings",
                  got: f.lengths >= 3 ? 1 : 0,
                  of: 2,
                  lost: { key: "lengths", params: { n: f.lengths } },
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
              "decimals",
            ),
            derived("period", "T"),
            derived("square", "T²"),
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
            all("axes", 1, f.tSquaredAgainstL, { key: "axes" }),
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
      of: 4,
      got: 0,
      items: [
        all("slope", 1, f.slope && !f.analysis.some((x) => x.column === "slope"), {
          key: f.slope ? "answer" : "noAnswer",
        }),
        all("g", 1, f.g && !f.analysis.some((x) => x.column === "g"), {
          key: f.g ? "answer" : "noAnswer",
        }),
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

/** Follow-up questions, with answers worked out from the physics where they need numbers. */
export function followUps(g: number) {
  // The length whose small-swing period is 2.00 s: l = g T² ⁄ 4π², from g = 4π² l ⁄ T².
  const period = 2;
  const length = g / gFromPeriod(1, period);
  return [
    { id: "small-angle", params: {} },
    { id: "seconds", params: { T: period.toFixed(2), g: g.toFixed(2), l: length.toFixed(3) } },
    { id: "mass", params: {} },
  ] as const;
}
