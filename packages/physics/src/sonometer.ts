/**
 * The vibrating string on a sonometer.
 *
 * Masses are in kilograms, lengths in metres, times in seconds, frequencies in hertz, tensions in
 * newtons and g in m s⁻². Every function is pure and deterministic. An input outside the
 * physical range gives `undefined` (no result), never NaN or a number that looks valid.
 *
 * A wire of mass per unit length μ is stretched over a fixed bridge and a movable bridge a
 * length l apart, and over a pulley to a hanging load M.
 *
 *   Tension            T  = M g (1 − pulley loss)
 *   Wave speed         v  = √(T / μ)
 *   Harmonic n         fₙ = n v / 2l,   λₙ = 2l / n
 *   Mode shape         yₙ(x, t) = A sin(nπx / l) cos(2π fₙ t)
 *
 * A tuning fork pressed on the box (or a signal) drives the wire at frequency f. Each mode
 * responds as a damped driven oscillator with quality factor Q, so its steady amplitude,
 * relative to the static response, is 1 / |1 − r² + i r / Q| with r = f / fₙ. A paper rider at
 * fraction s along the wire feels mode n in proportion to |sin(nπs)|, and is thrown when that
 * motion passes a threshold: resonance is a narrow band of lengths, not a point.
 *
 * Reviewed and rewritten from Physics Bench's stretched-wire model. Two changes: the response
 * ratio is r = f / fₙ (drive over natural), the standard form, rather than fₙ / f; and the
 * random world (wire, fork tolerances) is left to the simulation, so this file holds no
 * random numbers.
 */

/** Standard gravity, m s⁻², the default for g. */
export const STANDARD_GRAVITY = 9.80665;

/** A wire a school sonometer is strung with. */
export interface SonometerWire {
  readonly id: string;
  /** Sentence-case name, for example "Steel, 30 SWG". */
  readonly name: string;
  /** Standard wire gauge. */
  readonly swg: number;
  /** Diameter, in metres. */
  readonly diameter: number;
  /** Density of the metal, in kg m⁻³. */
  readonly density: number;
}

/** Density of plain carbon steel (piano wire), kg m⁻³. */
export const STEEL_DENSITY = 7850;

/**
 * Steel wires from 28 to 32 SWG. Diameters are the British Standard wire gauge values
 * (BS 3737): 28 SWG = 0.0148 in, 29 = 0.0136 in, 30 = 0.0124 in, 31 = 0.0116 in, 32 = 0.0108 in.
 */
export const SONOMETER_WIRES: readonly SonometerWire[] = [
  {
    id: "steel-28",
    name: "Steel, 28 SWG",
    swg: 28,
    diameter: 0.0148 * 0.0254,
    density: STEEL_DENSITY,
  },
  {
    id: "steel-29",
    name: "Steel, 29 SWG",
    swg: 29,
    diameter: 0.0136 * 0.0254,
    density: STEEL_DENSITY,
  },
  {
    id: "steel-30",
    name: "Steel, 30 SWG",
    swg: 30,
    diameter: 0.0124 * 0.0254,
    density: STEEL_DENSITY,
  },
  {
    id: "steel-31",
    name: "Steel, 31 SWG",
    swg: 31,
    diameter: 0.0116 * 0.0254,
    density: STEEL_DENSITY,
  },
  {
    id: "steel-32",
    name: "Steel, 32 SWG",
    swg: 32,
    diameter: 0.0108 * 0.0254,
    density: STEEL_DENSITY,
  },
];

/** The wire with this id, or undefined. */
export function sonometerWireById(id: string): SonometerWire | undefined {
  return SONOMETER_WIRES.find((w) => w.id === id);
}

/** The frequencies stamped on a school set of tuning forks, Hz. */
export const TUNING_FORKS: readonly number[] = [256, 288, 320, 341.3, 384, 426.7, 480, 512];

const positive = (x: number): boolean => Number.isFinite(x) && x > 0;
const harmonic = (n: number): boolean => Number.isInteger(n) && n >= 1;
/** A result that overflowed or underflowed to nothing is no result. */
const result = (x: number): number | undefined => (positive(x) ? x : undefined);

/** Mass per unit length of a round wire: μ = ρ π d² / 4, in kg m⁻¹. */
export function linearDensity(diameter: number, density: number): number | undefined {
  if (!positive(diameter) || !positive(density)) return undefined;
  return result((density * Math.PI * diameter * diameter) / 4);
}

/** μ of one of the catalogued wires, kg m⁻¹. */
export function wireLinearDensity(wire: SonometerWire): number {
  return (wire.density * Math.PI * wire.diameter * wire.diameter) / 4;
}

/**
 * Tension from the hanging load: T = M g (1 − loss), in newtons. `pulleyLoss` is the fraction of
 * the load lost to friction in the pulley, from 0 up to (not including) 1.
 */
export function tensionFromLoad(
  mass: number,
  g: number = STANDARD_GRAVITY,
  pulleyLoss = 0,
): number | undefined {
  if (!positive(mass) || !positive(g)) return undefined;
  if (!Number.isFinite(pulleyLoss) || pulleyLoss < 0 || pulleyLoss >= 1) return undefined;
  return result(mass * g * (1 - pulleyLoss));
}

/** Speed of a transverse wave on the wire: v = √(T / μ), in m s⁻¹. */
export function waveSpeed(tension: number, mu: number): number | undefined {
  if (!positive(tension) || !positive(mu)) return undefined;
  return result(Math.sqrt(tension / mu));
}

/** Frequency of harmonic n on a vibrating length l: fₙ = n v / 2l, in Hz. */
export function harmonicFrequency(n: number, length: number, speed: number): number | undefined {
  if (!harmonic(n) || !positive(length) || !positive(speed)) return undefined;
  return result((n * speed) / (2 * length));
}

/** Wavelength of harmonic n on a vibrating length l: λₙ = 2l / n, in metres. */
export function harmonicWavelength(n: number, length: number): number | undefined {
  if (!harmonic(n) || !positive(length)) return undefined;
  return result((2 * length) / n);
}

/** The vibrating length at which harmonic n sounds at frequency f: l = n v / 2f, in metres. */
export function resonantLength(frequency: number, speed: number, n = 1): number | undefined {
  if (!positive(frequency) || !positive(speed) || !harmonic(n)) return undefined;
  return result((n * speed) / (2 * frequency));
}

/** Positions of the nodes of harmonic n, from 0 to l inclusive (n + 1 of them), in metres. */
export function nodePositions(n: number, length: number): number[] | undefined {
  if (!harmonic(n) || !positive(length)) return undefined;
  return Array.from({ length: n + 1 }, (_, k) => (k * length) / n);
}

/** Positions of the antinodes of harmonic n (n of them), in metres. */
export function antinodePositions(n: number, length: number): number[] | undefined {
  if (!harmonic(n) || !positive(length)) return undefined;
  return Array.from({ length: n }, (_, k) => ((k + 0.5) * length) / n);
}

/**
 * Displacement of the wire in its standing wave of harmonic n:
 * y(x, t) = A sin(nπx / l) cos(2π fₙ t), with fₙ = n v / 2l. Zero outside the bridges.
 */
export function modeDisplacement(
  n: number,
  x: number,
  t: number,
  length: number,
  speed: number,
  amplitude: number,
): number | undefined {
  const fn = harmonicFrequency(n, length, speed);
  if (fn === undefined || !Number.isFinite(x) || !Number.isFinite(t)) return undefined;
  if (!Number.isFinite(amplitude) || amplitude < 0) return undefined;
  if (x <= 0 || x >= length) return 0;
  return amplitude * Math.sin((n * Math.PI * x) / length) * Math.cos(2 * Math.PI * fn * t);
}

/**
 * Steady amplitude of a damped driven mode, relative to its static response:
 * 1 / √((1 − r²)² + (r / Q)²), with r = f / fₙ. The peak, at r = √(1 − 1/2Q²), is
 * Q / √(1 − 1/4Q²), close to Q for a sharp resonance.
 */
export function drivenResponse(drive: number, natural: number, q: number): number | undefined {
  if (!positive(drive) || !positive(natural) || !positive(q)) return undefined;
  const r = drive / natural;
  return 1 / Math.sqrt((1 - r * r) ** 2 + (r / q) ** 2);
}

/**
 * Phase by which the mode lags the drive, in radians from 0 to π: atan2(r / Q, 1 − r²).
 * A quarter turn (π / 2) exactly at resonance.
 */
export function drivenPhase(drive: number, natural: number, q: number): number | undefined {
  if (!positive(drive) || !positive(natural) || !positive(q)) return undefined;
  const r = drive / natural;
  return Math.atan2(r / q, 1 - r * r);
}

/** A sonometer driven at one frequency. */
export interface DrivenSonometer {
  /** Vibrating length between the bridges, m. */
  readonly length: number;
  /** Wave speed on the wire, m s⁻¹. */
  readonly speed: number;
  /** Driving frequency (the fork or the signal), Hz. */
  readonly frequency: number;
  /** Quality factor of each of the wire's modes. */
  readonly q: number;
  /** How many harmonics take part. Defaults to 4. */
  readonly modes?: number;
}

function validDriven(d: DrivenSonometer): boolean {
  const modes = d.modes ?? 4;
  return (
    positive(d.length) &&
    positive(d.speed) &&
    positive(d.frequency) &&
    positive(d.q) &&
    harmonic(modes) &&
    modes <= 64
  );
}

/**
 * Displacement of the driven wire at x and t, as the sum of its modes in steady state, each
 * shaped sin(nπx / l), scaled by its driven response, lagging by its phase, and driven equally
 * (a fork on the box shakes both bridges). `drive` is the drive strength, in metres of static
 * displacement per mode.
 */
export function drivenDisplacement(
  d: DrivenSonometer,
  x: number,
  t: number,
  drive: number,
): number | undefined {
  if (!validDriven(d) || !Number.isFinite(x) || !Number.isFinite(t)) return undefined;
  if (!Number.isFinite(drive) || drive < 0) return undefined;
  if (x <= 0 || x >= d.length) return 0;
  let y = 0;
  for (let n = 1; n <= (d.modes ?? 4); n++) {
    const fn = (n * d.speed) / (2 * d.length);
    const r = d.frequency / fn;
    const a = 1 / Math.sqrt((1 - r * r) ** 2 + (r / d.q) ** 2);
    const phi = Math.atan2(r / d.q, 1 - r * r);
    y += a * Math.sin((n * Math.PI * x) / d.length) * Math.cos(2 * Math.PI * d.frequency * t - phi);
  }
  return drive * y;
}

/**
 * Fraction of the peak response at which a paper rider is thrown: a fresh strike on a fork must
 * bring a centred rider within half of its peak motion.
 */
export const RIDER_THRESHOLD = 0.5;

/**
 * How hard the rider at fraction s along the wire is shaken, as a fraction of what throws it
 * (0 at rest, 1 or more and it jumps off). `strength` is the drive's amplitude from 0 to 1
 * (a fresh strike on the rubber pad is 1). The rider feels the strongest mode:
 * max over n of response(f, fₙ, Q) · |sin(nπs)|, divided by RIDER_THRESHOLD · Q.
 */
export function riderExcitation(
  d: DrivenSonometer,
  riderAt: number,
  strength = 1,
): number | undefined {
  if (!validDriven(d)) return undefined;
  if (!Number.isFinite(riderAt) || riderAt < 0 || riderAt > 1) return undefined;
  if (!Number.isFinite(strength) || strength < 0) return undefined;
  let best = 0;
  for (let n = 1; n <= (d.modes ?? 4); n++) {
    const fn = (n * d.speed) / (2 * d.length);
    const r = d.frequency / fn;
    const response = 1 / Math.sqrt((1 - r * r) ** 2 + (r / d.q) ** 2);
    best = Math.max(best, response * Math.abs(Math.sin(n * Math.PI * riderAt)));
  }
  return (strength * best) / (RIDER_THRESHOLD * d.q);
}

/** Whether the rider is thrown off. */
export function riderThrown(
  d: DrivenSonometer,
  riderAt: number,
  strength = 1,
): boolean | undefined {
  const e = riderExcitation(d, riderAt, strength);
  return e === undefined ? undefined : e >= 1;
}

/**
 * The band of vibrating lengths, [shortest, longest] in metres, over which harmonic n throws a
 * rider at its antinode, for a drive of the given strength. Solved exactly: the response
 * reaches RIDER_THRESHOLD · Q / strength where u = r² satisfies
 * u² − (2 − 1/Q²) u + 1 − 1/R² = 0, and l = n v √u / 2f. Undefined when the drive is too weak to
 * throw the rider at any length.
 */
export function resonanceBand(
  frequency: number,
  speed: number,
  q: number,
  strength = 1,
  n = 1,
): [number, number] | undefined {
  if (!positive(frequency) || !positive(speed) || !positive(q) || !harmonic(n)) return undefined;
  if (!positive(strength)) return undefined;
  const need = (RIDER_THRESHOLD * q) / strength;
  const b = 2 - 1 / (q * q);
  const disc = b * b - 4 * (1 - 1 / (need * need));
  if (disc < 0) return undefined;
  const root = Math.sqrt(disc);
  const uLo = (b - root) / 2;
  const uHi = (b + root) / 2;
  if (!(uHi > 0)) return undefined;
  // r = f / fₙ = 2lf / nv, so l = n v r / 2f. r rises with l.
  const toLength = (u: number) => (n * speed * Math.sqrt(Math.max(u, 0))) / (2 * frequency);
  return [toLength(uLo), toLength(uHi)];
}

/**
 * Amplitude of a tuning fork t seconds after a strike, from 1, decaying with time constant τ.
 * Struck on the bench instead of the rubber pad it starts at 0.85 and dies faster (0.6 τ).
 */
export function forkAmplitude(t: number, tau: number, onPad = true): number | undefined {
  if (!Number.isFinite(t) || !positive(tau)) return undefined;
  if (t < 0) return 0;
  return onPad ? Math.exp(-t / tau) : 0.85 * Math.exp(-t / (0.6 * tau));
}

/** One sonometer set-up: a wire, a load, a vibrating length and the harmonic shown. */
export interface SonometerSetup {
  /** Mass per unit length of the wire, kg m⁻¹. */
  readonly mu: number;
  /** Hanging load, hanger included, kg. */
  readonly load: number;
  /** Vibrating length between the bridges, m. */
  readonly length: number;
  /** g, m s⁻². Defaults to standard gravity. */
  readonly g?: number;
  /** Fraction of the load lost in the pulley. Defaults to 0. */
  readonly pulleyLoss?: number;
  /** Harmonic number. Defaults to 1. */
  readonly harmonic?: number;
}

/** Every readout of a set-up: T, v, fₙ and λₙ. */
export interface SonometerReadout {
  readonly tension: number;
  readonly speed: number;
  readonly frequency: number;
  readonly wavelength: number;
}

/** T, v, fₙ and λₙ for a set-up, or undefined if any input is outside the physical range. */
export function sonometer(s: SonometerSetup): SonometerReadout | undefined {
  const n = s.harmonic ?? 1;
  const tension = tensionFromLoad(s.load, s.g ?? STANDARD_GRAVITY, s.pulleyLoss ?? 0);
  if (tension === undefined) return undefined;
  const speed = waveSpeed(tension, s.mu);
  if (speed === undefined) return undefined;
  const frequency = harmonicFrequency(n, s.length, speed);
  const wavelength = harmonicWavelength(n, s.length);
  if (frequency === undefined || wavelength === undefined) return undefined;
  return { tension, speed, frequency, wavelength };
}
