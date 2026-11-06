import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  calculate,
  checkAnswer,
  formatDims,
  formatQuantity,
  parseUnit,
  type Quantity,
} from "../src";

const ok = (text: string) => {
  const r = calculate(text);
  if (!r.ok) throw new Error(`${text}: ${r.problem}`);
  return r;
};

describe("units", () => {
  test("are read the way a textbook writes them", () => {
    expect(parseUnit("s² m⁻¹")).toEqual(parseUnit("s^2/m"));
    expect(parseUnit("s² m⁻¹")?.dims).toEqual([-1, 0, 2, 0, 0]);
    expect(parseUnit("m s⁻²")?.dims).toEqual([1, 0, -2, 0, 0]);
    expect(parseUnit("J kg⁻¹ K⁻¹")?.dims).toEqual([2, 0, -2, 0, -1]);
    expect(parseUnit("cm")?.value).toBe(0.01);
    expect(parseUnit("ms")?.value).toBe(0.001);
    expect(parseUnit("m s")?.dims).toEqual([1, 0, 1, 0, 0]);
    expect(parseUnit("bananas")).toBeUndefined();
  });

  test("are written back in the book's order: positive powers first", () => {
    expect(formatDims([1, 0, -2, 0, 0])).toBe("m s⁻²");
    expect(formatDims([-1, 0, 2, 0, 0])).toBe("s² m⁻¹");
    expect(formatDims([2, 1, -2, 0, 0])).toBe("m² kg s⁻²");
  });

  test("survive any unit written and formatted back (round trip)", () => {
    fc.assert(
      fc.property(
        fc.tuple(...Array.from({ length: 5 }, () => fc.integer({ min: -3, max: 3 }))),
        (dims) => {
          const text = formatDims(dims as unknown as Quantity["dims"]);
          const back = parseUnit(text);
          return back !== undefined && back.dims.every((p, i) => p === dims[i]);
        },
      ),
    );
  });
});

describe("the calculator", () => {
  test("works the mockup's slope and g, with units", () => {
    const slope = ok("(3.944 − 2.494) s² / ((0.98 − 0.62) m)");
    expect(slope.quantity.value).toBeCloseTo(4.0278, 3);
    expect(formatQuantity(slope.quantity)).toBe("4.03 s² m⁻¹");
    const g = ok("4π² / (4.03 s² m⁻¹)");
    expect(formatQuantity(g.quantity)).toBe("9.80 m s⁻²");
    // 4 and π are exact; 4.03 s² m⁻¹ was measured to 3 figures, so g carries 3.
    expect(g.sigFigs).toBe(3);
  });

  test("converts to SI as it goes", () => {
    expect(ok("80.0 cm").quantity.value).toBeCloseTo(0.8, 12);
    expect(formatQuantity(ok("2 min").quantity)).toBe("120 s");
  });

  test("refuses what has no meaning, and says why", () => {
    expect(calculate("2 m + 3 s")).toMatchObject({ ok: false, problem: "unlike-units" });
    expect(calculate("2^(3 m)")).toMatchObject({ ok: false, problem: "power-has-unit" });
    expect(calculate("ln(2 m)")).toMatchObject({ ok: false, problem: "needs-no-unit" });
    expect(calculate("4 parsecs")).toMatchObject({ ok: false, problem: "unknown-unit" });
    expect(calculate("1 / 0")).toMatchObject({ ok: false, problem: "undefined" });
    expect(calculate("")).toMatchObject({ ok: false, problem: "empty" });
  });

  test("never throws, whatever is typed", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (text) => typeof calculate(text).ok === "boolean"),
    );
  });
});

describe("checking an answer: value, unit and significant figures each on their own", () => {
  const slope: Quantity = { value: 4.0278, dims: [-1, 0, 2, 0, 0] };

  test("a right answer to 3 figures with its unit", () => {
    expect(checkAnswer({ value: "4.03", unit: "s² m⁻¹" }, slope)).toEqual({
      value: "ok",
      unit: "ok",
      sigFigs: "ok",
      written: 3,
    });
    expect(checkAnswer({ value: "4.03", unit: "s^2/m" }, slope).unit).toBe("ok");
  });

  test("the catalogue's mistake: 2 significant figures and no unit", () => {
    expect(checkAnswer({ value: "4.0", unit: "" }, slope)).toMatchObject({
      value: "ok",
      unit: "missing",
      sigFigs: "too-few",
    });
  });

  test("a wrong value, a wrong unit, and a value in another unit of the right kind", () => {
    expect(checkAnswer({ value: "2.48", unit: "s² m⁻¹" }, slope).value).toBe("wrong");
    expect(checkAnswer({ value: "4.03", unit: "m s⁻²" }, slope).unit).toBe("wrong");
    expect(checkAnswer({ value: "0.0403", unit: "s² cm⁻¹" }, slope)).toMatchObject({
      value: "ok",
      unit: "ok",
    });
    // en-GB: a comma separates thousands, so "4,03" reads as 403, not 4.03.
    expect(checkAnswer({ value: "4,03", unit: "s²/m" }, slope).value).toBe("wrong");
    expect(checkAnswer({ value: "four", unit: "s²/m" }, slope).value).toBe("unreadable");
  });
});
