/**
 * The Helmholtz resonator: a flask whose air sings.
 *
 * The plug of air in the neck is a mass; the air shut in the bulb is a spring. Pushing the plug
 * in by ξ squeezes the bulb's air adiabatically and raises its pressure by p = γp₀Aξ / V, which
 * pushes back on the plug with a force pA. That spring, k = γp₀A² / V, carries the plug's mass
 * m = ρAL′, and the system rings at
 *
 *   f = (1 / 2π) √(k / m) = (c / 2π) √(A / (V L′)),     c² = γp₀ / ρ = γRT / M,
 *
 * where A is the neck's cross-section, V the volume of air in the bulb and L′ the neck's length
 * plus its end corrections (the air just beyond each end moves with the plug). Pouring a volume
 * V_w of water into a flask that holds V₀ of air leaves V = V₀ − V_w, so
 *
 *   1/f² = (4π² L′ / (c² A)) (V₀ − V_w)
 *
 * is a straight line in V_w with a negative slope that meets the V_w axis at V₀. That line is the
 * practical's calibration.
 *
 * Driven by a loudspeaker at frequency f, the plug's velocity (which is what radiates the sound
 * heard at the mouth) follows a damped oscillator with quality factor Q, about 14 to 22 for a
 * glass flask. Loudness here is that velocity relative to its value at resonance, so it is
 * exactly 1 at f₀ and falls to 1/√2 at f₀(√(1 + 1/4Q²) ± 1/2Q).
 *
 * Harvested from Physics Bench's helmholtz model, reviewed and rewritten. Cross-checked against
 * the independent lumped mass-spring model in validation/pa_validation/helmholtz.py.
 *
 * SI units throughout: metres, cubic metres, seconds, hertz, pascals, kelvin from °C. Every
 * function is pure; inputs outside the physical range give `null`, never NaN.
 */

/** Ratio of the heat capacities of dry air. */
export const AIR_GAMMA = 1.4;
/** Molar mass of dry air, kg mol⁻¹. */
export const AIR_MOLAR_MASS = 0.0289647;
/** Molar gas constant N_A k, J mol⁻¹ K⁻¹ (exact since 2019). */
export const GAS_CONSTANT = 8.31446261815324;
/** Standard atmospheric pressure, Pa. */
export const STANDARD_PRESSURE = 101325;
/**
 * End correction of the neck as a multiple of its radius: 0.85 r for the end that opens into
 * the bulb (flanged by the bulb's wall) plus 0.61 r for the open, unflanged mouth.
 */
export const NECK_END_CORRECTION = 0.85 + 0.61;
/** The range of quality factor a glass flask shows. */
export const FLASK_Q_RANGE = [14, 22] as const;

export interface HelmholtzFlask {
  /** Volume of air in the empty bulb, up to the bottom of the neck, m³. */
  readonly bulbVolume: number;
  /** Inner radius of the neck, m. */
  readonly neckRadius: number;
  /** Length of the neck, m. */
  readonly neckLength: number;
  /** End correction as a multiple of the neck's radius. Defaults to NECK_END_CORRECTION. */
  readonly endCorrection?: number;
  /** Quality factor of the resonance (14 to 22 for a glass flask). */
  readonly q: number;
}

/** A 500 ml round-bottom flask: 550 cm³ of air to the neck, a neck 24 mm wide and 75 mm long. */
export const ROUND_BOTTOM_FLASK: HelmholtzFlask = {
  bulbVolume: 550e-6,
  neckRadius: 0.012,
  neckLength: 0.075,
  q: 18,
};

export interface HelmholtzState {
  /** Volume of water poured in, m³. */
  readonly waterVolume: number;
  /** Room temperature, °C. */
  readonly temperatureC: number;
}

const finite = (x: number) => typeof x === "number" && Number.isFinite(x);
/** The value if it is a finite number, else null: overflow never leaks out as ∞ or NaN. */
const result = (x: number): number | null => (Number.isFinite(x) ? x : null);
const positive = (x: number) => finite(x) && x > 0;

function validFlask(f: HelmholtzFlask): boolean {
  const e = f.endCorrection ?? NECK_END_CORRECTION;
  return (
    positive(f.bulbVolume) &&
    positive(f.neckRadius) &&
    positive(f.neckLength) &&
    finite(e) &&
    e >= 0 &&
    finite(f.q) &&
    f.q > 0.5
  );
}

/** Speed of sound in dry air at a temperature in °C: c = √(γRT / M). */
export function speedOfSound(temperatureC: number): number | null {
  if (!finite(temperatureC)) return null;
  const T = temperatureC + 273.15;
  if (!(T > 0)) return null;
  return result(Math.sqrt((AIR_GAMMA * GAS_CONSTANT * T) / AIR_MOLAR_MASS));
}

/** Density of dry air, kg m⁻³: ρ = p M / (R T). */
export function airDensity(temperatureC: number, pressure = STANDARD_PRESSURE): number | null {
  if (!finite(temperatureC) || !positive(pressure)) return null;
  const T = temperatureC + 273.15;
  if (!(T > 0)) return null;
  return result((pressure * AIR_MOLAR_MASS) / (GAS_CONSTANT * T));
}

/** Cross-section of the neck, m². */
export function neckArea(flask: HelmholtzFlask): number | null {
  if (!validFlask(flask)) return null;
  return Math.PI * flask.neckRadius ** 2;
}

/** The neck's length plus its end corrections, L′ = L + e r, m. */
export function effectiveNeckLength(flask: HelmholtzFlask): number | null {
  if (!validFlask(flask)) return null;
  return flask.neckLength + (flask.endCorrection ?? NECK_END_CORRECTION) * flask.neckRadius;
}

/** Air left in the bulb, V = V₀ − V_w, m³; null if the water fills or overfills the bulb. */
export function airVolume(flask: HelmholtzFlask, waterVolume: number): number | null {
  if (!validFlask(flask) || !finite(waterVolume) || waterVolume < 0) return null;
  const v = flask.bulbVolume - waterVolume;
  return v > 0 ? v : null;
}

/** Resonant frequency f₀ = (c / 2π) √(A / (V L′)), Hz. */
export function resonantFrequency(flask: HelmholtzFlask, state: HelmholtzState): number | null {
  const c = speedOfSound(state.temperatureC);
  const A = neckArea(flask);
  const L = effectiveNeckLength(flask);
  const V = airVolume(flask, state.waterVolume);
  if (c === null || A === null || L === null || V === null) return null;
  return result((c / (2 * Math.PI)) * Math.sqrt(A / (V * L)));
}

/** 1 / f₀², s². */
export function inverseFrequencySquared(
  flask: HelmholtzFlask,
  state: HelmholtzState,
): number | null {
  const f = resonantFrequency(flask, state);
  return f === null ? null : result(1 / (f * f));
}

export interface CalibrationLine {
  /** Slope of 1/f² against V_w, s² m⁻³ (negative). */
  readonly slope: number;
  /** 1/f² with no water, s². */
  readonly intercept: number;
  /** Where the line meets the V_w axis: the bulb's volume V₀, m³. */
  readonly volumeIntercept: number;
}

/** The straight line 1/f² = slope · V_w + intercept for a flask at a room temperature. */
export function calibrationLine(
  flask: HelmholtzFlask,
  temperatureC: number,
): CalibrationLine | null {
  const c = speedOfSound(temperatureC);
  const A = neckArea(flask);
  const L = effectiveNeckLength(flask);
  if (c === null || A === null || L === null) return null;
  const k = (4 * Math.PI * Math.PI * L) / (c * c * A);
  if (!Number.isFinite(k * flask.bulbVolume)) return null;
  return { slope: -k, intercept: k * flask.bulbVolume, volumeIntercept: flask.bulbVolume };
}

/** Water volume read back from a resonant frequency through the calibration line, m³. */
export function waterFromFrequency(
  flask: HelmholtzFlask,
  temperatureC: number,
  frequency: number,
): number | null {
  const line = calibrationLine(flask, temperatureC);
  if (line === null || !positive(frequency)) return null;
  const vw = (1 / (frequency * frequency) - line.intercept) / line.slope;
  return vw >= 0 && vw < flask.bulbVolume ? vw : null;
}

/**
 * Loudness at the flask's mouth when the speaker drives it at `frequency`, relative to the
 * loudness at resonance: the plug's velocity response, x/Q / √((1 − x²)² + (x/Q)²) with
 * x = f / f₀. Exactly 1 at f₀, and never above 1.
 */
export function loudness(
  flask: HelmholtzFlask,
  state: HelmholtzState,
  frequency: number,
): number | null {
  const f0 = resonantFrequency(flask, state);
  if (f0 === null || !positive(frequency)) return null;
  const x = frequency / f0;
  // The same ratio written as 1 / √(1 + Q²(1/x − x)²), which cannot overflow to ∞/∞.
  const detune = flask.q * (1 / x - x);
  const v = 1 / Math.sqrt(1 + detune * detune);
  return Number.isFinite(v) ? v : null;
}

/** The two frequencies where the loudness falls to 1/√2, Hz; they are f₀/Q apart. */
export function halfPowerFrequencies(
  flask: HelmholtzFlask,
  state: HelmholtzState,
): readonly [number, number] | null {
  const f0 = resonantFrequency(flask, state);
  if (f0 === null) return null;
  const h = 1 / (2 * flask.q);
  const mid = Math.sqrt(1 + h * h);
  const pair = [f0 * (mid - h), f0 * (mid + h)] as const;
  return pair.every(Number.isFinite) ? pair : null;
}

export interface PlugDrive {
  /** The speaker's frequency, Hz. */
  readonly frequency: number;
  /** Amplitude of the speaker's sound pressure at the mouth, Pa. */
  readonly drivePressure: number;
  /** Time, s. */
  readonly time: number;
  /** Ambient pressure, Pa. Defaults to STANDARD_PRESSURE. */
  readonly ambientPressure?: number;
}

export interface PlugState {
  /** How far the plug of air is pushed into the bulb, m (negative: out of the mouth). */
  readonly displacement: number;
  /** The plug's velocity into the bulb, m s⁻¹. */
  readonly velocity: number;
  /** The bulb's pressure above ambient, Pa. */
  readonly bulbPressure: number;
  /** Amplitude of the displacement, m. */
  readonly displacementAmplitude: number;
  /** Amplitude of the bulb's pressure, Pa. */
  readonly pressureAmplitude: number;
  /** How far the plug lags the speaker's push, rad (0 to π; π/2 at resonance). */
  readonly lag: number;
}

/**
 * The plug of air in steady state under a drive p_d cos ωt pushing it in:
 * m ξ'' + b ξ' + k ξ = A p_d cos ωt, with k = γp₀A²/V, m = k/ω₀², b = √(km)/Q.
 * Then ξ = (A p_d / k) |H| cos(ωt − φ), H = 1 / (1 − x² + i x/Q), and the bulb's pressure
 * above ambient is kξ/A = p_d |H| cos(ωt − φ): Q times the drive at resonance.
 */
export function plugState(
  flask: HelmholtzFlask,
  state: HelmholtzState,
  drive: PlugDrive,
): PlugState | null {
  const f0 = resonantFrequency(flask, state);
  const A = neckArea(flask);
  const V = airVolume(flask, state.waterVolume);
  const p0 = drive.ambientPressure ?? STANDARD_PRESSURE;
  if (f0 === null || A === null || V === null) return null;
  if (!positive(drive.frequency) || !finite(drive.drivePressure) || drive.drivePressure < 0)
    return null;
  if (!finite(drive.time) || !positive(p0)) return null;
  const x = drive.frequency / f0;
  const re = 1 - x * x;
  const im = x / flask.q;
  const gain = 1 / Math.sqrt(re * re + im * im);
  const lag = Math.atan2(im, re);
  const k = (AIR_GAMMA * p0 * A * A) / V;
  const xi0 = ((A * drive.drivePressure) / k) * gain;
  const w = 2 * Math.PI * drive.frequency;
  const phase = w * drive.time - lag;
  const result: PlugState = {
    displacement: xi0 * Math.cos(phase),
    velocity: -xi0 * w * Math.sin(phase),
    bulbPressure: drive.drivePressure * gain * Math.cos(phase),
    displacementAmplitude: xi0,
    pressureAmplitude: drive.drivePressure * gain,
    lag,
  };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

/** Radius of a spherical bulb that holds `bulbVolume`, m. */
export function bulbRadius(flask: HelmholtzFlask): number | null {
  if (!validFlask(flask)) return null;
  return Math.cbrt((3 * flask.bulbVolume) / (4 * Math.PI));
}

/**
 * Depth of water in a spherical bulb holding `waterVolume`, m: the root of the spherical cap
 * V_w = π h² (3R − h) / 3 with 0 ≤ h ≤ 2R. For the drawing's water level.
 */
export function waterDepth(flask: HelmholtzFlask, waterVolume: number): number | null {
  const R = bulbRadius(flask);
  if (R === null || !finite(waterVolume) || waterVolume < 0 || waterVolume > flask.bulbVolume)
    return null;
  if (waterVolume === 0) return 0;
  const cap = (h: number) => (Math.PI * h * h * (3 * R - h)) / 3;
  let lo = 0;
  let hi = 2 * R;
  for (let i = 0; i < 200 && hi - lo > 1e-15 * R; i++) {
    const mid = (lo + hi) / 2;
    if (cap(mid) < waterVolume) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
