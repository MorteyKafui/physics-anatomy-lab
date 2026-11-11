import { describe, expect, test } from "bun:test";

import circuits from "../../../validation/fixtures/circuits.json";
import {
  heatWire,
  ohmsLawReadings,
  polarise,
  solveNetwork,
  terminalPdReadings,
  wireResistanceAt,
  type Element,
  type TerminalPdSetup,
} from "../src";

const close = (a: number, b: number, rel = 1e-10, abs = 1e-12) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(abs, rel * Math.abs(b)));

type FixtureElement = (typeof circuits.networks)[number]["elements"][number];
const toElement = (e: FixtureElement): Element =>
  e.kind === "cell"
    ? {
        kind: "cell",
        id: e.id,
        minus: e.minus!,
        plus: e.plus!,
        emf: e.emf!,
        internalResistance: e.internalResistance!,
      }
    : { kind: "resistor", id: e.id, a: e.a!, b: e.b!, ohms: e.ohms ?? Infinity };

describe("the network solver", () => {
  test("agrees with NumPy modified nodal analysis on 60 random networks, every node and element", () => {
    expect(circuits.networks.length).toBe(60);
    for (const net of circuits.networks) {
      const solved = solveNetwork(net.elements.map(toElement));
      if (!solved.ok) throw new Error("a fixture network was reported as a short circuit");
      for (const [node, v] of Object.entries(net.potentials))
        close(solved.solution.pd(node, "n0"), v, 1e-9, 1e-9);
      for (const [id, i] of Object.entries(net.currents))
        close(solved.solution.current(id), i, 1e-9, 1e-9);
    }
  });

  test("Kirchhoff's current law holds at every node of every random network", () => {
    for (const net of circuits.networks) {
      const elements = net.elements.map(toElement);
      const solved = solveNetwork(elements);
      if (!solved.ok) throw new Error("short");
      const net0 = new Map<string, number>();
      const add = (n: string, i: number) => net0.set(n, (net0.get(n) ?? 0) + i);
      for (const e of elements) {
        const i = solved.solution.current(e.id);
        if (e.kind === "resistor") {
          add(e.a, -i);
          add(e.b, i);
        } else {
          // A cell's current leaves its + terminal into the circuit.
          add(e.plus, i);
          add(e.minus, -i);
        }
      }
      for (const total of net0.values()) expect(Math.abs(total)).toBeLessThan(1e-9);
    }
  });

  test("gives the textbook series circuit: I = E / (R + r), V = E − I r", () => {
    const solved = solveNetwork([
      { kind: "cell", id: "c", minus: "a", plus: "b", emf: 1.5, internalResistance: 0.5 },
      { kind: "resistor", id: "R", a: "b", b: "a", ohms: 2.5 },
    ]);
    if (!solved.ok) throw new Error("short");
    close(solved.solution.current("c"), 0.5);
    close(solved.solution.current("R"), 0.5);
    close(solved.solution.pd("b", "a"), 1.25);
  });

  test("reproduces the closed-form Ohm's law circuit in circuits.ts", () => {
    for (const c of circuits.ohmsLaw) {
      const rv = c.voltmeterResistance ?? Infinity;
      const solved = solveNetwork([
        {
          kind: "cell",
          id: "cell",
          minus: "0",
          plus: "1",
          emf: c.emf,
          internalResistance: c.internalResistance,
        },
        { kind: "resistor", id: "rheostat", a: "1", b: "2", ohms: c.rheostat },
        { kind: "resistor", id: "R", a: "2", b: "0", ohms: c.resistor },
        { kind: "resistor", id: "V", a: "2", b: "0", ohms: rv },
      ]);
      if (!solved.ok) throw new Error("short");
      const closed = ohmsLawReadings({ ...c, voltmeterResistance: rv });
      close(solved.solution.current("cell"), closed.current, 1e-12);
      close(solved.solution.pd("2", "0"), closed.voltage, 1e-12);
    }
  });

  test("reports a cell shorted by leads alone, and solves it once there is any resistance", () => {
    const short: Element[] = [
      { kind: "cell", id: "c", minus: "a", plus: "b", emf: 2, internalResistance: 0.1 },
      { kind: "resistor", id: "lead1", a: "b", b: "m", ohms: 0 },
      { kind: "resistor", id: "lead2", a: "m", b: "a", ohms: 0 },
    ];
    expect(solveNetwork(short)).toEqual({ ok: false, reason: "short-circuit", cells: ["c"] });
    const withLoad = solveNetwork([
      ...short.slice(0, 2),
      { kind: "resistor", id: "R", a: "m", b: "a", ohms: 1.9 },
    ]);
    if (!withLoad.ok) throw new Error("short");
    close(withLoad.solution.current("lead1"), 1);
  });

  test("a part of the circuit that is not connected carries no current", () => {
    const solved = solveNetwork([
      { kind: "cell", id: "c", minus: "a", plus: "b", emf: 2, internalResistance: 1 },
      { kind: "resistor", id: "R", a: "b", b: "a", ohms: 1 },
      { kind: "resistor", id: "loose", a: "x", b: "y", ohms: 10 },
      { kind: "resistor", id: "open", a: "b", b: "x", ohms: Infinity },
    ]);
    if (!solved.ok) throw new Error("short");
    expect(solved.solution.current("loose")).toBe(0);
    expect(solved.solution.current("open")).toBe(0);
    expect(solved.solution.pd("x", "a")).toBe(0);
  });

  test("refuses parts no real circuit has", () => {
    expect(() => solveNetwork([{ kind: "resistor", id: "R", a: "a", b: "b", ohms: -1 }])).toThrow(
      RangeError,
    );
    expect(() =>
      solveNetwork([
        { kind: "cell", id: "c", minus: "a", plus: "b", emf: 1.5, internalResistance: 0 },
      ]),
    ).toThrow(RangeError);
    expect(() =>
      solveNetwork([
        { kind: "resistor", id: "R", a: "a", b: "b", ohms: 1 },
        { kind: "resistor", id: "R", a: "b", b: "c", ohms: 1 },
      ]),
    ).toThrow(RangeError);
  });
});

describe("the potentiometer, ammeter and voltmeter practical", () => {
  // JSON has no infinity: a null voltmeter resistance is an ideal voltmeter.
  const fixture = (c: (typeof circuits.terminalPd)[number]): TerminalPdSetup => ({
    ...c,
    voltmeterResistance: c.voltmeterResistance ?? Infinity,
    jockey: c.jockey ?? undefined,
  });

  test("agrees with NumPy at all 576 fixture set-ups: jockey positions, no contact, the key open, real and ideal meters", () => {
    expect(circuits.terminalPd.length).toBe(576);
    for (const c of circuits.terminalPd) {
      const r = terminalPdReadings(fixture(c));
      close(r.current, c.current, 1e-9, 1e-12);
      close(r.voltage, c.voltage, 1e-9, 1e-12);
    }
  });

  test("with ideal meters, every reading lies on V = E − I r", () => {
    for (const c of circuits.terminalPd.filter(
      (c) => c.ammeterResistance === 0 && c.voltmeterResistance === null && c.keyClosed,
    )) {
      const r = terminalPdReadings(fixture(c));
      close(r.voltage, c.emf - r.current * c.internalResistance, 1e-9, 1e-12);
    }
  });

  test("moving the jockey along the wire raises I and lowers V", () => {
    const base = circuits.terminalPd.find((c) => c.ammeterResistance === 0.05 && c.keyClosed)!;
    let last = terminalPdReadings({ ...fixture(base), jockey: undefined });
    for (const j of [0.2, 0.4, 0.6, 0.8]) {
      const r = terminalPdReadings({ ...fixture(base), jockey: j });
      expect(r.current).toBeGreaterThan(last.current);
      expect(r.voltage).toBeLessThan(last.voltage);
      last = r;
    }
  });

  test("with the key open, no current flows in the ammeter and the voltmeter reads almost the emf", () => {
    const r = terminalPdReadings({
      emf: 3,
      internalResistance: 1.5,
      resistor: 1,
      wireResistance: 4,
      wireLength: 1,
      ammeterResistance: 0.05,
      voltmeterResistance: 5000,
      jockey: 0.5,
      keyClosed: false,
    });
    expect(r.current).toBe(0);
    close(r.voltage, (3 * 5000) / 5001.5);
  });

  test("refuses a jockey off the wire", () => {
    const s: TerminalPdSetup = {
      emf: 3,
      internalResistance: 1.5,
      resistor: 1,
      wireResistance: 4,
      wireLength: 1,
      ammeterResistance: 0.05,
      voltmeterResistance: 5000,
      jockey: 1.2,
      keyClosed: true,
    };
    expect(() => terminalPdReadings(s)).toThrow(RangeError);
  });
});

describe("a cell running down, and a wire warming", () => {
  const cell = { perAmp: 0.1, timeConstant: 60 };

  test("polarisation builds towards k I while current flows, and dies away with the key open", () => {
    const after = polarise(0, 1, 60, cell);
    close(after, 0.1 * (1 - Math.exp(-1)));
    close(polarise(0, 1, 1e6, cell), 0.1);
    close(polarise(after, 0, 60, cell), after * Math.exp(-1));
    // Two half-steps equal one whole step for a steady current.
    close(polarise(polarise(0, 1, 30, cell), 1, 30, cell), after);
  });

  test("a wire settles where its heating I²R equals its loss h θ", () => {
    const nichrome = { coldResistance: 4, alpha: 4e-4, heatCapacity: 0.5, loss: 0.02 };
    let rise = 0;
    for (let s = 0; s < 600; s++) rise = heatWire(rise, 1, 1, nichrome);
    close((1 * wireResistanceAt(nichrome, rise)) / nichrome.loss, rise, 1e-6);
    expect(wireResistanceAt(nichrome, rise)).toBeGreaterThan(4.3);
  });

  test("constantan barely changes its resistance for the same heating: why the wire is made of it", () => {
    const constantan = { coldResistance: 4, alpha: 1e-5, heatCapacity: 0.5, loss: 0.02 };
    let rise = 0;
    for (let s = 0; s < 600; s++) rise = heatWire(rise, 1, 1, constantan);
    expect(wireResistanceAt(constantan, rise) / 4 - 1).toBeLessThan(0.003);
  });
});
