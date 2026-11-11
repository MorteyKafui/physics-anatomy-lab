import type { Finding, Rule } from "@pa/analysis";
import {
  AMMETER,
  quantise,
  substream,
  takeReading,
  VOLTMETER,
  withTolerance,
  type InstrumentSpec,
  type Reading,
  type Rng,
} from "@pa/instruments";
import { polarise, solveNetwork, type Element, type Polarisation } from "@pa/physics";

import { CORRECT_LEADS, netsOf, type Lead, type Terminal } from "./ohms-law-wiring";

/**
 * Ohm's law and the potentiometer: WASSCE's potentiometer, ammeter and voltmeter practical, as
 * approved in docs/content/ohms-law-brief.md. Every number the student sees comes from
 * packages/physics (AGENTS.md rule 1).
 */
export const ohmsLaw = {
  id: "ohms-law",
  version: 1,
  topic: "electricity",
  /** The jockey positions the question sets, PJ in m. */
  jockeyPositions: [0.4, 0.5, 0.6, 0.7, 0.8],
  /** Two 1.5 V dry cells in series. */
  cell: { emf: 3.0, internalResistance: 1.5 },
  /** The fixed resistor R, Ω. */
  resistor: 1.0,
  /** The potentiometer wire: 1.000 m of constantan, 4.0 Ω. */
  wire: { resistance: 4.0, length: 1.0 },
  ammeter: AMMETER,
  voltmeter: VOLTMETER,
  /** A dry cell's polarisation (assumed until the UEW reference data comes). */
  polarisation: { perAmp: 0.1, timeConstant: 60 } satisfies Polarisation,
  /**
   * Manufacturing tolerances, as fractions. Kept tight enough that the current at PJ = 0.8 m stays
   * below the ammeter's 1 A full scale in every attempt.
   */
  tolerance: { emf: 0.02, internalResistance: 0.08, resistor: 0.05, wire: 0.02 },
  /** Longer than this with the key closed and the coach says the cell is running down, s. */
  keyClosedLimit: 30,
  /** A scraped stretch of wire is thinned: its resistance per metre rises by this fraction. */
  scrapeIncrease: 0.1,
} as const;

/** The apparatus of one attempt, built from its seed. */
export interface OhmsLawWorld {
  emf: number;
  internalResistance: number;
  resistor: number;
  wireResistance: number;
  wireLength: number;
  ammeter: InstrumentSpec & { resistance: number };
  voltmeter: InstrumentSpec & { resistance: number };
}

/** The same seed always builds the same apparatus; each part has its own stream. */
export function ohmsLawWorld(seed: number): OhmsLawWorld {
  const t = ohmsLaw.tolerance;
  const part = (name: string) => substream(seed, `ohms-law.${name}`);
  const zero = (rng: Rng, spec: InstrumentSpec) =>
    // About one meter in three has a zero error of one division, either way.
    rng() < 1 / 3 ? (rng() < 0.5 ? -1 : 1) * spec.resolution : 0;
  const a = part("ammeter");
  const v = part("voltmeter");
  const az = zero(a, AMMETER);
  const vz = zero(v, VOLTMETER);
  return {
    emf: withTolerance(part("cell.emf"), ohmsLaw.cell.emf, t.emf),
    internalResistance: withTolerance(
      part("cell.r"),
      ohmsLaw.cell.internalResistance,
      t.internalResistance,
    ),
    resistor: withTolerance(part("resistor"), ohmsLaw.resistor, t.resistor),
    wireResistance: withTolerance(part("wire"), ohmsLaw.wire.resistance, t.wire),
    wireLength: ohmsLaw.wire.length,
    ammeter: { ...AMMETER, ...(az ? { zeroError: az } : {}) },
    voltmeter: { ...VOLTMETER, ...(vz ? { zeroError: vz } : {}) },
  };
}

/** What is on the bench at one moment. */
export interface BenchState {
  /** The leads the student has connected, terminal to terminal. */
  leads: readonly Lead[];
  keyClosed: boolean;
  /** PJ, m, where the jockey touches the wire; undefined when it is lifted. */
  jockey: number | undefined;
  /** The cell's polarisation voltage now, V (see `polarise` in packages/physics). */
  polarisation: number;
  /** Stretches of wire scraped by sliding the jockey, [from, to] in m from P. */
  scrapes: readonly (readonly [number, number])[];
}

/** The wire's resistance from P to a point x along it, Ω, scrapes included. */
export function wireResistanceTo(
  world: OhmsLawWorld,
  scrapes: BenchState["scrapes"],
  x: number,
): number {
  const perMetre = world.wireResistance / world.wireLength;
  let extra = 0;
  for (const [a, b] of scrapes) {
    const lo = Math.max(0, Math.min(a, b));
    const hi = Math.min(x, Math.max(a, b));
    if (hi > lo) extra += hi - lo;
  }
  return perMetre * (x + ohmsLaw.scrapeIncrease * extra);
}

/** The bench as a network: the student's leads join terminals into nets, and the parts sit between them. */
export function benchNetwork(world: OhmsLawWorld, state: BenchState): Element[] {
  const net = netsOf(state.leads);
  const at = (t: Terminal) => net(t);
  const x = state.jockey ?? 0;
  const toJ = wireResistanceTo(world, state.scrapes, x);
  const whole = wireResistanceTo(world, state.scrapes, world.wireLength);
  return [
    {
      kind: "cell",
      id: "cell",
      minus: at("cell-"),
      plus: at("cell+"),
      emf: world.emf - state.polarisation,
      internalResistance: world.internalResistance,
    },
    {
      kind: "resistor",
      id: "key",
      a: at("key.1"),
      b: at("key.2"),
      ohms: state.keyClosed ? 0 : Infinity,
    },
    { kind: "resistor", id: "R", a: at("R.1"), b: at("R.2"), ohms: world.resistor },
    { kind: "resistor", id: "ammeter", a: at("A+"), b: at("A-"), ohms: world.ammeter.resistance },
    {
      kind: "resistor",
      id: "voltmeter",
      a: at("V+"),
      b: at("V-"),
      ohms: world.voltmeter.resistance,
    },
    { kind: "resistor", id: "wire-PJ", a: at("wire.P"), b: "J", ohms: toJ },
    { kind: "resistor", id: "wire-JQ", a: "J", b: at("wire.Q"), ohms: whole - toJ },
    {
      kind: "resistor",
      id: "jockey",
      a: at("jockey"),
      b: "J",
      ohms: state.jockey === undefined ? Infinity : 0,
    },
  ];
}

export type Unsafe = "short-circuit" | "ammeter-over-range" | "voltmeter-over-range";

/** What the meters truly carry: I into the ammeter's + terminal, V from the voltmeter's + to −. */
export type TrueReadings =
  { ok: true; current: number; voltage: number } | { ok: false; reason: Unsafe };

export function trueReadings(world: OhmsLawWorld, state: BenchState): TrueReadings {
  const solved = solveNetwork(benchNetwork(world, state));
  if (!solved.ok) return { ok: false, reason: "short-circuit" };
  const s = solved.solution;
  const current = s.current("ammeter");
  const voltage = s.current("voltmeter") * world.voltmeter.resistance;
  return { ok: true, current, voltage };
}

/**
 * Whether closing the key (or pressing the jockey) is allowed: the lab blocks a short circuit and
 * anything that would drive a meter past its full scale (master plan: unsafe actions are
 * blocked). A meter pushed backwards is let through: its needle kicks against the stop, and the
 * coach explains.
 */
export function unsafeToClose(world: OhmsLawWorld, state: BenchState): Unsafe | undefined {
  const r = trueReadings(world, { ...state, keyClosed: true });
  if (!r.ok) return r.reason;
  if (r.current > world.ammeter.scale![1]) return "ammeter-over-range";
  if (r.voltage > world.voltmeter.scale![1]) return "voltmeter-over-range";
  return undefined;
}

/** What the student sees on each meter: the needle's position, with its zero error, jitter and stops. */
export function meterReadings(
  world: OhmsLawWorld,
  state: BenchState,
  opts: { rng: Rng; viewAngleDeg?: number },
): { ammeter: Reading; voltmeter: Reading } | undefined {
  const r = trueReadings(world, state);
  if (!r.ok) return undefined;
  const view = opts.viewAngleDeg === undefined ? {} : { viewAngleDeg: opts.viewAngleDeg };
  return {
    ammeter: takeReading(world.ammeter, r.current, { rng: opts.rng, ...view }),
    voltmeter: takeReading(world.voltmeter, r.voltage, { rng: opts.rng, ...view }),
  };
}

/** A meter's reading as a careful student records it: to the nearest division. */
export function recorded(reading: Reading, spec: InstrumentSpec): number {
  return quantise(reading.shown, spec.resolution);
}

/** The correct bench, for the coach's demonstration and for tests. */
export function correctBench(jockey: number | undefined, keyClosed = true): BenchState {
  return { leads: CORRECT_LEADS, keyClosed, jockey, polarisation: 0, scrapes: [] };
}

/** One stretch of time the key was closed, s from the start of the attempt. */
export interface KeyInterval {
  from: number;
  to: number;
  /** The current flowing meanwhile, A (true value). */
  current: number;
}

export interface ProcedureContext {
  world: OhmsLawWorld;
  keyIntervals: readonly KeyInterval[];
  scrapes: BenchState["scrapes"];
}

/** From the mistake catalogue: the key left closed between readings, so the cell runs down. */
export const keyLeftClosed: Rule<ProcedureContext> = {
  id: "ohms-law-key-left-closed",
  skill: "measurement",
  check: ({ keyIntervals }): Finding[] => {
    const longest = keyIntervals.reduce<KeyInterval | undefined>(
      (a, k) => (!a || k.to - k.from > a.to - a.from ? k : a),
      undefined,
    );
    if (!longest || longest.to - longest.from <= ohmsLaw.keyClosedLimit) return [];
    const seconds = Math.round(longest.to - longest.from);
    const drop = polarise(0, longest.current, longest.to - longest.from, ohmsLaw.polarisation);
    return [
      {
        rule: "ohms-law-key-left-closed",
        severity: "warning",
        skill: "measurement",
        key: "findings.ohmsLaw.keyLeftClosed",
        params: { seconds, millivolts: Math.round(drop * 1000) },
      },
    ];
  },
};

/** From the mistake catalogue: the jockey slid along the wire while pressed, scraping it. */
export const jockeySlid: Rule<ProcedureContext> = {
  id: "ohms-law-jockey-slid",
  skill: "apparatus",
  check: ({ scrapes }): Finding[] => {
    if (!scrapes.length) return [];
    const centimetres = Math.round(scrapes.reduce((n, [a, b]) => n + Math.abs(b - a), 0) * 100);
    return [
      {
        rule: "ohms-law-jockey-slid",
        severity: "warning",
        skill: "apparatus",
        key: "findings.ohmsLaw.jockeySlid",
        params: { centimetres, percent: Math.round(ohmsLaw.scrapeIncrease * 100) },
      },
    ];
  },
};

export const PROCEDURE_RULES: Rule<ProcedureContext>[] = [keyLeftClosed, jockeySlid];
