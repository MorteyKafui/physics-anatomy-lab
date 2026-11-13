import type { InstrumentSpec } from "./reading";

/**
 * Instruments the v1 experiments use, with their least counts as printed on school apparatus.
 * Experiments may copy and adjust these (a worn rule, a meter with a zero error).
 */

/** A metre rule: 1 mm divisions, read in cm. The edge sits 0.4 cm above the scale. */
export const METRE_RULE: Readonly<InstrumentSpec> = {
  id: "metre-rule",
  resolution: 0.1,
  unit: "cm",
  pointerHeight: 0.4,
};

/** A digital stopwatch reading to 0.01 s. Its own error is negligible next to the hand's. */
export const STOPWATCH: Readonly<InstrumentSpec> = {
  id: "stopwatch",
  resolution: 0.01,
  unit: "s",
};

/** A liquid-in-glass thermometer with 1 °C divisions, read to half a division. */
export const THERMOMETER: Readonly<InstrumentSpec> = {
  id: "thermometer",
  resolution: 0.5,
  unit: "°C",
  pointerHeight: 0.3,
};

/** A top-pan balance reading to 0.1 g on its display (Experiment 64, decision 6). */
export const BALANCE: Readonly<InstrumentSpec> = {
  id: "balance",
  resolution: 0.1,
  unit: "g",
};

/**
 * A 100 cm³ measuring cylinder with 1 cm³ divisions. The water's surface meets the glass behind
 * the marks, so read from above or below it seems shifted by about 1 cm³ × tan(angle) (assumed
 * until the UEW data).
 */
export const MEASURING_CYLINDER: Readonly<InstrumentSpec> = {
  id: "measuring-cylinder",
  resolution: 1,
  unit: "cm³",
  pointerHeight: 1,
};

/**
 * A moving-coil ammeter, 0 to 1 A, with 0.02 A divisions (the Ohm's law brief). Its needle sits
 * a little above the scale, so reading it at an angle shifts the reading; it flickers by about a
 * fifth of a division; and its own resistance is 0.05 Ω.
 */
export const AMMETER: Readonly<InstrumentSpec & { resistance: number }> = {
  id: "ammeter",
  resolution: 0.02,
  unit: "A",
  pointerHeight: 0.02,
  noise: 0.004,
  scale: [0, 1],
  resistance: 0.05,
};

/** A moving-coil voltmeter, 0 to 3 V, with 0.05 V divisions and a resistance of 5 kΩ. */
export const VOLTMETER: Readonly<InstrumentSpec & { resistance: number }> = {
  id: "voltmeter",
  resolution: 0.05,
  unit: "V",
  pointerHeight: 0.05,
  noise: 0.01,
  scale: [0, 3],
  resistance: 5000,
};
