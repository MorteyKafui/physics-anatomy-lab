"use client";

import {
  fillDerived,
  formulaUnitFindings,
  parseTable,
  runRules,
  TABLE_RULES,
  GRAPH_RULES,
  pointsFor,
  toTableView,
  type Finding,
} from "@pa/analysis";
import { snapSlot } from "@pa/apparatus";
import { RATES, VERBOSITY } from "@pa/audio";
import {
  answersProjection,
  coach,
  coachIsOn,
  helpLevelFor,
  setSkillLevel,
  frontier,
  HELP_LEVELS,
  replay,
  writeAnswer,
  STEPS,
  visibleSnapshots,
  type Advice,
  type HelpLevel,
  type SnapshotKind,
  type Step,
} from "@pa/engine";
import type { Skill } from "@pa/analysis";
import {
  ANALYSIS_RULES,
  ASSEMBLY_RULES,
  expectedAnswers,
  plotsTSquaredAgainstL,
  asReading,
  assembled,
  assemblyProjection,
  benchPeriod,
  bobAngle,
  carriedBy,
  countedFromOne,
  decideAssembly,
  EMPTY_ASSEMBLY,
  LENGTHS,
  lengthProjection,
  nextPart,
  PENDULUM_PARTS,
  passTimes,
  PENDULUM_FORMULAS,
  PENDULUM_PLOT,
  readingsIntoTable,
  readySlots,
  recordedTime,
  setLength,
  simplePendulum,
  stepLength,
  TIMING_RULES,
  waitsFor,
  type Assembly,
  type AssemblyCommand,
  type PendulumPart,
  type PendulumReading,
  type PendulumSlot,
  type Timing,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import { ANTICIPATED_EVENT, DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@pa/ui/components/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { TooltipProvider } from "@pa/ui/components/tooltip";
import {
  BookOpenIcon,
  CameraIcon,
  ChevronLeftIcon,
  LayersIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  Volume2Icon,
  VolumeXIcon,
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
import { AnalysePanel } from "./analyse";
import { FormulaBox, Sym } from "./formula";
import { GraphPanel, graphColumnsFor, graphView, headingFor, useGraph } from "./graph-sheet";
import { flagsFor, TableBuilder, useTable } from "./table-builder";
import { useAttempt } from "./use-attempt";
import { useAudio } from "./use-audio";
import { useBenchClock } from "./use-bench-clock";
import { newSnapshotId, useSnapshots } from "./use-snapshots";

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
/** Table rules the coach may raise while the student is still writing the table in. */
const LIVE_TABLE_RULES = [
  "table-heading-unit",
  "table-unreadable",
  "table-inconsistent-decimals",
  "table-precision-vs-instrument",
  "table-mean-decimals",
  "table-unit-slip",
  "table-derived-arithmetic",
];
const newRowId = () => `row-${globalThis.crypto.randomUUID().slice(0, 8)}`;

/** What a snapshot shows at each step: the bench, then the table, then the graph. */
export const snapshotKindFor = (step: Step): SnapshotKind =>
  step === "tabulate" ? "table" : STEPS.indexOf(step) >= STEPS.indexOf("plot") ? "graph" : "bench";

export function LabScreen() {
  const handle = useAttempt(E.id);
  const clock = useBenchClock();
  const audio = useAudio();
  // The audio callbacks are stable, so effects can list them without running every frame.
  const { say: speak, count: countAloud, sound: playSound } = audio;
  const g = DEFAULT_ENVIRONMENT.g;
  const results = useTable(handle);
  const plot = useGraph(handle);
  const shots = useSnapshots(handle);
  const [snapNote, setSnapNote] = useState<string>();
  const [checkedGraph, setCheckedGraph] = useState<string>();
  const [checkedAnalysis, setCheckedAnalysis] = useState<string>();
  const answers = useMemo(
    () => (handle ? replay(answersProjection, handle.attempt, handle.events) : {}),
    [handle],
  );

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
  // The length the bench is set to, and the period that follows from it (packages/physics).
  const length = useMemo(
    () => (handle ? replay(lengthProjection, handle.attempt, handle.events) : E.length),
    [handle],
  );
  const period = useMemo(() => benchPeriod(g, length), [g, length]);
  const [checkedTable, setCheckedTable] = useState<string>();
  const running = timing !== undefined && timing.stoppedAt === undefined;

  // Snapshots: the camera (or C) takes one of what the step shows; finishing a step takes one
  // automatically. The bench keeps its clock and the stopwatch's reading, so the figure shows the
  // bob where it was.
  const runSnapshot = shots.run;
  const snapshotsNow = shots.now;
  const takeSnapshot = useCallback(
    async (auto?: string) => {
      if (!handle) return;
      const step = handle.state.step;
      const kind = snapshotKindFor(step);
      const time = clock.now();
      const stopwatch = !timing
        ? 0
        : timing.stoppedAt !== undefined
          ? recordedTime(timing)!
          : Math.max(0, time - timing.startedAt);
      const taken = await runSnapshot({
        type: "take",
        id: newSnapshotId(),
        kind,
        step,
        caption: auto ?? t(`lab.snapshot.yours.${kind}` as MessageKey),
        auto: auto !== undefined,
        ...(kind === "bench" ? { bench: { time, stopwatch } } : {}),
      });
      if (taken)
        setSnapNote(t("lab.snapshot.taken", { n: visibleSnapshots(snapshotsNow()).length }));
    },
    [handle, clock, timing, runSnapshot, snapshotsNow],
  );
  useEffect(() => {
    if (!snapNote) return;
    const id = setTimeout(() => setSnapNote(undefined), 5000);
    return () => clearTimeout(id);
  }, [snapNote]);

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
    playSound("stopwatch");
    // The pass the stopwatch starts on is zero (the count-along says so).
    countAloud("0");
  }, [clock, playSound, countAloud]);

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
    playSound("stopwatch");
    speak(t("lab.audio.reading", { t: recordedTime(done)!.toFixed(2) }), "status");
    await handle.dispatch({
      type: "record-reading",
      id: globalThis.crypto.randomUUID(),
      data: {
        t: recordedTime(done)!,
        count: done.counts.length,
        countedFromOne: countedFromOne(done, period),
        l: length,
      },
    });
    await consult(findingsFor(done), "step-exit");
  }, [handle, timing, clock, period, length, consult, findingsFor, playSound, speak]);

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
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
      if ((e.key === "m" || e.key === "M") && plain) {
        e.preventDefault();
        setLens((l) => (l ? undefined : LENS_START));
      } else if ((e.key === "c" || e.key === "C") && plain) {
        e.preventDefault();
        void takeSnapshot();
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
  }, [held, takeSnapshot]);

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

  // The spoken coach: each step's instructions as the student arrives, and on turning sound on.
  const step = state?.step;
  const soundOn = audio.settings.on;
  useEffect(() => {
    if (!step || !soundOn) return;
    const line = (key: string) =>
      `${t(`experiments.simple-pendulum.${key}.title` as MessageKey, { swings: E.swings })}. ${t(
        `experiments.simple-pendulum.${key}.why` as MessageKey,
      )}`;
    const known = ["build", "measure", "tabulate", "plot", "analyse"];
    speak(
      known.includes(step) ? line(step) : `${stepName(step)}. ${t("lab.steps.notBuilt")}`,
      "step",
    );
  }, [step, soundOn, speak]);

  // Every correction the coach raises, said once at each level it reaches.
  const spokenAdvice = useRef(new Set<string>());
  useEffect(() => {
    for (const a of advice) {
      const id = `${a.finding.rule}:${a.level}`;
      if (spokenAdvice.current.has(id)) continue;
      spokenAdvice.current.add(id);
      const rowIndex = results.table.rows.findIndex((r) => r.id === a.finding.rows?.[0]);
      const params = { ...a.finding.params, row: rowIndex >= 0 ? rowIndex + 1 : "" };
      const parts = [
        `${msg(`${a.finding.key}.title`, params)}.`,
        msg(`${a.finding.key}.detail`, params),
      ];
      if (a.level === "demonstrate" && hasMessage(`${a.finding.key}.demonstrate`))
        parts.push(msg(`${a.finding.key}.demonstrate`));
      speak(parts.join(" "), "correction");
    }
  }, [advice, speak, results.table.rows]);

  // What the bench says as the student builds, for those who asked for everything.
  useEffect(() => {
    if (buildStatus) speak(buildStatus, "status");
  }, [buildStatus, speak]);

  // The count-along: a beat and the count at each pass in the counting direction, and the
  // bob's swish at every pass through the mark, while the stopwatch runs.
  const counted = useRef({ count: 0, half: 0 });
  const runningSince = timing && timing.stoppedAt === undefined ? timing.startedAt : undefined;
  useEffect(() => {
    counted.current = { count: 0, half: 0 };
  }, [runningSince]);
  useEffect(() => {
    if (runningSince === undefined) return;
    const now = clock.time;
    const first = passTimes(runningSince + period / 4, 1, period)[0]!;
    const n = now >= first ? Math.floor((now - first) / period) + 1 : 0;
    if (n > counted.current.count) {
      counted.current.count = n;
      countAloud(n === E.swings ? t("lab.audio.lastCount", { n }) : String(n));
    }
    const half = Math.floor((now - runningSince) / (period / 2));
    if (half > counted.current.half) {
      counted.current.half = half;
      playSound("swish");
    }
  }, [clock.time, runningSince, period, countAloud, playSound]);

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

  const readings = state.readings
    .map(asReading)
    .filter((r): r is PendulumReading => r !== undefined);
  const byLength = (list: readonly PendulumReading[]) =>
    [...new Set(list.map((r) => r.l))]
      .map((l) =>
        t("lab.readout.atLength", {
          length: l.toFixed(3),
          list: list
            .filter((r) => r.l === l)
            .map((r) => `${r.t.toFixed(2)} s`)
            .join(", "),
        }),
      )
      .join(" · ");
  const changeLength = (direction: 1 | -1) => {
    const e = setLength(length, stepLength(length, direction));
    if (e) void handle.record([e]);
  };

  // The results table. At Auto the means and worked-out columns are filled in for the student;
  // at Auto and Check my work each cell is ticked or flagged as they go; On my own shows only
  // what the coach says when asked (master plan, "Assist levels").
  const table = results.table;
  // Help levels per skill (master plan, "Assist levels"): each part of the lab asks the level
  // for its own skill, which follows the overall level unless it was set on its own.
  const levelFor = (skill: Skill): HelpLevel =>
    coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";
  const tableAssist = levelFor("tabulation") === "auto";
  const tableMarks = levelFor("tabulation") !== "on-my-own";
  const graphAssist = levelFor("graph") === "auto";
  const graphMarks = levelFor("graph") !== "on-my-own";
  const analysisAssist = levelFor("analysis") === "auto";
  const analysisMarks = levelFor("analysis") !== "on-my-own";
  const shownTable = tableAssist ? fillDerived(table) : table;
  const checkTable = (design = shownTable) =>
    design.layout
      ? runRules(TABLE_RULES, { table: parseTable(toTableView(design)), plot: PENDULUM_PLOT })
      : [];
  // The table checks, and the dimension check on the student's formula columns.
  const tableFindings = [...checkTable(), ...(table.layout ? formulaUnitFindings(table) : [])];
  const tableFlags = flagsFor(
    tableMarks
      ? tableFindings.filter((f) => f.severity !== "good")
      : advice.map((a) => a.finding).filter((f) => f.skill === "tabulation"),
  );
  const rowOf = (f: Finding) => {
    const i = table.rows.findIndex((r) => r.id === f.rows?.[0]);
    return i >= 0 ? i + 1 : "";
  };

  const tableCommitted = () => {
    if (!tableAssist) return;
    const now = results.now();
    const fresh = checkTable({
      ...fillDerived(now),
      layout: now.layout,
      template: now.template,
    }).filter((f) => LIVE_TABLE_RULES.includes(f.rule) && !acted.current.has(f.rule));
    fresh.forEach((f) => acted.current.add(f.rule));
    if (fresh.length) void consult(fresh, "live");
  };

  const fillReadings = () => {
    const now = results.now();
    const cells = readingsIntoTable(now, readings, newRowId);
    const newRows = [...new Set(cells.map((c) => c.row))].filter(
      (id) => !now.rows.some((r) => r.id === id),
    );
    void results.run([
      ...newRows.map((id) => ({ type: "add-row" as const, id })),
      ...cells.map((c) => ({ type: "set-cell" as const, ...c })),
    ]);
  };

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
    // The first time a step is finished, its snapshot goes in the notebook.
    const auto = autoCaption(state.step);
    if (auto && !state.completed.includes(state.step)) await takeSnapshot(auto);
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

  // The graph (step 7): T² against l by default, or any two columns the student picks.
  const numericColumns = table.columns.filter((c) => c.role !== "notes");
  const graphColumns = graphColumnsFor(plot.graph, table.columns, PENDULUM_PLOT);
  const columnFor = (id: string) => table.columns.find((c) => c.id === id);
  function autoCaption(s: Step): string | undefined {
    if (s === "build") return t("lab.snapshot.auto.build");
    if (s === "measure") return t("lab.snapshot.auto.measure");
    if (s === "tabulate") return t("lab.snapshot.auto.tabulate");
    if (s === "plot")
      return t("lab.snapshot.auto.plot", {
        y: columnFor(graphColumns.y)?.symbol ?? graphColumns.y,
        x: columnFor(graphColumns.x)?.symbol ?? graphColumns.x,
      });
    return undefined;
  }
  const graphData = pointsFor(shownTable, graphColumns.x, graphColumns.y);
  const graphShown = graphView(plot.graph, graphData, graphColumns, graphAssist);
  const graphFindings =
    graphData.length >= 2
      ? runRules(GRAPH_RULES, {
          sheet: graphShown.sheet,
          symbols: {
            x: columnFor(graphColumns.x)?.symbol ?? graphColumns.x,
            y: columnFor(graphColumns.y)?.symbol ?? graphColumns.y,
          },
          data: graphData,
          plotted: graphShown.plotted,
          line: graphShown.line,
          triangle: graphShown.triangle,
        })
      : [];
  const graphPart = (rule: string) =>
    rule === "graph-scale-small" || rule === "graph-off-sheet"
      ? "scale"
      : rule.startsWith("graph-line")
        ? "line"
        : rule.startsWith("graph-triangle")
          ? "triangle"
          : "points";
  const partFindings = { scale: [], points: [], line: [], triangle: [] } as Record<
    "scale" | "points" | "line" | "triangle",
    Finding[]
  >;
  for (const f of graphFindings) partFindings[graphPart(f.rule)].push(f);
  const graphFlagged = new Set(
    (graphMarks ? graphFindings : advice.map((a) => a.finding).filter((f) => f.skill === "graph"))
      .filter((f) => f.rule === "graph-misplotted" || f.rule === "graph-off-sheet")
      .flatMap((f) => f.rows ?? []),
  );
  const graphSignature = JSON.stringify(plot.graph);

  // The analysis (step 8): the slope from the student's triangle and g from their slope.
  const graphUnits = {
    x: columnFor(graphColumns.x)?.unit ?? "",
    y: columnFor(graphColumns.y)?.unit ?? "",
  };
  const forG = plotsTSquaredAgainstL(graphColumns);
  const expected = expectedAnswers(graphShown.triangle, graphColumns, graphUnits, answers);
  const analysisFindings = analysisAssist ? [] : runRules(ANALYSIS_RULES, { answers, expected });
  const answered = (id: "slope" | "g") =>
    analysisAssist
      ? expected[id] !== undefined
      : (answers[id]?.value ?? "") !== "" &&
        !analysisFindings.some((f) => f.column === id && f.severity === "error");
  const analysisSignature = JSON.stringify(answers);

  const finishAnalysing = async () => {
    if (analysisFindings.length && checkedAnalysis !== analysisSignature) {
      setCheckedAnalysis(analysisSignature);
      const out = coach(handle.state, analysisFindings, "step-exit");
      await handle.record(out.events);
      setAdvice(out.advice);
      if (out.advice.length) return;
    }
    await finishStep();
  };

  const finishPlotting = async () => {
    if (graphFindings.length && checkedGraph !== graphSignature) {
      setCheckedGraph(graphSignature);
      const out = coach(handle.state, graphFindings, "step-exit");
      await handle.record(out.events);
      setAdvice(out.advice);
      if (out.advice.length) return;
    }
    // At Auto the graph was drawn for the student; finishing makes it theirs, so the later
    // steps (and a change of help level) keep it.
    if (graphAssist) await keepDrawnGraph();
    await finishStep();
  };

  const keepDrawnGraph = () =>
    plot.run([
      ...(graphShown.drawn.sheet ? [{ type: "set-axes" as const, sheet: graphShown.sheet }] : []),
      ...(graphShown.drawn.plotted
        ? graphShown.plotted.map((point) => ({ type: "plot" as const, point }))
        : []),
      ...(graphShown.drawn.line && graphShown.line
        ? [{ type: "draw-line" as const, line: graphShown.line }]
        : []),
      ...(graphShown.drawn.triangle && graphShown.triangle
        ? [{ type: "draw-triangle" as const, triangle: graphShown.triangle }]
        : []),
    ]);

  const finishTabulating = async () => {
    const signature = JSON.stringify(shownTable.rows) + JSON.stringify(table.columns);
    const findings = tableFindings.filter((f) => f.severity !== "good");
    if (findings.length && checkedTable !== signature) {
      setCheckedTable(signature);
      const out = coach(handle.state, findings, "step-exit");
      await handle.record(out.events);
      setAdvice(out.advice);
      if (out.advice.length) return;
    }
    // At Auto the worked-out cells were filled in for the student; finishing writes them in.
    if (tableAssist) await keepWorkedCells();
    await finishStep();
  };

  const keepWorkedCells = () =>
    results.run(
      shownTable.rows.flatMap((row) => {
        const typed = table.rows.find((r) => r.id === row.id)?.cells ?? {};
        return table.columns
          .filter((c) => c.role === "mean" || c.role === "derived")
          .filter((c) => (row.cells[c.id] ?? "") !== (typed[c.id] ?? ""))
          .map((c) => ({
            type: "set-cell" as const,
            row: row.id,
            column: c.id,
            value: row.cells[c.id] ?? "",
          }));
      }),
    );

  // The bob hangs still until there is something to time; before the bench is built, the
  // figure describes what is on it.
  const swinging = STEPS.indexOf(state.step) >= STEPS.indexOf("measure");
  const builtYet = state.completed.includes("build");
  const inHand = held ?? (dragging.drag?.moved ? dragging.drag.part : undefined);
  const lit: PendulumSlot[] = inHand ? slotsFor(assembly, inHand) : demoSlot ? [demoSlot] : [];
  const nextToTouch = levelFor("apparatus") === "auto" ? nextPart(assembly) : undefined;

  const aboutTable = (a: Advice) =>
    a.finding.rule.startsWith("table-") ||
    a.finding.rule.startsWith("graph-") ||
    a.finding.rule.startsWith("analysis-");
  /** Findings about the readings as a whole are fixed by measuring more, not in a cell. */
  const needsMeasuring = (a: Advice) =>
    a.finding.rule === "table-too-few-rows" || a.finding.rule === "table-narrow-range";
  const fixLabel = (a: Advice) =>
    needsMeasuring(a)
      ? t("lab.table.backToMeasure")
      : aboutTable(a)
        ? t("lab.table.goToCell")
        : a.finding.rule === "pendulum-thread-on-clamp"
          ? msg(`${a.finding.key}.fix`)
          : t("lab.coach.resetTryAgain");

  /** What each advice card does, run only when its buttons are pressed. */
  const fixFor = (a: Advice): { run: () => void; show?: () => void } =>
    needsMeasuring(a)
      ? {
          run: () => {
            setAdvice([]);
            void handle.dispatch({ type: "go-to-step", step: "measure" });
          },
        }
      : aboutTable(a)
        ? {
            run: () => {
              const f = a.finding;
              const target = f.rule.startsWith("graph-")
                ? 'svg[role="application"]'
                : f.rule.startsWith("analysis-")
                  ? `[data-answer="${f.column}-${f.rule === "analysis-unit" ? "unit" : "value"}"]`
                  : f.rows?.[0] && f.column
                    ? `[data-cell="${f.rows[0]}:${f.column}"]`
                    : f.column
                      ? `th[data-column="${f.column}"] button`
                      : `[data-cell^="${f.rows?.[0] ?? "-"}:"]`;
              document.querySelector<HTMLElement>(target)?.focus();
            },
          }
        : a.finding.rule === "pendulum-thread-on-clamp"
          ? {
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
              run: () => void tryAgain(),
              show: () => void showMe(a),
            };

  const adviceCards = advice.map((a) => {
    return (
      <div
        key={a.finding.rule}
        role="status"
        className="flex flex-col gap-2.5 border border-warn bg-warn-wash p-3.5"
      >
        <span className="flex items-center gap-2 font-semibold text-warn">
          <TriangleAlertIcon className="size-4" aria-hidden />
          {msg(`${a.finding.key}.title`, { ...a.finding.params, row: rowOf(a.finding) })}
        </span>
        <span className="text-foreground">
          {msg(`${a.finding.key}.detail`, { ...a.finding.params, row: rowOf(a.finding) })}
        </span>
        {(a.level === "demonstrate" || demoSlot) && hasMessage(`${a.finding.key}.demonstrate`) && (
          <span className="text-soft">{msg(`${a.finding.key}.demonstrate`)}</span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-foreground text-background hover:bg-soft"
            onClick={() => fixFor(a).run()}
          >
            {fixLabel(a)}
          </Button>
          {!aboutTable(a) && (
            <Button variant="outline" onClick={() => fixFor(a).show?.()}>
              {t("lab.coach.showMe")}
            </Button>
          )}
        </div>
      </div>
    );
  });

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh bg-background text-foreground md:h-dvh">
        <Rail current="lab" />
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
              {/* On narrower screens the words give way so the header stays on one row; the select
                  keeps its name. */}
              <span className="sr-only min-[1320px]:not-sr-only">{t("lab.helpLevel.label")}</span>
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
            <Popover>
              <PopoverTrigger
                aria-label={t("lab.audio.label")}
                className="ml-auto flex h-9 items-center gap-1.5 border border-input bg-surface px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring md:ml-0"
              >
                {audio.settings.on ? (
                  <Volume2Icon className="size-4" aria-hidden />
                ) : (
                  <VolumeXIcon className="size-4" aria-hidden />
                )}
                <span className="hidden md:inline">{t("lab.audio.label")}</span>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <PopoverTitle>{t("lab.audio.title")}</PopoverTitle>
                <PopoverDescription>
                  {audio.canSpeak ? t("lab.audio.hint") : t("lab.audio.noSpeech")}
                </PopoverDescription>
                <div className="flex flex-col gap-3 text-sm">
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={audio.settings.on}
                      onChange={(e) => audio.update({ on: e.target.checked })}
                    />
                    {t("lab.audio.on")}
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    {t("lab.audio.verbosity")}
                    <select
                      className="h-9 border border-input bg-background px-2 text-sm text-foreground"
                      value={audio.settings.verbosity}
                      onChange={(e) =>
                        audio.update({
                          verbosity: e.target.value as (typeof VERBOSITY)[number],
                        })
                      }
                    >
                      {VERBOSITY.map((v) => (
                        <option key={v} value={v}>
                          {t(`lab.audio.verbosity.${v}` as MessageKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    {t("lab.audio.rate")}
                    <select
                      className="h-9 border border-input bg-background px-2 font-mono text-sm text-foreground"
                      value={audio.settings.rate}
                      onChange={(e) =>
                        audio.update({ rate: Number(e.target.value) as (typeof RATES)[number] })
                      }
                    >
                      {RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}×
                        </option>
                      ))}
                    </select>
                  </label>
                  {audio.voices.length > 0 && (
                    <label className="flex items-center justify-between gap-3">
                      {t("lab.audio.voice")}
                      <select
                        className="h-9 max-w-40 border border-input bg-background px-2 text-sm text-foreground"
                        value={audio.settings.voice ?? ""}
                        onChange={(e) => audio.update({ voice: e.target.value || undefined })}
                      >
                        <option value="">{t("lab.audio.voiceAuto")}</option>
                        {audio.voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(
                    [
                      ["voiceVolume", "lab.audio.voiceVolume"],
                      ["countVolume", "lab.audio.countVolume"],
                      ["soundsVolume", "lab.audio.soundsVolume"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between gap-3">
                      {t(label)}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        className="w-32 accent-primary"
                        value={audio.settings[key]}
                        onChange={(e) => audio.update({ [key]: Number(e.target.value) })}
                      />
                    </label>
                  ))}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={audio.settings.countAlong}
                      onChange={(e) => audio.update({ countAlong: e.target.checked })}
                    />
                    {t("lab.audio.countAlong")}
                  </label>
                </div>
              </PopoverContent>
            </Popover>
            {coachIsOn(state) && (
              <Popover>
                <PopoverTrigger className="hidden h-9 items-center border border-input bg-surface px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring md:flex">
                  {t("lab.assist.perSkill")}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <PopoverTitle>{t("lab.assist.title")}</PopoverTitle>
                  <PopoverDescription>{t("lab.assist.hint")}</PopoverDescription>
                  <div className="flex flex-col gap-2">
                    {(["apparatus", "measurement", "tabulation", "graph", "analysis"] as const).map(
                      (skill) => (
                        <label
                          key={skill}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          {t(`lab.assist.skill.${skill}` as MessageKey)}
                          <select
                            className="h-9 border border-input bg-background px-2 text-sm text-foreground"
                            value={state.skillLevels[skill] ?? ""}
                            onChange={(e) => {
                              const level = (e.target.value || undefined) as HelpLevel | undefined;
                              const ev = setSkillLevel(handle.state, skill, level);
                              if (ev) void handle.record([ev]);
                            }}
                          >
                            <option value="">
                              {t("lab.assist.same", {
                                level: t(`lab.helpLevel.${state.helpLevel}` as MessageKey),
                              })}
                            </option>
                            {HELP_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {t(`lab.helpLevel.${level}` as MessageKey)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ),
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              aria-label={t("lab.snapshot.label")}
              aria-keyshortcuts="C"
              className="h-9 gap-2 px-3 font-semibold"
              onClick={() => void takeSnapshot()}
            >
              <CameraIcon aria-hidden />
              <span className="hidden md:inline">{t("lab.snapshot.take")}</span>
            </Button>
            {/* The rail holds the notebook on a wide screen; the phone has it here. */}
            <Link
              href={`/lab/${E.id}/notebook`}
              aria-label={t("lab.rail.notebook")}
              className="flex size-11 items-center justify-center border border-input bg-surface md:hidden"
            >
              <BookOpenIcon className="size-5" aria-hidden />
            </Link>
          </header>
          <div className="h-[3px] bg-border md:hidden" aria-hidden>
            <div className="h-[3px] bg-primary" style={{ width: `${percent}%` }} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {state.step === "analyse" ? (
              <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 md:p-6">
                <AnalysePanel
                  triangle={graphShown.triangle}
                  sheet={graphShown.sheet}
                  symbols={{
                    x: columnFor(graphColumns.x)?.symbol ?? graphColumns.x,
                    y: columnFor(graphColumns.y)?.symbol ?? graphColumns.y,
                  }}
                  units={graphUnits}
                  forG={forG}
                  answers={answers}
                  expected={expected}
                  findings={analysisFindings}
                  assist={analysisAssist}
                  marks={analysisMarks && !analysisAssist}
                  onWrite={(id, answer) => {
                    const e = writeAnswer(answers, id, answer);
                    if (e) void handle.record([e]);
                  }}
                  onBackToPlot={() => void handle.dispatch({ type: "go-to-step", step: "plot" })}
                  below={
                    advice.length > 0 ? (
                      <div className="flex flex-col gap-3">{adviceCards}</div>
                    ) : null
                  }
                />
              </section>
            ) : state.step === "plot" ? (
              <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 md:p-6">
                <GraphPanel
                  state={plot.graph}
                  view={graphShown}
                  data={graphData}
                  headings={{
                    x: headingFor(table.columns, graphColumns.x),
                    y: headingFor(table.columns, graphColumns.y),
                  }}
                  numericColumns={numericColumns}
                  flaggedRows={graphFlagged}
                  partFindings={partFindings}
                  showChecks={graphMarks && !graphAssist}
                  onRun={plot.run}
                  latest={plot.now}
                  below={
                    advice.length > 0 ? (
                      <div className="flex flex-col gap-3">{adviceCards}</div>
                    ) : null
                  }
                />
              </section>
            ) : state.step === "tabulate" ? (
              <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 md:p-6">
                <TableBuilder
                  table={table}
                  shown={shownTable}
                  assist={tableAssist}
                  marks={tableMarks}
                  flags={tableFlags}
                  readings={readings}
                  onRun={results.run}
                  onFillReadings={tableAssist ? fillReadings : undefined}
                  onCommit={tableCommitted}
                  below={
                    advice.length > 0 ? (
                      <div className="flex flex-col gap-3 px-3 pb-3">{adviceCards}</div>
                    ) : null
                  }
                />
              </section>
            ) : (
              /* Bench */
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
                    length,
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
                      <div
                        role="group"
                        aria-label={t("lab.readout.length")}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xs text-muted-foreground">
                          {t("lab.readout.length")}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={t("lab.readout.shorter")}
                          disabled={running || length <= LENGTHS.min}
                          onClick={() => changeLength(-1)}
                        >
                          <MinusIcon />
                        </Button>
                        <span className="min-w-20 text-center font-mono" aria-live="polite">
                          {t("lab.readout.lengthNow", { length: length.toFixed(3) })}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={t("lab.readout.longer")}
                          disabled={running || length >= LENGTHS.max}
                          onClick={() => changeLength(1)}
                        >
                          <PlusIcon />
                        </Button>
                      </div>
                    )}
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
                  <Sym id="l" g={g} /> = {length.toFixed(3)} m · <Sym id="θ" g={g} /> ≈{" "}
                  {E.amplitudeDeg}°
                </div>
              </section>
            )}

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
                      {levelFor("apparatus") === "on-my-own" &&
                        coachIsOn(state) &&
                        assembled(assembly) && (
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
                  ) : state.step === "analyse" ? (
                    <>
                      <h2 className="font-display text-2xl leading-tight font-bold">
                        {t("experiments.simple-pendulum.analyse.title")}
                      </h2>
                      <p className="text-soft">{t("experiments.simple-pendulum.analyse.why")}</p>
                      <div className="flex flex-col gap-2">
                        {(["slope", "g"] as const).map((key, i) => (
                          <CheckItem
                            key={key}
                            n={i + 1}
                            state={
                              answered(key)
                                ? "done"
                                : key === "slope" || answered("slope")
                                  ? "current"
                                  : "todo"
                            }
                          >
                            {t(`experiments.simple-pendulum.analyse.${key}` as MessageKey)}
                          </CheckItem>
                        ))}
                      </div>
                      {levelFor("analysis") !== "auto" && coachIsOn(state) && (
                        <Button
                          variant="link"
                          className="self-start px-0"
                          onClick={() => void consult(analysisFindings, "asked")}
                        >
                          {t("lab.analyse.check")}
                        </Button>
                      )}
                      {!state.completed.includes("analyse") && (
                        <Button
                          data-finish-analysing
                          className="self-start"
                          onClick={() => void finishAnalysing()}
                        >
                          {checkedAnalysis === analysisSignature && advice.length
                            ? t("lab.steps.carryOn")
                            : t("lab.steps.finishAnalysing")}
                        </Button>
                      )}
                      {state.completed.includes("analyse") && next && (
                        <Button
                          className="self-start"
                          onClick={() => void handle.dispatch({ type: "go-to-step", step: next })}
                        >
                          {t("lab.steps.continue", { step: stepName(next) })}
                        </Button>
                      )}
                    </>
                  ) : state.step === "plot" ? (
                    <>
                      <h2 className="font-display text-2xl leading-tight font-bold">
                        {t("experiments.simple-pendulum.plot.title")}
                      </h2>
                      <p className="text-soft">{t("experiments.simple-pendulum.plot.why")}</p>
                      <div className="flex flex-col gap-2">
                        {(
                          [
                            ["scale", partFindings.scale.length === 0 && graphData.length >= 2],
                            [
                              "points",
                              graphShown.plotted.length >= graphData.length &&
                                graphData.length > 0 &&
                                partFindings.points.length === 0,
                            ],
                            [
                              "line",
                              graphShown.line !== undefined && partFindings.line.length === 0,
                            ],
                            [
                              "triangle",
                              graphShown.triangle !== undefined &&
                                partFindings.triangle.length === 0,
                            ],
                          ] as const
                        ).map(([key, done], i, all) => (
                          <CheckItem
                            key={key}
                            n={i + 1}
                            state={
                              done
                                ? "done"
                                : all.findIndex(([, d]) => !d) === i
                                  ? "current"
                                  : "todo"
                            }
                          >
                            {t(`experiments.simple-pendulum.plot.${key}` as MessageKey)}
                          </CheckItem>
                        ))}
                      </div>
                      {levelFor("graph") !== "auto" && coachIsOn(state) && (
                        <Button
                          variant="link"
                          className="self-start px-0"
                          onClick={() => void consult(graphFindings, "asked")}
                        >
                          {t("lab.graph.check")}
                        </Button>
                      )}
                      {!state.completed.includes("plot") && (
                        <Button
                          data-finish-plotting
                          className="self-start"
                          onClick={() => void finishPlotting()}
                        >
                          {checkedGraph === graphSignature && advice.length
                            ? t("lab.steps.carryOn")
                            : t("lab.steps.finishPlotting")}
                        </Button>
                      )}
                      {state.completed.includes("plot") && next && (
                        <Button
                          className="self-start"
                          onClick={() => void handle.dispatch({ type: "go-to-step", step: next })}
                        >
                          {t("lab.steps.continue", { step: stepName(next) })}
                        </Button>
                      )}
                    </>
                  ) : state.step === "tabulate" ? (
                    <>
                      <h2 className="font-display text-2xl leading-tight font-bold">
                        {t("experiments.simple-pendulum.tabulate.title")}
                      </h2>
                      <p className="text-soft">{t("experiments.simple-pendulum.tabulate.why")}</p>
                      <div className="flex flex-col gap-2">
                        {(
                          [
                            ["layout", table.layout !== undefined],
                            [
                              "readings",
                              parseTable(toTableView(shownTable)).completeRows.length >= 5,
                            ],
                            [
                              "derived",
                              table.layout !== undefined &&
                                !tableFindings.some((f) => f.rule === "table-derived-arithmetic") &&
                                shownTable.rows.some((r) =>
                                  table.columns.some(
                                    (c) => c.role === "derived" && (r.cells[c.id] ?? "") !== "",
                                  ),
                                ),
                            ],
                            [
                              "check",
                              table.layout !== undefined &&
                                !tableFindings.some((f) => f.rule === "table-heading-unit"),
                            ],
                          ] as const
                        ).map(([key, done], i, all) => (
                          <CheckItem
                            key={key}
                            n={i + 1}
                            state={
                              done
                                ? "done"
                                : all.findIndex(([, d]) => !d) === i
                                  ? "current"
                                  : "todo"
                            }
                          >
                            {t(`experiments.simple-pendulum.tabulate.${key}` as MessageKey)}
                          </CheckItem>
                        ))}
                      </div>
                      {levelFor("tabulation") !== "auto" && coachIsOn(state) && table.layout && (
                        <Button
                          variant="link"
                          className="self-start px-0"
                          onClick={() => {
                            const found = tableFindings.filter((f) => f.severity !== "good");
                            void consult(found, "asked");
                          }}
                        >
                          {t("lab.table.check")}
                        </Button>
                      )}
                      {!state.completed.includes("tabulate") && table.layout && (
                        <Button
                          data-finish-tabulating
                          className="self-start"
                          onClick={() => void finishTabulating()}
                        >
                          {checkedTable &&
                          checkedTable ===
                            JSON.stringify(shownTable.rows) + JSON.stringify(table.columns) &&
                          advice.length
                            ? t("lab.steps.carryOn")
                            : t("lab.steps.finishTabulating")}
                        </Button>
                      )}
                      {state.completed.includes("tabulate") && next && (
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
                      <p className="text-sm text-soft">
                        {t("experiments.simple-pendulum.measure.lengths")}
                      </p>
                      {adviceCards}
                      {levelFor("measurement") === "on-my-own" &&
                        coachIsOn(state) &&
                        timing?.stoppedAt !== undefined && (
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
                          {t("lab.readout.readings", { list: byLength(readings) })}
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
                      <p className="text-soft">
                        {state.step === "conclude"
                          ? t("report.concludeHint")
                          : state.step === "report"
                            ? t("report.openHint")
                            : t("lab.steps.notBuilt")}
                      </p>
                      {state.step === "report" && (
                        <Link
                          href={`/lab/${E.id}/report`}
                          className="flex h-9 items-center self-start bg-primary px-3 text-sm font-semibold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {t("report.open")}
                        </Link>
                      )}
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
                  <FormulaBox
                    card={PENDULUM_FORMULAS.find((f) => f.id === "period")!}
                    g={g}
                    legend={{
                      T: t("experiments.simple-pendulum.explanation.T"),
                      l: t("experiments.simple-pendulum.explanation.l"),
                      g: t("experiments.simple-pendulum.explanation.g"),
                    }}
                  />
                  <p className="text-soft">{t("experiments.simple-pendulum.explanation.graph")}</p>
                  <FormulaBox card={PENDULUM_FORMULAS.find((f) => f.id === "graph")!} g={g} />
                  <Link
                    href={`/lab/${E.id}/sheets`}
                    className="self-start text-sm text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {t("sheets.link")}
                  </Link>
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

          {/* "Fig. n taken", for a few seconds after a snapshot. Clicks pass through it, so it
              never gets in the way of the bench or the graph sheet. */}
          <div
            role="status"
            className="pointer-events-none fixed right-4 bottom-24 z-40 md:right-7"
          >
            {snapNote && (
              <div className="flex items-center gap-3 bg-foreground px-3.5 py-3 text-sm text-background">
                <CameraIcon className="size-4" aria-hidden />
                <span>{snapNote}</span>
              </div>
            )}
          </div>
          {audio.settings.on && (
            <p
              role="status"
              aria-label={t("lab.audio.caption")}
              className="min-h-10 border-t border-border bg-surface px-5 py-2.5 text-sm"
            >
              {audio.caption}
            </p>
          )}
          <StepStrip
            current={state.step}
            completed={state.completed}
            open={open}
            onGo={(step) => void handle.dispatch({ type: "go-to-step", step })}
            review={{
              href: `/lab/${E.id}/review`,
              open: state.completed.includes("analyse"),
            }}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
