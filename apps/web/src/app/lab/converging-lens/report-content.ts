"use client";

import {
  fillDerived,
  fitLine,
  interceptSum,
  largestPercentUncertainty,
  quotedUncertainty,
  tableUncertainties,
  formatQuantity,
  formulaUnitFindings,
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
  asLensReading,
  convergingLens,
  LENS_ANALYSIS_RULES,
  LENS_GRAPH_RULES,
  LENS_PLOT,
  lensBenchProjection,
  lensExpected,
  plotsInverseVAgainstInverseU,
  screenImage,
  sharpScreenRange,
  type LensReading,
} from "@pa/experiments";
import { METRE_RULE } from "@pa/instruments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { coachHistory } from "../coach-history";
import { graphColumnsFor, graphView, headingFor, lineAcrossAxes } from "../graph-sheet";
import {
  REPORT_SECTIONS,
  statusOf,
  type ReportContent,
  type ReportSection,
} from "../report/content";
import { figureDate, type FigureScene } from "../snapshot-figure";

/**
 * The converging lens report (master plan, "Lab report"), in the WASSCE or university format,
 * generated from the attempt's events as the other labs' are. Every number comes from the run's
 * own readings, the experiment's apparatus and the analysis packages (AGENTS.md rule 1).
 */

const E = convergingLens;
const P = "experiments.converging-lens";
const R = `${P}.report`;
const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join("\n");
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
const SEVERE = new Set(["error", "warning"]);
const FROM_EDGE = "lens-read-from-edge";
const NOT_COAXIAL = "lens-not-coaxial";
const BLURRED = "lens-blurred-image";
const AT_ANGLE = "lens-scale-at-angle";
/** Mistakes in how the readings were taken: they stay in the readings, so they are sources of error. */
const PROCEDURE = new Set([FROM_EDGE, NOT_COAXIAL, BLURRED, AT_ANGLE]);
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

/** The whole converging lens report for one run. Pure. */
export function convergingLensReport(attempt: Attempt, events: readonly LabEvent[]): ReportContent {
  const state = replay(coachProjection, attempt, events);
  const report = replay(reportProjection, attempt, events);
  const bench = replay(lensBenchProjection, attempt, events);
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
    .map(asLensReading)
    .filter((r): r is LensReading => r !== undefined);
  const us = [...new Set(readings.map((r) => r.u))].sort((a, b) => a - b);
  const repeated = us.some((u) => readings.filter((r) => r.u === u).length >= 2);
  // v at the smallest and largest u, as read: the image moves in as the object moves out.
  const vAt = (u: number) => readings.find((r) => r.u === u)!.v;

  // The table, the graph and the analysis, as the lab showed them (Auto fills in for the student).
  const table = replay(tableProjection, attempt, events);
  const shownTable = levelOf(state, "tabulation") === "auto" ? fillDerived(table) : table;
  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, LENS_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const symbol = (id: string) => column(id)?.symbol ?? id;
  const units = { x: column(columns.x)?.unit ?? "", y: column(columns.y)?.unit ?? "" };
  const fUnit = units.x.replace("⁻¹", "") || "cm";
  const data = pointsFor(shownTable, columns.x, columns.y);
  const view = graphView(graph, data, columns, levelOf(state, "graph") === "auto", "both-axes");
  const answers = replay(answersProjection, attempt, events);
  const expected = lensExpected(view.line, columns, units, answers);
  const rightGraph = plotsInverseVAgainstInverseU(columns);

  // The figures: the bench as it was left, and the graph as it was drawn.
  const image = screenImage(world, bench);
  const sharp = image.kind === "image" && image.sharp;
  const benchCaption = t(sharp ? `${R}.benchCaption` : `${R}.benchCaptionAsLeft`);
  const graphCaption = t("report.gen.graphCaption", { y: symbol(columns.y), x: symbol(columns.x) });
  const benchSnapshot = figureAtTheEnd("bench", events, benchCaption);
  const graphSnapshot = figureAtTheEnd("graph", events, graphCaption);
  const benchScene: FigureScene = {
    snapshot: benchSnapshot,
    fig: 1,
    title: t("figure.title.bench", { experiment }),
    alt: t(`${R}.benchAlt`, { caption: benchCaption }),
    legend: (["R", "L", "S"] as const).map((letter) => ({
      letter,
      name: t(`${R}.legend.${letter}`),
    })),
    values: [
      t(`${R}.values.bench`, {
        u: cm(bench.lens - bench.object),
        s: cm(bench.screen - bench.lens),
      }),
    ],
    footer: footer(benchSnapshot.takenAt),
    drawing: {
      kind: "optical",
      object: bench.object,
      lens: bench.lens,
      screen: bench.screen,
      offAxis: bench.offAxis,
      objectHalfHeight: E.objectHalfHeight,
      image:
        image.kind === "image"
          ? { at: image.sharpestAt, magnification: image.magnification }
          : undefined,
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
  const m1Text = answerText(answers.m1, expected.m1, units.y);
  const m2Text = answerText(answers.m2, expected.m2, units.x);
  const fText = answerText(answers.f, expected.f, fUnit);
  const calculation =
    rightGraph && view.line
      ? lines(
          m1Text && t(`${R}.calcM1`, { m1: m1Text }),
          m2Text && t(`${R}.calcM2`, { m2: m2Text }),
          m1Text && m2Text && fText && t(`${R}.calcF`, { m1: m1Text, m2: m2Text, f: fText }),
        )
      : "";

  // Mistakes: the coach's history, and what is still wrong in the work now.
  const history = coachHistory(attempt, events);
  const raised = new Set(history.map((h) => h.rule));
  const tableFindings = shownTable.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shownTable)),
          plot: LENS_PLOT,
          spread: "u",
        }),
        ...formulaUnitFindings(table),
      ]
    : [];
  const across = view.line && rightGraph ? lineAcrossAxes(view.line) : undefined;
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
            reach: {
              x: [0, ...(across ? [across.to.x] : [])],
              y: [0, ...(across ? [across.from.y] : [])],
            },
          }),
          ...runRules(LENS_GRAPH_RULES, {
            columns,
            symbols: { x: symbol(columns.x), y: symbol(columns.y) },
          }),
        ]
      : [];
  const analysisFindings =
    state.completed.includes("analyse") && levelOf(state, "analysis") !== "auto"
      ? runRules(LENS_ANALYSIS_RULES, { answers, expected })
      : [];
  const stillIn = new Set(
    [...tableFindings, ...graphFindings, ...analysisFindings]
      .filter((f: Finding) => SEVERE.has(f.severity))
      .map((f) => f.rule),
  );

  const precautions = lines(
    !raised.has(NOT_COAXIAL) && t(`${R}.precaution.coaxial`),
    !raised.has(BLURRED) && readings.length > 0 && t(`${R}.precaution.sharp`),
    !raised.has(FROM_EDGE) && readings.length > 0 && t(`${R}.precaution.centre`),
    !raised.has(AT_ANGLE) && t(`${R}.precaution.parallax`),
    t(`${R}.precaution.clean`),
    repeated && t(`${R}.precaution.repeat`),
  );

  // How far the screen can move with the image still looking sharp, at the first u read.
  const range = us.length ? sharpScreenRange(world, us[0]! / 100) : undefined;
  const sources = lines(
    raised.has(NOT_COAXIAL) && t(`${R}.source.notCoaxial`),
    raised.has(BLURRED) && t(`${R}.source.blurred`),
    raised.has(FROM_EDGE) && t(`${R}.source.fromEdge`, { cm: cm(E.holderHalfWidth) }),
    raised.has(AT_ANGLE) && t(`${R}.source.atAngle`),
    t(`${R}.source.leastCount`, { cm: METRE_RULE.resolution }),
    range &&
      t(`${R}.source.sharpRange`, {
        range: ((range.to - range.from) * 100).toFixed(1),
        u: us[0]!.toFixed(1),
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
          us.length > 1 &&
            t(`${R}.observations.trend`, {
              umin: us[0]!.toFixed(1),
              umax: us.at(-1)!.toFixed(1),
              vmax: vAt(us[0]!).toFixed(1),
              vmin: vAt(us.at(-1)!).toFixed(1),
            }),
          t(`${R}.observations.image`),
          bench.noImageAt.length > 0 &&
            t(`${R}.observations.noImage`, { u: cm(Math.min(...bench.noImageAt)) }),
        );

  const method = lines(
    state.completed.includes("build") && t(`${R}.method.setUp`),
    us.length > 0 &&
      t(`${R}.method.readings`, { min: us[0]!.toFixed(1), max: us.at(-1)!.toFixed(1) }),
    repeated && t(`${R}.method.repeat`),
    state.completed.includes("plot") &&
      (rightGraph
        ? t(`${R}.method.analyse`)
        : t(`${R}.method.analyseOther`, { y: symbol(columns.y), x: symbol(columns.x) })),
  );

  const apparatus = lines(
    t(`${R}.apparatus.rayBox`),
    t(`${R}.apparatus.lens`, { d: cm(E.lens.aperture) }),
    t(`${R}.apparatus.screen`),
    t(`${R}.apparatus.bench`, { length: cm(E.benchLength) }),
  );

  // The university format's uncertainty working (docs/content/uncertainty-brief.md, decision 7).
  // The lab never reveals the lens's own focal length, so there is no accepted value to agree with.
  const university = report.format === "university";
  const worked = university ? fillDerived(table) : undefined;
  const points = worked && rightGraph ? pointsFor(worked, columns.x, columns.y) : [];
  const fit =
    points.length >= 3 && new Set(points.map((p) => p.x)).size >= 2 ? fitLine(points) : undefined;
  const quote = (v: number, u: number) => {
    const q = quotedUncertainty(u);
    return `${v.toFixed(q.decimals)} ± ${q.value.toFixed(q.decimals)}`;
  };
  const largest = worked
    ? largestPercentUncertainty(worked, tableUncertainties(worked))
    : undefined;
  const uncertaintyWorking = (() => {
    if (!fit || !(fit.slope < 0)) return "";
    const sum = interceptSum(fit);
    if (!(sum.value > 0)) return "";
    const f = 2 / sum.value;
    const u = (2 * sum.error) / sum.value ** 2;
    return lines(
      t("report.gen.uncertainty.rules"),
      t("report.gen.uncertainty.sum", { sum: quote(sum.value, sum.error), unit: units.x }),
      t("report.gen.uncertainty.f", {
        f: quote(f, u),
        unit: fUnit,
        percent: ((100 * u) / f).toFixed(2),
      }),
    );
  })();
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
