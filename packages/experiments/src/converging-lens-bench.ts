import type { Attempt, Json, LabEvent, NewEvent, Projection } from "@pa/engine";

import {
  convergingLens,
  lensWorld,
  screenImage,
  type LensBench,
  type LensReading,
  type LensWorld,
  type ReadFrom,
} from "./converging-lens";

/**
 * The converging lens bench as the student works it, rebuilt from the attempt's events: where
 * each holder stands on the rule, how high the gauze is, and every object distance at which the
 * student moved the screen looking for an image that was not there. Like the Ohm's law bench, an
 * event is applied only if `decideLensBench` would have accepted it.
 */
export interface LensBenchState extends LensBench {
  world: LensWorld;
  /** Object distances, m, at which the student moved the screen with no real image to find. */
  noImageAt: number[];
}

export type LensPart = "object" | "lens" | "screen";
export const LENS_PARTS: readonly LensPart[] = ["object", "lens", "screen"];

export type LensBenchCommand =
  { type: "move"; part: LensPart; to: number } | { type: "set-height"; to: number };

/** Why the bench refused: a message key under experiments.converging-lens.refused. */
export type LensBenchRefusal = "off-the-rule" | "holders-cross" | "gauze-out-of-reach";

export type LensBenchDecision =
  { ok: true; events: NewEvent[] } | { ok: false; reason: LensBenchRefusal };

/** Holders are this far apart at least, centre mark to centre mark: their bases touch, m. */
export const HOLDER_GAP = 2 * convergingLens.holderHalfWidth;
/** The gauze slides this far up or down its holder, m. */
export const GAUZE_REACH = 0.02;

/** Where the attempt's bench starts: the ray box near the zero, the lens and screen along from it. */
export const LENS_BENCH_START = { object: 0.1, lens: 0.3, screen: 0.7 } as const;

export function initialLensBench(attempt: Attempt): LensBenchState {
  return { world: lensWorld(attempt.seed), ...LENS_BENCH_START, offAxis: 0.006, noImageAt: [] };
}

const isPart = (v: unknown): v is LensPart =>
  typeof v === "string" && (LENS_PARTS as readonly string[]).includes(v);

/** Turn an action on the bench into events, or refuse it. Pure. */
export function decideLensBench(b: LensBenchState, command: LensBenchCommand): LensBenchDecision {
  switch (command.type) {
    case "move": {
      const x = command.to;
      const half = convergingLens.holderHalfWidth;
      if (!Number.isFinite(x) || x < half || x > convergingLens.benchLength - half)
        return { ok: false, reason: "off-the-rule" };
      const next = { ...b, [command.part]: x };
      // The holders keep their order on the bench and cannot pass through one another.
      if (next.lens - next.object < HOLDER_GAP || next.screen - next.lens < HOLDER_GAP)
        return { ok: false, reason: "holders-cross" };
      return { ok: true, events: [{ kind: "holder.move", data: { part: command.part, to: x } }] };
    }
    case "set-height":
      return Number.isFinite(command.to) && Math.abs(command.to) <= GAUZE_REACH
        ? { ok: true, events: [{ kind: "gauze.height", data: { to: command.to } }] }
        : { ok: false, reason: "gauze-out-of-reach" };
  }
}

function commandOf(e: LabEvent): LensBenchCommand | undefined {
  const d = (e.data ?? {}) as Record<string, unknown>;
  if (e.kind === "holder.move" && isPart(d.part) && typeof d.to === "number")
    return { type: "move", part: d.part, to: d.to };
  if (e.kind === "gauze.height" && typeof d.to === "number")
    return { type: "set-height", to: d.to };
  return undefined;
}

export const lensBenchProjection: Projection<LensBenchState> = {
  initial: initialLensBench,
  apply(b, e) {
    const command = commandOf(e);
    if (!command || !decideLensBench(b, command).ok) return b;
    if (command.type === "set-height") return { ...b, offAxis: command.to };
    const next = { ...b, [command.part]: command.to };
    // Moving the screen with nothing to find: the mistake catalogue's "inside the focal length".
    if (command.part === "screen") {
      const image = screenImage(next.world, next);
      if (image.kind === "no-image") {
        const u = Number(image.u.toFixed(4));
        if (!b.noImageAt.includes(u)) return { ...next, noImageAt: [...b.noImageAt, u] };
      }
    }
    return next;
  },
};

/**
 * What a reading records, worked out when the student takes it: u and v as read off the rule (cm),
 * and how the bench stood (the blur on the screen, where the image is sharpest, the true screen
 * distance, how the holders were read and the gauze's height), so the mistake catalogue can judge
 * it later from the reading alone. Undefined when there is no image on the screen to read.
 */
export function lensReadingData(
  b: LensBenchState,
  read: { u: number; v: number; readFrom?: ReadFrom; viewAngleDeg?: number },
): Record<string, string | number> | undefined {
  const image = screenImage(b.world, b);
  if (image.kind !== "image") return undefined;
  return {
    u: read.u,
    v: read.v,
    blur: image.blur,
    sharpestAt: image.sharpestAt,
    s: image.s,
    readFrom: read.readFrom ?? "centre",
    viewAngleDeg: read.viewAngleDeg ?? 0,
    offAxis: b.offAxis,
  };
}

/** A recorded reading back from the attempt's events, or undefined if it is not a lens reading. */
export function asLensReading(r: { id: string; data: Json }): LensReading | undefined {
  const d = (r.data ?? {}) as Record<string, Json>;
  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : undefined);
  const [u, v, blur, sharpestAt, s, viewAngleDeg, offAxis] = [
    "u",
    "v",
    "blur",
    "sharpestAt",
    "s",
    "viewAngleDeg",
    "offAxis",
  ].map(num);
  if ([u, v, blur, sharpestAt, s, viewAngleDeg, offAxis].some((x) => x === undefined))
    return undefined;
  const readFrom: ReadFrom = d.readFrom === "edge" ? "edge" : "centre";
  return {
    id: r.id,
    u: u!,
    v: v!,
    blur: blur!,
    sharpestAt: sharpestAt!,
    s: s!,
    readFrom,
    viewAngleDeg: viewAngleDeg!,
    offAxis: offAxis!,
  };
}
