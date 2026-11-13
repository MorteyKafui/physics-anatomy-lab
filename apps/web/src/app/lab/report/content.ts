"use client";

import {
  fillDerived,
  fitLine,
  formatQuantity,
  heading,
  largestPercentUncertainty,
  pointsFor,
  readingDecimals,
  tableUncertainties,
} from "@pa/analysis";
import {
  replay,
  reportProjection,
  type Attempt,
  type LabEvent,
  type ReportFormat,
  type Snapshot,
} from "@pa/engine";
import {
  benchPeriod,
  gFromSlope,
  PENDULUM_PARTS,
  plotsTSquaredAgainstL,
  simplePendulum,
  slopeOf,
  typedQuantity,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { ANTICIPATED_EVENT, DEFAULT_ENVIRONMENT, METRE_RULE } from "@pa/instruments";

import { reviewRun, type RunReview } from "../run-review";
import { figureDate, figureScene, type FigureScene } from "../snapshot-figure";
import { quoteWithUncertainty } from "../uncertainty-format";

/**
 * The lab report's content (master plan, "Lab report"), generated from the attempt's events: the
 * WASSCE format, or the 15-section university format. Every number comes from the run's own
 * readings and the physics packages (rule 1). A section the student rewrote shows their text; the
 * rest follow the attempt, so they stay right as the work changes.
 */

export type ReportFigure = "bench" | "table" | "graph";

/** The sections of each format, in order. Each section id is its key under report.section. */
export const REPORT_SECTIONS: Record<
  ReportFormat,
  readonly { id: string; figure?: ReportFigure }[]
> = {
  wassce: [
    { id: "aim" },
    { id: "apparatus" },
    { id: "diagram", figure: "bench" },
    { id: "observations" },
    { id: "table", figure: "table" },
    { id: "graph", figure: "graph" },
    { id: "calculation" },
    { id: "precautions" },
    { id: "sources" },
    { id: "part-b" },
  ],
  university: [
    { id: "date-title" },
    { id: "aim" },
    { id: "apparatus" },
    { id: "diagram", figure: "bench" },
    { id: "theory" },
    { id: "method" },
    { id: "observations", figure: "table" },
    { id: "graph", figure: "graph" },
    { id: "calculation" },
    { id: "discussion" },
    { id: "precautions" },
    { id: "sources" },
    { id: "conclusion" },
    { id: "references" },
  ],
};

/** The precautions WASSCE examiners look for: three earn the marks. */
export const PRECAUTIONS_NEEDED = 3;

export type SectionStatus = { kind: "done" } | { kind: "todo" } | { kind: "count"; n: number };

export interface ReportSection {
  id: string;
  title: string;
  figure: ReportFigure | undefined;
  /** What the attempt gives for this section. */
  generated: string;
  /** What the report shows: the student's text, or the generated one. */
  text: string;
  edited: boolean;
  status: SectionStatus;
}

export interface ReportContent {
  format: ReportFormat;
  title: string;
  date: string;
  sections: ReportSection[];
  /** Table 1: the student's table as the lab showed it. */
  table: { headings: string[]; rows: string[][] };
  /** Fig. 1 (the set-up) and Fig. 2 (the graph), drawn from the attempt. */
  bench: FigureScene;
  graph: FigureScene;
  /** What the coach pointed out and the student put right, for the "Coach's notes" option. */
  notes: string[];
}

/** The pendulum's report, with the run's review (the exam marks the script from it). */
export interface PendulumReport extends ReportContent {
  review: RunReview;
}

/** What a report screen needs to know of its experiment. */
export interface ReportExperiment {
  id: string;
  title: string;
  /** The experiment has a model check, so the report links to its data template. */
  check?: boolean;
}

const P = "experiments.simple-pendulum";
const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join("\n");
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

/** A snapshot of the run as it stands, so the figures draw the final state. */
function atTheEnd(
  kind: "bench" | "graph",
  events: readonly LabEvent[],
  period: number,
  caption: string,
): Snapshot {
  const last = events.at(-1);
  return {
    id: `report-${kind}`,
    kind,
    step: "report",
    caption,
    auto: true,
    // A quarter period in, the bob hangs on the mark: the set-up as it is drawn in a report.
    bench: { time: period / 4, stopwatch: 0 },
    takenAt: last?.at ?? 0,
    point: { seq: Number.MAX_SAFE_INTEGER, device: "~", id: "~" },
    deleted: false,
  };
}

export function statusOf(id: string, text: string): SectionStatus {
  if (id === "precautions") {
    const n = text.split("\n").filter((l) => l.trim() !== "").length;
    return n >= PRECAUTIONS_NEEDED ? { kind: "done" } : { kind: "count", n };
  }
  return text.trim() === "" ? { kind: "todo" } : { kind: "done" };
}

/** The whole report for one run. Pure. */
export function reportContent(
  attempt: Attempt,
  events: readonly LabEvent[],
  g = DEFAULT_ENVIRONMENT.g,
): PendulumReport {
  const review = reviewRun(attempt, events, g);
  const report = replay(reportProjection, attempt, events);
  const { assembly, readings, state, view, columns, units, answers, shownTable, table } = review;
  const length = readings[0]?.l ?? simplePendulum.length;
  const period = benchPeriod(g, length);
  const title = t("report.gen.title", { experiment: t(`${P}.title`) });
  const date = figureDate(attempt.createdAt).split(",")[0]!;

  const placed = PENDULUM_PARTS.filter((p) => assembly[p] !== undefined);
  const letters = Object.fromEntries(placed.map((p, i) => [p, "ABCDEFGHIJ"[i]!]));
  const partName = (p: string) => t(`${P}.parts.${p}.name` as MessageKey);
  const key = placed.map((p) => `${letters[p]}: ${partName(p).toLowerCase()}`).join(", ");

  const lengths = [...new Set(readings.map((r) => r.l))].sort((a, b) => a - b);
  const fromOne = readings.some((r) => r.countedFromOne);
  const repeated = lengths.some((l) => readings.filter((r) => r.l === l).length >= 2);
  const symbol = (id: string) => table.columns.find((c) => c.id === id)?.symbol ?? id;
  const benchCaption = t("report.gen.benchCaption", { key });
  const graphCaption = t("report.gen.graphCaption", { y: symbol(columns.y), x: symbol(columns.x) });
  const bench = figureScene(attempt, events, atTheEnd("bench", events, period, benchCaption), 1);
  const graph = figureScene(attempt, events, atTheEnd("graph", events, period, graphCaption), 2);

  // Calculation: the slope from the student's triangle, then g, as the lab works them out.
  const s = view.triangle && slopeOf(view.triangle, units);
  const slopeUsed = s && (typedQuantity(answers.slope, s.slope) ?? s.slope);
  const gShown = review.g?.text;
  const forG = plotsTSquaredAgainstL(columns);
  const calculation =
    view.triangle && s
      ? lines(
          t("lab.analyse.slopeFormula", {
            yb: view.triangle.b.y.toFixed(readingDecimals(view.sheet.y)),
            ya: view.triangle.a.y.toFixed(readingDecimals(view.sheet.y)),
            yu: units.y,
            xb: view.triangle.b.x.toFixed(readingDecimals(view.sheet.x)),
            xa: view.triangle.a.x.toFixed(readingDecimals(view.sheet.x)),
            xu: units.x,
          }),
          `${t("lab.analyse.slopeStep", {
            rise: s.rise.toFixed(readingDecimals(view.sheet.y)),
            run: s.run.toFixed(readingDecimals(view.sheet.x)),
          })} ${review.slope?.text ?? formatQuantity(s.slope)}`,
          forG &&
            slopeUsed &&
            `${t("lab.analyse.gFormula", {
              fourPiSquared: (4 * Math.PI ** 2).toFixed(2),
              slope: formatQuantity(slopeUsed).split(" ")[0]!,
            })} ${gShown ?? formatQuantity(gFromSlope(slopeUsed))}`,
        )
      : "";

  const precautions = lines(
    t(`${P}.tips.angle`),
    t(`${P}.tips.mark`),
    assembly.thread === "cork" && t(`${P}.tips.cork`),
    readings.length > 0 && !fromOne && t("report.gen.precaution.zero"),
    repeated && t(`${P}.tips.repeat`),
  );

  const stillIn = new Set(review.mistakes.filter((m) => m.stillIn).map((m) => m.rule));
  const sources = lines(
    stillIn.has("pendulum-count-from-one") && t("report.gen.source.countFromOne"),
    stillIn.has("pendulum-stopped-early") &&
      t("report.gen.source.stoppedEarly", { target: simplePendulum.swings }),
    stillIn.has("pendulum-thread-on-clamp") && t("report.gen.source.threadOnClamp"),
    t("report.gen.source.reaction"),
    t("report.gen.source.centre"),
  );

  const observations =
    readings.length === 0
      ? ""
      : t(readings.length === 1 ? "report.gen.observations.one" : "report.gen.observations", {
          stopwatch: simplePendulum.stopwatch.resolution,
          rule: METRE_RULE.resolution,
          n: readings.length,
          swings: simplePendulum.swings,
          lengths: lengths.length,
          min: lengths[0]!.toFixed(3),
          max: lengths.at(-1)!.toFixed(3),
        });

  const method = lines(
    assembly.thread === "clamp-arm"
      ? t("report.gen.method.buildClamp")
      : assembly.thread === "cork"
        ? t("report.gen.method.build")
        : undefined,
    readings.length > 0 &&
      t("report.gen.method.time", {
        swings: simplePendulum.swings,
        first: t(fromOne ? "report.gen.one" : "report.gen.zero"),
      }),
    readings.length > 0 &&
      t("report.gen.method.lengths", {
        n: readings.length,
        lengths: lengths.length,
        min: lengths[0]!.toFixed(3),
        max: lengths.at(-1)!.toFixed(3),
      }),
    state.completed.includes("plot") &&
      t("report.gen.method.analyse", {
        swings: simplePendulum.swings,
        y: symbol(columns.y),
        x: symbol(columns.x),
      }),
  );

  const conclusion = gShown
    ? lines(
        t("report.gen.conclusion", { g: gShown }),
        state.acceptedValueShown &&
          review.g &&
          t("report.gen.conclusionAccepted", {
            percent: Math.abs((review.g.value / g - 1) * 100).toFixed(1),
            accepted: g.toFixed(2),
          }),
      )
    : "";

  // The university format's uncertainty working (docs/content/uncertainty-brief.md, decision 7):
  // the least-squares uncertainty in the slope and so in g, the agreement with the accepted value
  // once it has been shown, and which reading's uncertainty is largest.
  const university = report.format === "university";
  const worked = university ? fillDerived(table) : undefined;
  const points = worked ? pointsFor(worked, columns.x, columns.y) : [];
  const fit =
    forG && points.length >= 3 && new Set(points.map((p) => p.x)).size >= 2
      ? fitLine(points)
      : undefined;
  const gU =
    fit && fit.slope > 0
      ? {
          g: (4 * Math.PI ** 2) / fit.slope,
          u: ((4 * Math.PI ** 2) / fit.slope) * (fit.slopeError / fit.slope),
          percent: (100 * fit.slopeError) / fit.slope,
        }
      : undefined;
  const quote = quoteWithUncertainty;
  const largest = worked
    ? largestPercentUncertainty(
        worked,
        tableUncertainties(worked, { timing: 2 * ANTICIPATED_EVENT.delaySd }),
      )
    : undefined;
  const uncertaintyWorking =
    fit && gU
      ? lines(
          t("report.gen.uncertainty.rules"),
          t("report.gen.uncertainty.slope", {
            slope: quote(fit.slope, fit.slopeError),
            unit: units.y && units.x ? `${units.y} ${units.x}⁻¹` : "",
            percent: gU.percent.toFixed(2),
          }),
          t("report.gen.uncertainty.g", { g: quote(gU.g, gU.u) }),
        )
      : "";
  const discussion = university
    ? lines(
        gU &&
          state.acceptedValueShown &&
          t(
            Math.abs(gU.g - g) <= gU.u
              ? "report.gen.uncertainty.agrees"
              : "report.gen.uncertainty.differs",
            {
              g: quote(gU.g, gU.u),
              accepted: g.toFixed(2),
              away: (Math.abs(gU.g - g) / gU.u).toFixed(1),
            },
          ),
        largest &&
          t("report.gen.uncertainty.largest", {
            symbol: largest.symbol,
            percent: largest.percent.toFixed(2),
          }),
      )
    : "";

  const generated: Record<string, string> = {
    "date-title": `${date}. ${title}`,
    aim: t("report.gen.aim"),
    apparatus: placed.map((p) => `${letters[p]}: ${partName(p)}`).join("\n"),
    diagram: placed.length ? t("report.gen.diagram", { caption: benchCaption }) : "",
    theory: t("report.gen.theory"),
    method,
    observations,
    table: shownTable.columns.length ? t("report.gen.table") : "",
    graph: view.plotted.length ? t("report.gen.graph", { caption: graphCaption }) : "",
    calculation: lines(calculation || undefined, uncertaintyWorking || undefined),
    discussion,
    // In an exam the precautions and sources of error are the candidate's own to write.
    precautions: attempt.mode === "exam" ? "" : precautions,
    sources: attempt.mode === "exam" ? "" : sources,
    conclusion,
    references: "",
    "part-b": "",
  };

  const sections = REPORT_SECTIONS[report.format].map(({ id, figure }) => {
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
    bench,
    graph,
    notes: review.mistakes
      .filter((m) => !m.stillIn)
      .map((m) => t("report.note", { title: msg(`${m.key}.title`, m.params) })),
    review,
  };
}
