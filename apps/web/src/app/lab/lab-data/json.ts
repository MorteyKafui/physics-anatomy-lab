import { splitHeading, type LabData } from "./match";
import type { DataTemplate } from "./template";

/**
 * Lab data as JSON (data templates brief, decision 7): its own small format with the experiment,
 * the template version, the apparatus values and the readings, each with its unit. It is not an
 * attempt file and cannot be imported as one: it has no events.
 */
export const LAB_DATA_FORMAT = "physics-anatomy/lab-data";
export const LAB_DATA_FORMAT_VERSION = 1;

export function labDataJson(data: LabData, template: DataTemplate): string {
  return (
    JSON.stringify(
      {
        format: LAB_DATA_FORMAT,
        formatVersion: LAB_DATA_FORMAT_VERSION,
        experiment: data.experiment,
        templateVersion: data.version,
        values: template.values.map((v) => ({
          id: v.id,
          label: v.label,
          unit: v.unit,
          value: data.values[v.id] ?? null,
        })),
        columns: template.columns.map((c) => ({ id: c.id, symbol: c.symbol, unit: c.unit })),
        rows: data.rows.map((r) => ({
          row: r.row,
          ...Object.fromEntries(template.columns.map((c) => [c.id, r.values[c.id] ?? null])),
        })),
      },
      null,
      2,
    ) + "\n"
  );
}

/**
 * A report's results table as JSON (the report board, data as JSON): the experiment, each column's
 * symbol and unit from its heading ("T²/s²"), and the rows as the table shows them, numbers as
 * numbers. Like lab data it is not an attempt file.
 */
export const TABLE_FORMAT = "physics-anatomy/table";

export function tableJson(
  experiment: string,
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const cell = (v: string) => {
    const n = v.trim() === "" ? NaN : Number(v.trim());
    return Number.isFinite(n) ? n : v === "" ? null : v;
  };
  return (
    JSON.stringify(
      {
        format: TABLE_FORMAT,
        formatVersion: 1,
        experiment,
        columns: headings.map((h) => {
          const { name, unit } = splitHeading(h);
          return { symbol: name, unit: unit ?? "" };
        }),
        rows: rows.map((r) => r.map(cell)),
      },
      null,
      2,
    ) + "\n"
  );
}
