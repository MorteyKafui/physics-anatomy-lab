import { findUnit, fromSI, toSI, type QuantityKind } from "@pa/analysis";
import { z } from "zod";

import { heading, type DataTemplate, type TemplateColumn } from "./template";

/**
 * A data template's file, read back: the apparatus values and the readings, each checked and in
 * the template's own units (data templates brief, decision 3). A file in another layout is
 * matched by its headings, not by position, and any problem is given on the cell it is in while
 * the rest is kept.
 */

/** The most rows of readings kept. */
export const MAX_ROWS = 200;

export type MatchProblem =
  | { code: "no-headings"; headings: string }
  | { code: "unit"; heading: string; unit: string }
  | { code: "too-many-rows"; limit: number }
  | { code: "not-a-number"; row: number; column: string }
  | { code: "comma"; row: number; column: string; value: string; suggestion: string }
  | { code: "missing"; row: number; column: string }
  | { code: "value-missing"; label: string }
  | { code: "value-not-a-number"; label: string };

export interface LabDataRow {
  /** The row's number among the readings, from 1, as the student sees it in the table. */
  row: number;
  /** Each column's value in the template's unit; absent where the cell has a problem. */
  values: Record<string, number | undefined>;
}

export interface LabData {
  experiment: string;
  version: number;
  /** The apparatus values, in the template's units; absent where the file leaves one empty. */
  values: Record<string, number | undefined>;
  rows: LabDataRow[];
  problems: MatchProblem[];
}

/** A plain decimal number, as a spreadsheet or a student writes one: 35.98, -0.5, .5, 3.0e8. */
const NUMBER = z
  .string()
  .trim()
  .regex(/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/)
  .transform(Number)
  .pipe(z.number().finite());

/** A decimal written with a comma, "35,98": the one slip worth naming. */
const COMMA_DECIMAL = /^\s*[-+]?\d+,\d+\s*$/;

const normal = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

/**
 * A heading split into its name and unit: "t / s", "t/s", "t (s)". Without a unit the whole cell
 * is the name.
 */
export function splitHeading(cell: string): { name: string; unit?: string } {
  const text = normal(cell);
  const slash = /^(.+?)\s*\/\s*(.+)$/.exec(text);
  if (slash) return { name: slash[1]!.trim(), unit: slash[2]!.trim() };
  const paren = /^(.+?)\s*\((.+)\)$/.exec(text);
  if (paren) return { name: paren[1]!.trim(), unit: paren[2]!.trim() };
  return { name: text };
}

/** A value read in the file's unit, in the template's; undefined if the unit is not one it takes. */
function converter(kind: QuantityKind, from: string | undefined, to: string) {
  const unit = from ?? to;
  if (!findUnit(kind, unit)) return undefined;
  return (v: number) => (unit === to ? v : fromSI(toSI(v, kind, unit), kind, to));
}

export function matchTemplate(
  cells: readonly (readonly string[])[],
  template: DataTemplate,
): LabData {
  const problems: MatchProblem[] = [];
  const out: LabData = {
    experiment: template.experiment,
    version: template.version,
    values: {},
    rows: [],
    problems,
  };

  // The heading row: the first row naming every one of the template's columns.
  const symbols = template.columns.map((c) => normal(c.symbol));
  const headingRow = cells.findIndex((row) => {
    const names = row.map((c) => splitHeading(c).name);
    return symbols.every((s) => names.includes(s));
  });
  if (headingRow < 0) {
    problems.push({
      code: "no-headings",
      headings: template.columns.map((c) => heading(c.symbol, c.unit)).join(", "),
    });
    return out;
  }

  // Where each column is, and how to bring its values into the template's unit.
  const header = cells[headingRow]!.map(splitHeading);
  const columns: { column: TemplateColumn; index: number; convert: (v: number) => number }[] = [];
  for (const column of template.columns) {
    const index = header.findIndex((h) => h.name === normal(column.symbol));
    const convert = converter(column.kind, header[index]!.unit, column.unit);
    if (!convert) {
      problems.push({
        code: "unit",
        heading: cells[headingRow]![index]!.trim(),
        unit: header[index]!.unit ?? "",
      });
      continue;
    }
    columns.push({ column, index, convert });
  }

  // The apparatus values, above the heading row, found by their labels.
  for (const v of template.values) {
    const at = cells
      .slice(0, headingRow)
      .find((row) => row[0] !== undefined && splitHeading(row[0]).name === normal(v.label));
    const raw = at?.[1]?.trim() ?? "";
    if (!at || raw === "") {
      if (!v.optional) problems.push({ code: "value-missing", label: heading(v.label, v.unit) });
      continue;
    }
    const convert = converter(v.kind, splitHeading(at[0]!).unit, v.unit);
    const n = NUMBER.safeParse(raw);
    if (!convert)
      problems.push({
        code: "unit",
        heading: at[0]!.trim(),
        unit: splitHeading(at[0]!).unit ?? "",
      });
    else if (n.success) out.values[v.id] = convert(n.data);
    else problems.push({ code: "value-not-a-number", label: heading(v.label, v.unit) });
  }

  // The readings: every row below the heading row with anything in it.
  const body = cells.slice(headingRow + 1).filter((row) => row.some((c) => c.trim() !== ""));
  if (body.length > MAX_ROWS) problems.push({ code: "too-many-rows", limit: MAX_ROWS });
  body.slice(0, MAX_ROWS).forEach((cellsInRow, i) => {
    const row = i + 1;
    const readings = columns.filter((c) => c.column.role === "reading");
    // A setting with no readings yet is a row the student has not done: left out quietly.
    if (readings.length && readings.every((c) => (cellsInRow[c.index] ?? "").trim() === "")) return;
    const values: LabDataRow["values"] = {};
    for (const { column, index, convert } of columns) {
      const raw = cellsInRow[index] ?? "";
      const n = NUMBER.safeParse(raw);
      if (n.success) values[column.id] = convert(n.data);
      else if (raw.trim() === "") problems.push({ code: "missing", row, column: column.symbol });
      else if (COMMA_DECIMAL.test(raw))
        problems.push({
          code: "comma",
          row,
          column: column.symbol,
          value: raw.trim(),
          suggestion: raw.trim().replace(",", "."),
        });
      else problems.push({ code: "not-a-number", row, column: column.symbol });
    }
    out.rows.push({ row, values });
  });
  return out;
}

/** The rows with every column read, the ones the graph and the verdict use. */
export const completeRows = (data: LabData, template: DataTemplate) =>
  data.rows.filter((r) => template.columns.every((c) => r.values[c.id] !== undefined));
