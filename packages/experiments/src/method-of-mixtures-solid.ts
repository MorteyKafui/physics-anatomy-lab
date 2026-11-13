import type { Finding, Rule } from "@pa/analysis";
import type { Attempt, Json, LabEvent, NewEvent, Projection } from "@pa/engine";
import {
  BALANCE,
  parallaxShift,
  quantise,
  substream,
  takeReading,
  type Reading,
  type Rng,
} from "@pa/instruments";
import {
  type Body,
  type Calorimeter,
  calorimeterAt,
  newtonCooling,
  specificHeatCapacityFromMixture,
  thermometerPeak,
  WATER_SPECIFIC_HEAT_CAPACITY,
} from "@pa/physics";

import { methodOfMixtures, MIXTURES_THERMOMETER } from "./method-of-mixtures";

/**
 * The method of mixtures with a hot solid (Experiment 64), as approved in
 * docs/content/method-of-mixtures-brief.md (decisions 6 to 10): a 100 g solid heated in boiling
 * water and moved into about 50 g of water in Experiment 62's lagged copper calorimeter, read every
 * minute until steady; its specific heat capacity from the heat it gives up. Each attempt's solid
 * is one of four metals, named only when the student has found c (decision 7). Every temperature
 * comes from the heat model in packages/physics (AGENTS.md rule 1). Masses in g as the balance
 * shows them, temperatures in °C, times in s.
 */
export const hotSolid = {
  id: "method-of-mixtures-solid",
  version: 1,
  topic: "heat",
  /** The metals an attempt's solid may be, with their specific heat capacities, J kg⁻¹ K⁻¹. */
  metals: [
    { id: "copper", c: 390 },
    { id: "brass", c: 380 },
    { id: "iron", c: 450 },
    { id: "aluminium", c: 900 },
  ],
  /** The solid's mass, g; the water the calorimeter is filled with, about half full, g. */
  solidMass: 100,
  water: 50,
  /** The boiling water the solid is heated in, °C. */
  boiling: 100,
  /** The specific heat capacities the question gives, J kg⁻¹ K⁻¹ (decision 6). */
  given: { calorimeter: 390, water: WATER_SPECIFIC_HEAT_CAPACITY },
  /**
   * The solid sharing its heat with the water, s, stirred and not; and its Newton's cooling
   * constant in the air between the beaker and the calorimeter, s⁻¹ (decision 8).
   */
  sharing: { stirred: 10, unstirred: 120 },
  air: 0.05 / 60,
  /** Moving the solid across in more than this is a slow transfer, s (assumed). */
  transferWithin: 10,
  /** The boiling water a solid carries in if it is not shaken first, and the water splashed out
   * if it is dropped in, not lowered, g (decision 10). */
  film: 1,
  splash: 3,
  /** Reading the thermometer more than this far off square-on is reading it at an angle, degrees. */
  angleLimitDeg: 5,
} as const;

export type Metal = (typeof hotSolid.metals)[number];

/** The apparatus of one attempt, built from its seed: which metal the solid is. */
export interface SolidWorld {
  metal: Metal;
}

/** The same seed always gives the same metal. */
export function solidWorld(seed: number): SolidWorld {
  const rng = substream(seed, "method-of-mixtures-solid.metal");
  const i = Math.min(hotSolid.metals.length - 1, Math.floor(rng() * hotSolid.metals.length));
  return { metal: hotSolid.metals[i]! };
}

/** What the student weighs on the balance: the solid, the calorimeter empty, and with water. */
export type Weighing = "solid" | "empty" | "filled";
export const WEIGHINGS: readonly Weighing[] = ["solid", "empty", "filled"];

/** How the solid was moved across: how long in the air, s; shaken first; lowered in gently. */
export interface Transfer {
  after: number;
  shaken: boolean;
  gently: boolean;
}

/** What is on the bench, rebuilt from the attempt's events. */
export interface SolidBench {
  world: SolidWorld;
  /** The water in the calorimeter, g; null until filled. */
  water: number | null;
  /** What the balance showed for each weighing, g. */
  weighed: Partial<Record<Weighing, number>>;
  covered: boolean;
  stirring: boolean;
  /** How the solid went in; null until it has. */
  transfer: Transfer | null;
}

export function initialSolidBench(attempt: Attempt): SolidBench {
  return {
    world: solidWorld(attempt.seed),
    water: null,
    weighed: {},
    covered: false,
    stirring: false,
    transfer: null,
  };
}

/** The true mass on the balance for a weighing, g. */
function onTheBalance(b: SolidBench, what: Weighing): number | undefined {
  const calorimeter = methodOfMixtures.calorimeter.mass * 1000;
  if (what === "solid") return hotSolid.solidMass;
  if (what === "empty") return b.water === null ? calorimeter : undefined;
  return b.water === null ? undefined : calorimeter + b.water;
}

/** The balance as the student reads it: its display, to 0.1 g. */
export function readBalance(grams: number, rng: Rng): Reading {
  return takeReading(BALANCE, grams, { rng });
}

/** The solid's temperature as it goes in: it cools in the air on the way across, °C. */
export function solidAtEntry(after: number): number {
  return newtonCooling(hotSolid.boiling, methodOfMixtures.room, hotSolid.air, after);
}

/** The heat model's calorimeter for this bench once the solid is in. */
export function solidCalorimeter(
  world: SolidWorld,
  bench: Pick<SolidBench, "water" | "covered" | "stirring">,
  transfer: Transfer,
): Calorimeter {
  const M = methodOfMixtures;
  if (bench.water === null) throw new RangeError("fill the calorimeter first");
  const t = solidAtEntry(transfer.after);
  const hot: Body[] = [
    { mass: hotSolid.solidMass / 1000, specificHeatCapacity: world.metal.c, temperature: t },
  ];
  if (!transfer.shaken)
    hot.push({
      mass: hotSolid.film / 1000,
      specificHeatCapacity: WATER_SPECIFIC_HEAT_CAPACITY,
      temperature: t,
    });
  const water = bench.water - (transfer.gently ? 0 : hotSolid.splash);
  return {
    hot,
    cold: [
      {
        mass: water / 1000,
        specificHeatCapacity: WATER_SPECIFIC_HEAT_CAPACITY,
        temperature: M.room,
      },
      { ...M.calorimeter, temperature: M.room },
    ],
    room: M.room,
    loss: bench.covered ? M.loss.covered : M.loss.uncovered,
    mixing: bench.stirring ? hotSolid.sharing.stirred : hotSolid.sharing.unstirred,
    lag: M.lag,
  };
}

/** What the thermometer truly shows t s after the solid goes in; before it, the water's. */
export function solidThermometer(bench: SolidBench, t: number): number {
  if (bench.transfer === null) return methodOfMixtures.room;
  return calorimeterAt(solidCalorimeter(bench.world, bench, bench.transfer), t).thermometer;
}

/** The highest the thermometer reads after the solid goes in, and when, s after. */
export function solidPeak(bench: SolidBench): { at: number; temperature: number } {
  if (bench.transfer === null) throw new RangeError("put the solid in first");
  const peak = thermometerPeak(solidCalorimeter(bench.world, bench, bench.transfer));
  if (!peak) throw new RangeError("the thermometer never stops rising");
  return peak;
}

/** The careful run: filled, lid on, stirred, the solid shaken, lowered in gently, at once. */
export function correctSolidBench(world: SolidWorld): SolidBench {
  return {
    world,
    water: hotSolid.water,
    weighed: {},
    covered: true,
    stirring: true,
    transfer: { after: 0, shaken: true, gently: true },
  };
}

// The bench as the student works it, from the attempt's events.

export type SolidCommand =
  | { type: "fill"; to: number }
  | { type: "weigh"; what: Weighing }
  | { type: "cover"; on: boolean }
  | { type: "stir"; on: boolean }
  | { type: "transfer"; after: number; shaken: boolean; gently: boolean }
  | { type: "empty" };

/** Why the bench refused: a message key under experiments.method-of-mixtures-solid.refused. */
export type SolidRefusal = "already-in" | "fill-first" | "not-on-the-balance" | "not-a-number";

export type SolidDecision = { ok: true; events: NewEvent[] } | { ok: false; reason: SolidRefusal };

/** Turn an action on the bench into events, or refuse it. Pure. */
export function decideSolid(b: SolidBench, command: SolidCommand): SolidDecision {
  const inside = b.transfer !== null;
  switch (command.type) {
    case "fill":
      if (inside) return { ok: false, reason: "already-in" };
      if (!Number.isFinite(command.to) || !(command.to > 0) || command.to > 150)
        return { ok: false, reason: "not-a-number" };
      return { ok: true, events: [{ kind: "calorimeter.fill", data: { to: command.to } }] };
    case "weigh":
      if (inside) return { ok: false, reason: "already-in" };
      if (onTheBalance(b, command.what) === undefined)
        return { ok: false, reason: "not-on-the-balance" };
      return { ok: true, events: [{ kind: "balance.weigh", data: { what: command.what } }] };
    case "cover":
      return inside
        ? { ok: false, reason: "already-in" }
        : { ok: true, events: [{ kind: "lid.set", data: { on: command.on } }] };
    case "stir":
      return inside
        ? { ok: false, reason: "already-in" }
        : { ok: true, events: [{ kind: "stirrer.set", data: { on: command.on } }] };
    case "transfer":
      if (inside) return { ok: false, reason: "already-in" };
      if (b.water === null) return { ok: false, reason: "fill-first" };
      if (!(command.after >= 0) || !Number.isFinite(command.after))
        return { ok: false, reason: "not-a-number" };
      return {
        ok: true,
        events: [
          {
            kind: "solid.transfer",
            data: { after: command.after, shaken: command.shaken, gently: command.gently },
          },
        ],
      };
    case "empty":
      return { ok: true, events: [{ kind: "calorimeter.empty", data: {} }] };
  }
}

const isWeighing = (v: unknown): v is Weighing =>
  typeof v === "string" && (WEIGHINGS as readonly string[]).includes(v);

function commandOf(e: LabEvent): SolidCommand | undefined {
  const d = (e.data ?? {}) as Record<string, unknown>;
  if (e.kind === "calorimeter.fill" && typeof d.to === "number") return { type: "fill", to: d.to };
  if (e.kind === "balance.weigh" && isWeighing(d.what)) return { type: "weigh", what: d.what };
  if (e.kind === "lid.set" && typeof d.on === "boolean") return { type: "cover", on: d.on };
  if (e.kind === "stirrer.set" && typeof d.on === "boolean") return { type: "stir", on: d.on };
  if (
    e.kind === "solid.transfer" &&
    typeof d.after === "number" &&
    typeof d.shaken === "boolean" &&
    typeof d.gently === "boolean"
  )
    return { type: "transfer", after: d.after, shaken: d.shaken, gently: d.gently };
  if (e.kind === "calorimeter.empty") return { type: "empty" };
  return undefined;
}

export const solidProjection: Projection<SolidBench> = {
  initial: initialSolidBench,
  apply(b, e) {
    const command = commandOf(e);
    if (!command || !decideSolid(b, command).ok) return b;
    switch (command.type) {
      case "fill":
        return { ...b, water: command.to };
      case "weigh": {
        // The balance has no noise: its display is the mass to 0.1 g.
        const shown = quantise(onTheBalance(b, command.what)!, BALANCE.resolution);
        return { ...b, weighed: { ...b.weighed, [command.what]: shown } };
      }
      case "cover":
        return { ...b, covered: command.on };
      case "stir":
        return { ...b, stirring: command.on };
      case "transfer":
        return {
          ...b,
          transfer: { after: command.after, shaken: command.shaken, gently: command.gently },
        };
      case "empty":
        // The lid and the stirrer stay as they were; the water and the solid come out. The
        // solid's own mass does not change, so it stays weighed.
        return {
          ...b,
          water: null,
          transfer: null,
          weighed: b.weighed.solid === undefined ? {} : { solid: b.weighed.solid },
        };
    }
  },
};

// Readings, c from them, and the mistakes.

/** One run the student recorded: the masses and temperatures as read, and how it truly went. */
export interface SolidReading {
  id: string;
  /**
   * As the student recorded them: g, g, g, °C, °C; when they read the highest, s after, and when
   * they took their last reading, s after (read every minute, the highest is the one before the
   * readings fall).
   */
  solid: number;
  empty: number;
  filled: number;
  start: number;
  highest: number;
  t: number;
  last: number;
  /** Every reading the student took, s after the solid went in and °C as read, the start first. */
  series: { t: number; reading: number }[];
  /** The metal's true specific heat capacity, J kg⁻¹ K⁻¹ (kept from the student until the end). */
  c: number;
  /** The water truly in the calorimeter, g, and how the run went. */
  water: number;
  covered: boolean;
  stirring: boolean;
  after: number;
  shaken: boolean;
  gently: boolean;
  thermometerAngle: number;
}

/**
 * What a reading records, worked out when the student takes it, so c and the mistakes can be
 * judged from the reading alone. Undefined until the solid is in and all three are weighed.
 */
export function solidReadingData(
  b: SolidBench,
  read: {
    start: number;
    highest: number;
    t: number;
    last?: number;
    series?: readonly { t: number; reading: number }[];
    thermometerAngle?: number;
  },
): Record<string, Json> | undefined {
  const { solid, empty, filled } = b.weighed;
  if (b.transfer === null || b.water === null) return undefined;
  if (solid === undefined || empty === undefined || filled === undefined) return undefined;
  return {
    solid,
    empty,
    filled,
    start: read.start,
    highest: read.highest,
    t: read.t,
    last: Math.max(read.t, read.last ?? read.t),
    series: (read.series ?? [{ t: read.t, reading: read.highest }]).map((p) => ({
      t: p.t,
      reading: p.reading,
    })),
    c: b.world.metal.c,
    water: b.water,
    covered: b.covered,
    stirring: b.stirring,
    after: b.transfer.after,
    shaken: b.transfer.shaken,
    gently: b.transfer.gently,
    thermometerAngle: read.thermometerAngle ?? 0,
  };
}

/** A recorded reading back from the attempt's events, or undefined if it is not one. */
export function asSolidReading(r: { id: string; data: Json }): SolidReading | undefined {
  const d = (r.data ?? {}) as Record<string, Json>;
  const numbers = [
    "solid",
    "empty",
    "filled",
    "start",
    "highest",
    "t",
    "last",
    "c",
    "water",
    "after",
    "thermometerAngle",
  ] as const;
  const flags = ["covered", "stirring", "shaken", "gently"] as const;
  if (numbers.some((k) => typeof d[k] !== "number")) return undefined;
  if (flags.some((k) => typeof d[k] !== "boolean")) return undefined;
  const n = (k: (typeof numbers)[number]) => d[k] as number;
  const f = (k: (typeof flags)[number]) => d[k] as boolean;
  return {
    id: r.id,
    solid: n("solid"),
    empty: n("empty"),
    filled: n("filled"),
    start: n("start"),
    highest: n("highest"),
    t: n("t"),
    last: n("last"),
    series: Array.isArray(d.series)
      ? d.series.flatMap((p) => {
          const q = (p ?? {}) as Record<string, Json>;
          return typeof q.t === "number" && typeof q.reading === "number"
            ? [{ t: q.t, reading: q.reading }]
            : [];
        })
      : [],
    c: n("c"),
    water: n("water"),
    covered: f("covered"),
    stirring: f("stirring"),
    after: n("after"),
    shaken: f("shaken"),
    gently: f("gently"),
    thermometerAngle: n("thermometerAngle"),
  };
}

/**
 * The solid's specific heat capacity from the student's own readings (the book's equation), with
 * the given c of the calorimeter and of water, and the boiling water's temperature, J kg⁻¹ K⁻¹.
 */
export function cFromReadings(
  r: Pick<SolidReading, "solid" | "empty" | "filled" | "start" | "highest">,
): number {
  return specificHeatCapacityFromMixture({
    solidMass: r.solid / 1000,
    solidTemperature: hotSolid.boiling,
    waterMass: (r.filled - r.empty) / 1000,
    calorimeterMass: r.empty / 1000,
    calorimeterSpecificHeatCapacity: hotSolid.given.calorimeter,
    initialTemperature: r.start,
    finalTemperature: r.highest,
    waterSpecificHeatCapacity: hotSolid.given.water,
  });
}

export interface SolidProcedureContext {
  readings: readonly SolidReading[];
}

/** The run a reading came from, as a bench, to put back through the heat model. */
const benchOf = (r: SolidReading): SolidBench => ({
  world: {
    metal: hotSolid.metals.find((m) => m.c === r.c) ?? { id: "copper", c: r.c },
  } as SolidWorld,
  water: r.water,
  weighed: {},
  covered: r.covered,
  stirring: r.stirring,
  transfer: { after: r.after, shaken: r.shaken, gently: r.gently },
});

/** c worked from a run read at its highest, with the masses weighed true. */
function cAtPeak(b: SolidBench): number {
  const highest = solidPeak(b).temperature;
  const calorimeter = methodOfMixtures.calorimeter.mass * 1000;
  return cFromReadings({
    solid: hotSolid.solidMass,
    empty: calorimeter,
    filled: calorimeter + (b.water ?? 0),
    start: methodOfMixtures.room,
    highest,
  });
}

/** How far c comes out with this one thing done as it was, against done right, %. */
const percentOff = (r: SolidReading, fixed: Partial<SolidBench> & { transfer?: Transfer }) => {
  const done = benchOf(r);
  const right = { ...done, ...fixed };
  return Number(((cAtPeak(done) / cAtPeak(right) - 1) * 100).toFixed(0));
};

const finding = (
  rule: string,
  severity: Finding["severity"],
  skill: Finding["skill"],
  key: string,
  params: Record<string, string | number>,
  rows: string[],
): Finding => ({ rule, severity, skill, key, params, rows });

/**
 * Stopping before the highest: the last reading was taken while the thermometer was still rising,
 * and more than a division below its highest. Read every minute as the book asks, the highest
 * reading can fall between two minutes; that is the method's own limit, not this mistake.
 */
export const solidReadBeforePeak: Rule<SolidProcedureContext> = {
  id: "solid-read-before-peak",
  skill: "measurement",
  check: ({ readings }) => {
    const early = readings
      .map((r) => {
        const b = benchOf(r);
        const peak = solidPeak(b);
        return { r, peak, short: peak.temperature - solidThermometer(b, r.t) };
      })
      .filter(({ r, peak, short }) => r.last < peak.at && short > MIXTURES_THERMOMETER.resolution);
    if (!early.length) return [];
    const worst = early.reduce((a, e) => (e.short > a.short ? e : a));
    return [
      finding(
        "solid-read-before-peak",
        "error",
        "measurement",
        "findings.mixturesSolid.readBeforePeak",
        {
          count: early.length,
          seconds: Math.round(worst.r.t),
          peakSeconds: Math.round(worst.peak.at),
          celsius: Number(worst.short.toFixed(1)),
        },
        early.map((e) => e.r.id),
      ),
    ];
  },
};

/** Too long in the air on the way across: the solid went in cooler than the boiling water. */
export const solidSlowTransfer: Rule<SolidProcedureContext> = {
  id: "solid-slow-transfer",
  skill: "apparatus",
  check: ({ readings }) => {
    const off = readings.filter((r) => r.after > hotSolid.transferWithin);
    if (!off.length) return [];
    const worst = off.reduce((a, r) => (r.after > a.after ? r : a));
    return [
      finding(
        "solid-slow-transfer",
        "warning",
        "apparatus",
        "findings.mixturesSolid.slowTransfer",
        {
          count: off.length,
          seconds: Math.round(worst.after),
          entry: Number(solidAtEntry(worst.after).toFixed(1)),
          percent: percentOff(worst, { transfer: { ...benchOf(worst).transfer!, after: 0 } }),
        },
        off.map((r) => r.id),
      ),
    ];
  },
};

/** Boiling water carried in on the solid: its heat went in too, so c comes out too large. */
export const solidWaterCarried: Rule<SolidProcedureContext> = {
  id: "solid-water-carried",
  skill: "apparatus",
  check: ({ readings }) => {
    const off = readings.filter((r) => !r.shaken);
    if (!off.length) return [];
    const r = off[0]!;
    return [
      finding(
        "solid-water-carried",
        "warning",
        "apparatus",
        "findings.mixturesSolid.waterCarried",
        {
          count: off.length,
          grams: hotSolid.film,
          percent: percentOff(r, { transfer: { ...benchOf(r).transfer!, shaken: true } }),
        },
        off.map((x) => x.id),
      ),
    ];
  },
};

/** The solid dropped in, so water splashed out: less water took the heat than was weighed. */
export const solidSplashed: Rule<SolidProcedureContext> = {
  id: "solid-splashed",
  skill: "apparatus",
  check: ({ readings }) => {
    const off = readings.filter((r) => !r.gently);
    if (!off.length) return [];
    const r = off[0]!;
    return [
      finding(
        "solid-splashed",
        "warning",
        "apparatus",
        "findings.mixturesSolid.splashed",
        {
          count: off.length,
          grams: hotSolid.splash,
          percent: percentOff(r, { transfer: { ...benchOf(r).transfer!, gently: true } }),
        },
        off.map((x) => x.id),
      ),
    ];
  },
};

/** Not stirring: the solid shares its heat slowly, and more goes to the room meanwhile. */
export const solidNotStirred: Rule<SolidProcedureContext> = {
  id: "solid-not-stirred",
  skill: "apparatus",
  check: ({ readings }) => {
    const off = readings.filter((r) => !r.stirring);
    if (!off.length) return [];
    const r = off[0]!;
    return [
      finding(
        "solid-not-stirred",
        "error",
        "apparatus",
        "findings.mixturesSolid.notStirred",
        {
          count: off.length,
          minutes: Math.round(solidPeak(benchOf(r)).at / 60),
          percent: percentOff(r, { stirring: true }),
        },
        off.map((x) => x.id),
      ),
    ];
  },
};

/** The lid off: the mixture loses heat to the room eight times as fast. */
export const solidNotCovered: Rule<SolidProcedureContext> = {
  id: "solid-not-covered",
  skill: "apparatus",
  check: ({ readings }) => {
    const off = readings.filter((r) => !r.covered);
    if (!off.length) return [];
    const r = off[0]!;
    return [
      finding(
        "solid-not-covered",
        "warning",
        "apparatus",
        "findings.mixturesSolid.notCovered",
        { count: off.length, percent: percentOff(r, { covered: true }) },
        off.map((x) => x.id),
      ),
    ];
  },
};

/** The thermometer read at an angle: the mercury sits behind the scale, so the reading shifts. */
export const solidThermometerAtAngle: Rule<SolidProcedureContext> = {
  id: "solid-thermometer-at-angle",
  skill: "measurement",
  check: ({ readings }) => {
    const off = readings.filter((r) => Math.abs(r.thermometerAngle) > hotSolid.angleLimitDeg);
    if (!off.length) return [];
    const angle = Math.max(...off.map((r) => Math.abs(r.thermometerAngle)));
    return [
      finding(
        "solid-thermometer-at-angle",
        "warning",
        "measurement",
        "findings.mixturesSolid.thermometerAtAngle",
        {
          angle: Math.round(angle),
          celsius: Number(parallaxShift(MIXTURES_THERMOMETER.pointerHeight ?? 0, angle).toFixed(1)),
        },
        off.map((r) => r.id),
      ),
    ];
  },
};

/** The seven approved mistakes (decision 10), each with its real effect in the model. */
export const SOLID_PROCEDURE_RULES: Rule<SolidProcedureContext>[] = [
  solidReadBeforePeak,
  solidSlowTransfer,
  solidWaterCarried,
  solidSplashed,
  solidNotStirred,
  solidNotCovered,
  solidThermometerAtAngle,
];
