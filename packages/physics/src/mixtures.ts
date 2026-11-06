/**
 * The method of mixtures: a hot body gives heat to cooler ones until all share one temperature.
 * With no heat lost to the room and constant specific heat capacities,
 *
 *   heat lost by the hot body = heat gained by the cold ones
 *   Σ m c (θ_final − θ_initial) = 0
 *
 * Masses in kg, specific heat capacities in J kg⁻¹ K⁻¹. Temperatures may be in °C because only
 * differences appear. Cross-checked by root-finding on the energy balance with SciPy in
 * validation/pa_validation/mixtures.py.
 */

export interface Body {
  /** Mass, kg. */
  mass: number;
  /** Specific heat capacity, J kg⁻¹ K⁻¹. */
  specificHeatCapacity: number;
  /** Temperature before mixing, °C. */
  temperature: number;
}

/** Specific heat capacity of water used in WASSCE calculations, J kg⁻¹ K⁻¹. */
export const WATER_SPECIFIC_HEAT_CAPACITY = 4200;

function assertBody(b: Body, name: string): void {
  if (!(b.mass > 0) || !Number.isFinite(b.mass)) {
    throw new RangeError(`${name}: mass must be a positive number of kg, got ${b.mass}`);
  }
  if (!(b.specificHeatCapacity > 0) || !Number.isFinite(b.specificHeatCapacity)) {
    throw new RangeError(
      `${name}: specific heat capacity must be positive, got ${b.specificHeatCapacity}`,
    );
  }
  // Below absolute zero is impossible; a mixture is a lab-bench experiment, far from it anyway.
  if (!Number.isFinite(b.temperature) || b.temperature <= -273.15) {
    throw new RangeError(`${name}: temperature must be above −273.15 °C, got ${b.temperature}`);
  }
}

/** Heat capacity m c of a body, J K⁻¹. */
export function heatCapacity(b: Body): number {
  assertBody(b, "body");
  return b.mass * b.specificHeatCapacity;
}

/** The shared final temperature of bodies mixed with no heat loss: θ = Σ m c θ / Σ m c. */
export function finalTemperature(bodies: readonly Body[]): number {
  if (bodies.length < 2) throw new RangeError("a mixture needs at least two bodies");
  bodies.forEach((b, i) => assertBody(b, `body ${i + 1}`));
  let sumCapacity = 0;
  let sumWeighted = 0;
  for (const b of bodies) {
    sumCapacity += b.mass * b.specificHeatCapacity;
    sumWeighted += b.mass * b.specificHeatCapacity * b.temperature;
  }
  return sumWeighted / sumCapacity;
}

export interface MixtureReadings {
  /** The solid's mass, kg. */
  solidMass: number;
  /** The solid's temperature just before it goes in (often the boiling water it was heated in), °C. */
  solidTemperature: number;
  /** Mass of water in the calorimeter, kg. */
  waterMass: number;
  /** Mass of the empty calorimeter (and stirrer), kg. */
  calorimeterMass: number;
  /** Specific heat capacity of the calorimeter's material, J kg⁻¹ K⁻¹ (copper ≈ 390). */
  calorimeterSpecificHeatCapacity: number;
  /** Temperature of the water and calorimeter before the solid goes in, °C. */
  initialTemperature: number;
  /** The highest steady temperature after mixing, °C. */
  finalTemperature: number;
  /** Defaults to WATER_SPECIFIC_HEAT_CAPACITY. */
  waterSpecificHeatCapacity?: number;
}

/**
 * The solid's specific heat capacity from a student's readings:
 *
 *   c_s = (m_w c_w + m_c c_c)(θ_f − θ_1) / (m_s (θ_s − θ_f))
 *
 * The final temperature must lie between the two starting temperatures.
 */
export function specificHeatCapacityFromMixture(r: MixtureReadings): number {
  const cw = r.waterSpecificHeatCapacity ?? WATER_SPECIFIC_HEAT_CAPACITY;
  for (const [name, v] of [
    ["solidMass", r.solidMass],
    ["waterMass", r.waterMass],
    ["calorimeterSpecificHeatCapacity", r.calorimeterSpecificHeatCapacity],
    ["waterSpecificHeatCapacity", cw],
  ] as const) {
    if (!(v > 0) || !Number.isFinite(v)) throw new RangeError(`${name} must be positive, got ${v}`);
  }
  if (!(r.calorimeterMass >= 0) || !Number.isFinite(r.calorimeterMass)) {
    throw new RangeError(`calorimeterMass must be zero or more, got ${r.calorimeterMass}`);
  }
  const { solidTemperature: hot, initialTemperature: cold, finalTemperature: final } = r;
  if (![hot, cold, final].every(Number.isFinite))
    throw new RangeError("temperatures must be numbers");
  if (!(final > cold && final < hot)) {
    throw new RangeError(
      `the final temperature (${final} °C) must lie between the starting temperatures (${cold} °C and ${hot} °C)`,
    );
  }
  const gained =
    (r.waterMass * cw + r.calorimeterMass * r.calorimeterSpecificHeatCapacity) * (final - cold);
  return gained / (r.solidMass * (hot - final));
}
