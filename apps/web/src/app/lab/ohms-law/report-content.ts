"use client";

import {
  fillDerived,
  fitLine,
  formatQuantity,
  formulaUnitFindings,
  GRAPH_RULES,
  heading,
  largestPercentUncertainty,
  parseTable,
  pointsFor,
  readingDecimals,
  runRules,
  tableUncertainties,
  xIntercept,
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
  asOhmsLawReading,
  benchProjection,
  OHMS_LAW_ANALYSIS_RULES,
  OHMS_LAW_PLOT,
  ohmsLaw,
  ohmsLawExpected,
  plotsIAgainstV,
  slopeOf,
  typedQuantity,
  wiredRight,
  WIRING_RULES,
  type OhmsLawReading,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/ohms-law";

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
 * The Ohm's law report (master plan, "Lab report"), in the WASSCE or university format, generated
 * from the attempt's events as the pendulum's is. Every number comes from the run's own readings,
 * the experiment's apparatus and the analysis packages (AGENTS.md rule 1).
 */

const E = ohmsLaw;
const P = "experiments.ohms-law";
const R = `${P}.report`;
const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join("\n");
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
const SEVERE = new Set(["error", "warning"]);
/** A negative number printed with the minus sign, not a hyphen, as a report is typeset. */
const minusSigns = (text: string) => text.replace(/(^|[\s(])-(?=\d)/gm, "$1−");
const KEY_LEFT_CLOSED = "ohms-law-key-left-closed";
const JOCKEY_SLID = "ohms-law-jockey-slid";
/** Mistakes in how the readings were taken: they stay in the readings, so they are sources of error. */
const PROCEDURE = new Set([KEY_LEFT_CLOSED, JOCKEY_SLID]);

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

/** The whole Ohm's law report for one run. Pure. */
export function ohmsLawReport(attempt: Attempt, events: readonly LabEvent[]): ReportContent {
  const state = replay(coachProjection, attempt, events);
  const report = replay(reportProjection, attempt, events);
  const bench = replay(benchProjection, attempt, events);
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
    .map(asOhmsLawReading)
    .filter((r): r is OhmsLawReading => r !== undefined);
  const positions = [...new Set(readings.map((r) => r.pj).filter((pj) => pj > 0))].sort(
    (a, b) => a - b,
  );
  const repeated = positions.some((pj) => readings.filter((r) => r.pj === pj).length >= 2);
  const cm = (m: number) => (m * 100).toFixed(1);
  const amps = world.ammeter.resolution;
  const volts = world.voltmeter.resolution;

  // The table, the graph and the analysis, as the lab showed them (Auto fills in for the student).
  const table = replay(tableProjection, attempt, events);
  const shownTable = levelOf(state, "tabulation") === "auto" ? fillDerived(table) : table;
  const graph = replay(graphProjection, attempt, events);
  const columns = graphColumnsFor(graph, table.columns, OHMS_LAW_PLOT);
  const column = (id: string) => table.columns.find((c) => c.id === id);
  const symbol = (id: string) => column(id)?.symbol ?? id;
  const units = { x: column(columns.x)?.unit ?? "", y: column(columns.y)?.unit ?? "" };
  const data = pointsFor(shownTable, columns.x, columns.y);
  const view = graphView(graph, data, columns, levelOf(state, "graph") === "auto", true);
  const answers = replay(answersProjection, attempt, events);
  const expected = ohmsLawExpected(view.triangle, view.line, columns, units, answers);
  const iAgainstV = plotsIAgainstV(columns);

  // The figures: the circuit as wired, the key open, and the graph as it was drawn.
  const right = wiredRight(bench.leads);
  const benchCaption = t(right ? `${R}.benchCaption` : `${R}.benchCaptionAsWired`);
  const graphCaption = t("report.gen.graphCaption", { y: symbol(columns.y), x: symbol(columns.x) });
  const benchSnapshot = figureAtTheEnd("bench", events, benchCaption);
  const graphSnapshot = figureAtTheEnd("graph", events, graphCaption);
  const benchScene: FigureScene = {
    snapshot: benchSnapshot,
    fig: 1,
    title: t("figure.title.bench", { experiment }),
    alt: t(`${R}.benchAlt`, { caption: benchCaption }),
    legend: (["E", "K", "R", "A", "V", "PQ", "J"] as const).map((letter) => ({
      letter,
      name: t(`${R}.legend.${letter}`),
    })),
    values: [t(`${R}.values.leads`, { count: bench.leads.length })],
    footer: footer(benchSnapshot.takenAt),
    drawing: {
      kind: "circuit",
      leads: bench.leads,
      // Lifted, resting where the last reading was taken (or near Q, as in the lab).
      jockey: {
        at: (readings.filter((r) => r.pj > 0).at(-1)?.pj ?? 0.95) * world.wireLength,
        pressed: false,
      },
      wireLength: world.wireLength,
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
  const slopeUsed = s && (typedQuantity(answers.slope, s.slope) ?? s.slope);
  const slopeUnit = `${units.y} ${units.x}⁻¹`;
  const slopeText = answerText(answers.slope, expected.slope, slopeUnit);
  const eText = answerText(answers.E, expected.E, units.x);
  const rText = answerText(answers.r, expected.r, "Ω");

  const calculation =
    view.triangle && s
      ? minusSigns(
          lines(
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
            })} ${slopeText ?? ""}`.trim(),
            iAgainstV && eText && t(`${R}.calcE`, { E: eText }),
            iAgainstV &&
              slopeUsed &&
              rText &&
              t(`${R}.calcR`, { slope: formatQuantity(slopeUsed, 3, slopeUnit), r: rText }),
          ),
        )
      : "";

  // Mistakes: the coach's history, and what is still wrong in the work now.
  const history = coachHistory(attempt, events);
  const raised = new Set(history.map((h) => h.rule));
  const tableFindings = shownTable.layout
    ? [
        ...runRules(TABLE_RULES, {
          table: parseTable(toTableView(shownTable)),
          plot: OHMS_LAW_PLOT,
          spread: "PJ",
        }),
        ...formulaUnitFindings(table),
      ]
    : [];
  const graphFindings =
    state.completed.includes("plot") && data.length >= 2
      ? runRules(GRAPH_RULES, {
          sheet: view.sheet,
          symbols: { x: symbol(columns.x), y: symbol(columns.y) },
          data,
          plotted: view.plotted,
          line: view.line,
          triangle: view.triangle,
        })
      : [];
  const analysisFindings =
    state.completed.includes("analyse") && levelOf(state, "analysis") !== "auto"
      ? runRules(OHMS_LAW_ANALYSIS_RULES, { answers, expected })
      : [];
  const stillIn = new Set(
    [
      ...runRules(WIRING_RULES, { leads: bench.leads }),
      ...tableFindings,
      ...graphFindings,
      ...analysisFindings,
    ]
      .filter((f: Finding) => SEVERE.has(f.severity))
      .map((f) => f.rule),
  );

  const precautions = lines(
    !raised.has(KEY_LEFT_CLOSED) && readings.length > 0 && t(`${R}.precaution.key`),
    !raised.has(JOCKEY_SLID) && positions.length > 0 && t(`${R}.precaution.jockey`),
    t(`${R}.precaution.parallax`),
    t(`${R}.precaution.connections`),
    repeated && t(`${R}.precaution.repeat`),
  );

  const sources = lines(
    raised.has(KEY_LEFT_CLOSED) && t(`${R}.source.keyLeftClosed`),
    raised.has(JOCKEY_SLID) && t(`${R}.source.jockeySlid`),
    t(`${R}.source.leastCount`, { amps, volts }),
    t(`${R}.source.voltmeter`),
    t(`${R}.source.contact`),
  );

  const observations =
    readings.length === 0
      ? ""
      : lines(
          t(`${R}.observations.meters`, { amps, volts, n: readings.length }),
          positions.length > 0 &&
            t(positions.length === 1 ? `${R}.observations.one` : `${R}.observations.positions`, {
              positions: positions.length,
              min: cm(positions[0]!),
              max: cm(positions.at(-1)!),
            }),
          readings.some((r) => r.pj === 0) && t(`${R}.observations.noContact`),
        );

  const method = lines(
    state.completed.includes("build") && t(right ? `${R}.method.wire` : `${R}.method.wireAsIs`),
    positions.length > 0 &&
      t(`${R}.method.readings`, { min: cm(positions[0]!), max: cm(positions.at(-1)!) }),
    repeated && t(`${R}.method.repeat`),
    state.completed.includes("plot") &&
      (iAgainstV
        ? t(`${R}.method.analyse`)
        : t(`${R}.method.analyseOther`, { y: symbol(columns.y), x: symbol(columns.x) })),
  );

  const apparatus = lines(
    t(`${R}.apparatus.cells`, { emf: (E.cell.emf / 2).toFixed(1) }),
    t(`${R}.apparatus.resistor`, { r: E.resistor.toFixed(1) }),
    t(`${R}.apparatus.ammeter`, { max: world.ammeter.scale?.[1] ?? 1 }),
    t(`${R}.apparatus.voltmeter`, { max: world.voltmeter.scale?.[1] ?? 3 }),
    t(`${R}.apparatus.wire`, { length: world.wireLength.toFixed(3) }),
    t(`${R}.apparatus.jockey`),
    t(`${R}.apparatus.key`),
    t(`${R}.apparatus.leads`),
  );

  // The university format's uncertainty working (docs/content/uncertainty-brief.md, decision 7):
  // the slope's least-squares uncertainty, E's where the line meets the V axis, r's the slope's
  // percentage, and the largest percentage uncertainty in the table. A real cell's E and r are not
  // known, so there is no accepted value to agree with.
  const university = report.format === "university";
  const worked = university ? fillDerived(table) : undefined;
  const points = worked && iAgainstV ? pointsFor(worked, columns.x, columns.y) : [];
  const fit =
    points.length >= 3 && new Set(points.map((p) => p.x)).size >= 2 ? fitLine(points) : undefined;
  const quote = quoteWithUncertainty;
  const largest = worked
    ? largestPercentUncertainty(worked, tableUncertainties(worked))
    : undefined;
  const uncertaintyWorking =
    fit && fit.slope < 0
      ? (() => {
          const e = xIntercept(fit);
          const r = -1 / fit.slope;
          const percent = (100 * fit.slopeError) / Math.abs(fit.slope);
          return [
            t("report.gen.uncertainty.rules"),
            t("report.gen.uncertainty.slope", {
              slope: quote(fit.slope, fit.slopeError),
              unit: slopeUnit,
              percent: percent.toFixed(2),
            }),
            t("report.gen.uncertainty.e", { E: quote(e.value, e.error), unit: units.x }),
            t("report.gen.uncertainty.r", { r: quote(r, (r * percent) / 100) }),
          ].join("\n");
        })()
      : "";
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
    diagram: bench.leads.length ? t("report.gen.diagram", { caption: benchCaption }) : "",
    theory: t(`${R}.theory`),
    method,
    observations,
    table: shownTable.columns.length ? t(`${R}.table`) : "",
    graph: view.plotted.length
      ? t(iAgainstV ? `${R}.graph` : "report.gen.graph", { caption: graphCaption })
      : "",
    calculation: [calculation, uncertaintyWorking].filter(Boolean).join("\n"),
    discussion,
    // In an exam the precautions and sources of error are the candidate's own to write.
    precautions: attempt.mode === "exam" ? "" : precautions,
    sources: attempt.mode === "exam" ? "" : sources,
    conclusion: iAgainstV && eText && rText ? t(`${R}.conclusion`, { E: eText, r: rText }) : "",
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
