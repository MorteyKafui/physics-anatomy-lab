import { type Body, WATER_SPECIFIC_HEAT_CAPACITY } from "./mixtures";

/**
 * A lumped heat model of the method of mixtures (Experiment 62; brief decisions 1 to 5): hot water
 * poured into a calorimeter of cold water, read by a thermometer. Experiment 64 (decisions 6 to 10)
 * is the same model with a hot solid in place of the hot water, and the film of boiling water it
 * carries in with it as part of the hot side: the hot side may be several bodies at one
 * temperature, as the cold side is.
 *
 * Three temperatures from the moment of pouring, t = 0:
 *
 * - the poured water, θ_h, heat capacity C_h;
 * - the cold water with the calorimeter and stirrer, θ_c, heat capacity C_c, which share one
 *   temperature (the copper is thin and the stirrer keeps it wet);
 * - the thermometer's reading, θ_m, which follows the water around its bulb (the cold water's)
 *   with a first-order lag τ.
 *
 * The poured water and the water already there mix with a time τ_mix (seconds when stirred,
 * minutes when not): the heat flowing between them is G (θ_h − θ_c), with G chosen so that their
 * difference alone decays with τ_mix, G = C_h C_c ⁄ ((C_h + C_c) τ_mix). Each part loses heat to
 * the room at θ₀ by Newton's law, k C (θ − θ₀), so the mixture's mean temperature cools exactly as
 * Newton's law says, with the one constant k.
 *
 *   C_h dθ_h/dt = −G (θ_h − θ_c) − k C_h (θ_h − θ₀)
 *   C_c dθ_c/dt = +G (θ_h − θ_c) − k C_c (θ_c − θ₀)
 *   τ dθ_m/dt  = θ_c − θ_m
 *
 * The system is linear with constant coefficients, so it is solved here in closed form: the mean
 * decays as e^(−k t), the difference as e^(−(k + 1/τ_mix) t), and the thermometer is the lagged sum
 * of the two. The peak the thermometer shows is where it stops rising, θ_m = θ_c, found by
 * bisection. Cross-checked against SciPy's numerical integration of the same equations, written
 * as heat flows, in validation/pa_validation/calorimetry.py.
 *
 * Temperatures in °C, times in s, heat capacities in J K⁻¹, k in s⁻¹.
 */

export interface Calorimeter {
  /**
   * The hot side as it goes in, at one temperature: the water poured in (Experiment 62), or the
   * hot solid with any boiling water it carries (Experiment 64).
   */
  hot: Body | readonly Body[];
  /** The cold water and the calorimeter with its stirrer, all at one temperature. */
  cold: readonly Body[];
  /** The room's temperature, °C. */
  room: number;
  /** Newton's cooling constant k, s⁻¹: the fraction of the excess over the room lost each second. */
  loss: number;
  /** The mixing time τ_mix, s. */
  mixing: number;
  /** The thermometer's lag τ, s; 0 for a thermometer that reads the water at once. */
  lag: number;
}

export interface CalorimeterState {
  /** The poured water, °C. */
  hot: number;
  /** The cold water and calorimeter, °C. */
  cold: number;
  /** The heat-capacity-weighted mean of the two, °C. */
  mean: number;
  /** What the thermometer reads, °C. */
  thermometer: number;
}

interface Solved {
  room: number;
  /** Fractions of the total heat capacity in the hot and cold parts. */
  wh: number;
  wc: number;
  /** The mean's and the difference's excess at t = 0, and their decay rates. */
  mean0: number;
  diff0: number;
  k: number;
  b: number;
  /** The thermometer's excess over the room at t = 0, and its lag. */
  meter0: number;
  lag: number;
}

function check(c: Calorimeter): Solved {
  const positive = (v: number) => v > 0 && Number.isFinite(v);
  const capacity = (b: Body, name: string) => {
    if (!positive(b.mass)) throw new RangeError(`${name}: mass must be positive, got ${b.mass}`);
    if (!positive(b.specificHeatCapacity)) {
      throw new RangeError(
        `${name}: specific heat capacity must be positive, got ${b.specificHeatCapacity}`,
      );
    }
    if (!Number.isFinite(b.temperature) || b.temperature <= -273.15) {
      throw new RangeError(`${name}: temperature must be above −273.15 °C, got ${b.temperature}`);
    }
    return b.mass * b.specificHeatCapacity;
  };
  if (c.cold.length === 0) throw new RangeError("the calorimeter needs its cold water");
  const hots: readonly Body[] = Array.isArray(c.hot) ? c.hot : [c.hot as Body];
  if (hots.length === 0) throw new RangeError("the calorimeter needs something hot put in it");
  const hotT = hots[0]!.temperature;
  let ch = 0;
  hots.forEach((b, i) => {
    ch += capacity(b, `hot body ${i + 1}`);
    if (b.temperature !== hotT) {
      throw new RangeError("the hot side must go in at one temperature");
    }
  });
  const start = c.cold[0]!.temperature;
  let cc = 0;
  c.cold.forEach((b, i) => {
    cc += capacity(b, `cold body ${i + 1}`);
    if (b.temperature !== start) {
      throw new RangeError("the cold water and the calorimeter must start at one temperature");
    }
  });
  if (!Number.isFinite(c.room)) throw new RangeError(`room must be a temperature, got ${c.room}`);
  if (!(c.loss >= 0) || !Number.isFinite(c.loss)) {
    throw new RangeError(`loss must be zero or more, got ${c.loss}`);
  }
  if (!positive(c.mixing)) throw new RangeError(`mixing must be positive, got ${c.mixing}`);
  if (!(c.lag >= 0) || !Number.isFinite(c.lag)) {
    throw new RangeError(`lag must be zero or more, got ${c.lag}`);
  }
  const total = ch + cc;
  return {
    room: c.room,
    wh: ch / total,
    wc: cc / total,
    mean0: (ch * (hotT - c.room) + cc * (start - c.room)) / total,
    diff0: hotT - start,
    k: c.loss,
    b: c.loss + 1 / c.mixing,
    meter0: start - c.room,
    lag: c.lag,
  };
}

/**
 * The thermometer's response to a water temperature e^(−s t) from rest:
 * (e^(−s t) − e^(−t/τ)) ⁄ (1 − s τ), which tends to (t/τ) e^(−t/τ) as s τ → 1.
 */
function lagged(s: number, lag: number, t: number): number {
  const d = 1 - s * lag;
  if (Math.abs(d) > 1e-3) return (Math.exp(-s * t) - Math.exp(-t / lag)) / d;
  // Near s τ = 1 the difference cancels: write it as e^(−t/τ) (e^(ε t) − 1) ⁄ (ε τ), ε = 1/τ − s.
  const eps = d / lag;
  const x = eps * t;
  const ratio = Math.abs(x) < 1e-8 ? 1 + x / 2 : Math.expm1(x) / x;
  return Math.exp(-t / lag) * (t / lag) * ratio;
}

function at(s: Solved, t: number): CalorimeterState {
  const mean = s.mean0 * Math.exp(-s.k * t);
  const diff = s.diff0 * Math.exp(-s.b * t);
  const cold = mean - s.wh * diff;
  const meter =
    s.lag === 0
      ? cold
      : s.meter0 * Math.exp(-t / s.lag) +
        s.mean0 * lagged(s.k, s.lag, t) -
        s.wh * s.diff0 * lagged(s.b, s.lag, t);
  return {
    hot: s.room + mean + s.wc * diff,
    cold: s.room + cold,
    mean: s.room + mean,
    thermometer: s.room + meter,
  };
}

/** The temperatures t seconds after the hot water is poured in. */
export function calorimeterAt(c: Calorimeter, t: number): CalorimeterState {
  if (!(t >= 0) || !Number.isFinite(t)) throw new RangeError(`t must be zero or more, got ${t}`);
  return at(check(c), t);
}

/** How fast the thermometer's reading is rising, °C s⁻¹ (the cold water's, with no lag). */
function rising(s: Solved, t: number): number {
  if (s.lag > 0) {
    const now = at(s, t);
    return (now.cold - now.thermometer) / s.lag;
  }
  return -s.k * s.mean0 * Math.exp(-s.k * t) + s.b * s.wh * s.diff0 * Math.exp(-s.b * t);
}

/**
 * The highest the thermometer reads, and when: where it stops rising. Null when it never does:
 * no heat lost to the room, so it creeps up to the ideal mixture for ever, or the poured water is
 * not the hotter, or not within a day.
 */
export function thermometerPeak(c: Calorimeter): { at: number; temperature: number } | null {
  const s = check(c);
  // With no loss the reading creeps up to the ideal mixture for ever; past a few minutes the gap
  // between the water and the thermometer is below rounding, and a search would find only noise.
  if (!(s.diff0 > 0) || s.k === 0) return null;
  // March out geometrically from a moment far shorter than either time until it is falling.
  let lo = 1e-6 * Math.min(c.mixing, c.lag > 0 ? c.lag : c.mixing);
  if (rising(s, lo) <= 0) return { at: 0, temperature: at(s, 0).thermometer };
  let hi = lo;
  while (rising(s, hi) > 0) {
    lo = hi;
    hi *= 1.1;
    if (hi > 86_400) return null;
  }
  for (let i = 0; i < 200 && hi - lo > 1e-13 * hi; i++) {
    const mid = (lo + hi) / 2;
    if (rising(s, mid) > 0) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return { at: t, temperature: at(s, t).thermometer };
}

/** A body cooling (or warming) towards the room by Newton's law, with constant k, s⁻¹, for t s. */
export function newtonCooling(temperature: number, room: number, k: number, t: number): number {
  if (!(k >= 0) || !(t >= 0)) throw new RangeError("k and t must be zero or more");
  return room + (temperature - room) * Math.exp(-k * t);
}

/** A body's water equivalent: the mass of water with the same heat capacity, kg. */
export function waterEquivalent(b: Body): number {
  return (b.mass * b.specificHeatCapacity) / WATER_SPECIFIC_HEAT_CAPACITY;
}
