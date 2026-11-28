# Design: the approved mockups

The screens in `mockups/` were designed and approved on the Phase 0 design canvas
(claude.ai/artifact/NUVrA7XN8LsNdYNFzJ19iJ). **They are the specification.** Each screen in the
apps is rebuilt from its mockup: same layout, copy, colours, spacing, states and interactions.

| Board                              | File                         | Screenshot             | Builds into                                                |
| ---------------------------------- | ---------------------------- | ---------------------- | ---------------------------------------------------------- |
| Landing page                       | `Main.dc.html`               | `screens/Main.jpg`     | `apps/web` `/`                                             |
| Lab, desktop                       | `Lab.dc.html`                | `screens/Lab.jpg`      | `apps/web` lab                                             |
| Lab, phone                         | `LabPhone.dc.html`           | `screens/LabPhone.jpg` | `apps/web` lab at phone width                              |
| Joining a class                    | `Join.dc.html`               | `screens/Join.jpg`     | `apps/web` join flow                                       |
| Table builder and graph sheet      | `Table.dc.html`              | `screens/Table.jpg`    | `apps/web` steps 6 and 7                                   |
| Report and labelled export         | `Report.dc.html`             | `screens/Report.jpg`   | `apps/web` step 10                                         |
| Snapshot notebook                  | `Notebook.dc.html`           | `screens/Notebook.jpg` | `apps/web` notebook                                        |
| Review, retry and compare          | `Review.dc.html`             | on the canvas only     | `apps/web` review                                          |
| Exam mode                          | `Exam.dc.html`               | on the canvas only     | `apps/web` exam                                            |
| Ohm's law: wiring, measuring       | `Ohms.dc.html`               | on the canvas only     | `apps/web` `/lab/ohms-law`                                 |
| Converging lens: the image         | `Lens.dc.html`               | on the canvas only     | `apps/web` lens lab                                        |
| Converging lens: two pins          | `Pins.dc.html`               | on the canvas only     | `apps/web` lens lab, pins                                  |
| Method of mixtures                 | `Mixtures.dc.html`           | on the canvas only     | `apps/web` mixtures lab                                    |
| Mixtures, a hot solid              | `MixturesSolid.dc.html`      | on the canvas only     | `apps/web` hot-solid lab                                   |
| Model check, your lab data         | `ModelCheck.dc.html`         | on the canvas only     | `apps/web` `/lab/<id>/check`                               |
| Uncertainties, advanced layer      | `Uncertainty.dc.html`        | on the canvas only     | `apps/web` steps 6 to 8                                    |
| First-run tour                     | `Tour.dc.html`               | `screens/Tour.jpg`     | `apps/web` onboarding                                      |
| Adding signed-out work             | `Adopt.dc.html`              | approved 2026-11-19    | `apps/web` after sign-in or join                           |
| Teacher sign-in                    | `SignIn.dc.html`             | approved 2026-11-19    | `apps/web` `/sign-in` (built)                              |
| Consent and your data              | `Privacy.dc.html`            | approved 2026-11-19    | `apps/web` settings, class page                            |
| AI help                            | `AI.dc.html`                 | approved 2026-11-19    | `apps/web` lab, report, `/teach`                           |
| Questions                          | `Questions.dc.html`          | approved 2026-11-19    | `/teach/questions`, admin bank                             |
| Admin AI                           | `AiAdmin.dc.html`            | approved 2026-11-19    | `apps/admin` `/ai`                                         |
| Teacher live class                 | `Teacher.dc.html`            | `screens/Teacher.jpg`  | `apps/web` teacher dashboard                               |
| Teacher classes, start             | `TeacherStart.dc.html`       | approved 2026-11-19    | `apps/web` `/teach`, live extras                           |
| Admin portal                       | `Admin.dc.html`              | `screens/Admin.jpg`    | `apps/admin`                                               |
| Logo                               | `Logo.dc.html`               | `screens/Logo.jpg`     | `packages/ui` logo component                               |
| Logo set                           | `LogoSet.dc.html`            | approved 2026-11-19    | `packages/ui/brand`, app icons                             |
| Experiment page                    | `ExperimentPage.dc.html`     | approved 2026-11-25    | `apps/web` `/experiments/<id>`                             |
| Team, partners, contribute, donate | `People.dc.html`             | draft for approval     | `apps/web` `/about`, `/partners`, `/contribute`, `/donate` |
| Landing page, revised              | `Landing.dc.html`            | approved 2026-11-26    | `apps/web` `/`                                             |
| Practicals page                    | `Practicals.dc.html`         | approved 2026-11-26    | `apps/web` `/experiments`                                  |
| Lab, revised                       | `LabOpen.dc.html`            | draft for approval     | `apps/web` lab                                             |
| Simulations page                   | `Simulations.dc.html`        | approved 2026-11-27    | `apps/web` `/simulations`                                  |
| Simulation screen                  | `Simulation.dc.html`         | approved 2026-11-27    | `apps/web` `/simulations/<id>`                             |
| Landing page, simulations          | `LandingSimulations.dc.html` | approved 2026-11-27    | `apps/web` `/`, header, footer, topic menus                |
| Lab overhaul: bench with labels    | `LabLabels.dc.html`          | draft for approval     | `packages/apparatus`, lab "Labels" switch                  |
| Lab overhaul: part card            | `PartCard.dc.html`           | draft for approval     | lab part cards, "Meet the apparatus"                       |
| Lab overhaul: apparatus shelf      | `ApparatusShelf.dc.html`     | draft for approval     | lab Build step, picking apparatus                          |
| Lab overhaul: coach on the bench   | `LabCoach.dc.html`           | draft for approval     | lab coach (wiring, Show me, Fix it for me)                 |
| Lab overhaul: skill drills         | `SkillDrill.dc.html`         | draft for approval     | lab, before an instrument is first used                    |
| Lab overhaul: precise control      | `PreciseControl.dc.html`     | draft for approval     | lab position controls                                      |

The lab overhaul boards have desktop and phone screenshots in `screens/lab-overhaul/`. Their
apparatus is drawn with the Anatomy kit, and their example readings come from the Ohm's law
model (`packages/physics` terminal-pd).

The `.dc.html` files are the source: open them on the canvas to see every state and interaction.
The screenshots were taken without web fonts, so type looks slightly different; the canvas is
the reference for type.

## How a screen is accepted

1. Build it with components and tokens from `packages/ui` (no one-off colours or radii). The
   catalogue at `/design-system` in the admin app shows every component in all four themes.
2. Take a screenshot at the same size as the mockup and attach both to the pull request.
3. Any difference from the mockup is either fixed or listed in the pull request and approved
   by Mortey before merge.
4. Live parts (the double-slit hero, the draggable pendulum, the isometric experiment cards,
   the exploded apparatus) run on `packages/physics`, never on typed-in numbers.

## Rules that apply to every screen

These were agreed in the mockup round and override any mockup that missed them:

- **Square corners (Lyra).** Zero radius on buttons, inputs, cards, chips, menus, dialogs,
  toasts and tooltips. Only things that are round in reality stay round: status dots, the bob,
  progress rings, the stopwatch.
- **The pendulum P logo.** The bob is the only red-orange (#F0482A) part.
- **No dummy content (D29).** Every number is computed from the physics or is a stated fact.
  Dashboards show example data only behind a visible "Example data" or "Example class" label.
- **Sentence case.** No all-caps labels or monospace eyebrow text. Monospace is for numbers,
  units and codes.
- **One dashboard pattern** for teacher and admin: headline tiles with a "View…" link, hatched
  bar charts, a needs-attention list with chips, a detail drawer with one main action, an undo
  toast, search on / and ⌘K, collapsible navigation groups.
- **Graphs download in colour or black and white (D31).**
- **Accessibility floor:** keyboard focus visible, reduced motion respected, contrast checked,
  every interactive part labelled.
