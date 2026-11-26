// The Helmholtz resonator, drawn with the Anatomy kit: a round-bottom flask clamped by the neck on a
// retort stand, sitting in a cork ring, part filled with water; a measuring cylinder holding the
// rest of the water; a sound-level meter whose microphone listens at the mouth; a loudspeaker on a
// boss arm aimed at the mouth; and a bench signal generator driving it through two leads.
//
//   node build.mjs            writes helmholtz.html (dark)
//   node build.mjs --light    writes helmholtz-light.html
//   node build.mjs --audit    also proves the geometry (kit/audit.mjs)
//
// World units are millimetres, z up, bench top at z = 0. Every size the physics depends on (the
// bulb, the neck, the water level, the frequency) comes from packages/physics/src/helmholtz.ts.

import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import { kitScript } from "../../kit/scripts/inline-kit.mjs";
import * as H from "../../../physics/src/helmholtz.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "../../kit");
const PHYSICS = join(HERE, "../../../physics/src/helmholtz.ts");
const THEME = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- the physics this drawing shows
const FLASK = H.ROUND_BOTTOM_FLASK;
const ROOM_C = 28;
const DRIVE_PA = 0.5;
const WATER0 = 150; // cm³ in the flask at rest
const SUPPLY = 500; // cm³: the measuring cylinder starts full and holds what is not in the flask
const WATER_MAX = 450;
const F_RANGE = [100, 600];
const state = (cm3) => ({ waterVolume: cm3 * 1e-6, temperatureC: ROOM_C });
const F0 = H.resonantFrequency(FLASK, state(WATER0));
if (F0 === null) throw new Error("the rest state has no resonance");

// ---------------------------------------------------------------- layout, mm
const W = 900;
const HGT = 610;
const AZ = 35;
const EL = 28;

const BENCH = { x: -160, y: -392, w: 330, d: 652, r: 3 };
const BENCH_H = 22;

const RI = H.bulbRadius(FLASK) * 1000; // inner bulb radius from V₀
const GLASS = 1.6;
const RO = RI + GLASS;
const NR = FLASK.neckRadius * 1000;
const NO = NR + 2;
const NL = FLASK.neckLength * 1000;
const FA = [-5, -10]; // flask axis
const BASE = { x: -150, y: -78, w: 205, d: 136, r: 5 };
const BASE_H = 12;
const CORK = { z0: BASE_H, z1: BASE_H + 12, rIn: 28, rOut: 44 };
const ZC = CORK.z1 + Math.sqrt(RO * RO - CORK.rIn * CORK.rIn); // the bulb rests on the cork's inner rim
const Z_BOTTOM = ZC - RI; // inside bottom of the bulb
const Z_JOIN = ZC + Math.sqrt(RO * RO - NO * NO); // outer neck meets outer bulb
const Z_NECK = ZC + Math.sqrt(RI * RI - NR * NR); // inner neck starts
const Z_TOP = Z_NECK + NL; // mouth
const LIP = 3.5;
const CLAMP = { z0: Z_JOIN + 26, z1: Z_JOIN + 36, cork: 1.6, steel: 4 };
const ROD = [-122, -10];
const ROD_R = 6.5;
const ROD_TOP = 334;
const BOSS1 = { z0: (CLAMP.z0 + CLAMP.z1) / 2 - 12, z1: (CLAMP.z0 + CLAMP.z1) / 2 + 12 };
const ARM_R = 4.5;
const ARM_Z = (CLAMP.z0 + CLAMP.z1) / 2;

const MOUTH = [FA[0], FA[1], Z_TOP];
const CS = [-52, -76, 232]; // loudspeaker centre
const SA = G.unit3(G.sub3([MOUTH[0], MOUTH[1], MOUTH[2] + 4], CS)); // its axis, at the mouth
const SU = G.unit3([SA[1], -SA[0], 0]); // trunnion axis, level
const SPK = { r: 30, back: -22, magnet: 13 };
const YOKE_Z = CS[2] + SPK.r + 9;
const BOSS2 = { z0: YOKE_Z + 8, z1: YOKE_Z + 32 };
const ARM2_Z = (BOSS2.z0 + BOSS2.z1) / 2;
const ARM2_DIR = G.unit3([CS[0] - ROD[0], CS[1] - ROD[1], 0]);
const ARM2_DEG = Math.atan2(ARM2_DIR[1], ARM2_DIR[0]) / DEG;

const GEN = { x: -40, y: -386, w: 180, d: 220, r: 4 };
const GEN_FOOT = 6;
const GEN_TOP = 116;
const PANEL_X = GEN.x + GEN.w; // front panel plane, normal +x
const PANEL_Y0 = GEN.y + GEN.d; // panel's left edge on screen; panel u runs toward −y
const panel = (u, v, out = 0) => [PANEL_X + out, PANEL_Y0 - u, GEN_TOP - v];

const CYL = { at: [10, 196], rIn: 25.4, rOut: 27.2, z0: 9, floor: 13, top: 292 };
const ML = 1000 / (Math.PI * CYL.rIn * CYL.rIn); // mm of column per cm³
const METER = { x: -40, y: -150, w: 36, d: 52, r: 6, z0: 6, z1: 104 };

const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H, 0),
    [ROD[0], ROD[1], ROD_TOP + 4],
    [CYL.at[0], CYL.at[1] + 30, CYL.top + 4],
    [CS[0], CS[1], YOKE_Z + 40],
  ],
  W,
  HGT,
  { pad: 22, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (pts, style) => k.dotsSvg(pts, style);
const vert = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const FF = vert(FA[0], FA[1]);
const along = (o, a) => G.frameAlong(o, a);
const FADE = [0.04, 0.42];

// ---------------------------------------------------------------- recorder
const R = A.recorder(P);
const record = R.solid;
function put(piece, ref, svg, shapes = [], { bias = 0, name, tube = false } = {}) {
  if (!tube) shapes.forEach(record);
  R.put({
    piece,
    at: ref,
    bias,
    svg,
    shapes,
    name: R.nameFor(name ?? shapes[0]?.name ?? `${piece}.item`),
  });
}
const own = (piece, extra = {}) => ({ owner: piece, ...extra });

function cable(piece, route, r, { name, tone = "hi", bias = 0 } = {}) {
  const id = R.nameFor(name ?? `${piece}.cable`);
  R.route(id, route, r, { owner: id, limp: true, piece });
  tubePieces(route, r, P, { maxLength: 22, spacing: 1.6 }).forEach((part, index) =>
    put(
      piece,
      part.mid,
      tubeSvg(part, { tone }),
      [A.tube(part.points, part.radii, { name: `${id}:${index}`, limp: true, owner: id })],
      { bias, name: `${id}:${index}`, tube: true },
    ),
  );
}

// ---------------------------------------------------------------- bench
{
  const top = k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 3, 1.2);
  const seams = [-105, -35, 35, 105]
    .map((x) => k.lineOnTop([x, BENCH.y], [x, BENCH.y + BENCH.d], 0, P))
    .join("");
  const sideSeam = k.sideSeam(BENCH, -6, P, 3);
  put(
    "bench",
    [0, 0, -BENCH_H],
    `<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H, BENCH_H, P)}"/>` +
      S(top, { tone: "lo", inner: Ln(sideSeam, { tone: "faint" }) }) +
      Ln(seams, { tone: "faint" }),
    [A.slab(BENCH, -BENCH_H, BENCH_H, { name: "bench.top", ground: true }, 3)],
    { bias: -1e4 },
  );
}

// ---------------------------------------------------------------- retort stand
{
  const base = k.slabOf(BASE, 0, BASE_H, P, 5, 1);
  const groove = k.planOutline(k.insetPlan(BASE, 7), BASE_H, P, 5);
  const screws = k.corners(BASE, 11);
  put(
    "stand",
    [BASE.x + BASE.w / 2, BASE.y + BASE.d / 2, BASE_H / 2],
    S(base, { tone: "mid" }) +
      Ln(groove, { tone: "lo" }) +
      Ln(screws.map(([x, y]) => k.ring(x, y, 2.4, BASE_H, P, 16)).join(""), { tone: "lo" }) +
      Dots(
        screws.map(([x, y]) => at([x, y, BASE_H])),
        { size: 0.5 },
      ),
    [A.slab(BASE, 0, BASE_H, own("stand", { name: "stand.base" }), 5)],
    { bias: -50 },
  );
  // rod collar, rod in pieces between the bosses, cap
  const RF = vert(ROD[0], ROD[1]);
  put(
    "stand",
    [ROD[0], ROD[1], BASE_H + 5],
    S(k.cylinder(ROD[0], ROD[1], 11, BASE_H, 10, P, 40, 0.6), { tone: "mid" }) +
      Dots([at([ROD[0] + 11 * Math.cos(AZ * DEG), ROD[1] + 11 * Math.sin(AZ * DEG), BASE_H + 5])], {
        size: 0.7,
        tone: "mid",
      }),
    [A.cylinder(ROD[0], ROD[1], 11, BASE_H, 10, own("stand", { name: "stand.collar" }))],
  );
  const rodPiece = (z0, z1, tag) =>
    put(
      "stand",
      [ROD[0], ROD[1], (z0 + z1) / 2],
      S(k.cylinder(ROD[0], ROD[1], ROD_R, z0, z1 - z0, P, 32), { tone: "mid", crease: "none" }) +
        Ln(G.arcOf(RF, z0 + 0.01, ROD_R, P), { tone: "lo" }),
      [A.cylinder(ROD[0], ROD[1], ROD_R, z0, z1 - z0, own("stand", { name: `stand.rod.${tag}` }))],
    );
  rodPiece(BASE_H + 10, BOSS1.z0, "low");
  rodPiece(BOSS1.z1, BOSS2.z0, "mid");
  rodPiece(BOSS2.z1, ROD_TOP, "top");
  put(
    "stand",
    [ROD[0], ROD[1], ROD_TOP + 1],
    S(
      G.solidOf(
        [
          [ROD_TOP, ROD_R + 0.6],
          [ROD_TOP + 2.4, ROD_R + 0.6],
          [ROD_TOP + 3.4, ROD_R - 1, 1],
          [ROD_TOP + 3.6, 0, 1],
        ],
        RF,
        P,
      ),
      { tone: "mid" },
    ),
    [A.disc(RF, ROD_TOP, ROD_TOP + 3.6, ROD_R + 0.6, own("stand", { name: "stand.cap" }))],
  );

  // a boss head turned to angle `deg` on the rod, with a thumb screw on its far side from the arm
  function boss(z0, z1, deg, tag) {
    const c = Math.cos(deg * DEG);
    const s = Math.sin(deg * DEG);
    const half = 12;
    const ring = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ].map(([x, y]) => [ROD[0] + x * c - y * s, ROD[1] + x * s + y * c]);
    const block = k.extrude(ring, z0, z1 - z0, P, { bevel: 0.6 });
    const zm = (z0 + z1) / 2;
    // thumb screw on the side facing the viewer most, perpendicular to the arm
    const side = [-s, c, 0];
    const sign = G.dot3(side, V) > 0 ? 1 : -1;
    const n = G.mul3(side, sign);
    const face = [ROD[0] + n[0] * half, ROD[1] + n[1] * half, zm];
    const neck = along(face, n);
    const lines = Ln(k.ringSeam ? k.ringSeam(ring, zm + 7, P) : "", { tone: "faint" });
    put("stand", [ROD[0], ROD[1], zm], S(block, { tone: "mid", inner: lines }), [
      A.extruded(ring, z0, z1 - z0, own("stand", { name: `stand.boss.${tag}` })),
    ]);
    const screw = G.disc(0, 4, 2.6, neck, P);
    const head = G.disc(4, 11, 6, neck, P);
    const knurl = G.ribsOf(neck, 4, 11, 6, 28, P, { fade: [0.1, 0.55], seams: true });
    put(
      "stand",
      G.add3(face, G.mul3(n, 7)),
      S(screw, { tone: "mid" }) +
        S(head, { tone: "mid", inner: k.fadedSvg(knurl, { tone: "lo" }) }),
      [
        A.disc(neck, 0, 4, 2.6, own("stand", { name: `stand.screw.${tag}` })),
        A.disc(neck, 4, 11, 6, own("stand", { name: `stand.screwhead.${tag}` })),
      ],
    );
    return { c, s, half, zm };
  }

  // the neck clamp: boss, arm along +x, a split ring lined with cork, its ears and wing screw
  const b1 = boss(BOSS1.z0, BOSS1.z1, 0, "clamp");
  const armFrom = ROD[0] + b1.half;
  const ringOut = NO + CLAMP.cork + CLAMP.steel;
  const lugX = FA[0] - ringOut - 7;
  const AF = along([armFrom, ROD[1], ARM_Z], [1, 0, 0]);
  put(
    "stand",
    [(armFrom + lugX) / 2, ROD[1], ARM_Z],
    S(G.disc(0, lugX - armFrom, ARM_R, AF, P), { tone: "mid" }),
    [A.disc(AF, 0, lugX - armFrom, ARM_R, own("stand", { name: "stand.arm" }))],
  );
  const lug = { x: lugX, y: ROD[1] - 7, w: FA[0] - lugX - ringOut + 1.2, d: 14, r: 1.2 };
  put(
    "stand",
    [lugX + 4, ROD[1], ARM_Z],
    S(k.slabOf(lug, CLAMP.z0, CLAMP.z1 - CLAMP.z0, P, 2, 0.4), { tone: "mid" }) +
      Dots([at([lugX + 3, ROD[1] - 3.5, CLAMP.z1]), at([lugX + 3, ROD[1] + 3.5, CLAMP.z1])], {
        size: 0.45,
      }),
    [A.slab(lug, CLAMP.z0, CLAMP.z1 - CLAMP.z0, own("stand", { name: "stand.lug" }), 2)],
  );
  const CF = FF;
  const steel = G.ringBand(CLAMP.z0, CLAMP.z1, NO, ringOut, CF, P);
  CLAMP.sides = steel.shades.filter(Boolean).join("");
  const lining = Ln(G.circleOf(CF, CLAMP.z1, NO + CLAMP.cork, P), { tone: "lo" });
  put(
    "stand",
    [FA[0], FA[1], CLAMP.z0 + 5],
    S(steel, {
      tone: "mid",
      inner: Ln(G.arcOf(CF, (CLAMP.z0 + CLAMP.z1) / 2, ringOut, P), { tone: "faint" }),
    }) + lining,
    [A.ring(CF, CLAMP.z0, CLAMP.z1, NO, ringOut, own("stand", { name: "stand.clamp.ring" }))],
  );
  // ears on the +x side and the wing screw through them along y
  const earX = FA[0] + ringOut - 1;
  for (const dy of [-1, 1]) {
    const ear = { x: earX, y: FA[1] + dy * 2.2 - (dy < 0 ? 4 : 0), w: 9, d: 4, r: 0.8 };
    put(
      "stand",
      [earX + 4.5, ear.y + 2, ARM_Z],
      S(k.slabOf(ear, CLAMP.z0, CLAMP.z1 - CLAMP.z0, P, 2, 0.3), { tone: "mid" }),
      [A.slab(ear, CLAMP.z0, CLAMP.z1 - CLAMP.z0, own("stand", { name: "stand.clamp.ear" }), 2)],
    );
  }
  const wingAt = [earX + 5, FA[1] + 6.2, ARM_Z];
  const WF = along(wingAt, [0, 1, 0]);
  put(
    "stand",
    G.add3(wingAt, [0, 4, 0]),
    S(G.disc(0, 6, 1.8, WF, P), { tone: "mid" }) + S(G.disc(6, 9, 3.6, WF, P), { tone: "mid" }),
    [
      A.disc(WF, 0, 6, 1.8, own("stand", { name: "stand.clamp.screw" })),
      A.disc(WF, 6, 9, 3.6, own("stand", { name: "stand.clamp.nut" })),
    ],
  );
  const wingF = along(G.add3(wingAt, [0, 10.2, 0]), [0, 1, 0]);
  put(
    "stand",
    G.add3(wingAt, [0, 10.2, 0]),
    S(
      G.prismOf(
        wingF,
        [
          [-1, -9],
          [1, -9],
          [1, 9],
          [-1, 9],
        ],
        -1.2,
        1.2,
        P,
      ),
      { tone: "mid" },
    ),
    [
      A.prism(
        wingF,
        [
          [-1, -9],
          [1, -9],
          [1, 9],
          [-1, 9],
        ],
        -1.2,
        1.2,
        own("stand", { name: "stand.clamp.wing" }),
      ),
    ],
  );

  // the loudspeaker's boss, arm, swivel block, stem and yoke
  const b2 = boss(BOSS2.z0, BOSS2.z1, ARM2_DEG, "speaker");
  const armStart = [ROD[0] + ARM2_DIR[0] * b2.half, ROD[1] + ARM2_DIR[1] * b2.half, ARM2_Z];
  const reach = Math.hypot(CS[0] - ROD[0], CS[1] - ROD[1]) - b2.half - 7;
  const A2 = along(armStart, ARM2_DIR);
  put(
    "stand",
    G.add3(armStart, G.mul3(ARM2_DIR, reach / 2)),
    S(G.disc(0, reach, ARM_R, A2, P), { tone: "mid" }),
    [A.disc(A2, 0, reach, ARM_R, own("stand", { name: "stand.arm2" }))],
  );
  const c2 = Math.cos(ARM2_DEG * DEG);
  const s2 = Math.sin(ARM2_DEG * DEG);
  const swivel = [
    [-7, -7],
    [7, -7],
    [7, 7],
    [-7, 7],
  ].map(([x, y]) => [CS[0] + x * c2 - y * s2, CS[1] + x * s2 + y * c2]);
  put(
    "stand",
    [CS[0], CS[1], ARM2_Z],
    S(k.extrude(swivel, ARM2_Z - 7, 14, P, { bevel: 0.4 }), { tone: "mid" }) +
      Dots([at([CS[0], CS[1], ARM2_Z + 7])], { size: 0.7, tone: "mid" }),
    [A.extruded(swivel, ARM2_Z - 7, 14, own("stand", { name: "stand.swivel" }))],
  );
  const stemTop = ARM2_Z - 7;
  const stemBottom = YOKE_Z + 3;
  put(
    "stand",
    [CS[0], CS[1], (stemTop + stemBottom) / 2],
    S(k.cylinder(CS[0], CS[1], 3.5, stemBottom, stemTop - stemBottom, P, 24), { tone: "mid" }),
    [
      A.cylinder(
        CS[0],
        CS[1],
        3.5,
        stemBottom,
        stemTop - stemBottom,
        own("stand", { name: "stand.stem" }),
      ),
    ],
  );
  const reachU = SPK.r + 5;
  const YC = G.add3(CS, G.mul3(SA, -9));
  const YF = G.frameOf([YC[0], YC[1], YOKE_Z], SU, [0, 0, 1], G.cross3(SU, [0, 0, 1]));
  const bar = [
    [-3, -3],
    [3, -3],
    [3, 3],
    [-3, 3],
  ];
  put(
    "stand",
    [CS[0], CS[1], YOKE_Z],
    S(G.prismOf(YF, bar, -reachU - 3, reachU + 3, P), { tone: "mid" }),
    [A.prism(YF, bar, -reachU - 3, reachU + 3, own("stand", { name: "stand.yoke" }))],
  );
  const PV = G.add3(CS, G.mul3(SA, -9)); // trunnion pivot, behind the baffle
  for (const side of [-1, 1]) {
    const foot = G.add3(PV, G.mul3(SU, side * reachU));
    const SF = G.frameOf([foot[0], foot[1], PV[2] - 4], [0, 0, 1], SU, G.cross3([0, 0, 1], SU));
    const strap = [
      [-3, -2.6],
      [3, -2.6],
      [3, 2.6],
      [-3, 2.6],
    ];
    put(
      "stand",
      [foot[0], foot[1], (PV[2] + YOKE_Z) / 2],
      S(G.prismOf(SF, strap, 0, YOKE_Z - 3 - (PV[2] - 4), P), { tone: "mid" }),
      [A.prism(SF, strap, 0, YOKE_Z - 3 - (PV[2] - 4), own("stand", { name: "stand.strap" }))],
    );
    const TF = along(G.add3(PV, G.mul3(SU, side * SPK.r)), G.mul3(SU, side));
    put(
      "stand",
      G.add3(PV, G.mul3(SU, side * (SPK.r + 1))),
      S(G.disc(0, 2, 3, TF, P), { tone: "mid" }),
      [A.disc(TF, 0, 2, 3, own("stand", { name: "stand.trunnion" }))],
    );
    put(
      "stand",
      G.add3(PV, G.mul3(SU, side * (SPK.r + 10.5))),
      S(G.disc(8, 13, 5.5, TF, P), {
        tone: "mid",
        inner: k.fadedSvg(G.ribsOf(TF, 8, 13, 5.5, 22, P, { fade: [0.1, 0.55], seams: true }), {
          tone: "lo",
        }),
      }),
      [A.disc(TF, 8, 13, 5.5, own("stand", { name: "stand.trunnion.knob" }))],
    );
  }
}

// ---------------------------------------------------------------- cork ring
{
  const cork = G.ringBand(CORK.z0, CORK.z1, CORK.rIn, CORK.rOut, FF, P, { bevel: 0.4 });
  const pores = [];
  for (let i = 0; i < 46; i++) {
    const a = (i * 137.5 * DEG) % (2 * Math.PI);
    const rr = CORK.rIn + 3 + ((i * 7.3) % (CORK.rOut - CORK.rIn - 6));
    pores.push(at([FA[0] + rr * Math.cos(a), FA[1] + rr * Math.sin(a), CORK.z1]));
  }
  put(
    "cork",
    [FA[0], FA[1], CORK.z0 + 6],
    S(cork, { tone: "lo" }) + Dots(pores, { size: 0.42, tone: "lo" }),
    [A.ring(FF, CORK.z0, CORK.z1, CORK.rIn, CORK.rOut, own("cork", { name: "cork.ring" }))],
  );
}

// ---------------------------------------------------------------- the flask
const sphereR = (r0) => (s) => Math.sqrt(Math.max(0, r0 * r0 - (s - ZC) * (s - ZC)));
const sphereSlope = (r0) => (s) => {
  const r = sphereR(r0)(s);
  return r < 1e-6 ? 0 : -(s - ZC) / r;
};
function capProfile(r0, s0, s1, n = 28) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    // cluster knots near the poles, where the radius changes fastest
    const t = (1 - Math.cos((i / n) * Math.PI)) / 2;
    const s = s0 + (s1 - s0) * t;
    out.push([s, sphereR(r0)(s), 1]);
  }
  return out;
}
function waterPaths(cm3) {
  const depth = H.waterDepth(FLASK, cm3 * 1e-6);
  if (!depth || depth * 1000 < 0.4) return null;
  const s1 = Z_BOTTOM + depth * 1000;
  return G.solidOf(capProfile(RI, Z_BOTTOM + 0.02, s1), FF, P, {
    smooth: { slope: sphereSlope(RI), radius: sphereR(RI) },
  });
}
{
  // the pressure tint (the bulb's air as a spring) sits behind the water and the glass
  const c = at([FA[0], FA[1], ZC]);
  const tint = `<g class="hz-layer" data-layer><circle class="hz-tint" data-tint cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(RI * KS - 0.6).toFixed(1)}"/></g>`;
  const water = waterPaths(WATER0);
  const zs = Z_BOTTOM + H.waterDepth(FLASK, WATER0 * 1e-6) * 1000;
  put(
    "water",
    [FA[0], FA[1], Z_BOTTOM + 10],
    tint + `<g data-water>${S(water, { tone: "mid", className: "hz-water" })}</g>`,
    [
      A.solid(FF, capProfile(RI, Z_BOTTOM + 0.02, zs, 12), {
        name: "water.body",
        owner: "flask",
        radius: sphereR(RI),
      }),
      A.ball([FA[0], FA[1], ZC], RI - 0.6, { name: "water.air", owner: "flask" }),
    ],
  );

  const bulbProfile = capProfile(RO, ZC - RO + 0.02, Z_JOIN, 32);
  const bulb = G.solidOf(bulbProfile, FF, P, {
    smooth: { slope: sphereSlope(RO), radius: sphereR(RO) },
  });
  put("flask", [FA[0], FA[1], ZC], S(bulb, { tone: "hi", className: "hz-glass" }), [
    A.solid(FF, bulbProfile, { name: "flask.bulb", owner: "flask", radius: sphereR(RO) }),
  ]);

  const neckLow = G.ringBand(Z_JOIN - 0.6, CLAMP.z0, NR, NO, FF, P);
  put(
    "flask",
    [FA[0], FA[1], (Z_JOIN + CLAMP.z0) / 2],
    S(neckLow, { tone: "hi", className: "hz-glass" }),
    [A.ring(FF, Z_JOIN - 0.6, CLAMP.z0, NR, NO, { name: "flask.neck.low", owner: "flask" })],
  );
  const neckHigh = G.ringBand(CLAMP.z1, Z_TOP - LIP, NR, NO, FF, P);
  put(
    "flask",
    [FA[0], FA[1], (CLAMP.z1 + Z_TOP) / 2],
    S(neckHigh, { tone: "hi", className: "hz-glass" }),
    [A.ring(FF, CLAMP.z1, Z_TOP - LIP, NR, NO, { name: "flask.neck.high", owner: "flask" })],
  );
  const lip = G.lathe(
    [
      [Z_TOP - LIP, NR],
      [Z_TOP - LIP, NO],
      [Z_TOP - LIP + 0.8, NO + 1.6, 1],
      [Z_TOP - 0.8, NO + 1.6, 1],
      [Z_TOP, NO],
      [Z_TOP, NR],
    ],
    FF,
    P,
  );
  put(
    "flask",
    [FA[0], FA[1], Z_TOP - 1],
    S(lip, { tone: "hi", className: "hz-glass" }),
    [A.ring(FF, Z_TOP - LIP, Z_TOP, NR, NO + 1.6, { name: "flask.lip", owner: "flask" })],
    { bias: 0.2 },
  );

  // the plug of air in the neck: a column of dots with lit rings at its ends, moved by the live code
  const dots = [];
  for (let z = Z_NECK + 3; z <= Z_TOP - 3; z += 5.4) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 2 * Math.PI + z * 0.7;
      const rr = i % 2 ? NR * 0.62 : NR * 0.3;
      dots.push(at([FA[0] + rr * Math.cos(a), FA[1] + rr * Math.sin(a), z]));
    }
  }
  const ends = Ln(G.circleOf(FF, Z_NECK, NR - 0.8, P) + G.circleOf(FF, Z_TOP, NR - 0.8, P), {
    tone: "lit",
    className: "hz-plug-ring",
  });
  put(
    "flask",
    [FA[0], FA[1], Z_TOP + 1],
    `<mask id="hz-clamp-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${HGT}"><rect width="${W}" height="${HGT}" fill="#fff"/><path d="${CLAMP.sides}" fill="#000"/></mask><g class="hz-layer" data-layer mask="url(#hz-clamp-mask)"><g data-plug>${Dots(dots, { size: 0.75, tone: "hi" })}${ends}</g></g>`,
    [A.disc(FF, Z_NECK, Z_TOP, NR - 0.8, { name: "flask.plug", owner: "flask" })],
  );
}

// ---------------------------------------------------------------- the measuring cylinder
const cylinderWater = (cm3) => {
  const h = Math.max(0.2, cm3 * ML);
  return k.cylinder(CYL.at[0], CYL.at[1], CYL.rIn - 0.2, CYL.floor, h, P, 72);
};
{
  const [cx, cy] = CYL.at;
  const hex = (r, rot = 0) =>
    Array.from({ length: 6 }, (_, i) => [
      cx + r * Math.cos((i * 60 + rot) * DEG),
      cy + r * Math.sin((i * 60 + rot) * DEG),
    ]);
  put("cylinder", [cx, cy, 2], S(k.extrude(hex(46, 0), 0, 5, P, { bevel: 0.6 }), { tone: "mid" }), [
    A.extruded(hex(46, 0), 0, 5, own("cylinder", { name: "cylinder.foot" })),
  ]);
  put(
    "cylinder",
    [cx, cy, 7],
    S(k.extrude(hex(36, 0), 5, CYL.z0 - 5, P, { bevel: 0.4 }), { tone: "mid" }),
    [A.extruded(hex(36, 0), 5, CYL.z0 - 5, own("cylinder", { name: "cylinder.boss" }))],
  );
  const CF = vert(cx, cy);
  const remaining = SUPPLY - WATER0;
  put(
    "cylinder",
    [cx, cy, CYL.floor + 5],
    `<g data-cylwater>${S(cylinderWater(remaining), { tone: "mid", className: "hz-water" })}</g>`,
    [
      A.cylinder(cx, cy, CYL.rIn - 0.2, CYL.floor, remaining * ML, {
        name: "cylinder.water",
        owner: "cylinder",
      }),
    ],
  );
  put(
    "cylinder",
    [cx, cy, CYL.z0 + 2],
    S(G.disc(CYL.z0, CYL.floor, CYL.rOut, CF, P), { tone: "hi", className: "hz-glass" }),
    [A.disc(CF, CYL.z0, CYL.floor, CYL.rOut, own("cylinder", { name: "cylinder.floor" }))],
    { bias: -0.5 },
  );
  // graduations every 10 cm³, longer every 50, printed on the side that faces the viewer
  const facing = G.angleToward(CF, V);
  const minor = [];
  const major = [];
  for (let ml = 10; ml <= SUPPLY; ml += 10) {
    const z = CYL.floor + ml * ML;
    const big = ml % 50 === 0;
    const arc = G.arcOf(CF, z, CYL.rOut + 0.05, P, {
      from: facing - (big ? 0.42 : 0.2),
      to: facing + (big ? 0.12 : 0.04),
      trim: 0,
    });
    (big ? major : minor).push(arc);
  }
  const tubeGlass = G.ringBand(CYL.floor, CYL.top - 3, CYL.rIn, CYL.rOut, CF, P);
  put(
    "cylinder",
    [cx, cy, (CYL.floor + CYL.top) / 2],
    S(tubeGlass, { tone: "hi", className: "hz-glass" }) +
      Ln(minor.join(""), { tone: "lo", free: true }) +
      Ln(major.join(""), { tone: "mid", free: true }),
    [
      A.ring(
        CF,
        CYL.floor,
        CYL.top - 3,
        CYL.rIn,
        CYL.rOut,
        own("cylinder", { name: "cylinder.tube" }),
      ),
    ],
  );
  const rim = G.lathe(
    [
      [CYL.top - 3, CYL.rIn],
      [CYL.top - 3, CYL.rOut + 1.6],
      [CYL.top, CYL.rOut + 1.6],
      [CYL.top, CYL.rIn],
    ],
    CF,
    P,
  );
  put(
    "cylinder",
    [cx, cy, CYL.top - 1],
    S(rim, { tone: "hi", className: "hz-glass" }),
    [
      A.ring(
        CF,
        CYL.top - 3,
        CYL.top,
        CYL.rIn,
        CYL.rOut + 1.6,
        own("cylinder", { name: "cylinder.rim" }),
      ),
    ],
    { bias: 0.2 },
  );
}

// ---------------------------------------------------------------- the sound-level meter
const METER_FACE = { x: METER.x + METER.w, yc: METER.y + METER.d / 2, zc: 66, r: 16 };
{
  const foot = { x: METER.x - 6, y: METER.y - 6, w: METER.w + 12, d: METER.d + 12, r: 4 };
  put(
    "meter",
    [METER.x + METER.w / 2, METER.y + METER.d / 2, 3],
    S(k.slabOf(foot, 0, METER.z0, P, 4, 0.6), { tone: "lo" }),
    [A.slab(foot, 0, METER.z0, own("meter", { name: "meter.foot" }), 4)],
  );
  const body = k.slabOf(METER, METER.z0, METER.z1 - METER.z0, P, 6, 0.8);
  const seam = k.sideSeam(METER, METER.z0 + 18, P, 6);
  // buttons on the face below the dial
  const btns = [];
  for (const [u, z] of [
    [-9, 30],
    [0, 30],
    [9, 30],
  ]) {
    const F = along([METER_FACE.x, METER_FACE.yc - u, z], [1, 0, 0]);
    btns.push(S(G.disc(0, 1.6, 2.8, F, P), { tone: "mid" }));
  }
  put(
    "meter",
    [METER.x + METER.w / 2, METER.y + METER.d / 2, 55],
    S(body, { tone: "mid", inner: Ln(seam, { tone: "faint" }) }) + btns.join(""),
    [A.slab(METER, METER.z0, METER.z1 - METER.z0, own("meter", { name: "meter.body" }), 6)],
  );
  // the dial: window recess, scale ticks over 90°, a needle the live code turns
  const m = k.sideMatrix([METER_FACE.x + 0.4, METER_FACE.yc], METER_FACE.zc, P, "right");
  const r = METER_FACE.r;
  const ticks = [];
  for (let i = 0; i <= 30; i++) {
    const a = (-45 + i * 3) * DEG;
    const big = i % 5 === 0;
    const r0 = r - 3.5;
    const r1 = r0 + (big ? 3.2 : 1.8);
    ticks.push(
      `M${(r0 * Math.sin(a)).toFixed(2)} ${(8 - r0 * Math.cos(a)).toFixed(2)}L${(r1 * Math.sin(a)).toFixed(2)} ${(8 - r1 * Math.cos(a)).toFixed(2)}`,
    );
  }
  const scaleArc = `M${((r - 3.5) * Math.sin(-45 * DEG)).toFixed(2)} ${(8 - (r - 3.5) * Math.cos(-45 * DEG)).toFixed(2)}A${r - 3.5} ${r - 3.5} 0 0 1 ${((r - 3.5) * Math.sin(45 * DEG)).toFixed(2)} ${(8 - (r - 3.5) * Math.cos(45 * DEG)).toFixed(2)}`;
  const dial =
    `<g transform="${m}">` +
    `<rect class="hz-window" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r - 4}"/>` +
    `<path class="iso-line" data-tone="mid" d="${scaleArc}"/>` +
    `<path class="iso-line" data-tone="lo" d="${ticks.join("")}"/>` +
    `<path class="iso-line" data-tone="hi" data-needle data-free="end" d="M0 8L0 ${(8 - r + 2.5).toFixed(2)}" style="stroke-width:.9"/>` +
    `<circle class="hz-hub" cx="0" cy="8" r="1.6"/>` +
    `</g>`;
  put("meter", [METER_FACE.x + 0.2, METER_FACE.yc, METER_FACE.zc], dial, [
    A.box(
      [METER_FACE.x + 0.05, METER_FACE.yc - r, METER_FACE.zc - r],
      [METER_FACE.x + 0.4, METER_FACE.yc + r, METER_FACE.zc + r - 4],
      own("meter", { name: "meter.dial" }),
    ),
  ]);
  // microphone on a boom aimed at the mouth
  const top = [METER.x + METER.w / 2, METER.y + METER.d / 2, METER.z1];
  const toward = G.unit3(G.sub3(MOUTH, top));
  const MF = along(top, toward);
  const boom = 58;
  put(
    "meter",
    [top[0], top[1], top[2] + 4],
    S(k.cylinder(top[0], top[1], 5, METER.z1, 4, P, 24), { tone: "mid" }),
    [A.cylinder(top[0], top[1], 5, METER.z1, 4, own("meter", { name: "meter.collar" }))],
  );
  put(
    "meter",
    G.add3(top, G.mul3(toward, boom / 2 + 6)),
    S(G.disc(5, boom, 2.6, MF, P), { tone: "mid" }),
    [A.disc(MF, 5, boom, 2.6, own("meter", { name: "meter.boom" }))],
  );
  put(
    "meter",
    G.add3(top, G.mul3(toward, boom + 6)),
    S(
      G.solidOf(
        [
          [boom, 4.6],
          [boom + 12, 4.6],
          [boom + 12, 3.2],
        ],
        MF,
        P,
      ),
      { tone: "mid" },
    ),
    [A.disc(MF, boom, boom + 12, 4.6, own("meter", { name: "meter.capsule" }))],
  );
  const ball = G.add3(top, G.mul3(toward, boom + 12 + 6.2));
  put("meter", ball, S(G.sphereOf(ball, 7, P), { tone: "lo" }), [
    A.ball(ball, 7, own("meter", { name: "meter.windscreen" })),
  ]);
}

// ---------------------------------------------------------------- the loudspeaker
const SF = G.frameOf(CS, SA, SU, G.cross3(SA, SU));
{
  // the cone moves along the axis with the drive; it is drawn as its own group
  // the cone is seen through the can's open front, so it is clipped to that opening
  const opening = G.circleOf(SF, 2.4, SPK.r - 5, P);
  const coneSvg = `<clipPath id="hz-cone-clip"><path d="${opening}"/></clipPath><g clip-path="url(#hz-cone-clip)"><path class="hz-cavity" d="${opening}"/><g data-cone>${Ln(
    [
      [-1, 24],
      [-3.5, 21.4],
      [-6.5, 18.4],
      [-9.5, 15.2],
      [-12.5, 11.6],
      [-14.6, 8.2],
    ]
      .map(([s, r]) => G.circleOf(SF, s, r, P))
      .join(""),
    { tone: "lo" },
  )}${S(G.sphereOf(G.add3(CS, G.mul3(SA, -16.5)), 7.5, P), { tone: "mid" })}</g>${Ln(G.circleOf(SF, 1.2, SPK.r - 6.2, P), { tone: "mid" })}</g>`;
  const can = G.solidOf(
    [
      [SPK.back, 20],
      [SPK.back + 5, SPK.r - 0.4, 1],
      [SPK.back + 9, SPK.r, 1],
      [0, SPK.r],
    ],
    SF,
    P,
  );
  put(
    "speaker",
    G.add3(CS, G.mul3(SA, -10)),
    S(can, { tone: "mid", inner: Ln(G.arcOf(SF, -6, SPK.r, P), { tone: "faint" }) }),
    [
      A.body(
        SF,
        [
          [SPK.back, 0],
          [SPK.back, 20],
          [SPK.back + 9, SPK.r],
          [0, SPK.r],
          [0, SPK.r - 1.4],
          [SPK.back + 9, SPK.r - 1.4],
          [SPK.back + 1.4, 19],
          [SPK.back + 1.4, 0],
        ],
        own("speaker", { name: "speaker.can" }),
      ),
    ],
  );
  put(
    "speaker",
    G.add3(CS, G.mul3(SA, SPK.back - 4)),
    S(G.disc(SPK.back - 8, SPK.back, SPK.magnet, SF, P), { tone: "lo" }),
    [A.disc(SF, SPK.back - 8, SPK.back, SPK.magnet, own("speaker", { name: "speaker.magnet" }))],
  );
  const baffle = G.ringBand(0, 2.4, SPK.r - 5, SPK.r + 1, SF, P, { hole: [2.4, SPK.r - 5] });
  const bolts = Dots(G.dotsOf(SF, 2.4, SPK.r - 2, 8, P, { all: true, phase: 0.4 }), { size: 0.45 });
  put(
    "speaker",
    G.add3(CS, G.mul3(SA, 1.2)),
    S(baffle, { tone: "mid" }) + bolts + coneSvg,
    [A.ring(SF, 0, 2.4, SPK.r - 5, SPK.r + 1, own("speaker", { name: "speaker.baffle" }))],
    { bias: 0.4 },
  );
  // terminal posts on the underside, where the leads come in
  const down = G.unit3(G.sub3([0, 0, -1], G.mul3(SA, -SA[2])));
  SPK.down = down;
  SPK.posts = [];
  for (const s of [-15, -6]) {
    const base = G.add3(G.add3(CS, G.mul3(SA, s)), G.mul3(down, SPK.r - 0.3));
    const TF = along(base, down);
    put(
      "speaker",
      G.add3(base, G.mul3(down, 3)),
      S(G.disc(0, 2.4, 3, TF, P), { tone: "mid" }) +
        S(G.disc(2.4, 5.6, 1.9, TF, P), { tone: "hi" }),
      [
        A.disc(TF, 0, 2.4, 3, own("speaker", { name: "speaker.post" })),
        A.disc(TF, 2.4, 5.6, 1.9, own("speaker", { name: "speaker.post.tip" })),
      ],
    );
    SPK.posts.push(G.add3(base, G.mul3(down, 5.6)));
  }
}

// ---------------------------------------------------------------- the signal generator
const DIAL = { u: 172, v: 58, r: 24 };
const DISPLAY = { u: 22, v: 16, w: 98, h: 30 };
const BUTTONS = [30, 54, 78, 102].map((u) => ({ u, v: 58, w: 16, h: 9 }));
const RANGE_LIT = 2; // ×100: the dial's 1 to 6 reads 100 to 600 Hz
const POSTS = [
  { u: 26, v: 88 },
  { u: 50, v: 88 },
];
{
  const g = GEN;
  const feet = k.corners(g, 18);
  for (const [x, y] of [...feet].sort(
    (a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P),
  )) {
    put(
      "generator",
      [x, y, 3],
      S(k.cylinder(x, y, 7, 0, GEN_FOOT, P, 28), { tone: "lo" }),
      [A.cylinder(x, y, 7, 0, GEN_FOOT, own("generator", { name: "generator.foot" }))],
      { bias: -20 },
    );
  }
  const box = k.slabOf(g, GEN_FOOT, GEN_TOP - GEN_FOOT, P, 4, 1.2);
  const seam = k.sideSeam(g, GEN_TOP - 12, P, 4);
  // vents: closed slots on the top, behind the label plate
  const vents = [];
  for (let i = 0; i < 9; i++)
    vents.push(
      k.planOutline({ x: g.x + 14, y: g.y + 22 + i * 15, w: 62, d: 5, r: 2.5 }, GEN_TOP, P, 4),
    );
  const plate = { x: g.x + 104, y: g.y + 120, w: 52, d: 76, r: 2 };
  const rules = [0, 1, 2]
    .map((i) =>
      Ln(
        k.lineOnTop(
          [plate.x + 12 + i * 10, plate.y + 10],
          [plate.x + 12 + i * 10, plate.y + 10 + [52, 40, 28][i]],
          GEN_TOP + 0.5,
          P,
        ),
        { tone: "lo", free: true },
      ),
    )
    .join("");
  const plateSvg =
    S(k.slabOf(plate, GEN_TOP, 0.5, P, 2), { tone: "lo", crease: "none" }) +
    Ln(k.planOutline(k.insetPlan(plate, 2), GEN_TOP + 0.5, P, 2), { tone: "faint" }) +
    rules +
    Dots(
      [
        at([plate.x + 5, plate.y + 6, GEN_TOP + 0.5]),
        at([plate.x + 5, plate.y + plate.d - 6, GEN_TOP + 0.5]),
      ],
      { size: 0.45 },
    );
  put(
    "generator",
    [g.x + g.w / 2, g.y + g.d / 2, GEN_TOP / 2],
    S(box, { tone: "mid", inner: Ln(seam, { tone: "faint" }) }) +
      Ln(vents.join(""), { tone: "lo" }) +
      plateSvg,
    [A.slab(g, GEN_FOOT, GEN_TOP - GEN_FOOT, own("generator", { name: "generator.case" }), 4)],
    { bias: -10 },
  );

  // the front panel, drawn in the plane of the face
  const m = k.sideMatrix([PANEL_X + 0.05, PANEL_Y0], GEN_TOP, P, "right");
  const parts = [];
  parts.push(
    `<rect class="hz-panel-groove" x="6" y="6" width="${g.d - 12}" height="${GEN_TOP - GEN_FOOT - 12}"/>`,
  );
  for (const [u, v] of [
    [11, 11],
    [g.d - 11, 11],
    [11, GEN_TOP - GEN_FOOT - 11],
    [g.d - 11, GEN_TOP - GEN_FOOT - 11],
  ])
    parts.push(
      `<circle class="hz-screw" cx="${u}" cy="${v}" r="1.9"/><circle class="hz-screw-dot" cx="${u}" cy="${v}" r=".55"/>`,
    );
  // display window
  const d = DISPLAY;
  parts.push(
    `<rect class="hz-bezel" x="${d.u - 3}" y="${d.v - 3}" width="${d.w + 6}" height="${d.h + 6}"/>`,
  );
  parts.push(`<rect class="hz-lcd" x="${d.u}" y="${d.v}" width="${d.w}" height="${d.h}"/>`);
  parts.push(
    `<clipPath id="hz-lcd-clip"><rect x="${d.u}" y="${d.v}" width="${d.w}" height="${d.h}"/></clipPath>`,
  );
  parts.push(
    `<g clip-path="url(#hz-lcd-clip)"><text class="hz-digits" data-digits x="${d.u + d.w - 26}" y="${d.v + d.h - 7.5}" text-anchor="end">${F0.toFixed(1)}</text><text class="hz-unit" x="${d.u + d.w - 6}" y="${d.v + d.h - 7.5}" text-anchor="end">Hz</text></g>`,
  );
  // the dial's printed scale: 0 to 10 over 270°
  const dr = DIAL.r + 4;
  const tick = [];
  for (let i = 0; i <= 20; i++) {
    const a = (-135 + i * 13.5) * DEG;
    const r1 = dr + (i % 2 ? 2.6 : 4.6);
    tick.push(
      `M${(DIAL.u + dr * Math.sin(a)).toFixed(2)} ${(DIAL.v - dr * Math.cos(a)).toFixed(2)}L${(DIAL.u + r1 * Math.sin(a)).toFixed(2)} ${(DIAL.v - r1 * Math.cos(a)).toFixed(2)}`,
    );
  }
  const arcFrom = [DIAL.u + dr * Math.sin(-135 * DEG), DIAL.v - dr * Math.cos(-135 * DEG)];
  const arcTo = [DIAL.u + dr * Math.sin(135 * DEG), DIAL.v - dr * Math.cos(135 * DEG)];
  parts.push(
    `<path class="iso-line" data-tone="mid" d="M${arcFrom[0].toFixed(2)} ${arcFrom[1].toFixed(2)}A${dr} ${dr} 0 1 1 ${arcTo[0].toFixed(2)} ${arcTo[1].toFixed(2)}"/>`,
  );
  parts.push(`<path class="iso-line" data-tone="mid" d="${tick.join("")}"/>`);
  // the range buttons' frame and the output posts' insulating plate
  parts.push(
    `<rect class="hz-bezel" x="${BUTTONS[0].u - 4}" y="${BUTTONS[0].v - 4}" width="${BUTTONS[3].u + BUTTONS[3].w - BUTTONS[0].u + 8}" height="${BUTTONS[0].h + 8}"/>`,
  );
  parts.push(
    `<rect class="hz-bezel" x="${POSTS[0].u - 11}" y="${POSTS[0].v - 11}" width="${POSTS[1].u - POSTS[0].u + 22}" height="22"/>`,
  );
  put(
    "generator",
    [PANEL_X, PANEL_Y0 - g.d / 2, GEN_TOP / 2],
    `<g transform="${m}">${parts.join("")}</g>`,
    [
      A.box(
        [PANEL_X, g.y + 1, GEN_FOOT + 1],
        [PANEL_X + 0.1, g.y + g.d - 1, GEN_TOP - 1],
        own("generator", { name: "generator.panel" }),
      ),
    ],
  );

  // range buttons, standing proud of the panel
  BUTTONS.forEach((b, i) => {
    const centre = panel(b.u + b.w / 2, b.v + b.h / 2);
    const F = G.frameOf(centre, [1, 0, 0], [0, -1, 0], [0, 0, 1]);
    const poly = [
      [-b.w / 2, -b.h / 2],
      [b.w / 2, -b.h / 2],
      [b.w / 2, b.h / 2],
      [-b.w / 2, b.h / 2],
    ];
    const lit = i === RANGE_LIT;
    put(
      "generator",
      G.add3(centre, [2, 0, 0]),
      `<g${lit ? " data-range" : ""}>${S(G.prismOf(F, poly, 0, lit ? 2.2 : 3.6, P), { tone: lit ? "hi" : "mid", lit })}</g>`,
      [A.prism(F, poly, 0, lit ? 2.2 : 3.6, own("generator", { name: "generator.button" }))],
    );
  });
  // amplitude knob and power rocker
  const knobAt = panel(98, 88);
  const KF = along(knobAt, [1, 0, 0]);
  put(
    "generator",
    G.add3(knobAt, [5, 0, 0]),
    S(G.disc(0, 2, 10, KF, P), { tone: "mid" }) +
      S(G.disc(2, 10, 8, KF, P), {
        tone: "mid",
        inner: k.fadedSvg(G.ribsOf(KF, 2, 10, 8, 30, P, { fade: [0.1, 0.55], seams: true }), {
          tone: "lo",
        }),
      }) +
      Ln(k.segment(G.add3(knobAt, [10.02, 0, 0]), G.add3(knobAt, [10.02, -4.5, 4.5]), P), {
        tone: "hi",
        free: "end",
      }) +
      Dots([at(G.add3(knobAt, [10.04, 0, 0]))], { size: 0.9, tone: "hi" }),
    [
      A.disc(KF, 0, 2, 10, own("generator", { name: "generator.knob.skirt" })),
      A.disc(KF, 2, 10, 8, own("generator", { name: "generator.knob" })),
    ],
  );
  const rocker = panel(132, 88);
  const RFm = G.frameOf(rocker, [1, 0, 0], [0, -1, 0], [0, 0, 1]);
  put(
    "generator",
    G.add3(rocker, [2, 0, 0]),
    S(
      G.prismOf(
        RFm,
        [
          [-6, -9],
          [6, -9],
          [6, 9],
          [-6, 9],
        ],
        0,
        1.4,
        P,
      ),
      { tone: "lo" },
    ) +
      S(
        G.prismOf(
          RFm,
          [
            [-4.4, -7.4],
            [4.4, -7.4],
            [4.4, 0.6],
            [-4.4, 0.6],
          ],
          1.4,
          4.4,
          P,
        ),
        { tone: "mid" },
      ),
    [
      A.prism(
        RFm,
        [
          [-6, -9],
          [6, -9],
          [6, 9],
          [-6, 9],
        ],
        0,
        1.4,
        own("generator", { name: "generator.rocker.bezel" }),
      ),
      A.prism(
        RFm,
        [
          [-4.4, -7.4],
          [4.4, -7.4],
          [4.4, 0.6],
          [-4.4, 0.6],
        ],
        1.4,
        4.4,
        own("generator", { name: "generator.rocker" }),
      ),
    ],
  );
  // output binding posts
  GEN.postTips = [];
  POSTS.forEach((p, i) => {
    const base = panel(p.u, p.v);
    const F = along(base, [1, 0, 0]);
    const tone = i === 0 ? "hi" : "mid";
    const shapes = [
      A.disc(F, 0, 2.4, 7, own("generator", { name: "generator.post.washer" })),
      A.disc(F, 2.4, 7, 4.6, own("generator", { name: "generator.post.body" })),
      A.disc(F, 7, 15, 5.8, own("generator", { name: "generator.post.cap" })),
      A.disc(F, 15, 18, 2.4, own("generator", { name: "generator.post.tip" })),
    ];
    put(
      "generator",
      G.add3(base, [9, 0, 0]),
      S(G.disc(0, 2.4, 7, F, P), { tone: "lo" }) +
        S(G.disc(2.4, 7, 4.6, F, P), { tone: "mid" }) +
        S(G.disc(7, 15, 5.8, F, P), {
          tone,
          inner: k.fadedSvg(G.ribsOf(F, 7, 15, 5.8, 24, P, { fade: [0.1, 0.55], seams: true }), {
            tone: "lo",
          }),
        }) +
        S(G.disc(15, 18, 2.4, F, P), { tone: "mid" }),
      shapes,
    );
    GEN.postTips.push(G.add3(base, [18, 0, 0]));
  });
  // the big frequency dial: skirt, knurled knob, cap with a pointer the live code turns
  const dialAt = panel(DIAL.u, DIAL.v);
  const DF = along(dialAt, [1, 0, 0]);
  const knurl = k.fadedSvg(
    G.ribsOf(DF, 4, 17, DIAL.r - 2, 56, P, { fade: [0.1, 0.55], seams: true }),
    { tone: "lo" },
  );
  const cm = k.sideMatrix([PANEL_X + 19.06, PANEL_Y0 - DIAL.u], GEN_TOP - DIAL.v, P, "right");
  const pointer = `<g transform="${cm}"><g data-pointer><path class="iso-line" data-tone="hi" data-free="end" d="M0 -4L0 -${(DIAL.r - 6).toFixed(1)}" style="stroke-width:1.1"/></g><circle class="hz-hub" cx="0" cy="0" r="2.2"/></g>`;
  put(
    "generator",
    G.add3(dialAt, [10, 0, 0]),
    S(G.disc(0, 4, DIAL.r + 1.5, DF, P), { tone: "mid" }) +
      S(
        G.solidOf(
          [
            [4, DIAL.r - 2],
            [17, DIAL.r - 2],
            [18.2, DIAL.r - 3.4, 1],
            [19, DIAL.r - 5, 1],
          ],
          DF,
          P,
        ),
        { tone: "mid", inner: knurl },
      ) +
      pointer,
    [
      A.disc(DF, 0, 4, DIAL.r + 1.5, own("generator", { name: "generator.dial.skirt" })),
      A.disc(DF, 4, 19, DIAL.r - 2, own("generator", { name: "generator.dial" })),
    ],
  );
}

// ---------------------------------------------------------------- the leads
{
  const lead = 1.4;
  const tips = GEN.postTips;
  tips.forEach((tip, i) => {
    const from = SPK.posts[i];
    const drop = G.add3(from, G.mul3(SPK.down, 10));
    const side = [drop[0] - 6, drop[1] - 26, drop[2] - 12]; // off the bulb's silhouette
    const benchZ = lead + 0.75;
    const lane = -89 + i * 5;
    const outX = PANEL_X + 34 + i * 7;
    const route = [
      from,
      drop,
      side,
      [side[0], side[1], 40],
      [side[0], lane, benchZ + 0.01],
      [outX, lane, benchZ],
      [outX, tip[1], benchZ],
      [outX, tip[1], tip[2]],
      tip,
    ];
    const line = G.fillet(route, 9, 10, { P, tube: lead });
    cable("leads", line, lead, { name: `leads.${i ? "black" : "red"}`, tone: i ? "mid" : "hi" });
  });
}

// ---------------------------------------------------------------- order, audit, page
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const body = R.items
  .map((item) => `<g class="it" data-piece="${item.piece}">${item.svg}</g>`)
  .join("");

const LABEL =
  "A Helmholtz resonator on a lab bench. A round-bottom flask, part filled with water, sits in a cork ring on a retort stand's base and is held by the neck in a ring clamp. A loudspeaker on a boss arm points at the flask's mouth, wired to a bench signal generator with a frequency dial, range buttons and a digital display. A measuring cylinder holds the rest of the water, and a sound-level meter's microphone listens at the mouth.";
const svg = k.figureSvg({ width: W, height: HGT, label: LABEL, body, className: "hz-svg" });

const PARTS = [
  ["flask", "Round-bottom flask"],
  ["water", "Water and the air above it"],
  ["cork", "Cork ring"],
  ["stand", "Retort stand, clamp and boss arm"],
  ["speaker", "Loudspeaker"],
  ["generator", "Signal generator"],
  ["leads", "Leads"],
  ["cylinder", "Measuring cylinder"],
  ["meter", "Sound-level meter"],
];
const legend = PARTS.map(
  ([id, name], i) =>
    `<button type="button" class="hz-part" data-part="${id}"><span class="hz-num">${String(i + 1).padStart(2, "0")}</span>${name}</button>`,
).join("");
const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Helmholtz resonator</span><span class="iso-plate-corner" data-corner="hint">Move across the bench to tune the generator</span><span class="iso-plate-corner" data-corner="readout" data-readout></span></div>`;
const controls = `<div class="hz-controls"><button type="button" data-act="less">Pour 50 cm³ out</button><button type="button" data-act="more">Pour 50 cm³ in</button><button type="button" data-act="tune">Tune to resonance</button><button type="button" data-act="layer" aria-pressed="true">Air as a spring</button><span class="hz-live" data-live aria-live="polite"></span></div>`;
const stage = `<div class="iso-stage hz-stage" tabindex="0" role="slider" aria-label="Helmholtz resonator. Left and right arrows tune the signal generator; up and down pour water in or out; P shows the air as a spring." aria-valuemin="${F_RANGE[0]}" aria-valuemax="${F_RANGE[1]}" aria-valuenow="${Math.round(F0)}">${svg}</div>`;
const caption =
  "Blow across a bottle and it sings. The plug of air in the neck is a mass, and the air shut in the bulb is a spring: push the plug in and the bulb's air squeezes and pushes it back out. The flask rings at f = (c / 2π) √(A / (V L′)), so pouring water in leaves less air, a stiffer spring and a higher note, and 1/f² falls in a straight line with the water poured in. The speaker is loudest at the mouth when the generator meets that note. The air's motion is drawn slowed and enlarged; every number comes from the model.";
const figure = `<figure class="iso-figure hz"><div class="iso-plate">${corners}${stage}${controls}</div><figcaption class="iso-legend"><span class="hz-parts">${legend}</span><span class="iso-caption">${caption}</span></figcaption></figure>`;

// the model, inlined from packages/physics as plain JavaScript
const modelJs = stripTypeScriptTypes(readFileSync(PHYSICS, "utf8")).replace(/^export /gm, "");
const HZ = `const HZ = (() => {\n${modelJs}\nreturn { resonantFrequency, loudness, plugState, waterDepth, airVolume, inverseFrequencySquared };\n})();\n`;
const LATHE = readFileSync(join(KIT, "lathe.mjs"), "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const GL = `const G = (() => {\n${LATHE}\nreturn { solidOf, frameOf };\n})();\n`;

const DATA = {
  P,
  flask: FLASK,
  roomC: ROOM_C,
  drive: DRIVE_PA,
  water0: WATER0,
  supply: SUPPLY,
  waterMax: WATER_MAX,
  fRange: F_RANGE,
  f0: F0,
  zc: ZC,
  ri: RI,
  zBottom: Z_BOTTOM,
  fa: FA,
  cyl: { ...CYL, ml: ML },
  plugUp: [at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]],
  coneAxis: [at(SA)[0] - at([0, 0, 0])[0], at(SA)[1] - at([0, 0, 0])[1]],
  rangeLit: RANGE_LIT,
};
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const CSS = readFileSync(join(HERE, "helmholtz.css"), "utf8");
const page = k.pageHtml({
  title: "Helmholtz resonator",
  theme: THEME,
  body: `<style>${CSS}</style>${figure}`,
  script: kitScript() + GL + HZ + LIVE,
  width: 960,
});
const name = THEME === "light" ? "helmholtz-light.html" : "helmholtz.html";
writeFileSync(join(HERE, name), page);
console.log(
  "wrote",
  name,
  `${(page.length / 1024).toFixed(0)} KB`,
  `${R.items.length} items`,
  `${R.solids.length} shapes`,
);

// The plug of air is an overlay seen through the glass neck (and masked where the steel clamp
// hides it), so it is drawn after the glass that holds it.
A.auditOrExit(R, P, {
  allow: [
    ["flask.plug", "flask.*"],
    ["flask.plug", "stand.clamp.ring"],
  ],
});
