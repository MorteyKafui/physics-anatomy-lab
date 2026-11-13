"use client";

import {
  fillDerived,
  formatQuantity,
  GRAPH_RULES,
  heading,
  parseTable,
  pointsFor,
  runRules,
  TABLE_RULES,
  toTableView,
  type Finding,
  type Quantity,
  type Skill,
} from "@pa/analysis";
import {
  answersProjection,
  coachIsOn,
  coachProjection,
  graphProjection,
  helpLevelFor,
  replay,
  reportProjection,
  tableProjection,
  type Attempt,
  type CoachState,
  type LabEvent,
  type Snapshot,
} from "@pa/engine";
import {
  asSolidReading,
  hotSolid,
  metalOf,
  methodOfMixtures,
  MIXTURES_THERMOMETER,
  plotsThetaAgainstT,
  SOLID_ANALYSIS_RULES,
  SOLID_GRAPH_RULES,
  SOLID_PLOT,
  solidAtEntry,
  solidExpected,
  solidProjection,
  solidSheet,
  tabulatedRun,
  type SolidReading,
} from "@pa/experiments";
import { BALANCE } from "@pa/instruments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { coachHistory } from "../coach-history";
import { graphColumnsFor, graphView, headingFor } from "../graph-sheet";
import {
  REPORT_SECTIONS,
  statusOf,
  type ReportContent,
  type ReportSection,
} from "../report/content";
import { figureDate, type FigureScene } from "../snapshot-figure";

/**
 * The method of mixtures with a hot solid: its report (master plan, "Lab report"), in the WASSCE
 * or university format, generated from the attempt's events as the other labs' are. Every number
 * comes from the run's own readings, the apparatus and the analysis packages (AGENTS.md rule 1).
 */

const H = hotSolid;
const P = "experiments.method-of-mixtures-solid";
const R = `${P}.report`;
const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join("\n");
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
const SEVERE = new Set(["error", "warning"]);
const EARLY = "solid-read-before-peak";
const SLOW = "solid-slow-transfer";
const CARRIED = "solid-water-carried";
const SPLASHED = "solid-splashed";
const UNSTIRRED = "solid-not-stirred";
const UNCOVERED = "solid-not-covered";
const ANGLE = "solid-thermometer-at-angle";
/** Mistakes in how the readings were taken: they stay in the readings, so they are sources of error. */
const PROCEDURE = new Set([EARLY, SLOW, CARRIED, SPLASHED, UNSTIRRED, UNCOVERED, ANGLE]);
const deg = (c: number) => c.toFixed(1);
const g = (grams: number) => grams.toFixed(1);

const levelOf = (state: CoachState, skill: Skill) =>
  coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";

/** A typed answer as the student wrote it, or the worked-out value in the unit given. */
const answerText = (
  typed: { value: string; unit: string } | undefined,
  worked: Quantity | undefined,
  unit: string,
) =>
  typed && typed.value.trim() !== ""
    ? `${typed.value.trim()} ${typed.unit}`.trim()
    : worked
      ? formatQuantity(worked, 3, unit)
      : undefined;

function figureAtTheEnd(
  kind: "bench" | "graph",
  events: readonly LabEvent[],
  caption: string,
): Snapshot {
  const last = events.at(-1);
  return {
    id: `report-${kind}`,
    kind,
    step: "report",
    caption,
    auto: true,
    takenAt: last?.at ?? 0,
    point: { seq: Number.MAX_SAFE_INTEGER, device: "~", id: "~" },
    bench: undefined,
    deleted: false,
  };
}

/** The whole hot-solid report for one run. Pure. */
export function solidReport(attempt: Attempt, events: readonly LabEvent[]): ReportContent {
  const state = replay(coachProjection, attempt, events);
  const report = replay(reportProjection, attempt, events);
  const bench = replay(solidProjection, attempt, events);
  const experiment = t(`${P}.title`);
  const title = t(`${R}.title`, { experiment });
  const date = figureDate(attempt.createdAt).split(",")[0]!;
  const footer = (at: number) =>
    t("figure.footer", {
      experiment,
      version: H.version,
      date: figureDate(at),
      seed: attempt.seed,
    });

  const readings = state.readings
    .map(asSolidReading)
    .filter((r): r is SolidReading => r !== undefined);
  const run = tabulatedRun(readings);

  // The table, the graph and the analysis, as the lab showed them (Auto fills in for the student).
  const table = replay(tableProjection, attempt, events);
  const shownTable = levelOf(state, "tabulation") === "auto" ? fillDerived(table) : table;
  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, SOLID_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const symbol = (id: string) => column(id)?.symbol ?? id;
  const rightGraph = plotsThetaAgainstT(columns);
  const data = pointsFor(shownTable, columns.x, columns.y);
  const view = graphView(graph, data, columns, levelOf(state, "graph") === "auto", "points");
  const answers = replay(answersProjection, attempt, events);
  const expected = solidExpected(view.plotted, columns, run, answers);
  // Named only once c is found (decision 7): after the analysis.
  const metal = state.completed.includes("analyse") ? metalOf(bench.world.metal.c) : undefined;

  // The figures: the solid in the water as it was last used, and the graph as it was drawn.
  const benchCaption = t(`${R}.benchCaption`);
  const graphCaption = t("report.gen.graphCaption", { y: symbol(columns.y), x: symbol(columns.x) });
  const benchSnapshot = figureAtTheEnd("bench", events, benchCaption);
  const graphSnapshot = figureAtTheEnd("graph", events, graphCaption);
  const benchScene: FigureScene = {
    snapshot: benchSnapshot,
    fig: 1,
    title: t("figure.title.bench", { experiment }),
    alt: t(`${R}.benchAlt`, { caption: benchCaption }),
    legend: (["B", "S", "C", "T"] as const).map((letter) => ({
      letter: t(`${R}.letter.${letter}`),
      name: t(`${R}.legend.${letter}`),
    })),
    values: run
      ? [
          t(`${R}.values.bench`, {
            solid: g(run.solid),
            water: g(run.filled - run.empty),
            highest: deg(run.highest),
          }),
        ]
      : [],
    footer: footer(benchSnapshot.takenAt),
    drawing: {
      kind: "hot-solid",
      balance: run?.solid,
      water: run?.water ?? bench.water ?? 0,
      covered: run?.covered ?? bench.covered,
      stirring: run?.stirring ?? bench.stirring,
      thermometer: run?.highest ?? methodOfMixtures.room,
    },
  };
  const graphScene: FigureScene = {
    snapshot: graphSnapshot,
    fig: 2,
    title: t("figure.title.graph", { experiment }),
    alt: t("figure.alt.graph", {
      caption: graphCaption,
      y: symbol(columns.y),
      x: symbol(columns.x),
    }),
    legend: [],
    values: [
      view.plotted.length === 1
        ? t("figure.values.plotted.one")
        : t("figure.values.plotted", { count: view.plotted.length }),
    ],
    footer: footer(graphSnapshot.takenAt),
    drawing: {
      kind: "graph",
      view,
      headings: {
        x: headingFor(table.columns, columns.x),
        y: headingFor(table.columns, columns.y),
      },
    },
  };

  // The result: what the student wrote, or what was worked out for them at Auto.
  const tText = answerText(answers.T, expected.T, "°C");
  const cText = answerText(answers.c, expected.c, "J kg⁻¹ K⁻¹");
  const calculation =
    rightGraph && run && tText
      ? lines(
          t(`${R}.calcT`, { T: tText }),
          cText &&
            t(`${R}.calcC`, {
              ms: (run.solid / 1000).toFixed(4),
              mc: (run.empty / 1000).toFixed(4),
              mw: ((run.filled - run.empty) / 1000).toFixed(4),
              cc: H.given.calorimeter,
              cw: H.given.water,
              t0: deg(run.start),
              t: tText.replace(" °C", ""),
              c: cText,
            }),
        )
      : "";

  // Mistakes: the coach's history, and what is still wrong in the work now.
  const history = coachHistory(attempt, events);
  const raised = new Set(history.map((h) => h.rule));
  const tableFindings = shownTable.layout
    ? runRules(TABLE_RULES, { table: parseTable(toTableView(shownTable)) })
    : [];
  const graphFindings =
    state.completed.includes("plot") && data.length >= 2
      ? [
          ...runRules(GRAPH_RULES, {
            sheet: view.sheet,
            symbols: { x: symbol(columns.x), y: symbol(columns.y) },
            data,
            plotted: view.plotted,
            line: view.line,
            triangle: view.triangle,
          }),
          ...runRules(SOLID_GRAPH_RULES, {
            columns,
            symbols: { x: symbol(columns.x), y: symbol(columns.y) },
          }),
        ]
      : [];
  const analysisFindings =
    state.completed.includes("analyse") && levelOf(state, "analysis") !== "auto"
      ? runRules(SOLID_ANALYSIS_RULES, { answers, expected })
      : [];
  const stillIn = new Set(
    [...tableFindings, ...graphFindings, ...analysisFindings]
      .filter((f: Finding) => SEVERE.has(f.severity))
      .map((f) => f.rule),
  );

  const any = readings.length > 0;
  const precautions = lines(
    !raised.has(SLOW) && any && t(`${R}.precaution.quick`),
    !raised.has(CARRIED) && any && t(`${R}.precaution.shake`),
    !raised.has(SPLASHED) && any && t(`${R}.precaution.gently`),
    !raised.has(UNSTIRRED) && any && t(`${R}.precaution.stir`),
    !raised.has(UNCOVERED) && t(`${R}.precaution.lid`),
    !raised.has(EARLY) && any && t(`${R}.precaution.highest`),
    !raised.has(ANGLE) && any && t(`${R}.precaution.eye`),
  );

  // From the model: how far the minute readings can miss the highest, for this run's metal.
  const sheet = solidSheet();
  const own = sheet.metals.find((m) => m.metal.c === bench.world.metal.c) ?? sheet.metals[0]!;
  const missed = own.peak.temperature - Math.max(...own.minutes);
  const sources = lines(
    raised.has(EARLY) && t(`${R}.source.early`),
    raised.has(SLOW) && t(`${R}.source.slow`),
    raised.has(CARRIED) && t(`${R}.source.carried`),
    raised.has(SPLASHED) && t(`${R}.source.splashed`),
    raised.has(UNSTIRRED) && t(`${R}.source.unstirred`),
    raised.has(UNCOVERED) && t(`${R}.source.uncovered`),
    raised.has(ANGLE) && t(`${R}.source.angle`),
    t(`${R}.source.leastCount`, {
      grams: BALANCE.resolution,
      celsius: MIXTURES_THERMOMETER.resolution,
    }),
    run &&
      t(`${R}.source.air`, {
        seconds: Math.round(run.after),
        entry: deg(solidAtEntry(run.after)),
      }),
    t(`${R}.source.minutes`, { celsius: missed.toFixed(2) }),
  );

  const observations = !run
    ? ""
    : lines(
        t(readings.length === 1 ? `${R}.observations.one` : `${R}.observations.readings`, {
          n: readings.length,
        }),
        t(`${R}.observations.change`, {
          t0: deg(run.start),
          T: deg(run.highest),
          rise: deg(run.highest - run.start),
          fall: deg(H.boiling - run.highest),
        }),
        t(`${R}.observations.peak`),
      );

  const method = lines(
    state.completed.includes("build") && t(`${R}.method.weigh`),
    any && t(`${R}.method.transfer`),
    state.completed.includes("plot") &&
      (rightGraph
        ? t(`${R}.method.analyse`)
        : t(`${R}.method.analyseOther`, { y: symbol(columns.y), x: symbol(columns.x) })),
  );

  const apparatus = lines(
    t(`${R}.apparatus.solid`, { grams: H.solidMass }),
    t(`${R}.apparatus.balance`, { grams: BALANCE.resolution }),
    t(`${R}.apparatus.calorimeter`, {
      grams: (methodOfMixtures.calorimeter.mass * 1000).toFixed(0),
    }),
    t(`${R}.apparatus.thermometer`, { celsius: MIXTURES_THERMOMETER.resolution }),
    t(`${R}.apparatus.heater`),
  );

  const generated: Record<string, string> = {
    "date-title": `${date}. ${title}`,
    aim: t(`${R}.aim`),
    apparatus,
    diagram: t("report.gen.diagram", { caption: benchCaption }),
    theory: t(`${R}.theory`),
    method,
    observations,
    table: shownTable.columns.length ? t(`${R}.table`) : "",
    graph: view.plotted.length
      ? t(rightGraph ? `${R}.graph` : "report.gen.graph", { caption: graphCaption })
      : "",
    calculation,
    discussion: "",
    // In an exam the precautions and sources of error are the candidate's own to write.
    precautions: attempt.mode === "exam" ? "" : precautions,
    sources: attempt.mode === "exam" ? "" : sources,
    conclusion:
      rightGraph && cText
        ? metal
          ? t(`${R}.conclusionNamed`, {
              c: cText,
              metal: t(`${P}.metal.${metal.id}` as MessageKey),
              true: metal.c,
            })
          : t(`${R}.conclusion`, { c: cText })
        : "",
    references: "",
    "part-b": "",
  };

  const sections: ReportSection[] = REPORT_SECTIONS[report.format].map(({ id, figure }) => {
    const own = report.texts[id];
    const text = own ?? generated[id] ?? "";
    return {
      id,
      title: t(`report.section.${id}` as MessageKey),
      figure,
      generated: generated[id] ?? "",
      text,
      edited: own !== undefined,
      status: statusOf(id, text),
    };
  });

  const notes = [
    ...new Map(
      history
        .filter((h) => !PROCEDURE.has(h.rule) && !stillIn.has(h.rule))
        .map((h) => [h.rule, h] as const),
    ).values(),
  ].map((h) => t("report.note", { title: msg(`${h.key}.title`, h.params) }));

  return {
    format: report.format,
    title,
    date,
    sections,
    table: {
      headings: shownTable.columns.map((c) => heading(c)),
      rows: shownTable.rows
        .map((r) => shownTable.columns.map((c) => r.cells[c.id] ?? ""))
        .filter((cells) => cells.some((c) => c.trim() !== "")),
    },
    bench: benchScene,
    graph: graphScene,
    notes,
  };
}
