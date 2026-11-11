import {
  fillDerived,
  formulaUnitFindings,
  GRAPH_RULES,
  parseTable,
  pointsFor,
  runRules,
  TABLE_RULES,
  toTableView,
} from "@pa/analysis";
import {
  answersProjection,
  coachProjection,
  graphProjection,
  replay,
  tableProjection,
  type Attempt,
  type LabEvent,
} from "@pa/engine";
import {
  asOhmsLawReading,
  benchProjection,
  keyIntervalsAt,
  keyLeftClosed,
  netsOf,
  OHMS_LAW_ANALYSIS_RULES,
  OHMS_LAW_PLOT,
  ohmsLawExpected,
  plotsIAgainstV,
  wiredRight,
  type OhmsLawExamFacts,
  type OhmsLawReading,
} from "@pa/experiments";

import { graphColumnsFor, graphView } from "../../graph-sheet";
import { ohmsLawReport } from "../report-content";

const SEVERE = new Set(["error", "warning"]);

/**
 * What the Ohm's law rubric looks at, from the run as it was handed in. In an exam the coach is
 * off and the help level is "on my own", so the table, graph and answers are the candidate's own.
 */
export function ohmsLawExamFacts(attempt: Attempt, events: readonly LabEvent[]): OhmsLawExamFacts {
  const state = replay(coachProjection, attempt, events);
  const bench = replay(benchProjection, attempt, events);
  const net = netsOf(bench.leads);
  const readings = state.readings
    .map(asOhmsLawReading)
    .filter((r): r is OhmsLawReading => r !== undefined);

  const table = replay(tableProjection, attempt, events);
  const shown = state.mode === "exam" ? table : fillDerived(table);
  const tableFindings = shown.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shown)),
          plot: OHMS_LAW_PLOT,
          spread: "PJ",
        }),
        ...formulaUnitFindings(table),
      ].filter((f) => SEVERE.has(f.severity))
    : [];

  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, OHMS_LAW_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const data = pointsFor(shown, columns.x, columns.y);
  const view = graphView(graph, data, columns, false, true);
  const graphFindings =
    data.length >= 2
      ? runRules(GRAPH_RULES, {
          sheet: view.sheet,
          symbols: {
            x: column(columns.x)?.symbol ?? columns.x,
            y: column(columns.y)?.symbol ?? columns.y,
          },
          data,
          plotted: view.plotted,
          line: view.line,
          triangle: view.triangle,
        }).filter((f) => SEVERE.has(f.severity))
      : [];

  const answers = replay(answersProjection, attempt, events);
  const units = { x: column(columns.x)?.unit ?? "", y: column(columns.y)?.unit ?? "" };
  const expected = ohmsLawExpected(view.triangle, view.line, columns, units, answers);
  const analysis = runRules(OHMS_LAW_ANALYSIS_RULES, { answers, expected }).filter((f) =>
    SEVERE.has(f.severity),
  );
  const written = (a: { value: string } | undefined) => (a?.value ?? "").trim() !== "";

  // The precautions are the candidate's own words in the report (left empty in an exam).
  const report = ohmsLawReport(attempt, events);
  const precautions = report.sections.find((s) => s.id === "precautions")?.text ?? "";
  const last = events.at(-1)?.at ?? attempt.createdAt;

  return {
    wired: wiredRight(bench.leads),
    voltmeterAcross: net("V+") === net("cell+") && net("V-") === net("cell-"),
    positions: new Set(readings.map((r) => r.pj).filter((pj) => pj > 0)).size,
    noContact: readings.some((r) => r.pj === 0),
    keyOpened:
      keyLeftClosed.check({
        world: bench.world,
        keyIntervals: keyIntervalsAt(bench, last),
        scrapes: bench.scrapes,
      }).length === 0,
    tabulated:
      table.columns.length > 0 &&
      table.rows.some((row) => Object.values(row.cells).some((v) => v.trim() !== "")),
    table: tableFindings,
    meanColumns: table.columns.filter((c) => c.role === "mean").map((c) => c.id),
    plotted: view.plotted.length > 0,
    iAgainstV: plotsIAgainstV(columns),
    line: view.line !== undefined,
    triangle: view.triangle !== undefined,
    graph: graphFindings,
    slope: written(answers.slope),
    E: written(answers.E),
    r: written(answers.r),
    analysis,
    precautions: precautions.split("\n").filter((l) => l.trim() !== "").length,
  };
}
