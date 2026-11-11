import type { Finding } from "@pa/analysis";

import { ohmsLawSheet } from "./ohms-law-sheets";
import type { Mark, MarkedSection } from "./pendulum-exam";

/**
 * Exam mode for Ohm's law and the potentiometer (master plan, "Exam mode"): the same WASSCE hour
 * and sections as the pendulum, with this practical's marking rubric and its part (b) questions.
 *
 * The rubric's marks and the questions are a draft for the physics reviewer (AGENTS.md rule 1),
 * drawn from the rules the lab already checks, to the plan's totals (tabulation about 10–12,
 * graph about 8). 25 marks in all: diagram 2, tabulation 10, graph 8, calculations 5.
 */

/** Everything the rubric looks at, worked out from the handed-in attempt. */
export interface OhmsLawExamFacts {
  /** The circuit as the diagram has it, and the voltmeter across the cells. */
  wired: boolean;
  voltmeterAcross: boolean;
  /** Distinct jockey positions read, and whether a reading was taken with it off the wire. */
  positions: number;
  noContact: boolean;
  /** The key was opened between readings: no stretch closed longer than the limit. */
  keyOpened: boolean;
  /** A table with readings in it: without one, the tabulation marks cannot be earned. */
  tabulated: boolean;
  /** The table's findings (no "good" ones), and the ids of its mean columns. */
  table: readonly Finding[];
  meanColumns: readonly string[];
  /** Whether any point is plotted, I is against V, a line and a triangle are drawn. */
  plotted: boolean;
  iAgainstV: boolean;
  line: boolean;
  triangle: boolean;
  graph: readonly Finding[];
  /** Answers written, and the findings on them. */
  slope: boolean;
  E: boolean;
  r: boolean;
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

/** Mark a handed-in Ohm's law script against the draft rubric. Pure. 25 marks in all. */
export function markOhmsLawScript(f: OhmsLawExamFacts): {
  sections: MarkedSection[];
  got: number;
  of: number;
} {
  const ruled = (...ids: string[]) => f.graph.filter((x) => ids.includes(x.rule));
  const means = f.table.filter(
    (x) =>
      ["table-derived-arithmetic", "table-mean-decimals"].includes(x.rule) &&
      f.meanColumns.includes(x.column ?? ""),
  );
  const meansMark: Mark =
    f.meanColumns.length === 0
      ? { id: "means", got: 0, of: 2, lost: { key: "noMeans" } }
      : (() => {
          const n = rows(means);
          const got = Math.max(0, 2 - n);
          return got === 2
            ? { id: "means", got, of: 2 }
            : { id: "means", got, of: 2, lost: { key: "rows", params: { n } } };
        })();
  const noTable = (id: string, of: number): Mark => ({
    id,
    got: 0,
    of,
    lost: { key: "noTable" },
  });
  const answered = (id: "slope" | "E" | "r") =>
    all(id, 1, f[id] && !f.analysis.some((x) => x.column === id), {
      key: f[id] ? "answer" : "noAnswer",
    });

  const sections: MarkedSection[] = [
    {
      id: "diagram",
      of: 2,
      got: 0,
      items: [
        all("circuit", 1, f.wired, { key: "circuit" }),
        all("voltmeterAcross", 1, f.voltmeterAcross, { key: "voltmeterAcross" }),
      ],
    },
    {
      id: "tabulation",
      of: 10,
      got: 0,
      items: !f.tabulated
        ? [
            noTable("positions", 2),
            noTable("noContact", 1),
            noTable("headings", 2),
            noTable("decimals", 2),
            noTable("means", 2),
            noTable("keyOpened", 1),
          ]
        : [
            f.positions >= 5
              ? { id: "positions", got: 2, of: 2 }
              : {
                  id: "positions",
                  got: f.positions >= 3 ? 1 : 0,
                  of: 2,
                  lost: { key: "positions", params: { n: f.positions } },
                },
            all("noContact", 1, f.noContact, { key: "noContact" }),
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
              "meterDecimals",
            ),
            meansMark,
            all("keyOpened", 1, f.keyOpened, { key: "keyOpened" }),
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
            all("axes", 1, f.iAgainstV, { key: "axesIV" }),
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
        answered("slope"),
        answered("E"),
        answered("r"),
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
 * Part (b): the follow-up questions, with every number in the answers worked out by the circuit
 * solver on the approved bench (ohmsLawSheet), never typed in.
 */
export function ohmsLawFollowUps() {
  const s = ohmsLawSheet();
  const last = s.points.at(-1)!;
  const lost = s.emf - last.x;
  const f2 = (v: number) => v.toFixed(2);
  return [
    {
      id: "lost-volts",
      params: {
        pj: (last.pj * 100).toFixed(0),
        E: s.emf.toFixed(1),
        I: f2(last.y),
        V: f2(last.x),
        lost: f2(lost),
        r: f2(lost / last.y),
      },
    },
    {
      id: "no-contact",
      params: {
        E: s.emf.toFixed(1),
        I: f2(s.noContact.y),
        V: f2(s.noContact.x),
        lost: f2(s.emf - s.noContact.x),
      },
    },
    { id: "constantan", params: {} },
  ] as const;
}
