import { describe, expect, test } from "bun:test";

import { createRng, quantise } from "@pa/instruments";
import { terminalPdReadings } from "@pa/physics";

import {
  classifyWiring,
  CORRECT_LEADS,
  correctBench,
  meterReadings,
  ohmsLaw,
  ohmsLawWorld,
  PROCEDURE_RULES,
  recorded,
  trueReadings,
  unsafeToClose,
  wiredRight,
  WIRING_RULES,
  wireResistanceTo,
  wrongTerminals,
  type BenchState,
  type Lead,
  type Terminal,
} from "../src";

const SEED = 123_456_789;
const world = ohmsLawWorld(SEED);

const swap =
  (map: Partial<Record<Terminal, Terminal>>) =>
  (leads: readonly Lead[]): Lead[] =>
    leads.map(([a, b]) => [map[a] ?? a, map[b] ?? b] as const);
const bench = (leads: readonly Lead[], jockey: number | undefined = 0.6): BenchState => ({
  ...correctBench(jockey),
  leads,
});
const ok = (r: ReturnType<typeof trueReadings>) => {
  if (!r.ok) throw new Error(`blocked: ${r.reason}`);
  return r;
};

describe("the apparatus of an attempt", () => {
  test("the same seed builds the same apparatus; another seed builds another", () => {
    expect(ohmsLawWorld(SEED)).toEqual(world);
    expect(ohmsLawWorld(SEED + 1)).not.toEqual(world);
  });

  test("every part is within its tolerance of the approved bench", () => {
    const t = ohmsLaw.tolerance;
    for (let seed = 1; seed <= 500; seed++) {
      const w = ohmsLawWorld(seed);
      expect(Math.abs(w.emf / ohmsLaw.cell.emf - 1)).toBeLessThanOrEqual(t.emf + 1e-12);
      expect(
        Math.abs(w.internalResistance / ohmsLaw.cell.internalResistance - 1),
      ).toBeLessThanOrEqual(t.internalResistance + 1e-12);
      expect(Math.abs(w.resistor / ohmsLaw.resistor - 1)).toBeLessThanOrEqual(t.resistor + 1e-12);
      expect(Math.abs(w.wireResistance / ohmsLaw.wire.resistance - 1)).toBeLessThanOrEqual(
        t.wire + 1e-12,
      );
    }
  });

  test("in every attempt, all five jockey positions keep the ammeter below full scale", () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const w = ohmsLawWorld(seed);
      for (const j of ohmsLaw.jockeyPositions)
        expect(unsafeToClose(w, correctBench(j))).toBeUndefined();
    }
  });
});

describe("the right circuit", () => {
  test("reads exactly what the approved model gives for this attempt's parts", () => {
    for (const j of [undefined, ...ohmsLaw.jockeyPositions]) {
      const r = ok(trueReadings(world, correctBench(j)));
      const model = terminalPdReadings({
        emf: world.emf,
        internalResistance: world.internalResistance,
        resistor: world.resistor,
        wireResistance: world.wireResistance,
        wireLength: world.wireLength,
        ammeterResistance: world.ammeter.resistance,
        voltmeterResistance: world.voltmeter.resistance,
        jockey: j,
        keyClosed: true,
      });
      expect(r.current).toBeCloseTo(model.current, 12);
      expect(r.voltage).toBeCloseTo(model.voltage, 12);
    }
  });

  test("meters record to their least count, with this attempt's zero error", () => {
    const rng = createRng(1);
    for (const j of ohmsLaw.jockeyPositions) {
      const m = meterReadings(world, correctBench(j), { rng })!;
      const a = recorded(m.ammeter, world.ammeter);
      const v = recorded(m.voltmeter, world.voltmeter);
      expect(quantise(a, 0.02)).toBe(a);
      expect(quantise(v, 0.05)).toBe(v);
      // Within a division of the truth plus the zero error, square-on.
      expect(Math.abs(v - (m.voltmeter.truth + (world.voltmeter.zeroError ?? 0)))).toBeLessThan(
        0.06,
      );
    }
  });

  test("closing the key with the jockey at Q is blocked: the ammeter would pass 1 A", () => {
    expect(unsafeToClose(world, correctBench(1.0))).toBe("ammeter-over-range");
  });

  test("with the key open nothing flows, and the voltmeter reads almost the emf", () => {
    const r = ok(trueReadings(world, correctBench(0.6, false)));
    expect(r.current).toBe(0);
    expect(r.voltage).toBeGreaterThan(world.emf * 0.999);
  });
});

describe("the mistake catalogue: wiring", () => {
  test("the right wiring passes, however the leads are routed", () => {
    // Daisy-chained: the voltmeter's − to the key instead of straight to the cell's −.
    const rerouted = CORRECT_LEADS.map(([a, b]): Lead =>
      a === "V-" && b === "cell-" ? ["V-", "key.2"] : [a, b],
    );
    expect(wiredRight(rerouted)).toBe(true);
    expect(WIRING_RULES[0]!.check({ leads: rerouted })).toEqual([]);
  });

  test("an ammeter the wrong way round is named, and its needle kicks back against the stop", () => {
    const leads = swap({ "A+": "A-", "A-": "A+" })(CORRECT_LEADS);
    expect(classifyWiring(leads)).toBe("ammeter-reversed");
    expect(meterReadings(world, bench(leads), { rng: createRng(1) })!.ammeter.pinned).toBe("low");
  });

  test("a voltmeter the wrong way round is named, and pins at zero", () => {
    const leads = swap({ "V+": "V-", "V-": "V+" })(CORRECT_LEADS);
    expect(classifyWiring(leads)).toBe("voltmeter-reversed");
    expect(meterReadings(world, bench(leads), { rng: createRng(1) })!.voltmeter.pinned).toBe("low");
  });

  test("meters in each other's places: the ammeter across the cell is blocked; the voltmeter in series stops the current", () => {
    const leads = swap({ "A+": "V+", "A-": "V-", "V+": "A+", "V-": "A-" })(CORRECT_LEADS);
    expect(classifyWiring(leads)).toBe("meters-swapped");
    expect(unsafeToClose(world, bench(leads))).toBe("ammeter-over-range");
  });

  test("the voltmeter across R instead of the cell: V rises with I, so the slope comes out positive, 1/R", () => {
    const leads = CORRECT_LEADS.map(([a, b]): Lead =>
      a === "V+" ? ["V+", "R.1"] : a === "V-" ? ["V-", "R.2"] : [a, b],
    );
    expect(classifyWiring(leads)).toBe("voltmeter-across-resistor");
    const lo = ok(trueReadings(world, bench(leads, 0.4)));
    const hi = ok(trueReadings(world, bench(leads, 0.8)));
    expect(hi.voltage).toBeGreaterThan(lo.voltage);
    // A real voltmeter in parallel with R draws a little, so I/V is a touch above 1/R.
    expect((hi.current - lo.current) / (hi.voltage - lo.voltage)).toBeCloseTo(
      1 / world.resistor + 1 / 5000,
      9,
    );
  });

  test("the jockey's lead taken to Q: it cuts out JQ, so the current falls as PJ grows", () => {
    const leads = CORRECT_LEADS.map(([a, b]): Lead =>
      a === "jockey" ? ["jockey", "wire.Q"] : [a, b],
    );
    expect(classifyWiring(leads)).toBe("jockey-to-q");
    const lo = ok(trueReadings(world, bench(leads, 0.4)));
    const hi = ok(trueReadings(world, bench(leads, 0.8)));
    expect(hi.current).toBeLessThan(lo.current);
  });

  test("a lead from the cell's + straight to its − is a short circuit, and the key will not close", () => {
    expect(unsafeToClose(world, bench([...CORRECT_LEADS, ["cell+", "key.2"]]))).toBe(
      "short-circuit",
    );
  });

  test("a circuit wrong in some other way is reported with the terminals that differ", () => {
    const leads = CORRECT_LEADS.filter(([a]) => a !== "R.2");
    expect(classifyWiring(leads)).toBeUndefined();
    const [finding] = WIRING_RULES[0]!.check({ leads });
    expect(finding!.key).toBe("findings.ohmsLaw.wiringWrong");
    expect(wrongTerminals(leads)).toContain("R.2");
  });
});

describe("the mistake catalogue: procedure", () => {
  const context = (seconds: number) => ({
    world,
    keyIntervals: [{ from: 10, to: 10 + seconds, current: 0.72 }],
    scrapes: [] as const,
  });

  test("the key closed for 25 s is fine; for 90 s the coach says the cell ran down, and by how much", () => {
    expect(PROCEDURE_RULES[0]!.check(context(25))).toEqual([]);
    const [f] = PROCEDURE_RULES[0]!.check(context(90));
    // polarise: 0.1 V/A × 0.72 A × (1 − e^(−90/60)) = 56 mV.
    expect(f!.params).toEqual({ seconds: 90, millivolts: 56 });
  });

  test("sliding the jockey scrapes the wire: its resistance there rises, and the coach says so", () => {
    const scrapes = [[0.3, 0.5]] as const;
    const perMetre = world.wireResistance / world.wireLength;
    expect(wireResistanceTo(world, scrapes, 0.6)).toBeCloseTo(perMetre * (0.6 + 0.1 * 0.2), 12);
    expect(wireResistanceTo(world, scrapes, 0.2)).toBeCloseTo(perMetre * 0.2, 12);
    const [f] = PROCEDURE_RULES[1]!.check({ world, keyIntervals: [], scrapes });
    expect(f!.params).toEqual({ centimetres: 20, percent: 10 });
  });
});
