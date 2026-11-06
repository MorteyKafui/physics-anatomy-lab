import { describe, expect, test } from "bun:test";
import { runRules } from "@pa/analysis";
import type { Attempt, LabEvent, NewEvent } from "@pa/engine";
import { replay } from "@pa/engine";
import fc from "fast-check";

import {
  ASSEMBLY_RULES,
  assembled,
  assemblyProjection,
  carriedBy,
  CORRECT_ASSEMBLY,
  decideAssembly,
  EMPTY_ASSEMBLY,
  nextPart,
  PART_SPECS,
  PENDULUM_PARTS,
  PENDULUM_SLOTS,
  readySlots,
  waitsFor,
  type Assembly,
  type AssemblyCommand,
} from "../src";

const attempt: Attempt = {
  id: "a",
  experimentId: "simple-pendulum",
  mode: "guided",
  seed: 1,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
};

const asEvents = (news: NewEvent[]): LabEvent[] =>
  news.map((e, i) => ({ ...e, id: `e${i}`, attemptId: "a", seq: i + 1, device: "d", at: i }));

/** Run commands through decide and the projection, as the lab does. */
function build(commands: AssemblyCommand[]) {
  const events: NewEvent[] = [];
  let a: Assembly = EMPTY_ASSEMBLY;
  for (const c of commands) {
    const d = decideAssembly(a, c);
    if (!d.ok) continue;
    events.push(...d.events);
    a = replay(assemblyProjection, attempt, asEvents(events));
  }
  return { assembly: a, events };
}

const placeAllRight: AssemblyCommand[] = PENDULUM_PARTS.map((part) => ({
  type: "place-part",
  part,
  slot: PART_SPECS[part].slots[0]!,
}));

describe("building the pendulum", () => {
  test("the parts go on in the instructions' order and give the mockup's bench", () => {
    const { assembly } = build(placeAllRight);
    expect(assembly).toEqual(CORRECT_ASSEMBLY);
    expect(assembled(assembly)).toBe(true);
    expect(nextPart(assembly)).toBeUndefined();
  });

  test("a slot exists only once the part that carries it is on the bench", () => {
    expect(readySlots(EMPTY_ASSEMBLY, "clamp")).toEqual([]);
    expect(waitsFor(EMPTY_ASSEMBLY, "clamp")).toBe("rod");
    expect(
      decideAssembly(EMPTY_ASSEMBLY, { type: "place-part", part: "clamp", slot: "rod" }),
    ).toEqual({ ok: false, reason: "slot-not-ready" });
    expect(readySlots(EMPTY_ASSEMBLY, "watch")).toEqual(["bench-corner"]);
  });

  test("a part goes only where it fits", () => {
    expect(
      decideAssembly(EMPTY_ASSEMBLY, { type: "place-part", part: "bob", slot: "bench" }),
    ).toEqual({
      ok: false,
      reason: "wrong-slot",
    });
  });

  test("the thread can go on the cork or, wrongly, round the clamp arm", () => {
    const upToCork = build(placeAllRight.slice(0, 4)).assembly;
    expect(readySlots(upToCork, "thread")).toEqual(["cork", "clamp-arm"]);
  });

  test("taking a part off takes everything resting on it back to the tray", () => {
    const { events } = build(placeAllRight);
    expect(carriedBy(CORRECT_ASSEMBLY, "rod")).toEqual(["clamp", "cork", "thread", "bob"]);
    const d = decideAssembly(CORRECT_ASSEMBLY, { type: "remove-part", part: "rod" });
    expect(d.ok).toBe(true);
    const after = replay(
      assemblyProjection,
      attempt,
      asEvents([...events, ...(d.ok ? d.events : [])]),
    );
    expect(after).toEqual({ base: "bench", watch: "bench-corner" });
    expect(nextPart(after)).toBe("rod");
  });

  test("a damaged event list never floats a part in mid-air", () => {
    const anyEvent = fc.oneof(
      fc.record({
        kind: fc.constant("part.place"),
        data: fc.record({
          part: fc.constantFrom(...PENDULUM_PARTS, "hammer"),
          slot: fc.constantFrom(...PENDULUM_SLOTS, "ceiling"),
        }),
      }),
      fc.record({
        kind: fc.constant("part.remove"),
        data: fc.record({ part: fc.constantFrom(...PENDULUM_PARTS) }),
      }),
      fc.record({ kind: fc.constant("step.go-to"), data: fc.constant({ step: "measure" }) }),
    );
    fc.assert(
      fc.property(fc.array(anyEvent, { maxLength: 40 }), (news) => {
        const a = replay(assemblyProjection, attempt, asEvents(news as NewEvent[]));
        // Every placed part sits in one of its own slots, each slot holds one part, and the
        // part carrying that slot is on the bench too.
        const slots = Object.values(a);
        if (new Set(slots).size !== slots.length) return false;
        return PENDULUM_PARTS.every((p) => {
          const s = a[p];
          if (s === undefined) return true;
          if (!PART_SPECS[p].slots.includes(s)) return false;
          const carrier = PENDULUM_PARTS.find(
            (q) =>
              ({
                bench: undefined,
                "bench-corner": undefined,
                "base-socket": "base",
                rod: "rod",
                "clamp-jaw": "clamp",
                cork: "cork",
                "clamp-arm": "clamp",
                "thread-end": "thread",
              })[s] === q,
          );
          return carrier === undefined || a[carrier] !== undefined;
        });
      }),
    );
  });
});

describe("the setup rule", () => {
  test("the thread tied round the clamp is an apparatus error; the cork is fine", () => {
    const right = build(placeAllRight).assembly;
    expect(runRules(ASSEMBLY_RULES, { assembly: right })).toEqual([]);
    const wrong = { ...right, thread: "clamp-arm" as const };
    expect(
      runRules(ASSEMBLY_RULES, { assembly: wrong }).map((f) => [f.rule, f.severity, f.skill]),
    ).toEqual([["pendulum-thread-on-clamp", "error", "apparatus"]]);
  });
});
