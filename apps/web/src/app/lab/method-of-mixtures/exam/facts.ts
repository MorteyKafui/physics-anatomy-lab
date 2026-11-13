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
  asMixturesReading,
  MIXTURES_ANALYSIS_RULES,
  MIXTURES_PLOT,
  mixturesExpected,
  plotsVAgainstInverseT,
  readBeforePeak,
  type MixturesExamFacts,
  type MixturesReading,
} from "@pa/experiments";

import { graphColumnsFor, graphView } from "../../graph-sheet";
import { mixturesReport } from "../report-content";

const SEVERE = new Set(["error", "warning"]);

/**
 * What the mixtures rubric looks at, from the run as it was handed in. In an exam the coach is
 * off and the help level is "on my own", so the table, graph and answers are the candidate's own.
 */
export function mixturesExamFacts(
  attempt: Attempt,
  events: readonly LabEvent[],
): MixturesExamFacts {
  const state = replay(coachProjection, attempt, events);
  const readings = state.readings
    .map(asMixturesReading)
    .filter((r): r is MixturesReading => r !== undefined);
  const early = readBeforePeak.check({ readings });

  const table = replay(tableProjection, attempt, events);
  const shown = state.mode === "exam" ? table : fillDerived(table);
  const tableFindings = shown.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shown)),
          plot: MIXTURES_PLOT,
          spread: "V",
        }),
        ...formulaUnitFindings(table),
      ].filter((f) => SEVERE.has(f.severity))
    : [];

  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, MIXTURES_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const data = pointsFor(shown, columns.x, columns.y);
  const view = graphView(graph, data, columns, false, "y-axis");
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
  const expected = mixturesExpected(view.triangle, view.line, columns, units, answers);
  const analysis = runRules(MIXTURES_ANALYSIS_RULES, { answers, expected }).filter((f) =>
    SEVERE.has(f.severity),
  );
  const written = (a: { value: string } | undefined) => (a?.value ?? "").trim() !== "";

  // The precautions are the candidate's own words in the report (left empty in an exam).
  const report = mixturesReport(attempt, events);
  const precautions = report.sections.find((s) => s.id === "precautions")?.text ?? "";

  return {
    covered: readings.length > 0 && readings.every((r) => r.covered),
    stirred: readings.length > 0 && readings.every((r) => r.stirring),
    volumes: new Set(readings.map((r) => r.volume)).size,
    early: early.flatMap((f) => f.rows ?? []).length,
    tabulated:
      table.columns.length > 0 &&
      table.rows.some((row) => Object.values(row.cells).some((v) => v.trim() !== "")),
    table: tableFindings,
    formulaColumns: table.columns.filter((c) => c.role === "derived").map((c) => c.id),
    plotted: view.plotted.length > 0,
    rightGraph: plotsVAgainstInverseT(columns),
    line: view.line !== undefined,
    triangle: view.triangle !== undefined,
    graph: graphFindings,
    slope: written(answers.slope),
    intercept: written(answers.intercept),
    W: written(answers.W),
    analysis,
    precautions: precautions.split("\n").filter((l) => l.trim() !== "").length,
  };
}
