"use client";

import {
  coachProjection,
  decide,
  replay,
  STEPS,
  type Attempt,
  type Command,
  type LabEvent,
  type NewEvent,
  type Step,
} from "@pa/engine";
import { simplePendulum } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { cn, Logo } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@pa/ui/components/dialog";
import { CheckIcon, LockIcon, PlayIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Rich } from "./parts";
import { redoableSteps, reviewRun, type ReviewMistake, type RunReview } from "./run-review";
import { appendTo, currentRunId, listRuns, startRun } from "./use-attempt";
import { WatchBoth } from "./watch-both";

const E = simplePendulum;
const G = DEFAULT_ENVIRONMENT.g;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

interface Run {
  attempt: Attempt;
  events: LabEvent[];
  review: RunReview;
  n: number;
}

const signed = (p: number) => `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)}%`;

/** The words for what a mistake did to g. */
function effectText(m: ReviewMistake) {
  if (!m.stillIn || m.effect.kind === "none") return t("review.effect.none");
  if (m.effect.kind === "raised")
    return t("review.effect.raised", { percent: Math.round(m.effect.percent) });
  return t(`review.effect.unknown.${m.effect.skill}` as MessageKey);
}

/**
 * The review at the end of a run, with Compare and every run (approved board Review.dc.html):
 * the result, every mistake with what it did to g, redo from any step, and two runs side by side.
 */
export function ReviewScreen() {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>();
  const [chosen, setChosen] = useState<string>();
  const [mode, setMode] = useState<"run" | "right">("run");
  const [redoStep, setRedoStep] = useState<Step>();
  const [confirm, setConfirm] = useState(false);
  const [watching, setWatching] = useState(false);
  const [toast, setToast] = useState<string>();

  const load = useCallback(async () => {
    const all = await listRuns(E.id);
    setRuns(
      all.map(({ attempt, events }, i) => ({
        attempt,
        events,
        review: reviewRun(attempt, events, G),
        n: i + 1,
      })),
    );
  }, []);
  useEffect(() => {
    let cancelled = false;
    void listRuns(E.id).then((all) => {
      if (cancelled) return;
      setRuns(
        all.map(({ attempt, events }, i) => ({
          attempt,
          events,
          review: reviewRun(attempt, events, G),
          n: i + 1,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const current = useMemo(() => currentRunId(E.id), []);
  if (!runs) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground"
        aria-busy="true"
      >
        {t("lab.loading")}
      </main>
    );
  }

  const run =
    runs.find((r) => r.attempt.id === chosen) ??
    runs.find((r) => r.attempt.id === current) ??
    runs.at(-1);
  if (!run) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
        <p>{t("review.noResult")}</p>
        <Link href={`/lab/${E.id}`} className="underline">
          {t("review.back")}
        </Link>
      </main>
    );
  }
  const r = run.review;
  const other = runs[run.n - 2] ?? runs[run.n];
  const against = mode === "run" && other ? other : undefined;
  const firstToFix = r.mistakes.find((m) => m.stillIn)?.redoFrom;
  const redoable = redoableSteps(run.events);
  const from =
    redoStep && redoable.includes(redoStep) ? redoStep : (firstToFix ?? redoable.at(-1)!);
  const nextN = runs.length + 1;
  const originN = (id: string | undefined) => runs.find((x) => x.attempt.id === id)?.n;

  const record = async (commands: Command[]) => {
    const news: NewEvent[] = [];
    let state = replay(coachProjection, run.attempt, run.events);
    for (const c of commands) {
      const d = decide(state, c);
      if (!d.ok) break;
      news.push(...d.events);
      state = d.events.reduce(
        (s, e) =>
          coachProjection.apply(s, { ...e, id: "", attemptId: "", seq: 0, device: "", at: 0 }),
        state,
      );
    }
    if (news.length) await appendTo(run.attempt.id, news);
  };

  const markRead = async () => {
    await record([{ type: "read-feedback" }, { type: "reveal-accepted-value" }]);
    await load();
    setToast(t("review.opened"));
  };

  const redo = async () => {
    const started = await startRun(run.attempt, run.events, from);
    setConfirm(false);
    if (started) router.push(`/lab/${E.id}`);
  };

  // Compare: this run beside another, or beside the same bench done the right way.
  const length = r.readings[0]?.l ?? E.length;
  const at = (x: RunReview) => x.readings.find((rd) => rd.l === length) ?? x.readings[0];
  const thread = (x: RunReview) =>
    t(
      `compare.thread.${x.assembly.thread === "cork" ? "cork" : x.assembly.thread === "clamp-arm" ? "clamp-arm" : "none"}` as MessageKey,
    );
  const counting = (x: RunReview) => {
    const n = x.readings.filter((rd) => rd.countedFromOne).length;
    if (x.readings.length === 0) return t("compare.none");
    if (n === 0) return t("compare.counting.fromZero");
    if (n === x.readings.length) return t("compare.counting.fromOne");
    return t("compare.counting.mixed", { n, total: x.readings.length });
  };
  const tOf = (x: RunReview) => {
    const rd = at(x);
    return rd ? `${rd.t.toFixed(2)} s` : t("compare.none");
  };
  const TOf = (x: RunReview) => {
    const rd = at(x);
    return rd ? `${(rd.t / E.swings).toFixed(3)} s` : t("compare.none");
  };
  const off = (g: number | undefined) =>
    g === undefined ? t("compare.none") : signed((g / G - 1) * 100);
  const col = (x: RunReview) => [
    thread(x),
    counting(x),
    tOf(x),
    TOf(x),
    x.slope?.text ?? t("compare.none"),
    x.g?.text ?? t("compare.none"),
    off(x.g?.value),
  ];
  const right = r.right;
  const rightCol = [
    t("compare.thread.cork"),
    t("compare.counting.fromZero"),
    `${right.t.toFixed(2)} s`,
    `${right.T.toFixed(3)} s`,
    `${Number(right.slope.toPrecision(3))} s² m⁻¹`,
    `${Number(right.g.toPrecision(3))} m s⁻²`,
    off(right.g),
  ];
  const labels = [
    t("compare.row.thread"),
    t("compare.row.counting"),
    t("compare.row.t", { swings: E.swings, length: length.toFixed(3) }),
    t("compare.row.T", { length: length.toFixed(3) }),
    t("compare.row.slope"),
    t("compare.row.g"),
    t("compare.row.against"),
  ];
  const a = col(r);
  const b = against ? col(against.review) : rightCol;
  const countingDiffers = a[1] !== b[1];

  const seg = (on: boolean) =>
    cn(
      "h-8 px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-ring",
      on ? "bg-foreground text-background" : "bg-transparent text-soft",
    );

  const cell = (run: Run, s: Step) => {
    const i = STEPS.indexOf(s);
    const origin = run.review.origin;
    if (origin && i < STEPS.indexOf(origin.from))
      return { kind: "kept", note: t("runs.kept", { n: originN(origin.of) ?? "?" }) };
    if (run.review.state.completed.includes(s)) return { kind: "done", note: t("runs.done") };
    const frontierStep = STEPS.find((x) => !run.review.state.completed.includes(x));
    if (s === frontierStep) return { kind: "next", note: t("runs.next") };
    return { kind: "todo", note: t("runs.todo") };
  };

  const kept =
    STEPS.indexOf(from) > 0
      ? STEPS.indexOf(from) === 1
        ? stepName(STEPS[0]!)
        : t("runs.keptRange", {
            first: stepName(STEPS[0]!),
            last: stepName(STEPS[STEPS.indexOf(from) - 1]!),
          })
      : undefined;

  return (
    <main className="flex min-h-dvh flex-col gap-3.5 bg-[var(--pa-ink-1000)] p-3.5 text-foreground">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border border-border bg-[var(--pa-ink-900)] px-4 py-3">
        <Link
          href="/"
          aria-label={t("lab.rail.home")}
          className="flex size-[30px] items-center justify-center bg-foreground text-background"
        >
          <Logo size={20} />
        </Link>
        <nav
          aria-label={t("review.back")}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Link href={`/lab/${E.id}`} className="hover:text-foreground">
            {t("experiments.simple-pendulum.title")}
          </Link>
          <span aria-hidden>›</span>
          <h1 className="text-foreground" aria-current="page">
            {t("review.title")}
          </h1>
        </nav>
        <span className="border border-input px-2 py-0.5 text-xs text-soft">
          {runs.length === 1 ? t("review.runs.one") : t("review.runs", { count: runs.length })}
        </span>
        <span className="flex-1" />
        <Link
          href={`/lab/${E.id}`}
          className="flex h-8 items-center border border-input px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t("review.back")}
        </Link>
      </header>

      <div className="flex flex-wrap items-stretch gap-3.5">
        {/* Review */}
        <section
          aria-label={t("review.title")}
          className="flex min-w-0 flex-[999_1_620px] flex-col border border-border bg-[var(--pa-ink-900)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-medium">{t("review.title")}</h2>
            {runs.length > 1 && (
              <span
                role="group"
                aria-label={t("review.runGroup")}
                className="flex border border-input"
              >
                {runs.map((x) => (
                  <button
                    key={x.attempt.id}
                    type="button"
                    aria-pressed={x === run}
                    onClick={() => setChosen(x.attempt.id)}
                    className={seg(x === run)}
                  >
                    {t("review.run", { n: x.n })}
                  </button>
                ))}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-4 p-4">
            {/* Result */}
            <div className="flex flex-wrap items-end gap-x-7 gap-y-3 border border-input bg-background px-4 py-3.5">
              {r.g ? (
                <>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{t("review.gLabel")}</span>
                    <span className="font-mono text-[26px] font-medium">{r.g.text}</span>
                  </span>
                  {r.slope && (
                    <span className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        {t("review.slopeLabel")}
                      </span>
                      <span className="font-mono text-base">{r.slope.text}</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-soft">{t("review.noResult")}</span>
              )}
              <span className="flex-1" />
              {r.state.acceptedValueShown ? (
                <span className="flex flex-col gap-0.5 text-right">
                  <span className="text-xs text-muted-foreground">{t("review.accepted")}</span>
                  <span className="font-mono text-base">
                    {G.toFixed(2)} m s⁻²
                    {r.g && (
                      <span
                        className={cn(
                          "ml-1.5 text-[13px]",
                          Math.abs(r.g.value / G - 1) > 0.05 ? "text-warn" : "text-ok",
                        )}
                      >
                        {signed((r.g.value / G - 1) * 100)}
                      </span>
                    )}
                  </span>
                </span>
              ) : (
                <span className="max-w-60 text-right text-xs text-muted-foreground">
                  {t("review.acceptedHidden")}
                </span>
              )}
            </div>

            {/* Mistakes */}
            <div className="flex flex-col gap-2.5">
              <h3 className="text-sm font-semibold">{t("review.mistakes")}</h3>
              {r.mistakes.map((m) => (
                <div
                  key={m.rule}
                  className={cn(
                    "flex flex-col gap-2 border px-3.5 py-3",
                    m.stillIn ? "border-warn bg-warn-wash" : "border-input bg-background",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="border border-input px-[7px] py-px text-xs text-soft">
                      {t("review.step", { n: STEPS.indexOf(m.step) + 1, step: stepName(m.step) })}
                    </span>
                    <span
                      className={cn(
                        "border px-[7px] py-px text-xs",
                        m.stillIn ? "border-warn text-warn" : "border-ok text-ok",
                      )}
                    >
                      {m.stillIn ? t("review.stillIn") : t("review.putRight")}
                    </span>
                  </div>
                  <span className="font-semibold">{msg(`${m.key}.title`, m.params)}</span>
                  <span className="text-soft">
                    <Rich text={msg(`${m.key}.detail`, m.params)} />
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t("review.effectLabel")}
                    </span>
                    <span className="font-mono text-[13px]">{effectText(m)}</span>
                  </span>
                  {m.stillIn && redoable.includes(m.redoFrom) && (
                    <Button
                      className="h-[34px] self-start bg-foreground font-semibold text-background hover:bg-soft"
                      onClick={() => {
                        setRedoStep(m.redoFrom);
                        setConfirm(true);
                      }}
                    >
                      {t("review.redo", { step: stepName(m.redoFrom) })}
                    </Button>
                  )}
                </div>
              ))}
              {r.mistakes.length === 0 && (
                <p className="flex items-center gap-2.5 border border-input px-3.5 py-3">
                  <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--pa-ok)] text-background">
                    <CheckIcon className="size-[11px]" strokeWidth={3.5} aria-hidden />
                  </span>
                  {t("review.clean")}
                </p>
              )}
            </div>
            {!r.state.feedbackRead &&
              (r.state.completed.includes("analyse") ? (
                <Button
                  className="h-[38px] self-start font-semibold"
                  onClick={() => void markRead()}
                >
                  {t("review.read")}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">{t("review.readFirst")}</p>
              ))}
          </div>
        </section>

        {/* Compare */}
        <aside
          aria-label={t("compare.title")}
          className="flex max-w-[520px] flex-[1_1_380px] flex-col border border-border bg-[var(--pa-ink-900)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-medium">{t("compare.title")}</h2>
            {!r.canCompare && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LockIcon className="size-[13px]" aria-hidden />
                {t("compare.locked")}
              </span>
            )}
          </div>
          {!r.canCompare ? (
            <div className="flex flex-col gap-3 px-4 py-5">
              <p>{t("compare.lockedBody")}</p>
              {(
                [
                  [r.state.completed.includes("analyse"), t("compare.analyse"), 1],
                  [r.state.feedbackRead, t("compare.readFeedback"), 2],
                ] as const
              ).map(([done, label, n]) => (
                <span key={n} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-[22px] items-center justify-center border-[1.5px] font-mono text-xs",
                      done ? "border-ok text-ok" : "border-primary",
                    )}
                  >
                    {done ? (
                      <CheckIcon
                        className="size-3"
                        strokeWidth={3}
                        aria-label={t("lab.coach.done")}
                      />
                    ) : (
                      n
                    )}
                  </span>
                  <span className={done ? "text-muted-foreground" : undefined}>{label}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 px-4 py-3.5">
              <span
                role="group"
                aria-label={t("compare.group")}
                className="flex flex-wrap self-start border border-input"
              >
                {other && (
                  <button
                    type="button"
                    aria-pressed={mode === "run"}
                    onClick={() => setMode("run")}
                    className={seg(mode === "run")}
                  >
                    {t("compare.withRun", { a: run.n, b: other.n })}
                  </button>
                )}
                <button
                  type="button"
                  aria-pressed={mode === "right" || !other}
                  onClick={() => setMode("right")}
                  className={seg(mode === "right" || !other)}
                >
                  {t("compare.withRight", { a: run.n })}
                </button>
              </span>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-input">
                      <th
                        scope="col"
                        className="py-1.5 pr-2 text-left font-medium text-muted-foreground"
                      >
                        <span className="sr-only">{t("compare.title")}</span>
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-left font-semibold">
                        {t("review.run", { n: run.n })}
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-left font-semibold">
                        {against ? t("review.run", { n: against.n }) : t("compare.rightWay")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((label, i) => {
                      const parts = a[i] !== b[i];
                      return (
                        <tr key={label} className="border-b border-border">
                          <th
                            scope="row"
                            className="py-[7px] pr-2 text-left font-normal text-muted-foreground"
                          >
                            {label}
                          </th>
                          <td
                            className={cn(
                              "px-2 py-[7px] font-mono",
                              parts && "text-warn shadow-[inset_3px_0_0_var(--pa-warn)]",
                            )}
                          >
                            {a[i]}
                          </td>
                          <td className="px-2 py-[7px] font-mono">{b[i]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">{t("compare.hint")}</p>
              {countingDiffers && (
                <Button
                  variant="outline"
                  className="h-[38px] gap-2 self-start"
                  onClick={() => setWatching(true)}
                >
                  <PlayIcon fill="currentColor" aria-hidden />
                  {t("compare.watch")}
                </Button>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Runs */}
      <section
        aria-label={t("runs.title")}
        className="flex flex-col border border-border bg-[var(--pa-ink-900)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-medium">{t("runs.title")}</h2>
          <span className="text-xs text-muted-foreground">{t("runs.hint")}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[980px] flex-col gap-2 px-4 pt-3.5 pb-4">
            {runs.map((x) => (
              <div key={x.attempt.id} className="flex items-stretch gap-1">
                <span className="flex flex-[0_0_64px] items-center text-[13px] font-semibold">
                  {t("review.run", { n: x.n })}
                </span>
                {STEPS.map((s) => {
                  const c = cell(x, s);
                  return (
                    <span
                      key={s}
                      className={cn(
                        "flex flex-1 flex-col gap-0.5 border-t-[3px] px-2 py-1.5 text-xs",
                        c.kind === "done" && "border-ok bg-background",
                        c.kind === "kept" &&
                          "border-[var(--pa-line-strong)] bg-[repeating-linear-gradient(135deg,var(--pa-ink-900)_0_6px,var(--pa-ink-850)_6px_12px)] text-soft",
                        c.kind === "next" && "border-primary bg-background",
                        c.kind === "todo" && "border-raised text-muted-foreground",
                      )}
                    >
                      <span>{stepName(s)}</span>
                      <span className="text-[11px] text-muted-foreground">{c.note}</span>
                    </span>
                  );
                })}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                {t("runs.redoFrom")}
                <select
                  value={from}
                  onChange={(e) => setRedoStep(e.target.value as Step)}
                  className="h-[34px] border border-input bg-surface px-2.5 text-[13px] font-medium text-foreground"
                >
                  {redoable.map((s) => (
                    <option key={s} value={s}>
                      {stepName(s)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                className="h-[34px] bg-foreground font-semibold text-background hover:bg-soft"
                onClick={() => setConfirm(true)}
              >
                {t("runs.start", { n: nextN, step: stepName(from) })}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent showCloseButton={false} className="text-sm sm:max-w-[420px]">
          <DialogTitle className="text-base font-semibold">
            {t("runs.confirmTitle", { n: nextN, step: stepName(from) })}
          </DialogTitle>
          <DialogDescription className="text-soft">
            {kept
              ? t("runs.confirmBody", { kept, from: run.n })
              : t("runs.confirmBodyNone", { n: nextN, from: run.n })}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("runs.cancel")}
            </Button>
            <Button className="font-semibold" onClick={() => void redo()}>
              {t("runs.start", { n: nextN, step: stepName(from) })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {watching && (
        <WatchBoth
          open={watching}
          onOpenChange={setWatching}
          sides={[
            { name: t("review.run", { n: run.n }), review: r },
            against
              ? { name: t("review.run", { n: against.n }), review: against.review }
              : { name: t("compare.rightWay"), review: undefined },
          ]}
          length={length}
        />
      )}

      <div
        role="status"
        className="pointer-events-none fixed right-4 bottom-4 z-40 md:right-7 md:bottom-7"
      >
        {toast && (
          <div className="flex max-w-[380px] items-start gap-3 bg-foreground px-3.5 py-3 text-background">
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--pa-ok)]">
              <CheckIcon className="size-[11px]" strokeWidth={3.5} aria-hidden />
            </span>
            <span className="flex-1 text-[13px]">{toast}</span>
          </div>
        )}
      </div>
    </main>
  );
}
