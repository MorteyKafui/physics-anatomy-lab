import type { QuantityKind } from "@pa/analysis";
import { t } from "@pa/i18n";

import { sheetXlsx } from "../report/xlsx";

/**
 * A data template (GLOSSARY.md): a blank CSV or XLSX file for one experiment, with its columns,
 * units and the settings the book uses, to fill in during a real lab (data templates brief,
 * decision 2). Only what is read in the lab is in it, never the worked columns, which the model
 * check works out with the lab's own formulas.
 *
 * The layout, the same in both files:
 *
 *   Physics Anatomy data template, <title>
 *   Experiment, <id>, Template version, <n>
 *   <note, if any>
 *
 *   Your apparatus
 *   <label> / <unit>, <value or blank>       one row for each value the model needs
 *
 *   Your readings
 *   <symbol> / <unit>, ...                    the heading row
 *   <setting>, <blank>, ...                   one row for each setting the book uses
 */

export interface TemplateColumn {
  id: string;
  /** As in the lab's table: l, t, θ₁. */
  symbol: string;
  kind: QuantityKind;
  /** The unit the template is written in, and the column is kept in once read. */
  unit: string;
  /** A setting is filled in from the book; a reading is the student's. */
  role: "setting" | "reading";
}

export interface TemplateValue {
  id: string;
  /** What the student sees: "Hot water volume V₀". */
  label: string;
  kind: QuantityKind;
  unit: string;
  /** The model can do without it (the calorimeter's water equivalent W). */
  optional?: boolean;
}

export interface DataTemplate {
  experiment: string;
  version: number;
  title: string;
  /** One line for the top of the file: "Time 20 swings at each length." */
  note?: string;
  values: readonly TemplateValue[];
  columns: readonly TemplateColumn[];
  /** The settings the book uses, one row each, in the setting columns' units. */
  settings: readonly (readonly number[])[];
}

/** The heading a column or value carries in the file, as the lab's table writes it. */
export const heading = (symbol: string, unit: string) => `${symbol} / ${unit}`;

/** The template as rows of cells, the one layout both files are written from. */
export function templateRows(template: DataTemplate): string[][] {
  const width = Math.max(template.columns.length, 2);
  const pad = (row: string[]) => [
    ...row,
    ...Array<string>(Math.max(0, width - row.length)).fill(""),
  ];
  const rows: string[][] = [
    [t("labData.template.title"), template.title],
    [
      t("labData.template.experiment"),
      template.experiment,
      t("labData.template.version"),
      String(template.version),
    ],
  ];
  if (template.note) rows.push([template.note]);
  if (template.values.length) {
    rows.push([], [t("labData.template.values")]);
    for (const v of template.values) rows.push([heading(v.label, v.unit), ""]);
  }
  rows.push([], [t("labData.template.readings")]);
  rows.push(template.columns.map((c) => heading(c.symbol, c.unit)));
  const settings = template.columns.filter((c) => c.role === "setting");
  for (const s of template.settings) {
    rows.push(
      template.columns.map((c) => {
        const i = settings.indexOf(c);
        return i >= 0 && s[i] !== undefined ? String(s[i]) : "";
      }),
    );
  }
  return rows.map(pad);
}

/** Rows of cells as CSV, quoted where a cell needs it, as the lab's other CSV files are. */
export function cellsCsv(rows: readonly (readonly string[])[]) {
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  // The byte order mark lets a spreadsheet read T² and the other symbols as UTF-8.
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export const templateCsv = (template: DataTemplate) => cellsCsv(templateRows(template));

export const templateXlsx = (template: DataTemplate) =>
  sheetXlsx(template.title, templateRows(template));

/** The file name: "simple-pendulum-data-template.csv". */
export const templateFileName = (template: DataTemplate, ext: "csv" | "xlsx") =>
  `${template.experiment}-data-template.${ext}`;
