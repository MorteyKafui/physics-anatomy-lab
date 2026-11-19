// How big a run is and how often each device talks to the API. Every value can be overridden
// with `-e NAME=value` (docs/ops/load-testing.md). Times are in seconds.
//
// The rates follow the code that exists today:
// - sync: the engine's `syncAccount` pushes every event of each changed attempt (the server skips
//   the ones it holds), then pulls from its cursor (packages/engine/src/sync/sync.ts). The web app
//   does not call it on a timer yet, so SYNC_EVERY is an assumption: every 30 s while working.
// - live classes: a bench summary at most every 2 s and a heartbeat every 25 s (ADR 0041).

const PROFILES = {
  // A few minutes against the API on :8000 and the local PostgreSQL.
  smoke: {
    CLASSES: 4,
    LIVE_CLASSES: 4,
    STUDENTS: 100,
    RAMP_UP: 30,
    HOLD: 120,
    RAMP_DOWN: 30,
    LESSON: 60,
    EVENT_EVERY: 3,
    SYNC_EVERY: 10,
    BENCH_EVERY: 5,
    BROADCAST_EVERY: 10,
  },
  // The master plan's target: 10,000 concurrent students in 200 live classes (50 each; the plan
  // allows up to 60). Run on staging only (docs/ops/load-testing.md).
  full: {
    CLASSES: 200,
    LIVE_CLASSES: 200,
    STUDENTS: 10000,
    RAMP_UP: 600,
    HOLD: 1800,
    RAMP_DOWN: 120,
    LESSON: 600,
    EVENT_EVERY: 10,
    SYNC_EVERY: 30,
    BENCH_EVERY: 5,
    BROADCAST_EVERY: 30,
  },
};

const NUMBERS = Object.keys(PROFILES.smoke);

export function profile() {
  const name = __ENV.PROFILE || "smoke";
  const base = PROFILES[name];
  if (!base) throw new Error(`Unknown PROFILE ${name}: use smoke or full.`);
  const out = { name };
  for (const key of NUMBERS) {
    const value = __ENV[key] === undefined ? base[key] : Number(__ENV[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a number.`);
    out[key] = value;
  }
  if (out.LIVE_CLASSES > out.CLASSES) throw new Error("LIVE_CLASSES must be at most CLASSES.");
  return out;
}

export const API_URL = (__ENV.API_URL || "http://localhost:8000").replace(/\/$/, "");
export const WS_URL = API_URL.replace(/^http/, "ws");
// The API refuses changes and sockets from any other origin (ADR 0038, ADR 0041).
export const WEB_ORIGIN = __ENV.WEB_ORIGIN || "http://localhost:3000";
// Locally only: the header named by the API's CLIENT_IP_HEADER, so each teacher signs in from
// an address of its own (docs/ops/load-testing.md, "Rate limits"). Unset on staging.
export const ADDRESS_HEADER = __ENV.ADDRESS_HEADER || "";

// Real experiment ids, so live sessions and attempts look like the lab's.
export const EXPERIMENTS = ["simple-pendulum", "ohms-law", "converging-lens", "method-of-mixtures"];
