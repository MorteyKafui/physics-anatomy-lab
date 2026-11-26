/**
 * The resonance tube: a glass tube closed at the bottom by water, with a struck tuning fork held
 * over its open mouth.
 *
 * Lengths are in metres, frequencies in hertz, times in seconds, temperatures in degrees Celsius.
 * Every function is pure. An input outside the physical range gives `undefined`, never NaN.
 *
 * The air column is a pipe closed at one end. The water surface is a displacement node (and a
 * pressure antinode); the displacement antinode sits a little above the open mouth, by the end
 * correction e ≈ 0.6 r for an unflanged tube of internal radius r. The column resonates when its
 * effective length is an odd number of quarter wavelengths:
 *
 *   L + e = (2n − 1) λ / 4,   λ = v / f,
 *
 * where L is read on the rule from the mouth down to the water surface. Its resonance is broad
 * (quality factor Q ≈ 25–35), so the loudest point is a judgement.
 */

/** Ratio of the principal heat capacities of dry air. */
export const AIR_GAMMA = 1.4;
/** Molar gas constant, J mol⁻¹ K⁻¹ (CODATA 2018, exact). */
export const GAS_CONSTANT = 8.314462618;
/** Molar mass of dry air, kg mol⁻¹. */
export const AIR_MOLAR_MASS = 0.0289647;
/** The end correction of an unflanged tube, as a fraction of its internal radius. */
export const END_CORRECTION_FACTOR = 0.6;
/** The school set of tuning forks, in hertz (the scale from middle C at 256 Hz). */
export const TUNING_FORKS = [256, 288, 320, 341.3, 384, 426.7, 480, 512] as const;
/** Highest overtone searched for the loudness, so a long column at a high fork still answers. */
const MAX_MODE = 40;

export interface ResonanceTube {
  /** Length of the glass tube, in metres (about 1 m in a school laboratory). */
  readonly length: number;
  /** Internal radius of the tube, in metres. */
  readonly radius: number;
  /** Temperature of the air in the tube, in °C. */
  readonly temperatureC: number;
  /** Quality factor of the air column's resonance. Defaults to 30. */
  readonly q?: number;
  /** End correction as a fraction of the radius. Defaults to 0.6. */
  readonly endCorrectionFactor?: number;
}

const positive = (x: number): boolean => Number.isFinite(x) && x > 0;

function valid(tube: ResonanceTube): boolean {
  const {
    length,
    radius,
    temperatureC,
    q = 30,
    endCorrectionFactor = END_CORRECTION_FACTOR,
  } = tube;
  return (
    positive(length) &&
    positive(radius) &&
    radius < length &&
    Number.isFinite(temperatureC) &&
    temperatureC > -273.15 &&
    Number.isFinite(q) &&
    q > 0.5 &&
    Number.isFinite(endCorrectionFactor) &&
    endCorrectionFactor >= 0
  );
}

/** The speed of sound in dry air at a temperature, from the ideal gas: v = √(γRT / M). */
export function speedOfSound(temperatureC: number): number | undefined {
  if (!Number.isFinite(temperatureC) || temperatureC <= -273.15) return undefined;
  return Math.sqrt((AIR_GAMMA * GAS_CONSTANT * (temperatureC + 273.15)) / AIR_MOLAR_MASS);
}

/** The end correction e of the tube, in metres. */
export function endCorrection(tube: ResonanceTube): number | undefined {
  if (!valid(tube)) return undefined;
  return (tube.endCorrectionFactor ?? END_CORRECTION_FACTOR) * tube.radius;
}

/** The wavelength of the fork's note in the tube's air, λ = v / f. */
export function wavelength(tube: ResonanceTube, frequency: number): number | undefined {
  if (!valid(tube) || !positive(frequency)) return undefined;
  return speedOfSound(tube.temperatureC)! / frequency;
}

/**
 * The air column length L (mouth to water) of the n-th resonance for a fork of frequency f:
 * L = (2n − 1) v / 4f − e. Undefined when n is not a whole number of at least 1, or when the
 * resonance would need the water above the mouth (L ≤ 0). It may be longer than the tube: use
 * `resonanceLengths` for the ones that can be found.
 */
export function resonanceLength(
  tube: ResonanceTube,
  frequency: number,
  n: number,
): number | undefined {
  if (!Number.isInteger(n) || n < 1) return undefined;
  const lambda = wavelength(tube, frequency);
  if (lambda === undefined) return undefined;
  const l = ((2 * n - 1) * lambda) / 4 - endCorrection(tube)!;
  return l > 0 ? l : undefined;
}

/** Every resonance length for the fork that fits in the tube, shortest first. */
export function resonanceLengths(tube: ResonanceTube, frequency: number): number[] {
  const out: number[] = [];
  for (let n = 1; n <= MAX_MODE; n++) {
    const l = resonanceLength(tube, frequency, n);
    if (l === undefined) {
      // L₁ can be undefined (water above the mouth) while L₂ is not; stop only past the tube.
      if (wavelength(tube, frequency) === undefined) return out;
      continue;
    }
    if (l > tube.length) return out;
    out.push(l);
  }
  return out;
}

/** The frequency of the column's n-th mode (n = 1 is the fundamental): f = (2n − 1) v / 4(L + e). */
export function columnFrequency(
  tube: ResonanceTube,
  airColumn: number,
  n: number,
): number | undefined {
  if (!valid(tube) || !Number.isInteger(n) || n < 1) return undefined;
  if (!positive(airColumn) || airColumn > tube.length) return undefined;
  const v = speedOfSound(tube.temperatureC)!;
  return ((2 * n - 1) * v) / (4 * (airColumn + endCorrection(tube)!));
}

/**
 * How loud the air column sounds with a fork of frequency f over it, relative to a fork exactly
 * at resonance: 0 is silent, 1 is the loudest. Each mode of the column answers like a driven,
 * damped oscillator, A = 1 / √((1 − r²)² + (r / Q)²) with r = f / fₙ, divided by Q so that a
 * fork exactly on a mode gives 1; the loudest mode is heard. (For Q ≈ 30 the true peak sits a
 * hair below fₙ and is 1.0001 at most.)
 */
export function loudness(
  tube: ResonanceTube,
  airColumn: number,
  frequency: number,
): number | undefined {
  if (!positive(frequency)) return undefined;
  if (columnFrequency(tube, airColumn, 1) === undefined) return undefined;
  const q = tube.q ?? 30;
  let best = 0;
  for (let n = 1; n <= MAX_MODE; n++) {
    const r = frequency / columnFrequency(tube, airColumn, n)!;
    best = Math.max(best, 1 / Math.sqrt((1 - r * r) ** 2 + (r / q) ** 2));
  }
  return best / q;
}

/** Loudness in decibels relative to resonance (0 dB at resonance, negative elsewhere). */
export function loudnessDb(
  tube: ResonanceTube,
  airColumn: number,
  frequency: number,
): number | undefined {
  const a = loudness(tube, airColumn, frequency);
  return a === undefined ? undefined : 20 * Math.log10(a);
}

/**
 * The struck fork's amplitude, relative to the moment it was struck: exp(−t / τ). Zero before the
 * strike. A school fork on a rubber pad rings for a time constant τ of about 4 s.
 */
export function forkAmplitude(secondsSinceStrike: number, tau = 4): number | undefined {
  if (!Number.isFinite(secondsSinceStrike) || !positive(tau)) return undefined;
  return secondsSinceStrike < 0 ? 0 : Math.exp(-secondsSinceStrike / tau);
}

export interface StandingWave {
  /** The wavelength in the tube's air, in metres. */
  readonly wavelength: number;
  /** Depth below the mouth of each displacement node (the water surface is the last), in metres. */
  readonly nodes: readonly number[];
  /**
   * Depth below the mouth of each displacement antinode, in metres. The top one is above the
   * mouth by the end correction, so its depth is negative.
   */
  readonly antinodes: readonly number[];
  /** The sound's loudness, 0 to 1 (see `loudness`). */
  readonly amplitude: number;
}

/**
 * The standing wave in the air column, for the drawing. Measured from the water surface (a
 * displacement node), the air's displacement amplitude goes as sin(kx) and the pressure change as
 * cos(kx), with k = 2π / λ. Nodes and antinodes are given as depths below the mouth, deepest last.
 */
export function standingWave(
  tube: ResonanceTube,
  airColumn: number,
  frequency: number,
): StandingWave | undefined {
  const amplitude = loudness(tube, airColumn, frequency);
  if (amplitude === undefined) return undefined;
  const lambda = wavelength(tube, frequency)!;
  const e = endCorrection(tube)!;
  const nodes: number[] = [];
  const antinodes: number[] = [];
  // Heights above the water: nodes at mλ/2, antinodes at (2m + 1)λ/4, up to the antinode
  // above the mouth (height L + e, depth −e).
  for (let m = 0; (m * lambda) / 2 <= airColumn; m++) nodes.push(airColumn - (m * lambda) / 2);
  for (let m = 0; ((2 * m + 1) * lambda) / 4 <= airColumn + e; m++)
    antinodes.push(airColumn - ((2 * m + 1) * lambda) / 4);
  nodes.reverse();
  antinodes.reverse();
  return { wavelength: lambda, nodes, antinodes, amplitude };
}

/**
 * The air at a depth below the mouth, at a phase ωt of the fork's cycle: its displacement (along
 * the tube, upwards positive) and its pressure change, both relative to their largest values at
 * resonance. Undefined below the water or above the end-corrected top of the column.
 */
export function airAt(
  tube: ResonanceTube,
  airColumn: number,
  frequency: number,
  depth: number,
  phase: number,
): { displacement: number; pressure: number } | undefined {
  const amplitude = loudness(tube, airColumn, frequency);
  if (amplitude === undefined || !Number.isFinite(depth) || !Number.isFinite(phase))
    return undefined;
  const e = endCorrection(tube)!;
  if (depth > airColumn || depth < -e) return undefined;
  const k = (2 * Math.PI) / wavelength(tube, frequency)!;
  const x = airColumn - depth;
  const c = Math.cos(phase);
  return {
    displacement: amplitude * Math.sin(k * x) * c,
    pressure: amplitude * Math.cos(k * x) * c,
  };
}

/**
 * The speed of sound found from two successive resonances, v = 2f (L₂ − L₁), which needs no end
 * correction; and e from them, e = (L₂ − 3L₁) / 2.
 */
export function fromTwoResonances(
  frequency: number,
  first: number,
  second: number,
): { speed: number; endCorrection: number } | undefined {
  if (!positive(frequency) || !positive(first) || !positive(second) || second <= first)
    return undefined;
  return { speed: 2 * frequency * (second - first), endCorrection: (second - 3 * first) / 2 };
}
