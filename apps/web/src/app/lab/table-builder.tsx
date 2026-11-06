"use client";

import {
  addRepeat,
  checkFormula,
  formulaUnitFindings,
  heading,
  newColumnId,
  parseFormula,
  repeatsOf,
  toSIText,
  UNITS,
  type ColumnRole,
  type DesignColumn,
  type Finding,
  type QuantityKind,
  type TableDesign,
} from "@pa/analysis";
import {
  decideTable,
  EMPTY_TABLE,
  replay,
  tableProjection,
  type TableCommand,
  type TableLayout,
  type TableState,
} from "@pa/engine";
import {
  PENDULUM_INSTRUMENTS,
  PENDULUM_STANDARD_TABLE,
  PENDULUM_TEMPLATES,
  STARTING_ROWS,
  type PendulumReading,
  type PendulumTemplate,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon, PlusIcon, SigmaIcon, Trash2Icon, TriangleAlertIcon } from "@pa/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { AttemptHandle } from "./use-attempt";

const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

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

const newRowId = () => `row-${globalThis.crypto.randomUUID().slice(0, 8)}`;

/** Commands that start a table and give it its first rows. */
export function startTable(
  current: TableState,
  layout: TableLayout,
  template: PendulumTemplate | undefined,
  lengthsMeasured: number,
): TableCommand[] {
  const columns =
    layout === "standard"
      ? [...PENDULUM_STANDARD_TABLE]
      : layout === "template"
        ? [...PENDULUM_TEMPLATES[template ?? "two-repeats"]]
        : current.layout === undefined
          ? []
          : current.columns;
  const rows = Math.max(STARTING_ROWS, lengthsMeasured) - current.rows.length;
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

function roleNote(design: TableDesign, c: DesignColumn): string {
  if (c.note) return c.note;
  switch (c.role) {
    case "repeat": {
      const group = design.columns.filter((x) => x.role === "repeat" && x.group === c.group);
      return msg("lab.table.role.repeat", { n: group.indexOf(c) + 1 });
    }
    case "mean":
      return msg("lab.table.role.mean", {
        list: repeatsOf(design, c)
          .map((r) => r.symbol)
          .join(", "),
      });
    case "derived": {
      const formula = (c.formula ?? "").replace(/\s/g, "");
      // "T² = T²" says nothing: say what it is worked out from instead.
      if (formula === c.symbol.replace(/\s/g, "")) {
        const known = design.columns.filter((x) => x.id !== c.id).map((x) => x.symbol);
        const parsed = parseFormula(c.formula ?? "", known);
        if (parsed.ok)
          return msg("lab.table.role.derivedFrom", { list: parsed.symbols.join(", ") });
      }
      return msg("lab.table.role.derived", { symbol: c.symbol, formula: c.formula ?? "" });
    }
    default:
      return msg(`lab.table.role.${c.role}`);
  }
}

const KINDS = Object.keys(UNITS) as QuantityKind[];

/** The panel for adding a column or changing one. */
function ColumnEditor({
  design,
  editing,
  startAs,
  onSave,
  onCancel,
  onDelete,
  onMove,
}: {
  design: TableDesign;
  editing: DesignColumn | undefined;
  startAs: ColumnRole;
  onSave: (c: DesignColumn) => void;
  onCancel: () => void;
  onDelete: (() => void) | undefined;
  onMove: ((by: -1 | 1) => void) | undefined;
}) {
  const [symbol, setSymbol] = useState(editing?.symbol ?? "");
  const [kind, setKind] = useState<QuantityKind>(
    editing?.kind ?? (startAs === "notes" ? "count" : "time"),
  );
  const [unit, setUnit] = useState(editing?.unit ?? UNITS[editing?.kind ?? "time"][0]!.symbol);
  const [role, setRole] = useState<ColumnRole>(editing?.role ?? startAs);
  const [formula, setFormula] = useState(editing?.formula ?? "");
  const fixedRole = editing?.role === "repeat" || editing?.role === "mean";

  const draft: DesignColumn = {
    id: editing?.id ?? newColumnId(design, symbol || "c"),
    symbol: symbol.trim(),
    kind: role === "notes" ? "count" : kind,
    unit: role === "notes" ? "" : unit,
    role,
    ...(editing?.group ? { group: editing.group } : {}),
    ...(role === "derived" ? { formula: formula.trim() } : {}),
    ...((role === "given" || role === "measured" || role === "repeat") && PENDULUM_INSTRUMENTS[kind]
      ? { leastCount: PENDULUM_INSTRUMENTS[kind]! }
      : {}),
  };
  const others = design.columns.filter((c) => c.id !== editing?.id);
  const problem = !draft.symbol
    ? t("lab.column.symbolMissing")
    : others.some((c) => c.symbol === draft.symbol)
      ? t("lab.column.symbolTaken", { symbol: draft.symbol })
      : role === "derived"
        ? (() => {
            const check = checkFormula({ columns: [...others, draft] }, draft);
            return check.ok
              ? undefined
              : msg(`table.formula.${check.problem}`, { near: check.near ?? "" });
          })()
        : undefined;

  // The dimension check, as the student writes the formula: a warning, not a block.
  const unitsWarning =
    role === "derived"
      ? formulaUnitFindings({ columns: [...others, draft] }).find((f) => f.column === draft.id)
      : undefined;

  const field = "h-9 border border-input bg-background px-2.5 text-sm text-foreground";
  return (
    <form
      aria-label={editing ? t("lab.column.edit") : t("lab.column.new")}
      className="flex flex-wrap items-end gap-3 border-b border-border bg-raised p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!problem) onSave(draft);
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t("lab.column.symbol")}
        <input
          className={cn(field, "w-24 font-mono")}
          value={symbol}
          autoFocus
          maxLength={20}
          onChange={(e) => setSymbol(e.target.value)}
        />
      </label>
      {!fixedRole && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("lab.column.role")}
          <select
            className={field}
            value={role}
            onChange={(e) => setRole(e.target.value as ColumnRole)}
          >
            <option value="given">{t("lab.column.roleGiven")}</option>
            <option value="measured">{t("lab.column.roleMeasured")}</option>
            <option value="derived">{t("lab.column.roleDerived")}</option>
            <option value="notes">{t("lab.column.roleNotes")}</option>
          </select>
        </label>
      )}
      {role !== "notes" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("lab.column.quantity")}
            <select
              className={field}
              value={kind}
              disabled={fixedRole}
              onChange={(e) => {
                const k = e.target.value as QuantityKind;
                setKind(k);
                setUnit(UNITS[k][0]!.symbol);
              }}
            >
              {KINDS.filter((k) => k !== "count").map((k) => (
                <option key={k} value={k}>
                  {msg(`quantity.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("lab.column.unit")}
            <select
              className={cn(field, "font-mono")}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {UNITS[kind].map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.symbol}
                </option>
              ))}
              <option value="">{t("lab.column.noUnit")}</option>
            </select>
            <span className="min-h-4 font-mono">{toSIText(kind, unit) ?? ""}</span>
          </label>
        </>
      )}
      {role === "derived" && (
        <div className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-muted-foreground">
          <label className="flex flex-col gap-1">
            {t("lab.column.formula")}
            <input
              className={cn(field, "font-mono")}
              value={formula}
              maxLength={120}
              placeholder="t / 20"
              aria-describedby="formula-hint"
              onChange={(e) => setFormula(e.target.value)}
            />
          </label>
          <span id="formula-hint">{t("lab.column.formulaHint")}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={problem !== undefined}>
          {t("lab.column.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("lab.column.cancel")}
        </Button>
        {onMove && (
          <>
            <Button type="button" variant="ghost" onClick={() => onMove(-1)}>
              {t("lab.column.left")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onMove(1)}>
              {t("lab.column.right")}
            </Button>
          </>
        )}
        {onDelete && (
          <Button type="button" variant="ghost" className="text-danger" onClick={onDelete}>
            <Trash2Icon aria-hidden />
            {t("lab.column.delete")}
          </Button>
        )}
      </div>
      {problem && symbol !== "" && (
        <p role="status" className="basis-full text-sm text-warn">
          {problem}
        </p>
      )}
      {!problem && unitsWarning && (
        <p role="status" className="basis-full text-sm text-warn">
          {msg(`${unitsWarning.key}.title`, unitsWarning.params)}
        </p>
      )}
    </form>
  );
}

/** The results table: choose how it is laid out, design it, and write it in. */
export function TableBuilder({
  table,
  shown,
  assist,
  marks,
  flags,
  readings,
  onRun,
  onFillReadings,
  onCommit,
  below,
}: {
  table: TableState;
  /** The table with worked-out cells filled in when the help level fills them. */
  shown: TableDesign;
  /** Whether worked-out cells are filled in for the student (Auto). */
  assist: boolean;
  /** Whether to tick and flag cells as the student goes (Auto and Check my work). */
  marks: boolean;
  flags: Flags;
  readings: readonly PendulumReading[];
  onRun: (commands: TableCommand[]) => Promise<void>;
  onFillReadings: (() => void) | undefined;
  onCommit: () => void;
  below: ReactNode;
}) {
  const [template, setTemplate] = useState<PendulumTemplate>(
    (table.template as PendulumTemplate | undefined) ?? "two-repeats",
  );
  const [editor, setEditor] = useState<{ id?: string; role: ColumnRole }>();
  const [selected, setSelected] = useState<string>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const lengths = new Set(readings.map((r) => r.l)).size;
  const editing = table.columns.find((c) => c.id === editor?.id);
  const selectedColumn = table.columns.find((c) => c.id === selected);
  const canRepeat = selectedColumn?.role === "measured" || selectedColumn?.role === "repeat";

  const setColumns = (columns: DesignColumn[]) => onRun([{ type: "set-columns", columns }]);
  const save = (c: DesignColumn) => {
    const at = table.columns.findIndex((x) => x.id === c.id);
    const columns = [...table.columns];
    if (at >= 0) columns[at] = c;
    else columns.push(c);
    void setColumns(columns);
    setEditor(undefined);
    setSelected(c.id);
  };
  const move = (id: string, by: -1 | 1) => {
    const at = table.columns.findIndex((c) => c.id === id);
    const to = at + by;
    if (at < 0 || to < 0 || to >= table.columns.length) return;
    const columns = [...table.columns];
    [columns[at], columns[to]] = [columns[to]!, columns[at]!];
    void setColumns(columns);
  };

  const commitCell = (row: string, column: string) => {
    const key = `${row}:${column}`;
    const value = drafts[key];
    if (value === undefined) return;
    setDrafts((d) => {
      const rest = { ...d };
      delete rest[key];
      return rest;
    });
    void onRun([{ type: "set-cell", row, column, value: value.trim() }]).then(onCommit);
  };

  const segment = (on: boolean) =>
    cn(
      "h-9 px-3 text-sm font-medium",
      on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <section
      aria-label={t("lab.table.label")}
      className="flex w-full min-w-0 flex-col border border-border bg-surface"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div
          role="group"
          aria-label={t("lab.table.layout")}
          className="inline-flex border border-border"
        >
          {(["standard", "template", "own"] as const).map((layout, i) => (
            <button
              key={layout}
              type="button"
              aria-pressed={table.layout === layout}
              className={cn(segment(table.layout === layout), i > 0 && "border-l border-border")}
              onClick={() =>
                void onRun(
                  startTable(table, layout, layout === "template" ? template : undefined, lengths),
                )
              }
            >
              {msg(`lab.table.layout.${layout}`)}
            </button>
          ))}
        </div>
        {table.layout === "template" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t("lab.table.template")}
            <select
              className="h-9 border border-input bg-background px-2.5 text-sm text-foreground"
              value={template}
              onChange={(e) => {
                const next = e.target.value as PendulumTemplate;
                setTemplate(next);
                void onRun(startTable(table, "template", next, lengths));
              }}
            >
              {(Object.keys(PENDULUM_TEMPLATES) as PendulumTemplate[]).map((k) => (
                <option key={k} value={k}>
                  {msg(`lab.table.template.${k}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="flex-1" />
        {table.layout && (
          <>
            <Button variant="outline" onClick={() => setEditor({ role: "measured" })}>
              <PlusIcon aria-hidden />
              {t("lab.table.addColumn")}
            </Button>
            <Button
              variant="outline"
              disabled={!canRepeat}
              title={canRepeat ? undefined : t("lab.table.addRepeatHint")}
              onClick={() => selected && void setColumns(addRepeat(table, selected).columns)}
            >
              <PlusIcon aria-hidden />
              {t("lab.table.addRepeat")}
            </Button>
            <Button variant="outline" onClick={() => setEditor({ role: "derived" })}>
              <SigmaIcon aria-hidden />
              {t("lab.table.addFormula")}
            </Button>
            <Button variant="outline" onClick={() => setEditor({ role: "notes" })}>
              <PlusIcon aria-hidden />
              {t("lab.table.addNotes")}
            </Button>
          </>
        )}
      </div>

      {editor && (
        <ColumnEditor
          key={editor.id ?? `new-${editor.role}`}
          design={table}
          editing={editing}
          startAs={editor.role}
          onSave={save}
          onCancel={() => setEditor(undefined)}
          onDelete={
            editing
              ? () => {
                  void setColumns(table.columns.filter((c) => c.id !== editing.id));
                  setEditor(undefined);
                }
              : undefined
          }
          onMove={editing ? (by) => move(editing.id, by) : undefined}
        />
      )}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border px-3 py-2 text-sm">
        <span className="text-muted-foreground">{t("lab.table.yourReadings")}</span>
        <span className="font-mono text-xs">
          {readings.length
            ? [...new Set(readings.map((r) => r.l))]
                .map((l) =>
                  t("lab.readout.atLength", {
                    length: l.toFixed(3),
                    list: readings
                      .filter((r) => r.l === l)
                      .map((r) => `${r.t.toFixed(2)} s`)
                      .join(", "),
                  }),
                )
                .join(" · ")
            : t("lab.table.noReadings")}
        </span>
        {onFillReadings && readings.length > 0 && table.columns.length > 0 && (
          <Button variant="link" size="sm" className="px-0" onClick={onFillReadings}>
            {t("lab.table.fillReadings")}
          </Button>
        )}
      </div>

      {!table.layout ? (
        <p className="p-5 text-soft">{t("lab.table.start")}</p>
      ) : table.columns.length === 0 ? (
        <p className="p-5 text-soft">{t("lab.table.ownEmpty")}</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table
            aria-label={t("lab.table.label")}
            className="w-full min-w-[620px] table-fixed border-collapse font-mono text-sm"
          >
            <thead>
              <tr>
                {table.columns.map((c) => {
                  const flag = flags.column.get(c.id);
                  return (
                    <th
                      key={c.id}
                      scope="col"
                      data-column={c.id}
                      className={cn(
                        "border-b border-border p-0 text-left align-top font-normal",
                        flag && "bg-warn-wash outline -outline-offset-1 outline-warn",
                        selected === c.id && !flag && "bg-raised",
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={selected === c.id}
                        className="flex w-full flex-col px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-ring"
                        onClick={() => {
                          setSelected(c.id);
                          setEditor({ id: c.id, role: c.role });
                        }}
                      >
                        <span className="text-[15px]">{heading(c)}</span>{" "}
                        <span
                          className={cn(
                            "font-sans text-[11px]",
                            flag ? "text-warn" : "text-muted-foreground",
                          )}
                        >
                          {flag
                            ? msg(`${flag.key}.title`, { ...flag.params, row: "" })
                            : roleNote(table, c)}
                        </span>
                        {toSIText(c.kind, c.unit) && (
                          <span className="font-sans text-[11px] text-muted-foreground">
                            {toSIText(c.kind, c.unit)}
                          </span>
                        )}
                        <span className="sr-only">, {t("lab.table.editColumn")}</span>
                      </button>
                    </th>
                  );
                })}
                <th scope="col" className="w-12 border-b border-border">
                  <span className="sr-only">{t("lab.table.removeRow", { row: "" })}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.rows.map((row, i) => (
                <tr key={row.id} className={cn(flags.row.has(row.id) && "bg-warn-wash")}>
                  {table.columns.map((c) => {
                    const key = `${row.id}:${c.id}`;
                    const worked = assist && (c.role === "mean" || c.role === "derived");
                    const value = drafts[key] ?? row.cells[c.id] ?? "";
                    const flag = flags.cell.get(key);
                    const tick =
                      marks && !flag && value !== "" && (c.role === "mean" || c.role === "derived");
                    const label = t("lab.table.cell", { row: i + 1, heading: heading(c) });
                    const reason = flag && msg(`${flag.key}.title`, { ...flag.params, row: i + 1 });
                    return (
                      <td
                        key={c.id}
                        className={cn(
                          "border-b border-border p-0",
                          flag &&
                            "bg-warn-wash outline-[1.5px] -outline-offset-1 outline-warn outline",
                        )}
                      >
                        {worked ? (
                          <span
                            className="flex h-10 items-center gap-1.5 px-3 text-soft"
                            aria-label={`${label}: ${value}`}
                          >
                            {value}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <input
                              data-cell={key}
                              aria-label={label}
                              aria-invalid={flag ? true : undefined}
                              aria-describedby={flag ? `why-${key}` : undefined}
                              title={reason || undefined}
                              inputMode={c.role === "notes" ? "text" : "decimal"}
                              autoComplete="off"
                              maxLength={60}
                              className={cn(
                                "h-10 w-full min-w-16 bg-transparent px-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                                c.role === "notes" && "font-sans",
                              )}
                              value={value}
                              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                              onBlur={() => commitCell(row.id, c.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitCell(row.id, c.id);
                                  const next = document.querySelector<HTMLInputElement>(
                                    `[data-cell="${shown.rows[i + 1]?.id}:${c.id}"]`,
                                  );
                                  next?.focus();
                                }
                              }}
                            />
                            {tick && (
                              <CheckIcon
                                className="mr-2 size-3.5 shrink-0 text-ok"
                                aria-label={t("lab.table.checked")}
                              />
                            )}
                            {flag && (
                              <>
                                <TriangleAlertIcon
                                  className="mr-2 size-3.5 shrink-0 text-warn"
                                  aria-hidden
                                />
                                <span id={`why-${key}`} className="sr-only">
                                  {reason}
                                </span>
                              </>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-border p-0 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("lab.table.removeRow", { row: i + 1 })}
                      onClick={() => void onRun([{ type: "remove-row", id: row.id }])}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {table.layout && (
        <div className="flex flex-wrap items-center gap-3 p-3">
          <Button
            variant="outline"
            onClick={() => void onRun([{ type: "add-row", id: newRowId() }])}
          >
            <PlusIcon aria-hidden />
            {t("lab.table.addRow")}
          </Button>
          {assist && (
            <span className="text-xs text-muted-foreground">{t("lab.table.workedOut")}</span>
          )}
        </div>
      )}
      {below}
    </section>
  );
}
