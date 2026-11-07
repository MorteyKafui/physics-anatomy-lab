import { assembled, plotsTSquaredAgainstL, type ExamFacts } from "@pa/experiments";

import type { ReportContent } from "../report/content";

/** What the rubric looks at, from a run's review and its report, as the script was handed in. */
export function examFacts(report: ReportContent): ExamFacts {
  const r = report.review;
  const precautions = report.sections.find((s) => s.id === "precautions")?.text ?? "";
  const written = (a: { value: string } | undefined) => (a?.value ?? "").trim() !== "";
  return {
    assembled: assembled(r.assembly) && r.findings.assembly.length === 0,
    threadInCork: r.assembly.thread === "cork",
    lengths: new Set(r.readings.map((x) => x.l)).size,
    tabulated:
      r.table.columns.length > 0 &&
      r.table.rows.some((row) => Object.values(row.cells).some((v) => v.trim() !== "")),
    table: r.findings.table,
    columns: r.table.columns.map((c) => ({ id: c.id, symbol: c.symbol })),
    plotted: r.view.plotted.length > 0,
    tSquaredAgainstL: plotsTSquaredAgainstL(r.columns),
    line: r.view.line !== undefined,
    triangle: r.view.triangle !== undefined,
    graph: r.findings.graph,
    slope: written(r.answers.slope),
    g: written(r.answers.g),
    analysis: r.findings.analysis,
    precautions: precautions.split("\n").filter((l) => l.trim() !== "").length,
  };
}
