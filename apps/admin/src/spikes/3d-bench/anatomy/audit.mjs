// The kit's audits for the spike's pendulum (ADR 0036). Run from apps/admin:
//   bun src/spikes/3d-bench/anatomy/audit.mjs --audit           the full orbit audit (slow; the proof)
//   bun src/spikes/3d-bench/anatomy/audit.mjs --audit --quick   about ten times fewer states
import * as A from "../../anatomy-kit/audit.mjs";
import * as TA from "../../anatomy-kit/turn-audit.mjs";
import { buildPendulum, SWING_RANGE } from "./scene.mjs";

const quick = process.argv.includes("--quick");
const { audit } = buildPendulum();
const { T, R, P } = audit;
A.settle(R, P);
A.auditOrExit(R, P);
// One full swing (amplitude 8°, inside the proved range), every frame at 60 fps.
const swingAt = (t) => ({ bench: 30, swing: 8 * -Math.cos(2 * Math.PI * (t / 1.8)) });
TA.orbitOrExit(T, R, P, {
  sweep: { at: (x) => ({ bench: x, swing: 0 }), from: 0, to: 360, frame: 0.3 },
  clips: [{ name: "swing", at: swingAt, from: 0, to: 1.8, frame: 1 / 60 }],
  poses: [-SWING_RANGE, SWING_RANGE].flatMap((s) =>
    Array.from({ length: 36 }, (_, i) => ({ bench: i * 10, swing: s })),
  ),
  quick,
});
