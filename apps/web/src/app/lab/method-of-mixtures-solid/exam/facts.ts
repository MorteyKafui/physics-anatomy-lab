import {
  fillDerived,
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
  asSolidReading,
  plotsThetaAgainstT,
  SOLID_ANALYSIS_RULES,
  SOLID_PLOT,
  solidExpected,
  solidProjection,
  solidReadBeforePeak,
  solidSlowTransfer,
  solidSplashed,
  solidWaterCarried,
  tabulatedRun,
  type SolidExamFacts,
  type SolidReading,
} from "@pa/experiments";

import { graphColumnsFor, graphView } from "../../graph-sheet";
import { solidReport } from "../report-content";

const SEVERE = new Set(["error", "warning"]);

/**
 * What the hot-solid rubric looks at, from the run as it was handed in. In an exam the coach is
 * off and the help level is "on my own", so the table, graph and answers are the candidate's own.
 */
export function solidExamFacts(attempt: Attempt, events: readonly LabEvent[]): SolidExamFacts {
  const state = replay(coachProjection, attempt, events);
  const bench = replay(solidProjection, attempt, events);
  const readings = state.readings
    .map(asSolidReading)
    .filter((r): r is SolidReading => r !== undefined);
  const run = tabulatedRun(readings);
  const handedIn = run ? [run] : [];
  const transfer = [solidSlowTransfer, solidWaterCarried, solidSplashed].filter(
    (rule) => rule.check({ readings: handedIn }).length > 0,
  ).length;

  const table = replay(tableProjection, attempt, events);
  const shown = state.mode === "exam" ? table : fillDerived(table);
  const tableFindings = shown.layout
    ? runRules(TABLE_RULES, { table: parseTable(toTableView(shown)) }).filter((f) =>
        SEVERE.has(f.severity),
      )
    : [];

  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, SOLID_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const data = pointsFor(shown, columns.x, columns.y);
  const view = graphView(graph, data, columns, false, "points");
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
  const expected = solidExpected(view.plotted, columns, run, answers);
  const analysis = runRules(SOLID_ANALYSIS_RULES, { answers, expected }).filter((f) =>
    SEVERE.has(f.severity),
  );
  const written = (a: { value: string } | undefined) => (a?.value ?? "").trim() !== "";

  // The precautions are the candidate's own words in the report (left empty in an exam).
  const report = solidReport(attempt, events);
  const precautions = report.sections.find((s) => s.id === "precautions")?.text ?? "";

  return {
    covered: run?.covered ?? false,
    stirred: run?.stirring ?? false,
    weighed: Object.keys(run ? { solid: 1, empty: 1, filled: 1 } : bench.weighed).length,
    transfer,
    minutes: run ? run.series.length - 1 : 0,
    pastHighest:
      run !== undefined && solidReadBeforePeak.check({ readings: handedIn }).length === 0,
    tabulated:
      table.columns.length > 0 &&
      table.rows.some((row) => Object.values(row.cells).some((v) => v.trim() !== "")),
    table: tableFindings,
    plotted: view.plotted.length > 0,
    rightGraph: plotsThetaAgainstT(columns),
    graph: graphFindings,
    T: written(answers.T),
    c: written(answers.c),
    analysis,
    precautions: precautions.split("\n").filter((l) => l.trim() !== "").length,
  };
}
