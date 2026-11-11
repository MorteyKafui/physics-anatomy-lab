import { solveNetwork, type Element } from "./network";

/**
 * The flagship circuit for Ohm's law and the potentiometer: WASSCE's potentiometer, ammeter and
 * voltmeter practical (docs/content/ohms-law-brief.md). A cell, a resistor R and an ammeter are
 * in series with a potentiometer wire PQ and a key K. A jockey on the wire at J, joined to P by a
 * lead, cuts the length PJ out of the circuit. The voltmeter is across the cell, so it reads the
 * terminal potential difference V = E − I r: moving the jockey along raises I and lowers V, and
 * I against V is a line meeting the V axis at E with slope −1 / r.
 *
 * Volts, amperes, ohms, metres and seconds. Every reading comes from solving the whole network,
 * so the meters' own resistances, an open key and a cell that is running down all show.
 */
export interface TerminalPdSetup {
  /** The cell's emf, V, less any polarisation (see `polarise`). */
  emf: number;
  /** The cell's internal resistance, Ω. */
  internalResistance: number;
  /** The fixed resistor R, Ω. */
  resistor: number;
  /** The whole potentiometer wire's resistance, Ω. */
  wireResistance: number;
  /** The wire's length PQ, m. */
  wireLength: number;
  /** The ammeter's own resistance, Ω. */
  ammeterResistance: number;
  /** The voltmeter's own resistance, Ω. */
  voltmeterResistance: number;
  /** PJ, m, where the jockey touches the wire; undefined when it is not touching. */
  jockey: number | undefined;
  /** Whether the key is closed. */
  keyClosed: boolean;
}

/** The setup as a network for `solveNetwork`: the lab's correct wiring. */
export function terminalPdNetwork(s: TerminalPdSetup): Element[] {
  if (!(s.wireLength > 0)) throw new RangeError(`wireLength must be positive, got ${s.wireLength}`);
  if (s.jockey !== undefined && !(s.jockey >= 0 && s.jockey <= s.wireLength)) {
    throw new RangeError(
      `the jockey must be on the wire (0 to ${s.wireLength} m), got ${s.jockey}`,
    );
  }
  const x = s.jockey ?? 0;
  const perMetre = s.wireResistance / s.wireLength;
  return [
    {
      kind: "cell",
      id: "cell",
      minus: "cell-",
      plus: "cell+",
      emf: s.emf,
      internalResistance: s.internalResistance,
    },
    { kind: "resistor", id: "R", a: "cell+", b: "R-A", ohms: s.resistor },
    { kind: "resistor", id: "ammeter", a: "R-A", b: "Q", ohms: s.ammeterResistance },
    { kind: "resistor", id: "wire-QJ", a: "Q", b: "J", ohms: perMetre * (s.wireLength - x) },
    { kind: "resistor", id: "wire-JP", a: "J", b: "P", ohms: perMetre * x },
    { kind: "resistor", id: "jockey", a: "J", b: "P", ohms: s.jockey === undefined ? Infinity : 0 },
    { kind: "resistor", id: "key", a: "P", b: "cell-", ohms: s.keyClosed ? 0 : Infinity },
    { kind: "resistor", id: "voltmeter", a: "cell+", b: "cell-", ohms: s.voltmeterResistance },
  ];
}

/** What the two meters truly show (before they round to their least count): I in A, V in V. */
export function terminalPdReadings(s: TerminalPdSetup): {
  current: number;
  voltage: number;
  cellCurrent: number;
} {
  const solved = solveNetwork(terminalPdNetwork(s));
  if (!solved.ok) throw new Error("the lab's own wiring cannot short the cell");
  const { solution } = solved;
  return {
    current: solution.current("ammeter"),
    voltage: solution.pd("cell+", "cell-"),
    cellCurrent: solution.current("cell"),
  };
}

/**
 * A cell running down while it supplies current, and recovering while the key is open, as a
 * polarisation voltage Vp in series with its emf (a first-order equivalent circuit): Vp moves
 * towards k I with a time constant τ, so the cell's effective emf is E − Vp. This is why the
 * key is opened as soon as each reading is taken.
 */
export interface Polarisation {
  /** The steady polarisation voltage per ampere drawn, V A⁻¹ (k). */
  perAmp: number;
  /** How quickly it builds up and dies away, s (τ). */
  timeConstant: number;
}

/** Vp after `seconds` with `current` (A) flowing steadily, from `vp` now. Exact for a steady current. */
export function polarise(vp: number, current: number, seconds: number, p: Polarisation): number {
  if (!(seconds >= 0)) throw new RangeError(`seconds must be zero or more, got ${seconds}`);
  if (!(p.perAmp >= 0) || !(p.timeConstant > 0)) {
    throw new RangeError("polarisation needs perAmp ≥ 0 and a positive time constant");
  }
  const steady = p.perAmp * Math.abs(current);
  return steady + (vp - steady) * Math.exp(-seconds / p.timeConstant);
}

/**
 * A wire warmed by the current through it (master plan: "wire heats if current is high"): a
 * lumped model, C dθ/dt = I² R(θ) − h θ, with θ the rise above the room and
 * R(θ) = R₀ (1 + α θ). Constantan's α is so small that its resistance hardly changes, which is
 * why potentiometer wires are made of it; a nichrome wire shows the effect.
 */
export interface WireHeating {
  /** The wire's resistance at room temperature, Ω (R₀). */
  coldResistance: number;
  /** Temperature coefficient of resistance, K⁻¹ (α). */
  alpha: number;
  /** Heat capacity of the wire, J K⁻¹ (C). */
  heatCapacity: number;
  /** Heat lost to the room per kelvin above it, W K⁻¹ (h). */
  loss: number;
}

/** The wire's resistance at a rise θ (K) above the room. */
export function wireResistanceAt(w: WireHeating, rise: number): number {
  return w.coldResistance * (1 + w.alpha * rise);
}

/**
 * The rise θ after `seconds` with `current` (A) flowing, from `rise` now, holding R at its value
 * at the start of the step (exact for a steady current when α = 0; take steps of a second or
 * less otherwise).
 */
export function heatWire(rise: number, current: number, seconds: number, w: WireHeating): number {
  if (!(seconds >= 0)) throw new RangeError(`seconds must be zero or more, got ${seconds}`);
  if (!(w.heatCapacity > 0) || !(w.loss > 0)) {
    throw new RangeError("a wire needs a positive heat capacity and heat loss");
  }
  const steady = (current * current * wireResistanceAt(w, rise)) / w.loss;
  return steady + (rise - steady) * Math.exp((-w.loss * seconds) / w.heatCapacity);
}
