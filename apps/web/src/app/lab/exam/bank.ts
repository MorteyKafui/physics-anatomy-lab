"use client";
// Approved questions from the question bank in exam mode (docs/content/ai-questions-brief.md,
// decision 5): up to three after the built-in follow-ups, picked by the attempt's seed so a run
// always shows the same ones.
//
// Offline first (rule 5): the device keeps the last list it fetched, and an exam with no
// connection uses that, or only the built-in questions. Nothing waits on the fetch.
import { useEffect, useMemo, useState } from "react";

export const BANK_PER_EXAM = 3;

export interface BankQuestion {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly marks: number;
}

const key = (experimentId: string) => `pa:bank:${experimentId}`;

function isBank(value: unknown): value is BankQuestion[] {
  return (
    Array.isArray(value) &&
    value.every(
      (q) =>
        typeof q === "object" &&
        q !== null &&
        typeof (q as BankQuestion).id === "string" &&
        typeof (q as BankQuestion).question === "string" &&
        typeof (q as BankQuestion).answer === "string" &&
        typeof (q as BankQuestion).marks === "number",
    )
  );
}

function kept(experimentId: string): BankQuestion[] {
  try {
    const raw = window.localStorage.getItem(key(experimentId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return isBank(parsed) ? parsed : [];
  } catch {
    return []; // storage blocked or damaged: the built-in questions still show
  }
}

/** A seeded pick of `n` from `list`, the same for the same seed. */
export function pick<T>(list: readonly T[], seed: number, n: number): T[] {
  const out = [...list];
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0; // a plain LCG: enough to vary the order
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.slice(0, n);
}

export function useBankQuestions(experimentId: string, seed: number | undefined) {
  // The kept list first (the screen shows questions only after the attempt loads from the
  // device, so this never differs from what the server drew), then a fresh one when online.
  const [bank, setBank] = useState<BankQuestion[]>(() =>
    typeof window === "undefined" ? [] : kept(experimentId),
  );
  useEffect(() => {
    const stop = new AbortController();
    fetch(`/api/questions/approved?experiment_id=${encodeURIComponent(experimentId)}`, {
      signal: stop.signal,
    })
      .then((r) => (r.ok ? r.json() : undefined))
      .then((body: unknown) => {
        if (!isBank(body)) return;
        setBank(body);
        try {
          window.localStorage.setItem(key(experimentId), JSON.stringify(body));
        } catch {
          // Storage blocked: the list lasts for this visit.
        }
      })
      .catch(() => undefined); // offline: the kept list stands
    return () => stop.abort();
  }, [experimentId]);
  return useMemo(() => (seed === undefined ? [] : pick(bank, seed, BANK_PER_EXAM)), [bank, seed]);
}
