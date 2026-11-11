// The simple pendulum for the Anatomy 3D mode (spike, ADR 0036). World units are centimetres:
// 1 unit = 1 cm, so the 0.800 m thread is 80 long. Everything on the bench turns together (the
// "bench" turn group); the thread and bob swing about the cork (the "swing" hinge group).
import * as k from "../../anatomy-kit/iso-kit.mjs";
import * as G from "../../anatomy-kit/lathe.mjs";
import * as A from "../../anatomy-kit/audit.mjs";
import { turning } from "../../anatomy-kit/turn-build.mjs";

export const WIDTH = 420;
export const HEIGHT = 460;

/** Pivot to the centre of the bob, cm (the experiment's 0.800 m). */
export const LENGTH = 80;
/** The widest swing the build proves, degrees: the experiment's 8° and a margin. */
export const SWING_RANGE = 9;

const TABLE_R = 42;
const BASE = { x: -30, y: -9, w: 20, d: 18, r: 1 };
const BASE_H = 2.5;
const ROD = [-20, 0];
const ROD_R = 0.6;
const ROD_TOP = 100;
const BOSS = { x: -21.8, y: -1.8, w: 3.6, d: 3.6, r: 0.3 };
const BOSS_Z = 92;
const BOSS_H = 4;
const CORK = { x: -1, y: -1, w: 2, d: 2, r: 0.2 };
const PIVOT_Z = 90;
const KNUCKLE_R = 0.6;
const CORK_Z = PIVOT_Z + KNUCKLE_R;
const CORK_H = 4;
const ARM = { x: BOSS.x + BOSS.w, y: -0.6, w: CORK.x - (BOSS.x + BOSS.w), d: 1.2, r: 0 };
const ARM_Z = CORK_Z + CORK_H - 1.2;
const BOB_R = 2.4;
const BOB_FLAT = 2.2;
const THREAD_R = 0.12;

const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);

/** Build the scene: the stage markup, the runtime data and the CSS, for the server to render. */
export function buildPendulum() {
  const P = k.fitProjection(
    k.boxCorners({ x: -TABLE_R, y: -TABLE_R, w: 2 * TABLE_R, d: 2 * TABLE_R }, -3, ROD_TOP),
    WIDTH,
    HEIGHT,
    { pad: 20, azimuth: 40, elevation: 28 },
  );
  const R = A.recorder(P);
  const T = turning(P, { recorder: R });
  const bench = T.group("bench", { turn: { pivot: [0, 0] } });
  const swing = T.group("swing", {
    parent: bench,
    hinge: { point: [0, 0, PIVOT_Z], axis: [0, 1, 0], range: [-SWING_RANGE, SWING_RANGE] },
  });
  const layer = T.layer("bench");
  T.stack(["bench"]);
  const on = { group: bench, layer };

  T.round({
    name: "bench.top",
    ...on,
    F: VERT(0, 0),
    s0: -3,
    s1: 0,
    r: TABLE_R,
    tone: "mid",
    crease: "faint",
  });
  T.prism({ name: "stand.base", ...on, plan: BASE, z: 0, h: BASE_H, bevel: 0.4, tone: "mid" });
  T.round({
    name: "stand.rod",
    ...on,
    F: VERT(...ROD),
    s0: BASE_H,
    s1: BOSS_Z,
    r: ROD_R,
    tone: "hi",
  });
  T.prism({ name: "stand.boss", ...on, plan: BOSS, z: BOSS_Z, h: BOSS_H, bevel: 0.3, tone: "mid" });
  T.round({
    name: "stand.rod.top",
    ...on,
    F: VERT(...ROD),
    s0: BOSS_Z + BOSS_H,
    s1: ROD_TOP,
    r: ROD_R,
    tone: "hi",
  });
  T.prism({ name: "clamp.arm", ...on, plan: ARM, z: ARM_Z, h: 1.2, tone: "mid" });
  T.prism({ name: "clamp.cork", ...on, plan: CORK, z: CORK_Z, h: CORK_H, bevel: 0.2, tone: "hi" });

  const hinge = { group: swing, layer };
  T.round({
    name: "swing.knuckle",
    ...hinge,
    F: G.frameOf([0, -KNUCKLE_R, PIVOT_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
    s0: 0,
    s1: 2 * KNUCKLE_R,
    r: KNUCKLE_R,
    tone: "mid",
  });
  const threadTop = PIVOT_Z - KNUCKLE_R;
  const bobZ = PIVOT_Z - LENGTH;
  T.round({
    name: "swing.thread",
    ...hinge,
    F: G.frameOf([0, 0, threadTop], [0, 0, -1], [1, 0, 0], [0, 1, 0]),
    s0: 0,
    s1: threadTop - (bobZ + BOB_FLAT),
    r: THREAD_R,
    tone: "hi",
  });
  T.ball({
    name: "swing.bob",
    ...hinge,
    c: [0, 0, bobZ],
    r: BOB_R,
    flats: [{ n: [0, 0, 1], d: BOB_FLAT }],
    lit: true,
  });

  // The reachable states: every turn, and the swing finely enough that the painting order the
  // build fixes in the bench's frame holds between samples (the order between the swing and the
  // stand does not depend on the turn, only on the swing).
  const poses = [];
  for (let turn = 0; turn < 360; turn += 2)
    for (const s of [-SWING_RANGE, 0, SWING_RANGE]) poses.push({ bench: turn, swing: s });
  for (let s = -SWING_RANGE; s <= SWING_RANGE; s += 0.25) poses.push({ bench: 0, swing: s });
  const out = T.build({ statics: R.items, poses });
  return {
    audit: { T, R, P },
    stage: out.layerSvg("bench", { width: WIDTH, height: HEIGHT }),
    data: out.data,
    css: out.css,
    report: { parts: out.report.parts, seconds: out.report.seconds, layers: out.report.layers },
  };
}
