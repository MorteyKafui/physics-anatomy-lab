/**
 * Direct-current circuits for two v1 experiments: Ohm's law, and the potentiometer (comparing
 * emfs and finding a cell's internal resistance).
 *
 * Volts, amperes, ohms and metres. Wires are ideal unless a resistance is given. Every function is
 * pure; inputs outside the physical range throw a RangeError. Cross-checked against nodal
 * analysis with NumPy and SciPy in validation/pa_validation/circuits.py.
 */

function positive(value: number, name: string): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
  return value;
}

function nonNegative(value: number, name: string): number {
  if (!(value >= 0) || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be zero or more, got ${value}`);
  }
  return value;
}

/** Two resistors side by side: R₁R₂ / (R₁ + R₂). An open circuit (Infinity) leaves the other. */
export function parallel(r1: number, r2: number): number {
  if (!(r1 > 0) || !(r2 > 0)) {
    throw new RangeError(
      `resistances must be positive (Infinity for an open circuit), got ${r1}, ${r2}`,
    );
  }
  if (r1 === Infinity && r2 === Infinity) return Infinity;
  if (r1 === Infinity) return r2;
  if (r2 === Infinity) return r1;
  return (r1 * r2) / (r1 + r2);
}

export interface OhmsLawCircuit {
  /** The cell's emf, V. */
  emf: number;
  /** The cell's internal resistance, Ω. */
  internalResistance: number;
  /** The rheostat's setting, Ω. */
  rheostat: number;
  /** The resistor under test, Ω. */
  resistor: number;
  /**
   * The voltmeter's own resistance, Ω, connected across the resistor. Infinity (the default) is an
   * ideal voltmeter. A real one draws a little current, so V / I comes out slightly below R.
   */
  voltmeterResistance?: number;
}

/**
 * The ammeter and voltmeter readings in the standard Ohm's law circuit: cell, rheostat and ammeter
 * in series with the resistor, voltmeter across the resistor. The ammeter is ideal.
 */
export function ohmsLawReadings(c: OhmsLawCircuit): { current: number; voltage: number } {
  positive(c.emf, "emf");
  nonNegative(c.internalResistance, "internalResistance");
  nonNegative(c.rheostat, "rheostat");
  positive(c.resistor, "resistor");
  const rv = c.voltmeterResistance ?? Infinity;
  if (!(rv > 0)) throw new RangeError(`voltmeterResistance must be positive, got ${rv}`);

  const load = parallel(c.resistor, rv);
  const current = c.emf / (c.internalResistance + c.rheostat + load);
  return { current, voltage: current * load };
}

export interface Potentiometer {
  /** The driver cell's emf (usually an accumulator), V. */
  driverEmf: number;
  /** The driver cell's internal resistance, Ω. */
  driverInternalResistance: number;
  /** A rheostat or resistor in series with the driver cell, Ω. */
  seriesResistance: number;
  /** The whole wire's resistance, Ω. */
  wireResistance: number;
  /** The wire's length, m (1 m on a metre bridge). */
  wireLength: number;
}

function assertPotentiometer(p: Potentiometer): void {
  positive(p.driverEmf, "driverEmf");
  nonNegative(p.driverInternalResistance, "driverInternalResistance");
  nonNegative(p.seriesResistance, "seriesResistance");
  positive(p.wireResistance, "wireResistance");
  positive(p.wireLength, "wireLength");
}

/** The fall in potential per metre along the uniform wire, V m⁻¹. */
export function potentialGradient(p: Potentiometer): number {
  assertPotentiometer(p);
  const current =
    p.driverEmf / (p.driverInternalResistance + p.seriesResistance + p.wireResistance);
  return (current * p.wireResistance) / p.wireLength;
}

/**
 * Where the jockey balances (no current in the galvanometer) for a potential difference `pd`
 * connected with the same polarity as the driver: l = pd / k. At balance no current flows in the
 * test circuit, so a cell's terminal pd is its emf. Returns undefined when the balance point
 * would lie beyond the wire: the student sees the galvanometer deflect one way everywhere.
 */
export function balanceLength(p: Potentiometer, pd: number): number | undefined {
  positive(pd, "pd");
  const l = pd / potentialGradient(p);
  return l <= p.wireLength ? l : undefined;
}

/** Comparing emfs: E₁ / E₂ = l₁ / l₂. */
export function emfRatio(l1: number, l2: number): number {
  return positive(l1, "l1") / positive(l2, "l2");
}

/**
 * A cell's terminal potential difference when it drives a current through a resistor R:
 * V = E R / (R + r).
 */
export function terminalPd(emf: number, internalResistance: number, load: number): number {
  positive(emf, "emf");
  nonNegative(internalResistance, "internalResistance");
  positive(load, "load");
  return (emf * load) / (load + internalResistance);
}

/**
 * Internal resistance from two balance lengths: l₀ with the cell on open circuit, l with a
 * resistor R across it. r = R (l₀ / l − 1).
 */
export function internalResistanceFromBalance(
  load: number,
  openCircuit: number,
  loaded: number,
): number {
  positive(load, "load");
  positive(openCircuit, "openCircuit");
  positive(loaded, "loaded");
  if (loaded > openCircuit) {
    throw new RangeError("the loaded balance length cannot be longer than the open-circuit one");
  }
  return load * (openCircuit / loaded - 1);
}
