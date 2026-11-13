import { describe, expect, test } from "bun:test";
import { AMMETER, substream, VOLTMETER } from "@pa/instruments";

import {
  correctBench,
  meterReadings,
  OHMS_LAW_DATA_TEMPLATE,
  ohmsLaw,
  ohmsLawCarefulSpread,
  ohmsLawCheck,
  ohmsLawExample,
  recorded,
  type OhmsLawWorld,
} from "../src";

const O = ohmsLaw;
const nominal: OhmsLawWorld = {
  emf: O.cell.emf,
  internalResistance: O.cell.internalResistance,
  resistor: O.resistor,
  wireResistance: O.wire.resistance,
  wireLength: O.wire.length,
  ammeter: AMMETER,
  voltmeter: VOLTMETER,
};

/** A careful student's readings on a bench, twice at each position, no contact first. */
function lab(seed: number, world: OhmsLawWorld = nominal) {
  const rng = substream(seed, "test");
  return [undefined, ...O.jockeyPositions].map((pj) => {
    const read = () => meterReadings(world, correctBench(pj), { rng })!;
    const [a, b] = [read(), read()];
    return {
      PJ: pj === undefined ? undefined : pj * 100,
      I1: recorded(a.ammeter, AMMETER),
      I2: recorded(b.ammeter, AMMETER),
      V1: recorded(a.voltmeter, VOLTMETER),
      V2: recorded(b.voltmeter, VOLTMETER),
    };
  });
}

describe("Ohm's law's data template", () => {
  test("has PJ, optional for the reading off the wire, and each meter twice", () => {
    expect(
      OHMS_LAW_DATA_TEMPLATE.columns.map(
        (c) => `${c.symbol} / ${c.unit} ${c.role}${c.optional ? " optional" : ""}`,
      ),
    ).toEqual([
      "PJ / cm setting optional",
      "I₁ / A reading",
      "I₂ / A reading",
      "V₁ / V reading",
      "V₂ / V reading",
    ]);
    expect(OHMS_LAW_DATA_TEMPLATE.settings).toEqual([[undefined], [40], [50], [60], [70], [80]]);
    expect(OHMS_LAW_DATA_TEMPLATE.values.map((v) => v.optional)).toEqual([true]);
  });
});

describe("Ohm's law's model check", () => {
  test("finds the bench's E and r from the example, and nothing wrong", () => {
    const r = ohmsLawCheck(ohmsLawExample());
    expect(r.result!.E.value).toBeCloseTo(O.cell.emf, 1);
    expect(r.result!.r).toBeGreaterThan(O.cell.internalResistance * 0.9);
    expect(r.result!.r).toBeLessThan(O.cell.internalResistance * 1.1);
    expect(r.findings).toEqual([]);
  });

  test("works out the means as the lab's table does", () => {
    const r = ohmsLawCheck([{ PJ: 40, I1: 0.6, I2: 0.62, V1: 2.1, V2: 2.05 }]);
    const [pj, i1, i2, I, v1, v2, V] = r.table[0]!;
    expect([pj, i1, i2, v1, v2]).toEqual([40, 0.6, 0.62, 2.1, 2.05]);
    expect(I).toBeCloseTo(0.61, 12);
    expect(V).toBeCloseTo(2.075, 12);
    expect(r.check).toBeUndefined();
  });

  test("with the marked e.m.f. it agrees on the bench's own cells", () => {
    expect(ohmsLawCheck(lab(1), { emf: O.cell.emf }).findings).toEqual([]);
  });

  test("a voltmeter reading 0.15 V high moves E well above the marking", () => {
    const world = { ...nominal, voltmeter: { ...VOLTMETER, zeroError: 0.15 } };
    const r = ohmsLawCheck(lab(1, world), { emf: O.cell.emf });
    expect(r.findings.map((f) => f.cause)).toEqual(["experiments.ohms-law.check.shift.above"]);
  });

  test("cells run down to 2.7 V are found below their 3.0 V marking", () => {
    const r = ohmsLawCheck(lab(1, { ...nominal, emf: 2.7 }), { emf: O.cell.emf });
    expect(r.findings.map((f) => f.cause)).toContain("experiments.ohms-law.check.shift.below");
  });

  test("without a marking nothing is said about E", () => {
    const r = ohmsLawCheck(lab(1, { ...nominal, emf: 2.7 }));
    expect(r.check!.shift.found).toBe(false);
  });

  test("readings scattered by far more than a division are found as scatter", () => {
    const rows = lab(2).map((row, i) => ({ ...row, I1: row.I1 + (i % 2 ? 0.06 : -0.06) }));
    expect(ohmsLawCheck(rows).findings.map((f) => f.cause)).toContain(
      "experiments.ohms-law.check.spread",
    );
  });

  test("over many careful runs on the bench's own cells, few are found out", () => {
    let found = 0;
    for (let seed = 1; seed <= 300; seed++) {
      if (ohmsLawCheck(lab(seed), { emf: O.cell.emf }).findings.length) found++;
    }
    expect(found / 300).toBeLessThan(0.1);
  });

  test("a careful spread in I takes in the voltmeter through the slope", () => {
    expect(ohmsLawCarefulSpread(0, 1)).toBeCloseTo(AMMETER.resolution / Math.sqrt(12), 12);
    expect(ohmsLawCarefulSpread(-0.67, 2)).toBeGreaterThan(ohmsLawCarefulSpread(0, 2));
  });
});
