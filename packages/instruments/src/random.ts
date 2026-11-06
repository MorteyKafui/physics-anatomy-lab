/**
 * Seeded randomness for the hidden world. The same seed always builds the same apparatus, so a
 * whole class can share identical apparatus and a teacher can reproduce any attempt from the
 * seed printed on its report. Harvested from Physics Bench (docs/planning/harvest-review.md).
 */

/** A source of floats in [0, 1). */
export type Rng = () => number;

/** mulberry32: small, fast and good enough for physical tolerances. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A normally distributed value (Box–Muller). */
export function gaussian(rng: Rng, mean = 0, sd = 1): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * A manufactured value within ±tolerance (a fraction) of nominal: normally distributed with
 * 3σ = tolerance, and clipped at 3σ so a part is never out of its stated tolerance.
 */
export function withTolerance(rng: Rng, nominal: number, tolerance: number): number {
  const z = Math.max(-3, Math.min(3, gaussian(rng)));
  return nominal * (1 + (z * tolerance) / 3);
}

/** A value spread evenly between min and max. */
export function uniform(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** A fresh seed for a new attempt: 9 digits, easy to read aloud and type. */
export function newSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return 100_000_000 + (buf[0]! % 900_000_000);
}

/**
 * An independent stream for one named part of the world ("bob", "stopwatch", "room"), so adding
 * a part never changes the values of the others.
 */
export function substream(seed: number, name: string): Rng {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return createRng(h >>> 0);
}
