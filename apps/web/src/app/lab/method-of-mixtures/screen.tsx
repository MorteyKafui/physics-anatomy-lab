"use client";

import { Calorimeter, ThermometerTrace } from "@pa/apparatus";
import {
  fillDerived,
  formatQuantity,
  formulaUnitFindings,
  GRAPH_RULES,
  parseTable,
  pointsFor,
  runRules,
  TABLE_RULES,
  toTableView,
  type Finding,
  type Skill,
} from "@pa/analysis";
import {
  answersProjection,
  coach,
  coachIsOn,
  decideExam,
  EMPTY_EXAM,
  examProjection,
  frontier,
  HELP_LEVELS,
  helpLevelFor,
  replay,
  STEPS,
  writeAnswer,
  type Advice,
  type HelpLevel,
  type Step,
} from "@pa/engine";
import {
  asMixturesReading,
  cylinderAtAngle,
  cylinderRead,
  decideMixtures,
  methodOfMixtures,
  MIXTURES_ANALYSIS_RULES,
  MIXTURES_GRAPH_RULES,
  MIXTURES_INSTRUMENTS,
  MIXTURES_PLOT,
  MIXTURES_PROCEDURE_RULES,
  MIXTURES_ROWS,
  MIXTURES_STANDARD_TABLE,
  MIXTURES_TEMPLATES,
  mixturesExpected,
  mixturesReadingsIntoTable,
  plotsVAgainstInverseT,
  slopeOf,
  mixturesAt,
  mixturesPeak,
  mixturesProjection,
  mixturesReadingData,
  readThermometer,
  recordedTemperature,
  type MixturesBench,
  type MixturesCommand,
  type MixturesReading,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
// The mixtures copy is kept apart from the shared messages.
import "@pa/i18n/method-of-mixtures";
import { createRng } from "@pa/instruments";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { ChevronLeftIcon, TriangleAlertIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { graphColumnsFor, graphView, headingFor, useGraph } from "../graph-sheet";
import { AnswerLine, Calculator, GraphPanel, TableBuilder } from "../lazy-panels";
import { CheckItem, Rail, StepStrip } from "../parts";
import { flagsFor, useTable } from "../table-builder";
import { ExamBar } from "../exam/bar";
import { backToPractice, useAttempt } from "../use-attempt";

const E = methodOfMixtures;
const P = "experiments.method-of-mixtures";
const HEATED = "method-of-mixtures.heated";
const PREDICT = "method-of-mixtures.predict";
const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key as MessageKey, params) : key;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const deg = (c: number) => c.toFixed(1);
/** The first run's cold volume, cm³, as the question sets it. */
const FIRST_V = E.volumes[0];
/** Where the eye is when reading a scale: above it looks down, below it looks up, degrees. */
const EYE = { above: 20, level: 0, below: -20 } as const;
type Eye = keyof typeof EYE;
const EYES = Object.keys(EYE) as Eye[];
/** A toggle pressed in is drawn light, as on the board. */
const pressed = (on: boolean) =>
  on
    ? "flex-1 border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background dark:border-foreground dark:bg-foreground dark:hover:bg-foreground/90"
    : "flex-1";
/** The thermometer has no noise: one generator serves every reading. */
const rng = createRng(1);

/**
 * The method of mixtures (the approved board "The method of mixtures: reading the highest
 * temperature"): the same lab as the others, with the calorimeter, the thermometer's trace since
 * the pour, and a clock that runs on the pour's own time, so it carries on across a reload as the
 * real mixture would; then the shared table builder and graph sheet, and the experiment's own
 * analysis (W from where V against 1/T meets the V axis). Exam mode runs the same lab with the coach
 * off, against the clock.
 */
export function MethodOfMixturesScreen() {
  const handle = useAttempt(E.id);
  const [tab, setTab] = useState("instructions");
  const [refusal, setRefusal] = useState<string>();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [checked, setChecked] = useState<string>();
  // The measuring cylinder as the student fills it: what it reads, and where their eye is.
  const [cylinder, setCylinder] = useState<number>(FIRST_V);
  const [cylinderEye, setCylinderEye] = useState<Eye>("level");
  const [thermometerEye, setThermometerEye] = useState<Eye>("level");
  const [now, setNow] = useState(() => Date.now());

  const bench = useMemo(
    () => (handle ? replay(mixturesProjection, handle.attempt, handle.events) : undefined),
    [handle],
  );
  const prediction = useMemo(() => {
    const e = handle?.events.findLast((x) => x.kind === PREDICT);
    const choice = (e?.data as { choice?: string } | null)?.choice;
    return choice === "rise" || choice === "fall" || choice === "same" ? choice : undefined;
  }, [handle]);
  const results = useTable(handle);
  const plot = useGraph(handle);
  const answers = useMemo(
    () => (handle ? replay(answersProjection, handle.attempt, handle.events) : {}),
    [handle],
  );
  const router = useRouter();
  // Exam mode: the clock, from the attempt's own events.
  const exam = useMemo(
    () => (handle ? replay(examProjection, handle.attempt, handle.events) : EMPTY_EXAM),
    [handle],
  );
  const handIn = useCallback(
    async (auto: boolean) => {
      if (!handle) return;
      const now = replay(examProjection, handle.attempt, handle.events);
      const d = decideExam(handle.attempt.mode, now, { type: "hand-in", auto });
      if (d.ok) await handle.record(d.events);
      router.push(`/lab/${E.id}/exam`);
    },
    [handle, router],
  );
  // When this mixture's hot water reached 65 °C, and when it was poured, from the events: the
  // last of each since the calorimeter was last emptied.
  const times = useMemo(() => {
    const events = handle?.events ?? [];
    const since = events.findLastIndex((e) => e.kind === "calorimeter.empty");
    const after = events.slice(since + 1);
    return {
      heated: after.findLast((e) => e.kind === HEATED)?.at,
      poured: after.findLast((e) => e.kind === "hot.pour")?.at,
    };
  }, [handle]);

  const poured = bench?.pouredAfter !== null && bench?.pouredAfter !== undefined;
  const ticking = poured || times.heated !== undefined;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [ticking]);

  const t0 = poured && times.poured !== undefined ? Math.max(0, (now - times.poured) / 1000) : 0;
  const second = Math.floor(t0);
  const view = useMemo(() => (bench ? mixturesAt(bench, t0) : undefined), [bench, t0]);
  // The trace, one point a second, as far as the student has watched.
  const trace = useMemo(() => {
    if (!bench || !poured) return [];
    const points = Array.from({ length: second + 1 }, (_, s) => ({
      t: s,
      reading: mixturesAt(bench, s).thermometer,
    }));
    return points;
  }, [bench, poured, second]);
  const peak = useMemo(() => (bench && poured ? mixturesPeak(bench) : undefined), [bench, poured]);

  if (!handle || !bench || !view) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center text-muted-foreground"
        aria-busy="true"
      >
        {t("lab.loading")}
      </main>
    );
  }

  const state = handle.state;
  const stepIndex = STEPS.indexOf(state.step);
  const percent = Math.round((state.completed.length / STEPS.length) * 100);
  const next = STEPS[stepIndex + 1];

  const act = async (command: MixturesCommand) => {
    const d = decideMixtures(bench, command);
    if (!d.ok) {
      setRefusal(t(`${P}.refused.${d.reason}` as MessageKey));
      return false;
    }
    setRefusal(undefined);
    await handle.record(d.events);
    return true;
  };
  const finishStep = async () => {
    await handle.dispatch({ type: "complete-step" });
    if (next) await handle.dispatch({ type: "go-to-step", step: next });
    setAdvice([]);
    setRefusal(undefined);
  };
  /** Finish a step, first letting the coach act once on what the step's checks found. */
  const finishChecked = async (findings: readonly Finding[], signature: string) => {
    const real = findings.filter((f) => f.severity !== "good");
    if (real.length && checked !== signature) {
      setChecked(signature);
      const out = coach(handle.state, real, "step-exit");
      await handle.record(out.events);
      setAdvice(out.advice);
      if (out.advice.length) return;
    }
    await finishStep();
  };

  const building = state.step === "build";
  const measuring = state.step === "measure";
  const coldRead = cylinderRead(bench, "cold");
  const hotRead = cylinderRead(bench, "hot");
  const filled = coldRead !== null && hotRead !== null;
  const near = (a: number | null, b: number) => a !== null && Math.abs(a - b) < 0.5;
  const setUpRight = near(coldRead, FIRST_V) && near(hotRead, E.hot.volume) && bench.covered;

  const readings = state.readings
    .map(asMixturesReading)
    .filter((r): r is MixturesReading => r !== undefined);
  const procedure = runRules(MIXTURES_PROCEDURE_RULES, { readings });
  // The cylinder's check on the bench as it stands, as a reading of it would judge it.
  const benchReading = (b: MixturesBench): MixturesReading => ({
    id: "bench",
    volume: 0,
    start: 0,
    highest: 0,
    t: 0,
    cold: b.cold ?? 0,
    hot: b.hot ?? 0,
    covered: b.covered,
    stirring: true,
    pouredAfter: 0,
    coldAngle: b.coldAngle,
    hotAngle: b.hotAngle,
    thermometerAngle: 0,
  });
  const cylinderFinding = filled
    ? runRules([cylinderAtAngle], { readings: [benchReading(bench)] })
    : [];

  // Help levels, as in the other labs (master plan, "Assist levels").
  const levelFor = (skill: Skill): HelpLevel =>
    coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";
  const measureMarks = levelFor("measurement") !== "on-my-own";
  const tableAssist = levelFor("tabulation") === "auto";
  const tableMarks = levelFor("tabulation") !== "on-my-own";
  const graphAssist = levelFor("graph") === "auto";
  const graphMarks = levelFor("graph") !== "on-my-own";
  const analysisAssist = levelFor("analysis") === "auto";
  const analysisMarks = levelFor("analysis") !== "on-my-own";
  const readingText = (r: MixturesReading) =>
    t(`${P}.measure.reading`, {
      v: r.volume,
      start: deg(r.start),
      highest: deg(r.highest),
      rise: deg(r.highest - r.start),
    });

  // The table (step 6): V and T as measured, 1/T worked out.
  const table = results.table;
  const shownTable = tableAssist ? fillDerived(table) : table;
  const tableFindings = table.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shownTable)),
          plot: MIXTURES_PLOT,
          // The range the student chooses is V's, which the question sets; T follows from it.
          spread: "V",
        }),
        ...formulaUnitFindings(table),
      ]
    : [];
  const tableFlags = flagsFor(
    tableMarks
      ? tableFindings.filter((f) => f.severity !== "good")
      : advice.map((a) => a.finding).filter((f) => f.skill === "tabulation"),
  );
  const fillReadings = () => {
    const current = results.now();
    const newRowId = () => `row-${globalThis.crypto.randomUUID().slice(0, 8)}`;
    const cells = mixturesReadingsIntoTable(current, readings, newRowId);
    const newRows = [...new Set(cells.map((c) => c.row))].filter(
      (id) => !current.rows.some((r) => r.id === id),
    );
    void results.run([
      ...newRows.map((id) => ({ type: "add-row" as const, id })),
      ...cells.map((c) => ({ type: "set-cell" as const, ...c })),
    ]);
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

  // The graph (step 7): V against 1/T by default, carried back to the V axis.
  const numericColumns = table.columns.filter((c) => c.role !== "notes");
  const graphColumns = graphColumnsFor(plot.graph, table.columns, MIXTURES_PLOT);
  const columnFor = (id: string) => table.columns.find((c) => c.id === id);
  const symbols = {
    x: columnFor(graphColumns.x)?.symbol ?? graphColumns.x,
    y: columnFor(graphColumns.y)?.symbol ?? graphColumns.y,
  };
  const graphData = pointsFor(shownTable, graphColumns.x, graphColumns.y);
  const graphShown = graphView(plot.graph, graphData, graphColumns, graphAssist, "y-axis");
  const rightGraph = plotsVAgainstInverseT(graphColumns);
  const graphFindings =
    graphData.length >= 2
      ? runRules(GRAPH_RULES, {
          sheet: graphShown.sheet,
          symbols,
          data: graphData,
          plotted: graphShown.plotted,
          line: graphShown.line,
          triangle: graphShown.triangle,
        })
      : [];
  const mixturesGraphFindings = runRules(MIXTURES_GRAPH_RULES, { columns: graphColumns, symbols });
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

  // The analysis (step 8): the slope from the triangle, V where the line meets the V axis, and W.
  const graphUnits = {
    x: columnFor(graphColumns.x)?.unit ?? "",
    y: columnFor(graphColumns.y)?.unit ?? "",
  };
  // V over 1/T: cm³ over °C⁻¹ is cm³ °C.
  const slopeUnit = rightGraph ? "cm³ °C" : `${graphUnits.y} ${graphUnits.x}⁻¹`.trim();
  const expected = mixturesExpected(
    graphShown.triangle,
    graphShown.line,
    graphColumns,
    graphUnits,
    answers,
  );
  const analysisFindings = runRules(MIXTURES_ANALYSIS_RULES, { answers, expected });
  const slope = graphShown.triangle && slopeOf(graphShown.triangle, graphUnits);
  const analysisFlags = (id: string) =>
    analysisMarks ? analysisFindings.filter((f) => f.column === id) : [];
  const write = (id: string) => (a: { value: string; unit: string }) => {
    const e = writeAnswer(answers, id, a);
    if (e) void handle.record([e]);
  };
  /** An answer as the student wrote it, or as worked out from their graph. */
  const answerText = (id: "intercept" | "W") => {
    const typed = answers[id];
    if (typed?.value) return `${typed.value} ${typed.unit}`.trim();
    const worked = id === "intercept" ? expected.intercept : expected.W;
    return worked ? formatQuantity(worked, 3, "cm³") : id;
  };

  const finishPanelStep = async () => {
    if (state.step === "tabulate") {
      // At Auto the worked-out cells were filled in for the student; finishing writes them in.
      if (tableAssist) await keepWorkedCells();
      await finishChecked(tableFindings, `table:${JSON.stringify(shownTable)}`);
    } else if (state.step === "plot") {
      await finishChecked(
        [...mixturesGraphFindings, ...graphFindings],
        `graph:${JSON.stringify(plot.graph)}`,
      );
    } else {
      await finishChecked(analysisFindings, `analysis:${JSON.stringify(answers)}`);
    }
  };
  const panel = state.step === "tabulate" || state.step === "plot" || state.step === "analyse";

  // What the thermometer shows the student, read from where their eye is, to 0.1 °C.
  const shownAt = (b: MixturesBench, at: number) =>
    recordedTemperature(readThermometer(b, at, { rng, viewAngleDeg: EYE[thermometerEye] }));
  const shown = shownAt(bench, t0);
  const start = shownAt({ ...bench, pouredAfter: null }, 0);
  const rising = poured && mixturesAt(bench, t0 + 0.5).thermometer > view.thermometer;
  const lastTen = poured
    ? view.thermometer - mixturesAt(bench, Math.max(0, t0 - 10)).thermometer
    : 0;
  const unstirredCost =
    poured && !bench.stirring
      ? mixturesPeak({ ...bench, stirring: true }).temperature - (peak?.temperature ?? 0)
      : 0;

  const takeReading = async () => {
    const data = mixturesReadingData(bench, {
      volume: Math.round(coldRead ?? 0),
      start,
      highest: shown,
      t: Number(t0.toFixed(1)),
      thermometerAngle: EYE[thermometerEye],
    });
    if (!data) {
      setRefusal(t(`${P}.measure.cannot`));
      return;
    }
    setRefusal(undefined);
    await handle.dispatch({
      type: "record-reading",
      id: `reading-${globalThis.crypto.randomUUID().slice(0, 8)}`,
      data,
    });
  };

  const findingCard = (
    f: { key: string; params?: Record<string, string | number> },
    demonstrate = true,
  ) => (
    <div
      key={f.key}
      role="status"
      className="flex flex-col gap-2.5 border border-warn bg-warn-wash p-3.5"
    >
      <span className="flex items-center gap-2 font-semibold text-warn">
        <TriangleAlertIcon className="size-4" aria-hidden />
        {msg(`${f.key}.title`, f.params)}
      </span>
      <span className="text-soft">{msg(`${f.key}.detail`, f.params)}</span>
      {demonstrate && hasMessage(`${f.key}.demonstrate`) && (
        <span className="text-muted-foreground">{msg(`${f.key}.demonstrate`, f.params)}</span>
      )}
    </div>
  );
  const adviceCards = advice.map((a) => findingCard(a.finding, a.level === "demonstrate"));

  const description = t(`${P}.bench`, {
    lid: t(bench.covered ? `${P}.bench.covered` : `${P}.bench.uncovered`),
    cold: Math.round((bench.cold ?? 0) + (poured ? (bench.hot ?? 0) : 0)),
    hot: poured ? 0 : Math.round(bench.hot ?? 0),
    reading: deg(shown),
  });
  const figTitle = !poured
    ? `${P}.fig.setup`
    : bench.stirring
      ? `${P}.fig.mixing`
      : `${P}.fig.unstirred`;

  const eyeChoice = (value: Eye, set: (e: Eye) => void, name: string) => (
    <div
      role="group"
      aria-label={name}
      className="flex gap-0.5 border border-border bg-surface p-0.5"
    >
      {EYES.map((e) => (
        <button
          key={e}
          type="button"
          aria-pressed={value === e}
          onClick={() => set(e)}
          className={
            value === e
              ? "h-8 flex-1 bg-foreground px-3 text-sm font-medium text-background"
              : "h-8 flex-1 px-3 text-sm font-medium text-soft"
          }
        >
          {t(`${P}.eye.${e}`)}
        </button>
      ))}
    </div>
  );

  const cylinderCard = (
    <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 border border-border bg-surface p-3.5">
      <span className="flex justify-between text-sm text-muted-foreground">
        {t(`${P}.cylinder.title`)}
        <span className="font-mono text-foreground">{cylinder} cm³</span>
      </span>
      <div className="flex gap-2">
        {(
          [
            ["down10", -10],
            ["down1", -1],
            ["up1", 1],
            ["up10", 10],
          ] as const
        ).map(([key, by]) => (
          <Button
            key={key}
            variant="outline"
            className="flex-1"
            aria-label={t(`${P}.cylinder.${key}`)}
            onClick={() => setCylinder((v) => Math.min(E.cylinderCapacity, Math.max(0, v + by)))}
          >
            {by > 0 ? `+${by}` : `−${-by}`}
          </Button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{t(`${P}.cylinder.eye`)}</span>
      {eyeChoice(cylinderEye, setCylinderEye, t(`${P}.cylinder.eye`))}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() =>
            void act({ type: "fill", vessel: "cold", to: cylinder, viewAngleDeg: EYE[cylinderEye] })
          }
        >
          {t(`${P}.cylinder.toCalorimeter`)}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() =>
            void act({ type: "fill", vessel: "hot", to: cylinder, viewAngleDeg: EYE[cylinderEye] })
          }
        >
          {t(`${P}.cylinder.toBeaker`)}
        </Button>
      </div>
    </div>
  );

  const thermometerCard = (
    <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5 border border-border bg-surface p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{t(`${P}.measure.thermometer`)}</span>
        <span className="font-mono text-[28px] leading-none">{deg(shown)} °C</span>
      </div>
      {poured && (
        <div className="flex justify-between text-sm text-muted-foreground">
          {t(`${P}.measure.since`)}
          <span className="font-mono text-foreground">{second} s</span>
        </div>
      )}
      {poured && measureMarks && (
        <span
          className={
            rising
              ? "self-start border border-warn px-2 py-0.5 text-xs text-warn"
              : "self-start border border-ok px-2 py-0.5 text-xs text-ok"
          }
        >
          {t(rising ? `${P}.measure.rising` : `${P}.measure.stopped`)}
        </span>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={pressed(bench.stirring)}
          aria-pressed={bench.stirring}
          disabled={poured}
          onClick={() => void act({ type: "stir", on: !bench.stirring })}
        >
          {t(bench.stirring ? `${P}.measure.stirring` : `${P}.measure.stir`)}
        </Button>
        <Button
          variant="outline"
          className={pressed(bench.covered)}
          aria-pressed={bench.covered}
          disabled={poured}
          onClick={() => void act({ type: "cover", on: !bench.covered })}
        >
          {t(bench.covered ? `${P}.lid.on` : `${P}.lid.off`)}
        </Button>
      </div>
      {eyeChoice(thermometerEye, setThermometerEye, t(`${P}.cylinder.eye`))}
      <span className="text-xs text-muted-foreground">{t(`${P}.measure.eyeLevel`)}</span>
    </div>
  );

  const measureTitle = !poured
    ? `${P}.measure.title`
    : !bench.stirring
      ? `${P}.measure.stirTitle`
      : rising
        ? `${P}.measure.watch`
        : `${P}.measure.title`;

  return (
    <div className="flex min-h-dvh bg-background text-foreground md:h-dvh">
      <Rail current="lab" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-5 py-3">
          <Link
            href="/"
            aria-label={t("lab.header.back")}
            className="flex size-11 items-center justify-center md:hidden"
          >
            <ChevronLeftIcon className="size-5" aria-hidden />
          </Link>
          <div className="flex items-center gap-3 md:border md:border-border md:bg-surface md:px-3.5 md:py-2">
            <span aria-hidden className="hidden size-2.5 bg-topic-heat md:block" />
            <div className="flex flex-col">
              <h1 className="font-semibold">{t(`${P}.title`)}</h1>
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
          <span className="hidden flex-1 md:block" />
          {/* In an exam the coach is off: no help level to choose. */}
          {state.mode !== "exam" && (
            <label className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <span className="sr-only min-[1320px]:not-sr-only">{t("lab.helpLevel.label")}</span>
              <select
                className="h-9 border border-input bg-surface px-2.5 text-sm font-medium text-foreground"
                value={state.helpLevel}
                onChange={(e) =>
                  void handle.dispatch({
                    type: "set-help-level",
                    level: e.target.value as HelpLevel,
                  })
                }
              >
                {HELP_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {t(`lab.helpLevel.${lvl}` as MessageKey)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>
        {handle.attempt.mode === "exam" &&
          exam.startedAt !== undefined &&
          exam.handedInAt === undefined && (
            <ExamBar startedAt={exam.startedAt} onHandIn={(auto) => void handIn(auto)} />
          )}
        {handle.attempt.mode === "exam" && exam.handedInAt !== undefined && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-5 py-3 text-sm">
            <span>{exam.auto ? t("exam.timeUp") : t("exam.handedIn")}</span>
            <Link href={`/lab/${E.id}/exam`} className="font-semibold underline underline-offset-2">
              {t("exam.seeScript")}
            </Link>
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => void backToPractice(E.id).then(() => window.location.reload())}
            >
              {t("exam.backToPractice")}
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {panel ? (
            <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 md:p-6">
              {state.step === "tabulate" && (
                <TableBuilder
                  table={table}
                  shown={shownTable}
                  assist={tableAssist}
                  marks={tableMarks}
                  flags={tableFlags}
                  spec={{
                    standard: MIXTURES_STANDARD_TABLE,
                    templates: MIXTURES_TEMPLATES,
                    defaultTemplate: "single",
                    instruments: MIXTURES_INSTRUMENTS,
                    defaultKind: "temperature-difference",
                    rowsNeeded: Math.max(
                      MIXTURES_ROWS,
                      new Set(readings.map((r) => r.volume)).size,
                    ),
                    readingsSummary: readings.length
                      ? readings.map(readingText).join(" · ")
                      : undefined,
                  }}
                  onRun={results.run}
                  onFillReadings={tableAssist ? fillReadings : undefined}
                  onCommit={() => undefined}
                  below={
                    advice.length > 0 ? (
                      <div className="flex flex-col gap-3 px-3 pb-3">{adviceCards}</div>
                    ) : null
                  }
                />
              )}
              {state.step === "plot" && (
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
                    advice.length > 0 || (graphMarks && mixturesGraphFindings.length > 0) ? (
                      <div className="flex flex-col gap-3">
                        {advice.length > 0
                          ? adviceCards
                          : mixturesGraphFindings.map((f) => findingCard(f))}
                      </div>
                    ) : null
                  }
                />
              )}
              {state.step === "analyse" && (
                <section
                  aria-label={t("lab.analyse.label")}
                  className="flex w-full min-w-0 flex-col gap-4"
                >
                  <div className="flex flex-col gap-3 border border-border bg-surface p-4">
                    <h2 className="text-sm text-muted-foreground">{t("lab.analyse.label")}</h2>
                    {!graphShown.triangle || !slope ? (
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-soft">{t("lab.analyse.needTriangle")}</p>
                        <Button
                          variant="outline"
                          onClick={() => void handle.dispatch({ type: "go-to-step", step: "plot" })}
                        >
                          {t("lab.analyse.backToPlot")}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5 font-mono text-[15px]">
                        <AnswerLine
                          id="slope"
                          unit={slopeUnit}
                          lead={t(`${P}.analyse.slopeLead`, {
                            rise: slope.rise.toFixed(1),
                            run: slope.run.toFixed(4),
                            yu: graphUnits.y,
                            xu: graphUnits.x,
                          })}
                          written={answers.slope}
                          expected={expected.slope}
                          assist={analysisAssist}
                          marks={analysisMarks && !analysisAssist}
                          flagged={analysisFlags("slope")}
                          onWrite={write("slope")}
                        />
                        {!rightGraph ? (
                          <p className="font-sans text-sm text-soft">
                            {t(`${P}.analyse.otherGraph`, symbols)}
                          </p>
                        ) : !graphShown.line ? (
                          <p className="font-sans text-sm text-soft">
                            {t(`${P}.analyse.needLine`)}
                          </p>
                        ) : (
                          <>
                            <AnswerLine
                              id="intercept"
                              unit="cm³"
                              lead={t(`${P}.analyse.interceptLead`)}
                              written={answers.intercept}
                              expected={expected.intercept}
                              assist={analysisAssist}
                              marks={analysisMarks && !analysisAssist}
                              flagged={analysisFlags("intercept")}
                              onWrite={write("intercept")}
                            />
                            <AnswerLine
                              id="W"
                              unit="cm³"
                              lead={t(`${P}.analyse.wLead`, { intercept: answerText("intercept") })}
                              written={answers.W}
                              expected={expected.W}
                              assist={analysisAssist}
                              marks={analysisMarks && !analysisAssist}
                              flagged={analysisFlags("W")}
                              onWrite={write("W")}
                            />
                          </>
                        )}
                        {analysisAssist && (
                          <span className="font-sans text-xs text-muted-foreground">
                            {t("lab.analyse.workedOut")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 border border-border bg-surface p-4">
                    <h2 className="text-sm text-muted-foreground">{t("lab.analyse.calculator")}</h2>
                    <Calculator />
                  </div>
                  {advice.length > 0 && <div className="flex flex-col gap-3">{adviceCards}</div>}
                </section>
              )}
            </section>
          ) : (
            <section className="flex min-w-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 pt-6 pb-10 md:px-6">
              <div className="flex w-full max-w-[760px] flex-col">
                <span className="text-xs text-muted-foreground">{t(`${P}.fig.label`)}</span>
                <span className="font-semibold">{t(figTitle)}</span>
              </div>
              <div className="w-full max-w-[760px]">
                <Calorimeter
                  className="block h-auto w-full"
                  label={description}
                  calorimeterWater={(bench.cold ?? 0) + (poured ? (bench.hot ?? 0) : 0)}
                  beakerWater={poured ? 0 : (bench.hot ?? 0)}
                  covered={bench.covered}
                  stirring={bench.stirring}
                  thermometer={view.thermometer}
                  layered={view.layered}
                />
              </div>
              <div className="flex w-full max-w-[760px] flex-wrap items-stretch gap-4">
                {poured ? (
                  <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2 border border-border bg-surface p-3">
                    <span className="text-xs text-muted-foreground">{t(`${P}.measure.trace`)}</span>
                    <ThermometerTrace
                      className="block h-auto w-full"
                      points={trace}
                      axes={{ time: t(`${P}.axes.time`), temperature: t(`${P}.axes.temperature`) }}
                      label={t(`${P}.measure.traceLabel`, { t: second, reading: deg(shown) })}
                    />
                  </div>
                ) : (
                  (building || measuring) && cylinderCard
                )}
                {thermometerCard}
              </div>
              {refusal && (
                <p
                  role="alert"
                  className="w-full max-w-[760px] border border-warn bg-warn-wash p-3 text-sm"
                >
                  {refusal}
                </p>
              )}
            </section>
          )}

          <aside
            aria-label={t("lab.coach.label")}
            className="flex min-w-0 flex-col border-border bg-surface md:w-[380px] md:overflow-y-auto md:border-l"
          >
            <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
              <TabsList
                variant="line"
                className="h-auto! w-full justify-start gap-5 border-b border-border px-5 py-0"
              >
                {(["instructions", "explanation", "tips"] as const).map((v) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="flex-none px-0 py-3.5 text-sm after:bg-primary"
                  >
                    {t(`lab.coach.${v}`)}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="instructions" className="flex flex-col gap-3.5 p-5">
                {state.step === "question" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.question.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.question.text`)}</p>
                  </>
                )}
                {state.step === "predict" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.predict.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.predict.text`)}</p>
                    <div
                      className="flex flex-col gap-2"
                      role="group"
                      aria-label={t(`${P}.predict.title`)}
                    >
                      {(["rise", "fall", "same"] as const).map((c) => (
                        <Button
                          key={c}
                          variant={prediction === c ? "default" : "outline"}
                          aria-pressed={prediction === c}
                          onClick={() =>
                            void handle.record([{ kind: PREDICT, data: { choice: c } }])
                          }
                        >
                          {t(`${P}.predict.${c}`)}
                        </Button>
                      ))}
                    </div>
                    {prediction && (
                      <p className="text-muted-foreground">
                        {t(`${P}.predict.saved`, { choice: t(`${P}.predict.${prediction}`) })}
                      </p>
                    )}
                  </>
                )}
                {building && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.build.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.build.why`)}</p>
                    <div className="flex flex-col gap-1.5">
                      <CheckItem n={1} state={near(coldRead, FIRST_V) ? "done" : "current"}>
                        {t(`${P}.build.cold`)}
                      </CheckItem>
                      <CheckItem
                        n={2}
                        state={
                          near(hotRead, E.hot.volume)
                            ? "done"
                            : near(coldRead, FIRST_V)
                              ? "current"
                              : "todo"
                        }
                      >
                        {t(`${P}.build.hot`)}
                      </CheckItem>
                      <CheckItem n={3} state={bench.covered ? "done" : filled ? "current" : "todo"}>
                        {t(`${P}.build.lid`)}
                      </CheckItem>
                    </div>
                    {adviceCards}
                    <Button
                      onClick={() =>
                        void finishChecked(
                          cylinderFinding,
                          `build:${bench.coldAngle}:${bench.hotAngle}:${coldRead}:${hotRead}`,
                        )
                      }
                    >
                      {t("lab.steps.finishBuilding")}
                    </Button>
                  </>
                )}
                {state.step === "check" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.check.title`)}
                    </h2>
                    {cylinderFinding.map((f) => findingCard(f))}
                    {!filled && <p className="text-soft">{t(`${P}.check.empty`)}</p>}
                    {filled && !near(coldRead, FIRST_V) && (
                      <p className="text-soft">
                        {t(`${P}.check.cold`, { v: Math.round(coldRead ?? 0) })}
                      </p>
                    )}
                    {filled && !near(hotRead, E.hot.volume) && (
                      <p className="text-soft">
                        {t(`${P}.check.hot`, { v: Math.round(hotRead ?? 0) })}
                      </p>
                    )}
                    {filled && !bench.covered && <p className="text-soft">{t(`${P}.build.lid`)}</p>}
                    {setUpRight && cylinderFinding.length === 0 && (
                      <p className="text-soft">{t(`${P}.check.right`)}</p>
                    )}
                    {(!setUpRight || cylinderFinding.length > 0) && (
                      <Button
                        variant="outline"
                        onClick={() => void handle.dispatch({ type: "go-to-step", step: "build" })}
                      >
                        {t(`${P}.check.fix`)}
                      </Button>
                    )}
                  </>
                )}
                {measuring && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(measureTitle)}
                    </h2>
                    <p className="text-soft">
                      {!poured
                        ? t(`${P}.measure.why`)
                        : bench.stirring && !rising
                          ? t(`${P}.measure.atHighest`, { reading: deg(shown), t: second })
                          : t(`${P}.measure.watchText`)}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <CheckItem n={1} state={coldRead !== null ? "done" : "current"}>
                        {t(`${P}.measure.step1`, {
                          v: Math.round(coldRead ?? FIRST_V),
                          start: deg(start),
                        })}
                      </CheckItem>
                      <CheckItem
                        n={2}
                        state={poured ? "done" : coldRead !== null ? "current" : "todo"}
                      >
                        {t(`${P}.measure.step2`, { hot: Math.round(hotRead ?? E.hot.volume) })}
                      </CheckItem>
                      <CheckItem n={3} state={poured ? "current" : "todo"}>
                        {t(`${P}.measure.step3`)}
                      </CheckItem>
                    </div>
                    <div className="flex gap-6 border border-border bg-background px-3.5 py-3 font-mono">
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">
                          {t(`${P}.measure.V`)}
                        </span>
                        {Math.round(coldRead ?? 0)} cm³
                      </span>
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">
                          {t(`${P}.measure.starting`)}
                        </span>
                        {deg(start)} °C
                      </span>
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">
                          {t(`${P}.measure.now`)}
                        </span>
                        {deg(shown)} °C
                      </span>
                    </div>
                    {!poured && times.heated === undefined && (
                      <Button
                        className="self-start"
                        disabled={!filled}
                        onClick={() => void handle.record([{ kind: HEATED, data: {} }])}
                      >
                        {t(`${P}.measure.heat`)}
                      </Button>
                    )}
                    {!poured && times.heated !== undefined && (
                      <>
                        <p className="text-soft">{t(`${P}.measure.heated`)}</p>
                        <Button
                          className="self-start"
                          onClick={() =>
                            void act({
                              type: "pour",
                              after: Math.max(0, (Date.now() - times.heated!) / 1000),
                            })
                          }
                        >
                          {t(`${P}.measure.pour`)}
                        </Button>
                      </>
                    )}
                    {poured && bench.stirring && !rising && (
                      <p className="text-soft">
                        {t(`${P}.measure.rise`, {
                          highest: deg(shown),
                          start: deg(start),
                          rise: deg(shown - start),
                        })}
                      </p>
                    )}
                    {poured && (
                      <Button className="self-start" onClick={() => void takeReading()}>
                        {t(`${P}.measure.take`)}
                      </Button>
                    )}
                    {poured && measureMarks && bench.stirring && rising && second >= 2 && (
                      <div
                        role="status"
                        className="flex flex-col gap-2.5 border border-border bg-background p-3.5"
                      >
                        <span className="font-semibold">{t(`${P}.measure.stillRising.title`)}</span>
                        <span className="text-soft">
                          {t(`${P}.measure.stillRising.detail`, { celsius: deg(lastTen) })}
                        </span>
                      </div>
                    )}
                    {poured &&
                      measureMarks &&
                      !bench.stirring &&
                      peak &&
                      findingCard({
                        key: `${P}.measure.unstirred`,
                        params: {
                          reading: deg(shown),
                          t: second,
                          minutes: Math.round(peak.at / 60),
                          celsius: deg(unstirredCost),
                        },
                      })}
                    {measureMarks && procedure.map((f) => findingCard(f))}
                    {adviceCards}
                    {(poured || filled) && (
                      <Button variant="outline" onClick={() => void act({ type: "empty" })}>
                        {t(`${P}.measure.empty`)}
                      </Button>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {t(`${P}.measure.readings`)}
                      </span>
                      {readings.length ? (
                        <ol className="flex flex-col gap-0.5 font-mono text-sm">
                          {readings.map((r) => (
                            <li key={r.id}>
                              {t(`${P}.measure.reading`, {
                                v: r.volume,
                                start: deg(r.start),
                                highest: deg(r.highest),
                                rise: deg(r.highest - r.start),
                              })}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-sm text-soft">{t(`${P}.measure.none`)}</span>
                      )}
                    </div>
                    <Button
                      disabled={!readings.length}
                      onClick={() => void finishChecked(procedure, `measure:${readings.length}`)}
                    >
                      {t("lab.steps.finishMeasuring")}
                    </Button>
                  </>
                )}
                {panel && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.${state.step}.title` as MessageKey)}
                    </h2>
                    <p className="text-soft">{t(`${P}.${state.step}.why` as MessageKey)}</p>
                    <Button onClick={() => void finishPanelStep()}>
                      {state.step === "tabulate"
                        ? t("lab.steps.finishTabulating")
                        : state.step === "plot"
                          ? t("lab.steps.finishPlotting")
                          : t("lab.steps.finishAnalysing")}
                    </Button>
                  </>
                )}
                {(state.step === "conclude" || state.step === "report") && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {stepName(state.step)}
                    </h2>
                    <p className="text-soft">
                      {state.step === "conclude"
                        ? t(`${P}.conclude.text`, { W: answerText("W") })
                        : t("report.openHint")}
                    </p>
                    {state.step === "report" && (
                      <Link
                        href={`/lab/${E.id}/report`}
                        className="flex h-9 items-center self-start bg-primary px-3 text-sm font-semibold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {t("report.open")}
                      </Link>
                    )}
                    {state.step === "conclude" && next && (
                      <Button className="self-start" onClick={() => void finishStep()}>
                        {t("lab.steps.continue", { step: stepName(next) })}
                      </Button>
                    )}
                  </>
                )}
                {(state.step === "question" ||
                  state.step === "predict" ||
                  state.step === "check") &&
                  next && (
                    <Button
                      disabled={
                        (state.step === "predict" && !prediction) ||
                        (state.step === "check" && (!setUpRight || cylinderFinding.length > 0))
                      }
                      onClick={() => void finishStep()}
                    >
                      {t("lab.steps.continue", { step: stepName(next) })}
                    </Button>
                  )}
              </TabsContent>

              <TabsContent value="explanation" className="flex flex-col gap-3.5 p-5">
                <h2 className="font-display text-2xl leading-tight font-bold">
                  {t(`${P}.explain.title`)}
                </h2>
                <p className="text-soft">{t(`${P}.explain.text`)}</p>
                <div className="flex flex-col gap-2.5 border border-border bg-background p-4">
                  <span className="text-center font-mono text-[22px]">
                    V = 50 (65 − θ₀) ⁄ T − (50 + W)
                  </span>
                  <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm text-soft">
                    {(["V", "T", "W"] as const).map((s) => (
                      <span key={s} className="contents">
                        <span className="font-mono text-foreground">{s}</span>
                        <span>{t(`${P}.explain.${s}`)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-soft">{t(`${P}.explain.graph`)}</p>
                <Link
                  href={`/lab/${E.id}/sheets`}
                  className="self-start text-sm text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {t("sheets.link")}
                </Link>
                {handle.attempt.mode !== "exam" && (
                  <Link
                    href={`/lab/${E.id}/exam`}
                    className="self-start text-sm text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {t("exam.try")}
                  </Link>
                )}
              </TabsContent>

              <TabsContent value="tips" className="flex flex-col gap-3 p-5">
                <h2 className="font-display text-2xl leading-tight font-bold">
                  {t(`${P}.tips.title`)}
                </h2>
                <ul className="flex list-disc flex-col gap-2 pl-4.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <li key={n}>{t(`${P}.tips.${n}` as MessageKey)}</li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </aside>
        </div>

        <StepStrip
          current={state.step}
          completed={state.completed}
          open={(s) => STEPS.indexOf(s) <= STEPS.indexOf(frontier(state))}
          onGo={(s) => void handle.dispatch({ type: "go-to-step", step: s })}
        />
      </div>
    </div>
  );
}
