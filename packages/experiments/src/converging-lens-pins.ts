import type { Finding, Rule } from "@pa/analysis";
import type { Attempt, Json, LabEvent, NewEvent, Projection } from "@pa/engine";
import { noParallax, paraxialImageDistance, parallaxLeft, type ParallaxView } from "@pa/physics";

import { convergingLens, lensWorld, type LensWorld, type ReadFrom } from "./converging-lens";

/**
 * The converging lens with two optical pins (Experiment 96), as approved in
 * docs/content/converging-lens-brief.md (decisions 8 to 11): the object pin P₁ at x in front of
 * the lens, and the search pin P₂ moved behind it until it shows no parallax with the image of P₁.
 * The lens, the rule and the holders are the screen method's; every number comes from
 * packages/physics (AGENTS.md rule 1). Lengths in metres; the rule reads in centimetres.
 */
export const lensPins = {
  id: "converging-lens-pins",
  version: 1,
  topic: "light",
  /** The object distances the question sets, m. */
  objectDistances: [0.2, 0.3, 0.4, 0.5],
  /**
   * How the student looks (decisions 9 and 10): the eye 25 cm behind the image, the head moving
   * 0.5 cm either side, and two things seen apart when more than 1 minute of arc apart.
   */
  view: { eyeBehind: 0.25, head: 0.005, acuity: Math.PI / (180 * 60) },
  /** The eye this far off the lens's axis looks through an outer zone of the lens, m. */
  eyeTolerance: 0.003,
  /** The tips this far apart in height cannot be brought together, m (assumed). */
  tipTolerance: 0.001,
  /** How far a pin's tip, and the eye, can be moved up or down, m. */
  reach: 0.02,
} as const;

/** What is on the bench: each holder's centre mark on the rule, the tips' and the eye's heights. */
export interface PinsBench {
  object: number;
  lens: number;
  pin: number;
  /** Heights above the lens's axis, m: each pin's tip, and the eye's centre. */
  objectTip: number;
  pinTip: number;
  eye: number;
}

/** What the student sees through the lens with the bench as it stands. */
export type PinsView =
  | { kind: "misplaced" }
  | { kind: "no-image"; x: number }
  | {
      kind: "image";
      x: number;
      /** The search pin's distance from the lens, m. */
      y: number;
      /** Where there is least parallax for this eye, m from the lens, and what is left there, rad. */
      at: number;
      leastLeft: number;
      /** The same for the eye on the axis: where the student should find it. */
      atOnAxis: number;
      /** The parallax left with the pin where it stands, rad, and whether the eye sees none. */
      left: number;
      clear: boolean;
      /** The image's tip and the search pin's tip, how far apart in height, m. */
      tipGap: number;
      magnification: number;
    };

const viewFor = (eye: number): ParallaxView => ({ ...lensPins.view, centre: eye });

/**
 * The view through the lens. The object pin's tip at h makes an image tip at −m h (inverted), so
 * the tips can meet only if the search pin's tip is there too. Inside the focal length the image is
 * virtual, on the object's side: there is nothing behind the lens to bring the search pin to.
 */
export function pinsView(world: LensWorld, bench: PinsBench): PinsView {
  const x = bench.lens - bench.object;
  const y = bench.pin - bench.lens;
  if (!(x > 0) || !(y > 0)) return { kind: "misplaced" };
  if (x <= world.focalLength) return { kind: "no-image", x };
  const view = viewFor(bench.eye);
  const best = noParallax(world.lens, x, view);
  const onAxis = bench.eye === 0 ? best : noParallax(world.lens, x, viewFor(0));
  const left = parallaxLeft(world.lens, x, y, view);
  const magnification = paraxialImageDistance(world.lens, x) / x;
  return {
    kind: "image",
    x,
    y,
    at: best.at,
    leastLeft: best.residual,
    atOnAxis: onAxis.at,
    left,
    clear: left <= lensPins.view.acuity,
    tipGap: Math.abs(-magnification * bench.objectTip - bench.pinTip),
    magnification,
  };
}

/** The correct bench for an object distance: tips and eye on the axis, the pin at no parallax. */
export function correctPinsBench(world: LensWorld, x: number, objectAt = 0.1): PinsBench {
  const lens = objectAt + x;
  return {
    object: objectAt,
    lens,
    pin: lens + noParallax(world.lens, x, viewFor(0)).at,
    objectTip: 0,
    pinTip: 0,
    eye: 0,
  };
}

// The bench as the student works it, rebuilt from the attempt's events.

export interface PinsBenchState extends PinsBench {
  world: LensWorld;
}

export type PinsPart = "object" | "lens" | "pin";
export const PINS_PARTS: readonly PinsPart[] = ["object", "lens", "pin"];

export type PinsBenchCommand =
  | { type: "move"; part: PinsPart; to: number }
  | { type: "set-tip"; pin: "object" | "search"; to: number }
  | { type: "set-eye"; to: number };

/** Why the bench refused: a message key under experiments.converging-lens-pins.refused. */
export type PinsBenchRefusal = "off-the-rule" | "holders-cross" | "out-of-reach";

export type PinsBenchDecision =
  { ok: true; events: NewEvent[] } | { ok: false; reason: PinsBenchRefusal };

/** Holders are this far apart at least, centre mark to centre mark: their bases touch, m. */
const HOLDER_GAP = 2 * convergingLens.holderHalfWidth;

/**
 * Where the attempt's bench starts: the object pin near the zero, the lens and the search pin along
 * from it, and the object pin's tip 4 mm above the axis, to be set level before measuring.
 */
export const PINS_BENCH_START = {
  object: 0.1,
  lens: 0.3,
  pin: 0.7,
  objectTip: 0.004,
  pinTip: 0,
  eye: 0,
} as const;

export function initialPinsBench(attempt: Attempt): PinsBenchState {
  return { world: lensWorld(attempt.seed), ...PINS_BENCH_START };
}

const isPart = (v: unknown): v is PinsPart =>
  typeof v === "string" && (PINS_PARTS as readonly string[]).includes(v);
const within = (v: number) => Number.isFinite(v) && Math.abs(v) <= lensPins.reach;

/** Turn an action on the bench into events, or refuse it. Pure. */
export function decidePinsBench(b: PinsBenchState, command: PinsBenchCommand): PinsBenchDecision {
  switch (command.type) {
    case "move": {
      const x = command.to;
      const half = convergingLens.holderHalfWidth;
      if (!Number.isFinite(x) || x < half || x > convergingLens.benchLength - half)
        return { ok: false, reason: "off-the-rule" };
      const next = { ...b, [command.part]: x };
      if (next.lens - next.object < HOLDER_GAP || next.pin - next.lens < HOLDER_GAP)
        return { ok: false, reason: "holders-cross" };
      return { ok: true, events: [{ kind: "holder.move", data: { part: command.part, to: x } }] };
    }
    case "set-tip":
      return within(command.to)
        ? { ok: true, events: [{ kind: "pin.tip", data: { pin: command.pin, to: command.to } }] }
        : { ok: false, reason: "out-of-reach" };
    case "set-eye":
      return within(command.to)
        ? { ok: true, events: [{ kind: "eye.height", data: { to: command.to } }] }
        : { ok: false, reason: "out-of-reach" };
  }
}

function commandOf(e: LabEvent): PinsBenchCommand | undefined {
  const d = (e.data ?? {}) as Record<string, unknown>;
  if (e.kind === "holder.move" && isPart(d.part) && typeof d.to === "number")
    return { type: "move", part: d.part, to: d.to };
  if (
    e.kind === "pin.tip" &&
    (d.pin === "object" || d.pin === "search") &&
    typeof d.to === "number"
  )
    return { type: "set-tip", pin: d.pin, to: d.to };
  if (e.kind === "eye.height" && typeof d.to === "number") return { type: "set-eye", to: d.to };
  return undefined;
}

export const pinsBenchProjection: Projection<PinsBenchState> = {
  initial: initialPinsBench,
  apply(b, e) {
    const command = commandOf(e);
    if (!command || !decidePinsBench(b, command).ok) return b;
    if (command.type === "move") return { ...b, [command.part]: command.to };
    if (command.type === "set-eye") return { ...b, eye: command.to };
    return command.pin === "object"
      ? { ...b, objectTip: command.to }
      : { ...b, pinTip: command.to };
  },
};

// Readings, and the mistakes in them.

/** One reading the student took: x and y as read (cm), and how the bench stood when they read it. */
export interface PinsReading {
  id: string;
  x: number;
  y: number;
  /** The search pin's true distance from the lens, and where no parallax was for the eye used, m. */
  s: number;
  at: number;
  atOnAxis: number;
  /** The parallax left at the pin, rad; the eye's height, m; the tips' gap in height, m. */
  left: number;
  eye: number;
  tipGap: number;
  readFrom: ReadFrom;
}

/**
 * What a reading records, worked out when the student takes it, so the mistakes can be judged
 * later from the reading alone. Undefined when there is no real image behind the lens.
 */
export function pinsReadingData(
  b: PinsBenchState,
  read: { x: number; y: number; readFrom?: ReadFrom },
): Record<string, string | number> | undefined {
  const v = pinsView(b.world, b);
  if (v.kind !== "image") return undefined;
  return {
    x: read.x,
    y: read.y,
    s: v.y,
    at: v.at,
    atOnAxis: v.atOnAxis,
    left: v.left,
    eye: b.eye,
    tipGap: v.tipGap,
    readFrom: read.readFrom ?? "centre",
  };
}

/** A recorded reading back from the attempt's events, or undefined if it is not a pins reading. */
export function asPinsReading(r: { id: string; data: Json }): PinsReading | undefined {
  const d = (r.data ?? {}) as Record<string, Json>;
  const keys = ["x", "y", "s", "at", "atOnAxis", "left", "eye", "tipGap"] as const;
  if (keys.some((k) => typeof d[k] !== "number")) return undefined;
  const n = (k: (typeof keys)[number]) => d[k] as number;
  return {
    id: r.id,
    x: n("x"),
    y: n("y"),
    s: n("s"),
    at: n("at"),
    atOnAxis: n("atOnAxis"),
    left: n("left"),
    eye: n("eye"),
    tipGap: n("tipGap"),
    readFrom: d.readFrom === "edge" ? "edge" : "centre",
  };
}

export interface PinsProcedureContext {
  readings: readonly PinsReading[];
}

const cm = (m: number) => Number((m * 100).toFixed(1));
const mm = (m: number) => Number((m * 1000).toFixed(1));
const arcmin = (rad: number) => Number((rad / lensPins.view.acuity).toFixed(1));

/** The eye off the lens's axis, so the rays come through an outer zone and the place sits nearer the lens. */
export const eyeOffAxis: Rule<PinsProcedureContext> = {
  id: "pins-eye-off-axis",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => Math.abs(r.eye) > lensPins.eyeTolerance);
    if (!off.length) return [];
    const worst = off.reduce((a, r) => (Math.abs(r.eye) > Math.abs(a.eye) ? r : a));
    return [
      {
        rule: "pins-eye-off-axis",
        severity: "warning",
        skill: "measurement",
        key: "findings.pins.eyeOffAxis",
        params: { mm: mm(Math.abs(worst.eye)), cm: cm(worst.atOnAxis - worst.at) },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** The pins' tips not level with the axis, so the image's tip and the search pin's cannot meet. */
export const tipsOffAxis: Rule<PinsProcedureContext> = {
  id: "pins-tips-off-axis",
  skill: "apparatus",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => r.tipGap > lensPins.tipTolerance);
    if (!off.length) return [];
    return [
      {
        rule: "pins-tips-off-axis",
        severity: "warning",
        skill: "apparatus",
        key: "findings.pins.tipsOffAxis",
        params: { mm: mm(Math.max(...off.map((r) => r.tipGap))) },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** Stopping with parallax still there: y is off the no-parallax place. */
export const parallaxStillThere: Rule<PinsProcedureContext> = {
  id: "pins-parallax-left",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => r.left > lensPins.view.acuity);
    if (!off.length) return [];
    const worst = off.reduce((a, r) => (Math.abs(r.s - r.at) > Math.abs(a.s - a.at) ? r : a));
    return [
      {
        rule: "pins-parallax-left",
        severity: "error",
        skill: "measurement",
        key: "findings.pins.parallaxLeft",
        params: {
          count: off.length,
          arcmin: arcmin(worst.left),
          cm: cm(Math.abs(worst.s - worst.at)),
        },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** x or y read from a holder's edge, not its centre mark (as for the screen method). */
export const pinsReadFromEdge: Rule<PinsProcedureContext> = {
  id: "pins-read-from-edge",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => r.readFrom === "edge");
    if (!off.length) return [];
    return [
      {
        rule: "pins-read-from-edge",
        severity: "warning",
        skill: "measurement",
        key: "findings.pins.readFromEdge",
        params: { count: off.length, cm: cm(convergingLens.holderHalfWidth) },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/**
 * The mistakes in how the readings were taken. Plotting the wrong graph, the fifth approved
 * mistake, is checked with the graph, as for the screen method.
 */
export const PINS_PROCEDURE_RULES: Rule<PinsProcedureContext>[] = [
  eyeOffAxis,
  tipsOffAxis,
  parallaxStillThere,
  pinsReadFromEdge,
];
