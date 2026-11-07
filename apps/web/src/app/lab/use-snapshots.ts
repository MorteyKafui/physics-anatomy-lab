"use client";

import {
  decideSnapshot,
  EMPTY_SNAPSHOTS,
  replay,
  snapshotsProjection,
  type SnapshotCommand,
  type SnapshotsState,
} from "@pa/engine";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { AttemptHandle } from "./use-attempt";

/** A new snapshot's id. */
export const newSnapshotId = () => `snap-${globalThis.crypto.randomUUID().slice(0, 8)}`;

/**
 * The attempt's snapshots, and a way to change them. Commands sent one after another see each
 * other (the live copy), as with the table and the graph.
 */
export function useSnapshots(handle: AttemptHandle | undefined) {
  const state = useMemo(
    () => (handle ? replay(snapshotsProjection, handle.attempt, handle.events) : EMPTY_SNAPSHOTS),
    [handle],
  );
  const live = useRef<SnapshotsState>(EMPTY_SNAPSHOTS);
  const saving = useRef(0);
  useEffect(() => {
    if (saving.current === 0) live.current = state;
  }, [state]);

  const run = useCallback(
    async (command: SnapshotCommand) => {
      if (!handle) return false;
      const d = decideSnapshot(live.current, command);
      if (!d.ok) return false;
      live.current = d.events.reduce(
        (s, e) =>
          snapshotsProjection.apply(s, {
            ...e,
            id: "",
            attemptId: "",
            seq: 0,
            device: "",
            at: Date.now(),
          }),
        live.current,
      );
      saving.current += 1;
      try {
        await handle.record(d.events);
      } finally {
        saving.current -= 1;
      }
      return true;
    },
    [handle],
  );

  const now = useCallback(() => live.current, []);
  return { state, run, now };
}
