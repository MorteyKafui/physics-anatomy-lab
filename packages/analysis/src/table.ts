import { parseFigure, type ParsedFigure } from "./sigfigs";
import { findUnit, toSI, type QuantityKind } from "./units";

/**
 * A student's results table as the checks see it. The table builder (Phase 1) produces this:
 * columns the student set up, and cells exactly as typed, so precision is never lost.
 */
export interface TableColumn {
  id: string;
  /** As in the heading: "l", "t", "T²". */
  symbol: string;
  kind: QuantityKind;
  /** The unit the student chose for this column. */
  unit: string;
  /**
   * measured: read from an instrument; given: a setting the student records; derived: worked out
   * by the student from other columns.
   */
  source: "measured" | "given" | "derived";
  /** Least count of the instrument a measured column is read from, in that instrument's unit. */
  leastCount?: { value: number; unit: string };
  /** For a mean column: the columns it is the mean of (repeat timings t₁, t₂). */
  meanOf?: string[];
  /** For a derived column: its SI value from the row's other SI values and the table's constants. */
  derive?: (
    row: Readonly<Record<string, number>>,
    constants: Readonly<Record<string, number>>,
  ) => number;
}

export interface TableView {
  columns: TableColumn[];
  rows: { id: string; cells: Record<string, string> }[];
  /** Values recorded once for the whole experiment (SI), such as a hanging mass. */
  constants?: Record<string, number>;
}

export interface ParsedCell {
  raw: string;
  figure?: ParsedFigure;
  /** SI value, when the cell parses. */
  si?: number;
}

export interface ParsedRow {
  id: string;
  cells: Record<string, ParsedCell>;
}

export interface ParsedTable {
  columns: TableColumn[];
  rows: ParsedRow[];
  /** Rows with every non-derived cell filled and readable. */
  completeRows: ParsedRow[];
  constants: Record<string, number>;
}

export function parseCell(raw: string | undefined, column: TableColumn): ParsedCell {
  const text = (raw ?? "").trim();
  if (text === "") return { raw: text };
  const figure = parseFigure(text);
  if (!figure || !findUnit(column.kind, column.unit)) return { raw: text };
  return { raw: text, figure, si: toSI(figure.value, column.kind, column.unit) };
}

export function parseTable(table: TableView): ParsedTable {
  const rows = table.rows.map((r): ParsedRow => ({
    id: r.id,
    cells: Object.fromEntries(table.columns.map((c) => [c.id, parseCell(r.cells[c.id], c)])),
  }));
  const completeRows = rows.filter((r) =>
    table.columns
      .filter((c) => c.source !== "derived")
      .every((c) => r.cells[c.id]?.figure !== undefined),
  );
  return { columns: table.columns, rows, completeRows, constants: table.constants ?? {} };
}

/** A least count in the column's own unit: a 0.1 cm rule read in m has a least count of 0.001 m. */
export function leastCountInColumnUnit(column: TableColumn): number | undefined {
  if (!column.leastCount) return undefined;
  const from = findUnit(column.kind, column.leastCount.unit);
  const to = findUnit(column.kind, column.unit);
  return from && to ? (column.leastCount.value * from.toSI) / to.toSI : undefined;
}
