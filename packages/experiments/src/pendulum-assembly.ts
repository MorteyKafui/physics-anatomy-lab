import type { Finding, Rule } from "@pa/analysis";
import type { LabEvent, NewEvent, Projection } from "@pa/engine";

/**
 * Building the simple pendulum from the parts tray (step 3). The parts are the ones on the
 * landing page's exploded apparatus; each one snaps to a slot, and a slot exists only once the
 * part that carries it is on the bench (the rod stands in the base, the boss clamps onto the
 * rod, and so on).
 *
 * The thread has two places it can go: the split cork, which is right, or tied round the clamp
 * arm, which is the mistake from the catalogue (master plan, "Off-track"). The lab lets the
 * student make it and the coach catches it when they finish building.
 */

export const PENDULUM_PARTS = ["base", "rod", "clamp", "cork", "thread", "bob", "watch"] as const;
export type PendulumPart = (typeof PENDULUM_PARTS)[number];

export const PENDULUM_SLOTS = [
  "bench",
  "base-socket",
  "rod",
  "clamp-jaw",
  "cork",
  "clamp-arm",
  "thread-end",
  "bench-corner",
] as const;
export type PendulumSlot = (typeof PENDULUM_SLOTS)[number];

interface PartSpec {
  /** Where the part may go. The first slot is the right one. */
  slots: readonly PendulumSlot[];
}

export const PART_SPECS: Record<PendulumPart, PartSpec> = {
  base: { slots: ["bench"] },
  rod: { slots: ["base-socket"] },
  clamp: { slots: ["rod"] },
  cork: { slots: ["clamp-jaw"] },
  thread: { slots: ["cork", "clamp-arm"] },
  bob: { slots: ["thread-end"] },
  watch: { slots: ["bench-corner"] },
};

/** The part that has to be on the bench before a slot exists. The bench needs nothing. */
const SLOT_HOST: Record<PendulumSlot, PendulumPart | undefined> = {
  bench: undefined,
  "base-socket": "base",
  rod: "rod",
  "clamp-jaw": "clamp",
  cork: "cork",
  "clamp-arm": "clamp",
  "thread-end": "thread",
  "bench-corner": undefined,
};

/** Which slot each placed part is in. A part missing from the map is in the tray. */
export type Assembly = Partial<Record<PendulumPart, PendulumSlot>>;

export const EMPTY_ASSEMBLY: Assembly = {};

/** The bench as the lab mockup draws it: everything in its right place. */
export const CORRECT_ASSEMBLY: Assembly = Object.fromEntries(
  PENDULUM_PARTS.map((p) => [p, PART_SPECS[p].slots[0]]),
) as Assembly;

const isPart = (v: unknown): v is PendulumPart =>
  typeof v === "string" && (PENDULUM_PARTS as readonly string[]).includes(v);
const isSlot = (v: unknown): v is PendulumSlot =>
  typeof v === "string" && (PENDULUM_SLOTS as readonly string[]).includes(v);

const occupant = (a: Assembly, slot: PendulumSlot) => PENDULUM_PARTS.find((p) => a[p] === slot);

/** A slot is ready when the part that carries it is on the bench and nothing is in it yet. */
export function slotReady(a: Assembly, slot: PendulumSlot): boolean {
  const host = SLOT_HOST[slot];
  return (host === undefined || a[host] !== undefined) && occupant(a, slot) === undefined;
}

/** Where a part from the tray can go right now. Empty if it is on the bench or nothing is ready. */
export function readySlots(a: Assembly, part: PendulumPart): PendulumSlot[] {
  if (a[part] !== undefined) return [];
  return PART_SPECS[part].slots.filter((s) => slotReady(a, s));
}

/** The part a tray part waits for, when none of its slots exists yet. */
export function waitsFor(a: Assembly, part: PendulumPart): PendulumPart | undefined {
  if (a[part] !== undefined || readySlots(a, part).length > 0) return undefined;
  return PART_SPECS[part].slots.map((s) => SLOT_HOST[s]).find((h) => h && a[h] === undefined);
}

/** Every part that rests on this one, directly or not (taking the rod off takes them too). */
export function carriedBy(a: Assembly, part: PendulumPart): PendulumPart[] {
  const out: PendulumPart[] = [];
  const visit = (p: PendulumPart) => {
    for (const q of PENDULUM_PARTS) {
      const slot = a[q];
      if (slot && SLOT_HOST[slot] === p && !out.includes(q)) {
        out.push(q);
        visit(q);
      }
    }
  };
  visit(part);
  return out;
}

/** Every part is on the bench. */
export const assembled = (a: Assembly) => PENDULUM_PARTS.every((p) => a[p] !== undefined);

/** The next part in the order the instructions give, or undefined when the bench is built. */
export const nextPart = (a: Assembly) => PENDULUM_PARTS.find((p) => a[p] === undefined);

export type AssemblyCommand =
  | { type: "place-part"; part: PendulumPart; slot: PendulumSlot }
  | { type: "remove-part"; part: PendulumPart };

/** Why the bench refused: a message key under lab.build.refused. */
export type AssemblyRefusal = "already-placed" | "not-placed" | "wrong-slot" | "slot-not-ready";

export type AssemblyDecision =
  { ok: true; events: NewEvent[] } | { ok: false; reason: AssemblyRefusal };

/** Turn a placing or removing into events, or refuse it. Pure. */
export function decideAssembly(a: Assembly, command: AssemblyCommand): AssemblyDecision {
  switch (command.type) {
    case "place-part": {
      const { part, slot } = command;
      if (a[part] !== undefined) return { ok: false, reason: "already-placed" };
      if (!PART_SPECS[part].slots.includes(slot)) return { ok: false, reason: "wrong-slot" };
      if (!slotReady(a, slot)) return { ok: false, reason: "slot-not-ready" };
      return { ok: true, events: [{ kind: "part.place", data: { part, slot } }] };
    }
    case "remove-part": {
      if (a[command.part] === undefined) return { ok: false, reason: "not-placed" };
      return { ok: true, events: [{ kind: "part.remove", data: { part: command.part } }] };
    }
  }
}

function applyAssembly(a: Assembly, command: AssemblyCommand): Assembly {
  if (command.type === "place-part") return { ...a, [command.part]: command.slot };
  const next = { ...a };
  for (const p of [command.part, ...carriedBy(a, command.part)]) delete next[p];
  return next;
}

/**
 * The bench rebuilt from an attempt's events. Like the step machine, an event is applied only
 * if `decideAssembly` would have accepted it, so a damaged file cannot float a bob in mid-air.
 */
export const assemblyProjection: Projection<Assembly> = {
  initial: () => EMPTY_ASSEMBLY,
  apply(a, e: LabEvent) {
    const d = (e.data ?? {}) as Record<string, unknown>;
    let command: AssemblyCommand | undefined;
    if (e.kind === "part.place" && isPart(d.part) && isSlot(d.slot))
      command = { type: "place-part", part: d.part, slot: d.slot };
    else if (e.kind === "part.remove" && isPart(d.part))
      command = { type: "remove-part", part: d.part };
    if (!command || !decideAssembly(a, command).ok) return a;
    return applyAssembly(a, command);
  },
};

export interface AssemblyContext {
  assembly: Assembly;
}

/** From the mistake catalogue: the thread tied round the clamp instead of held in a split cork. */
export const threadOnClamp: Rule<AssemblyContext> = {
  id: "pendulum-thread-on-clamp",
  skill: "apparatus",
  check: ({ assembly }): Finding[] =>
    assembly.thread === "clamp-arm"
      ? [
          {
            rule: "pendulum-thread-on-clamp",
            severity: "error",
            skill: "apparatus",
            key: "findings.pendulum.threadOnClamp",
          },
        ]
      : [],
};

export const ASSEMBLY_RULES: Rule<AssemblyContext>[] = [threadOnClamp];
