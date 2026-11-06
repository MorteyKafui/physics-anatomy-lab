import { evaluate, parseFormula, type FormulaProblem } from "./expression";
import { decimalsForResolution, formatSigFigs, parseFigure } from "./sigfigs";
import type { TableColumn, TableView } from "./table";
import { findUnit, fromSI, toSI, type QuantityKind } from "./units";

/**
 * A results table as the student designs it (master plan, "Results table: generated or your
 * own"). Every column knows its quantity, unit and role, so the checks can mark a table of the
 * student's own design and the graph can plot any column against any other. Cells keep exactly
 * what was typed, so 0.80 and 0.8 stay different.
 *
 * `toTableView` turns a design and its cells into the view the table rules check.
 */

export type ColumnRole =
  /** A setting the student chose and records: the length l. */
  | "given"
  /** One reading from an instrument. */
  | "measured"
  /** One of several readings of the same thing (t₁, t₂ …); `group` joins them to their mean. */
  | "repeat"
  /** The mean of a group's repeats. */
  | "mean"
  /** Worked out from other columns by `formula`. */
  | "derived"
  /** Free text, never checked. */
  | "notes";

export interface DesignColumn {
  id: string;
  /** As in the heading: "l", "t₁", "T²". */
  symbol: string;
  kind: QuantityKind;
  /** The unit the student chose. Empty means none chosen yet, which the heading check flags. */
  unit: string;
  role: ColumnRole;
  /** For repeats and their mean: the quantity they share ("t"). */
  group?: string;
  /** For a derived column: a formula in the other columns' symbols ("t / 20"). */
  formula?: string;
  /** Least count of the instrument a given, measured or repeat column is read with. */
  leastCount?: { value: number; unit: string };
  /** What the column is, in the student's words or the experiment's ("repeat 1, 20 swings"). */
  note?: string;
}

export interface TableRow {
  id: string;
  /** Cells as typed, by column id. */
  cells: Record<string, string>;
}

export interface TableDesign {
  columns: DesignColumn[];
  rows: TableRow[];
}

/** A column heading as the guide writes it: quantity over unit ("T²/s²"), or the symbol alone. */
export const heading = (c: Pick<DesignColumn, "symbol" | "unit">) =>
  c.unit ? `${c.symbol}/${c.unit}` : c.symbol;

const numeric = (c: DesignColumn) => c.role !== "notes";

/** The repeats a mean column is the mean of. */
export const repeatsOf = (design: Pick<TableDesign, "columns">, mean: DesignColumn) =>
  design.columns.filter(
    (c) => c.role === "repeat" && c.group !== undefined && c.group === mean.group,
  );

export type FormulaCheck =
  { ok: true } | { ok: false; problem: FormulaProblem; near?: string | undefined };

/** Can this derived column's formula be worked out from the table's other columns? */
export function checkFormula(
  design: Pick<TableDesign, "columns">,
  column: DesignColumn,
): FormulaCheck {
  const known = design.columns.filter((c) => c.id !== column.id && numeric(c)).map((c) => c.symbol);
  const parsed = parseFormula(column.formula ?? "", known);
  return parsed.ok ? { ok: true } : { ok: false, problem: parsed.problem, near: parsed.near };
}

/**
 * A column's value in SI for one row, from the other columns' SI values, as the guide would work
 * it out: a mean from its repeats, a derived column from its formula. Undefined for columns that
 * are read, not worked out.
 */
export function deriveFor(
  design: Pick<TableDesign, "columns">,
  column: DesignColumn,
): ((row: Readonly<Record<string, number>>) => number) | undefined {
  if (column.role === "mean") {
    const ids = repeatsOf(design, column).map((c) => c.id);
    if (ids.length === 0) return undefined;
    return (row) => ids.reduce((sum, id) => sum + (row[id] ?? Number.NaN), 0) / ids.length;
  }
  if (column.role !== "derived") return undefined;
  const others = design.columns.filter((c) => c.id !== column.id && numeric(c));
  const parsed = parseFormula(
    column.formula ?? "",
    others.map((c) => c.symbol),
  );
  if (!parsed.ok) return undefined;
  const idOf = new Map(others.map((c) => [c.symbol, c.id]));
  return (row) => {
    const values: Record<string, number> = {};
    for (const symbol of parsed.symbols) values[symbol] = row[idOf.get(symbol)!] ?? Number.NaN;
    return evaluate(parsed.expr, values);
  };
}

/** The table as the rules check it. Notes columns are left out; a mean is the student's own work. */
export function toTableView(design: TableDesign, constants?: Record<string, number>): TableView {
  const columns: TableColumn[] = design.columns.filter(numeric).map((c) => {
    const derive = deriveFor(design, c);
    return {
      id: c.id,
      symbol: c.symbol,
      kind: c.kind,
      unit: c.unit,
      source:
        c.role === "given"
          ? "given"
          : c.role === "measured" || c.role === "repeat"
            ? "measured"
            : "derived",
      ...(c.leastCount ? { leastCount: c.leastCount } : {}),
      ...(c.role === "mean" ? { meanOf: repeatsOf(design, c).map((r) => r.id) } : {}),
      ...(derive ? { derive: (row: Readonly<Record<string, number>>) => derive(row) } : {}),
    };
  });
  return { columns, rows: design.rows, ...(constants ? { constants } : {}) };
}

/**
 * Worked-out cells as the app fills them in at the Auto help level: a mean to one more decimal
 * place than its readings (the WASSCE rule), a derived value to four significant figures, which
 * keeps one figure more than the three the final answer carries. Each derived column is worked
 * out from the columns before it, so T² can follow from a filled-in T.
 */
export function fillDerived<D extends TableDesign>(design: D): D {
  const rows = design.rows.map((row) => {
    const cells = { ...row.cells };
    for (const column of design.columns) {
      const derive = deriveFor(design, column);
      if (!derive) continue;
      const si: Record<string, number> = {};
      for (const c of design.columns) {
        const figure = parseFigure(cells[c.id] ?? "");
        if (figure && findUnit(c.kind, c.unit)) si[c.id] = toSI(figure.value, c.kind, c.unit);
      }
      const value = derive(si);
      if (!Number.isFinite(value) || !findUnit(column.kind, column.unit)) {
        cells[column.id] = "";
        continue;
      }
      const shown = fromSI(value, column.kind, column.unit);
      if (column.role === "mean") {
        const places = repeatsOf(design, column).map(
          (r) => parseFigure(cells[r.id] ?? "")?.decimals ?? 0,
        );
        cells[column.id] = shown.toFixed(Math.max(...places) + 1);
      } else {
        cells[column.id] = formatSigFigs(shown, 4);
      }
    }
    return { ...row, cells };
  });
  return { ...design, rows };
}

/** Decimal places a reading column should carry, from its instrument's least count. */
export function expectedDecimals(column: DesignColumn): number | undefined {
  if (!column.leastCount) return undefined;
  const from = findUnit(column.kind, column.leastCount.unit);
  const to = findUnit(column.kind, column.unit);
  if (!from || !to) return undefined;
  return decimalsForResolution((column.leastCount.value * from.toSI) / to.toSI);
}

/** A fresh column id that is not in the design yet. */
export function newColumnId(design: Pick<TableDesign, "columns">, base: string): string {
  const slug = base.normalize("NFKD").replace(/[^\w]/g, "") || "c";
  let id = slug;
  for (let n = 2; design.columns.some((c) => c.id === id); n += 1) id = `${slug}${n}`;
  return id;
}

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
export const subscript = (n: number) =>
  String(n)
    .split("")
    .map((d) => SUBSCRIPTS[Number(d)])
    .join("");

/**
 * Add one more repeat of a reading. A single measured column t becomes t₁ and t₂ with a mean t
 * after them; a group that already has repeats gains the next one (t₃) before its mean.
 */
export function addRepeat(design: TableDesign, columnId: string): TableDesign {
  const column = design.columns.find((c) => c.id === columnId);
  if (!column) return design;
  const columns = [...design.columns];
  if (column.role === "measured") {
    const group = column.symbol;
    const at = columns.indexOf(column);
    const first: DesignColumn = {
      ...column,
      id: newColumnId(design, `${column.id}1`),
      symbol: `${group}${subscript(1)}`,
      role: "repeat",
      group,
    };
    const second: DesignColumn = {
      ...first,
      id: newColumnId({ columns: [...columns, first] }, `${column.id}2`),
      symbol: `${group}${subscript(2)}`,
    };
    // The mean keeps the old column's id and symbol, so formulas that used t still work.
    const mean: DesignColumn = { ...column, role: "mean", group };
    delete mean.leastCount; // a mean is worked out, not read with an instrument
    columns.splice(at, 1, first, second, mean);
    // Readings typed in the single column move to the first repeat.
    const rows = design.rows.map((r) => {
      const cells = { ...r.cells, [first.id]: r.cells[column.id] ?? "" };
      delete cells[column.id];
      return { ...r, cells };
    });
    return { columns, rows };
  }
  const group = column.group;
  if (group === undefined) return design;
  const repeats = columns.filter((c) => c.role === "repeat" && c.group === group);
  const last = repeats.at(-1);
  if (!last) return design;
  const next: DesignColumn = {
    ...last,
    id: newColumnId(design, `${group}${repeats.length + 1}`),
    symbol: `${group}${subscript(repeats.length + 1)}`,
  };
  columns.splice(columns.indexOf(last) + 1, 0, next);
  return { ...design, columns };
}

/**
 * The points a table gives for a graph of one column against another: one per row with both
 * cells readable, in the columns' own units, as the student reads them onto the sheet.
 */
export function pointsFor(
  design: Pick<TableDesign, "rows">,
  x: string,
  y: string,
): { row: string; x: number; y: number }[] {
  return design.rows.flatMap((r) => {
    const fx = parseFigure(r.cells[x] ?? "");
    const fy = parseFigure(r.cells[y] ?? "");
    return fx && fy ? [{ row: r.id, x: fx.value, y: fy.value }] : [];
  });
}
