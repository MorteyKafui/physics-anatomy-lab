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
  headingUnits,
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
export { evaluate, FUNCTIONS, parseFormula } from "./expression";
export type { Expr, FormulaProblem, FunctionName, ParseResult } from "./expression";
export {
  addRepeat,
  checkFormula,
  deriveFor,
  expectedDecimals,
  fillDerived,
  heading,
  newColumnId,
  pointsFor,
  repeatsOf,
  subscript,
  toTableView,
} from "./table-design";
export type { ColumnRole, DesignColumn, FormulaCheck, TableDesign, TableRow } from "./table-design";
export {
  acceptedScale,
  axisEnd,
  DIVISIONS,
  fromMm,
  lineSlope,
  mmBetween,
  mmFromLine,
  ON_POINT_MM,
  onLineAt,
  onPaper,
  readingDecimals,
  referenceLine,
  scalesAround,
  SHEET,
  snapMm,
  suggestAxis,
  suggestTriangle,
  toMm,
} from "./graph";
export type { Axis, DrawnLine, PlottedPoint, Sheet, SlopeTriangle } from "./graph";
export {
  GRAPH_RULES,
  lineMissesMean,
  lineSlopeOff,
  lineUnbalanced,
  misplotted,
  offTheSheet,
  PLOT_TOLERANCE_MM,
  pointsMissing,
  scaleTooSmall,
  triangleOffLine,
  triangleOnPoint,
  triangleSmall,
} from "./graph-rules";
export type { GraphContext, GraphRule } from "./graph-rules";
export {
  BASE_UNITS,
  calculate,
  checkAnswer,
  DIMENSIONLESS,
  dimensionless,
  formatDims,
  formatQuantity,
  parseUnit,
  sameDimension,
  UNIT_SYMBOLS,
} from "./quantity";
export type { AnswerCheck, CalcProblem, CalcResult, Dims, Quantity } from "./quantity";
