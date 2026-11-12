import type { Finding, Rule } from "@pa/analysis";
import type { Json, LabEvent, NewEvent, Projection } from "@pa/engine";
import {
  MEASURING_CYLINDER,
  parallaxShift,
  quantise,
  takeReading,
  THERMOMETER,
  type InstrumentSpec,
  type Reading,
  type Rng,
} from "@pa/instruments";
import {
  type Calorimeter,
  calorimeterAt,
  newtonCooling,
  thermometerPeak,
  WATER_SPECIFIC_HEAT_CAPACITY,
} from "@pa/physics";

/**
 * The method of mixtures with water at two temperatures (Experiment 62), as approved in
 * docs/content/method-of-mixtures-brief.md (decisions 1 to 5): 50 cm³ of water at 65 °C poured
 * into V cm³ of tap water in a lagged copper calorimeter, stirred, and the highest temperature
 * read. Every temperature comes from the heat model in packages/physics (AGENTS.md rule 1).
 * Volumes in cm³ (1 cm³ of water is 1 g), temperatures in °C, times in s.
 */
export const methodOfMixtures = {
  id: "method-of-mixtures",
  version: 1,
  topic: "heat",
  /** The cold volumes the question sets, cm³ (decision 1). */
  volumes: [40, 50, 60, 70],
  /** The hot water: its volume, cm³, and the temperature it is heated to, °C. */
  hot: { volume: 50, temperature: 65 },
  /** The copper calorimeter with its stirrer (decision 2). */
  calorimeter: { mass: 0.05, specificHeatCapacity: 390 },
  /** The room and the tap water, °C (decision 2). */
  room: 28,
  /**
   * Newton's cooling constants, s⁻¹ (decision 3): the lagged calorimeter with its lid on, the same
   * without the lid (eight times), and the open beaker the hot water waits in, which is as open as
   * a calorimeter without its lid.
   */
  loss: { covered: 0.01 / 60, uncovered: 0.08 / 60, beaker: 0.08 / 60 },
  /** The mixing time, s, stirred and not (decision 3). */
  mixing: { stirred: 5, unstirred: 120 },
  /** The thermometer's lag, s (decision 3). */
  lag: 8,
  /** The measuring cylinder holds this much, cm³. */
  cylinderCapacity: 100,
  /** Pouring later than this after the water reaches 65 °C is a slow pour, s (assumed). */
  pourWithin: 10,
  /** Reading a scale more than this far off square-on is reading it at an angle, degrees. */
  angleLimitDeg: 5,
} as const;

/**
 * The thermometer read to 0.1 °C (decision 4): 1 °C divisions with tenths estimated by eye. Its
 * mercury column sits behind the scale, so read at an angle it is off by 0.5 °C × tan(angle)
 * (assumed until the UEW data).
 */
export const MIXTURES_THERMOMETER: Readonly<InstrumentSpec> = {
  ...THERMOMETER,
  id: "thermometer-tenth",
  resolution: 0.1,
  pointerHeight: 0.5,
};

/** What is in and around the calorimeter, rebuilt from the attempt's events. */
export interface MixturesBench {
  /** The water truly in the calorimeter and in the beaker, cm³; null until filled. */
  cold: number | null;
  hot: number | null;
  /** How far off square-on the student read the cylinder for each, degrees. */
  coldAngle: number;
  hotAngle: number;
  /** The lid on the calorimeter, and the student stirring. */
  covered: boolean;
  stirring: boolean;
  /** How long after reaching 65 °C the hot water was poured in, s; null until poured. */
  pouredAfter: number | null;
}

export const MIXTURES_BENCH_START: MixturesBench = {
  cold: null,
  hot: null,
  coldAngle: 0,
  hotAngle: 0,
  covered: false,
  stirring: false,
  pouredAfter: null,
};

/**
 * The water truly in the cylinder when the student fills it to what they read as `to` cm³: read at
 * an angle, the scale seems shifted, so they stop with that much more or less in it.
 */
export function filledVolume(to: number, viewAngleDeg = 0): number {
  return to - parallaxShift(MEASURING_CYLINDER.pointerHeight ?? 0, viewAngleDeg);
}

/** The hot water's temperature as it goes in: it cools in the open beaker while it waits, °C. */
export function hotAtPour(after: number): number {
  const m = methodOfMixtures;
  return newtonCooling(m.hot.temperature, m.room, m.loss.beaker, after);
}

/** The heat model's calorimeter for this bench, once both waters are measured. */
export function mixturesCalorimeter(
  bench: Pick<MixturesBench, "cold" | "hot" | "covered" | "stirring">,
  pouredAfter = 0,
): Calorimeter {
  const m = methodOfMixtures;
  if (bench.cold === null || bench.hot === null) throw new RangeError("fill both first");
  const water = (cm3: number, temperature: number) => ({
    mass: cm3 / 1000,
    specificHeatCapacity: WATER_SPECIFIC_HEAT_CAPACITY,
    temperature,
  });
  return {
    hot: water(bench.hot, hotAtPour(pouredAfter)),
    cold: [water(bench.cold, m.room), { ...m.calorimeter, temperature: m.room }],
    room: m.room,
    loss: bench.covered ? m.loss.covered : m.loss.uncovered,
    mixing: bench.stirring ? m.mixing.stirred : m.mixing.unstirred,
    lag: m.lag,
  };
}

/** What the thermometer truly shows t s after the pour; before it, the cold water's temperature. */
export function thermometerTruth(bench: MixturesBench, t: number): number {
  if (bench.pouredAfter === null) return methodOfMixtures.room;
  return calorimeterAt(mixturesCalorimeter(bench, bench.pouredAfter), t).thermometer;
}

/** The highest the thermometer reads after this pour, and when, s after it. */
export function mixturesPeak(bench: MixturesBench): { at: number; temperature: number } {
  if (bench.pouredAfter === null) throw new RangeError("pour first");
  const peak = thermometerPeak(mixturesCalorimeter(bench, bench.pouredAfter));
  if (!peak) throw new RangeError("the thermometer never stops rising");
  return peak;
}

/** The thermometer as the student reads it, square-on or at an angle. */
export function readThermometer(
  bench: MixturesBench,
  t: number,
  opts: { rng: Rng; viewAngleDeg?: number },
): Reading {
  const view = opts.viewAngleDeg === undefined ? {} : { viewAngleDeg: opts.viewAngleDeg };
  return takeReading(MIXTURES_THERMOMETER, thermometerTruth(bench, t), { rng: opts.rng, ...view });
}

/** A thermometer reading as a careful student records it: to 0.1 °C. */
export const recordedTemperature = (reading: Reading) =>
  quantise(reading.shown, MIXTURES_THERMOMETER.resolution);

/** The careful run at V cm³: both filled square-on, the lid on, stirred, poured at once. */
export function correctMixturesBench(volume: number): MixturesBench {
  return {
    cold: volume,
    hot: methodOfMixtures.hot.volume,
    coldAngle: 0,
    hotAngle: 0,
    covered: true,
    stirring: true,
    pouredAfter: 0,
  };
}

// The bench as the student works it, from the attempt's events.

export type MixturesCommand =
  | { type: "fill"; vessel: "cold" | "hot"; to: number; viewAngleDeg?: number }
  | { type: "cover"; on: boolean }
  | { type: "stir"; on: boolean }
  | { type: "pour"; after: number }
  | { type: "empty" };

/** Why the bench refused: a message key under experiments.method-of-mixtures.refused. */
export type MixturesRefusal = "cylinder-holds" | "already-poured" | "fill-both" | "not-a-number";

export type MixturesDecision =
  { ok: true; events: NewEvent[] } | { ok: false; reason: MixturesRefusal };

export function initialMixturesBench(): MixturesBench {
  return { ...MIXTURES_BENCH_START };
}

const finiteAngle = (a: number | undefined) => (a === undefined ? 0 : a);

/** Turn an action on the bench into events, or refuse it. Pure. */
export function decideMixtures(b: MixturesBench, command: MixturesCommand): MixturesDecision {
  const poured = b.pouredAfter !== null;
  switch (command.type) {
    case "fill": {
      const angle = finiteAngle(command.viewAngleDeg);
      if (poured) return { ok: false, reason: "already-poured" };
      if (!Number.isFinite(angle) || Math.abs(angle) >= 80)
        return { ok: false, reason: "not-a-number" };
      const truth = filledVolume(command.to, angle);
      if (!Number.isFinite(command.to) || !(truth > 0) || truth > methodOfMixtures.cylinderCapacity)
        return { ok: false, reason: "cylinder-holds" };
      return {
        ok: true,
        events: [
          {
            kind: "cylinder.fill",
            data: { vessel: command.vessel, to: command.to, angle },
          },
        ],
      };
    }
    case "cover":
      return poured
        ? { ok: false, reason: "already-poured" }
        : { ok: true, events: [{ kind: "lid.set", data: { on: command.on } }] };
    case "stir":
      return poured
        ? { ok: false, reason: "already-poured" }
        : { ok: true, events: [{ kind: "stirrer.set", data: { on: command.on } }] };
    case "pour":
      if (poured) return { ok: false, reason: "already-poured" };
      if (b.cold === null || b.hot === null) return { ok: false, reason: "fill-both" };
      if (!(command.after >= 0) || !Number.isFinite(command.after))
        return { ok: false, reason: "not-a-number" };
      return { ok: true, events: [{ kind: "hot.pour", data: { after: command.after } }] };
    case "empty":
      return { ok: true, events: [{ kind: "calorimeter.empty", data: {} }] };
  }
}

function commandOf(e: LabEvent): MixturesCommand | undefined {
  const d = (e.data ?? {}) as Record<string, unknown>;
  if (
    e.kind === "cylinder.fill" &&
    (d.vessel === "cold" || d.vessel === "hot") &&
    typeof d.to === "number" &&
    typeof d.angle === "number"
  )
    return { type: "fill", vessel: d.vessel, to: d.to, viewAngleDeg: d.angle };
  if (e.kind === "lid.set" && typeof d.on === "boolean") return { type: "cover", on: d.on };
  if (e.kind === "stirrer.set" && typeof d.on === "boolean") return { type: "stir", on: d.on };
  if (e.kind === "hot.pour" && typeof d.after === "number") return { type: "pour", after: d.after };
  if (e.kind === "calorimeter.empty") return { type: "empty" };
  return undefined;
}

export const mixturesProjection: Projection<MixturesBench> = {
  initial: initialMixturesBench,
  apply(b, e) {
    const command = commandOf(e);
    if (!command || !decideMixtures(b, command).ok) return b;
    switch (command.type) {
      case "fill": {
        const angle = finiteAngle(command.viewAngleDeg);
        const truth = filledVolume(command.to, angle);
        return command.vessel === "cold"
          ? { ...b, cold: truth, coldAngle: angle }
          : { ...b, hot: truth, hotAngle: angle };
      }
      case "cover":
        return { ...b, covered: command.on };
      case "stir":
        return { ...b, stirring: command.on };
      case "pour":
        return { ...b, pouredAfter: command.after };
      case "empty":
        // The lid and the stirrer stay as they were; the waters go.
        return { ...MIXTURES_BENCH_START, covered: b.covered, stirring: b.stirring };
    }
  },
};

// Readings, and the mistakes in them.

/** One row the student took: V, the starting and the highest temperature, as read. */
export interface MixturesReading {
  id: string;
  /** As the student recorded them: cm³, °C, °C. */
  volume: number;
  start: number;
  highest: number;
  /** When they read the highest, s after the pour. */
  t: number;
  /** How the run truly went: the waters, cm³; the lid; stirring; the pour's delay, s. */
  cold: number;
  hot: number;
  covered: boolean;
  stirring: boolean;
  pouredAfter: number;
  /** How far off square-on they read each scale, degrees. */
  coldAngle: number;
  hotAngle: number;
  thermometerAngle: number;
}

/**
 * What a reading records, worked out when the student takes it, so the mistakes can be judged
 * from the reading alone. Undefined before the hot water is poured.
 */
export function mixturesReadingData(
  b: MixturesBench,
  read: { volume: number; start: number; highest: number; t: number; thermometerAngle?: number },
): Record<string, string | number | boolean> | undefined {
  if (b.cold === null || b.hot === null || b.pouredAfter === null) return undefined;
  return {
    volume: read.volume,
    start: read.start,
    highest: read.highest,
    t: read.t,
    cold: b.cold,
    hot: b.hot,
    covered: b.covered,
    stirring: b.stirring,
    pouredAfter: b.pouredAfter,
    coldAngle: b.coldAngle,
    hotAngle: b.hotAngle,
    thermometerAngle: read.thermometerAngle ?? 0,
  };
}

/** A recorded reading back from the attempt's events, or undefined if it is not one. */
export function asMixturesReading(r: { id: string; data: Json }): MixturesReading | undefined {
  const d = (r.data ?? {}) as Record<string, Json>;
  const numbers = [
    "volume",
    "start",
    "highest",
    "t",
    "cold",
    "hot",
    "pouredAfter",
    "coldAngle",
    "hotAngle",
    "thermometerAngle",
  ] as const;
  if (numbers.some((k) => typeof d[k] !== "number")) return undefined;
  if (typeof d.covered !== "boolean" || typeof d.stirring !== "boolean") return undefined;
  const n = (k: (typeof numbers)[number]) => d[k] as number;
  return {
    id: r.id,
    volume: n("volume"),
    start: n("start"),
    highest: n("highest"),
    t: n("t"),
    cold: n("cold"),
    hot: n("hot"),
    covered: d.covered,
    stirring: d.stirring,
    pouredAfter: n("pouredAfter"),
    coldAngle: n("coldAngle"),
    hotAngle: n("hotAngle"),
    thermometerAngle: n("thermometerAngle"),
  };
}

export interface MixturesProcedureContext {
  readings: readonly MixturesReading[];
}

/** The run a reading came from, as a bench, to put back through the heat model. */
const benchOf = (r: MixturesReading): MixturesBench => ({
  cold: r.cold,
  hot: r.hot,
  coldAngle: r.coldAngle,
  hotAngle: r.hotAngle,
  covered: r.covered,
  stirring: r.stirring,
  pouredAfter: r.pouredAfter,
});

/** The highest the thermometer shows for a run, °C. */
const peakOf = (b: MixturesBench) => mixturesPeak(b).temperature;

/** How much lower the peak is than with one thing done right, °C, to 0.1 °C. */
const cost = (r: MixturesReading, fixed: Partial<MixturesBench>) =>
  Number((peakOf({ ...benchOf(r), ...fixed }) - peakOf(benchOf(r))).toFixed(1));

/** The thermometer read before it stopped rising: it was still more than a division below its peak. */
export const readBeforePeak: Rule<MixturesProcedureContext> = {
  id: "mixtures-read-before-peak",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const early = readings
      .map((r) => {
        const b = benchOf(r);
        const peak = mixturesPeak(b);
        return { r, peak, short: peak.temperature - thermometerTruth(b, r.t) };
      })
      .filter(({ r, peak, short }) => r.t < peak.at && short > MIXTURES_THERMOMETER.resolution);
    if (!early.length) return [];
    const worst = early.reduce((a, e) => (e.short > a.short ? e : a));
    return [
      {
        rule: "mixtures-read-before-peak",
        severity: "error",
        skill: "measurement",
        key: "findings.mixtures.readBeforePeak",
        params: {
          count: early.length,
          seconds: Math.round(worst.r.t),
          peakSeconds: Math.round(worst.peak.at),
          celsius: Number(worst.short.toFixed(1)),
        },
        rows: early.map((e) => e.r.id),
      },
    ];
  },
};

/** Not stirring: the hot water stays near the top, and the water by the bulb warms slowly. */
export const notStirred: Rule<MixturesProcedureContext> = {
  id: "mixtures-not-stirred",
  skill: "apparatus",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => !r.stirring);
    if (!off.length) return [];
    return [
      {
        rule: "mixtures-not-stirred",
        severity: "error",
        skill: "apparatus",
        key: "findings.mixtures.notStirred",
        params: {
          count: off.length,
          celsius: Math.max(...off.map((r) => cost(r, { stirring: true }))),
        },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** The lid off the calorimeter, so it loses heat to the room eight times as fast. */
export const notCovered: Rule<MixturesProcedureContext> = {
  id: "mixtures-not-covered",
  skill: "apparatus",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => !r.covered);
    if (!off.length) return [];
    return [
      {
        rule: "mixtures-not-covered",
        severity: "warning",
        skill: "apparatus",
        key: "findings.mixtures.notCovered",
        params: {
          count: off.length,
          celsius: Math.max(...off.map((r) => cost(r, { covered: true }))),
        },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** The hot water left standing in the beaker before it was poured, so it went in cooler than 65 °C. */
export const slowPour: Rule<MixturesProcedureContext> = {
  id: "mixtures-slow-pour",
  skill: "apparatus",
  check: ({ readings }): Finding[] => {
    const off = readings.filter((r) => r.pouredAfter > methodOfMixtures.pourWithin);
    if (!off.length) return [];
    const worst = off.reduce((a, r) => (r.pouredAfter > a.pouredAfter ? r : a));
    return [
      {
        rule: "mixtures-slow-pour",
        severity: "warning",
        skill: "apparatus",
        key: "findings.mixtures.slowPour",
        params: {
          count: off.length,
          seconds: Math.round(worst.pouredAfter),
          hot: Number(hotAtPour(worst.pouredAfter).toFixed(1)),
          celsius: cost(worst, { pouredAfter: 0 }),
        },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** The thermometer read at an angle: the mercury sits behind the scale, so the reading shifts. */
export const thermometerAtAngle: Rule<MixturesProcedureContext> = {
  id: "mixtures-thermometer-at-angle",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const off = readings.filter(
      (r) => Math.abs(r.thermometerAngle) > methodOfMixtures.angleLimitDeg,
    );
    if (!off.length) return [];
    const angle = Math.max(...off.map((r) => Math.abs(r.thermometerAngle)));
    return [
      {
        rule: "mixtures-thermometer-at-angle",
        severity: "warning",
        skill: "measurement",
        key: "findings.mixtures.thermometerAtAngle",
        params: {
          angle: Math.round(angle),
          celsius: Number(parallaxShift(MIXTURES_THERMOMETER.pointerHeight ?? 0, angle).toFixed(1)),
        },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/** The measuring cylinder read at an angle, so the water measured is not what was written down. */
export const cylinderAtAngle: Rule<MixturesProcedureContext> = {
  id: "mixtures-cylinder-at-angle",
  skill: "measurement",
  check: ({ readings }): Finding[] => {
    const limit = methodOfMixtures.angleLimitDeg;
    const off = readings.filter(
      (r) => Math.abs(r.coldAngle) > limit || Math.abs(r.hotAngle) > limit,
    );
    if (!off.length) return [];
    const angle = Math.max(...off.flatMap((r) => [Math.abs(r.coldAngle), Math.abs(r.hotAngle)]));
    return [
      {
        rule: "mixtures-cylinder-at-angle",
        severity: "warning",
        skill: "measurement",
        key: "findings.mixtures.cylinderAtAngle",
        params: {
          angle: Math.round(angle),
          cm3: Number(parallaxShift(MEASURING_CYLINDER.pointerHeight ?? 0, angle).toFixed(1)),
        },
        rows: off.map((r) => r.id),
      },
    ];
  },
};

/**
 * The mistakes in how the readings were taken (brief, "The mistakes"; reading at an angle covers
 * both scales). Plotting V against T, the sixth, is checked with the graph, as for the lens.
 */
export const MIXTURES_PROCEDURE_RULES: Rule<MixturesProcedureContext>[] = [
  readBeforePeak,
  notStirred,
  notCovered,
  slowPour,
  thermometerAtAngle,
  cylinderAtAngle,
];
