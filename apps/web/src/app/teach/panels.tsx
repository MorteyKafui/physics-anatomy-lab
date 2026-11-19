"use client";

// Panels the approved board does not cover: a plain notice, and starting a live class. They are
// drafted in design/mockups/TeacherStart.dc.html for approval, built from packages/ui only.
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import "./titles";
import { Button } from "@pa/ui/components/button";
import { useState } from "react";

const k = (key: string) => key as MessageKey;

/** The experiments a live class can run: the labs that exist. */
export const LIVE_EXPERIMENTS = [
  "simple-pendulum",
  "ohms-law",
  "converging-lens",
  "converging-lens-pins",
  "method-of-mixtures",
  "method-of-mixtures-solid",
] as const;

export const FIELD =
  "h-9 border border-[var(--pa-line)] bg-[var(--pa-ink-950)] px-2 text-sm text-[var(--pa-text)] focus-visible:outline-2 focus-visible:outline-[var(--pa-accent)]";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--pa-ink-1000)] p-[14px] text-sm text-[var(--pa-text)]">
      <main className="mx-auto flex max-w-[640px] flex-col gap-4 border border-[var(--pa-ink-800)] bg-[var(--pa-ink-900)] p-6">
        {children}
      </main>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <p className="text-[var(--pa-text-soft)]">{children}</p>
    </Shell>
  );
}

export function StartPanel(props: {
  className: string;
  onStart: (experimentId: string, minutes: number) => Promise<string | null>;
}) {
  const [experiment, setExperiment] = useState<string>(LIVE_EXPERIMENTS[0]);
  const [minutes, setMinutes] = useState(40);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = (id: string) =>
    hasMessage(`experiments.${id}.title`) ? t(k(`experiments.${id}.title`)) : id;
  return (
    <Shell>
      <span className="text-[13px] text-[var(--pa-text-faint)]">{props.className}</span>
      <h1 className="text-[15px] font-medium">{t(k("teach.start.title"))}</h1>
      <p className="text-[var(--pa-text-soft)]">{t(k("teach.start.body"))}</p>
      <label className="flex flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
        {t(k("teach.start.experiment"))}
        <select
          className={FIELD}
          value={experiment}
          onChange={(e) => setExperiment(e.target.value)}
        >
          {LIVE_EXPERIMENTS.map((id) => (
            <option key={id} value={id}>
              {name(id)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
        {t(k("teach.start.minutes"))}
        <input
          className={`${FIELD} w-28 font-mono`}
          type="number"
          min={5}
          max={240}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-[var(--pa-danger-text)]">
          {error}
        </p>
      )}
      <div>
        <Button
          className="font-semibold"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void props.onStart(experiment, minutes).then((e) => {
              setError(e);
              setBusy(false);
            });
          }}
        >
          {t(k("teach.start.go"))}
        </Button>
      </div>
    </Shell>
  );
}
