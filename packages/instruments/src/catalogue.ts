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
