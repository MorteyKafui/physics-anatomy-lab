/**
 * The simple pendulum.
 *
 * Lengths are in metres, times in seconds, angles in radians, g in m s⁻².
 * Every function is pure and deterministic. Inputs outside the physical range throw a RangeError
 * rather than returning a number that looks valid.
 */

export interface Pendulum {
  /** Length from the pivot to the centre of the bob, in metres. */
  readonly length: number;
  /** Acceleration due to gravity, in m s⁻². */
  readonly g: number;
  /** Amplitude of the swing (largest angle from the vertical), in radians. Defaults to 0. */
  readonly amplitude?: number;
}

function assertPendulum({ length, g, amplitude = 0 }: Pendulum): void {
  if (!(length > 0) || !Number.isFinite(length))
    throw new RangeError(`length must be a positive number of metres, got ${length}`);
  if (!(g > 0) || !Number.isFinite(g))
    throw new RangeError(`g must be a positive number, got ${g}`);
  if (!Number.isFinite(amplitude) || Math.abs(amplitude) >= Math.PI) {
    throw new RangeError(`amplitude must be between -π and π radians, got ${amplitude}`);
  }
}

/** Period for small swings: T = 2π √(l / g). */
export function periodSmallAngle(p: Pendulum): number {
  assertPendulum(p);
  return 2 * Math.PI * Math.sqrt(p.length / p.g);
}

/**
 * Arithmetic–geometric mean of two positive numbers.
 * Converges quadratically; 1e-15 relative agreement is reached in a handful of steps.
 */
export function agm(a: number, b: number): number {
  if (!(a > 0) || !(b > 0)) throw new RangeError("agm needs two positive numbers");
  let x = a;
  let y = b;
  for (let i = 0; i < 64; i++) {
    const nx = (x + y) / 2;
    const ny = Math.sqrt(x * y);
    if (Math.abs(nx - ny) <= 1e-15 * nx) return nx;
    x = nx;
    y = ny;
  }
  return (x + y) / 2;
}

/**
 * Exact period for any amplitude below π:
 * T = 2π √(l / g) / AGM(1, cos(θ₀ / 2)),
 * which equals the complete-elliptic-integral form 4 √(l / g) K(sin²(θ₀ / 2)).
 */
export function periodExact(p: Pendulum): number {
  assertPendulum(p);
  const theta0 = Math.abs(p.amplitude ?? 0);
  return periodSmallAngle(p) / agm(1, Math.cos(theta0 / 2));
}

/** g from a period measured on a pendulum of known length: g = 4π² l / T². */
export function gFromPeriod(length: number, period: number): number {
  if (!(length > 0) || !(period > 0)) throw new RangeError("length and period must be positive");
  return (4 * Math.PI * Math.PI * length) / (period * period);
}

/** g from the slope of a graph of T² against l: g = 4π² / slope. */
export function gFromSlope(slope: number): number {
  if (!(slope > 0) || !Number.isFinite(slope))
    throw new RangeError(`slope must be positive, got ${slope}`);
  return (4 * Math.PI * Math.PI) / slope;
}

/**
 * The period a student records when timing `swings` oscillations.
 * Starting the count at zero as the bob passes the mark times exactly `swings` periods.
 * Starting at one (the most common WASSCE mistake) times only `swings − 1` periods,
 * but the student still divides by `swings`.
 */
export function recordedPeriod(truePeriod: number, swings: number, countFrom: 0 | 1): number {
  if (!(truePeriod > 0)) throw new RangeError("truePeriod must be positive");
  if (!Number.isInteger(swings) || swings < 2)
    throw new RangeError("swings must be a whole number of at least 2");
  const timed = countFrom === 0 ? swings : swings - 1;
  return (truePeriod * timed) / swings;
}
