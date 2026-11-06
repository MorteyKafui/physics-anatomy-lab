import { substream, uniform, withTolerance } from "./random";

/**
 * The laboratory's surroundings. The defaults suit a Ghanaian school lab; a school can set its
 * own local g, mains frequency and room temperature in its settings.
 */
export interface Environment {
  /** Room temperature, °C. */
  temperatureC: number;
  /** Gravitational field strength, N kg⁻¹. */
  g: number;
  /** Nominal mains frequency, Hz. Ghana uses 50 Hz. */
  mainsHz: 50 | 60;
}

export const DEFAULT_ENVIRONMENT: Readonly<Environment> = {
  temperatureC: 27,
  g: 9.81,
  mainsHz: 50,
};

/** What the room is really like during one attempt. */
export interface Conditions {
  temperatureC: number;
  g: number;
  mainsHz: number;
}

/**
 * The attempt's actual conditions: the room drifts up to 1.5 °C from its setting and the mains
 * is never exactly 50 Hz (±0.2%). g is the school's value, unchanged. A student who takes the
 * temperature gets the right one.
 */
export function actualConditions(env: Environment, seed: number): Conditions {
  const rng = substream(seed, "environment");
  return {
    temperatureC: env.temperatureC + uniform(rng, -1.5, 1.5),
    g: env.g,
    mainsHz: withTolerance(rng, env.mainsHz, 0.002),
  };
}
