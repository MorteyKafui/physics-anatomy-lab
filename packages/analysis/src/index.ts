// @pa/analysis: units, significant figures, line fits, Student's t, the outlier test, the rule
// runner and the table checks. Graph and calculation checks come with the graph sheet. Harvested
// from Physics Bench (docs/planning/harvest-review.md).
export { findUnit, fromSI, suspectedUnitSlip, toSI, UNITS } from "./units";
export type { QuantityKind, UnitDef } from "./units";
export { decimalsForResolution, formatSigFigs, parseFigure, toSigFigs } from "./sigfigs";
export type { ParsedFigure } from "./sigfigs";
export { fitLine, fitThroughOrigin, mean, percentDifference, residuals } from "./fit";
export type { LineFit, Point } from "./fit";
export { incompleteBeta, logGamma, studentTCdf, studentTQuantile } from "./student-t";
export { deletedResiduals, findOutlier, outlierCriticalValue } from "./outliers";
export type { DeletedResidual } from "./outliers";
export { runRules } from "./findings";
export type { Finding, Rule, Severity, Skill } from "./findings";
export { leastCountInColumnUnit, parseCell, parseTable } from "./table";
export type { ParsedCell, ParsedRow, ParsedTable, TableColumn, TableView } from "./table";
export {
  derivedArithmetic,
  inconsistentDecimals,
  meanDecimals,
  MIN_ROWS,
  narrowRange,
  precisionVsInstrument,
  readingToRepeat,
  TABLE_RULES,
  tooFewRows,
  unitSlip,
  unreadableCells,
} from "./table-rules";
export type { TableContext, TableRule } from "./table-rules";
