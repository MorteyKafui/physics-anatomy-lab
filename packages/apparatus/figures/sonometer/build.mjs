// The sonometer: a vibrating string on a hollow sounding box (Simulations, ADR 0049).
// node build.mjs [--light] [--audit] writes sonometer.html or sonometer-light.html beside this file.
// Every number the figure shows comes from packages/physics/src/sonometer.ts, which the page inlines.
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript } from "../../kit/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODEL_FILE = join(HERE, "..", "..", "..", "physics", "src", "sonometer.ts");
const M = await import(pathToFileURL(MODEL_FILE).href);
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ---------- the set-up (inputs to the model) ----------
const WIRE = M.sonometerWireById("steel-30");
const MU = M.wireLinearDensity(WIRE);
const HANGER_KG = 0.5;
const SLOTTED = [0.5, 0.5, 0.5, 0.5];
const LOAD = HANGER_KG + SLOTTED.reduce((a, b) => a + b, 0);
const G_LOCAL = M.STANDARD_GRAVITY;
const PULLEY_LOSS = 0.005;
const Q = 170;
const TAU = 4;
const FORKS = M.TUNING_FORKS;
const FORK0 = FORKS.indexOf(256);
const TENSION = M.tensionFromLoad(LOAD, G_LOCAL, PULLEY_LOSS);
const SPEED = M.waveSpeed(TENSION, MU);
const L1 = M.resonantLength(FORKS[FORK0], SPEED, 1);
const L2 = M.resonantLength(FORKS[FORK0], SPEED, 2);

// ---------- world: 1 unit = 2 mm, z up, the scale's zero at x = 0 ----------
const PER_M = 500;
const xOfCm = (cm) => cm * (PER_M / 100);
const WIRE_R = 0.45;
const LID = 48;
const WZ = 58; // bridge edges
const WC = WZ + WIRE_R; // wire centreline over the bridges
const FIXED_X = xOfCm(10);
const REACH = [0.15, 0.85]; // vibrating lengths the movable bridge can make, m
const REST_L = L1;
const bridgeX = (l) => FIXED_X + l * PER_M;

const BENCH = { x: -156, y: -46, w: 636, d: 96, r: 3 };
const BENCH_H = 20;
const BOX = { x: -50, y: -32, w: 570, d: 64, r: 1.5 };
const BOX_Z = 6;
const BODY_TOP = 44;
const LIDP = k.insetPlan(BOX, -1.4);
const FEET = [
  [-36, -22],
  [-36, 22],
  [462, -22],
  [462, 22],
];
const HOLES = [118, 326];
const HOLE_R = 9;
const HOLE_Z = 25;
const JOINTS = [-38, 508];
const SCALE = { x: -6, y: 15, w: 512, d: 13, r: 0.5 };
const SCALE_TOP = LID + 1;
const HITCH = [-36, 0];
const FORK_AT = [12, -17];
const END = BOX.x + BOX.w;
const CLAMP_OUT = END + 4.4; // outer face of the clamp's back plate
const PULLEY = { x: CLAMP_OUT + 13, z: WZ - 10, groove: 10, rim: 11.6, half: 3, bore: 1.45 };
const DROP_X = PULLEY.x + PULLEY.groove + WIRE_R;
const FERRULE_TOP = 18;
const FERRULE_H = 2.6;
const EYE = { rIn: 1.4, rOut: 2.9 };
const EYE_Z = FERRULE_TOP - FERRULE_H - EYE.rOut;
const STEM = { r: 1.3, top: EYE_Z - EYE.rOut, bottom: -46 };
const MASS_R = 13.5;
const MASS_H = 8.5;
const BASE_DISC = { z: STEM.bottom, h: 4 };
const PAD = { x: -146, y: -16, w: 44, d: 30, r: 5 };

const W = 760;
const FIT = [
  ...k.boxCorners(BENCH, -BENCH_H - 4, 0),
  [FORK_AT[0], FORK_AT[1], 166],
  [DROP_X + MASS_R, 0, BASE_DISC.z - 2],
  [DROP_X - MASS_R, 0, BASE_DISC.z - 2],
  [PULLEY.x + 14, 0, WZ + 6],
];
const CAMERA = { pad: 14, azimuth: 80, elevation: 32 };
// The sonometer is long and low, so the width sets the scale; size the card's height to the drawing.
const H = (() => {
  const trial = k.fitProjection(FIT, W, 1000, CAMERA);
  const ys = FIT.map((point) => k.iso(point, trial)[1]);
  return Math.ceil(Math.max(...ys) - Math.min(...ys) + 2 * CAMERA.pad);
})();
const P = k.fitProjection(FIT, W, H, CAMERA);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const round3 = (p) => p.map((v) => Math.round(v * 100) / 100);
const ALONG_Y = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const ALONG_X = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const UP = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);

// ---------- recorder ----------
const R = A.recorder(P);
function put(name, ref, svg, shapes, { g, bias = 0, attrs = "", ...rest } = {}) {
  return R.put({
    name,
    at: ref,
    bias,
    svg,
    shapes: shapes.map(R.solid),
    g,
    attrs,
    piece: "rig",
    ...rest,
  });
}
const meta = (name, owner, more = {}) => (owner ? { name, owner, ...more } : { name, ...more });
function slab(
  name,
  plan,
  z,
  h,
  style,
  {
    g,
    steps = 3,
    bevel = 0.5,
    extra = "",
    inner = "",
    bias = 0,
    ground = false,
    owner,
    attrs = "",
  } = {},
) {
  const shape = A.slab(plan, z, h, meta(name, owner, { ground }), steps);
  const svg = S(k.slabOf(plan, z, h, P, steps, bevel), { ...style, inner }) + extra;
  return put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, [shape], {
    g,
    bias,
    attrs,
  });
}
function cyl(
  name,
  cx,
  cy,
  r,
  z,
  h,
  style,
  { g, steps = 28, bevel = 0, extra = "", bias = 0, owner } = {},
) {
  const shape = A.cylinder(cx, cy, r, z, h, meta(name, owner));
  return put(
    name,
    [cx, cy, z + h / 2],
    S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), style) + extra,
    [shape],
    { g, bias },
  );
}
function disc(name, F, s0, s1, r, style, { g, extra = "", bias = 0, owner } = {}) {
  const shape = A.disc(F, s0, s1, r, meta(name, owner));
  return put(
    name,
    G.pointOf(F, (s0 + s1) / 2, 0, 0),
    S(G.disc(s0, s1, r, F, P), style) + extra,
    [shape],
    { g, bias },
  );
}
function prism(name, F, poly, s0, s1, style, { g, extra = "", inner = "", bias = 0, owner } = {}) {
  const shape = A.prism(F, poly, s0, s1, meta(name, owner));
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  return put(
    name,
    G.pointOf(F, (s0 + s1) / 2, 0, 0).map((v, i) => v + F.u[i] * cx + F.v[i] * cy),
    S(G.prismOf(F, poly, s0, s1, P), { ...style, inner }) + extra,
    [shape],
    { g, bias },
  );
}
// The wire is one route for the audit; each stretch of it is drawn as its own item.
function wirePiece(name, points, { g = "wire", tone = "hi", svg } = {}) {
  const mid =
    points.length > 2 ? points[Math.floor(points.length / 2)] : G.lerp3(points[0], points[1], 0.5);
  return R.put({
    name,
    at: mid,
    svg: svg ?? Ln(path3(points), { tone }),
    shapes: [A.tube(points, WIRE_R, { name: "wire" })],
    g,
    piece: "rig",
  });
}

// ---------- bench top (the ground) ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H, BENCH_H, P)}"/>`);
{
  const plankLines = [-24, 30]
    .map((y) => k.lineOnTop([BENCH.x, y], [BENCH.x + BENCH.w, y], 0, P))
    .join("");
  const edge = k.sideSeam(BENCH, -4, P, 3);
  slab(
    "stand.bench",
    BENCH,
    -BENCH_H,
    BENCH_H,
    { tone: "lo" },
    {
      g: "bench",
      steps: 3,
      bevel: 0.8,
      ground: true,
      inner: Ln(edge, { tone: "faint" }),
      extra: Ln(plankLines, { tone: "faint" }),
    },
  );
}

// ---------- the sounding box ----------
for (const [x, y] of FEET)
  cyl("box.foot", x, y, 5, 0, BOX_Z, { tone: "lo" }, { g: "box", steps: 24 });
back.push(
  `<path class="iso-halo" d="${k.haloOf(k.insetPlan(BOX, 4), BOX_Z - 3, 0.1, P)}" style="filter:blur(5px)"/>`,
);
{
  const face = BOX.y + BOX.d;
  const grain = [11, 16.5, 33.5, 38.5]
    .map((z) => k.segment([JOINTS[0], face, z], [JOINTS[1], face, z], P))
    .join("");
  const joints = JOINTS.map((x) => k.segment([x, face, BOX_Z], [x, face, BODY_TOP], P)).join("");
  const end = BOX.x + BOX.w;
  const endJoints = [-14, 14]
    .map((y) => k.segment([end, y, BOX_Z], [end, y, BODY_TOP], P))
    .join("");
  const holes = HOLES.map((x) => {
    const rim = k.sideRing([x, face, HOLE_Z], HOLE_R, "y", P, 48);
    const wall = k.sideRing([x, face - 2.2, HOLE_Z], HOLE_R, "y", P, 48);
    const lip =
      k.sideRing([x, face, HOLE_Z], HOLE_R + 1.6, "y", P, 48) +
      k.sideRing([x, face, HOLE_Z], HOLE_R + 3.4, "y", P, 56);
    return `<path class="sn-void" d="${rim}"/><g clip-path="url(#sn-hole-${x})"><path class="sn-wall" d="${rim}"/><path class="sn-void" d="${wall}"/></g><clipPath id="sn-hole-${x}"><path d="${rim}"/></clipPath>${Ln(lip, { tone: "faint" })}${Ln(rim, { tone: "mid" })}`;
  }).join("");
  const plate = { x: 404, y: face, w: 44, d: 0.8, r: 0.3 };
  const plateFace = face + 0.8;
  const plateRules = [
    [29, 30],
    [25.5, 22],
    [22, 26],
  ].map(([z, w]) => k.segment([plate.x + 5, plateFace, z], [plate.x + 5 + w, plateFace, z], P));
  const plateSvg =
    S(k.slabOf(plate, 15, 20, P, 2, 0), { tone: "mid" }) +
    Ln(
      k.pathOf(
        [
          at([plate.x + 2, plateFace, 33]),
          at([plate.x + plate.w - 2, plateFace, 33]),
          at([plate.x + plate.w - 2, plateFace, 17]),
          at([plate.x + 2, plateFace, 17]),
        ],
        true,
      ),
      { tone: "faint" },
    ) +
    plateRules.map((d) => Ln(d, { tone: "lo", free: true })).join("") +
    Dots(
      [
        at([plate.x + 2.4 + 0.4, plateFace, 18.6]),
        at([plate.x + plate.w - 2.8, plateFace, 18.6]),
        at([plate.x + 2.8, plateFace, 31.4]),
        at([plate.x + plate.w - 2.8, plateFace, 31.4]),
      ],
      { size: 0.42, tone: "mid" },
    );
  slab(
    "box.body",
    BOX,
    BOX_Z,
    BODY_TOP - BOX_Z,
    { tone: "mid" },
    {
      g: "box",
      steps: 3,
      bevel: 0,
      extra: Ln(grain, { tone: "faint" }) + Ln(joints + endJoints, { tone: "lo" }) + holes,
    },
  );
  put(
    "box.plate",
    [plate.x + plate.w / 2, face + 0.4, 25],
    plateSvg,
    [A.slab(plate, 15, 20, { name: "box.plate" }, 2)],
    { g: "box" },
  );
  const lidSeam = k.sideSeam(LIDP, LID - 1.4, P, 3);
  // The lid is screwed down along both long edges.
  const screwsAt = [];
  for (let x = -30; x <= 500; x += 53)
    for (const y of [-30.6, 30.6])
      if (Math.abs(x - HITCH[0]) > 8 && Math.abs(x - FORK_AT[0]) > 8) screwsAt.push([x, y]);
  const screwRings = screwsAt.map(([x, y]) => k.ring(x, y, 0.95, LID, P, 14)).join("");
  const screwSlots = screwsAt
    .map(([x, y]) => k.lineOnTop([x - 0.95, y], [x + 0.95, y], LID, P))
    .join("");
  slab(
    "box.lid",
    LIDP,
    BODY_TOP,
    LID - BODY_TOP,
    { tone: "mid" },
    {
      g: "box",
      steps: 3,
      bevel: 0.6,
      inner: Ln(lidSeam, { tone: "faint" }),
      extra: Ln(screwRings, { tone: "lo" }) + Ln(screwSlots, { tone: "lo" }),
    },
  );
}

// ---------- the metre scale ----------
{
  const ticks = [];
  for (let cm = 0; cm <= 100; cm++) {
    const x = xOfCm(cm);
    const length = cm % 10 === 0 ? 6.2 : cm % 5 === 0 ? 4.2 : 2.6;
    ticks.push({
      d: k.lineOnTop([x, SCALE.y], [x, SCALE.y + length], SCALE_TOP, P),
      tone: cm % 10 === 0 ? "mid" : "lo",
    });
  }
  const zero = k.lineOnTop([0, SCALE.y], [0, SCALE.y + SCALE.d], SCALE_TOP, P);
  const lines =
    ticks
      .filter((t, i) => i > 0)
      .map((t) => Ln(t.d, { tone: t.tone }))
      .join("") + Ln(zero, { tone: "hi" });
  const screws = [SCALE.x + 2.6, SCALE.x + SCALE.w - 2.6].map((x) =>
    at([x, SCALE.y + SCALE.d - 3, SCALE_TOP]),
  );
  slab(
    "scale.rule",
    SCALE,
    LID,
    1,
    { tone: "hi", crease: "lo" },
    { g: "scale", steps: 2, bevel: 0.3, extra: lines + Dots(screws, { size: 0.45, tone: "mid" }) },
  );
}

// ---------- hitch pin and the fixed bridge ----------
cyl(
  "hitch.collar",
  HITCH[0],
  HITCH[1],
  3.2,
  LID,
  1.4,
  { tone: "mid" },
  { g: "bridges", steps: 24 },
);
cyl(
  "hitch.pin",
  HITCH[0],
  HITCH[1],
  2,
  LID + 1.4,
  6.6,
  { tone: "hi" },
  { g: "bridges", steps: 20 },
);
cyl(
  "hitch.head",
  HITCH[0],
  HITCH[1],
  3,
  LID + 8,
  1.6,
  { tone: "hi" },
  { g: "bridges", steps: 24, bevel: 0.3 },
);

const BRIDGE_POLY = [
  [-6, 0],
  [6, 0],
  [0.45, WZ - LID - 2],
  [-0.45, WZ - LID - 2],
];
function bridge(name, x, { g = "bridges", move } = {}) {
  const base = { x: x - 8, y: -14, w: 16, d: 28, r: 1 };
  const plinth = slab(
    `${name}.plinth`,
    base,
    LID,
    2,
    { tone: "mid" },
    {
      g,
      steps: 2,
      bevel: 0.4,
      extra: Dots(
        [
          at([x - 5.6, 10.6, LID + 2]),
          at([x + 5.6, 10.6, LID + 2]),
          at([x - 5.6, -10.6, LID + 2]),
          at([x + 5.6, -10.6, LID + 2]),
        ],
        { size: 0.4, tone: "mid" },
      ),
    },
  );
  const F = ALONG_Y([x, 0, LID + 2]);
  const edge = Ln(k.segment([x, -12, WZ], [x, 12, WZ], P), { tone: "hi" });
  const wedge = prism(
    `${name}.wedge`,
    F,
    BRIDGE_POLY,
    -12,
    12,
    { tone: "hi", crease: "lo" },
    { g, extra: edge },
  );
  return [plinth, wedge];
}
bridge("fixed", FIXED_X);

// The movable wedge bridge, with an index tab over the scale. Built at the rest length and moved.
const MOVER = [];
{
  const x = bridgeX(REST_L);
  MOVER.push(...bridge("mover", x, { g: "bridges" }));
  const tab = { x: x - 1.8, y: 14, w: 3.6, d: 11, r: 0.6 };
  MOVER.push(
    slab(
      "mover.tab",
      tab,
      SCALE_TOP,
      0.6,
      { tone: "hi", crease: "lo" },
      {
        g: "bridges",
        steps: 2,
        bevel: 0,
        extra: Ln(k.lineOnTop([x, 14], [x, 25], SCALE_TOP + 0.6, P), { tone: "lit" }),
      },
    ),
  );
}

// ---------- the pulley, clamped to the end of the box ----------
{
  const g = "pulley";
  const owner = "clamp";
  const lidEnd = LIDP.x + LIDP.w;
  slab(
    "clamp.top",
    { x: END - 13, y: -11, w: CLAMP_OUT - (END - 13), d: 22, r: 0.8 },
    LID,
    2.4,
    { tone: "mid" },
    {
      g,
      owner,
      steps: 2,
      bevel: 0.4,
      extra: Dots([at([END - 9, -6.5, LID + 2.4]), at([END - 9, 6.5, LID + 2.4])], {
        size: 0.45,
        tone: "mid",
      }),
    },
  );
  slab(
    "clamp.back",
    { x: lidEnd, y: -11, w: CLAMP_OUT - lidEnd, d: 22, r: 0.6 },
    -1.4,
    LID + 1.4,
    { tone: "mid" },
    { g, owner, steps: 2, bevel: 0 },
  );
  slab(
    "clamp.jaw",
    { x: END - 13, y: -11, w: lidEnd - (END - 13), d: 22, r: 0.8 },
    -1.4,
    2.4,
    { tone: "mid" },
    { g, owner, steps: 2, bevel: 0.3 },
  );
  // A thumb screw up through the jaw to a pressure pad under the box.
  cyl("clamp.pad", END - 6, 0, 2.6, BOX_Z - 1.2, 1.2, { tone: "mid" }, { g, owner, steps: 20 });
  cyl("clamp.screw", END - 6, 0, 1.1, 1, BOX_Z - 1.2 - 1, { tone: "hi" }, { g, owner, steps: 14 });
  cyl("clamp.neck", END - 6, 0, 1.6, -3.4, 2, { tone: "mid" }, { g, owner, steps: 16 });
  cyl(
    "clamp.knob",
    END - 6,
    0,
    3.6,
    -9.4,
    6,
    { tone: "mid" },
    { g, owner, steps: 28, extra: Ln(k.knurl(END - 6, 0, 3.6, -9.4, -3.4, 22, P), { tone: "lo" }) },
  );
  // Two cheeks carry the axle; the wheel turns between them.
  const cheek = [];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    cheek.push([PULLEY.x + 4.2 * Math.cos(a), PULLEY.z + 4.2 * Math.sin(a)]);
  }
  const cheekPoly = [[CLAMP_OUT, PULLEY.z - 4.2], ...cheek, [CLAMP_OUT, PULLEY.z + 4.2]];
  const F = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  prism(
    "pulley.cheek.far",
    F,
    cheekPoly,
    -PULLEY.half - 2.1,
    -PULLEY.half - 0.5,
    { tone: "mid" },
    { g, owner },
  );
  const AX = ALONG_Y([PULLEY.x, 0, PULLEY.z]);
  disc(
    "pulley.nut.far",
    AX,
    -PULLEY.half - 3.3,
    -PULLEY.half - 2.1,
    2.1,
    { tone: "mid" },
    { g, owner },
  );
  const face = PULLEY.half;
  const holes = [0, 1, 2, 3, 4, 5]
    .map((i) =>
      G.circleOf(
        G.frameOf(
          [
            PULLEY.x + 6.6 * Math.cos((i * Math.PI) / 3 + 0.3),
            0,
            PULLEY.z + 6.6 * Math.sin((i * Math.PI) / 3 + 0.3),
          ],
          [0, 1, 0],
          [1, 0, 0],
          [0, 0, 1],
        ),
        face,
        1.5,
        P,
        20,
      ),
    )
    .join("");
  // The wheel is drawn in two halves split at the groove's middle, so the wire can lie between them.
  const farHalf = [
    [-PULLEY.half, PULLEY.bore],
    [-PULLEY.half, PULLEY.rim],
    [-1.7, PULLEY.rim],
    [-1, PULLEY.groove],
    [0, PULLEY.groove],
    [0, PULLEY.bore],
  ];
  const nearHalf = [
    [0, PULLEY.bore],
    [0, PULLEY.groove],
    [1, PULLEY.groove],
    [1.7, PULLEY.rim],
    [PULLEY.half, PULLEY.rim],
    [PULLEY.half, PULLEY.bore],
  ];
  put(
    "pulley.wheel.far",
    [PULLEY.x, -1.5, PULLEY.z],
    S(G.lathe(farHalf, AX, P, { steps: 96 }), { tone: "hi", crease: "lo" }),
    [A.lathe(AX, farHalf, { name: "pulley.wheel.far", owner: "wheel" })],
    { g },
  );
  put(
    "pulley.wheel",
    [PULLEY.x, 1.5, PULLEY.z],
    S(G.lathe(nearHalf, AX, P, { steps: 96 }), { tone: "hi", crease: "lo" }) +
      `<path class="sn-void" d="${holes}"/>` +
      Ln(holes, { tone: "lo" }) +
      Ln(G.circleOf(AX, face, 3.4, P, 40), { tone: "lo" }),
    [A.lathe(AX, nearHalf, { name: "pulley.wheel", owner: "wheel" })],
    { g },
  );
  // The axle shows only where it leaves the wheel's two faces.
  disc(
    "pulley.axle.far",
    AX,
    -PULLEY.half - 0.5,
    -PULLEY.half,
    PULLEY.bore - 0.05,
    { tone: "mid" },
    { g, owner },
  );
  disc(
    "pulley.axle.near",
    AX,
    PULLEY.half,
    PULLEY.half + 0.5,
    PULLEY.bore - 0.05,
    { tone: "mid" },
    { g, owner },
  );
  prism(
    "pulley.cheek.near",
    F,
    cheekPoly,
    PULLEY.half + 0.5,
    PULLEY.half + 2.1,
    { tone: "mid" },
    {
      g,
      owner,
      extra: Dots([at([CLAMP_OUT + 2.4, PULLEY.half + 2.1, PULLEY.z])], {
        size: 0.45,
        tone: "mid",
      }),
    },
  );
  disc(
    "pulley.nut.near",
    AX,
    PULLEY.half + 2.1,
    PULLEY.half + 3.3,
    2.1,
    { tone: "mid" },
    { g, owner, extra: Ln(G.circleOf(AX, PULLEY.half + 3.3, 1.4, P, 20), { tone: "lo" }) },
  );
}

// ---------- the wire: hitch to fixed bridge, the vibrating span, bridge to pulley, over it and down ----------
const HITCH_END = [HITCH[0] + 2, 0, LID + 5.2];
const OVER = [];
for (let i = 0; i <= 12; i++) {
  const a = Math.PI / 2 - (i / 12) * (Math.PI / 2);
  OVER.push([
    PULLEY.x + (PULLEY.groove + WIRE_R) * Math.cos(a),
    0,
    PULLEY.z + (PULLEY.groove + WIRE_R) * Math.sin(a),
  ]);
}
const LEAD_END = [CLAMP_OUT - 2, 0, WC];
const WIRE_ROUTE = [
  HITCH_END,
  [FIXED_X, 0, WC],
  [bridgeX(REST_L), 0, WC],
  LEAD_END,
  ...OVER,
  [DROP_X, 0, FERRULE_TOP],
];
R.route("wire", WIRE_ROUTE, WIRE_R, {
  piece: "rig",
  touch: ["hitch.pin", "fixed.wedge", "mover.wedge", "pulley.wheel", "pulley.wheel.far"],
});
wirePiece("wire.hitch", [HITCH_END, [FIXED_X, 0, WC]]);
const SPAN_REST = [
  [FIXED_X, 0, WC],
  [bridgeX(REST_L), 0, WC],
];
const LEAD_REST = [[bridgeX(REST_L), 0, WC], LEAD_END];
wirePiece("wire.span", SPAN_REST, { svg: `<g data-part="span"></g>` });
wirePiece("wire.lead", LEAD_REST, {
  svg: `<path data-part="lead" class="iso-line" data-tone="hi" d="${path3(LEAD_REST)}"/>`,
});
// Inside the rim circle the wire lies in the groove, behind the wheel's near flange.
const INTO = Math.sqrt(PULLEY.rim ** 2 - (PULLEY.groove + WIRE_R) ** 2) + 0.4;
wirePiece("wire.top", [LEAD_END, [PULLEY.x - INTO, 0, WC]]);
wirePiece("wire.over", [[PULLEY.x - INTO, 0, WC], ...OVER, [DROP_X, 0, PULLEY.z - INTO]]);
wirePiece("wire.drop", [
  [DROP_X, 0, PULLEY.z - INTO],
  [DROP_X, 0, FERRULE_TOP],
]);

// ---------- hanger and slotted masses ----------
{
  const g = "hanger";
  cyl(
    "hanger.ferrule",
    DROP_X,
    0,
    1.1,
    FERRULE_TOP - FERRULE_H,
    FERRULE_H,
    { tone: "hi" },
    { g, steps: 16 },
  );
  const EF = ALONG_Y([DROP_X, 0, EYE_Z]);
  put(
    "hanger.eye",
    [DROP_X, 0, EYE_Z],
    S(G.ringBand(-0.7, 0.7, EYE.rIn, EYE.rOut, EF, P), { tone: "mid" }) +
      `<path class="sn-void" d="${G.circleOf(EF, 0.7, EYE.rIn, P, 24)}"/>` +
      Ln(G.circleOf(EF, 0.7, EYE.rIn, P, 24), { tone: "lo" }),
    [A.ring(EF, -0.7, 0.7, EYE.rIn, EYE.rOut, { name: "hanger.eye" })],
    { g },
  );
  const massesTop = BASE_DISC.z + BASE_DISC.h + SLOTTED.length * MASS_H;
  cyl(
    "hanger.stem",
    DROP_X,
    0,
    STEM.r,
    massesTop,
    STEM.top - massesTop,
    { tone: "mid", crease: "none" },
    {
      g,
      steps: 16,
      extra: Ln(k.sideArc(DROP_X, 0, STEM.r, massesTop + 10, P, 12), { tone: "faint" }),
    },
  );
  cyl(
    "hanger.base",
    DROP_X,
    0,
    MASS_R + 0.8,
    BASE_DISC.z,
    BASE_DISC.h,
    { tone: "mid" },
    { g, steps: 56, bevel: 0.4 },
  );
  SLOTTED.forEach((_, i) => {
    const z = BASE_DISC.z + BASE_DISC.h + i * MASS_H;
    const top = i === SLOTTED.length - 1;
    // Each mass is slotted from the stem to its rim; the slots turn away from the viewer, staggered.
    const turn = -Math.PI / 2 - 0.35;
    const slot = top
      ? (() => {
          const d = [Math.cos(turn), Math.sin(turn)];
          const n = [-d[1], d[0]];
          const w = STEM.r + 0.3;
          const pts = [
            [DROP_X + n[0] * w, n[1] * w],
            [DROP_X + d[0] * (MASS_R - 0.2) + n[0] * w, d[1] * (MASS_R - 0.2) + n[1] * w],
            [DROP_X + d[0] * (MASS_R - 0.2) - n[0] * w, d[1] * (MASS_R - 0.2) - n[1] * w],
            [DROP_X - n[0] * w, -n[1] * w],
          ];
          return (
            `<path class="sn-void" d="${k.onTop(pts, z + MASS_H, P, true)}"/>` +
            Ln(k.onTop(pts, z + MASS_H, P, true), { tone: "lo" })
          );
        })()
      : "";
    const ring = top
      ? Ln(k.ring(DROP_X, 0, MASS_R - 2.2, z + MASS_H, P, 64), { tone: "faint" })
      : "";
    cyl(
      `hanger.mass.${i + 1}`,
      DROP_X,
      0,
      MASS_R,
      z,
      MASS_H,
      { tone: "hi", crease: "lo" },
      {
        g,
        steps: 64,
        bevel: 0.5,
        extra:
          ring +
          slot +
          (top ? Ln(k.ring(DROP_X, 0, STEM.r + 0.5, z + MASS_H, P, 20), { tone: "lo" }) : ""),
      },
    );
  });
}

// ---------- the tuning fork, standing on its stem on the lid, and the rubber pad ----------
const TINES = [];
{
  const g = "fork";
  const [fx, fy] = FORK_AT;
  put(
    "fork.foot",
    [fx, fy, LID + 2.4],
    S(G.sphereOf([fx, fy, LID + 2.4], 2.4, P), { tone: "hi" }),
    [A.ball([fx, fy, LID + 2.4], 2.4, { name: "fork.foot", owner: "fork" })],
    { g },
  );
  const stemFrom = LID + 2.4 + Math.sqrt(2.4 * 2.4 - 1.7 * 1.7);
  cyl(
    "fork.stem",
    fx,
    fy,
    1.7,
    stemFrom,
    84 - stemFrom,
    { tone: "hi", crease: "none" },
    { g, steps: 16, owner: "fork" },
  );
  const yoke = { x: fx - 7, y: fy - 2.6, w: 14, d: 5.2, r: 2.4 };
  const yokeFace = yoke.y + yoke.d;
  const label = k.faceTextSvg(k.sideMatrix([fx, yokeFace], 86.2, P, "left"), `${FORKS[FORK0]} Hz`, {
    size: 2.1,
    tone: "lo",
    anchor: "middle",
  });
  slab(
    "fork.yoke",
    yoke,
    84,
    6,
    { tone: "hi", crease: "lo" },
    { g, steps: 4, bevel: 0.4, extra: `<g data-part="fork-label">${label}</g>` },
  );
  for (const [i, x0] of [
    [0, fx - 7],
    [1, fx + 2.8],
  ].map(([i, x]) => [i, x])) {
    const plan = { x: x0, y: fy - 2.6, w: 4.2, d: 5.2, r: 0.9 };
    TINES.push(
      slab(
        `fork.tine.${i + 1}`,
        plan,
        90,
        74,
        { tone: "hi", crease: "lo" },
        { g, steps: 3, bevel: 0.4, attrs: ` data-tine="${i}"` },
      ),
    );
  }
  slab(
    "pad.rubber",
    PAD,
    0,
    7,
    { tone: "lo" },
    {
      g,
      steps: 6,
      bevel: 0.8,
      extra:
        Ln(k.planOutline(k.insetPlan(PAD, 3), 7, P, 6), { tone: "faint" }) +
        Dots(k.dotGrid(PAD.x + 9, PAD.y + 7, 8, 4, 4, 7, P), { size: 0.35, tone: "faint" }),
    },
  );
}

// ---------- settle, then lay the items out ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const tineAttr = new Map(TINES.map((item) => [item, item.attrs]));
const moverItems = new Set(MOVER);
const groups = [];
let moverOpen = false;
for (const item of R.items) {
  const attrs = ` data-g="${item.g ?? ""}"${item.attrs ?? ""}`;
  const svg = `<g class="it" data-name="${item.name}"${attrs}>${item.svg}</g>`;
  if (moverItems.has(item)) {
    groups.push(svg.replace('<g class="it"', '<g class="it" data-mover'));
  } else groups.push(svg);
}
void tineAttr;
void moverOpen;

const RIDER_SLOT = `<g data-part="rider" data-g="rider" class="it"></g>`;
const LABEL =
  "A school sonometer on a bench: a long hollow wooden box with two sound holes and a metre scale along its lid. A steel wire runs from a hitch pin over a fixed bridge and a movable wedge bridge, then over a pulley clamped to the far end, where it carries a hanger with four slotted masses. A paper rider sits astride the wire halfway between the bridges, a tuning fork stands on its stem on the lid, and a rubber pad lies on the bench.";
const svg = k.figureSvg({
  width: W,
  height: H,
  label: LABEL,
  body: [...back, `<g class="sn-rig">${groups.join("")}${RIDER_SLOT}</g>`],
  className: "sn-svg",
});

// ---------- readings, all from the model ----------
const fmt = (v, d) => v.toFixed(d);
const l0 = REST_L;
const n0 = 1;
const READ = {
  load: `${fmt(LOAD, 1)} kg`,
  tension: `${fmt(TENSION, 1)} N`,
  wire: `${WIRE.name}, μ ${fmt(MU * 1000, 3)} g m⁻¹`,
  speed: `${fmt(SPEED, 1)} m s⁻¹`,
  length: `${fmt(l0 * 100, 1)} cm`,
  fork: `${FORKS[FORK0]} Hz`,
  harmonic: `${n0}`,
  fn: `${fmt(M.harmonicFrequency(n0, l0, SPEED), 1)} Hz`,
  lambda: `${fmt(M.harmonicWavelength(n0, l0) * 100, 1)} cm`,
};
const ROWS = [
  ["load", "Load M"],
  ["tension", "Tension T"],
  ["wire", "Wire"],
  ["speed", "Wave speed v"],
  ["length", "Vibrating length l"],
  ["fork", "Fork f"],
  ["harmonic", "Nearest harmonic n"],
  ["fn", "Its frequency fₙ"],
  ["lambda", "Its wavelength λₙ"],
];
const readings = `<dl class="sn-readings">${ROWS.map(([key, label]) => `<div><dt>${label}</dt><dd data-read="${key}">${READ[key]}</dd></div>`).join("")}</dl>`;

const KEYS = [
  { mark: "lit", g: "wire", label: "Steel wire: the vibrating length between the bridges" },
  { mark: "raised", g: "bridges", label: "Hitch pin, fixed bridge and movable wedge bridge" },
  { mark: "raised", g: "scale", label: "Metre scale on the lid" },
  { mark: "raised", g: "box", label: "Hollow sounding box with two sound holes" },
  { mark: "raised", g: "pulley", label: "Pulley on a clamp at the far end" },
  { mark: "raised", g: "hanger", label: "Hanger and four 0.5 kg slotted masses" },
  { mark: "raised", g: "rider", label: "Paper rider astride the wire" },
  { mark: "raised", g: "fork", label: "Tuning fork and rubber pad" },
];
const SLOW = 400;
const EXAG = 60;
const caption = `A ${WIRE.swg} SWG steel wire stretched by ${fmt(LOAD, 1)} kg over the pulley (which loses ${fmt(PULLEY_LOSS * 100, 1)} % of the load to friction) carries waves at v = √(T/μ) = ${fmt(SPEED, 1)} m s⁻¹. A struck fork pressed on the box drives the wire; each harmonic answers like a damped oscillator with Q = ${Q}. When a harmonic of the vibrating length matches the fork, a standing wave builds up with nodes at the bridges and the rider is thrown off; at ${FORKS[FORK0]} Hz that happens at l = ${fmt(L1 * 100, 1)} cm, and again at ${fmt(L2 * 100, 1)} cm, where the rider sits on a node and stays. The wire's motion is slowed ${SLOW} times and drawn ${EXAG} times larger; the fork dies away at its real pace.`;

let plate = k.plateHtml({
  fig: "Fig 1",
  title: "Sonometer",
  hint: "Move to slide the bridge · click to strike",
  readout: `l ${fmt(l0 * 100, 1)} cm · fork ${FORKS[FORK0]} Hz`,
  keys: KEYS,
  caption,
  body: `<div class="iso-stage sn-stage" tabindex="0" role="group" aria-label="Sonometer. Left and right arrows slide the movable bridge by 1 mm, with Shift by 1 cm; space or Enter strikes the fork; F changes the fork; R puts the rider back.">${svg}<span class="sn-sr" role="status" aria-live="polite" data-status></span></div>`,
});
let keyIndex = 0;
plate = plate.replace(
  /<span class="iso-key">(.*?)<\/span>/g,
  (_, inside) =>
    `<button type="button" class="iso-key sn-pick" data-pick="${KEYS[keyIndex++].g}" aria-pressed="false">${inside}</button>`,
);
plate = plate.replace(
  '<figcaption class="iso-legend">',
  `<figcaption class="iso-legend">${readings}`,
);

const DATA = {
  P,
  wireR: WIRE_R,
  wc: WC,
  fixedX: FIXED_X,
  perM: PER_M,
  restX: bridgeX(REST_L),
  reach: REACH,
  leadEnd: LEAD_END,
  mu: MU,
  load: LOAD,
  g: G_LOCAL,
  loss: PULLEY_LOSS,
  q: Q,
  tau: TAU,
  forks: FORKS,
  fork0: FORK0,
  slow: SLOW,
  exag: EXAG,
  lid: LID,
  scaleY: SCALE.y,
  forkFace: [FORK_AT[0], FORK_AT[1] + 2.6, 86.2],
};

const CSS = readFileSync(join(HERE, "sonometer.css"), "utf8");
const MODEL = stripTypeScriptTypes(readFileSync(MODEL_FILE, "utf8")).replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const page = k.pageHtml({
  title: "Sonometer",
  theme: THEME,
  body: `<style>${CSS}</style>${plate}`,
  script: kitScript() + "\n" + MODEL + "\n" + LIVE,
  width: 760,
});
const out = THEME === "light" ? "sonometer-light.html" : "sonometer.html";
writeFileSync(join(HERE, out), page);
console.log(
  "wrote",
  out,
  `${(page.length / 1024).toFixed(0)} KB`,
  `${R.items.length} items`,
  `${R.solids.length} solids`,
);

A.auditOrExit(R, P, {});
void round3;
void ALONG_X;
void UP;
