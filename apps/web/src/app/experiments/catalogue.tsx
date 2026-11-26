import {
  ASSEMBLY_RULES,
  benchPeriod,
  convergingLens,
  correctMixturesBench,
  correctSolidBench,
  hotSolid,
  lensPins,
  lensWorld,
  LENS_PROCEDURE_RULES,
  methodOfMixtures,
  MIXTURES_PROCEDURE_RULES,
  mixturesPeak,
  ohmsLaw,
  ohmsLawWorld,
  PENDULUM_PARTS,
  PINS_PROCEDURE_RULES,
  PROCEDURE_RULES,
  simplePendulum,
  SOLID_PROCEDURE_RULES,
  solidPeak,
  solidWorld,
  TIMING_RULES,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/catalogue";
import "@pa/i18n/landing";
import "@pa/i18n/converging-lens";
import "@pa/i18n/method-of-mixtures";
import "@pa/i18n/ohms-law";
import { imageDistance, periodExact, periodSmallAngle } from "@pa/physics";
import { topicHue, type Topic } from "@pa/ui";
import {
  CircuitStage,
  LensStage,
  MixturesStage,
  PendulumStage,
} from "@pa/ui/illustrations/landing-cards";
import { PENDULUM_STAND_VIEWBOX, PendulumStandStage } from "@pa/ui/illustrations/pendulum-stand";
import { HotSolidStage, PinsStage } from "@pa/ui/illustrations/practicals-figures";
import type { ReactNode } from "react";

import { CARD_SEED, cardsData } from "../_landing/cards-data";
import type { MenuTopic } from "../_landing/topic-menu";
import { barShape } from "../_landing/pendulum-bars";
import { lensApparatus } from "../lab/converging-lens/apparatus";
import { pinsApparatus } from "../lab/converging-lens-pins/apparatus";
import { hotSolidApparatus } from "../lab/method-of-mixtures-solid/apparatus";
import { mixturesApparatus } from "../lab/method-of-mixtures/apparatus";
import { ohmsLawApparatus } from "../lab/ohms-law/apparatus";

/**
 * Every lab that exists, as its page shows it (docs/content/experiment-pages-brief.md). Each
 * entry is read from the experiment's own definition, copy, rules and models: nothing about an
 * experiment is typed in here except which lab is which.
 */
export interface Entry {
  id: string;
  version: number;
  topic: Topic;
  title: string;
  aim: string;
  theory: string;
  /** What the student finds, as a noun phrase. */
  teaches: string;
  apparatus: string[];
  /** What the coach catches, one phrase per rule the lab runs. */
  catches: string[];
  /** The rule ids behind `catches`, for the test that keeps them in step. */
  rules: string[];
  model: { how: string; assumes: string; limits: string; validated: string };
  /** The other lab that finds the same thing another way. */
  sibling?: string;
  drawing: () => ReactNode;
  /** The practicals page's card: its figure (the board's drawing) and its reading badge. */
  card: { figure: Figure; badge: string };
}

/** A card's drawing, in its own units; `width` is how much of the card it fills. */
export interface Figure {
  viewBox: string;
  width: string;
  draw: () => ReactNode;
}

const stage = (draw: () => ReactNode): Figure => ({ viewBox: "0 0 300 228", width: "100%", draw });

const ids = (rules: readonly { id: string }[]) => rules.map((r) => r.id);
const phrase = (id: string) => t(`catalogue.rule.${id}` as MessageKey);
const card = (id: string, params: Record<string, string | number> = {}) => ({
  how: t(`catalogue.model.${id}.how` as MessageKey, params),
  assumes: t(`catalogue.model.${id}.assumes` as MessageKey, params),
  limits: t(`catalogue.model.${id}.limits` as MessageKey, params),
  validated: t(`catalogue.model.${id}.validated` as MessageKey, params),
});
const cm = (m: number) => (m * 100).toFixed(m * 100 < 1 ? 1 : 0);

/** The pendulum's stand drawing, with its bars at the six lengths, still. */
function pendulumDrawing() {
  const { bars } = cardsData().pendulum;
  return (
    <>
      <PendulumStage />
      {bars.map((b, i) => (
        <g key={b.l} stroke="var(--pa-figure-ink)" strokeWidth="1" strokeLinejoin="round">
          {barShape(i, b, true, false).faces.map((f, k) => (
            <polygon key={k} points={f.points} fill={f.fill} />
          ))}
        </g>
      ))}
    </>
  );
}

function entries(): Entry[] {
  const pendulumRules = [...TIMING_RULES, ...ASSEMBLY_RULES];
  const swing = (simplePendulum.amplitudeDeg * Math.PI) / 180;
  const longer =
    (periodExact({ length: simplePendulum.length, g: 9.81, amplitude: swing }) /
      periodSmallAngle({ length: simplePendulum.length, g: 9.81 }) -
      1) *
    100;
  const world = ohmsLawWorld(CARD_SEED);
  const metres = (m: number) => cm(m);
  // The badges' readings, each from the lab's own model on the landing cards' bench (CARD_SEED).
  const f = lensWorld(CARD_SEED).focalLength;
  const u = convergingLens.objectDistances[0]!;
  const badge = (id: string, value: string) => t(`practicals.badge.${id}` as MessageKey, { value });
  return [
    {
      id: simplePendulum.id,
      version: simplePendulum.version,
      topic: simplePendulum.topic,
      title: t("experiments.simple-pendulum.title"),
      aim: t("report.gen.aim"),
      theory: t("report.gen.theory"),
      teaches: t("catalogue.teaches.simple-pendulum"),
      apparatus: [
        ...PENDULUM_PARTS.map((p) =>
          t(`experiments.simple-pendulum.parts.${p}.name` as MessageKey),
        ),
      ],
      catches: pendulumRules.map((r) => phrase(r.id)),
      rules: ids(pendulumRules),
      model: card("simple-pendulum", {
        deg: simplePendulum.amplitudeDeg,
        percent: longer.toFixed(2),
      }),
      drawing: pendulumDrawing,
      card: {
        figure: {
          viewBox: PENDULUM_STAND_VIEWBOX,
          width: "78%",
          draw: () => <PendulumStandStage />,
        },
        badge: badge(simplePendulum.id, benchPeriod(9.81).toFixed(3)),
      },
    },
    {
      id: ohmsLaw.id,
      version: ohmsLaw.version,
      topic: ohmsLaw.topic,
      title: t("experiments.ohms-law.title"),
      aim: t("experiments.ohms-law.report.aim"),
      theory: t("experiments.ohms-law.report.theory"),
      teaches: t("catalogue.teaches.ohms-law"),
      apparatus: ohmsLawApparatus(world),
      catches: PROCEDURE_RULES.map((r) => phrase(r.id)),
      rules: ids(PROCEDURE_RULES),
      model: card("ohms-law"),
      drawing: () => <CircuitStage />,
      card: {
        figure: stage(() => <CircuitStage />),
        badge: badge(ohmsLaw.id, world.emf.toFixed(2)),
      },
    },
    {
      id: convergingLens.id,
      version: convergingLens.version,
      topic: convergingLens.topic,
      title: t("experiments.converging-lens.title"),
      aim: t("experiments.converging-lens.report.aim"),
      theory: t("experiments.converging-lens.report.theory"),
      teaches: t("catalogue.teaches.converging-lens"),
      apparatus: lensApparatus(),
      catches: LENS_PROCEDURE_RULES.map((r) => phrase(r.id)),
      rules: ids(LENS_PROCEDURE_RULES),
      model: card("converging-lens", {
        index: convergingLens.lens.index,
        aperture: (convergingLens.lens.aperture * 100).toFixed(1),
        f: metres(convergingLens.lens.focalLength),
      }),
      sibling: lensPins.id,
      drawing: () => <LensStage />,
      card: {
        figure: stage(() => <LensStage />),
        badge: badge(convergingLens.id, (imageDistance(u, f) * 100).toFixed(1)),
      },
    },
    {
      id: lensPins.id,
      version: lensPins.version,
      topic: lensPins.topic,
      title: t("experiments.converging-lens-pins.title"),
      aim: t("experiments.converging-lens-pins.report.aim"),
      theory: t("experiments.converging-lens-pins.report.theory"),
      teaches: t("catalogue.teaches.converging-lens-pins"),
      apparatus: pinsApparatus(),
      catches: PINS_PROCEDURE_RULES.map((r) => phrase(r.id)),
      rules: ids(PINS_PROCEDURE_RULES),
      model: card("converging-lens-pins", {
        eye: metres(lensPins.view.eyeBehind),
        head: metres(lensPins.view.head),
        arcmin: Math.round((lensPins.view.acuity * 180 * 60) / Math.PI),
      }),
      sibling: convergingLens.id,
      drawing: () => <PinsStage />,
      card: {
        figure: stage(() => <PinsStage />),
        badge: badge(lensPins.id, (f * 100).toFixed(1)),
      },
    },
    {
      id: methodOfMixtures.id,
      version: methodOfMixtures.version,
      topic: methodOfMixtures.topic,
      title: t("experiments.method-of-mixtures.title"),
      aim: t("experiments.method-of-mixtures.report.aim"),
      theory: t("experiments.method-of-mixtures.report.theory"),
      teaches: t("catalogue.teaches.method-of-mixtures"),
      apparatus: mixturesApparatus(),
      catches: MIXTURES_PROCEDURE_RULES.map((r) => phrase(r.id)),
      rules: ids(MIXTURES_PROCEDURE_RULES),
      model: card("method-of-mixtures", {
        room: methodOfMixtures.room,
        hot: methodOfMixtures.hot.temperature,
      }),
      sibling: hotSolid.id,
      drawing: () => <MixturesStage />,
      card: {
        figure: stage(() => <MixturesStage />),
        badge: badge(
          methodOfMixtures.id,
          mixturesPeak(correctMixturesBench(methodOfMixtures.volumes[0]!)).temperature.toFixed(1),
        ),
      },
    },
    {
      id: hotSolid.id,
      version: hotSolid.version,
      topic: hotSolid.topic,
      title: t("experiments.method-of-mixtures-solid.title"),
      aim: t("experiments.method-of-mixtures-solid.report.aim"),
      theory: t("experiments.method-of-mixtures-solid.report.theory"),
      teaches: t("catalogue.teaches.method-of-mixtures-solid"),
      apparatus: hotSolidApparatus(),
      catches: SOLID_PROCEDURE_RULES.map((r) => phrase(r.id)),
      rules: ids(SOLID_PROCEDURE_RULES),
      model: card("method-of-mixtures-solid", { metals: hotSolid.metals.length }),
      sibling: methodOfMixtures.id,
      drawing: () => <HotSolidStage />,
      card: {
        figure: stage(() => <HotSolidStage />),
        badge: badge(
          hotSolid.id,
          solidPeak(correctSolidBench(solidWorld(CARD_SEED))).temperature.toFixed(1),
        ),
      },
    },
  ];
}

export const CATALOGUE: readonly Entry[] = entries();

export const entry = (id: string) => CATALOGUE.find((e) => e.id === id);

/**
 * The header's topic menus: every topic in the master plan, in its order (the topic colours in
 * packages/ui). A topic with practicals lists them (each opening its lab) and links to the
 * practicals page filtered to it; one without says so, and links nowhere (AGENTS.md rule 2).
 */
export function topicMenu(): MenuTopic[] {
  return (Object.keys(topicHue) as Topic[]).map((topic) => {
    const name = t(`catalogue.topic.${topic}` as MessageKey);
    const practicals = CATALOGUE.filter((e) => e.topic === topic).map((e) => ({
      id: e.id,
      title: e.title,
      href: labLinks(e.id).open,
    }));
    return {
      topic,
      name,
      all:
        practicals.length > 0
          ? {
              href: `/experiments?topic=${topic}`,
              label: t("landing.nav.allTopic", { topic: name.toLowerCase() }),
            }
          : undefined,
      soon: t("landing.nav.comingSoon"),
      practicals,
    };
  });
}

/** The lab's own address for an experiment, and its model check, sheets and exam. */
export const labLinks = (id: string) => ({
  open: `/lab/${id}`,
  check: `/lab/${id}/check`,
  sheets: `/lab/${id}/sheets`,
  exam: `/lab/${id}/exam`,
});
