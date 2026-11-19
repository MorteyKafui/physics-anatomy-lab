import { describe, expect, test } from "bun:test";

import { BANK_PER_EXAM, pick } from "../src/app/lab/exam/bank";

describe("questions from the bank in an exam", () => {
  const bank = Array.from({ length: 8 }, (_, i) => `q${String(i)}`);

  test("at most three, all from the bank, none twice", () => {
    const got = pick(bank, 42, BANK_PER_EXAM);
    expect(got).toHaveLength(3);
    expect(new Set(got).size).toBe(3);
    expect(got.every((q) => bank.includes(q))).toBe(true);
  });

  test("the same run always shows the same ones; another run may show others", () => {
    expect(pick(bank, 42, 3)).toEqual(pick(bank, 42, 3));
    const seen = new Set(Array.from({ length: 20 }, (_, s) => pick(bank, s + 1, 3).join()));
    expect(seen.size).toBeGreaterThan(1);
  });

  test("a short bank shows what it has, and an empty one nothing", () => {
    expect(pick(["only"], 7, 3)).toEqual(["only"]);
    expect(pick([], 7, 3)).toEqual([]);
  });
});
