# Landing page: brief

This brief covers the second Phase 5 item (master plan, "Landing page: shader hero, isometric
cards, product demos"). It is written for review before anything is built.

The approved board, `design/mockups/Main.dc.html` (D28, ADR 0028), is the specification. It runs:

1. a sticky header that turns into a floating bar;
2. a centred hero over a live double-slit experiment;
3. "Time it yourself", the draggable pendulum with the count-from-zero or one coach;
4. "Every part has a job", the exploded pendulum stand with a note on every part;
5. "Caught the moment it happens", the coach cursor demo;
6. four live experiment cards;
7. the feature bento;
8. teacher sign-up beside the student class-code join;
9. the large-type footer with a status light.

Today `/` is a holding page. The decisions below are what the board leaves open, or where it no
longer matches the code or the rules.

- **Status:** draft, waiting for Mortey.

## The decisions

### 1. The hero is the board's double slit, on the physics package, in a 2D canvas

D28 replaced the plan's "shader of interfering waves" with the double slit, so the hero draws
particles landing one at a time. It cycles through four scenes: two slits, two slits with a
which-slit detector, one slit and four slits.

- **Physics.** The board's mockup computes the patterns in its own script. They move to a new
  `packages/physics/src/diffraction.ts`: Fraunhofer intensity for N slits of width _a_ and spacing
  _d_. With a which-slit detector, the pattern is the sum of the two single-slit patterns, with no
  interference term. Tests check it against the analytic limits and a new independent Python model
  in `validation/`. It needs a physics reviewer's approval (AGENTS.md rule 1). The slit sizes and
  wavelength become named constants, so the stripes come from real numbers, not a fitted curve.
- **Canvas 2D, not WebGL.** The board draws dots on a 2D canvas, which runs on every phone with no
  WebGL fallback to write. "Shader hero" in the plan item is met by this live physics background;
  no WebGL shader is built. The alternative is a WebGL version for capable devices, with more code
  and nothing visibly better at this dot size.
- **Never in the way of the text.** The headline, the lines under it and the buttons are
  server-rendered HTML. They are the page's Largest Contentful Paint. The canvas starts only after
  the page has loaded and the browser is idle. It pauses when it is off screen or the tab is hidden.

### 2. Lite mode and reduced motion

The plan says Lite mode has "no 3D, no shader, decorative motion off". Lite mode itself (the
settings switch and automatic offer) is not built yet. This item adds the detection it will use,
as `useLite()` in `apps/web`, true when any of these hold:

- the device reports 2 GB of memory or less;
- Save-Data is on;
- the connection is 2G or slow 2G;
- the visitor prefers reduced data.

In Lite mode, or with reduced motion, nothing on the page animates:

- **The hero** draws one finished pattern, 9,000 particles from the physics, once, then stops.
- **The pendulum** stays draggable but does not swing until the visitor lets it go.
- **The coach demo** shows its final frame.

The full Lite mode switch stays its own item.

### 3. No GSAP

The plan's stack lists GSAP for the landing page's scroll story. The approved board has no scroll
story: the exploded stand is a slider, and every other animation is a small loop. CSS transitions
and a few lines of React do all of it, so GSAP (about 25 KB compressed) is not added. I'll record
this in ADR 0045 so the plan and the code agree.

### 4. Every number from the physics

All of these are computed, as the board's script already does:

- **"Time it yourself":** swing, period and g from `packages/physics` (`periodExact`,
  `recordedPeriod`, `gFromPeriod`).
- **Its coach line:** from `packages/experiments` (`countFromOneErrorPercent`).
- **The experiment cards:** readings from each experiment's own model, with a fixed seed, so a
  screenshot is reproducible.
- **The bento:** the exam countdown starts from the exam's real duration.

Nothing is typed in. A test fails if a number in the page's HTML is not in a list the physics
produced.

### 5. Four cards, six labs

There are six labs today: the four flagship experiments, plus the pins method for the lens and
the hot solid for mixtures. I propose keeping the board's four cards. Each card names its methods
("Converging lens: screen, or two pins"; "Method of mixtures: two liquids, or a hot solid"), and
the title becomes "Four experiments, built deep.", dropping "at launch", which dates it. The
alternative is six cards, which breaks the board's row of four.

### 6. Sign-up and join need their screens

The board's last section has a school-email form for teachers and a class-code box for students.
The API for both was built in Phase 3, but the web app has no `/sign-in` or `/join` screen yet.
Both have approved boards, `SignIn.dc.html` and `Join.dc.html`. Without them the two forms have
nowhere to go. I propose building both screens in this item, in its third pull request (decision
8), exactly to their boards:

- The landing form sends the email to the API and opens "Check your email".
- The class code opens the join notices.
- Neither puts an email or code in a URL.

The alternative is a separate item before the landing page.

### 7. Links, the status light and claims

- **Header and footer links** go only to pages that exist: the labs, `/teach` and the sections of
  this page. Help centre, Report a problem, What's new, About, Terms, Privacy, Children and schools,
  and Cookie settings are left out until their pages exist. The legal pages wait for UEW's review
  (Phase 6), and About and the people pages are item 4. Nothing links to a dead page.
- **The status light** asks the API's `/health` after the page has loaded:
  - green, "All systems normal", when it answers;
  - amber, "Can't reach the server: the lab still works offline", when it doesn't.
    It is never typed in as green.
- **Claims on the board I need you to confirm, or I'll soften them:**
  - "Free for every student and every school."
  - "Made in Winneba, Ghana."
  - "It's the most common mistake in the WASSCE pendulum practical." Without a source, I'd write
    "A common mistake in the WASSCE pendulum practical".

### 8. Three pull requests, ticked on the last

The page is too big to review as one diff. I propose three stacked pull requests for this one item,
each with the board screenshot beside the build:

1. **Header, hero (with the diffraction physics and its validation), the call to action and the
   footer.** This is the part that decides LCP and CLS.
2. **"Time it yourself", "Every part has a job" and "Caught the moment it happens".**
3. **The experiment cards, the bento, sign-up and join, with the `/sign-in` and `/join` screens.**

The item is ticked in the third.

### 9. Performance, measured before and after

Today's landing page, measured on a production build (Pixel 7, slow 4G, CPU 4×, median of 5):

| LCP    | CLS | Bytes transferred |
| ------ | --- | ----------------- |
| 996 ms | 0   | 271 KB            |

The holding page is tiny, so the budgets, not today's numbers, are the bar:

| Measure                 | Budget                             |
| ----------------------- | ---------------------------------- |
| LCP, slow 4G            | 2.5 s or less (existing e2e test)  |
| CLS                     | 0 (new e2e test)                   |
| INP                     | 200 ms or less (new e2e test)      |
| JavaScript for the page | the shell's 200 KB (existing test) |

To get there, following Chrome's modern web guidance:

- Every canvas and figure has explicit width and height, or `aspect-ratio`.
- Sections below the first screen get `content-visibility: auto` with `contain-intrinsic-size`
  set to their measured height.
- Each live part loads as its own client island, only once it nears the screen.
- No images are downloaded: the apparatus is inline SVG from `packages/apparatus`.
- Fonts stay on `next/font` with `display: swap` and matched fallback metrics.

Every pull request reports LCP, CLS, INP and bytes, before and after.

### 10. Proof

- Unit tests for the diffraction physics and the Python model.
- An end-to-end test per section, checking its numbers against the physics and its keyboard
  access (each slider and each drag also works with the arrow keys).
- An accessibility test for the page.
- Screenshots at 1440 px and 390 px beside the board.

## What I need from you

1. Approval of this brief, or changes.
2. Decision 5: four cards, or six.
3. Decision 6: build `/sign-in` and `/join` in this item, or as their own item first.
4. Decision 7: the three claims.
5. Decision 8: three pull requests for this item.
6. A physics reviewer for the diffraction module. Is it you, Dr Acquah, or someone else?
