"use client";

import {
  fillDerived,
  fitLine,
  largestPercentUncertainty,
  readingUncertainty,
  tableUncertainties,
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
  asMixturesReading,
  methodOfMixtures,
  MIXTURES_ANALYSIS_RULES,
  MIXTURES_GRAPH_RULES,
  MIXTURES_PLOT,
  MIXTURES_THERMOMETER,
  mixturesExpected,
  mixturesProjection,
  mixturesSheet,
  plotsVAgainstInverseT,
  slopeOf,
  type MixturesReading,
} from "@pa/experiments";
import { MEASURING_CYLINDER } from "@pa/instruments";
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
import { quoteWithUncertainty } from "../uncertainty-format";

/**
 * The method of mixtures: its report (master plan, "Lab report"), in the WASSCE or university
 * format, generated from the attempt's events as the other labs' are. Every number comes from the
 * run's own readings, the apparatus and the analysis packages (AGENTS.md rule 1).
 */

const E = methodOfMixtures;
const P = "experiments.method-of-mixtures";
const R = `${P}.report`;
const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join("\n");
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
const SEVERE = new Set(["error", "warning"]);
const EARLY = "mixtures-read-before-peak";
const UNSTIRRED = "mixtures-not-stirred";
const UNCOVERED = "mixtures-not-covered";
const SLOW = "mixtures-slow-pour";
const THERMOMETER_ANGLE = "mixtures-thermometer-at-angle";
const CYLINDER_ANGLE = "mixtures-cylinder-at-angle";
/** Mistakes in how the readings were taken: they stay in the readings, so they are sources of error. */
const PROCEDURE = new Set([EARLY, UNSTIRRED, UNCOVERED, SLOW, THERMOMETER_ANGLE, CYLINDER_ANGLE]);
const deg = (c: number) => c.toFixed(1);

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

/** The whole mixtures report for one run. Pure. */
export function mixturesReport(attempt: Attempt, events: readonly LabEvent[]): ReportContent {
  const state = replay(coachProjection, attempt, events);
  const report = replay(reportProjection, attempt, events);
  const bench = replay(mixturesProjection, attempt, events);
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
    .map(asMixturesReading)
    .filter((r): r is MixturesReading => r !== undefined);
  const vs = [...new Set(readings.map((r) => r.volume))].sort((a, b) => a - b);
  const repeated = vs.some((v) => readings.filter((r) => r.volume === v).length >= 2);
  const riseAt = (v: number) => {
    const r = readings.findLast((x) => x.volume === v)!;
    return r.highest - r.start;
  };
  const last = readings.at(-1);

  // The table, the graph and the analysis, as the lab showed them (Auto fills in for the student).
  const table = replay(tableProjection, attempt, events);
  const shownTable = levelOf(state, "tabulation") === "auto" ? fillDerived(table) : table;
  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, MIXTURES_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const symbol = (id: string) => column(id)?.symbol ?? id;
  const units = { x: column(columns.x)?.unit ?? "", y: column(columns.y)?.unit ?? "" };
  const rightGraph = plotsVAgainstInverseT(columns);
  const slopeUnit = rightGraph ? "cm³ °C" : `${units.y} ${units.x}⁻¹`.trim();
  const data = pointsFor(shownTable, columns.x, columns.y);
  const view = graphView(graph, data, columns, levelOf(state, "graph") === "auto", "y-axis");
  const answers = replay(answersProjection, attempt, events);
  const expected = mixturesExpected(view.triangle, view.line, columns, units, answers);

  // The figures: the calorimeter as it was last used, and the graph as it was drawn.
  const benchCaption = t(`${R}.benchCaption`);
  const graphCaption = t("report.gen.graphCaption", { y: symbol(columns.y), x: symbol(columns.x) });
  const benchSnapshot = figureAtTheEnd("bench", events, benchCaption);
  const graphSnapshot = figureAtTheEnd("graph", events, graphCaption);
  const water = last ? last.cold + last.hot : (bench.cold ?? 0);
  const benchScene: FigureScene = {
    snapshot: benchSnapshot,
    fig: 1,
    title: t("figure.title.bench", { experiment }),
    alt: t(`${R}.benchAlt`, { caption: benchCaption }),
    legend: (["C", "L", "T", "S"] as const).map((letter) => ({
      letter: t(`${R}.letter.${letter}`),
      name: t(`${R}.legend.${letter}`),
    })),
    values: last
      ? [
          t(`${R}.values.bench`, {
            v: last.volume,
            hot: E.hot.volume,
            highest: deg(last.highest),
          }),
        ]
      : [],
    footer: footer(benchSnapshot.takenAt),
    drawing: {
      kind: "calorimeter",
      water,
      covered: last?.covered ?? bench.covered,
      stirring: last?.stirring ?? bench.stirring,
      thermometer: last?.highest ?? E.room,
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
  const interceptText = answerText(answers.intercept, expected.intercept, "cm³");
  const wText = answerText(answers.W, expected.W, "cm³");
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
          rightGraph && interceptText && t(`${R}.calcIntercept`, { intercept: interceptText }),
          rightGraph &&
            interceptText &&
            wText &&
            t(`${R}.calcW`, { intercept: interceptText, W: wText }),
        )
      : "";

  // Mistakes: the coach's history, and what is still wrong in the work now.
  const history = coachHistory(attempt, events);
  const raised = new Set(history.map((h) => h.rule));
  const tableFindings = shownTable.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shownTable)),
          plot: MIXTURES_PLOT,
          spread: "V",
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
          ...runRules(MIXTURES_GRAPH_RULES, {
            columns,
            symbols: { x: symbol(columns.x), y: symbol(columns.y) },
          }),
        ]
      : [];
  const analysisFindings =
    state.completed.includes("analyse") && levelOf(state, "analysis") !== "auto"
      ? runRules(MIXTURES_ANALYSIS_RULES, { answers, expected })
      : [];
  const stillIn = new Set(
    [...tableFindings, ...graphFindings, ...analysisFindings]
      .filter((f: Finding) => SEVERE.has(f.severity))
      .map((f) => f.rule),
  );

  const any = readings.length > 0;
  const precautions = lines(
    !raised.has(UNCOVERED) && t(`${R}.precaution.lid`),
    !raised.has(UNSTIRRED) && any && t(`${R}.precaution.stir`),
    !raised.has(SLOW) && any && t(`${R}.precaution.quick`),
    !raised.has(EARLY) && any && t(`${R}.precaution.highest`),
    !raised.has(THERMOMETER_ANGLE) && any && t(`${R}.precaution.thermometerEye`),
    !raised.has(CYLINDER_ANGLE) && t(`${R}.precaution.cylinderEye`),
    repeated && t(`${R}.precaution.repeat`),
  );

  // The heat lost while the thermometer catches up, at the first volume read, from the model.
  const sheet = mixturesSheet();
  const first = sheet.points.find((p) => p.volume === vs[0]) ?? sheet.points[0]!;
  const sources = lines(
    raised.has(EARLY) && t(`${R}.source.early`),
    raised.has(UNSTIRRED) && t(`${R}.source.unstirred`),
    raised.has(UNCOVERED) && t(`${R}.source.uncovered`),
    raised.has(SLOW) && t(`${R}.source.slow`),
    raised.has(THERMOMETER_ANGLE) && t(`${R}.source.thermometerAngle`),
    raised.has(CYLINDER_ANGLE) && t(`${R}.source.cylinderAngle`),
    t(`${R}.source.leastCount`, {
      celsius: MIXTURES_THERMOMETER.resolution,
      cm3: MEASURING_CYLINDER.resolution,
    }),
    t(`${R}.source.loss`, { celsius: (first.ideal - first.rise).toFixed(1), v: first.volume }),
  );

  const observations = !any
    ? ""
    : lines(
        t(readings.length === 1 ? `${R}.observations.one` : `${R}.observations.readings`, {
          n: readings.length,
          celsius: MIXTURES_THERMOMETER.resolution,
        }),
        vs.length > 1 &&
          t(`${R}.observations.trend`, {
            vmin: vs[0]!,
            vmax: vs.at(-1)!,
            tmax: deg(riseAt(vs[0]!)),
            tmin: deg(riseAt(vs.at(-1)!)),
          }),
        t(`${R}.observations.peak`),
      );

  const method = lines(
    state.completed.includes("build") && t(`${R}.method.setUp`),
    vs.length > 0 && t(`${R}.method.readings`, { min: vs[0]!, max: vs.at(-1)! }),
    repeated && t(`${R}.method.repeat`),
    state.completed.includes("plot") &&
      (rightGraph
        ? t(`${R}.method.analyse`)
        : t(`${R}.method.analyseOther`, { y: symbol(columns.y), x: symbol(columns.x) })),
  );

  const apparatus = lines(
    t(`${R}.apparatus.calorimeter`, { g: (E.calorimeter.mass * 1000).toFixed(0) }),
    t(`${R}.apparatus.thermometer`, { celsius: MIXTURES_THERMOMETER.resolution }),
    t(`${R}.apparatus.cylinder`, {
      capacity: E.cylinderCapacity,
      cm3: MEASURING_CYLINDER.resolution,
    }),
    t(`${R}.apparatus.beaker`),
  );

  // The university format's uncertainty working (docs/content/uncertainty-brief.md, decision 7):
  // the slope and where the line meets the V axis by least squares, and W = −(intercept) − V₀ with
  // the hot water's own reading on the cylinder added as the worst case. The calorimeter's W is
  // not known in advance, so there is no accepted value to agree with.
  const university = report.format === "university";
  const worked = university ? fillDerived(table) : undefined;
  const points = worked && rightGraph ? pointsFor(worked, columns.x, columns.y) : [];
  const fit =
    points.length >= 3 && new Set(points.map((p) => p.x)).size >= 2 ? fitLine(points) : undefined;
  const quote = quoteWithUncertainty;
  const uncertaintyWorking = fit
    ? (() => {
        const hot = readingUncertainty(MEASURING_CYLINDER.resolution, "scale");
        const W = -fit.intercept - methodOfMixtures.hot.volume;
        return lines(
          t("report.gen.uncertainty.rules"),
          t("report.gen.uncertainty.slope", {
            slope: quote(fit.slope, fit.slopeError),
            unit: "cm³ °C",
            percent: ((100 * fit.slopeError) / Math.abs(fit.slope)).toFixed(2),
          }),
          t("experiments.method-of-mixtures.report.uncertainty.intercept", {
            a: quote(fit.intercept, fit.interceptError),
          }),
          t("experiments.method-of-mixtures.report.uncertainty.W", {
            W: quote(W, fit.interceptError + hot),
            hot: hot.toFixed(1),
          }),
        );
      })()
    : "";
  const largest = worked
    ? largestPercentUncertainty(worked, tableUncertainties(worked))
    : undefined;
  const discussion =
    university && largest
      ? t("report.gen.uncertainty.largest", {
          symbol: largest.symbol,
          percent: largest.percent.toFixed(2),
        })
      : "";

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
    calculation: lines(calculation, uncertaintyWorking),
    discussion,
    // In an exam the precautions and sources of error are the candidate's own to write.
    precautions: attempt.mode === "exam" ? "" : precautions,
    sources: attempt.mode === "exam" ? "" : sources,
    conclusion: rightGraph && wText ? t(`${R}.conclusion`, { W: wText }) : "",
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
