"use client";
// Whether this person may use AI now (ADR 0043, GET /ai/status). Asked once when the lab opens,
// off the lab's critical path: until the answer comes, and whenever the API cannot be reached,
// AI is simply not offered and the lab works as it always does.
import { createApi, type AiStatus, type FeatureName } from "@pa/api-client";
import { useEffect, useState } from "react";

const api = createApi();

export function useAiStatus(): AiStatus | undefined {
  const [status, setStatus] = useState<AiStatus>();
  useEffect(() => {
    let live = true;
    void api.ai.status().then((result) => {
      if (live && result.ok) setStatus(result.data);
    });
    return () => {
      live = false;
    };
  }, []);
  return status;
}

export const canUse = (status: AiStatus | undefined, feature: FeatureName) =>
  status?.available === true && status.features.includes(feature);
