"use client";

// The example class: the live board with example data, labelled "Example class" (D29). Hints,
// locks and messages change only this page; nothing is sent anywhere.
import type { LiveSnapshot } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/teach";
import { useEffect, useMemo, useRef, useState } from "react";

import { LiveBoard, type BoardActions } from "../board";
import {
  EXAMPLE_CLASS,
  exampleHint,
  exampleKind,
  exampleReadings,
  exampleSnapshot,
} from "../example";

export function ExampleBoard() {
  const [now, setNow] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(() => exampleSnapshot(now));
  const current = useRef(snapshot);
  useEffect(() => {
    current.current = snapshot;
  }, [snapshot]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const actions = useMemo<BoardActions>(() => {
    let nextId = 1;
    const undoMessage = (id: number) => async () =>
      setSnapshot((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === id ? { ...m, undone_at: new Date().toISOString() } : m,
        ),
      }));
    return {
      pushHint: async (rule, key) => {
        const id = nextId++;
        const to = current.current.benches
          .filter((b) => b.here && b.mistakes.some((m) => m.rule === rule))
          .map((b) => b.member_id);
        setSnapshot((s) => ({
          ...s,
          messages: [...s.messages, exampleHint(id, rule, key, to, Date.now())],
        }));
        return { ok: true, undo: undoMessage(id), count: to.length };
      },
      setLock: async (locked) => {
        const flip = (v: boolean) =>
          setSnapshot((s) =>
            s.session ? { ...s, session: { ...s.session, steps_locked: v } } : s,
          );
        flip(locked);
        return { ok: true, undo: async () => flip(!locked) };
      },
      broadcast: async () => ({ ok: true }),
      note: async () => ({ ok: true }),
      readings: async (card) => exampleReadings(exampleKind(card.bench)),
    };
  }, []);

  return (
    <LiveBoard
      className={EXAMPLE_CLASS.name}
      code={EXAMPLE_CLASS.code}
      experimentName={t("experiments.simple-pendulum.title")}
      example
      snapshot={snapshot}
      now={now}
      actions={actions}
      banner={t("teach.example.note")}
    />
  );
}
