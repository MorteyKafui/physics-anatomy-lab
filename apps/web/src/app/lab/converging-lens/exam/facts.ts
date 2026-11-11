import {
  axisEnd,
  DIVISIONS,
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
  asLensReading,
  blurredImage,
  LENS_ANALYSIS_RULES,
  LENS_PLOT,
  lensExpected,
  notCoaxial,
  plotsInverseVAgainstInverseU,
  readFromEdge,
  type LensExamFacts,
  type LensReading,
} from "@pa/experiments";

import { graphColumnsFor, graphView, lineAcrossAxes } from "../../graph-sheet";
import { convergingLensReport } from "../report-content";

const SEVERE = new Set(["error", "warning"]);

/**
 * What the converging lens rubric looks at, from the run as it was handed in. In an exam the
 * coach is off and the help level is "on my own", so the table, graph and answers are the
 * candidate's own.
 */
export function lensExamFacts(attempt: Attempt, events: readonly LabEvent[]): LensExamFacts {
  const state = replay(coachProjection, attempt, events);
  const readings = state.readings
    .map(asLensReading)
    .filter((r): r is LensReading => r !== undefined);
  const procedure = { readings, noImageAt: [] };
  const blurred = blurredImage.check(procedure);

  const table = replay(tableProjection, attempt, events);
  const shown = state.mode === "exam" ? table : fillDerived(table);
  const tableFindings = shown.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shown)),
          plot: LENS_PLOT,
          spread: "u",
        }),
        ...formulaUnitFindings(table),
      ].filter((f) => SEVERE.has(f.severity))
    : [];

  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, LENS_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const data = pointsFor(shown, columns.x, columns.y);
  const view = graphView(graph, data, columns, false, "both-axes");
  const rightGraph = plotsInverseVAgainstInverseU(columns);
  const across = view.line && rightGraph ? lineAcrossAxes(view.line) : undefined;
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
          reach: {
            x: [0, ...(across ? [across.to.x] : [])],
            y: [0, ...(across ? [across.from.y] : [])],
          },
        }).filter((f) => SEVERE.has(f.severity))
      : [];
  // Each intercept can be read only if it falls on the sheet as the candidate scaled it.
  const onAxis = (v: number, axis: "x" | "y") =>
    v >= view.sheet[axis].start && v <= axisEnd(view.sheet[axis], DIVISIONS[axis]);
  const intercepts = across
    ? Number(onAxis(across.from.y, "y")) + Number(onAxis(across.to.x, "x"))
    : 0;

  const answers = replay(answersProjection, attempt, events);
  const units = { x: column(columns.x)?.unit ?? "", y: column(columns.y)?.unit ?? "" };
  const expected = lensExpected(view.line, columns, units, answers);
  const analysis = runRules(LENS_ANALYSIS_RULES, { answers, expected }).filter((f) =>
    SEVERE.has(f.severity),
  );
  const written = (a: { value: string } | undefined) => (a?.value ?? "").trim() !== "";

  // The precautions are the candidate's own words in the report (left empty in an exam).
  const report = convergingLensReport(attempt, events);
  const precautions = report.sections.find((s) => s.id === "precautions")?.text ?? "";

  return {
    coaxial: notCoaxial.check(procedure).length === 0,
    centreMarks: readFromEdge.check(procedure).length === 0,
    distances: new Set(readings.map((r) => r.u)).size,
    blurred: blurred.flatMap((f) => f.rows ?? []).length,
    tabulated:
      table.columns.length > 0 &&
      table.rows.some((row) => Object.values(row.cells).some((v) => v.trim() !== "")),
    table: tableFindings,
    reciprocalColumns: table.columns.filter((c) => c.role === "derived").map((c) => c.id),
    plotted: view.plotted.length > 0,
    rightGraph,
    line: view.line !== undefined,
    intercepts,
    graph: graphFindings,
    m1: written(answers.m1),
    m2: written(answers.m2),
    f: written(answers.f),
    analysis,
    precautions: precautions.split("\n").filter((l) => l.trim() !== "").length,
  };
}
