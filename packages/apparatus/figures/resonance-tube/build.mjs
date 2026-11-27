// The resonance tube, drawn with the Anatomy kit (packages/apparatus/kit).
//
//   node build.mjs            writes resonance-tube.html (dark)
//   node build.mjs --light    writes resonance-tube-light.html
//   node build.mjs --audit    also proves the geometry (kit/audit.mjs)
//
// World units are a third of a centimetre (3 units = 1 cm): the glass tube is 300 units long.
// Every number the figure shows comes from packages/physics/src/resonance-tube.ts, which is
// imported here for the build and inlined, with its types stripped, for the live page.

import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as A from "../../kit/audit.mjs";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import { kitScript } from "../../kit/scripts/inline-kit.mjs";
import * as M from "../../../physics/src/resonance-tube.ts";
import { TUNING_FORKS } from "../../../physics/src/sonometer.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "../../kit");
const MODEL = join(HERE, "../../../physics/src/resonance-tube.ts");
const SONOMETER = join(HERE, "../../../physics/src/sonometer.ts");
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------------------------------------------------------------------------------------------
// Sizes. 3 units to the centimetre.
const U = 3;
const W = 600;
const H = 820;
const AZIMUTH = 58;
const ELEVATION = 20;

const BASE = { x: -90, y: -26, w: 172, d: 54, r: 6 };
const BASE_H = 9;
const FOOT_H = 3;

const ROD_R = 2.1;
const ROD1 = [0, 0];
const ROD1_TOP = 364;
const ROD2 = [-36, 0];
const ROD2_TOP = 336;

const TUBE = [40, 0];
const R_OUT = 6.8;
const R_IN = 6; // 2.0 cm internal radius
const Z_BOTTOM = 30; // the bung's top face: the bottom of the air and water column
const Z_MOUTH = Z_BOTTOM + 100 * U; // a 1 m tube
const BUNG = { z0: 22, z1: Z_BOTTOM + 2 };
const NIPPLE = { z0: 10, z1: 22, r: 1.4 };
const CLAMP_Z = [112, 284];

const RES = [-64, 0];
const RES_R = 16;
const RES_CONE = 18; // tip to the top of the cone
const RES_BODY = 64; // tip to the rim
const RES_WATER = 30; // tip to its water surface
const RES_TIP_LIFT = 8; // the reservoir's nipple, tip to root
const RES_RING_S =
  RES_TIP_LIFT + ((RES_R - 1.6 - 2.6) / (RES_R - 2.6)) * (RES_CONE - RES_TIP_LIFT) - 1.6;

const HOSE_R = 2.1;
const HOSE_Y = 12;

const RULE = { x: 54, y: -1, w: 9, d: 1.6 };
const RULE_FOOT = { x: 50, y: -6, w: 17, d: 12, r: 1.2 };
const RULE_FOOT_H = 24;
const RULE_TOP = Z_MOUTH + 4;

const THERMO = [-16, 0];
const THERMO_Z = [150, 238];

const FORK_Z = Z_MOUTH + 16;
const FORK_BEND_X = TUBE[0] - 16;
const PAD = { x: 58, y: 10, w: 20, d: 13, r: 1.6 };

const ROOM_C = 28;
const MODEL_TUBE = {
  length: (Z_MOUTH - Z_BOTTOM) / U / 100,
  radius: R_IN / U / 100,
  temperatureC: ROOM_C,
};
const FORK_START = 512;
const L_START = M.resonanceLength(MODEL_TUBE, FORK_START, 1);
const LEVEL = (L) => Z_MOUTH - L * 100 * U;
const L_RANGE = [0.04, (Z_MOUTH - (RES_WATER + 12)) / U / 100];
const PRONG = (f) => 30 * Math.sqrt(512 / f);

// ---------------------------------------------------------------------------------------------
const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [ROD1[0], ROD1[1], ROD1_TOP + 2],
    [FORK_BEND_X + PRONG(256) + 4, 0, FORK_Z + 4],
    [RES[0] - RES_R, 0, LEVEL(L_RANGE[0]) - RES_WATER + RES_BODY],
  ],
  W,
  H,
  { pad: 30, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const UP = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const ALONG = (o, a) => G.frameAlong(o, a);

const R = A.recorder(P);
const record = (shape) => R.solid(shape);
const put = (part, ref, svg, { shapes = [], bias = 0, name, move } = {}) =>
  R.put({
    piece: part,
    at: ref,
    bias,
    svg,
    shapes,
    name: name ?? R.nameFor(shapes[0]?.name ?? `${part}.item`),
    move: move ?? [0, 0, 0],
  });

// ---------------------------------------------------------------------------------------------
// Parts.

function base() {
  const back = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  const feet = k
    .corners(BASE, 12)
    .sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P));
  for (const [x, y] of feet) {
    back.push(S(k.cylinder(x, y, 6, -BASE_H - FOOT_H, FOOT_H, P, 28), { tone: "lo" }));
    record(A.cylinder(x, y, 6, -BASE_H - FOOT_H, FOOT_H, { name: "stand.foot", ground: true }));
  }
  const plate = k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4);
  const seam = k.sideSeam(BASE, -BASE_H + 3, P, 8);
  back.push(S(plate, { tone: "mid", inner: Ln(seam, { tone: "faint" }) }));
  record(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.base", ground: true }));
  back.push(Ln(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 9);
  back.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  back.push(
    Dots(
      screws.map(([x, y]) => at([x, y, 0])),
      { size: 0.5 },
    ),
  );
  // Label plate on the front edge: maker's plate with three rule lines.
  const label = { x: -6, y: BASE.y + BASE.d - 13, w: 30, d: 8, r: 1 };
  back.push(S(k.slabOf(label, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  back.push(Ln(k.planOutline(k.insetPlan(label, 1.4), 0.6, P, 3), { tone: "faint" }));
  for (const [i, w] of [16, 22, 12].entries())
    back.push(
      Ln(
        k.lineOnTop(
          [label.x + 3, label.y + 2.2 + i * 1.8],
          [label.x + 3 + w, label.y + 2.2 + i * 1.8],
          0.6,
          P,
        ),
        { tone: "lo", free: true },
      ),
    );
  back.push(
    Dots([at([label.x + 1.6, label.y + 4, 0.6]), at([label.x + label.w - 1.6, label.y + 4, 0.6])], {
      size: 0.4,
    }),
  );
  return back.join("");
}

function rod(part, [x, y], top, bosses) {
  const collar =
    S(k.cylinder(x, y, 4.4, 0, 3, P, 32), { tone: "mid" }) +
    S(k.cylinder(x, y, 3.4, 3, 3, P, 28), { tone: "mid" }) +
    Ln(k.knurl(x, y, 3.4, 3, 6, 22, P), { tone: "lo" });
  put(part, [x, y, 3], collar, {
    shapes: [
      record(A.cylinder(x, y, 4.4, 0, 3, { name: `stand.${part}.collar` })),
      record(A.cylinder(x, y, 3.4, 3, 3, { name: `stand.${part}.nut` })),
    ],
  });
  // The rod in pieces between the boss heads on it, so each boss sits between its two pieces in
  // the painter's order. A piece marked `live` is rebuilt as its boss moves.
  const stops = [...bosses].sort((a, b) => a.z - b.z);
  let from = 6;
  stops.forEach((stop, index) => {
    rodPiece(part, x, y, from, stop.z - 6, false, stop.live ? `rod-lo` : null);
    from = stop.z + 6;
    void index;
  });
  rodPiece(part, x, y, from, top, true, stops.some((stop) => stop.live) ? "rod-hi" : null);
}

function rodPiece(part, x, y, z0, z1, cap, live) {
  const svg = rodSvg(x, y, z0, z1, cap);
  put(part, [x, y, (z0 + z1) / 2], live ? `<g data-live="${live}">${svg}</g>` : svg, {
    shapes: [record(A.cylinder(x, y, ROD_R, z0, z1 - z0, { name: "stand.rod" }))],
  });
}

function rodSvg(x, y, z0, z1, cap) {
  return (
    k.solidSvg(k.cylinder(x, y, ROD_R, z0, z1 - z0 - (cap ? 1.2 : 0), P, 24), {
      tone: "mid",
      crease: "none",
    }) +
    (cap ? k.solidSvg(k.cylinder(x, y, ROD_R + 0.2, z1 - 1.2, 1.2, P, 24), { tone: "mid" }) : "")
  );
}

// A boss head on a rod at height z, holding an arm that leaves along `dir` (+1 along x, −1).
function boss(owner, [x, y], z, dir, { move } = {}) {
  const part = "stand";
  const plan = { x: x - 4.4, y: y - 4.4, w: 8.8, d: 8.8, r: 1.2 };
  let svg = S(k.slabOf(plan, z - 6, 12, P, 3, 0.5), { tone: "mid" });
  svg += Ln(k.sideSeam(plan, z + 2, P, 3), { tone: "faint" });
  // Thumb screw on the front face (+y), pressing on the rod.
  const F = ALONG([x, y + 4.4, z - 2.6], [0, 1, 0]);
  svg +=
    S(G.disc(0, 1.8, 1, F, P), { tone: "mid" }) +
    S(G.disc(1.8, 5.4, 2.6, F, P), { tone: "mid" }) +
    Ln(G.ribsOf(F, 2.1, 5.1, 2.6, 16, P), { tone: "lo" });
  const shapes = [
    record(
      A.box([plan.x, plan.y, z - 6], [plan.x + plan.w, plan.y + plan.d, z + 6], {
        name: `${owner}.boss`,
      }),
    ),
    record(A.disc(F, 0, 1.8, 1, { name: `${owner}.boss.screw` })),
    record(A.disc(F, 1.8, 5.4, 2.6, { name: `${owner}.boss.knob` })),
  ];
  put(owner === "reservoir" ? "reservoir" : part, [x, y + 2, z], svg, { shapes, move });
  return [x + dir * 4.4, y, z + 2];
}

function arm(part, from, to, r = 1.15, { move } = {}) {
  const axis = G.unit3(G.sub3(to, from));
  const length = G.len3(G.sub3(to, from));
  const F = ALONG(from, axis);
  put(
    part,
    G.lerp3(from, to, 0.5),
    S(G.disc(0, length, r, F, P), { tone: "mid", crease: "none" }),
    { shapes: [record(A.disc(F, 0, length, r, { name: `${part}.arm` }))], move },
  );
}

function tubeClamp(z) {
  const part = "stand";
  const start = boss(part, ROD1, z, 1);
  const jawX = TUBE[0] - R_OUT - 7;
  arm(part, start, [jawX, 0, start[2]]);
  // The clamp body, and two jaws that close on the tube from behind and in front.
  const body = { x: jawX, y: -R_OUT - 3, w: 4, d: (R_OUT + 3) * 2, r: 0.8 };
  put(part, [jawX + 2, 0, z], S(k.slabOf(body, z - 3, 8, P, 2, 0.4), { tone: "mid" }), {
    shapes: [record(A.slab(body, z - 3, 8, { name: "stand.clamp.body" }, 2))],
  });
  const sx = TUBE[0] + R_OUT + 5.5;
  const F = ALONG([sx, -R_OUT - 1.2, z], [0, 1, 0]);
  const length = (R_OUT + 1.2) * 2;
  const screwShape = A.disc(F, 0, length, 0.8, { name: "stand.clamp.screw" });
  for (const side of [-1, 1]) {
    const y0 = side < 0 ? -R_OUT - 3 : R_OUT + 1.2;
    const jaw = { x: jawX + 4, y: y0, w: TUBE[0] + R_OUT + 8 - jawX - 4, d: 1.8, r: 0.6 };
    const cork = { x: TUBE[0] - 3, y: side < 0 ? -R_OUT - 1.2 : R_OUT, w: 6, d: 1.2, r: 0.4 };
    put(
      part,
      [jaw.x + jaw.w / 2, y0 + 1, z],
      S(k.slabOf(jaw, z - 2.5, 5, P, 2, 0.3), { tone: "mid" }),
      { shapes: [record(A.slab(jaw, z - 2.5, 5, { name: "stand.clamp.jaw" }, 2))] },
    );
    put(part, [TUBE[0], cork.y + 0.6, z], S(k.slabOf(cork, z - 2, 4, P, 2), { tone: "lo" }), {
      shapes: [record(A.slab(cork, z - 2, 4, { name: "stand.clamp.cork", seated: true }, 2))],
    });
  }
  // Wing screw across the jaws' far ends.
  put(part, [sx, 0, z], S(G.disc(0, length, 0.8, F, P), { tone: "mid", crease: "none" }), {
    shapes: [record(screwShape)],
  });
  let screw = "";
  const N = ALONG([sx, R_OUT + 3, z], [0, 1, 0]);
  screw += S(G.disc(0, 2.4, 1.8, N, P), { tone: "mid" });
  const nutShape = A.disc(N, 0, 2.4, 1.8, { name: "stand.clamp.nut" });
  const wing = { x: sx - 4.2, y: R_OUT + 5.4, w: 8.4, d: 0.9, r: 0.4 };
  screw += S(k.slabOf(wing, z - 1.4, 2.8, P, 2), { tone: "mid" });
  put(part, [sx, R_OUT + 4, z], screw, {
    shapes: [record(nutShape), record(A.slab(wing, z - 1.4, 2.8, { name: "stand.clamp.wing" }, 2))],
  });
}

// The glass tube: a back layer (the inside seen through the glass), the water and the air
// column's wave (live), then the glass's front lines.
function glassTube() {
  const [x, y] = TUBE;
  const length = Z_MOUTH - Z_BOTTOM + 2;
  const outer = k.cylinder(x, y, R_OUT, BUNG.z0, Z_MOUTH - BUNG.z0, P, 64);
  const inner = k.cylinder(x, y, R_IN, Z_BOTTOM, Z_MOUTH - Z_BOTTOM, P, 64);
  const back = `<path class="rt-glass" d="${outer.fill}"/><path class="rt-bore" d="${inner.fill}"/>`;
  const bung = S(k.cylinder(x, y, R_IN, BUNG.z0, BUNG.z1 - BUNG.z0, P, 40), { tone: "lo" });
  const front = [
    `<path class="rt-glass-edge iso-line" data-tone="mid" d="${outer.outline}"/>`,
    Ln(k.ring(x, y, R_IN, Z_MOUTH, P, 64), { tone: "mid" }),
    // Two long reflections of the window, on the near side of the glass.
    `<path class="rt-shine" d="${glints(x, y, R_OUT - 0.8, BUNG.z0 + 6, Z_MOUTH - 4, [0.62, 0.72])}"/>`,
    `<path class="rt-shine rt-shine-soft" d="${glints(x, y, R_OUT - 0.8, BUNG.z0 + 6, Z_MOUTH - 4, [-0.86, -0.8])}"/>`,
  ].join("");
  void length;
  const water = `<g data-live="water"></g>`;
  const wave = `<g data-live="wave" class="rt-wave"></g>`;
  const svg = `<g data-part="tube">${back}${bung}${water}${wave}${front}</g>`;
  put("tube", [x, y, (Z_MOUTH + BUNG.z0) / 2], svg, {
    shapes: [record(A.cylinder(x, y, R_OUT, BUNG.z0, Z_MOUTH - BUNG.z0, { name: "tube.glass" }))],
  });
  // Nipple below the bung, glass.
  const F = UP([x, y, NIPPLE.z0]);
  const nipple = G.solidOf(
    [
      [3, 2.4],
      [4.6, 2.4],
      [4.6, 1.25],
      [NIPPLE.z1 - NIPPLE.z0, 1.25],
    ],
    F,
    P,
  );
  put(
    "tube",
    [x, y, (NIPPLE.z0 + NIPPLE.z1) / 2],
    S(nipple, { tone: "mid", className: "rt-glassy" }),
    {
      shapes: [
        record(
          A.solid(
            F,
            [
              [3, 2.4],
              [4.6, 2.4],
              [4.6, 1.25],
              [NIPPLE.z1 - NIPPLE.z0, 1.25],
            ],
            { name: "tube.nipple" },
          ),
        ),
      ],
    },
  );
}

// A vertical highlight band on the near side of a vertical cylinder, between two angles from
// the direction that faces the viewer (−1 left limb … 1 right limb, as a share of 90°).
function glints(x, y, r, z0, z1, [a0, a1]) {
  const facing = Math.atan2(V[1], V[0]);
  const p = (share, z) =>
    at([
      x + r * Math.cos(facing - share * (Math.PI / 2)),
      y + r * Math.sin(facing - share * (Math.PI / 2)),
      z,
    ]);
  return k.pathOf([p(a0, z0), p(a0, z1), p(a1, z1), p(a1, z0)], true);
}

function rule() {
  const bodyShape = A.slab(
    { ...RULE, r: 0.2 },
    RULE_FOOT_H,
    RULE_TOP - RULE_FOOT_H,
    { name: "rule.body" },
    2,
  );
  const foot = S(k.slabOf(RULE_FOOT, 0, RULE_FOOT_H, P, 3, 0.6), { tone: "mid" });
  const slot = Ln(
    k.planOutline(
      { x: RULE.x - 0.4, y: RULE.y - 0.4, w: RULE.w + 0.8, d: RULE.d + 0.8, r: 0.2 },
      RULE_FOOT_H,
      P,
      2,
    ),
    { tone: "lo" },
  );
  const screws = Dots(
    [
      at([RULE_FOOT.x + 2.6, RULE_FOOT.y + 2.6, RULE_FOOT_H]),
      at([RULE_FOOT.x + RULE_FOOT.w - 2.6, RULE_FOOT.y + RULE_FOOT.d - 2.6, RULE_FOOT_H]),
    ],
    { size: 0.45 },
  );
  put("rule", [RULE_FOOT.x + RULE_FOOT.w / 2, 0, RULE_FOOT_H / 2], foot + slot + screws, {
    shapes: [record(A.slab(RULE_FOOT, 0, RULE_FOOT_H, { name: "rule.foot" }, 3))],
  });
  const z0 = RULE_FOOT_H;
  const body = k.slabOf({ ...RULE, r: 0.2 }, z0, RULE_TOP - z0, P, 2, 0.3);
  // Ticks on the face toward the viewer (+y), every centimetre down from the mouth, from the
  // rule's left edge: 5 cm and 10 cm marks longer.
  const face = RULE.y + RULE.d;
  const minor = [];
  const major = [];
  const tenth = [];
  for (let cm = 0; cm <= 100; cm++) {
    const z = Z_MOUTH - cm * U;
    const length = cm % 10 === 0 ? RULE.w : cm % 5 === 0 ? 3.6 : 2;
    (cm % 10 === 0 ? tenth : cm % 5 === 0 ? major : minor).push(
      k.segment([RULE.x, face, z], [RULE.x + length, face, z], P),
    );
  }
  // The corner between the scale face and the rule's edge, where the 10 cm marks end.
  const corner = Ln(k.segment([RULE.x + RULE.w, face, z0], [RULE.x + RULE.w, face, RULE_TOP], P), {
    tone: "faint",
  });
  const inner =
    corner +
    Ln(minor.join(""), { tone: "lo" }) +
    Ln(major.join(""), { tone: "mid" }) +
    Ln(tenth.join(""), { tone: "hi" });
  put(
    "rule",
    [RULE.x + RULE.w / 2, face, (z0 + RULE_TOP) / 2],
    `<g data-part="rule">${S(body, { tone: "mid", inner })}</g>`,
    { shapes: [record(bodyShape)] },
  );
}

function thermometer() {
  const [x, y] = THERMO;
  const start = boss("thermometer", ROD1, 240, -1);
  arm("thermometer", start, [x + 4.2, y, start[2]], 1);
  const clip = { x: x - 4.2, y: y - 3, w: 8.4, d: 6, r: 1.4 };
  const F = UP([x, y, THERMO_Z[0]]);
  const length = THERMO_Z[1] - THERMO_Z[0];
  const profile = [
    [0, 0.01, 1],
    [0.6, 1.4, 1],
    [2, 2.1, 1],
    [4, 2.2, 1],
    [6, 2.1, 1],
    [7.4, 1.4, 1],
    [8.4, 1.1],
    [length, 1.1],
  ];
  const glassShape = A.solid(
    F,
    profile.map(([s, r]) => [s, r]),
    { name: "thermometer.glass" },
  );
  put("thermometer", [x, y, 242], S(k.slabOf(clip, 238, 8, P, 3, 0.4), { tone: "mid" }), {
    shapes: [record(A.slab(clip, 238, 8, { name: "thermometer.clip" }, 3))],
  });
  const glass = G.solidOf(profile, F, P);
  const zOf = (c) => THERMO_Z[0] + 12 + ((c + 10) / 120) * (length - 20);
  const etched = [];
  for (let c = -10; c <= 110; c += 10) etched.push(G.arcOf(F, zOf(c) - THERMO_Z[0], 1.1, P));
  const thread = `<path data-live="mercury" class="iso-line rt-mercury" data-tone="hi" d="${k.segment([x, y, THERMO_Z[0] + 6], [x, y, zOf(ROOM_C)], P)}"/>`;
  put(
    "thermometer",
    [x, y, (THERMO_Z[0] + THERMO_Z[1]) / 2],
    `<g data-part="thermometer">${S(glass, { tone: "mid", className: "rt-glassy", inner: Ln(etched.join(""), { tone: "lo" }) + thread })}</g>`,
    { shapes: [record(glassShape)] },
  );
  return zOf;
}

let FORK_SHAPES = [];
function fork() {
  FORK_SHAPES = forkShapes(FORK_START);
  const start = boss("fork", ROD1, FORK_Z, 1);
  const clampX = FORK_BEND_X - 12;
  arm("fork", start, [clampX - 3, 0, start[2]]);
  const clip = { x: clampX - 3, y: -3, w: 6, d: 6, r: 1.2 };
  put(
    "fork",
    [clampX, 0, FORK_Z],
    S(k.slabOf(clip, FORK_Z - 3, 6, P, 3, 0.4), { tone: "mid" }) +
      Dots([at([clampX, 0, FORK_Z + 3])], { size: 0.45 }),
    { shapes: [record(A.slab(clip, FORK_Z - 3, 6, { name: "fork.clip" }, 3))] },
  );
  // The fork itself: stem, bend and two prongs, built live (its prongs depend on f).
  put(
    "fork",
    [FORK_BEND_X + 10, 0, FORK_Z],
    `<g data-part="fork" data-live="fork">${forkSvg(FORK_START, 0)}</g>`,
    { shapes: FORK_SHAPES.map(record) },
  );
}

function forkGeometry(f) {
  const prong = 30 * Math.sqrt(512 / f);
  const half = 2.6;
  return {
    prong,
    half,
    stem: [FORK_BEND_X - 9, FORK_BEND_X - 2],
    bend: [FORK_BEND_X - 2, FORK_BEND_X + 2],
  };
}

function forkShapes(f) {
  const g = forkGeometry(f);
  const F = ALONG([g.stem[0], 0, FORK_Z], [1, 0, 0]);
  return [
    A.disc(F, 0, g.stem[1] - g.stem[0], 1.3, { name: "fork.stem" }),
    A.box([g.bend[0], -1.2, FORK_Z - g.half - 1.2], [g.bend[1], 1.2, FORK_Z + g.half + 1.2], {
      name: "fork.bend",
    }),
    A.box(
      [g.bend[1], -1.2, FORK_Z + g.half - 1.2],
      [g.bend[1] + g.prong, 1.2, FORK_Z + g.half + 1.2],
      { name: "fork.prong" },
    ),
    A.box(
      [g.bend[1], -1.2, FORK_Z - g.half - 1.2],
      [g.bend[1] + g.prong, 1.2, FORK_Z - g.half + 1.2],
      { name: "fork.prong#2" },
    ),
  ];
}

// The fork as SVG, from the kit, so the live page can rebuild it. `swing` opens the prongs.
function forkSvg(f, swing) {
  const half = 2.6;
  const prong = 30 * Math.sqrt(512 / f);
  const bend = [FORK_BEND_X - 2, FORK_BEND_X + 2];
  const stem = [FORK_BEND_X - 9, FORK_BEND_X - 2];
  const F = G.frameAlong([stem[0], 0, FORK_Z], [1, 0, 0]);
  let svg = S(G.disc(0, stem[1] - stem[0], 1.3, F, P), { tone: "hi", crease: "none" });
  svg += S(
    k.slabOf(
      { x: bend[0], y: -1.2, w: bend[1] - bend[0], d: 2.4, r: 0.6 },
      FORK_Z - half - 1.2,
      half * 2 + 2.4,
      P,
      3,
      0.3,
    ),
    { tone: "hi" },
  );
  for (const side of [1, -1]) {
    const lift = side * swing;
    const plan = { x: bend[1], y: -1.2, w: prong, d: 2.4, r: 0.5 };
    svg += S(k.slabOf(plan, FORK_Z + side * half - 1.2 + lift, 2.4, P, 2, 0.3), {
      tone: "hi",
      lit: true,
    });
  }
  return svg;
}

function reservoirAndHose() {
  const levelZ = LEVEL(L_START);
  const tip = levelZ - RES_WATER;
  const [x, y] = RES;
  // The ring's inner top edge meets the cone where the cone is as wide as the ring's hole.
  const ringS = RES_RING_S;
  const ringZ = tip + ringS;
  const start = boss("reservoir", ROD2, ringZ - 1.2, -1, { move: [0, 0, 0] });
  const ringOut = RES_R + 1.6;
  arm("reservoir", start, [x + ringOut, y, start[2]], 1.15);
  // Retort ring: the reservoir's cone sits in it.
  const F = UP([x, y, tip]);
  const profile = [
    [RES_TIP_LIFT, 2.6],
    [RES_CONE, RES_R],
    [RES_BODY - 1.6, RES_R],
    [RES_BODY - 1.6, RES_R + 0.8],
    [RES_BODY, RES_R + 0.8],
  ];
  const vessel = A.solid(F, profile, { name: "reservoir.vessel" });
  // The retort ring in a far half and a near half, so the vessel sits between them.
  const facing = Math.atan2(V[1], V[0]);
  for (const [name, a0] of [
    ["reservoir.ring.far", facing + Math.PI / 2],
    ["reservoir.ring.near", facing - Math.PI / 2],
  ]) {
    const half = [];
    const [from, span] = name.endsWith("near")
      ? [a0 + 0.3, Math.PI - 0.6]
      : [a0 - 0.3, Math.PI + 0.6];
    for (let i = 0; i <= 36; i++)
      half.push([
        x + ringOut * Math.cos(from + (span * i) / 36),
        y + ringOut * Math.sin(from + (span * i) / 36),
      ]);
    for (let i = 36; i >= 0; i--)
      half.push([
        x + (RES_R - 1.6) * Math.cos(from + (span * i) / 36),
        y + (RES_R - 1.6) * Math.sin(from + (span * i) / 36),
      ]);
    const mid = a0 + Math.PI / 2;
    put(
      "reservoir",
      [x + RES_R * Math.cos(mid), y + RES_R * Math.sin(mid), ringZ + 0.8],
      S(k.extrude(half, ringZ, 1.6, P, { convex: false }), { tone: "mid" }),
      { shapes: [record(A.extruded(half, ringZ, 1.6, { name, seated: true, cut: vessel }))] },
    );
  }
  // The vessel: nipple, cone, body and rim, glass, with its water seen through it.
  const cone = G.solidOf(profile.slice(0, 2).concat([[RES_CONE + 0.01, RES_R]]), F, P);
  const body = k.cylinder(x, y, RES_R, tip + RES_CONE, RES_BODY - RES_CONE, P, 72);
  const water = k.cylinder(x, y, RES_R - 0.7, tip + RES_CONE, RES_WATER - RES_CONE, P, 72);
  const lip = k.cylinder(x, y, RES_R + 0.8, tip + RES_BODY - 1.6, 1.6, P, 72);
  const svg = [
    S(cone, { tone: "mid", className: "rt-glassy" }),
    `<path class="rt-glass" d="${body.fill}"/>`,
    `<path class="rt-water" d="${water.fill}"/><path class="rt-water-top" d="${water.top}"/>`,
    Ln(k.ring(x, y, RES_R - 0.7, tip + RES_WATER, P, 72), { tone: "mid" }),
    `<path class="rt-glass-edge iso-line" data-tone="mid" d="${body.outline}"/>`,
    `<path class="rt-shine" d="${glints(x, y, RES_R - 1, tip + RES_CONE + 4, tip + RES_BODY - 4, [0.6, 0.7])}"/>`,
    S(lip, { tone: "mid", className: "rt-glassy" }),
    `<path class="rt-bore" d="${k.ring(x, y, RES_R - 0.6, tip + RES_BODY, P, 72)}"/>`,
    Ln(k.ring(x, y, RES_R - 0.6, tip + RES_BODY, P, 72), { tone: "lo" }),
  ].join("");
  put("reservoir", [x, y, tip + RES_BODY / 2], `<g data-part="reservoir">${svg}</g>`, {
    shapes: [record(vessel)],
  });
  return tip;
}

// The rubber tubing from the tube's nipple, down onto the base, along it in front of both rods,
// and up to the reservoir's nipple. Rebuilt live as the reservoir moves.
function hoseRoute(resTip) {
  const [tx, ty] = TUBE;
  const [rx, ry] = RES;
  const top = [tx, ty, NIPPLE.z0 + 3];
  const points = [
    top,
    [tx, ty, 9],
    [tx - 6, HOSE_Y, HOSE_R],
    [rx + 8, HOSE_Y, HOSE_R],
    [rx, ry, Math.min(9, resTip - 4)],
    [rx, ry, resTip + RES_TIP_LIFT],
  ];
  return G.fillet(points, 7, 10, { P, tube: HOSE_R });
}

function hoseSvg(resTip) {
  const pieces = tubePieces(hoseRoute(resTip), HOSE_R, P, { maxLength: 400, spacing: 1.2 });
  return pieces.map((piece) => tubeSvg(piece, { tone: "mid" })).join("");
}

function pad() {
  const svg =
    S(k.slabOf(PAD, 0, 4.5, P, 4, 0.6), { tone: "lo" }) +
    Dots(k.dotGrid(PAD.x + 2.5, PAD.y + 2.5, 8, 4, 2.2, 4.5, P), { size: 0.35, tone: "lo" });
  put("pad", [PAD.x + PAD.w / 2, PAD.y + PAD.d / 2, 2], `<g data-part="pad">${svg}</g>`, {
    shapes: [record(A.slab(PAD, 0, 4.5, { name: "pad.rubber" }, 4))],
  });
}

// ---------------------------------------------------------------------------------------------
// Assemble.

const back = base();
const RES_BOSS_Z = LEVEL(L_START) - RES_WATER + RES_RING_S - 1.2;
rod(
  "stand",
  ROD1,
  ROD1_TOP,
  [...CLAMP_Z, 240, FORK_Z].map((z) => ({ z })),
);
rod("stand", ROD2, ROD2_TOP, [{ z: RES_BOSS_Z, live: true }]);
for (const z of CLAMP_Z) tubeClamp(z);
glassTube();
rule();
const zOf = thermometer();
fork();
const resTip0 = reservoirAndHose();
pad();
const hoseRoute0 = hoseRoute(resTip0);
R.route("hose", hoseRoute0, HOSE_R, {
  limp: true,
  piece: "reservoir",
  touch: ["tube.nipple*", "reservoir.vessel*", "stand.base*"],
});
put(
  "reservoir",
  G.pointAlong(hoseRoute0, G.pathLength(hoseRoute0) * 0.5),
  `<g data-part="hose" data-live="hose">${hoseSvg(resTip0)}</g>`,
  { shapes: [A.tube(hoseRoute0, HOSE_R, { name: "hose" })], name: "reservoir.hose" },
);
// The sound, drawn over everything above the mouth.

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P);

const PART_OF = {
  stand: "stand",
  tube: "tube",
  rule: "rule",
  thermometer: "thermometer",
  fork: "fork",
  reservoir: "reservoir",
  pad: "pad",
  sound: "sound",
};
const items = [
  ...R.items,
  { piece: "sound", name: "sound", svg: `<g data-live="sound" class="rt-sound"></g>` },
]
  .map(
    (item) =>
      `<g class="it" data-piece="${PART_OF[item.piece] ?? item.piece}"${item.piece === "reservoir" && item.name !== "reservoir.hose" ? ' data-move="reservoir"' : ""}>${item.svg}</g>`,
  )
  .join("");

// ---------------------------------------------------------------------------------------------
// The live page.

const fit = M.resonanceLengths(MODEL_TUBE, FORK_START);
const LABEL =
  "A resonance tube: a glass tube 1 m long clamped upright to a retort stand with a heavy base, with a metre rule beside it reading down from the mouth. Rubber tubing joins the foot of the tube to a glass reservoir held in a ring on a second rod; raising the reservoir raises the water in the tube. A tuning fork is clamped over the mouth, a rubber pad lies on the base and a thermometer hangs between the rods. Inside the tube, the air column's standing wave is drawn over the glass: a displacement node at the water and an antinode just above the mouth.";

const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [back, items] });

// The forks and their decay are shared with the sonometer: inline those beside the tube's model.
const sonometer = stripTypeScriptTypes(readFileSync(SONOMETER, "utf8"));
const shared = [/^export const TUNING_FORKS.*$/m, /^export function forkAmplitude[\s\S]*?^}$/m].map(
  (pattern) => sonometer.match(pattern)[0],
);
const stripped = [stripTypeScriptTypes(readFileSync(MODEL, "utf8")), ...shared]
  .join("\n")
  .replace(/^export /gm, "");
const moduleAs = (name, file, extra = "") => {
  const source = readFileSync(join(KIT, file), "utf8").replace(/^import .*$/gm, "");
  const names = [...source.matchAll(/^export (?:function|const|let|class) (\w+)/gm)].map(
    (m) => m[1],
  );
  return `const ${name} = (() => {${extra}\n${source.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();\n`;
};

const DATA = {
  P,
  V,
  tube: MODEL_TUBE,
  forks: [...TUNING_FORKS],
  forkStart: TUNING_FORKS.indexOf(FORK_START),
  L: L_START,
  range: L_RANGE,
  U,
  Z_MOUTH,
  Z_BOTTOM,
  R_IN,
  TUBE,
  RES,
  RES_WATER,
  RES_TIP_LIFT,
  NIPPLE,
  HOSE_R,
  HOSE_Y,
  FORK_Z,
  FORK_BEND_X,
  resTip0,
  H,
  ROD2,
  ROD2_TOP,
  resBossZ: RES_BOSS_Z,
  screenRise: k.screenRise(1, P),
};

const live = readFileSync(join(HERE, "live.js"), "utf8")
  .replace("__DATA__", JSON.stringify(DATA))
  .replace(
    "/*__FORK__*/",
    `const FORK_Z = ${FORK_Z}, FORK_BEND_X = ${FORK_BEND_X};\nconst S = (paths, style) => solidSvg(paths, style);\n${forkSvg.toString()}`,
  )
  .replace(
    "/*__ROD__*/",
    `const ROD_R = ${ROD_R};
${rodSvg.toString()}`,
  )
  .replace(
    "/*__HOSE__*/",
    `const HOSE_R = ${HOSE_R}, HOSE_Y = ${HOSE_Y}, TUBE = ${JSON.stringify(TUBE)}, RES = ${JSON.stringify(RES)}, NIPPLE = ${JSON.stringify(NIPPLE)}, RES_TIP_LIFT = ${RES_TIP_LIFT};\n${hoseRoute.toString()}\n${hoseSvg.toString()}`,
  );

const CSS = readFileSync(join(HERE, "resonance-tube.css"), "utf8");
const keys = [
  ["tube", "Glass tube, 1 m long, 2.0 cm inside radius"],
  ["wave", "Air column: displacement nodes and antinodes, air moving"],
  ["water", "Water surface: the closed end of the air column"],
  ["reservoir", "Reservoir on a ring, joined by rubber tubing"],
  ["fork", "Tuning fork, struck on the rubber pad"],
  ["rule", "Metre rule, zero at the mouth"],
  ["thermometer", "Thermometer, for the speed of sound"],
  ["stand", "Retort stand: base, rods, boss heads and clamps"],
];
const legend = keys
  .map(
    ([id, label]) =>
      `<button type="button" class="rt-key" data-key="${id}" aria-pressed="false">${label}</button>`,
  )
  .join("");
const v = M.speedOfSound(ROOM_C);
const e = M.endCorrection(MODEL_TUBE);
const readout = `f ${FORK_START} Hz · L ${(L_START * 100).toFixed(1)} cm · v ${v.toFixed(1)} m/s · e ${(e * 100).toFixed(1)} cm`;
const caption = `A ${FORK_START} Hz fork over a tube of 2.0 cm inside radius at ${ROOM_C} °C, where sound travels at ${v.toFixed(1)} m/s. The air column, closed by the water and open at the mouth, is loudest when L + e is an odd number of quarter wavelengths, with the end correction e = 0.6r = ${(e * 100).toFixed(1)} cm: here at L = ${fit.map((l) => (l * 100).toFixed(1)).join(" cm and ")} cm. The water surface is always a displacement node, and the antinode sits ${(e * 100).toFixed(1)} cm above the mouth.`;

const stage = `<div class="rt-stage" tabindex="0" role="slider" aria-label="Resonance tube: up and down arrow keys raise and lower the reservoir; left and right change the fork; space strikes it" aria-valuemin="${Math.round(L_RANGE[0] * 100)}" aria-valuemax="${Math.round(L_RANGE[1] * 100)}" aria-valuenow="${Math.round(L_START * 100)}" aria-valuetext="${readout}"><span class="rt-said" aria-live="polite"></span>${svg}</div>`;
const body = `<figure class="iso-figure rt"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Resonance tube</span><span class="iso-plate-corner" data-corner="hint">Drag to move the reservoir</span><span class="iso-plate-corner" data-corner="readout" data-readout>${readout}</span></div>${stage}</div><figcaption class="iso-legend"><span class="rt-keys">${legend}</span><span class="iso-caption" data-caption>${caption}</span></figcaption></figure>`;

const script =
  kitScript() +
  moduleAs("G", "lathe.mjs") +
  moduleAs("TUBE_KIT", "tube.mjs") +
  `const { tubePieces, tubeSvg } = TUBE_KIT;\n` +
  `const MODEL = (() => {\n${stripped}\nreturn { speedOfSound, endCorrection, wavelength, resonanceLength, resonanceLengths, loudness, loudnessDb, forkAmplitude, FORK_TAU, standingWave, airAt, TUNING_FORKS };\n})();\n` +
  live;
const out = theme === "light" ? "resonance-tube-light.html" : "resonance-tube.html";
writeFileSync(
  join(HERE, out),
  k.pageHtml({
    title: "Resonance tube",
    theme,
    body: `<style>${CSS}</style>${body}`,
    script,
    width: 680,
  }),
);
console.log("wrote", out, `(${R.items.length} items)`);
void zOf;
