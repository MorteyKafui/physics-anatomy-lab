"use client";

// Anonymous usage counts (ADR 0048): the lab's one door to @pa/usage. Each call returns at once
// and never throws, so the lab never waits for it (AGENTS.md rule 5).
import { startUsage, trackAll, trackUsage, usageFromLabEvents, type UsageInput } from "@pa/usage";

import { version } from "../../../package.json";

const OPTIONS = {
  endpoint: "/api/usage/events",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? version,
};

const viewed = new Set<string>();

export function countUsage(input: UsageInput) {
  startUsage(OPTIONS);
  trackUsage(input);
}

/** An experiment opened: once per experiment per page load, whichever of its screens opens. */
export function countView(attempt: { experimentId: string; mode: string }) {
  if (viewed.has(attempt.experimentId)) return;
  viewed.add(attempt.experimentId);
  countUsage({ name: "experiment_viewed", experimentId: attempt.experimentId, mode: attempt.mode });
}

/** Steps finished, hints shown and attempts finished, from events the lab has just saved. */
export function countLabEvents(
  attempt: { experimentId: string; mode: string },
  events: readonly { kind: string; data?: unknown }[],
) {
  startUsage(OPTIONS);
  trackAll(usageFromLabEvents(attempt, events));
}
