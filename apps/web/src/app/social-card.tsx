import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  convergingLens,
  hotSolid,
  lensPins,
  methodOfMixtures,
  ohmsLaw,
  simplePendulum,
} from "@pa/experiments";
import { colour, logo, topicHue, type Topic } from "@pa/ui";
import { ImageResponse } from "next/og";

/** The social card (logo set brief, decision 4): 1200 × 630, the site's light theme. */
export const SOCIAL_CARD = {
  alt: "Physics Anatomy: physics from first principles.",
  size: { width: 1200, height: 630 },
  contentType: "image/png",
} as const;

/** Every experiment built today. The strip shows only their topics, so it grows with them. */
const EXPERIMENTS = [simplePendulum, ohmsLaw, convergingLens, lensPins, methodOfMixtures, hotSolid];

/** The topics that have an experiment, in the plan's order (the order of `topicHue`). */
export function builtTopics(): Topic[] {
  const built = new Set<string>(EXPERIMENTS.map((e) => e.topic));
  return (Object.keys(topicHue) as Topic[]).filter((topic) => built.has(topic));
}

/** What a card says: the site's, by default, or one experiment's (its page's card). */
export interface CardText {
  title: string;
  line: string;
  more: string;
  strip: string[];
}

export async function socialCard(text?: CardText) {
  const say: CardText = text ?? {
    title: "Physics Anatomy",
    line: "Physics from first principles.",
    more: "Build real experiments, take your own readings, and get coached.",
    strip: builtTopics().map((topic) => topicHue[topic]),
  };
  // Read when the card is built (it is static), never in the browser. Literal paths, so the
  // build traces only these files.
  const cwd = process.cwd();
  const [display, regular, bold] = await Promise.all([
    readFile(join(cwd, "../../packages/ui/brand/fonts/BricolageGrotesque-ExtraBold.ttf")),
    readFile(join(cwd, "public/fonts/noto-sans/NotoSans-Regular.ttf")),
    readFile(join(cwd, "public/fonts/noto-sans/NotoSans-Bold.ttf")),
  ]);
  const t = logo.thread;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: "0 88px",
        background: colour.paper,
        color: colour.onPaper,
        position: "relative",
      }}
    >
      <svg width={240} height={240} viewBox={logo.viewBox}>
        <path d={logo.letter} fill="none" stroke={colour.onPaper} strokeWidth={18} />
        <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={colour.onPaper} strokeWidth={5} />
        <circle cx={logo.bob.cx} cy={logo.bob.cy} r={logo.bob.r} fill={logo.bobColour} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <span
          style={{ fontFamily: "Bricolage", fontSize: 80, lineHeight: 1, letterSpacing: "-0.02em" }}
        >
          {say.title}
        </span>
        <span style={{ fontFamily: "Noto Sans", fontWeight: 700, fontSize: 40 }}>{say.line}</span>
        <span
          style={{ fontFamily: "Noto Sans", fontSize: 28, color: colour.onPaperMuted, width: 660 }}
        >
          {say.more}
        </span>
      </div>
      <div
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, display: "flex" }}
      >
        {say.strip.map((hue, i) => (
          <div key={i} style={{ flex: 1, background: hue }} />
        ))}
      </div>
    </div>,
    {
      ...SOCIAL_CARD.size,
      fonts: [
        { name: "Bricolage", data: display, weight: 800, style: "normal" },
        { name: "Noto Sans", data: regular, weight: 400, style: "normal" },
        { name: "Noto Sans", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
