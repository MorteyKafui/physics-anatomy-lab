"use client";

// A real live class: the board reads the snapshot from the API, then listens on the teacher's
// socket and applies each frame. It reads the snapshot again on `resync`, after a reconnect, and
// once a minute (to correct who is here if a container went away without saying so).
import {
  createApi,
  LiveSocket,
  liveSocketUrl,
  type ClassOut,
  type LiveSnapshot,
  type TeacherFrame,
} from "@pa/api-client";
import { guidedProjection, replay, type LabEvent } from "@pa/engine";
import { simplePendulum } from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import "../titles";
import { Button } from "@pa/ui/components/button";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LiveBoard, type BoardActions, type Outcome } from "../board";
import type { ReadingRow } from "../example";
import { applyFrame } from "../model";
import { Notice, StartPanel } from "../panels";

const api = createApi();
const k = (key: string) => key as MessageKey;
const REFRESH_MS = 60_000;
const MAX_EVENT_PAGES = 4;

export function experimentName(id: string) {
  const name = `experiments.${id}.title`;
  return hasMessage(name) ? t(k(name)) : id;
}

type Load =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "not-found" }
  | { state: "ready"; cls: ClassOut };

export function LiveClass() {
  const classId = useSearchParams().get("class") ?? "";
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [waiting, setWaiting] = useState(false);
  const [offset, setOffset] = useState(0); // server clock minus this device's clock

  const refresh = useCallback(async () => {
    const got = await api.live.get(classId);
    if (got.ok) {
      setOffset(new Date(got.data.server_time).getTime() - Date.now());
      setSnapshot(got.data);
    }
  }, [classId]);

  useEffect(() => {
    let live = true;
    void (async () => {
      const me = await api.auth.me();
      if (!live) return;
      if (!me.ok || me.data.kind !== "teacher") return setLoad({ state: "signed-out" });
      const cls = await api.classes.get(classId);
      if (!live) return;
      if (!cls.ok) return setLoad({ state: "not-found" });
      setLoad({ state: "ready", cls: cls.data });
      await refresh();
    })();
    return () => {
      live = false;
    };
  }, [classId, refresh]);

  // The socket, once the class is known to be the teacher's.
  const ready = load.state === "ready";
  useEffect(() => {
    if (!ready) return;
    const socket = new LiveSocket<TeacherFrame>({
      url: liveSocketUrl(`/live/classes/${encodeURIComponent(classId)}/teacher`, window.location),
      onOpen: () => void refresh(),
      onStatus: (status) => setWaiting(status === "waiting"),
      onFrame: (frame) => {
        setSnapshot((s) => {
          if (s === null) return s;
          const next = applyFrame(s, frame);
          if (next === "resync") {
            void refresh();
            return s;
          }
          return next;
        });
      },
    });
    socket.start();
    const again = setInterval(() => void refresh(), REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      socket.stop();
      clearInterval(again);
      clearInterval(tick);
    };
  }, [ready, classId, refresh]);

  const actions = useMemo<BoardActions>(() => {
    const outcome = <T,>(r: { ok: true; data: T } | { ok: false; detail: string }) =>
      r.ok ? null : ({ ok: false, detail: r.detail } as const);
    const keep = (message: LiveSnapshot["messages"][number]) =>
      setSnapshot((s) =>
        s && !s.messages.some((m) => m.id === message.id)
          ? { ...s, messages: [...s.messages, message] }
          : s,
      );
    return {
      pushHint: async (rule, key): Promise<Outcome> => {
        const r = await api.live.pushHint(classId, rule, key);
        if (!r.ok) return { ok: false, detail: r.detail };
        keep(r.data);
        return {
          ok: true,
          count: r.data.to_member_ids?.length ?? 0,
          undo: () => api.live.undo(classId, r.data.id),
        };
      },
      setLock: async (locked): Promise<Outcome> => {
        const r = await api.live.lock(classId, locked);
        if (!r.ok) return { ok: false, detail: r.detail };
        setSnapshot((s) => (s ? { ...s, session: r.data } : s));
        return { ok: true, undo: () => api.live.lock(classId, !locked) };
      },
      broadcast: async (text): Promise<Outcome> => {
        const r = await api.live.broadcast(classId, text);
        if (r.ok) keep(r.data);
        return outcome(r) ?? { ok: true, undo: () => api.live.undo(classId, r.ok ? r.data.id : 0) };
      },
      note: async (memberId, text): Promise<Outcome> => {
        const r = await api.live.note(classId, memberId, text);
        if (r.ok) keep(r.data);
        return outcome(r) ?? { ok: true, undo: () => api.live.undo(classId, r.ok ? r.data.id : 0) };
      },
      readings: (card) => readingsOf(classId, card.bench),
    };
  }, [classId]);

  if (load.state === "loading") return <Notice>{" "}</Notice>;
  if (load.state === "signed-out") return <Notice>{t(k("teach.signedOut"))}</Notice>;
  if (load.state === "not-found") return <Notice>{t(k("teach.notFound"))}</Notice>;
  if (snapshot === null) return <Notice>{" "}</Notice>;
  if (snapshot.session === null)
    return (
      <StartPanel
        className={load.cls.name}
        onStart={async (experimentId, minutes) => {
          const r = await api.live.start(classId, {
            experiment_id: experimentId,
            lesson_minutes: minutes,
          });
          if (r.ok) await refresh();
          return r.ok ? null : r.detail;
        }}
      />
    );

  return (
    <LiveBoard
      className={load.cls.name}
      code={load.cls.code}
      experimentName={experimentName(snapshot.session.experiment_id)}
      example={false}
      snapshot={snapshot}
      now={now + offset}
      actions={actions}
      banner={waiting ? t(k("teach.connection.waiting")) : null}
      endSlot={
        <Button
          variant="outline"
          className="h-8 text-[13px]"
          onClick={() => void api.live.end(classId).then(() => refresh())}
        >
          {t(k("teach.end"))}
        </Button>
      }
    />
  );
}

/** A bench's readings, rebuilt from its attempt's events with the engine's own projection. The
 * table is the pendulum's; other experiments show how many readings there are. */
async function readingsOf(
  classId: string,
  bench: LiveSnapshot["benches"][number],
): Promise<ReadingRow[] | number | null> {
  if (bench.attempt_id === null) return null;
  const attempts = await api.teacher.attempts(classId);
  if (!attempts.ok) return bench.readings;
  const found = attempts.data.find(
    (a) => a.member_id === bench.member_id && a.client_id === bench.attempt_id,
  );
  if (!found || found.experiment_id !== simplePendulum.id) return bench.readings;
  const events: LabEvent[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    const got = await api.teacher.events(classId, found.id, after);
    if (!got.ok) return bench.readings;
    events.push(...(got.data.events as unknown as LabEvent[]));
    after = got.data.cursor;
    if (!got.data.more) break;
  }
  const state = replay(
    guidedProjection,
    {
      id: found.client_id,
      experimentId: found.experiment_id,
      mode: found.mode,
      seed: 0,
      createdAt: found.created_at,
      updatedAt: found.updated_at,
      formatVersion: 1,
    },
    events,
  );
  return state.readings.flatMap((r) => {
    const d = r.data as { l?: unknown; t?: unknown; countedFromOne?: unknown } | null;
    if (typeof d?.l !== "number" || typeof d.t !== "number") return [];
    return [{ l: d.l, t: d.t, T: d.t / simplePendulum.swings, off: d.countedFromOne === true }];
  });
}
