/**
 * The spike's script: thirty lines the coach really says, taken from the message files so the
 * voices are judged on our own words (docs/planning/voice-provider-spike.md). Steps, corrections,
 * numbers with units and the count-along, the hardest things for a voice to say well.
 */
import { t, type MessageKey } from "../../packages/i18n/src/index";

export interface Line {
  id: string;
  /** What the panel is listening for in this line. */
  kind: "step" | "correction" | "units" | "count";
  text: string;
}

const say = (key: MessageKey, params?: Record<string, string | number>) => t(key, params);
const join = (...parts: string[]) => parts.join(" ");

export const LINES: Line[] = [
  {
    id: "build",
    kind: "step",
    text: join(
      say("experiments.simple-pendulum.build.title") + ".",
      say("experiments.simple-pendulum.build.why"),
    ),
  },
  {
    id: "measure",
    kind: "step",
    text: join(
      say("experiments.simple-pendulum.measure.title", { swings: 20 }) + ".",
      say("experiments.simple-pendulum.measure.why"),
    ),
  },
  {
    id: "start",
    kind: "step",
    text: say("experiments.simple-pendulum.measure.start").replace(/\*\*/g, ""),
  },
  {
    id: "tabulate",
    kind: "step",
    text: join(
      say("experiments.simple-pendulum.tabulate.title") + ".",
      say("experiments.simple-pendulum.tabulate.why"),
    ),
  },
  {
    id: "plot",
    kind: "step",
    text: join(
      say("experiments.simple-pendulum.plot.title") + ".",
      say("experiments.simple-pendulum.plot.why"),
    ),
  },
  {
    id: "analyse",
    kind: "step",
    text: join(
      say("experiments.simple-pendulum.analyse.title") + ".",
      say("experiments.simple-pendulum.analyse.why"),
    ),
  },
  { id: "tip-angle", kind: "step", text: say("experiments.simple-pendulum.tips.angle") },
  { id: "tip-cork", kind: "step", text: say("experiments.simple-pendulum.tips.cork") },
  {
    id: "count-from-one",
    kind: "correction",
    text: join(
      say("findings.pendulum.countFromOne.title") + ".",
      say("findings.pendulum.countFromOne.detail", { timed: 19, percent: 11 }),
    ),
  },
  { id: "count-demo", kind: "correction", text: say("findings.pendulum.countFromOne.demonstrate") },
  {
    id: "stopped-early",
    kind: "correction",
    text: join(
      say("findings.pendulum.stoppedEarly.title", { count: 15, target: 20 }) + ".",
      say("findings.pendulum.stoppedEarly.detail", { target: 20 }),
    ),
  },
  {
    id: "thread-clamp",
    kind: "correction",
    text: join(
      say("findings.pendulum.threadOnClamp.title") + ".",
      say("findings.pendulum.threadOnClamp.detail"),
    ),
  },
  {
    id: "mean-decimals",
    kind: "correction",
    text: join(
      say("table.meanDecimals.title", { row: 3, symbol: "t", value: "35.9", expected: 3 }) + ".",
      say("table.meanDecimals.detail"),
    ),
  },
  {
    id: "heading-unit",
    kind: "correction",
    text: say("table.headingUnit.title", { symbol: "T²", heading: "T²/s²" }),
  },
  {
    id: "scale-small",
    kind: "correction",
    text: join(
      say("graph.scaleSmall.title", { symbol: "l", percent: 40 }) + ".",
      say("graph.scaleSmall.detail"),
    ),
  },
  {
    id: "triangle-small",
    kind: "correction",
    text: join(
      say("graph.triangleSmall.title", { percent: 30 }) + ".",
      say("graph.triangleSmall.detail"),
    ),
  },
  {
    id: "sig-figs",
    kind: "correction",
    text: join(
      say("analysis.sigFigs.title", { name: "slope", written: 2 }) + ".",
      say("analysis.sigFigs.detail"),
    ),
  },
  {
    id: "unit-missing",
    kind: "correction",
    text: join(
      say("analysis.unitMissing.title", { name: "slope" }) + ".",
      say("analysis.unitMissing.detail"),
    ),
  },
  { id: "slope", kind: "units", text: "The slope is 4.03 s² m⁻¹." },
  { id: "g", kind: "units", text: "g equals 4π² over the slope, which is 9.80 m s⁻²." },
  { id: "length", kind: "units", text: "l = 0.800 m, measured to the centre of the bob." },
  { id: "reading", kind: "units", text: say("lab.audio.reading", { t: "35.93" }) },
  { id: "period", kind: "units", text: "T = 2π √(l ⁄ g). The period is about 1.80 s." },
  { id: "count-0", kind: "count", text: "0" },
  { id: "count-1", kind: "count", text: "1" },
  { id: "count-7", kind: "count", text: "7" },
  { id: "count-11", kind: "count", text: "11" },
  { id: "count-19", kind: "count", text: "19" },
  { id: "count-20", kind: "count", text: say("lab.audio.lastCount", { n: 20 }) },
  {
    id: "symbol-g",
    kind: "step",
    text: join(say("symbols.g.name") + ".", say("symbols.g.meaning")),
  },
];

/** Characters in the whole script, for the cost of one voice. */
export const scriptCharacters = () => LINES.reduce((n, l) => n + l.text.length, 0);
