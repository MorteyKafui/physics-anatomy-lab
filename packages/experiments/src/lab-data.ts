import type { ModelCheck, Point, QuantityKind } from "@pa/analysis";

/**
 * Lab data (GLOSSARY.md): readings a student took in a real lab and brought in from a data
 * template. Never an attempt: no events, no steps, no marks. The template and the model check for
 * each experiment are worked out here from the experiment's own table and physics (data templates
 * brief, decisions 2 and 4); reading the files is the web app's.
 */

export interface TemplateColumn {
  id: string;
  /** As in the lab's table: l, t₁, θ₁. */
  symbol: string;
  kind: QuantityKind;
  /** The unit the template is written in, and the column is kept in once read. */
  unit: string;
  /** A setting is filled in from the book; a reading is the student's. */
  role: "setting" | "reading";
  /** A setting that may be left empty: Ohm's law's PJ, for the reading with no contact. */
  optional?: boolean;
}

export interface TemplateValue {
  id: string;
  /** What the student sees, without its unit: "Hot water volume V₀". */
  label: string;
  kind: QuantityKind;
  unit: string;
  /** The model can do without it (the calorimeter's water equivalent W). */
  optional?: boolean;
  /** Filled in on the template from the book, for the student to change: 50 cm³ of hot water. */
  value?: number;
}

export interface DataTemplate {
  experiment: string;
  version: number;
  title: string;
  /** One line for the top of the file. */
  note?: string;
  values: readonly TemplateValue[];
  columns: readonly TemplateColumn[];
  /** The settings the book uses, one row each, in the setting columns' units. */
  settings: readonly (readonly (number | undefined)[])[];
}

/** One row of lab data, every value in the template's units; absent where the cell had a problem. */
export type LabRow = Readonly<Record<string, number | undefined>>;

/** A part of the verdict that was found, with the message keys for its cause and precaution. */
export interface CheckFinding {
  part: "shift" | "tilt" | "spread";
  cause: string;
  precaution: string;
  params?: Readonly<Record<string, string | number>>;
}

/** Everything the model check screen draws and says for one experiment's lab data. */
export interface LabCheck {
  /** The rows as the lab's table shows them, worked columns included, in table order. */
  table: readonly (readonly (number | undefined)[])[];
  /** The plotted points, and the model's y at each. */
  points: readonly Point[];
  model: readonly number[];
  /** The model's line across the graph, for drawing, from its first x to its last. */
  modelLine: readonly Point[];
  check: ModelCheck | undefined;
  /** Why there is no check yet, other than too few rows: a message key (an apparatus value missing). */
  needs?: string;
  findings: readonly CheckFinding[];
}
