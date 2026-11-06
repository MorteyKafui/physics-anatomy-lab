"use client";

import { runRules, type Finding } from "@pa/analysis";
import { snapSlot } from "@pa/apparatus";
import {
  coach,
  coachIsOn,
  frontier,
  HELP_LEVELS,
  replay,
  STEPS,
  type Advice,
  type HelpLevel,
  type Step,
} from "@pa/engine";
import {
  ASSEMBLY_RULES,
  assembled,
  assemblyProjection,
  benchPeriod,
  bobAngle,
  carriedBy,
  countedFromOne,
  decideAssembly,
  EMPTY_ASSEMBLY,
  nextPart,
  PENDULUM_PARTS,
  passTimes,
  readySlots,
  recordedTime,
  simplePendulum,
  TIMING_RULES,
  waitsFor,
  type Assembly,
  type AssemblyCommand,
  type PendulumPart,
  type PendulumSlot,
  type Timing,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import { ANTICIPATED_EVENT, DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { TooltipProvider } from "@pa/ui/components/tooltip";
import {
  ChevronLeftIcon,
  LayersIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SearchIcon,
  SkipBackIcon,
  TriangleAlertIcon,
} from "@pa/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  benchDescription,
  BenchStage,
  DragGhost,
  listParts,
  PartsTray,
  partThe,
  slotPhrase,
  slotsFor,
  toFigure,
  useDragPart,
} from "./build";
import { CheckItem, Rail, Rich, StepStrip } from "./parts";
import { useAttempt } from "./use-attempt";
import { useBenchClock } from "./use-bench-clock";

const E = simplePendulum;
const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key, params) : key;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** Where the magnifier starts: over the split cork, the part the mockup's callout points at. */
const LENS_START = { x: 300, y: 141 };
/** Numbers the parts' descriptions quote, all from the packages (AGENTS.md rule 1). */
const WHAT_PARAMS = {
  leastCount: E.stopwatch.resolution,
  reaction: ANTICIPATED_EVENT.meanDelay,
  swings: E.swings,
};

export function LabScreen() {
  const handle = useAttempt(E.id);
  const clock = useBenchClock();
  const g = DEFAULT_ENVIRONMENT.g;
  const period = useMemo(() => benchPeriod(g), [g]);

  const [timing, setTiming] = useState<Timing | undefined>();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [labels, setLabels] = useState(true);
  const [demoFrom, setDemoFrom] = useState<number | undefined>();
  const [tab, setTab] = useState("instructions");
  // Rules the coach has already acted on during this timing: a mistake counts once, however
  // many times the rules are re-checked while the student carries on counting.
  const acted = useRef(new Set<string>());

  // Building: the part in hand, what the bench last said, the magnifier, the slot the coach is
  // showing, and the set-up the coach last saw at "Finish building" (pressing again with it
  // unchanged carries on: findings never block a step).
  const [held, setHeld] = useState<PendulumPart>();
  const [buildStatus, setBuildStatus] = useState<string>();
  const [lens, setLens] = useState<{ x: number; y: number }>();
  const [demoSlot, setDemoSlot] = useState<PendulumSlot>();
  const [checkedBuild, setCheckedBuild] = useState<string>();
  const benchBox = useRef<HTMLDivElement>(null);
  const heldNow = useRef<PendulumPart | undefined>(undefined);
  useEffect(() => {
    heldNow.current = held;
  }, [held]);

  const state = handle?.state;
  const assembly = useMemo(
    () => (handle ? replay(assemblyProjection, handle.attempt, handle.events) : EMPTY_ASSEMBLY),
    [handle],
  );
  const building = state?.step === "build" && !state.completed.includes("build");
  const running = timing !== undefined && timing.stoppedAt === undefined;

  const consult = useCallback(
    async (findings: Finding[], moment: "live" | "step-exit" | "asked") => {
      if (!handle) return;
      const out = coach(handle.state, findings, moment);
      await handle.record(out.events);
      if (out.advice.length || moment !== "live") setAdvice(out.advice);
      if (out.advice.some((a) => a.level === "demonstrate")) setDemoFrom(clock.now());
    },
    [handle, clock],
  );

  const findingsFor = useCallback(
    (tm: Timing) => runRules(TIMING_RULES, { timing: tm, period, g }),
    [period, g],
  );

  const start = useCallback(() => {
    setAdvice([]);
    acted.current = new Set();
    setTiming({ startedAt: clock.now(), counts: [] });
  }, [clock]);

  const countPass = useCallback(() => {
    if (!timing || timing.stoppedAt !== undefined) return;
    const next = { ...timing, counts: [...timing.counts, clock.now()] };
    setTiming(next);
    const fresh = findingsFor(next).filter((f) => !acted.current.has(f.rule));
    fresh.forEach((f) => acted.current.add(f.rule));
    if (fresh.length) void consult(fresh, "live");
  }, [timing, clock, consult, findingsFor]);

  const stop = useCallback(async () => {
    if (!handle || !timing || timing.stoppedAt !== undefined) return;
    const done = { ...timing, stoppedAt: clock.now() };
    setTiming(done);
    await handle.dispatch({
      type: "record-reading",
      id: globalThis.crypto.randomUUID(),
      data: {
        t: recordedTime(done)!,
        count: done.counts.length,
        countedFromOne: countedFromOne(done, period),
      },
    });
    await consult(findingsFor(done), "step-exit");
  }, [handle, timing, clock, period, consult, findingsFor]);

  const tryAgain = useCallback(async () => {
    const last = state?.readings.at(-1);
    if (handle && last && timing?.stoppedAt !== undefined)
      await handle.dispatch({ type: "delete-reading", id: last.id });
    setTiming(undefined);
    setAdvice([]);
    setDemoFrom(undefined);
    clock.reset();
  }, [handle, state, timing, clock]);

  const showMe = useCallback(
    async (a: Advice) => {
      setDemoFrom(clock.now());
      await handle?.record([
        {
          kind: "coach.hint",
          data: {
            hint: a.finding.key,
            rule: a.finding.rule,
            skill: a.finding.skill,
            level: "demonstrate",
          },
        },
      ]);
    },
    [handle, clock],
  );

  /*
   * The bench including changes still being saved. A quick student can pick the next part
   * before the last one is stored; deciding against this keeps every tap honest. It follows the
   * stored events again whenever nothing is waiting to be saved.
   */
  const bench = useRef<Assembly>(EMPTY_ASSEMBLY);
  const saving = useRef(0);
  useEffect(() => {
    if (saving.current === 0) bench.current = assembly;
  }, [assembly]);
  const benchNow = useCallback(() => bench.current, []);

  const changeBench = useCallback(
    async (command: AssemblyCommand) => {
      if (!handle) return false;
      const decision = decideAssembly(bench.current, command);
      if (!decision.ok) return false;
      bench.current = decision.events.reduce(
        (a, e) =>
          assemblyProjection.apply(a, { ...e, id: "", attemptId: "", seq: 0, device: "", at: 0 }),
        bench.current,
      );
      saving.current += 1;
      try {
        await handle.record(decision.events);
      } finally {
        saving.current -= 1;
      }
      return true;
    },
    [handle],
  );

  const place = useCallback(
    async (part: PendulumPart, slot: PendulumSlot) => {
      // Let go at once: the student may pick the next part before the bench has saved.
      setHeld((h) => (h === part ? undefined : h));
      if (!(await changeBench({ type: "place-part", part, slot }))) return;

      setDemoSlot(undefined);
      setCheckedBuild(undefined);
      if (heldNow.current === undefined)
        setBuildStatus(t("lab.build.placed", { part: partThe(part), slot: slotPhrase(slot) }));
      const after = benchNow();
      // The slot button has gone: carry focus on to the next part in the tray, or the finish.
      const following = nextPart(after);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            following ? `[data-part="${following}"] button` : "[data-finish-building]",
          )
          ?.focus(),
      );
      const fresh = runRules(ASSEMBLY_RULES, { assembly: after }).filter(
        (f) => !acted.current.has(f.rule),
      );
      fresh.forEach((f) => acted.current.add(f.rule));
      if (fresh.length) await consult(fresh, "live");
    },
    [changeBench, benchNow, consult],
  );

  const takeOff = useCallback(
    async (part: PendulumPart) => {
      const before = benchNow();
      const going = [part, ...carriedBy(before, part)];
      if (!(await changeBench({ type: "remove-part", part }))) return;
      setBuildStatus(t("lab.build.returned", { list: listParts(going) }));
      // Mistakes in what came off no longer stand; the coach may raise them again if repeated.
      const after = runRules(ASSEMBLY_RULES, {
        assembly: benchNow(),
      }).map((f) => f.rule);
      setAdvice((list) =>
        list.filter((a) => a.finding.skill !== "apparatus" || after.includes(a.finding.rule)),
      );
      for (const rule of [...acted.current]) if (!after.includes(rule)) acted.current.delete(rule);
      setDemoSlot(undefined);
      setCheckedBuild(undefined);
    },
    [changeBench, benchNow],
  );

  const pick = useCallback(
    (part: PendulumPart) => {
      if (held === part) {
        setHeld(undefined);
        setBuildStatus(t("lab.build.returned", { list: partThe(part) }));
        return;
      }
      const now = benchNow();
      if (readySlots(now, part).length === 0) {
        const needs = waitsFor(now, part);
        setHeld(undefined);
        if (needs)
          setBuildStatus(
            capitalise(t("lab.build.notYet", { part: partThe(part), needs: partThe(needs) })),
          );
        return;
      }
      setHeld(part);
      setBuildStatus(
        `${t("lab.build.holding", { part: partThe(part) })} ${t(
          `experiments.simple-pendulum.parts.${part}.what` as MessageKey,
          WHAT_PARAMS,
        )}`,
      );
    },
    [held, benchNow],
  );

  const drop = useCallback(
    (part: PendulumPart, x: number, y: number) => {
      const box = benchBox.current;
      const now = benchNow();
      const slots = readySlots(now, part);
      const slot = box ? snapSlot(toFigure(box, x, y), slots, now) : undefined;
      if (slot) void place(part, slot);
      else if (slots.length === 0) pick(part);
      else {
        setHeld(undefined);
        setBuildStatus(t("lab.build.missed", { part: partThe(part) }));
      }
    },
    [benchNow, place, pick],
  );
  const dragging = useDragPart(drop);

  const resetBench = useCallback(async () => {
    for (const p of ["base", "watch"] as const) if (benchNow()[p]) await takeOff(p);
    setHeld(undefined);
    setAdvice([]);
    setBuildStatus(undefined);
  }, [benchNow, takeOff]);

  // Keyboard, anywhere outside a form field: M turns the magnifier on and off; Escape puts back
  // the part in hand.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea, [contenteditable]")) return;
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setLens((l) => (l ? undefined : LENS_START));
      } else if (e.key === "Escape" && held) {
        e.preventDefault();
        const part = held;
        setHeld(undefined);
        setBuildStatus(t("lab.build.returned", { list: partThe(part) }));
        document.querySelector<HTMLElement>(`[data-part="${part}"] button`)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [held]);

  // Keyboard: S starts and stops the stopwatch, Space counts a pass (only while measuring).
  useEffect(() => {
    if (state?.step !== "measure") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea, [contenteditable]")) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        void (running ? stop() : start());
      } else if (e.key === " " && running) {
        e.preventDefault();
        countPass();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state?.step, running, start, stop, countPass]);

  if (!handle || !state) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center text-muted-foreground"
        aria-busy="true"
      >
        {t("lab.loading")}
      </main>
    );
  }

  const stepIndex = STEPS.indexOf(state.step);
  const percent = Math.round((state.completed.length / STEPS.length) * 100);
  const open = (s: Step) => STEPS.indexOf(s) <= STEPS.indexOf(frontier(state));
  const elapsed = timing ? (timing.stoppedAt ?? clock.time) - timing.startedAt : 0;
  const shownTime = timing?.stoppedAt !== undefined ? recordedTime(timing)! : Math.max(0, elapsed);

  // The coach's demonstration: count 0, 1, 2 beside the mark on the next three passes.
  let markLabel: string | undefined;
  if (demoFrom !== undefined) {
    const passes = passTimes(demoFrom, 3, period);
    const k = passes.findIndex((p) => clock.time >= p && clock.time < p + 0.45 * period);
    if (k >= 0) markLabel = t("experiments.simple-pendulum.demo.count", { n: k });
  }

  const subStep = (n: 1 | 2 | 3 | 4): "done" | "current" | "todo" => {
    const readings = state.readings.length;
    if (n === 1) return "done";
    if (n === 2) return running || readings > 0 ? "done" : "current";
    if (n === 3) return readings > 0 && !running ? "done" : running ? "current" : "todo";
    return readings > 1 ? "done" : readings === 1 && !running ? "current" : "todo";
  };

  const next = STEPS[stepIndex + 1];
  const finishStep = async () => {
    await handle.dispatch({ type: "complete-step" });
    if (next) await handle.dispatch({ type: "go-to-step", step: next });
    setAdvice([]);
    setHeld(undefined);
    setBuildStatus(undefined);
    setDemoSlot(undefined);
  };

  const finishBuilding = async () => {
    const signature = JSON.stringify(assembly);
    const findings = runRules(ASSEMBLY_RULES, { assembly });
    if (findings.length && checkedBuild !== signature) {
      setCheckedBuild(signature);
      const out = coach(handle.state, findings, "step-exit");
      await handle.record(out.events);
      setAdvice(out.advice);
      if (out.advice.length) return;
    }
    await finishStep();
  };

  // The bob hangs still until there is something to time; before the bench is built, the
  // figure describes what is on it.
  const swinging = STEPS.indexOf(state.step) >= STEPS.indexOf("measure");
  const builtYet = state.completed.includes("build");
  const inHand = held ?? (dragging.drag?.moved ? dragging.drag.part : undefined);
  const lit: PendulumSlot[] = inHand ? slotsFor(assembly, inHand) : demoSlot ? [demoSlot] : [];
  const nextToTouch =
    coachIsOn(state) && state.helpLevel === "auto" ? nextPart(assembly) : undefined;

  /** What each advice card offers besides "Show me". */
  const fixFor = (a: Advice) =>
    a.finding.rule === "pendulum-thread-on-clamp"
      ? {
          label: msg(`${a.finding.key}.fix`),
          run: () => void takeOff("thread"),
          show: () => {
            setDemoSlot("cork");
            void handle.record([
              {
                kind: "coach.hint",
                data: {
                  hint: a.finding.key,
                  rule: a.finding.rule,
                  skill: a.finding.skill,
                  level: "demonstrate",
                },
              },
            ]);
          },
        }
      : {
          label: t("lab.coach.resetTryAgain"),
          run: () => void tryAgain(),
          show: () => void showMe(a),
        };

  const adviceCards = advice.map((a) => {
    const fix = fixFor(a);
    return (
      <div
        key={a.finding.rule}
        role="status"
        className="flex flex-col gap-2.5 border border-warn bg-warn-wash p-3.5"
      >
        <span className="flex items-center gap-2 font-semibold text-warn">
          <TriangleAlertIcon className="size-4" aria-hidden />
          {msg(`${a.finding.key}.title`, a.finding.params)}
        </span>
        <span className="text-foreground">{msg(`${a.finding.key}.detail`, a.finding.params)}</span>
        {(a.level === "demonstrate" || demoSlot) && hasMessage(`${a.finding.key}.demonstrate`) && (
          <span className="text-soft">{msg(`${a.finding.key}.demonstrate`)}</span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button className="bg-foreground text-background hover:bg-soft" onClick={fix.run}>
            {fix.label}
          </Button>
          <Button variant="outline" onClick={fix.show}>
            {t("lab.coach.showMe")}
          </Button>
        </div>
      </div>
    );
  });

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh bg-background text-foreground md:h-dvh">
        <Rail />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-5 py-3">
            <Link
              href="/"
              aria-label={t("lab.header.back")}
              className="flex size-11 items-center justify-center md:hidden"
            >
              <ChevronLeftIcon className="size-5" aria-hidden />
            </Link>
            <div className="flex items-center gap-3 md:border md:border-border md:bg-surface md:px-3.5 md:py-2">
              <span aria-hidden className="hidden size-2.5 bg-topic-mechanics md:block" />
              <div className="flex flex-col">
                <h1 className="font-semibold">{t("experiments.simple-pendulum.title")}</h1>
                <span className="font-mono text-xs text-muted-foreground">
                  {t("lab.header.stepOf", {
                    n: stepIndex + 1,
                    total: STEPS.length,
                    step: stepName(state.step),
                  })}
                </span>
              </div>
              <div
                className="hidden h-1 w-30 bg-border md:block"
                role="img"
                aria-label={t("lab.header.progress", { percent })}
              >
                <div className="h-1 bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <div
              role="toolbar"
              aria-label={t("lab.playback.label")}
              className="hidden items-center gap-0.5 border border-border bg-surface p-[3px] md:flex"
            >
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("lab.playback.reset")}
                onClick={() => void (building ? resetBench() : tryAgain())}
              >
                <RotateCcwIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("lab.playback.labels")}
                aria-pressed={labels}
                onClick={() => setLabels((v) => !v)}
              >
                <LayersIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("lab.magnifier.label")}
                aria-pressed={lens !== undefined}
                aria-keyshortcuts="M"
                onClick={() => setLens((l) => (l ? undefined : LENS_START))}
              >
                <SearchIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("lab.playback.stepBack")}
                disabled={stepIndex === 0}
                onClick={() =>
                  void handle.dispatch({ type: "go-to-step", step: STEPS[stepIndex - 1]! })
                }
              >
                <SkipBackIcon />
              </Button>
              <Button
                size="icon"
                aria-label={clock.playing ? t("lab.playback.pause") : t("lab.playback.play")}
                className="bg-foreground text-background hover:bg-soft"
                onClick={() => clock.setPlaying((p) => !p)}
              >
                {clock.playing ? (
                  <PauseIcon fill="currentColor" />
                ) : (
                  <PlayIcon fill="currentColor" />
                )}
              </Button>
              <Button
                variant="ghost"
                aria-label={t("lab.playback.speed", { speed: clock.speed })}
                className="font-mono"
                onClick={clock.nextSpeed}
              >
                {clock.speed}×
              </Button>
            </div>
            <span className="hidden flex-1 md:block" />
            <label className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              {t("lab.helpLevel.label")}
              <select
                className="h-9 border border-input bg-surface px-2.5 text-sm font-medium text-foreground"
                value={state.helpLevel}
                disabled={state.mode === "exam"}
                onChange={(e) =>
                  void handle.dispatch({
                    type: "set-help-level",
                    level: e.target.value as HelpLevel,
                  })
                }
              >
                {HELP_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(`lab.helpLevel.${level}` as MessageKey)}
                  </option>
                ))}
              </select>
            </label>
          </header>
          <div className="h-[3px] bg-border md:hidden" aria-hidden>
            <div className="h-[3px] bg-primary" style={{ width: `${percent}%` }} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Bench */}
            <section
              aria-label={t("experiments.simple-pendulum.figureTitle")}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-4 md:p-6"
            >
              <div className="absolute top-5 left-6 hidden flex-col gap-0.5 md:flex">
                <span className="text-sm text-muted-foreground">
                  {t("experiments.simple-pendulum.figure")}
                </span>
                <span className="font-semibold">
                  {t("experiments.simple-pendulum.figureTitle")}
                </span>
              </div>
              {labels && assembly.cork !== undefined && (
                <div className="absolute top-5 right-6 hidden items-center gap-2 border border-border bg-surface px-3 py-2 text-sm md:flex">
                  <span aria-hidden className="size-2 bg-[var(--pa-figure-cork)]" />
                  {t("experiments.simple-pendulum.callout.cork")}
                </div>
              )}
              <BenchStage
                box={benchBox}
                bench={{
                  angle: swinging ? bobAngle(clock.time, period) : 0,
                  stopwatchSeconds: shownTime,
                  assembly,
                  lit,
                  markLabel,
                  label: builtYet
                    ? t("experiments.simple-pendulum.figureAlt")
                    : benchDescription(assembly),
                }}
                slots={held ? slotsFor(assembly, held) : []}
                held={held}
                onPlace={(slot) => held && void place(held, slot)}
                magnifier={lens}
                onMagnifier={setLens}
                className={building ? "max-w-[min(600px,calc((100dvh-470px)*0.913))]" : undefined}
              />
              {lens && (
                <p className="sr-only" role="status">
                  {t("lab.magnifier.on")}
                </p>
              )}
              {building ? (
                <PartsTray
                  assembly={assembly}
                  held={held}
                  lit={nextToTouch}
                  locked={false}
                  status={buildStatus}
                  whatParams={WHAT_PARAMS}
                  onPick={(part) => {
                    if (!dragging.takeSuppressedClick()) pick(part);
                  }}
                  onPointerDown={dragging.start}
                  onRemove={(part) => void takeOff(part)}
                />
              ) : (
                <div className="flex flex-col gap-3 self-stretch border border-border bg-surface px-4 py-3 md:absolute md:bottom-5 md:left-6 md:self-auto">
                  <div className="flex items-end gap-6">
                    <div className="flex flex-col">
                      <span className="hidden text-xs text-muted-foreground md:block">
                        {t("lab.readout.stopwatch", { leastCount: E.stopwatch.resolution })}
                      </span>
                      <span
                        className="font-mono text-[34px] leading-tight font-medium"
                        aria-live="off"
                      >
                        {shownTime.toFixed(2)}{" "}
                        <span className="text-base text-muted-foreground">s</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="hidden text-xs text-muted-foreground md:block">
                        {t("lab.readout.count")}
                      </span>
                      <span className="font-mono text-[34px] leading-tight font-medium">
                        {timing?.counts.length ?? 0}{" "}
                        <span className="text-base text-muted-foreground">
                          {t("lab.readout.of", { target: E.swings })}
                        </span>
                      </span>
                    </div>
                  </div>
                  {state.step === "measure" && (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void (running ? stop() : start())}>
                        {running ? t("lab.readout.stop") : t("lab.readout.start")}
                      </Button>
                      <Button variant="outline" disabled={!running} onClick={countPass}>
                        {t("lab.readout.countPass")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <DragGhost drag={dragging.drag} />
              <div
                className={cn(
                  "absolute right-6 bottom-5 hidden text-right font-mono text-sm text-soft md:block",
                  building && "md:hidden",
                )}
              >
                {t("experiments.simple-pendulum.conditions", {
                  length: E.length.toFixed(3),
                  angle: E.amplitudeDeg,
                })}
              </div>
            </section>

            {/* Coach */}
            <aside
              aria-label={t("lab.coach.label")}
              className="flex min-w-0 flex-col border-border bg-surface md:w-[380px] md:overflow-y-auto md:border-l"
            >
              <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
                <TabsList
                  variant="line"
                  className="h-auto! w-full justify-start gap-5 border-b border-border px-5 py-0"
                >
                  <TabsTrigger
                    value="instructions"
                    className="flex-none px-0 py-3.5 text-sm after:bg-primary"
                  >
                    {t("lab.coach.instructions")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="explanation"
                    className="flex-none px-0 py-3.5 text-sm after:bg-primary"
                  >
                    {t("lab.coach.explanation")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="tips"
                    className="flex-none px-0 py-3.5 text-sm after:bg-primary"
                  >
                    {t("lab.coach.tips")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="instructions" className="flex flex-col gap-3.5 p-5">
                  {state.step === "build" ? (
                    <>
                      <h2 className="font-display text-2xl leading-tight font-bold">
                        {t("experiments.simple-pendulum.build.title")}
                      </h2>
                      <p className="text-soft">{t("experiments.simple-pendulum.build.why")}</p>
                      <div className="flex flex-col gap-2">
                        {PENDULUM_PARTS.map((part, i) => (
                          <CheckItem
                            key={part}
                            n={i + 1}
                            state={
                              assembly[part] !== undefined
                                ? "done"
                                : part === nextPart(assembly)
                                  ? "current"
                                  : "todo"
                            }
                          >
                            {t(`experiments.simple-pendulum.build.${part}` as MessageKey)}
                          </CheckItem>
                        ))}
                      </div>
                      {adviceCards}
                      {state.helpLevel === "on-my-own" && assembled(assembly) && (
                        <Button
                          variant="link"
                          className="self-start px-0"
                          onClick={() =>
                            void consult(runRules(ASSEMBLY_RULES, { assembly }), "asked")
                          }
                        >
                          {t("lab.coach.ask")}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">{t("lab.build.keys")}</p>
                      {building && (
                        <Button
                          data-finish-building
                          className="self-start"
                          disabled={!assembled(assembly)}
                          onClick={() => void finishBuilding()}
                        >
                          {checkedBuild === JSON.stringify(assembly) && advice.length
                            ? t("lab.steps.carryOn")
                            : t("lab.steps.finishBuilding")}
                        </Button>
                      )}
                      {!building && next && (
                        <Button
                          className="self-start"
                          onClick={() => void handle.dispatch({ type: "go-to-step", step: next })}
                        >
                          {t("lab.steps.continue", { step: stepName(next) })}
                        </Button>
                      )}
                    </>
                  ) : state.step === "measure" ? (
                    <>
                      <h2 className="font-display text-2xl leading-tight font-bold">
                        {t("experiments.simple-pendulum.measure.title", { swings: E.swings })}
                      </h2>
                      <p className="text-soft">{t("experiments.simple-pendulum.measure.why")}</p>
                      <div className="flex flex-col gap-2">
                        <CheckItem n={1} state={subStep(1)}>
                          {t("experiments.simple-pendulum.measure.pullAside")}
                        </CheckItem>
                        <CheckItem n={2} state={subStep(2)}>
                          <Rich text={t("experiments.simple-pendulum.measure.start")} />
                        </CheckItem>
                        <CheckItem n={3} state={subStep(3)}>
                          {t("experiments.simple-pendulum.measure.stop", { swings: E.swings })}
                        </CheckItem>
                        <CheckItem n={4} state={subStep(4)}>
                          {t("experiments.simple-pendulum.measure.record")}
                        </CheckItem>
                      </div>
                      {adviceCards}
                      {state.helpLevel === "on-my-own" && timing?.stoppedAt !== undefined && (
                        <Button
                          variant="link"
                          className="self-start px-0"
                          onClick={() => void consult(findingsFor(timing), "asked")}
                        >
                          {t("lab.coach.ask")}
                        </Button>
                      )}
                      {state.readings.length > 0 && (
                        <p className="font-mono text-sm text-muted-foreground">
                          {t("lab.readout.readings", {
                            list: state.readings
                              .map((r) => `${(r.data as { t: number }).t.toFixed(2)} s`)
                              .join(", "),
                          })}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{t("lab.readout.keys")}</p>
                      {state.readings.length > 0 && !running && (
                        <Button className="self-start" onClick={() => void finishStep()}>
                          {t("lab.steps.finishMeasuring")}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="font-display text-2xl leading-tight font-bold">
                        {stepName(state.step)}
                      </h2>
                      <p className="text-soft">{t("lab.steps.notBuilt")}</p>
                      {next && !state.completed.includes(state.step) && (
                        <Button className="self-start" onClick={() => void finishStep()}>
                          {t("lab.steps.continue", { step: stepName(next) })}
                        </Button>
                      )}
                    </>
                  )}
                </TabsContent>
                <TabsContent value="explanation" className="flex flex-col gap-3.5 p-5">
                  <h2 className="font-display text-2xl leading-tight font-bold">
                    {t("experiments.simple-pendulum.explanation.title")}
                  </h2>
                  <p className="text-soft">{t("experiments.simple-pendulum.explanation.body")}</p>
                  <div className="flex flex-col gap-2.5 border border-border bg-background p-4">
                    <span className="text-center font-mono text-[22px]">
                      {t("experiments.simple-pendulum.explanation.formula")}
                    </span>
                    <dl className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm text-soft">
                      {(["T", "l", "g"] as const).map((s) => (
                        <div key={s} className="contents">
                          <dt className="font-mono text-foreground">{s}</dt>
                          <dd>{t(`experiments.simple-pendulum.explanation.${s}`)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <p className="text-soft">{t("experiments.simple-pendulum.explanation.graph")}</p>
                </TabsContent>
                <TabsContent value="tips" className="flex flex-col gap-3 p-5">
                  <h2 className="font-display text-2xl leading-tight font-bold">
                    {t("experiments.simple-pendulum.tips.title")}
                  </h2>
                  <ul className="flex list-disc flex-col gap-2 pl-4.5">
                    {(["angle", "mark", "cork", "repeat", "plane"] as const).map((k) => (
                      <li key={k}>{t(`experiments.simple-pendulum.tips.${k}`)}</li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            </aside>
          </div>

          <StepStrip
            current={state.step}
            completed={state.completed}
            open={open}
            onGo={(step) => void handle.dispatch({ type: "go-to-step", step })}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
