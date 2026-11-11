import { describe, expect, test } from "bun:test";

import type { Attempt, LabEvent, NewEvent } from "@pa/engine";
import { polarise } from "@pa/physics";

import {
  benchProjection,
  CORRECT_LEADS,
  decideBench,
  initialBench,
  keyIntervalsAt,
  ohmsLaw,
  polarisationAt,
  trueReadings,
  wiredRight,
  type BenchCommand,
  type CircuitBench,
} from "../src";

const attempt: Attempt = {
  id: "a1",
  experimentId: "ohms-law",
  mode: "guided",
  seed: 424242,
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_000_000,
  formatVersion: 1,
};

/** Run commands through decide and the projection, one second apart unless told otherwise. */
function run(steps: (BenchCommand | { wait: number })[]) {
  let b = initialBench(attempt);
  let at = attempt.createdAt;
  let seq = 0;
  const events: LabEvent[] = [];
  for (const s of steps) {
    if ("wait" in s) {
      at += s.wait * 1000;
      continue;
    }
    at += 1000;
    const d = decideBench(b, s);
    if (!d.ok) throw new Error(`${s.type}: ${d.reason}`);
    for (const e of d.events as NewEvent[]) {
      const event: LabEvent = {
        ...e,
        id: `e${++seq}`,
        attemptId: attempt.id,
        seq,
        device: "d",
        at,
      };
      events.push(event);
      b = benchProjection.apply(b, event);
    }
  }
  return { b, events, at };
}
const wire: BenchCommand[] = CORRECT_LEADS.map(([from, to]) => ({ type: "connect", from, to }));

describe("working the Ohm's law bench", () => {
  test("joining the diagram's leads wires the circuit; closing the key and pressing the jockey gives its readings", () => {
    const { b } = run([...wire, { type: "close-key" }, { type: "press-jockey", at: 0.6 }]);
    expect(wiredRight(b.leads)).toBe(true);
    const r = trueReadings(b.world, b);
    if (!r.ok) throw new Error("blocked");
    expect(r.current).toBeGreaterThan(0.6);
    expect(r.voltage).toBeLessThan(b.world.emf);
  });

  test("a lead joined twice, or to the same terminal, is refused", () => {
    const { b } = run(wire.slice(0, 1));
    expect(decideBench(b, wire[0]!)).toEqual({ ok: false, reason: "lead-exists" });
    expect(decideBench(b, { type: "connect", from: "R.1", to: "R.1" })).toEqual({
      ok: false,
      reason: "same-terminal",
    });
  });

  test("the key will not close on a short circuit, and a shorting lead cannot be joined while it is closed", () => {
    const { b } = run([...wire, { type: "connect", from: "cell+", to: "key.2" }]);
    expect(decideBench(b, { type: "close-key" })).toEqual({ ok: false, reason: "short-circuit" });
    const closed = run([...wire, { type: "close-key" }]).b;
    expect(decideBench(closed, { type: "connect", from: "cell+", to: "key.2" })).toEqual({
      ok: false,
      reason: "short-circuit",
    });
  });

  test("with the key closed, pressing the jockey at Q is refused: the ammeter would pass full scale", () => {
    const { b } = run([...wire, { type: "close-key" }]);
    expect(decideBench(b, { type: "press-jockey", at: 1.0 })).toEqual({
      ok: false,
      reason: "ammeter-over-range",
    });
    expect(decideBench(b, { type: "press-jockey", at: 1.2 })).toEqual({
      ok: false,
      reason: "off-the-wire",
    });
  });

  test("the cell polarises while the key is closed and recovers while it is open, through the event times", () => {
    const { b } = run([
      ...wire,
      { type: "press-jockey", at: 0.6 },
      { type: "close-key" },
      { wait: 59 },
      { type: "open-key" },
    ]);
    const r = trueReadings(b.world, { ...b, keyClosed: true, polarisation: 0 });
    if (!r.ok) throw new Error("blocked");
    // Closed for 60 s: the polarisation built towards k I (I falls a little as it builds).
    const expected = polarise(0, r.current, 60, ohmsLaw.polarisation);
    expect(b.polarisation).toBeGreaterThan(expected * 0.95);
    expect(b.polarisation).toBeLessThanOrEqual(expected);
    // Open for a minute: it dies away by e⁻¹.
    expect(polarisationAt(b, b.lastAt + 60_000)).toBeCloseTo(b.polarisation * Math.exp(-1), 12);
    expect(b.keyIntervals).toHaveLength(1);
    expect(b.keyIntervals[0]!.to - b.keyIntervals[0]!.from).toBe(60);
  });

  test("an interval still open runs to now, for the coach's key-left-closed rule", () => {
    const { b, at } = run([...wire, { type: "close-key" }]);
    const [k] = keyIntervalsAt(b, at + 45_000);
    expect(k!.to - k!.from).toBe(45);
  });

  test("sliding the pressed jockey records a scrape; lifting and pressing again does not", () => {
    const slid = run([
      ...wire,
      { type: "press-jockey", at: 0.4 },
      { type: "slide-jockey", to: 0.5 },
    ]).b;
    expect(slid.scrapes).toEqual([[0.4, 0.5]]);
    const lifted = run([
      ...wire,
      { type: "press-jockey", at: 0.4 },
      { type: "lift-jockey" },
      { type: "press-jockey", at: 0.5 },
    ]).b;
    expect(lifted.scrapes).toEqual([]);
    expect(lifted.jockey).toBe(0.5);
  });

  test("replaying the events rebuilds the same bench, and an event the bench would refuse is ignored", () => {
    const { b, events } = run([...wire, { type: "close-key" }, { type: "press-jockey", at: 0.7 }]);
    const again = events.reduce<CircuitBench>(
      (s, e) => benchProjection.apply(s, e),
      benchProjection.initial(attempt),
    );
    expect(again).toEqual(b);
    const bogus: LabEvent = { ...events[0]!, id: "x", kind: "jockey.press", data: { at: 1.0 } };
    expect(benchProjection.apply(b, bogus)).toBe(b);
  });
});
