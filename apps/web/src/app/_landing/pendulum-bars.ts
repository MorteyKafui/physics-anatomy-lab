import { topicHue, type Topic } from "@pa/ui";

/**
 * The pendulum card's isometric bar chart (Main.dc.html): its projection and each bar's three
 * faces. Shared by the landing page's live card and the experiment page's still drawing.
 */
export const project = (x: number, y: number, z: number) =>
  [150 + (x - y) * 0.8660254, 92 + (x + y) * 0.5 - z] as const;

const points = (corners: readonly (readonly [number, number, number])[]) =>
  corners
    .map(([x, y, z]) => project(x, y, z))
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(" ");

/** A topic hue mixed with white, for the tinted stages and the bars. */
export const tint = (topic: Topic, percent: number) =>
  `color-mix(in srgb, ${topicHue[topic]} ${percent}%, white)`;

export interface BarShape {
  /** The left, right and top faces, as SVG points, with their fills. */
  faces: { points: string; fill: string }[];
  /** The middle of the bar's top, where its note points. */
  top: readonly [number, number];
}

/** Bar i of six, showing T² (or T), lit or not. */
export function barShape(
  i: number,
  b: { T: number; T2: number },
  squared: boolean,
  lit: boolean,
): BarShape {
  const x = 8 + i * 15;
  const y = 44;
  const z = 58;
  const w = 11;
  const h = squared ? (b.T2 - 1) * 19 : (b.T - 1.2) * 70;
  return {
    top: project(x + w / 2, y + w / 2, z + h),
    faces: [
      {
        points: points([
          [x, y + w, z],
          [x + w, y + w, z],
          [x + w, y + w, z + h],
          [x, y + w, z + h],
        ]),
        fill: tint("mechanics", lit ? 85 : 35),
      },
      {
        points: points([
          [x + w, y, z],
          [x + w, y + w, z],
          [x + w, y + w, z + h],
          [x + w, y, z + h],
        ]),
        fill: tint("mechanics", lit ? 95 : 65),
      },
      {
        points: points([
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + w, z + h],
          [x, y + w, z + h],
        ]),
        fill: tint("mechanics", lit ? 100 : 15),
      },
    ],
  };
}
