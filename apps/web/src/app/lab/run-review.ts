"use client";

import {
  fillDerived,
  formulaUnitFindings,
  GRAPH_RULES,
  parseTable,
  pointsFor,
  runRules,
  TABLE_RULES,
  toTableView,
  formatQuantity,
  type Finding,
  type Quantity,
  type Skill,
  type TableDesign,
} from "@pa/analysis";
import {
  answersProjection,
  coachIsOn,
  coachProjection,
  eventsBeforeStep,
  graphProjection,
  helpLevelFor,
  replay,
  runProjection,
  STEPS,
  tableProjection,
  type Attempt,
  type CoachState,
  type Json,
  type LabEvent,
  type AnswersState,
  type RunOrigin,
  type Step,
  type TableState,
} from "@pa/engine";
import {
  ANALYSIS_RULES,
  ASSEMBLY_RULES,
  assemblyProjection,
  asReading,
  effectOf,
  expectedAnswers,
  G_DIMS,
  PENDULUM_PLOT,
  rightWay,
  simplePendulum,
  STEP_FOR_SKILL,
  typedQuantity,
  type Assembly,
  type MistakeEffect,
  type RightWay,
} from "@pa/experiments";

import { coachHistory } from "./coach-history";
import { graphColumnsFor, graphView, type GraphView } from "./graph-sheet";

/**
 * The review of one run (master plan, "Review, retry and compare"), worked out from its events:
 * the result, every mistake with its effect on g, and the numbers the compare table shows. Pure,
 * so a run on this device and the same run from an attempt file review alike.
 */

export interface RunReading {
  id: string;
  t: number;
  l: number;
  count: number;
  countedFromOne: boolean;
}

export interface ReviewMistake {
  rule: string;
  skill: Skill;
  /** Message key; the title and detail are `${key}.title` and `${key}.detail`. */
  key: string;
  params: Record<string, string | number>;
  /** The step where the coach first raised it, or where that work is done. */
  step: Step;
  /** Still in the result now, or put right before it. */
  stillIn: boolean;
  effect: MistakeEffect;
  /** The step to redo from, to put it right. */
  redoFrom: Step;
}

export interface RunReview {
  attempt: Attempt;
  state: CoachState;
  origin: RunOrigin | undefined;
  assembly: Assembly;
  readings: RunReading[];
  /** The student's slope and g as they wrote them, or as worked out for them at Auto. */
  slope: { text: string; value: number } | undefined;
  g: { text: string; value: number } | undefined;
  mistakes: ReviewMistake[];
  /** The analysis is done and the feedback read: Compare can open. */
  canCompare: boolean;
  /** The same bench, every step done the right way, at this run's lengths. */
  right: RightWay;
  /** The table and graph as the lab showed them, and what the analysis expects: for the report. */
  table: TableState;
  shownTable: TableDesign;
  view: GraphView;
  columns: { x: string; y: string };
  units: { x: string; y: string };
  answers: AnswersState;
  expected: ReturnType<typeof expectedAnswers>;
  /** Every finding as the attempt stands, step finished or not (an exam is marked from these). */
  findings: { assembly: Finding[]; table: Finding[]; graph: Finding[]; analysis: Finding[] };
}

const levelOf = (state: CoachState, skill: Skill) =>
  coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";

const SEVERE = new Set(["error", "warning"]);

const textOf = (a: { value: string; unit: string } | undefined) =>
  a && a.value.trim() !== "" ? `${a.value.trim()} ${a.unit}`.trim() : undefined;

/** Everything the review shows about one run. */
export function reviewRun(attempt: Attempt, events: readonly LabEvent[], g: number): RunReview {
  const state = replay(coachProjection, attempt, events);
  const assembly = replay(assemblyProjection, attempt, events);
  const readings: RunReading[] = state.readings.flatMap((r) => {
    const base = asReading(r);
    if (!base) return [];
    const d = (r.data ?? {}) as Record<string, Json>;
    return [
      {
        ...base,
        count: typeof d.count === "number" ? d.count : simplePendulum.swings,
        countedFromOne: d.countedFromOne === true,
      },
    ];
  });

  // The table, the graph and the analysis, as the lab showed them (Auto fills in for the student).
  const table = replay(tableProjection, attempt, events);
  const shownTable = levelOf(state, "tabulation") === "auto" ? fillDerived(table) : table;
  const tableFindings = shownTable.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shownTable)),
          plot: PENDULUM_PLOT,
        }),
        ...formulaUnitFindings(table),
      ]
    : [];
  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, PENDULUM_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const data = pointsFor(shownTable, columns.x, columns.y);
  const view = graphView(graph, data, columns, levelOf(state, "graph") === "auto");
  // Every graph and analysis finding as things stand; the review counts them only once the step is
  // finished, but an exam script is marked as it was handed in.
  const allGraphFindings =
    data.length >= 2
      ? runRules(GRAPH_RULES, {
          sheet: view.sheet,
          symbols: {
            x: column(columns.x)?.symbol ?? columns.x,
            y: column(columns.y)?.symbol ?? columns.y,
          },
          data,
          plotted: view.plotted,
          line: view.line,
          triangle: view.triangle,
        })
      : [];
  const graphFindings = state.completed.includes("plot") ? allGraphFindings : [];
  const answers = replay(answersProjection, attempt, events);
  const units = { x: column(columns.x)?.unit ?? "", y: column(columns.y)?.unit ?? "" };
  const expected = expectedAnswers(view.triangle, columns, units, answers);
  const analysisAuto = levelOf(state, "analysis") === "auto";
  const allAnalysisFindings = analysisAuto ? [] : runRules(ANALYSIS_RULES, { answers, expected });
  const analysisFindings = state.completed.includes("analyse") ? allAnalysisFindings : [];

  // The timing mistakes are in the readings themselves.
  const fromOne = readings.filter((r) => r.countedFromOne);
  const early = readings.filter((r) => r.count < simplePendulum.swings);
  const timingFindings: Finding[] = [
    ...(fromOne.length
      ? [
          {
            rule: "pendulum-count-from-one",
            severity: "error" as const,
            skill: "measurement" as const,
            key: "findings.pendulum.countFromOne",
            params: {
              timed: simplePendulum.swings - 1,
              percent: Math.round(effectPercent("pendulum-count-from-one", {}, g)),
            },
          },
        ]
      : []),
    ...(early.length
      ? [
          {
            rule: "pendulum-stopped-early",
            severity: "warning" as const,
            skill: "measurement" as const,
            key: "findings.pendulum.stoppedEarly",
            params: {
              count: Math.min(...early.map((r) => r.count)),
              target: simplePendulum.swings,
            },
          },
        ]
      : []),
  ];
  const assemblyFindings = state.completed.includes("build")
    ? runRules(ASSEMBLY_RULES, { assembly })
    : [];
  const now = [
    ...assemblyFindings,
    ...timingFindings,
    ...tableFindings,
    ...graphFindings,
    ...analysisFindings,
  ].filter((f) => SEVERE.has(f.severity));

  // Every mistake once: the coach's history first (it knows the step), then what is still there.
  const history = coachHistory(attempt, events);
  const rows = (f: Finding): Record<string, number> => {
    const i = table.rows.findIndex((r) => r.id === f.rows?.[0]);
    return i >= 0 ? { row: i + 1 } : {};
  };
  const byRule = new Map<string, ReviewMistake>();
  for (const h of history) {
    if (byRule.has(h.rule)) continue;
    byRule.set(h.rule, {
      ...h,
      stillIn: false,
      effect: { kind: "none" },
      redoFrom: STEP_FOR_SKILL[h.skill] as Step,
    });
  }
  for (const f of now) {
    const known = byRule.get(f.rule);
    const params = { ...(known?.params ?? {}), ...(f.params ?? {}), ...rows(f) };
    byRule.set(f.rule, {
      rule: f.rule,
      skill: f.skill,
      key: f.key,
      params,
      step: known?.step ?? (STEP_FOR_SKILL[f.skill] as Step),
      stillIn: true,
      effect: effectOf({ ...f, params }, g),
      redoFrom: STEP_FOR_SKILL[f.skill] as Step,
    });
  }
  const mistakes = [...byRule.values()].sort(
    (a, b) =>
      STEPS.indexOf(a.step) - STEPS.indexOf(b.step) || Number(b.stillIn) - Number(a.stillIn),
  );

  // The result: what the student wrote, or what was worked out for them at Auto.
  const slopeText = textOf(answers.slope);
  const gText = textOf(answers.g);
  const slopeValue =
    typedQuantity(answers.slope, expected.slope ?? { value: 0, dims: [-1, 0, 2, 0, 0] })?.value ??
    expected.slope?.value;
  const gValue = typedQuantity(answers.g, { value: 0, dims: G_DIMS })?.value ?? expected.g?.value;
  // Worked out at Auto: three significant figures in the quantity's own units, as the lab shows.
  const shown = (q: Quantity | undefined, v: number) =>
    formatQuantity(q ?? { value: v, dims: G_DIMS }, 3);

  return {
    attempt,
    state,
    origin: replay(runProjection, attempt, events),
    assembly,
    readings,
    slope:
      slopeValue === undefined
        ? undefined
        : { text: slopeText ?? shown(expected.slope, slopeValue), value: slopeValue },
    g:
      gValue === undefined
        ? undefined
        : { text: gText ?? shown(expected.g, gValue), value: gValue },
    mistakes,
    canCompare: state.completed.includes("analyse") && state.feedbackRead,
    right: rightWay(
      g,
      readings.map((r) => r.l),
    ),
    table,
    shownTable,
    view,
    columns,
    units,
    answers,
    expected,
    findings: {
      assembly: runRules(ASSEMBLY_RULES, { assembly }),
      table: tableFindings.filter((f) => SEVERE.has(f.severity)),
      graph: allGraphFindings.filter((f) => SEVERE.has(f.severity)),
      analysis: allAnalysisFindings.filter((f) => SEVERE.has(f.severity)),
    },
  };
}

function effectPercent(rule: string, params: Record<string, string | number>, g: number) {
  const e = effectOf({ rule, skill: "measurement", params }, g);
  return e.kind === "raised" ? e.percent : 0;
}

/** The steps a run can be redone from: Question, and every step it went on to. */
export const redoableSteps = (events: readonly LabEvent[]): Step[] =>
  STEPS.filter((s) => eventsBeforeStep(events, s) !== undefined);
