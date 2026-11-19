"use client";
// Whether this person may use AI now (ADR 0043, GET /ai/status). Asked once when the lab opens,
// off the lab's critical path: until the answer comes, and whenever the API cannot be reached,
// AI is simply not offered and the lab works as it always does.
//
// A plain fetch, not the API client: the client would add to the lab's first download, and the
// lab is at its JavaScript budget (e2e performance.spec.ts). The tutor panel, loaded only when
// its tab opens, uses the client.
import type { AiStatus, FeatureName } from "@pa/api-client";
import { useEffect, useState } from "react";

function isStatus(value: unknown): value is AiStatus {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.available === "boolean" && Array.isArray(v.features);
}

export function useAiStatus(): AiStatus | undefined {
  const [status, setStatus] = useState<AiStatus>();
  useEffect(() => {
    const stop = new AbortController();
    fetch("/api/ai/status", { credentials: "include", signal: stop.signal })
      .then((r) => (r.ok ? r.json() : undefined))
      .then((body: unknown) => {
        if (isStatus(body)) setStatus(body);
      })
      .catch(() => undefined); // offline, or no API to ask: no AI, nothing to show
    return () => stop.abort();
  }, []);
  return status;
}

export const canUse = (status: AiStatus | undefined, feature: FeatureName) =>
  status?.available === true && status.features.includes(feature);

/** The line for a feature this person has used up today (docs/content/ai-quotas-brief.md). */
export const usedUp = (status: AiStatus | undefined, feature: FeatureName) =>
  status?.used_up?.[feature];

/** Why a feature cannot be used now, in a sentence to show, if the API gave one. */
export const whyNot = (status: AiStatus | undefined, feature: FeatureName) =>
  usedUp(status, feature) ?? status?.message ?? undefined;
