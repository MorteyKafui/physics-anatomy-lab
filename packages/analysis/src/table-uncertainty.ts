import { parseFormula } from "./expression";
import { parseFigure } from "./sigfigs";
import { repeatsOf, type DesignColumn, type TableDesign } from "./table-design";
import { readingUncertainty, repeatsUncertainty, worstCase } from "./uncertainty";
import { findUnit, fromSI, toSI } from "./units";

/**
 * Every cell's uncertainty, worked out the way the table works out its values
 * (docs/content/uncertainty-brief.md, decisions 2 to 4), column by column so a worked column can
 * follow from the ones before it:
 *
 * - a reading (given, measured or a repeat): from its instrument's least count, ± half of it on a
 *   scale, ± the last digit on a display;
 * - a mean: ± half the range of its repeats, never less than one repeat's own; with one timing
 *   only, a hand-timed time takes the reaction-time spread instead (`timing`);
 * - a worked column: worst-case propagation through its formula.
 *
 * Each uncertainty is in the column's own unit; a cell that cannot be worked out has none.
 */
export function tableUncertainties(
  design: TableDesign,
  options: { timing?: number } = {},
): Map<string, Record<string, number>> {
  const numeric = design.columns.filter((c) => c.role !== "notes");
  const inColumnUnit = (c: DesignColumn, si: number) =>
    findUnit(c.kind, c.unit) ? fromSI(si, c.kind, c.unit) : Number.NaN;
  const out = new Map<string, Record<string, number>>();
  for (const row of design.rows) {
    const value: Record<string, number> = {};
    for (const c of numeric) {
      const f = parseFigure(row.cells[c.id] ?? "");
      if (f && findUnit(c.kind, c.unit)) value[c.id] = toSI(f.value, c.kind, c.unit);
    }
    const u: Record<string, number> = {};
    for (const c of numeric) {
      if (c.role === "given" || c.role === "measured" || c.role === "repeat") {
        if (!c.leastCount || value[c.id] === undefined) continue;
        if (!findUnit(c.kind, c.leastCount.unit)) continue;
        // A least count is a size, a step on the scale: converted without the scale's offset
        // (0.1 °C is 0.1 K, not 273.25 K).
        const lc =
          toSI(c.leastCount.value, c.kind, c.leastCount.unit) - toSI(0, c.kind, c.leastCount.unit);
        // A value written as the difference of several readings (a rise) carries each one's.
        u[c.id] =
          readingUncertainty(lc, c.leastCount.digital ? "digital" : "scale") *
          (c.leastCount.readings ?? 1);
      } else if (c.role === "mean") {
        const repeats = repeatsOf(design, c).filter((r) => value[r.id] !== undefined);
        if (!repeats.length) continue;
        const single = Math.max(...repeats.map((r) => u[r.id] ?? 0));
        const floor =
          repeats.length === 1 && c.kind === "time" && options.timing !== undefined
            ? Math.max(single, options.timing)
            : single;
        u[c.id] = repeatsUncertainty(
          repeats.map((r) => value[r.id]!),
          floor,
        );
      } else if (c.role === "derived") {
        const others = numeric.filter((o) => o.id !== c.id);
        const parsed = parseFormula(
          c.formula ?? "",
          others.map((o) => o.symbol),
        );
        if (!parsed.ok) continue;
        const bySymbol = new Map(others.map((o) => [o.symbol, o.id]));
        const values: Record<string, number> = {};
        const us: Record<string, number> = {};
        let complete = true;
        for (const s of parsed.symbols) {
          const id = bySymbol.get(s)!;
          if (value[id] === undefined) complete = false;
          values[s] = value[id] ?? Number.NaN;
          if (u[id] !== undefined) us[s] = u[id];
        }
        if (!complete) continue;
        u[c.id] = worstCase(parsed.expr, values, us);
      }
    }
    const shown: Record<string, number> = {};
    for (const c of numeric) {
      if (u[c.id] === undefined) continue;
      // An uncertainty is a size, so it converts by the unit's scale only, never its offset.
      const scaled = inColumnUnit(c, u[c.id]!) - inColumnUnit(c, 0);
      if (Number.isFinite(scaled)) shown[c.id] = Math.abs(scaled);
    }
    out.set(row.id, shown);
  }
  return out;
}

/**
 * The largest percentage uncertainty in a table (decision 7): which column, and how large, so a
 * report can say which error dominates.
 */
export function largestPercentUncertainty(
  design: TableDesign,
  uncertainties: ReadonlyMap<string, Readonly<Record<string, number>>>,
): { symbol: string; percent: number } | undefined {
  let largest: { symbol: string; percent: number } | undefined;
  for (const row of design.rows) {
    for (const c of design.columns) {
      const u = uncertainties.get(row.id)?.[c.id];
      const v = Number(row.cells[c.id]);
      if (u === undefined || !Number.isFinite(v) || v === 0) continue;
      const percent = (100 * u) / Math.abs(v);
      if (!largest || percent > largest.percent) largest = { symbol: c.symbol, percent };
    }
  }
  return largest;
}
