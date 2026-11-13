# Design: the approved mockups

The screens in `mockups/` were designed and approved on the Phase 0 design canvas
(claude.ai/artifact/NUVrA7XN8LsNdYNFzJ19iJ). **They are the specification.** Each screen in the
apps is rebuilt from its mockup: same layout, copy, colours, spacing, states and interactions.

| Board                         | File                    | Screenshot             | Builds into                   |
| ----------------------------- | ----------------------- | ---------------------- | ----------------------------- |
| Landing page                  | `Main.dc.html`          | `screens/Main.jpg`     | `apps/web` `/`                |
| Lab, desktop                  | `Lab.dc.html`           | `screens/Lab.jpg`      | `apps/web` lab                |
| Lab, phone                    | `LabPhone.dc.html`      | `screens/LabPhone.jpg` | `apps/web` lab at phone width |
| Joining a class               | `Join.dc.html`          | `screens/Join.jpg`     | `apps/web` join flow          |
| Table builder and graph sheet | `Table.dc.html`         | `screens/Table.jpg`    | `apps/web` steps 6 and 7      |
| Report and labelled export    | `Report.dc.html`        | `screens/Report.jpg`   | `apps/web` step 10            |
| Snapshot notebook             | `Notebook.dc.html`      | `screens/Notebook.jpg` | `apps/web` notebook           |
| Review, retry and compare     | `Review.dc.html`        | on the canvas only     | `apps/web` review             |
| Exam mode                     | `Exam.dc.html`          | on the canvas only     | `apps/web` exam               |
| Ohm's law: wiring, measuring  | `Ohms.dc.html`          | on the canvas only     | `apps/web` `/lab/ohms-law`    |
| Converging lens: the image    | `Lens.dc.html`          | on the canvas only     | `apps/web` lens lab           |
| Converging lens: two pins     | `Pins.dc.html`          | on the canvas only     | `apps/web` lens lab, pins     |
| Method of mixtures            | `Mixtures.dc.html`      | on the canvas only     | `apps/web` mixtures lab       |
| Mixtures, a hot solid         | `MixturesSolid.dc.html` | on the canvas only     | `apps/web` hot-solid lab      |
| Model check, your lab data    | `ModelCheck.dc.html`    | on the canvas only     | `apps/web` `/lab/<id>/check`  |
| First-run tour                | `Tour.dc.html`          | `screens/Tour.jpg`     | `apps/web` onboarding         |
| Teacher live class            | `Teacher.dc.html`       | `screens/Teacher.jpg`  | `apps/web` teacher dashboard  |
| Admin portal                  | `Admin.dc.html`         | `screens/Admin.jpg`    | `apps/admin`                  |
| Logo                          | `Logo.dc.html`          | `screens/Logo.jpg`     | `packages/ui` logo component  |

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
