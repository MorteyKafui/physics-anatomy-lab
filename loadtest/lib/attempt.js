// One student's attempt on one device, and its sync, the way packages/engine does it: the device
// records events, then `syncAccount` pushes every event of the changed attempt (the server skips
// the ones it holds) and pulls from its cursor. Event ids the API accepted are remembered, and
// every one must come back in a pull: that is "zero synced events lost".

import { check } from "k6";
import { Counter } from "k6/metrics";
import * as api from "./api.js";

export const eventsLost = new Counter("sync_events_lost");
export const eventsAccepted = new Counter("sync_events_accepted");

// Kinds the lab records (packages/engine), in a plausible order for a measuring stage.
const KINDS = ["step.go-to", "run.start", "table.cell", "table.cell", "table.row-add"];

function randomId() {
  // Unique enough for a test run; the lab uses crypto.randomUUID().
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function newDevice() {
  return { id: `load-${randomId()}`, cursor: null };
}

export class Attempt {
  /** `device` is the VU's device: its id and pull cursor outlive any one attempt. */
  constructor(experimentId, device) {
    const now = Date.now();
    this.device = device;
    this.header = {
      id: `attempt-${randomId()}`,
      experimentId,
      mode: "guided",
      seed: Math.floor(Math.random() * 2 ** 31),
      createdAt: now,
      updatedAt: now,
      formatVersion: 1,
    };
    this.events = [];
    this.pushedCount = 0;
    this.accepted = new Set();
    this.seen = new Set();
  }

  record() {
    const seq = this.events.length + 1;
    const kind = KINDS[seq % KINDS.length];
    const at = Date.now();
    const data =
      kind === "step.go-to"
        ? { step: "measure" }
        : { row: Math.floor(seq / 3), column: seq % 3, value: (Math.random() * 10).toFixed(2) };
    this.events.push({
      id: `event-${randomId()}`,
      attemptId: this.header.id,
      seq,
      device: this.device.id,
      at,
      kind,
      data,
    });
    this.header.updatedAt = at;
  }

  /** Push if anything changed, then pull everything new. Returns false if the sync stopped. */
  sync() {
    if (this.events.length > this.pushedCount) {
      const events = this.events.slice();
      const pushed = api.push([{ attempt: this.header, events }]);
      const ok = check(pushed, {
        "push accepted": (r) => r.status === 200 && r.json("attempts.0.status") === "ok",
      });
      if (!ok) return false;
      for (const e of events) this.accepted.add(e.id);
      eventsAccepted.add(events.length - this.pushedCount);
      this.pushedCount = events.length;
    }
    let more = true;
    while (more) {
      const page = api.pull(this.device.cursor);
      if (!check(page, { "pull answered": (r) => r.status === 200 })) return false;
      const body = page.json();
      for (const e of body.events) if (e.attemptId === this.header.id) this.seen.add(e.id);
      this.device.cursor = body.cursor;
      more = body.more;
    }
    return true;
  }

  /** At the end of a lesson: one last sync, then count accepted events no pull returned. */
  finish() {
    this.sync();
    let lost = 0;
    for (const id of this.accepted) if (!this.seen.has(id)) lost += 1;
    eventsLost.add(lost);
  }
}
