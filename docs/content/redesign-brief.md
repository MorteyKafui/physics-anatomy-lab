# The open lab and the anatomy-plate redesign: brief

Written for review before anything is built. Mortey asked on 2026-11-26, ahead of a local
presentation, for two things:

1. **Open the lab to anyone**, like PhET and oPhysics: no sign-in or sign-up, while the admin
   portal still shows how many people use it and which experiments they use most.
2. **A redesign** of the whole public app, starting with the landing page: take out what reads
   as template "slop", make it feel made by people, keep Lyra (square corners) from shadcn.

- **Status:** decisions taken in chat on 2026-11-26 (accounts hidden behind a switch; a daily
  anonymous id; the anatomy-plate direction; the whole public app). The landing board
  `design/mockups/Plate.dc.html` is a **draft for approval**.
- **Decision records:** [0047](../adr/0047-open-lab-accounts-off.md) (accounts off) and
  [0048](../adr/0048-anonymous-usage-counts.md) (anonymous usage counts).

## 1. What's wrong with the current design

Reviewed in the browser on 2026-11-26 with the impeccable critique method. The physics is the
best thing on the page; the wrapping around it is the part that reads as generated.

| Where            | What reads as template                                                                                             | Why it hurts                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Hero             | Centred headline with an outlined second line, on a dark starfield                                                 | The most common AI landing hero there is; the double slit reads as stars, not physics |
| Header           | A bar that turns into a floating pill on scroll                                                                    | A UI-kit trope; it adds nothing a student needs                                       |
| Section rhythm   | Dark, light, dark, orange, dark bands, each a "section"                                                            | Every section shouts; nothing leads                                                   |
| Experiment cards | Equal cards on a peach-to-lavender gradient                                                                        | Gradient wash and equal cards are the two loudest generated tells                     |
| Features         | A bento grid of icon-free dark boxes with a title and a line each                                                  | The "feature bento" is the template; the real features are hidden in it               |
| Copy             | "Everything a real lab gives you. Plus a teacher who never gets tired." "Free for every student and every school." | Punchline copy; promises instead of showing                                           |
| Sign-up band     | Orange band with two forms                                                                                         | Goes away with accounts (ADR 0047)                                                    |
| Footer           | A giant cropped "Physics Anatomy" wordmark                                                                         | Another trope; it says nothing                                                        |
| Lab              | "This step's activity is built next in Phase 1." shown to visitors; an empty grid on the first step                | A visitor at the presentation sees an unfinished product                              |

What's already good and stays: the live pendulum with the count-from-zero-or-one demo, the
exploded stand with what each part does, the live table that fills as readings come in, the
coach's voice, snapshots with figure numbers, exam mode and the black-and-white graph download.
The redesign moves these to the front instead of wrapping them in sections.

## 2. The direction: the anatomy plate

The product is called Physics Anatomy and its demos already dissect apparatus. The redesign
takes that literally and stops decorating around it.

- **The world.** Each experiment is a plate from a scientific atlas: the real apparatus drawn
  in fine ink line on warm paper, numbered leader lines to its parts, and a specimen label in
  the corner carrying the live readings. Plates have a plate number and a caption, and the
  site's figures carry figure numbers, exactly as the lab's snapshots already do.
- **Ground and colour.** Warm paper (`--pa-bg` light site) and near-black ink. Hairline rules
  (1 px) and a double rule around each plate. Red-orange only on the bob and the one main
  action on a screen. Each topic keeps its hue, used only on its plate's marker and leader-line
  numbers.
- **Type.** Bricolage Grotesque for plate titles and the headline; Geist for reading; Geist Mono
  only for readings, units and codes, never as decoration.
- **First viewport.** One plate fills the screen: the pendulum, drawn large and swinging, its
  parts numbered 1 to 6 with leader lines. The plate's caption is the headline, "Physics from
  first principles.", with one sentence under it. The specimen label shows length, period and
  the value of g from the live simulation. The main action, **Open the pendulum lab**, sits on
  the plate where a reader's eye lands after the caption. Beside the drawing, a **list of
  plates** (the six practicals, each with its topic marker) is the working way to pick any
  experiment from the first screen.
- **Signature interaction.** Drag the bob: the pendulum swings, the readings in the specimen
  label change, and the coach writes a note in the plate's margin. Switch "start the count at
  zero / one" and the note explains the mistake. Point at a numbered part to read what it does.
  Reduced motion and Lite mode show the plate still, with the same numbers.
- **Visitor path.** Plate I (pendulum, the hero) → "How a practical runs": the lab's ten steps
  set as a practical book's method, with the live table filling beside it → Plates II to IV
  (Ohm's law, the lens, the method of mixtures) as an atlas spread, each with its drawing,
  specimen label and an "Open" action → "What you take away": a real exported figure with its
  caption, and the file formats → a colophon footer.
- **Cross-surface reach.** The experiments index becomes the atlas's list of plates. Each
  experiment page opens on its plate. The lab stays dark (a darkened practical room) but takes
  the plate's figure caption, leader-line labels for parts and the specimen label for readings.
  Reports already print as figures; they keep that. The people and legal pages are set as plain
  reading pages on the same paper.
- **Honest risk.** An atlas can feel old or academic to a 16-year-old. The live, draggable
  drawing and the coach's plain voice are what keep it alive; if the board feels dry, the fix is
  more movement in the drawing, not decoration around it.

### Removed from the site

The starfield hero and outlined text; the floating pill header (a plain bar with a hairline
rule instead); the pastel gradient; equal cards as page structure; the feature bento; the
orange sign-up band; the giant footer wordmark; "Log in" and "Sign up free" everywhere; and any
label stacked above a heading.

### Copy, rewritten to show instead of promise

| Now                                                                   | Proposed                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Everything a real lab gives you. Plus a teacher who never gets tired. | How a practical runs                                                                          |
| Free for every student and every school.                              | (removed; the footer says "Free and open. No account, no sign-in.")                           |
| Students can start without an account. Teachers sign up to …          | Send a student a link to any plate. Their work stays on their device.                         |
| Start an experiment / Sign up free                                    | Open the pendulum lab, and the list of plates                                                 |
| (footer wordmark)                                                     | "Every number on this site comes from the same equations as the lab." with the typefaces used |

## 3. Every surface, and what changes

| Surface                                             | Change                                                                                              | Board                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------- |
| Landing `/`                                         | Rebuilt as above                                                                                    | `Plate.dc.html` (draft) |
| Header and footer                                   | Plain bar: logo, Experiments, About; colophon footer; no account links                              | in `Plate.dc.html`      |
| Experiments index                                   | The list of plates: one row per practical with its small drawing, topic, aim and "Open"             | next board              |
| Experiment pages                                    | Open on the plate; aim, apparatus list keyed to the drawing's numbers, method, model card below     | next board              |
| Lab shell                                           | Dark; figure caption, specimen label for readings, leader-line part labels; no unfinished-step text | next board              |
| Steps not built yet                                 | Hidden from the step rail and never mentioned; the rail shows the steps that work                   | no board needed         |
| Report                                              | Unchanged layout; header and colours follow the new tokens                                          | none                    |
| About, partners, contribute, donate, Terms, Privacy | Reading pages on paper; Terms and Privacy lose the account sections (ADR 0047)                      | none                    |
| 404 and offline                                     | A blank plate: "Plate not found" and a link to the list of plates                                   | in a later board        |
| Admin                                               | No visual change (ADR 0030 stays). The Usage area reads the anonymous counts (ADR 0048)             | none                    |

The new parts go into `packages/ui` so every surface draws them the same way: `Plate` (frame,
double rule, plate number, caption), `LeaderLabel` (numbered call-out with its line),
`SpecimenLabel` (live readings in a ruled box) and `PlateIndex` (the list of plates). All square,
all on existing tokens; two tokens are added: `--pa-rule` (hairline ink) and `--pa-paper-deep`
(the plate's mat).

## 4. Build order

Each is one pull request. 1 and 2 don't depend on the boards and can start now, in parallel.

1. **Accounts off** (ADR 0047): the switch, redirects, links removed, Terms and Privacy updated.
2. **Anonymous usage counts** (ADR 0048): the device queue, `POST /usage/events`, the table and
   migration, the admin Usage area.
3. **Plate parts** in `packages/ui`, shown in the admin design-system catalogue.
4. **Landing page** from `Plate.dc.html`, once approved.
5. **Experiments index and experiment pages**, from their board.
6. **Lab shell**, from its board, and hiding unbuilt steps.
7. **Reading pages, 404 and offline.**

3 to 7 run in parallel once the boards are approved, except that 4 to 7 need 3 merged first.

## 5. Before the presentation

- Run the presentation from a production build (`bun run build`, then the `web-build` preview),
  not the dev server: it's faster and has no Next.js dev badge in the corner.
- Pick the experiment to demo now, so its every step is checked end to end before the day.
