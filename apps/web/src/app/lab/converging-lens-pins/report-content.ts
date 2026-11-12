"use client";

import {
  fillDerived,
  formatQuantity,
  formulaUnitFindings,
  GRAPH_RULES,
  heading,
  parseTable,
  pointsFor,
  readingDecimals,
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
  asPinsReading,
  convergingLens,
  lensPins,
  noParallaxStretch,
  PINS_ANALYSIS_RULES,
  PINS_GRAPH_RULES,
  PINS_PLOT,
  pinsBenchProjection,
  pinsExpected,
  pinsView,
  plotsXyAgainstXPlusY,
  slopeOf,
  type PinsReading,
} from "@pa/experiments";
import { METRE_RULE } from "@pa/instruments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/converging-lens";

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
 * The converging lens with two pins: its report (master plan, "Lab report"), in the WASSCE or
 * university format, generated from the attempt's events as the other labs' are. Every number
 * comes from the run's own readings, the apparatus and the analysis packages (AGENTS.md rule 1).
 */

const E = lensPins;
const P = "experiments.converging-lens-pins";
const R = `${P}.report`;
const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join("\n");
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
const SEVERE = new Set(["error", "warning"]);
const EYE_OFF = "pins-eye-off-axis";
const TIPS_OFF = "pins-tips-off-axis";
const PARALLAX_LEFT = "pins-parallax-left";
const FROM_EDGE = "pins-read-from-edge";
/** Mistakes in how the readings were taken: they stay in the readings, so they are sources of error. */
const PROCEDURE = new Set([EYE_OFF, TIPS_OFF, PARALLAX_LEFT, FROM_EDGE]);
const cm = (m: number) => (m * 100).toFixed(1);

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

/** The whole two-pin report for one run. Pure. */
export function lensPinsReport(attempt: Attempt, events: readonly LabEvent[]): ReportContent {
  const state = replay(coachProjection, attempt, events);
  const report = replay(reportProjection, attempt, events);
  const bench = replay(pinsBenchProjection, attempt, events);
  const world = bench.world;
  const experiment = t(`${P}.title`);
  const title = t(`${R}.title`, { experiment });
  const date = figureDate(attempt.createdAt).split(",")[0]!;
  const footer = (at: number) =>
    t("figure.footer", {
      experiment,
      version: E.version,
      date: figureDate(at),
      seed: attempt.seed,
    });

  const readings = state.readings
    .map(asPinsReading)
    .filter((r): r is PinsReading => r !== undefined);
  const xs = [...new Set(readings.map((r) => r.x))].sort((a, b) => a - b);
  const repeated = xs.some((x) => readings.filter((r) => r.x === x).length >= 2);
  const yAt = (x: number) => readings.find((r) => r.x === x)!.y;

  // The table, the graph and the analysis, as the lab showed them (Auto fills in for the student).
  const table = replay(tableProjection, attempt, events);
  const shownTable = levelOf(state, "tabulation") === "auto" ? fillDerived(table) : table;
  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, PINS_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const symbol = (id: string) => column(id)?.symbol ?? id;
  const units = { x: column(columns.x)?.unit ?? "", y: column(columns.y)?.unit ?? "" };
  const slopeUnit = units.x || "cm";
  const data = pointsFor(shownTable, columns.x, columns.y);
  const view = graphView(graph, data, columns, levelOf(state, "graph") === "auto");
  const answers = replay(answersProjection, attempt, events);
  const expected = pinsExpected(view.triangle, columns, units, answers);
  const rightGraph = plotsXyAgainstXPlusY(columns);

  // The figures: the bench as it was left, and the graph as it was drawn.
  const look = pinsView(world, bench);
  const clear = look.kind === "image" && look.clear;
  const benchCaption = t(clear ? `${R}.benchCaption` : `${R}.benchCaptionAsLeft`);
  const graphCaption = t("report.gen.graphCaption", { y: symbol(columns.y), x: symbol(columns.x) });
  const benchSnapshot = figureAtTheEnd("bench", events, benchCaption);
  const graphSnapshot = figureAtTheEnd("graph", events, graphCaption);
  const benchScene: FigureScene = {
    snapshot: benchSnapshot,
    fig: 1,
    title: t("figure.title.bench", { experiment }),
    alt: t(`${R}.benchAlt`, { caption: benchCaption }),
    legend: (["P1", "L", "P2"] as const).map((letter) => ({
      letter: t(`${R}.letter.${letter}`),
      name: t(`${R}.legend.${letter}`),
    })),
    values: [
      t(`${R}.values.bench`, { x: cm(bench.lens - bench.object), y: cm(bench.pin - bench.lens) }),
    ],
    footer: footer(benchSnapshot.takenAt),
    drawing: {
      kind: "pins",
      object: bench.object,
      lens: bench.lens,
      pin: bench.pin,
      image: look.kind === "image" ? { at: look.at, magnification: look.magnification } : undefined,
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
  const s = view.triangle && slopeOf(view.triangle, units);
  const slopeText = answerText(answers.slope, expected.slope, slopeUnit);
  const fText = answerText(answers.f, expected.f, slopeUnit);
  const calculation =
    view.triangle && s
      ? lines(
          t(`${R}.calcSlope`, {
            rise: s.rise.toFixed(readingDecimals(view.sheet.y)),
            run: s.run.toFixed(readingDecimals(view.sheet.x)),
            yu: units.y,
            xu: units.x,
            slope: slopeText ?? "",
          }),
          rightGraph && fText && t(`${R}.calcF`, { f: fText }),
        )
      : "";

  // Mistakes: the coach's history, and what is still wrong in the work now.
  const history = coachHistory(attempt, events);
  const raised = new Set(history.map((h) => h.rule));
  const tableFindings = shownTable.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shownTable)),
          plot: PINS_PLOT,
          spread: "x",
        }),
        ...formulaUnitFindings(table),
      ]
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
          ...runRules(PINS_GRAPH_RULES, {
            columns,
            symbols: { x: symbol(columns.x), y: symbol(columns.y) },
          }),
        ]
      : [];
  const analysisFindings =
    state.completed.includes("analyse") && levelOf(state, "analysis") !== "auto"
      ? runRules(PINS_ANALYSIS_RULES, { answers, expected })
      : [];
  const stillIn = new Set(
    [...tableFindings, ...graphFindings, ...analysisFindings]
      .filter((f: Finding) => SEVERE.has(f.severity))
      .map((f) => f.rule),
  );

  const precautions = lines(
    !raised.has(TIPS_OFF) && t(`${R}.precaution.tips`),
    !raised.has(EYE_OFF) && readings.length > 0 && t(`${R}.precaution.eye`),
    !raised.has(PARALLAX_LEFT) && readings.length > 0 && t(`${R}.precaution.parallax`),
    !raised.has(FROM_EDGE) && readings.length > 0 && t(`${R}.precaution.centre`),
    t(`${R}.precaution.clean`),
    repeated && t(`${R}.precaution.repeat`),
  );

  // How far the search pin can move with the tips still seeming together, at the first x read.
  const stretch = xs.length ? noParallaxStretch(world, xs[0]! / 100) : undefined;
  const sources = lines(
    raised.has(EYE_OFF) && t(`${R}.source.eyeOff`),
    raised.has(TIPS_OFF) && t(`${R}.source.tipsOff`),
    raised.has(PARALLAX_LEFT) && t(`${R}.source.parallaxLeft`),
    raised.has(FROM_EDGE) && t(`${R}.source.fromEdge`, { cm: cm(convergingLens.holderHalfWidth) }),
    t(`${R}.source.leastCount`, { cm: METRE_RULE.resolution }),
    stretch &&
      t(`${R}.source.stretch`, {
        range: ((stretch.to - stretch.from) * 100).toFixed(1),
        x: xs[0]!.toFixed(1),
      }),
    t(`${R}.source.aberration`),
  );

  const observations =
    readings.length === 0
      ? ""
      : lines(
          t(readings.length === 1 ? `${R}.observations.one` : `${R}.observations.readings`, {
            n: readings.length,
            cm: METRE_RULE.resolution,
          }),
          xs.length > 1 &&
            t(`${R}.observations.trend`, {
              xmin: xs[0]!.toFixed(1),
              xmax: xs.at(-1)!.toFixed(1),
              ymax: yAt(xs[0]!).toFixed(1),
              ymin: yAt(xs.at(-1)!).toFixed(1),
            }),
          t(`${R}.observations.image`),
        );

  const method = lines(
    state.completed.includes("build") && t(`${R}.method.setUp`),
    xs.length > 0 &&
      t(`${R}.method.readings`, { min: xs[0]!.toFixed(1), max: xs.at(-1)!.toFixed(1) }),
    repeated && t(`${R}.method.repeat`),
    state.completed.includes("plot") &&
      (rightGraph
        ? t(`${R}.method.analyse`)
        : t(`${R}.method.analyseOther`, { y: symbol(columns.y), x: symbol(columns.x) })),
  );

  const apparatus = lines(
    t(`${R}.apparatus.pins`),
    t(`${R}.apparatus.lens`, { d: cm(convergingLens.lens.aperture) }),
    t(`${R}.apparatus.bench`, { length: cm(convergingLens.benchLength) }),
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
    conclusion: rightGraph && fText ? t(`${R}.conclusion`, { f: fText }) : "",
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
