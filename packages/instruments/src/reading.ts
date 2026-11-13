import { gaussian, type Rng } from "./random";

/**
 * How an instrument turns a true value into what the student sees, and how what the student typed
 * compares with what was shown. Both are kept, so feedback can say "the rule read 54.3 cm and you
 * wrote 45.3", but only after the student has submitted. Harvested from Physics Bench.
 */

export interface InstrumentSpec {
  id: string;
  /** Least count: the smallest division, or the last digit on a display, in display units. */
  resolution: number;
  unit: string;
  /** Systematic offset present until the student zeroes the instrument. */
  zeroError?: number;
  /** Random noise on each reading, 1σ, in display units (a flickering meter, a shaky hand). */
  noise?: number;
  /** Height of the pointer or edge above the scale, in display units: drives parallax. */
  pointerHeight?: number;
  /**
   * The scale's two ends, in display units, for a needle that stops there (a moving-coil meter).
   * A value beyond an end pins the needle against its stop.
   */
  scale?: readonly [min: number, max: number];
  /**
   * A digital display, read to its last digit, not a scale read by eye to half a division (the
   * uncertainty layer, docs/content/uncertainty-brief.md, decision 2).
   */
  digital?: boolean;
}

export interface Reading {
  /** The physical value at the moment of reading, in display units. */
  truth: number;
  /** What the instrument shows: where the eye lines up, or the digits on the display. */
  shown: number;
  /**
   * The needle is hard against a stop: "low" when the meter is pushed backwards (connected the
   * wrong way round), "high" when the value is beyond full scale.
   */
  pinned?: "low" | "high";
}

/**
 * Parallax: an eye `angleDeg` off the normal to the scale sees the pointer shifted by
 * height × tan(angle). A student who reads square-on, at eye level, sees no shift.
 */
export function parallaxShift(pointerHeight: number, angleDeg: number): number {
  return pointerHeight * Math.tan((angleDeg * Math.PI) / 180);
}

export function takeReading(
  spec: InstrumentSpec,
  truth: number,
  opts: { rng: Rng; zeroed?: boolean; viewAngleDeg?: number },
): Reading {
  let shown = truth;
  if (spec.zeroError && !opts.zeroed) shown += spec.zeroError;
  if (spec.scale) {
    // The needle stops at the ends of the scale; the eye then reads the stop, square-on or not.
    const [min, max] = spec.scale;
    if (shown < min) return { truth, shown: min, pinned: "low" };
    if (shown > max) return { truth, shown: max, pinned: "high" };
  }
  // A needle at rest does not flicker; a scale's needle never jitters past its stops.
  if (spec.noise && (!spec.scale || truth !== 0)) shown += gaussian(opts.rng, 0, spec.noise);
  if (spec.scale) shown = Math.min(spec.scale[1], Math.max(spec.scale[0], shown));
  if (spec.pointerHeight && opts.viewAngleDeg) {
    shown += parallaxShift(spec.pointerHeight, opts.viewAngleDeg);
  }
  return { truth, shown };
}

/** Round to what a careful reader records: the nearest division or the display's last digit. */
export function quantise(value: number, resolution: number): number {
  const q = Math.round(value / resolution) * resolution;
  // Clear binary noise so 0.1 steps print as 54.3, not 54.300000000000004.
  return Number(q.toFixed(Math.max(0, Math.ceil(-Math.log10(resolution)) + 1)));
}

export type TranscriptionSlip =
  | { kind: "none" }
  | { kind: "transposed-digits" }
  | { kind: "one-division"; divisions: number }
  | { kind: "misread"; difference: number };

/** Compare the typed value with the shown value and name the most likely slip. */
export function classifySlip(typed: number, shown: number, resolution: number): TranscriptionSlip {
  const diff = typed - shown;
  if (Math.abs(diff) <= resolution * 0.51) return { kind: "none" };

  const digits = (n: number) =>
    n
      .toFixed(6)
      .replace(/[^0-9]/g, "")
      .replace(/^0+/, "");
  const a = digits(typed);
  const b = digits(shown);
  if (a.length === b.length && a !== b) {
    const differing = [...a].map((ch, i) => (ch === b[i] ? -1 : i)).filter((i) => i >= 0);
    const [i, j] = differing;
    if (
      differing.length === 2 &&
      i !== undefined &&
      j === i + 1 &&
      a[i] === b[j] &&
      a[j] === b[i]
    ) {
      return { kind: "transposed-digits" };
    }
  }

  const divisions = Math.round(diff / resolution);
  if (Math.abs(divisions) <= 2) return { kind: "one-division", divisions };
  return { kind: "misread", difference: diff };
}
