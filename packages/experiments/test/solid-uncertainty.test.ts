import { expect, test } from "bun:test";

import { cFromReadings, cWithUncertainty } from "../src";

test("c with its uncertainty is the lab's own c, about 1.5 % for a careful copper run", () => {
  const run = { solid: 100, empty: 50, filled: 100, start: 28 };
  const r = cWithUncertainty(run, 38.3);
  expect(r.value).toBeCloseTo(cFromReadings({ ...run, highest: 38.3 }), 9);
  expect(r.uncertainty / r.value).toBeGreaterThan(0.01);
  expect(r.uncertainty / r.value).toBeLessThan(0.02);
});

test("a smaller rise makes c less certain", () => {
  const run = { solid: 100, empty: 50, filled: 100, start: 28 };
  const big = cWithUncertainty(run, 38.3);
  const small = cWithUncertainty(run, 32.0);
  expect(small.uncertainty / small.value).toBeGreaterThan(big.uncertainty / big.value);
});
