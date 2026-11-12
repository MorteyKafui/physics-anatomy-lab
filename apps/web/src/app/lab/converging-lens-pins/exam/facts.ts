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
  asPinsReading,
  eyeOffAxis,
  parallaxStillThere,
  PINS_ANALYSIS_RULES,
  PINS_PLOT,
  pinsBenchProjection,
  pinsExpected,
  plotsXyAgainstXPlusY,
  tipsOffAxis,
  type PinsExamFacts,
  type PinsReading,
} from "@pa/experiments";

import { graphColumnsFor, graphView } from "../../graph-sheet";
import { lensPinsReport } from "../report-content";

const SEVERE = new Set(["error", "warning"]);

/**
 * What the two-pin rubric looks at, from the run as it was handed in. In an exam the coach is off
 * and the help level is "on my own", so the table, graph and answers are the candidate's own.
 */
export function pinsExamFacts(attempt: Attempt, events: readonly LabEvent[]): PinsExamFacts {
  const state = replay(coachProjection, attempt, events);
  const bench = replay(pinsBenchProjection, attempt, events);
  const readings = state.readings
    .map(asPinsReading)
    .filter((r): r is PinsReading => r !== undefined);
  const procedure = { readings };
  const left = parallaxStillThere.check(procedure);

  const table = replay(tableProjection, attempt, events);
  const shown = state.mode === "exam" ? table : fillDerived(table);
  const tableFindings = shown.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shown)),
          plot: PINS_PLOT,
          spread: "x",
        }),
        ...formulaUnitFindings(table),
      ].filter((f) => SEVERE.has(f.severity))
    : [];

  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, PINS_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const data = pointsFor(shown, columns.x, columns.y);
  const view = graphView(graph, data, columns, false);
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
  const expected = pinsExpected(view.triangle, columns, units, answers);
  const analysis = runRules(PINS_ANALYSIS_RULES, { answers, expected }).filter((f) =>
    SEVERE.has(f.severity),
  );
  const written = (a: { value: string } | undefined) => (a?.value ?? "").trim() !== "";

  // The precautions are the candidate's own words in the report (left empty in an exam).
  const report = lensPinsReport(attempt, events);
  const precautions = report.sections.find((s) => s.id === "precautions")?.text ?? "";

  // The tips as the bench stands, and in every reading taken.
  const benchTips = Math.abs(bench.objectTip) < 0.0005 && Math.abs(bench.pinTip) < 0.0005;

  return {
    tipsLevel: benchTips && tipsOffAxis.check(procedure).length === 0,
    eyeOnAxis: eyeOffAxis.check(procedure).length === 0,
    distances: new Set(readings.map((r) => r.x)).size,
    parallaxLeft: left.flatMap((f) => f.rows ?? []).length,
    tabulated:
      table.columns.length > 0 &&
      table.rows.some((row) => Object.values(row.cells).some((v) => v.trim() !== "")),
    table: tableFindings,
    formulaColumns: table.columns.filter((c) => c.role === "derived").map((c) => c.id),
    plotted: view.plotted.length > 0,
    rightGraph: plotsXyAgainstXPlusY(columns),
    line: view.line !== undefined,
    triangle: view.triangle !== undefined,
    graph: graphFindings,
    slope: written(answers.slope),
    f: written(answers.f),
    analysis,
    precautions: precautions.split("\n").filter((l) => l.trim() !== "").length,
  };
}
