# 0049. Simulations: a second area beside the practicals

- Status: accepted (Mortey, 2026-11-26, in chat)
- Date: 2026-11-26
- Changes: the lab overhaul plan's "explore mode inside each practical" (master plan, Phase 8)
  becomes its own area (Phase 9)

## Context

The practicals are marked, step-by-step work: build, measure, tabulate, plot, analyse, report.
Mortey also wants the free exploration PhET and oPhysics offer: change a quantity and watch the
physics answer, with no steps and no marks. The overhaul plan first put that inside each practical
as an "explore mode". Mortey changed his mind: exploration should be its own part of the app, so a
visitor can open a simulation without starting a practical, and simulations can cover topics that
have no practical yet (waves and sound has none).

Physics Bench, the earlier project, has three waves-and-sound models: a sonometer (a stretched
wire), a resonance tube and a Helmholtz resonator. Its figures did not feel like real apparatus.

## Decision

- Physics Anatomy has two areas: **Practicals** (`/experiments`, `/lab/…`) and **Simulations**
  (`/simulations`, `/simulations/<id>`). The header, the topic menus and the landing page show both.
- Simulations start with three, all waves and sound: the vibrating string (sonometer), the
  resonance tube and the Helmholtz resonator. Their models are taken from Physics Bench, reviewed
  and rewritten in `packages/physics`, as every harvested module is (master plan, "What we carry
  over").
- A simulation is real-world: the apparatus is drawn with the Anatomy kit to look like the real
  object, it sounds like it (synthesised in the browser, offline), and the hidden physics (the
  standing wave, the moving air) is drawn on top of it as a layer the visitor can switch.
- A simulation has no steps, marks, coach or report. It has sliders with typed values, play,
  pause and slow motion, layers, live readouts and a live graph, sound, a snapshot, and a link to
  the related practical when there is one.
- All simulations share one screen, so a feature added once reaches every simulation (as the lab
  frame does for practicals).
- Simulations follow the same rules as practicals: every number comes from `packages/physics`,
  models are tested against the analytic result and the independent Python model in
  `validation/`, a physics reviewer approves them, and they work offline.

## Consequences

- The overhaul plan's explore-mode item moves to Phase 9; the practicals keep their steps and
  their coach.
- New boards are needed before building: the Simulations page, the simulation screen and the
  landing page's Simulations section.
- The "Waves and sound" topic, empty until now, gets content.
- Each new simulation is a model, its figures, and one definition on the shared screen.

## Alternatives considered

- **Explore mode inside each practical.** Rejected by Mortey: exploration is hidden behind a
  practical, and topics with no practical get none.
- **Embed PhET simulations.** Rejected: they are not real apparatus, not drawn in our style, and
  not offline on our terms (master plan, Landscape and gaps).
