/**
 * Fraunhofer (far-field) diffraction by N identical slits, for the landing page's double-slit
 * hero (docs/content/landing-page-brief.md, decision 1).
 *
 * N slits of width a, centres d apart, lit by a plane wave of wavelength λ. At angle θ, with
 *
 *   β = π a sin θ / λ   and   α = π d sin θ / λ,
 *
 * the intensity relative to the centre of the pattern is
 *
 *   I / I₀ = (sin β / β)² · (sin Nα / (N sin α))².
 *
 * The first factor is one slit's envelope, the second the slits interfering. With a detector
 * that records which slit each particle went through, the paths no longer interfere: the
 * intensities of the separate slits add, and far from the slits each is the same envelope, so
 * the pattern is the envelope alone.
 *
 * Cross-checked against direct numerical integration over the openings in
 * validation/pa_validation/diffraction.py. Lengths in metres.
 */

export interface Slits {
  /** How many slits, 1 or more. */
  count: number;
  /** Width of each slit, m. */
  width: number;
  /** Centre-to-centre spacing, m. Ignored for one slit. */
  spacing: number;
  /** Wavelength, m. */
  wavelength: number;
}

function check(s: Slits): Slits {
  if (!Number.isInteger(s.count) || s.count < 1) {
    throw new RangeError(`count must be a whole number of slits, 1 or more, got ${s.count}`);
  }
  for (const key of ["width", "wavelength"] as const) {
    if (!(s[key] > 0) || !Number.isFinite(s[key])) {
      throw new RangeError(`${key} must be a positive number, got ${s[key]}`);
    }
  }
  if (s.count > 1 && !(s.spacing >= s.width)) {
    throw new RangeError(`spacing must be at least the slit width, got ${s.spacing}`);
  }
  return s;
}

function sincSquared(x: number): number {
  if (Math.abs(x) < 1e-8) return 1 - (x * x) / 3;
  const v = Math.sin(x) / x;
  return v * v;
}

/** One slit's envelope, (sin β / β)², at sin θ. */
export function singleSlitIntensity(s: Slits, sinTheta: number): number {
  check(s);
  return sincSquared((Math.PI * s.width * sinTheta) / s.wavelength);
}

/** The N-slit pattern relative to its centre, at sin θ. */
export function slitsIntensity(s: Slits, sinTheta: number): number {
  const envelope = singleSlitIntensity(s, sinTheta);
  if (s.count === 1) return envelope;
  const alpha = (Math.PI * s.spacing * sinTheta) / s.wavelength;
  const denominator = s.count * Math.sin(alpha);
  // At a principal maximum (α a whole multiple of π) the ratio tends to ±1.
  if (Math.abs(denominator) < 1e-9) return envelope;
  const ratio = Math.sin(s.count * alpha) / denominator;
  return envelope * ratio * ratio;
}

/** The pattern with a which-slit detector: no interference, the envelope alone. */
export function whichSlitIntensity(s: Slits, sinTheta: number): number {
  return singleSlitIntensity(s, sinTheta);
}
