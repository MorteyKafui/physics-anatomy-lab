import {
  UNITS,
  type ColumnRole,
  type DesignColumn,
  type QuantityKind,
  type TableDesign,
} from "@pa/analysis";

import type { Projection } from "../events/replay";
import type { Json, LabEvent, NewEvent } from "../events/types";

/**
 * The results table of an attempt, rebuilt from its events (step 6, Tabulate). The student's
 * layout is one event holding every column, so reordering or renaming is a single change; each
 * typed cell is its own event, so nothing typed is ever lost and a replay shows the table being
 * written. Events that do not fit the table as it stands are ignored, like everywhere else.
 */

export const TABLE_LAYOUTS = ["standard", "template", "own"] as const;
export type TableLayout = (typeof TABLE_LAYOUTS)[number];

export interface TableState extends TableDesign {
  /** How the student started the table: the standard one, a template, or their own. */
  layout: TableLayout | undefined;
  /** Which template, when one was picked. */
  template: string | undefined;
}

export const EMPTY_TABLE: TableState = {
  layout: undefined,
  template: undefined,
  columns: [],
  rows: [],
};

/** Longest cell a student can type: room for a reading, a unit slip or a short note. */
export const MAX_CELL = 60;

const ROLES: readonly ColumnRole[] = ["given", "measured", "repeat", "mean", "derived", "notes"];
const KINDS = Object.keys(UNITS) as QuantityKind[];

const str = (v: Json | undefined, max = 60): v is string =>
  typeof v === "string" && v.length <= max;

/** A column as stored, or undefined if it is not one. */
function asColumn(v: Json): DesignColumn | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const { id, symbol, kind, unit, role, group, formula, leastCount, note } = v;
  if (!str(id, 40) || id === "" || !str(symbol, 20) || symbol === "") return undefined;
  if (!str(kind) || !KINDS.includes(kind as QuantityKind)) return undefined;
  if (!str(unit, 20) || !str(role) || !ROLES.includes(role as ColumnRole)) return undefined;
  const column: DesignColumn = {
    id,
    symbol,
    kind: kind as QuantityKind,
    unit,
    role: role as ColumnRole,
  };
  if (group !== undefined) {
    if (!str(group, 20)) return undefined;
    column.group = group;
  }
  if (formula !== undefined) {
    if (!str(formula, 120)) return undefined;
    column.formula = formula;
  }
  if (note !== undefined) {
    if (!str(note, 80)) return undefined;
    column.note = note;
  }
  if (leastCount !== undefined) {
    if (!leastCount || typeof leastCount !== "object" || Array.isArray(leastCount))
      return undefined;
    const lc = leastCount as Record<string, Json>;
    if (typeof lc.value !== "number" || !(lc.value > 0) || !str(lc.unit, 20)) return undefined;
    // A digital display is read to its last digit (the uncertainty layer); a scale by eye.
    column.leastCount = {
      value: lc.value,
      unit: lc.unit,
      ...(lc.digital === true ? { digital: true } : {}),
    };
  }
  return column;
}

/** What the student asks of the table. */
export type TableCommand =
  | { type: "start-table"; layout: TableLayout; template?: string; columns: DesignColumn[] }
  | { type: "set-columns"; columns: DesignColumn[] }
  | { type: "add-row"; id: string }
  | { type: "remove-row"; id: string }
  | { type: "set-cell"; row: string; column: string; value: string };

export type TableRefusal =
  "bad-columns" | "row-exists" | "no-such-row" | "no-such-column" | "cell-too-long" | "unchanged";

export type TableDecision = { ok: true; events: NewEvent[] } | { ok: false; reason: TableRefusal };

const validColumns = (columns: readonly DesignColumn[]) =>
  new Set(columns.map((c) => c.id)).size === columns.length &&
  columns.every((c) => asColumn(c as unknown as Json) !== undefined);

const toJson = (columns: readonly DesignColumn[]) => columns as unknown as Json;

/** Turn a table action into events, or refuse it. Pure. */
export function decideTable(state: TableState, command: TableCommand): TableDecision {
  switch (command.type) {
    case "start-table":
    case "set-columns": {
      if (!validColumns(command.columns)) return { ok: false, reason: "bad-columns" };
      if (command.type === "set-columns")
        return {
          ok: true,
          events: [{ kind: "table.columns", data: { columns: toJson(command.columns) } }],
        };
      return {
        ok: true,
        events: [
          {
            kind: "table.start",
            data: {
              layout: command.layout,
              ...(command.template ? { template: command.template } : {}),
              columns: toJson(command.columns),
            },
          },
        ],
      };
    }
    case "add-row":
      if (!str(command.id, 40) || state.rows.some((r) => r.id === command.id))
        return { ok: false, reason: "row-exists" };
      return { ok: true, events: [{ kind: "table.row-add", data: { id: command.id } }] };
    case "remove-row":
      if (!state.rows.some((r) => r.id === command.id)) return { ok: false, reason: "no-such-row" };
      return { ok: true, events: [{ kind: "table.row-remove", data: { id: command.id } }] };
    case "set-cell": {
      const row = state.rows.find((r) => r.id === command.row);
      if (!row) return { ok: false, reason: "no-such-row" };
      if (!state.columns.some((c) => c.id === command.column))
        return { ok: false, reason: "no-such-column" };
      if (command.value.length > MAX_CELL) return { ok: false, reason: "cell-too-long" };
      if ((row.cells[command.column] ?? "") === command.value)
        return { ok: false, reason: "unchanged" };
      return {
        ok: true,
        events: [
          {
            kind: "table.cell",
            data: { row: command.row, column: command.column, value: command.value },
          },
        ],
      };
    }
  }
}

function commandOf(e: LabEvent): TableCommand | undefined {
  const d = (e.data ?? {}) as Record<string, Json>;
  const columns = () => {
    if (!Array.isArray(d.columns)) return undefined;
    const parsed = d.columns.map(asColumn);
    return parsed.every((c) => c !== undefined) ? (parsed as DesignColumn[]) : undefined;
  };
  switch (e.kind) {
    case "table.start": {
      const cols = columns();
      if (!cols || !(TABLE_LAYOUTS as readonly Json[]).includes(d.layout ?? null)) return undefined;
      return {
        type: "start-table",
        layout: d.layout as TableLayout,
        ...(str(d.template, 40) ? { template: d.template } : {}),
        columns: cols,
      };
    }
    case "table.columns": {
      const cols = columns();
      return cols ? { type: "set-columns", columns: cols } : undefined;
    }
    case "table.row-add":
      return str(d.id, 40) ? { type: "add-row", id: d.id } : undefined;
    case "table.row-remove":
      return str(d.id, 40) ? { type: "remove-row", id: d.id } : undefined;
    case "table.cell":
      return str(d.row, 40) && str(d.column, 40) && typeof d.value === "string"
        ? { type: "set-cell", row: d.row, column: d.column, value: d.value }
        : undefined;
    default:
      return undefined;
  }
}

/** Keep only cells whose column is still in the table. */
const prune = (rows: TableState["rows"], columns: readonly DesignColumn[]) => {
  const ids = new Set(columns.map((c) => c.id));
  return rows.map((r) => ({
    ...r,
    cells: Object.fromEntries(Object.entries(r.cells).filter(([id]) => ids.has(id))),
  }));
};

function applyTable(state: TableState, command: TableCommand): TableState {
  switch (command.type) {
    case "start-table":
      return {
        layout: command.layout,
        template: command.template,
        columns: command.columns,
        // Starting again keeps the rows and whatever was typed in columns that remain.
        rows: prune(state.rows, command.columns),
      };
    case "set-columns":
      return { ...state, columns: command.columns, rows: prune(state.rows, command.columns) };
    case "add-row":
      return { ...state, rows: [...state.rows, { id: command.id, cells: {} }] };
    case "remove-row":
      return { ...state, rows: state.rows.filter((r) => r.id !== command.id) };
    case "set-cell":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === command.row
            ? { ...r, cells: { ...r.cells, [command.column]: command.value } }
            : r,
        ),
      };
  }
}

export const tableProjection: Projection<TableState> = {
  initial: () => EMPTY_TABLE,
  apply(state, event) {
    const command = commandOf(event);
    if (!command || !decideTable(state, command).ok) return state;
    return applyTable(state, command);
  },
};
