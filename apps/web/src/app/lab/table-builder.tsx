"use client";

import type { DesignColumn, Finding, QuantityKind } from "@pa/analysis";
import {
  decideTable,
  EMPTY_TABLE,
  replay,
  tableProjection,
  type TableCommand,
  type TableLayout,
  type TableState,
} from "@pa/engine";
import { STARTING_ROWS } from "@pa/experiments";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { AttemptHandle } from "./use-attempt";

/** The table as of every decided change, even one still being saved, so quick typing is safe. */
export function useTable(handle: AttemptHandle | undefined) {
  const table = useMemo(
    () => (handle ? replay(tableProjection, handle.attempt, handle.events) : EMPTY_TABLE),
    [handle],
  );
  const live = useRef<TableState>(EMPTY_TABLE);
  const saving = useRef(0);
  useEffect(() => {
    if (saving.current === 0) live.current = table;
  }, [table]);

  const run = useCallback(
    async (commands: readonly TableCommand[]) => {
      if (!handle) return;
      const news = [];
      let state = live.current;
      for (const c of commands) {
        const d = decideTable(state, c);
        if (!d.ok) continue;
        news.push(...d.events);
        state = d.events.reduce(
          (s, e) =>
            tableProjection.apply(s, { ...e, id: "", attemptId: "", seq: 0, device: "", at: 0 }),
          state,
        );
      }
      if (!news.length) return;
      live.current = state;
      saving.current += 1;
      try {
        await handle.record(news);
      } finally {
        saving.current -= 1;
      }
    },
    [handle],
  );

  const now = useCallback(() => live.current, []);
  return { table, run, now };
}

export const newRowId = () => `row-${globalThis.crypto.randomUUID().slice(0, 8)}`;

/**
 * What an experiment gives the table builder: its standard table, the templates the student
 * can start from, the instrument each kind of quantity is read with, and its readings so far.
 */
export interface TableSpec {
  standard: readonly DesignColumn[];
  templates: Readonly<Record<string, readonly DesignColumn[]>>;
  defaultTemplate: string;
  instruments: Partial<Record<QuantityKind, NonNullable<DesignColumn["leastCount"]>>>;
  /** The kind a new column starts as. */
  defaultKind: QuantityKind;
  /** How many rows the readings so far need. */
  rowsNeeded: number;
  /** The readings so far, as one line under the table's toolbar; undefined when there are none. */
  readingsSummary: string | undefined;
}

/** Commands that start a table and give it its first rows. */
export function startTable(
  current: TableState,
  layout: TableLayout,
  template: string | undefined,
  spec: TableSpec,
): TableCommand[] {
  const columns =
    layout === "standard"
      ? [...spec.standard]
      : layout === "template"
        ? [...(spec.templates[template ?? spec.defaultTemplate] ?? spec.standard)]
        : current.layout === undefined
          ? []
          : current.columns;
  const rows = Math.max(STARTING_ROWS, spec.rowsNeeded) - current.rows.length;
  return [
    { type: "start-table", layout, ...(template ? { template } : {}), columns },
    ...Array.from({ length: Math.max(0, rows) }, () => ({
      type: "add-row" as const,
      id: newRowId(),
    })),
  ];
}

/** Where a finding points: whole columns, whole rows, or single cells. */
export interface Flags {
  cell: Map<string, Finding>;
  column: Map<string, Finding>;
  row: Map<string, Finding>;
}

export function flagsFor(findings: readonly Finding[]): Flags {
  const flags: Flags = { cell: new Map(), column: new Map(), row: new Map() };
  for (const f of findings) {
    if (f.severity === "good" || f.severity === "tip") continue;
    if (f.rows && f.column) for (const r of f.rows) flags.cell.set(`${r}:${f.column}`, f);
    else if (f.column) flags.column.set(f.column, f);
    else if (f.rows) for (const r of f.rows) flags.row.set(r, f);
  }
  return flags;
}
