import type { LabData } from "./match";
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
