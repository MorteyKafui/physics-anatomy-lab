"use client";

import { OpticalBench, ScreenFace } from "@pa/apparatus";
import {
  fillDerived,
  formatQuantity,
  formulaUnitFindings,
  GRAPH_RULES,
  parseTable,
  pointsFor,
  referenceLine,
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
  asLensReading,
  convergingLens,
  decideLensBench,
  GAUZE_REACH,
  LENS_ANALYSIS_RULES,
  LENS_GRAPH_RULES,
  LENS_INSTRUMENTS,
  LENS_PLOT,
  LENS_PROCEDURE_RULES,
  LENS_ROWS,
  LENS_STANDARD_TABLE,
  LENS_TEMPLATES,
  lensBenchProjection,
  lensExpected,
  lensReadingData,
  lensReadingsIntoTable,
  plotsInverseVAgainstInverseU,
  readPosition,
  recordedPosition,
  screenImage,
  type LensBenchCommand,
  type LensReading,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
// The lens copy is kept apart from the shared messages; this lab registers it.
import "@pa/i18n/converging-lens";
import { createRng } from "@pa/instruments";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { ChevronLeftIcon, TriangleAlertIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { graphColumnsFor, graphView, headingFor, lineAcrossAxes, useGraph } from "../graph-sheet";
import { AnswerLine, Calculator, GraphPanel, TableBuilder } from "../lazy-panels";
import { CheckItem, Rail, StepStrip } from "../parts";
import { flagsFor, useTable } from "../table-builder";
import { useAttempt } from "../use-attempt";

const E = convergingLens;
const P = "experiments.converging-lens";
const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key as MessageKey, params) : key;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const cm = (m: number) => (m * 100).toFixed(1);
/** The first reading's object distance, m, as the question sets it. */
const FIRST_U = E.objectDistances[0];
const MM = 0.001;

/**
 * The converging lens lab (the approved board "The converging lens: finding the image"): the
 * same lab as the others, with the optical bench, the shared table builder and graph sheet, and
 * the experiment's own analysis (f from the two intercepts of 1/v against 1/u). The report, print
 * sheets and exam come next.
 */
export function ConvergingLensScreen() {
  const handle = useAttempt(E.id);
  const [tab, setTab] = useState("instructions");
  const [refusal, setRefusal] = useState<string>();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [checked, setChecked] = useState<string>();
  // A slider's place while it is being dragged; recorded when it is let go.
  const [draft, setDraft] = useState<{ part: "lens" | "screen"; to: number }>();

  const bench = useMemo(
    () => (handle ? replay(lensBenchProjection, handle.attempt, handle.events) : undefined),
    [handle],
  );
  const prediction = useMemo(() => {
    const e = handle?.events.findLast((x) => x.kind === "converging-lens.predict");
    const choice = (e?.data as { choice?: string } | null)?.choice;
    return choice === "rise" || choice === "fall" || choice === "same" ? choice : undefined;
  }, [handle]);
  const results = useTable(handle);
  const plot = useGraph(handle);
  const answers = useMemo(
    () => (handle ? replay(answersProjection, handle.attempt, handle.events) : {}),
    [handle],
  );

  if (!handle || !bench) {
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
  const world = bench.world;

  const act = async (command: LensBenchCommand) => {
    const d = decideLensBench(bench, command);
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
  const shown = draft ? { ...bench, [draft.part]: draft.to } : bench;
  const image = screenImage(world, shown);
  const u = shown.lens - shown.object;
  const coaxial = Math.abs(bench.offAxis) <= E.coaxialTolerance;
  const atFirstU = Math.abs(bench.lens - bench.object - FIRST_U) < 0.0005;

  const readings = state.readings
    .map(asLensReading)
    .filter((r): r is LensReading => r !== undefined);
  const procedure = runRules(LENS_PROCEDURE_RULES, { readings, noImageAt: bench.noImageAt });
  const coaxialFinding = runRules(
    LENS_PROCEDURE_RULES.filter((r) => r.id === "lens-not-coaxial"),
    {
      readings: [
        {
          id: "bench",
          u: 0,
          v: 0,
          blur: 0,
          sharpestAt: 0,
          s: 0,
          readFrom: "centre",
          viewAngleDeg: 0,
          offAxis: bench.offAxis,
        },
      ],
      noImageAt: [],
    },
  );

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
  const readingText = (r: LensReading) =>
    t(`${P}.measure.reading`, { u: r.u.toFixed(1), v: r.v.toFixed(1) });

  // The table (step 6): u and v as read, 1/u and 1/v worked out.
  const table = results.table;
  const shownTable = tableAssist ? fillDerived(table) : table;
  const tableFindings = table.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shownTable)),
          plot: LENS_PLOT,
          // The range the student chooses is u's, which the question sets; v follows from it.
          spread: "u",
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
    const cells = lensReadingsIntoTable(current, readings, newRowId);
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

  // The graph (step 7): 1/v against 1/u by default, or any two columns the student picks.
  const numericColumns = table.columns.filter((c) => c.role !== "notes");
  const graphColumns = graphColumnsFor(plot.graph, table.columns, LENS_PLOT);
  const columnFor = (id: string) => table.columns.find((c) => c.id === id);
  const symbols = {
    x: columnFor(graphColumns.x)?.symbol ?? graphColumns.x,
    y: columnFor(graphColumns.y)?.symbol ?? graphColumns.y,
  };
  const graphData = pointsFor(shownTable, graphColumns.x, graphColumns.y);
  const graphShown = graphView(plot.graph, graphData, graphColumns, graphAssist, "both-axes");
  const rightGraph = plotsInverseVAgainstInverseU(graphColumns);
  // Where the line meets each axis: the student's line, or the best fit before they draw one.
  const reachLine = graphShown.line ?? referenceLine(graphData)?.line;
  const across = reachLine && rightGraph ? lineAcrossAxes(reachLine) : undefined;
  const graphFindings =
    graphData.length >= 2
      ? runRules(GRAPH_RULES, {
          sheet: graphShown.sheet,
          symbols,
          data: graphData,
          plotted: graphShown.plotted,
          line: graphShown.line,
          triangle: graphShown.triangle,
          // Both axes start from zero, and the line runs on to meet each of them at 1/f.
          reach: {
            x: [0, ...(across ? [across.to.x] : [])],
            y: [0, ...(across ? [across.from.y] : [])],
          },
        })
      : [];
  const lensGraphFindings = runRules(LENS_GRAPH_RULES, { columns: graphColumns, symbols });
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

  // The analysis (step 8): m1 and m2 where the line meets the axes, and f = 2 / (m1 + m2).
  const graphUnits = {
    x: columnFor(graphColumns.x)?.unit ?? "",
    y: columnFor(graphColumns.y)?.unit ?? "",
  };
  // f is a length in the unit the axes are the reciprocal of: cm⁻¹ gives cm.
  const fUnit = graphUnits.x.replace("⁻¹", "") || "cm";
  const expected = lensExpected(graphShown.line, graphColumns, graphUnits, answers);
  const analysisFindings = runRules(LENS_ANALYSIS_RULES, { answers, expected });
  const analysisFlags = (id: string) =>
    analysisMarks ? analysisFindings.filter((f) => f.column === id) : [];
  const write = (id: string) => (a: { value: string; unit: string }) => {
    const e = writeAnswer(answers, id, a);
    if (e) void handle.record([e]);
  };
  const shownAnswer = (id: "m1" | "m2" | "f", unit: string, fallback: string) => {
    const typed = answers[id];
    const want = expected[id];
    if (typed?.value) return `${typed.value} ${typed.unit}`.trim();
    return want ? formatQuantity(want, 3, unit) : fallback;
  };

  const finishPanelStep = async () => {
    if (state.step === "tabulate") {
      // At Auto the worked-out cells were filled in for the student; finishing writes them in.
      if (tableAssist) await keepWorkedCells();
      await finishChecked(tableFindings, `table:${JSON.stringify(shownTable)}`);
    } else if (state.step === "plot") {
      await finishChecked(
        [...lensGraphFindings, ...graphFindings],
        `graph:${JSON.stringify(plot.graph)}`,
      );
    } else {
      await finishChecked(analysisFindings, `analysis:${JSON.stringify(answers)}`);
    }
  };
  const panel = state.step === "tabulate" || state.step === "plot" || state.step === "analyse";

  const takeReading = async () => {
    const rng = createRng((handle.attempt.seed ^ (readings.length + 1)) >>> 0);
    const read = (x: number) => recordedPosition(readPosition(x, { rng }));
    const o = read(bench.object);
    const data = lensReadingData(bench, {
      u: Number((read(bench.lens) - o).toFixed(1)),
      v: Number((read(bench.screen) - read(bench.lens)).toFixed(1)),
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

  // A finding about a row says which one, by its number in the table as the student sees it.
  const rowOf = (f: { rows?: readonly string[] }) => {
    const i = results.table.rows.findIndex((r) => r.id === f.rows?.[0]);
    return i >= 0 ? i + 1 : "";
  };
  const findingCard = (
    f: { key: string; params?: Record<string, string | number>; rows?: readonly string[] },
    demonstrate = true,
  ) => (
    <div
      key={f.key}
      role="status"
      className="flex flex-col gap-2.5 border border-warn bg-warn-wash p-3.5"
    >
      <span className="flex items-center gap-2 font-semibold text-warn">
        <TriangleAlertIcon className="size-4" aria-hidden />
        {msg(`${f.key}.title`, { ...f.params, row: rowOf(f) })}
      </span>
      <span className="text-soft">{msg(`${f.key}.detail`, { ...f.params, row: rowOf(f) })}</span>
      {demonstrate && hasMessage(`${f.key}.demonstrate`) && (
        <span className="text-muted-foreground">{msg(`${f.key}.demonstrate`)}</span>
      )}
    </div>
  );
  const adviceCards = advice.map((a) => findingCard(a.finding, a.level === "demonstrate"));

  const imageState = image.kind !== "image" ? "none" : image.sharp ? "sharp" : "blurred";
  const description = t(`${P}.bench`, {
    object: cm(shown.object),
    lens: cm(shown.lens),
    screen: cm(shown.screen),
    image: t(`${P}.bench.${imageState}` as MessageKey),
  });
  const screenSize = 2 * E.screenHalfHeight;
  const face =
    image.kind === "image"
      ? {
          blur: Math.min(0.2, image.blur / screenSize / 4),
          size: Math.min(0.9, (2 * E.objectHalfHeight * image.magnification) / screenSize),
          offset: image.offset / screenSize,
        }
      : undefined;
  const faceLabel =
    image.kind !== "image"
      ? t(`${P}.screen.none`)
      : !image.onScreen
        ? t(`${P}.screen.offScreen`)
        : t(image.sharp ? `${P}.screen.sharp` : `${P}.screen.blurred`);

  const slider = (part: "lens" | "screen") => {
    const value = (draft?.part === part ? draft.to : bench[part]) * 100;
    const commit = () => {
      if (draft?.part !== part) return;
      const to = draft.to;
      setDraft(undefined);
      void act({ type: "move", part, to });
    };
    return (
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <span className="flex justify-between">
          {t(`${P}.measure.${part}`)}
          <span className="font-mono text-foreground">{value.toFixed(1)} cm</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={value}
          aria-valuetext={`${value.toFixed(1)} cm`}
          className="w-full accent-primary"
          onChange={(e) => setDraft({ part, to: Number(e.target.value) / 100 })}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
      </label>
    );
  };

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
            <span aria-hidden className="hidden size-2.5 bg-topic-light md:block" />
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
          <label className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <span className="sr-only min-[1320px]:not-sr-only">{t("lab.helpLevel.label")}</span>
            <select
              className="h-9 border border-input bg-surface px-2.5 text-sm font-medium text-foreground"
              value={state.helpLevel}
              onChange={(e) =>
                void handle.dispatch({ type: "set-help-level", level: e.target.value as HelpLevel })
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
                    standard: LENS_STANDARD_TABLE,
                    templates: LENS_TEMPLATES,
                    defaultTemplate: "single",
                    instruments: LENS_INSTRUMENTS,
                    defaultKind: "length",
                    rowsNeeded: Math.max(LENS_ROWS, new Set(readings.map((r) => r.u)).size),
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
                    advice.length > 0 || (graphMarks && lensGraphFindings.length > 0) ? (
                      <div className="flex flex-col gap-3">
                        {advice.length > 0
                          ? adviceCards
                          : lensGraphFindings.map((f) => findingCard(f))}
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
                    {!rightGraph || !graphShown.line ? (
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-soft">
                          {rightGraph
                            ? t(`${P}.analyse.needLine`)
                            : t(`${P}.analyse.otherGraph`, symbols)}
                        </p>
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
                          id="m1"
                          unit={graphUnits.y}
                          lead={t(`${P}.analyse.m1Lead`)}
                          written={answers.m1}
                          expected={expected.m1}
                          assist={analysisAssist}
                          marks={analysisMarks && !analysisAssist}
                          flagged={analysisFlags("m1")}
                          onWrite={write("m1")}
                        />
                        <AnswerLine
                          id="m2"
                          unit={graphUnits.x}
                          lead={t(`${P}.analyse.m2Lead`)}
                          written={answers.m2}
                          expected={expected.m2}
                          assist={analysisAssist}
                          marks={analysisMarks && !analysisAssist}
                          flagged={analysisFlags("m2")}
                          onWrite={write("m2")}
                        />
                        <AnswerLine
                          id="f"
                          unit={fUnit}
                          lead={t(`${P}.analyse.fLead`, {
                            m1: shownAnswer("m1", graphUnits.y, "m₁"),
                            m2: shownAnswer("m2", graphUnits.x, "m₂"),
                          })}
                          written={answers.f}
                          expected={expected.f}
                          assist={analysisAssist}
                          marks={analysisMarks && !analysisAssist}
                          flagged={analysisFlags("f")}
                          onWrite={write("f")}
                        />
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
              <div className="w-full max-w-[760px]">
                <OpticalBench
                  className="block h-auto w-full"
                  label={description}
                  object={shown.object}
                  lens={shown.lens}
                  screen={shown.screen}
                  offAxis={shown.offAxis}
                  objectHalfHeight={E.objectHalfHeight}
                  image={
                    image.kind === "image"
                      ? { at: image.sharpestAt, magnification: image.magnification }
                      : undefined
                  }
                />
              </div>
              <div className="flex w-full max-w-[760px] flex-wrap items-stretch gap-4">
                <div className="flex flex-col gap-2 border border-border bg-surface p-3">
                  <span className="text-xs text-muted-foreground">
                    {t(`${P}.measure.onScreen`)}
                  </span>
                  <ScreenFace image={face} label={faceLabel} />
                  <span
                    className={
                      imageState === "sharp"
                        ? "self-start border border-ok px-2 py-0.5 text-xs text-ok"
                        : "self-start border border-warn px-2 py-0.5 text-xs text-warn"
                    }
                  >
                    {t(
                      imageState === "sharp"
                        ? `${P}.measure.sharp`
                        : imageState === "blurred"
                          ? `${P}.measure.blurred`
                          : `${P}.measure.noImage`,
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 border border-border bg-surface p-3.5">
                  {slider("lens")}
                  {slider("screen")}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        void act({ type: "move", part: "screen", to: bench.screen - MM })
                      }
                    >
                      {t(`${P}.measure.towards`)}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        void act({ type: "move", part: "screen", to: bench.screen + MM })
                      }
                    >
                      {t(`${P}.measure.away`)}
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">{t(`${P}.measure.step`)}</span>
                </div>
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
                            void handle.record([
                              { kind: "converging-lens.predict", data: { choice: c } },
                            ])
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
                      <CheckItem n={1} state={atFirstU ? "done" : "current"}>
                        {t(`${P}.build.u`)}
                      </CheckItem>
                      <CheckItem n={2} state={coaxial ? "done" : atFirstU ? "current" : "todo"}>
                        {t(`${P}.build.coaxial`)}
                      </CheckItem>
                    </div>
                    <div className="flex flex-col gap-2 border border-border bg-background p-3.5">
                      <span className="flex justify-between text-sm text-muted-foreground">
                        {t(`${P}.build.gauze`)}
                        <span className="font-mono text-foreground">
                          {Math.abs(bench.offAxis) < MM / 2
                            ? t(`${P}.build.gauzeOn`)
                            : t(
                                bench.offAxis > 0 ? `${P}.build.gauzeAt` : `${P}.build.gauzeBelow`,
                                {
                                  mm: Math.round(Math.abs(bench.offAxis) / MM),
                                },
                              )}
                        </span>
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={bench.offAxis >= GAUZE_REACH}
                          onClick={() =>
                            void act({
                              type: "set-height",
                              to: Number((bench.offAxis + MM).toFixed(4)),
                            })
                          }
                        >
                          {t(`${P}.build.raise`)}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={bench.offAxis <= -GAUZE_REACH}
                          onClick={() =>
                            void act({
                              type: "set-height",
                              to: Number((bench.offAxis - MM).toFixed(4)),
                            })
                          }
                        >
                          {t(`${P}.build.lower`)}
                        </Button>
                      </div>
                    </div>
                    {adviceCards}
                    <Button
                      onClick={() =>
                        void finishChecked(
                          coaxialFinding,
                          `build:${bench.offAxis}:${bench.lens - bench.object}`,
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
                    {coaxialFinding.map((f) => findingCard(f))}
                    {!atFirstU && (
                      <p className="text-soft">
                        {t(`${P}.check.u`, { u: cm(bench.lens - bench.object) })}
                      </p>
                    )}
                    {coaxialFinding.length === 0 && atFirstU && (
                      <p className="text-soft">{t(`${P}.check.right`)}</p>
                    )}
                    {(coaxialFinding.length > 0 || !atFirstU) && (
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
                      {t(`${P}.measure.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.measure.why`)}</p>
                    <div className="flex gap-6 border border-border bg-background px-3.5 py-3 font-mono">
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">u</span>
                        {cm(u)} cm
                      </span>
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">v</span>
                        {image.kind === "image"
                          ? `${cm(shown.screen - shown.lens)} cm`
                          : t(`${P}.measure.noImage`)}
                      </span>
                    </div>
                    <Button className="self-start" onClick={() => void takeReading()}>
                      {t(`${P}.measure.take`)}
                    </Button>
                    {measureMarks && procedure.map((f) => findingCard(f))}
                    {adviceCards}
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {t(`${P}.measure.readings`)}
                      </span>
                      {readings.length ? (
                        <ol className="flex flex-col gap-0.5 font-mono text-sm">
                          {readings.map((r) => (
                            <li key={r.id}>
                              {t(`${P}.measure.reading`, { u: r.u.toFixed(1), v: r.v.toFixed(1) })}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-sm text-soft">{t(`${P}.measure.none`)}</span>
                      )}
                    </div>
                    <Button
                      disabled={!readings.length}
                      onClick={() =>
                        void finishChecked(
                          procedure,
                          `measure:${readings.length}:${bench.noImageAt.length}`,
                        )
                      }
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
                        ? t(`${P}.conclude.text`, { f: shownAnswer("f", fUnit, "f") })
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
                        (state.step === "check" && (coaxialFinding.length > 0 || !atFirstU))
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
                  <span className="text-center font-mono text-[22px]">1/u + 1/v = 1/f</span>
                  <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm text-soft">
                    {(["u", "v", "f"] as const).map((s) => (
                      <span key={s} className="contents">
                        <span className="font-mono text-foreground">{s}</span>
                        <span>{t(`${P}.explain.${s}`)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-soft">{t(`${P}.explain.graph`)}</p>
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
