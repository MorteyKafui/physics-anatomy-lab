// @pa/instruments: the measurement layer. Seeded noise, least count, zero error, parallax and
// human reaction time. Harvested from Physics Bench (docs/planning/harvest-review.md).
export { createRng, gaussian, newSeed, substream, uniform, withTolerance } from "./random";
export type { Rng } from "./random";
export { actualConditions, DEFAULT_ENVIRONMENT } from "./conditions";
export type { Conditions, Environment } from "./conditions";
export { classifySlip, parallaxShift, quantise, takeReading } from "./reading";
export type { InstrumentSpec, Reading, TranscriptionSlip } from "./reading";
export { ANTICIPATED_EVENT, handTimedInterval, pressDelay } from "./timing";
export type { ReactionTime } from "./timing";
export { AMMETER, METRE_RULE, STOPWATCH, THERMOMETER, VOLTMETER } from "./catalogue";
