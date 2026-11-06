import type { Finding, Rule } from "./findings";
import { findOutlier } from "./outliers";
import { decimalsForResolution } from "./sigfigs";
import { leastCountInColumnUnit, type ParsedTable } from "./table";
import { fromSI, suspectedUnitSlip, UNITS } from "./units";

/**
 * Checks on the results table, harvested from Physics Bench and fitted to WASSCE tabulation:
 * enough readings, readable cells, consistent decimal places, precision that matches the
 * instrument, means with one more decimal place than their readings, unit slips, the student's
 * own arithmetic, and readings worth repeating.
 */

export interface TableContext {
  table: ParsedTable;
  /** The columns the theory plots (x against y), for the range and outlier checks. */
  plot?: { x: string; y: string };
}

export type TableRule = Rule<TableContext>;

/** WASSCE tables ask for at least five sets of readings; six or more earns a "good". */
export const MIN_ROWS = 5;

const finding = (f: Omit<Finding, "skill">): Finding => ({ skill: "tabulation", ...f });

export const tooFewRows: TableRule = {
  id: "table-too-few-rows",
  skill: "tabulation",
  check: ({ table }) => {
    const n = table.completeRows.length;
    if (n > MIN_ROWS)
      return [
        finding({
          rule: "table-too-few-rows",
          severity: "good",
          key: "table.enoughRows",
          params: { n },
        }),
      ];
    if (n === MIN_ROWS) return [];
    return [
      finding({
        rule: "table-too-few-rows",
        severity: n < 3 ? "error" : "warning",
        key: "table.tooFewRows",
        params: { n, min: MIN_ROWS },
      }),
    ];
  },
};

/** Headings are quantity over unit (T²/s², l/m): a column without its unit loses the mark. */
export const headingUnits: TableRule = {
  id: "table-heading-unit",
  skill: "tabulation",
  check: ({ table }) =>
    table.columns
      .filter((c) => c.unit === "" && c.kind !== "count")
      .map((column) => {
        const unit = UNITS[column.kind][0]!.symbol;
        return finding({
          rule: "table-heading-unit",
          severity: "warning",
          key: "table.headingUnit",
          params: { symbol: column.symbol, heading: `${column.symbol}/${unit}` },
          column: column.id,
        });
      }),
};

export const unreadableCells: TableRule = {
  id: "table-unreadable",
  skill: "tabulation",
  check: ({ table }) =>
    table.columns.flatMap((column) => {
      const bad = table.rows.filter((r) => {
        const cell = r.cells[column.id];
        return cell !== undefined && cell.raw !== "" && cell.figure === undefined;
      });
      return bad.length
        ? [
            finding({
              rule: "table-unreadable",
              severity: "error",
              key: "table.unreadable",
              params: { symbol: column.symbol, value: bad[0]!.cells[column.id]!.raw },
              rows: bad.map((r) => r.id),
              column: column.id,
            }),
          ]
        : [];
    }),
};

export const inconsistentDecimals: TableRule = {
  id: "table-inconsistent-decimals",
  skill: "tabulation",
  check: ({ table }) =>
    table.columns
      .filter((c) => c.source === "measured")
      .flatMap((column) => {
        const decimals = new Set(
          table.completeRows
            .map((r) => r.cells[column.id]?.figure?.decimals)
            .filter((d) => d !== undefined),
        );
        return decimals.size > 1
          ? [
              finding({
                rule: "table-inconsistent-decimals",
                severity: "warning",
                key: "table.inconsistentDecimals",
                params: { symbol: column.symbol, list: [...decimals].sort().join(", ") },
                column: column.id,
              }),
            ]
          : [];
      }),
};

/** A 0.01 s stopwatch gives two decimal places; more is false precision, fewer throws one away. */
export const precisionVsInstrument: TableRule = {
  id: "table-precision-vs-instrument",
  skill: "tabulation",
  check: ({ table }) =>
    table.columns.flatMap((column) => {
      if (column.source !== "measured") return [];
      const leastCount = leastCountInColumnUnit(column);
      if (leastCount === undefined) return [];
      const expected = decimalsForResolution(leastCount);
      const places = (r: (typeof table.completeRows)[number]) =>
        r.cells[column.id]?.figure?.decimals ?? expected;
      const over = table.completeRows.filter((r) => places(r) > expected);
      const under = table.completeRows.filter((r) => places(r) < expected);
      const base = {
        rule: "table-precision-vs-instrument",
        params: { symbol: column.symbol, expected, unit: column.unit },
        column: column.id,
      };
      if (over.length)
        return [
          finding({
            ...base,
            severity: "warning",
            key: "table.falsePrecision",
            rows: over.map((r) => r.id),
          }),
        ];
      if (under.length)
        return [
          finding({
            ...base,
            severity: "tip",
            key: "table.underRecorded",
            rows: under.map((r) => r.id),
          }),
        ];
      return [];
    }),
};

/** WASSCE tabulation: a mean takes one more decimal place than the readings it is the mean of. */
export const meanDecimals: TableRule = {
  id: "table-mean-decimals",
  skill: "tabulation",
  check: ({ table }) =>
    table.columns.flatMap((column) => {
      if (!column.meanOf?.length) return [];
      const wrong = table.completeRows.filter((r) => {
        const readingPlaces = column.meanOf!.map((id) => r.cells[id]?.figure?.decimals);
        const mean = r.cells[column.id]?.figure?.decimals;
        if (mean === undefined || readingPlaces.some((p) => p === undefined)) return false;
        return mean !== Math.max(...(readingPlaces as number[])) + 1;
      });
      if (!wrong.length) return [];
      const first = wrong[0]!;
      const expected =
        Math.max(...column.meanOf.map((id) => first.cells[id]!.figure!.decimals)) + 1;
      return [
        finding({
          rule: "table-mean-decimals",
          severity: "warning",
          key: "table.meanDecimals",
          params: { symbol: column.symbol, expected, value: first.cells[column.id]!.raw },
          rows: wrong.map((r) => r.id),
          column: column.id,
        }),
      ];
    }),
};

export const unitSlip: TableRule = {
  id: "table-unit-slip",
  skill: "tabulation",
  check: ({ table }) =>
    table.columns
      .filter((c) => c.source !== "derived")
      .flatMap((column) => {
        const values = table.completeRows
          .map((r) => ({ id: r.id, v: r.cells[column.id]?.figure?.value }))
          .filter((x): x is { id: string; v: number } => x.v !== undefined);
        if (values.length < 3) return [];
        const sorted = values.map((x) => x.v).sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)]!;
        return values.flatMap(({ id, v }) => {
          // A slip sits well outside the rest of the column, not just far from the median: a
          // volume column running 0, 50 … 350 is a wide range, not a slip.
          const others = values.filter((x) => x.id !== id && x.v !== 0).map((x) => Math.abs(x.v));
          const outside =
            v !== 0 &&
            others.length > 0 &&
            (Math.abs(v) < Math.min(...others) / 6 || Math.abs(v) > Math.max(...others) * 6);
          const factor = outside ? suspectedUnitSlip(v, median) : undefined;
          return factor
            ? [
                finding({
                  rule: "table-unit-slip",
                  severity: "error",
                  key: "table.unitSlip",
                  params: { symbol: column.symbol, value: v, factor },
                  rows: [id],
                  column: column.id,
                }),
              ]
            : [];
        });
      }),
};

/** The student works out derived columns (T, T²); check their arithmetic row by row. */
export const derivedArithmetic: TableRule = {
  id: "table-derived-arithmetic",
  skill: "tabulation",
  check: ({ table }) =>
    table.columns.flatMap((column) => {
      if (column.source !== "derived" || !column.derive) return [];
      const wrong: string[] = [];
      let example: { typed: number; expected: string } | undefined;
      for (const row of table.completeRows) {
        const typed = row.cells[column.id];
        if (!typed?.figure || typed.si === undefined) continue;
        const inputs: Record<string, number> = {};
        for (const [id, cell] of Object.entries(row.cells))
          if (cell.si !== undefined) inputs[id] = cell.si;
        const expectedSI = column.derive(inputs, table.constants);
        if (!Number.isFinite(expectedSI)) continue;
        // Allow 1%, or the rounding the student's own decimal places imply, whichever is larger.
        const roundingSI =
          0.6 * 10 ** -typed.figure.decimals * Math.abs(typed.si / (typed.figure.value || 1));
        const tolerance = Math.max(Math.abs(expectedSI) * 0.01, roundingSI);
        if (Math.abs(typed.si - expectedSI) > tolerance) {
          wrong.push(row.id);
          example ??= {
            typed: typed.figure.value,
            expected: fromSI(expectedSI, column.kind, column.unit).toPrecision(4),
          };
        }
      }
      return wrong.length
        ? [
            finding({
              rule: "table-derived-arithmetic",
              severity: "error",
              key: "table.derivedArithmetic",
              params: {
                symbol: column.symbol,
                count: wrong.length,
                typed: example!.typed,
                expected: example!.expected,
                unit: column.unit,
              },
              rows: wrong,
              column: column.id,
            }),
          ]
        : [];
    }),
};

export const narrowRange: TableRule = {
  id: "table-narrow-range",
  skill: "measurement",
  check: ({ table, plot }) => {
    if (!plot) return [];
    const xs = table.completeRows
      .map((r) => r.cells[plot.x]?.si)
      .filter((v): v is number => v !== undefined);
    if (xs.length < 3) return [];
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    if (min <= 0 || max / min >= 1.6) return [];
    return [
      {
        rule: "table-narrow-range",
        severity: "warning",
        skill: "measurement",
        key: "table.narrowRange",
        params: { ratio: (max / min).toFixed(2) },
      },
    ];
  },
};

/**
 * A reading worth repeating: the Bonferroni outlier test (outliers.ts), which works on the
 * 5 to 8 readings of a school table where a fixed standardised-residual cut-off cannot.
 */
export const readingToRepeat: TableRule = {
  id: "table-outlier",
  skill: "measurement",
  check: ({ table, plot }) => {
    if (!plot) return [];
    const rows = table.completeRows.filter(
      (r) => r.cells[plot.x]?.si !== undefined && r.cells[plot.y]?.si !== undefined,
    );
    const outlier = findOutlier(
      rows.map((r) => ({ x: r.cells[plot.x]!.si!, y: r.cells[plot.y]!.si! })),
    );
    if (!outlier) return [];
    return [
      {
        rule: "table-outlier",
        severity: "warning",
        skill: "measurement",
        key: "table.outlier",
        params: { t: Math.abs(outlier.t).toFixed(1), critical: outlier.critical.toFixed(1) },
        rows: [rows[outlier.index]!.id],
      },
    ];
  },
};

export const TABLE_RULES: TableRule[] = [
  tooFewRows,
  headingUnits,
  unreadableCells,
  inconsistentDecimals,
  precisionVsInstrument,
  meanDecimals,
  unitSlip,
  derivedArithmetic,
  narrowRange,
  readingToRepeat,
];
