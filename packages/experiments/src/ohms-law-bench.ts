import type { Attempt, LabEvent, NewEvent, Projection } from "@pa/engine";
import { polarise } from "@pa/physics";

import {
  ohmsLaw,
  ohmsLawWorld,
  trueReadings,
  unsafeToClose,
  type BenchState,
  type KeyInterval,
  type OhmsLawWorld,
  type Unsafe,
} from "./ohms-law";
import { TERMINALS, type Lead, type Terminal } from "./ohms-law-wiring";

/**
 * The Ohm's law bench as the student works it, rebuilt from the attempt's events: the leads they
 * have joined, the key, the jockey, the stretches of wire they scraped, and the cell's
 * polarisation, carried through time from one event to the next. Like the pendulum's assembly,
 * an event is applied only if `decideBench` would have accepted it.
 */
export interface CircuitBench extends BenchState {
  world: OhmsLawWorld;
  /** Every stretch of time the key was closed, s from the start of the attempt. */
  keyIntervals: KeyInterval[];
  /** When the bench last changed, ms (the polarisation is carried from here). */
  lastAt: number;
  /** When the attempt began, ms. */
  startedAt: number;
}

export type BenchCommand =
  | { type: "connect"; from: Terminal; to: Terminal }
  | { type: "disconnect"; from: Terminal; to: Terminal }
  | { type: "close-key" }
  | { type: "open-key" }
  | { type: "press-jockey"; at: number }
  | { type: "slide-jockey"; to: number }
  | { type: "lift-jockey" };

/** Why the bench refused: a message key under lab.ohmsLaw.refused, or a safety block under lab.ohmsLaw.unsafe. */
export type BenchRefusal =
  | "same-terminal"
  | "lead-exists"
  | "no-such-lead"
  | "key-already-closed"
  | "key-already-open"
  | "off-the-wire"
  | "jockey-not-pressed"
  | "jockey-already-pressed"
  | Unsafe;

export type BenchDecision = { ok: true; events: NewEvent[] } | { ok: false; reason: BenchRefusal };

const isTerminal = (v: unknown): v is Terminal =>
  typeof v === "string" && (TERMINALS as readonly string[]).includes(v);
const sameLead = (l: Lead, a: Terminal, b: Terminal) =>
  (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a);

export function initialBench(attempt: Attempt): CircuitBench {
  return {
    world: ohmsLawWorld(attempt.seed),
    leads: [],
    keyClosed: false,
    jockey: undefined,
    polarisation: 0,
    scrapes: [],
    keyIntervals: [],
    lastAt: attempt.createdAt,
    startedAt: attempt.createdAt,
  };
}

/** The cell's polarisation at `at` (ms), carried on from the bench's last change. */
export function polarisationAt(b: CircuitBench, at: number): number {
  const seconds = Math.max(0, (at - b.lastAt) / 1000);
  const r = trueReadings(b.world, b);
  const current = r.ok && b.keyClosed ? r.current : 0;
  return polarise(b.polarisation, current, seconds, ohmsLaw.polarisation);
}

const onWire = (b: CircuitBench, x: number) =>
  Number.isFinite(x) && x >= 0 && x <= b.world.wireLength;

/** Turn an action on the bench into events, or refuse it. Pure. */
export function decideBench(b: CircuitBench, command: BenchCommand): BenchDecision {
  const ok = (kind: string, data: Record<string, string | number>): BenchDecision => ({
    ok: true,
    events: [{ kind, data }],
  });
  switch (command.type) {
    case "connect": {
      const { from, to } = command;
      if (from === to) return { ok: false, reason: "same-terminal" };
      if (b.leads.some((l) => sameLead(l, from, to))) return { ok: false, reason: "lead-exists" };
      // Joining a lead while the key is closed must not short the cell or over-range a meter.
      if (b.keyClosed) {
        const unsafe = unsafeToClose(b.world, { ...b, leads: [...b.leads, [from, to]] });
        if (unsafe) return { ok: false, reason: unsafe };
      }
      return ok("lead.connect", { from, to });
    }
    case "disconnect": {
      if (!b.leads.some((l) => sameLead(l, command.from, command.to)))
        return { ok: false, reason: "no-such-lead" };
      return ok("lead.disconnect", { from: command.from, to: command.to });
    }
    case "close-key": {
      if (b.keyClosed) return { ok: false, reason: "key-already-closed" };
      const unsafe = unsafeToClose(b.world, b);
      if (unsafe) return { ok: false, reason: unsafe };
      return ok("key.close", {});
    }
    case "open-key":
      return b.keyClosed ? ok("key.open", {}) : { ok: false, reason: "key-already-open" };
    case "press-jockey": {
      if (b.jockey !== undefined) return { ok: false, reason: "jockey-already-pressed" };
      if (!onWire(b, command.at)) return { ok: false, reason: "off-the-wire" };
      if (b.keyClosed) {
        const unsafe = unsafeToClose(b.world, { ...b, jockey: command.at });
        if (unsafe) return { ok: false, reason: unsafe };
      }
      return ok("jockey.press", { at: command.at });
    }
    case "slide-jockey": {
      if (b.jockey === undefined) return { ok: false, reason: "jockey-not-pressed" };
      if (!onWire(b, command.to)) return { ok: false, reason: "off-the-wire" };
      if (b.keyClosed) {
        const unsafe = unsafeToClose(b.world, { ...b, jockey: command.to });
        if (unsafe) return { ok: false, reason: unsafe };
      }
      return ok("jockey.slide", { to: command.to });
    }
    case "lift-jockey":
      return b.jockey === undefined
        ? { ok: false, reason: "jockey-not-pressed" }
        : ok("jockey.lift", {});
  }
}

function commandOf(e: LabEvent): BenchCommand | undefined {
  const d = (e.data ?? {}) as Record<string, unknown>;
  switch (e.kind) {
    case "lead.connect":
      return isTerminal(d.from) && isTerminal(d.to)
        ? { type: "connect", from: d.from, to: d.to }
        : undefined;
    case "lead.disconnect":
      return isTerminal(d.from) && isTerminal(d.to)
        ? { type: "disconnect", from: d.from, to: d.to }
        : undefined;
    case "key.close":
      return { type: "close-key" };
    case "key.open":
      return { type: "open-key" };
    case "jockey.press":
      return typeof d.at === "number" ? { type: "press-jockey", at: d.at } : undefined;
    case "jockey.slide":
      return typeof d.to === "number" ? { type: "slide-jockey", to: d.to } : undefined;
    case "jockey.lift":
      return { type: "lift-jockey" };
  }
  return undefined;
}

export const benchProjection: Projection<CircuitBench> = {
  initial: initialBench,
  apply(b, e) {
    const command = commandOf(e);
    if (!command || !decideBench(b, command).ok) return b;
    // Carry the cell's polarisation up to this moment, with the bench as it was.
    const now = { ...b, polarisation: polarisationAt(b, e.at), lastAt: e.at };
    const t = (e.at - b.startedAt) / 1000;
    switch (command.type) {
      case "connect":
        return { ...now, leads: [...b.leads, [command.from, command.to] as const] };
      case "disconnect":
        return { ...now, leads: b.leads.filter((l) => !sameLead(l, command.from, command.to)) };
      case "close-key": {
        const r = trueReadings(b.world, { ...now, keyClosed: true });
        const current = r.ok ? Math.abs(r.current) : 0;
        return {
          ...now,
          keyClosed: true,
          keyIntervals: [...b.keyIntervals, { from: t, to: t, current }],
        };
      }
      case "open-key": {
        const intervals = [...b.keyIntervals];
        const last = intervals.at(-1);
        if (last) intervals[intervals.length - 1] = { ...last, to: t };
        return { ...now, keyClosed: false, keyIntervals: intervals };
      }
      case "press-jockey":
        return { ...now, jockey: command.at };
      case "slide-jockey":
        return {
          ...now,
          jockey: command.to,
          scrapes: [...b.scrapes, [b.jockey!, command.to] as const],
        };
      case "lift-jockey":
        return { ...now, jockey: undefined };
    }
  },
};

/** The key intervals so far, with one still open running to `at` (ms): for the coach's rule. */
export function keyIntervalsAt(b: CircuitBench, at: number): KeyInterval[] {
  if (!b.keyClosed) return b.keyIntervals;
  const t = (at - b.startedAt) / 1000;
  const intervals = [...b.keyIntervals];
  const last = intervals.at(-1);
  if (last) intervals[intervals.length - 1] = { ...last, to: t };
  return intervals;
}
