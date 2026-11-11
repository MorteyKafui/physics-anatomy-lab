# 0036. The turnable 3D bench uses Anatomy 3D

- Status: accepted (Mortey, 2026-11-11, on merging PR #26)
- Date: 2026-11-11
- Decision log entry: D36 in `docs/planning/00-decisions.md`

## Decision

The turnable 3D bench (master plan, "Turnable 3D bench (capable devices, opt-in)") is built with
the Anatomy kit's 3D mode, not React Three Fiber. It stays opt-in, and the SVG bench stays the
default on every device.

## The spike

Phase 1 asked for a spike, because Anatomy's 3D mode is in beta. The same pendulum was built twice
in the admin app (`apps/admin/src/app/spikes/3d-bench`), team only. The scene is a round bench
top, a base, a retort stand, a boss and clamp arm, a cork, an 80 cm thread and a bob. The bench
turns by drag or the arrow keys, and the bob swings with `bobAngle` and `benchPeriod` from the
physics packages. Both use the figure tokens from `packages/ui`.

- **Anatomy 3D:** 10 parts, solved once on the server at build time (1.4 s). The browser gets
  the drawn rest pose and the kit's runtime, which re-projects and re-shades every part each frame
  and paints them in an order solved from separating planes.
- **React Three Fiber:** three 0.186.1 and fiber 9.8.2, the same parts as meshes with one light,
  through an orthographic camera at the Anatomy figure's angle (40° round, 28° up).

## What was measured

`e2e/tests/spike-3d-bench.performance.spec.ts`, Pixel 7 size, CPU slowed 6×, the median of five
runs on the build machine:

|                                          | Anatomy 3D            | React Three Fiber       |
| ---------------------------------------- | --------------------- | ----------------------- |
| JavaScript added to the page, compressed | 36 KB                 | 247 KB                  |
| Frame rate while the bob swings          | 58.0 fps              | 45.2 fps                |
| Frame rate while the bench is turned     | 40.8 fps              | 37.6 fps                |
| JavaScript heap                          | 7–10 MB               | 8–9 MB                  |
| With WebGL turned off                    | Draws and turns (SVG) | A "needs WebGL" message |

The admin shell the pages share is 134 KB. Both benches meet the plan's 30 fps on the emulated
phone. Headless Chrome draws WebGL in software, so the React Three Fiber frame rates may differ on
a real phone's GPU; the real-phone run (`docs/how-to/benchmark-phone.md`) should cover both.

The kit's full audit (`apps/admin/src/spikes/3d-bench/anatomy/audit.mjs --audit`, 181 s) proves
the painting order and the contacts. Over 3,393 order states and 901 posed states there are no
unseparated pairs, cycles, forced picks, swaps, layer faults or parts passing through each other,
and the kit audit at rest passes.

Its continuity line reports 720 failures. All of them are the thread's and the bob's outline
moving up to 0.106 px more than the line's bound allows in a 0.5° step. The bound is wrong for
this figure: it takes a hinged part's reach as its distance from a vertical axis, which is right
for a turn but not for a pendulum's horizontal hinge, so the hanging thread gets a reach of almost
nothing. The halving test, which is the check for real jumps, found none in 400. This goes
upstream to the kit.

## Why Anatomy 3D

- **It fits the budget.** 36 KB against 247 KB. The lab is at 338 of its 350 KB, so the 3D bench
  loads on its own either way, but 247 KB more on slow 4G is about a second and a quarter more of
  download, and more of the 3 MB offline pack.
- **It works without WebGL.** It is SVG, so phones with WebGL turned off or blocked, common on
  the low-cost phones the plan targets, still get the turning bench.
- **It looks like the rest of the lab.** The turning figure is the same Anatomy drawing as the 2D
  bench, the print sheets and the report figures: hairlines, four-tone shading and the lit bob.
  The three version would need its own line-art styling to match.
- **It is as fast or faster** at these sizes, while swinging and while turning.

## What it costs, and the risks

- **The engine is in beta.** This pendulum is one of its first production figures. Keep the
  kit pinned, and run the full audit on every 3D figure.
- **Authoring is strict.** Every part must be convex, and parts that touch must meet flush. A
  hinge needs a knuckle disc, the rod is split around the boss, and the thread meets a flat on the
  bob. The build must be given every reachable state, or the order between samples can be wrong
  (the first audit run found this).
- **It only turns about a vertical axis.** The camera's height is fixed. A student cannot look
  down on the bench from above or from eye level. If a later experiment needs a free camera, that
  experiment can reopen this decision.
- **Not yet tested:** building the apparatus part by part in 3D, and denser scenes: Ohm's law
  wiring (the kit's tube rules), and the converging lens with rays (a WebGL layer). Phase 2's
  "3D bench for every experiment" should prove one of those first.
- **Licence.** The kit is MIT (© 2026 Ryan). When it moves to `packages/apparatus` it gets an
  entry in the licences inventory.

## Consequences

- The 3D bench is built from `apps/admin/src/spikes/3d-bench/anatomy` into `packages/apparatus`
  when its screen is designed. It needs a mockup first (design README).
- The React Three Fiber prototype, three and fiber are removed from the admin app once this is
  accepted, and the Physics Bench React Three Fiber benches are dropped rather than rewritten
  (harvest review).
