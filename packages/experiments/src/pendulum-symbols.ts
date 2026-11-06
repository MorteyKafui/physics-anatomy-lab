import { simplePendulum, benchPeriod } from "./simple-pendulum";
import { LENGTHS } from "./pendulum-table";

/**
 * The pendulum's symbols and formulas, for the formula and symbol cards (master plan, "Formulas,
 * symbols and units, everywhere they appear"). Words live in packages/i18n under symbols.<id>;
 * every number a card quotes is worked out here from the bench and packages/physics (rule 1).
 * g has no typical value on its card: the accepted value stays hidden until the student has read
 * their feedback (the step machine's fourth rule).
 */

export const PENDULUM_SYMBOLS = ["l", "T", "t", "g", "θ"] as const;
export type PendulumSymbol = (typeof PENDULUM_SYMBOLS)[number];

export interface SymbolFacts {
  /** The SI unit, as the book writes it. */
  unit: string;
  /** Values for the card's "typical size" line, or undefined to show none. */
  typical?: Record<string, string | number>;
}

/** Two significant figures, written with them: 2.0, not 2. */
const round2 = (v: number) => v.toPrecision(2);

/** What each symbol's card says in numbers, for a room with field strength g. */
export function symbolFacts(g: number): Record<PendulumSymbol, SymbolFacts> {
  const shortest = benchPeriod(g, LENGTHS.min);
  const longest = benchPeriod(g, LENGTHS.max);
  return {
    l: { unit: "m", typical: { min: LENGTHS.min.toFixed(3), max: LENGTHS.max.toFixed(3) } },
    T: { unit: "s", typical: { min: round2(shortest), max: round2(longest) } },
    t: {
      unit: "s",
      typical: {
        min: round2(simplePendulum.swings * shortest),
        max: round2(simplePendulum.swings * longest),
        swings: simplePendulum.swings,
      },
    },
    g: { unit: "m s⁻²" },
    θ: { unit: "°", typical: { angle: simplePendulum.amplitudeDeg } },
  };
}

/** A formula as the cards show it: its two sides in the formula language, and its symbols. */
export interface FormulaCard {
  id: string;
  lhs: string;
  rhs: string;
  symbols: readonly PendulumSymbol[];
}

export const PENDULUM_FORMULAS: readonly FormulaCard[] = [
  { id: "period", lhs: "T", rhs: "2π sqrt(l / g)", symbols: ["T", "l", "g"] },
  { id: "graph", lhs: "T²", rhs: "(4π² / g) l", symbols: ["T", "l", "g"] },
  { id: "timing", lhs: "T", rhs: `t / ${simplePendulum.swings}`, symbols: ["T", "t"] },
];
