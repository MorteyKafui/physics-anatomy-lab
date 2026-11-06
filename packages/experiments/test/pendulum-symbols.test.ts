import { describe, expect, test } from "bun:test";
import { parseFormula, parseUnit, unitsOf } from "@pa/analysis";

import { benchPeriod, PENDULUM_FORMULAS, PENDULUM_SYMBOLS, symbolFacts } from "../src";

const facts = symbolFacts(9.81);

describe("the symbol cards", () => {
  test("quote numbers worked out from the bench, and none for g", () => {
    expect(facts.l.typical).toEqual({ min: "0.400", max: "1.000" });
    expect(facts.T.typical).toEqual({
      min: benchPeriod(9.81, 0.4).toPrecision(2),
      max: benchPeriod(9.81, 1).toPrecision(2),
    });
    expect(facts.g.typical).toBeUndefined();
  });

  test("give every symbol a unit the calculator can read", () => {
    for (const s of PENDULUM_SYMBOLS) expect(parseUnit(facts[s].unit)).toBeDefined();
  });
});

describe("the formula cards", () => {
  test("parse, and use only the symbols they list", () => {
    for (const f of PENDULUM_FORMULAS) {
      const rhs = parseFormula(f.rhs, f.symbols);
      expect(rhs.ok).toBe(true);
      expect(parseFormula(f.lhs, f.symbols).ok).toBe(true);
    }
  });

  test("balance their units on both sides (the dimension check)", () => {
    const symbols = Object.fromEntries(
      PENDULUM_SYMBOLS.map((s) => [s, { value: 1, dims: parseUnit(facts[s].unit)!.dims }]),
    );
    for (const f of PENDULUM_FORMULAS) {
      expect({ id: f.id, units: unitsOf(f.rhs, symbols)?.dims }).toEqual({
        id: f.id,
        units: unitsOf(f.lhs, symbols)?.dims,
      });
    }
  });
});
