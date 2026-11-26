// Draws the two practicals that have no card figure on the landing board, the converging lens
// with two pins and the method of mixtures with a hot solid, with the Anatomy kit (ADR 0036): the
// kit's own isometric camera places every corner, and each solid takes the landing cards' three
// tones (left side, right side, top) and hairline edge, so the six cards read as one set.
//
//   bun packages/ui/scripts/practicals-figures.mjs
//
// writes packages/ui/src/illustrations/practicals-figures.tsx; run prettier on it afterwards.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { cameraOf, iso } from "../../../apps/admin/src/spikes/anatomy-kit/iso-kit.mjs";

// True isometric, as the landing cards are drawn: azimuth 45°, elevation atan(1/√2). The scale
// makes one unit along x or y 1 px on screen along that axis's 30° line, and one unit up 1 px.
const ELEVATION = (Math.atan(1 / Math.SQRT2) * 180) / Math.PI;
const SCALE = Math.sqrt(1.5) / Math.sqrt(1.6);
const projection = (origin) => ({ origin, scale: SCALE, elevation: ELEVATION });
const { k, sinE } = cameraOf(projection([0, 0]));

// The landing cards' figure palette (landing-cards.tsx, from the approved board).
const C = {
  edge: "#2A2928",
  ink: "#141414",
  side: "#EFEDE6",
  sideDark: "#E2DFD6",
  top: "#FFFFFF",
  rule: "#F4F2EC",
  tick: "#8F8C86",
  wood: ["#F6E3B5", "#EED39A", "#FFF4D6"],
  lens: "rgba(139,124,246,0.22)",
  ray: "var(--pa-topic-light)",
  heatRay: "var(--pa-topic-heat)",
  axis: "#B9B5AA",
  mark: "#F0482A",
  metal: ["#BDBAB2", "#A9A69E", "#E9E7E1"],
  dark: ["#A9A69E", "#8F8C86", "#D9D6CE"],
  lag: ["#D7CBB4", "#EFE5D3"],
  copper: ["#C98D5E", "#EBB78C"],
  hot: ["#E0612A", "#FF7A3D"],
  cold: ["#AFC7F8", "#DCE7FD"],
  glass: ["#E9EEF8", "#F7F9FD"],
  solid: ["#9C9A93", "#86837C", "#C4C1B9"],
};

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const pt = ([x, y]) => `${f1(x)},${f1(y)}`;

/** A figure: its own origin on screen, and the JSX it has drawn so far. */
function figure(origin) {
  const p = projection(origin);
  const out = [];
  const P = (x, y, z) => iso([x, y, z], p);
  const poly = (points, fill, extra = "") =>
    `<polygon points="${points.map(pt).join(" ")}" fill="${fill}" stroke="${C.edge}" strokeWidth="1" strokeLinejoin="round"${extra} />`;
  return {
    P,
    out,
    raw: (s) => out.push(s),
    /** A box on the bench: x along the rule, y across it, z up; only its three seen faces. */
    box(x0, y0, z0, w, d, h, [left, right, top]) {
      const [x1, y1, z1] = [x0 + w, y0 + d, z0 + h];
      out.push(
        `<g>${poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], left)}${poly(
          [P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1)],
          right,
        )}${poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top)}</g>`,
      );
    },
    /** An upright cylinder: its side and its top, as the calorimeter card draws them. */
    cylinder(cx, cy, z0, r, h, [side, top], extra = "") {
      const b = P(cx, cy, z0);
      const t = P(cx, cy, z0 + h);
      const rx = r * k;
      const ry = rx * sinE;
      out.push(
        `<g${extra}><path d="M${f1(b[0] - rx)} ${f1(t[1])} L${f1(b[0] - rx)} ${f1(b[1])} A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(b[0] + rx)} ${f1(b[1])} L${f1(b[0] + rx)} ${f1(t[1])} Z" fill="${side}" stroke="${C.edge}" strokeWidth="1" /><ellipse cx="${f1(t[0])}" cy="${f1(t[1])}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${top}" stroke="${C.edge}" strokeWidth="1" /></g>`,
      );
    },
    /** A ring lying flat, outline only. */
    ring(cx, cy, z, r, stroke, width = 1.6) {
      const c = P(cx, cy, z);
      out.push(
        `<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="${f1(r * k)}" ry="${f1(r * k * sinE)}" fill="none" stroke="${stroke}" strokeWidth="${width}" />`,
      );
    },
    line(points, stroke, width = 1.6, extra = "") {
      out.push(
        `<polyline points="${points.map((q) => pt(P(...q))).join(" ")}" fill="none" stroke="${stroke}" strokeWidth="${width}"${extra} />`,
      );
    },
    /** A disc standing in the plane x = cx (the lens), as a polygon of the kit's points. */
    discAcross(cx, cy, cz, r, fill, steps = 40) {
      const ring = Array.from({ length: steps }, (_, i) => {
        const a = (i / steps) * Math.PI * 2;
        return P(cx, cy + r * Math.cos(a) * 0.32, cz + r * Math.sin(a));
      });
      out.push(poly(ring, fill, ` strokeWidth="1.4"`).replace(`strokeWidth="1" `, ""));
    },
    dot(x, y, z, r, fill) {
      const c = P(x, y, z);
      out.push(
        `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" fill="${fill}" stroke="${C.ink}" strokeWidth="1" />`,
      );
    },
    text(x, y, z, s, dy = 9) {
      const c = P(x, y, z);
      out.push(
        `<text x="${f1(c[0])}" y="${f1(c[1] + dy)}" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fontWeight="600" fill="${C.ink}" pointerEvents="none">${s}</text>`,
      );
    },
  };
}

/**
 * The converging lens with two pins: the object pin, the lens and the search pin in their holders
 * on the metre rule. The search pin's tip meets the tip of the object pin's inverted image, where
 * the two show no parallax; two rays from the object pin cross at that image.
 */
function pins() {
  const g = figure([71, 70]);
  const AXIS = 30;
  const Y = 14;
  g.box(-10, -4, -6, 200, 34, 6, [C.side, C.sideDark, C.top]); // the bench
  g.box(0, 20, 0, 180, 8, 2, [C.side, C.sideDark, C.rule]); // the metre rule
  for (let x = 0; x <= 180; x += 10) {
    const long = x % 50 === 0;
    g.line(
      [
        [x, 20, 2],
        [x, long ? 25 : 23, 2],
      ],
      C.tick,
      0.8,
    );
  }
  // F on each side of the lens, a focal length from it, as the lens card marks them.
  for (const x of [60, 120]) {
    g.dot(x, 24, 2, 2.4, C.ink);
  }
  // The object pin, in its cork holder.
  g.box(26, Y - 4, 0, 8, 8, 6, C.wood);
  g.line(
    [
      [30, Y, 6],
      [30, Y, AXIS],
    ],
    C.ink,
    1.6,
  );
  g.dot(30, Y, AXIS + 2, 3, C.mark);
  // The lens in its holder.
  g.box(87, Y - 3, 0, 6, 6, 4, [C.side, C.sideDark, C.top]);
  g.line(
    [
      [90, Y, 4],
      [90, Y, AXIS - 18],
    ],
    C.ink,
    1.2,
  );
  g.discAcross(90, Y, AXIS, 18, C.lens);
  // The optical axis, through the lens's centre.
  g.line(
    [
      [0, Y, AXIS],
      [180, Y, AXIS],
    ],
    C.axis,
    1,
    ` strokeDasharray="3 4"`,
  );
  // The inverted image of the object pin, hanging from the axis, and two rays that form it.
  g.line(
    [
      [150, Y, AXIS],
      [150, Y, AXIS + 24],
    ],
    C.ray,
    1.6,
    ` strokeDasharray="2 2"`,
  );
  g.line(
    [
      [30, Y, AXIS + 12],
      [90, Y, AXIS + 12],
      [150, Y, AXIS - 12],
    ],
    C.ray,
    1.6,
    ` className="pa-ray" strokeDasharray="5 4"`,
  );
  g.line(
    [
      [30, Y, AXIS + 12],
      [150, Y, AXIS - 12],
    ],
    C.ray,
    1.6,
    ` className="pa-ray" strokeDasharray="5 4"`,
  );
  // The search pin, its tip at the image's tip.
  g.box(146, Y - 4, 0, 8, 8, 6, C.wood);
  g.line(
    [
      [150, Y, 6],
      [150, Y, AXIS],
    ],
    C.ink,
    1.6,
  );
  g.dot(150, Y, AXIS - 2.5, 2.6, C.ink);
  g.text(60, 24, 2, "F");
  g.text(120, 24, 2, "F");
  return g.out;
}

/**
 * The method of mixtures with a hot solid: the solid on its thread, lifted from the beaker of
 * boiling water on its tripod and heater, on its way to the lagged calorimeter with its
 * thermometer and stirrer.
 */
function hotSolid() {
  const g = figure([118, 96]);
  g.box(-36, -30, -6, 190, 64, 6, [C.side, C.sideDark, C.top]); // the bench
  // The heater under the tripod.
  g.cylinder(0, 0, 0, 9, 8, C.dark);
  // The tripod: three legs and its ring.
  for (const a of [Math.PI * 0.25, Math.PI * 0.95, Math.PI * 1.6]) {
    g.line(
      [
        [Math.cos(a) * 21, Math.sin(a) * 21, 0],
        [Math.cos(a) * 17, Math.sin(a) * 17, 34],
      ],
      C.tick,
      2,
    );
  }
  g.ring(0, 0, 34, 17, C.tick, 2);
  // The beaker of boiling water.
  g.cylinder(0, 0, 34, 16, 30, C.glass);
  g.cylinder(0, 0, 34, 14, 22, C.hot);
  for (const [x, y, z] of [
    [-4, 2, 58],
    [5, -3, 59],
    [1, 6, 57],
  ]) {
    const c = g.P(x, y, z);
    g.raw(
      `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="1.6" fill="#FFFFFF" stroke="${C.edge}" strokeWidth="0.6" />`,
    );
  }
  // The path the solid takes, from the boiling water to the calorimeter.
  g.line(
    [
      [0, 0, 64],
      [24, 0, 92],
      [64, 0, 96],
      [100, 0, 62],
    ],
    C.heatRay,
    1.6,
    ` className="pa-ray" strokeDasharray="5 4"`,
  );
  // The solid on its thread, on its way.
  g.line(
    [
      [52, 0, 112],
      [52, 0, 86],
    ],
    C.ink,
    1.2,
  );
  g.box(47, -5, 74, 10, 10, 12, C.solid);
  // The lagged calorimeter: lagging, the copper can's rim, and the water in it.
  g.cylinder(104, 0, 0, 26, 40, C.lag);
  g.cylinder(104, 0, 40, 19, 3, C.copper);
  g.cylinder(104, 0, 40, 16, 1, C.cold);
  // The stirrer and the thermometer.
  g.line(
    [
      [94, 4, 41],
      [94, 4, 70],
    ],
    C.tick,
    2,
  );
  g.ring(94, 4, 70, 4, C.tick, 2);
  g.line(
    [
      [114, -3, 41],
      [114, -3, 84],
    ],
    C.ink,
    3,
  );
  g.line(
    [
      [114, -3, 41],
      [114, -3, 62],
    ],
    C.mark,
    1.6,
  );
  return g.out;
}

const header = `// Generated by packages/ui/scripts/practicals-figures.mjs with the Anatomy kit (ADR 0036); do not
// edit by hand. The two practicals the landing board has no card for, drawn as its cards are, in
// the same 300 × 228 stage.

/** The converging lens with two pins: object pin, lens and search pin on the metre rule. */
export function PinsStage() {
  return (
    <>
${pins().join("\n")}
    </>
  );
}

/** The method of mixtures with a hot solid: boiling water, the solid on its thread, the calorimeter. */
export function HotSolidStage() {
  return (
    <>
${hotSolid().join("\n")}
    </>
  );
}
`;

const target = fileURLToPath(
  new URL("../src/illustrations/practicals-figures.tsx", import.meta.url),
);
writeFileSync(target, header);
console.log(`wrote ${target}`);
