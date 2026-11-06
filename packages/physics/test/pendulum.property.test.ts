import { expect, test } from "bun:test";
import fc from "fast-check";
import { periodExact } from "../src";

const length = fc.double({ min: 0.05, max: 5, noNaN: true });
const g = fc.double({ min: 1, max: 25, noNaN: true });
const amplitude = fc.double({ min: 0, max: 3, noNaN: true });

test("a larger swing never has a shorter period", () => {
  fc.assert(
    fc.property(length, g, amplitude, amplitude, (l, gg, a, b) => {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      return (
        periodExact({ length: l, g: gg, amplitude: hi }) >=
        periodExact({ length: l, g: gg, amplitude: lo }) * (1 - 1e-12)
      );
    }),
  );
});

test("the period scales with the square root of the length", () => {
  fc.assert(
    fc.property(length, g, amplitude, (l, gg, a) => {
      const ratio =
        periodExact({ length: 4 * l, g: gg, amplitude: a }) /
        periodExact({ length: l, g: gg, amplitude: a });
      return Math.abs(ratio - 2) < 1e-9;
    }),
  );
});

test("the period does not depend on the direction of the swing", () => {
  fc.assert(
    fc.property(length, g, amplitude, (l, gg, a) => {
      expect(periodExact({ length: l, g: gg, amplitude: -a })).toBe(
        periodExact({ length: l, g: gg, amplitude: a }),
      );
    }),
  );
});
