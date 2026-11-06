import { gaussian, type Rng } from "./random";

/**
 * Hand timing with a stopwatch. A person presses start a little after the event they watch for,
 * and stop a little after the second event. Each delay varies from press to press. The recorded
 * interval is therefore
 *
 *   recorded = true interval + stop delay − start delay
 *
 * The mean delays cancel, so hand timing is unbiased, but its spread is √2 × the spread of one
 * delay. Timing many swings at once (20 oscillations) divides that spread by the count, which is
 * why practical manuals ask for it.
 *
 * The default figures are model assumptions for a student timing a swinging pendulum at a
 * fiducial mark, where the event can be anticipated. They need a physics reviewer's approval and
 * a check against classroom data before they drive feedback.
 */
export interface ReactionTime {
  /** Mean delay between the event and the press, s. */
  meanDelay: number;
  /** Spread of one delay, 1σ, s. */
  delaySd: number;
}

export const ANTICIPATED_EVENT: Readonly<ReactionTime> = { meanDelay: 0.15, delaySd: 0.05 };

/** One press: never earlier than the event, since a press cannot come before what it reacts to. */
export function pressDelay(rng: Rng, reaction: ReactionTime): number {
  return Math.max(0, gaussian(rng, reaction.meanDelay, reaction.delaySd));
}

/** The interval a person records for a true interval, before the display rounds it. */
export function handTimedInterval(rng: Rng, trueInterval: number, reaction: ReactionTime): number {
  const start = pressDelay(rng, reaction);
  const stop = pressDelay(rng, reaction);
  return trueInterval + stop - start;
}
