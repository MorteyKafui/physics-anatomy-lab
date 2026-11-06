// @pa/analysis: units, significant figures and line fits. The table, graph and calculation
// checks join in the next step. Harvested from Physics Bench (docs/planning/harvest-review.md).
export { findUnit, fromSI, suspectedUnitSlip, toSI, UNITS } from "./units";
export type { QuantityKind, UnitDef } from "./units";
export { decimalsForResolution, formatSigFigs, parseFigure, toSigFigs } from "./sigfigs";
export type { ParsedFigure } from "./sigfigs";
export { fitLine, fitThroughOrigin, mean, percentDifference, residuals } from "./fit";
export type { LineFit, Point } from "./fit";
