# The open lab and the landing, practicals and lab redesign: brief

Written for review before anything is built. On 2026-11-26, ahead of a local presentation,
Mortey asked for two things:

1. **Open the lab to anyone**, like PhET and oPhysics: no sign-in or sign-up. The admin portal
   still shows how many people use the lab and which experiments they use most.
2. **A better design** for the public app, starting with the landing page. This improves the
   approved design; it does not rebuild it. Its colours, live demos, Anatomy figures and large
   footer wordmark stay, and so do Lyra's square corners.

- **Status:** decisions taken in chat on 2026-11-26. A first "anatomy plate" draft was set
  aside the same day: Mortey found it a step down from the approved design, because it dropped
  the colours. The three boards below replace it, as **drafts for approval**. They are also on
  the design canvas (canvas.json `Landing`, `Practicals`, `LabOpen`).
- **Decision records:** [0047](../adr/0047-open-lab-accounts-off.md) (accounts off) and
  [0048](../adr/0048-anonymous-usage-counts.md) (anonymous usage counts).
- **The six practicals are the first six.** More follow after launch, so no page says how many
  there will be or that more are being made.

## 1. The boards

| Board                | Builds into               | Built from                |
| -------------------- | ------------------------- | ------------------------- |
| `Landing.dc.html`    | `apps/web` `/`            | `Main.dc.html` (approved) |
| `Practicals.dc.html` | `apps/web` `/experiments` | the landing board's cards |
| `LabOpen.dc.html`    | `apps/web` lab            | `Lab.dc.html` (approved)  |

The Anatomy figures on every board are the approved ones, drawn with the Anatomy kit (ADR 0036,
the `anatomy` skill). Built, they come from `packages/apparatus`, and every reading from
`packages/physics`. The two-pins and hot-solid figures reuse the lens and calorimeter figures on
the board; their own figures are drawn with the kit when the page is built.

## 2. The landing page: what changes and what stays

**Stays:** the dark hero with the live double slit; the draggable pendulum ("Time it
yourself"); the exploded stand ("Every part has a job"); the coach's cursor demo ("Caught the
moment it happens"); the dark feature grid with its live parts (voice, offline switch, exam
clock, colour or black-and-white graph); the orange band; the large footer wordmark; the topic
colours and the pastel grounds behind each apparatus.

**Changes:**

- **The hero shows every practical's setup.** Beside the headline, a bench panel with six tabs,
  one per practical, in its topic colour. Choosing one shows its apparatus on its pastel ground,
  its live readings and its aim, with "Open this lab". The bob swings; part notes open on hover.
  The tabs move on by themselves every 7 seconds until the visitor picks one, with a pause
  button. The main button follows the choice: "Open the lens lab".
- **The headline** loses the outlined second line. Its full stop is the logo's red-orange bob.
- **The experiment cards section goes.** Its figures and colours now live in the hero, and the
  practicals page has the full list.
- **The orange band** no longer signs anyone up. Students get the six practicals as links;
  teachers get the selected practical's link to copy, for a class or a projector.
- **Header:** Practicals, How it works, The coach, About, and "Open the lab". No log in, sign up
  or "works offline" label.
- **Footer:** the wordmark stays. Links that led to pages that don't exist go (help centre,
  status, cookie settings); About links to the team, partners, contribute and donate pages.
- **Copy:** "Everything a real lab gives you. Plus a teacher who never gets tired." becomes
  "Everything you need for the practical, in one tab." The exam clock's caption no longer
  mentions a teacher.

## 3. The practicals page

The six practicals as cards in the landing page's colours: each apparatus on its pastel ground,
its topic, a live reading badge, the aim and the apparatus list, with "Open the lab" and "About
this practical". Topic filters (All, Mechanics, Electricity, Light, Heat) work. Cards lift on
hover. The page ends with a line for teachers and the same footer wordmark.

## 4. The lab

The approved lab stays as it is, with two additions:

- **Switch practical:** the practical's name in the top bar opens a menu of all six, in their
  topic colours. Work on each stays on the device.
- **Share link:** copies the practical's link, for a teacher to send.

Steps not built yet stay out of the step rail, and no screen mentions them.

## 5. Admin

No visual change (ADR 0030). The Usage area reads the anonymous counts (ADR 0048).

## 6. Build order

Each is one pull request. 1 and 2 don't depend on the boards.

1. **Accounts off** (ADR 0047).
2. **Anonymous usage counts** (ADR 0048).
3. **Landing page** from `Landing.dc.html`.
4. **Practicals page** from `Practicals.dc.html`, and the experiment pages' links to it.
5. **Lab additions** from `LabOpen.dc.html`, and hiding unbuilt steps.
6. **Reading pages, 404 and offline:** account wording removed.

## 7. Tools

Used here: the impeccable skill (critique, and `impeccable shot` renders), the Anatomy kit's
approved figures, and the design canvas. Stageshow, named in the master plan for the landing's
product shots, and the UI SDK aren't installed on this machine or in the repository; they'll be
used for the build once their source is known.
