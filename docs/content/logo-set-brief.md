# Final logo set: brief

The first Phase 5 item (master plan, "Final logo set: SVG, favicon, PWA icons, social card"),
written for review before anything is built. The mark itself is settled: the pendulum P (D27,
ADR 0027), drawn on the approved `Logo.dc.html` board, with the bob as the only red-orange part.
This item turns it into the files a website, an installed app and a shared link need.

The board for this brief is `design/mockups/LogoSet.dc.html`.

- **Status:** approved by Mortey on 2026-11-19: decisions 1 to 7 as proposed, including the red-orange favicon and downloading Bricolage Grotesque ExtraBold.

## What exists today

Built in Phase 1 (#25) and kept:

- `packages/ui/src/logo-paths.ts`, the one source of the geometry, and the `Logo` component.
- `apps/web` tab icon (32 px PNG), Apple home-screen icon (180 px) and install icons (192, 512 and
  a maskable 512), all drawn from `logo-paths.ts` at build time: the light P on the lab's ink.

Missing: SVG files anyone can use, an SVG favicon, `favicon.ico`, a social card, icons for the
admin portal, and a test that the set stays as approved.

## The decisions

### 1. One source, generated files

Every file is drawn from `logo-paths.ts` by a script (`bun run brand` in `packages/ui`), never
edited by hand. A test regenerates the set and fails if a committed file differs, so the mark
cannot drift between the header, the icons and the exports.

### 2. The SVG files, in `packages/ui/brand/`

| File                 | What it is                              | For                           |
| -------------------- | --------------------------------------- | ----------------------------- |
| `mark.svg`           | Ink P and thread, red-orange bob        | Light pages, colour print     |
| `mark-on-dark.svg`   | Light P and thread, red-orange bob      | The lab, admin, dark slides   |
| `mark-black.svg`     | All ink, bob included                   | Black-and-white print (D31)   |
| `mark-white.svg`     | All white, bob included                 | Single-colour print on dark   |
| `lockup.svg`         | Mark and "Physics Anatomy" side by side | Light pages, letters, posters |
| `lockup-on-dark.svg` | The same on ink                         | Dark pages                    |
| `lockup-black.svg`   | The same, all ink                       | Black-and-white print         |

The black and white versions keep the bob in the same colour as the letter: with one colour there
is nothing for the bob to stand out in, and a grey bob would print muddy.

The name in the lockups is Bricolage Grotesque ExtraBold, as on the board, turned into outlines
so it looks the same where the font is not installed. Rules shown on the board: clear space all
round equal to the P's stem width; the mark no smaller than 16 px, the lockup no narrower than
120 px; never recoloured, stretched, outlined or set on a busy picture.

### 3. The favicon follows the board: red-orange square, ink P

The approved board draws the favicon as an ink P on a red-orange square with no thread or bob,
because at 16 px they blur into a smudge. Today's tab icon is the light P on ink instead. I
propose following the board:

- **Site (`apps/web`):** `icon.svg`, `favicon.ico` (16, 32 and 48 px) and the 32 px PNG, all the
  red-orange square. The red-orange tab is easy to find among twenty others.
- **App icons stay on ink, bob included:** Apple 180 px and install icons 192 and 512 px, as now
  and as on the board's 72 px app icon. The maskable icon keeps the whole mark inside the safe
  circle (80% of the width).
- **Admin portal (`apps/admin`):** the ink square with the light P, so staff can tell an admin
  tab from a site tab at a glance. It gets no install icons; it is not installed.

This is the board's one exception to "the bob is the only red-orange part": on the square the
red-orange is the ground, and there is no bob. The alternative is to keep the ink favicon
everywhere, which matches the app icon but is hard to spot in a row of dark tabs.

### 4. The social card

One card for the whole site, 1200 × 630 px, used by WhatsApp, X, LinkedIn, Facebook and Slack
previews (`opengraph-image` and `twitter-image`). Each experiment gets its own card in item 3.

- The site's light theme: paper background, the colour mark large on the left, "Physics Anatomy"
  in Bricolage Grotesque, "Physics from first principles." and one line, "Build real
  experiments, take your own readings, and get coached." (the site's description, unchanged).
- A strip along the bottom in the colours of the topics that have experiments today (mechanics,
  heat, light, electricity), read from `packages/experiments`, so it grows when an experiment in a
  new topic is added and never shows a topic we have not built.
- No numbers, no screenshots, no address. The web address goes on once the domain is chosen.
- Alt text: "Physics Anatomy: physics from first principles."

### 5. Fonts for the images

Drawing the card and the lockups needs the font file itself, and the repository has only Noto
Sans (for the report's PDF). I propose committing Bricolage Grotesque ExtraBold (SIL Open Font
License, as Noto Sans is) beside it with its licence and a README, downloaded from the Google
Fonts repository on GitHub. **I need your yes to download it.** The fallback is Noto Sans Bold
for the card's name, which would not match the board's wordmark.

### 6. The web address

A social card needs a full web address (`metadataBase`). Until the domain is chosen, it comes
from a `SITE_URL` setting at build time, and local builds use `http://localhost:3000`. When you
choose the domain, it is one line in the deployment settings, no code change.

### 7. Proof

- Unit tests: the generated set matches the committed files; every icon route answers with the
  right type and size; the manifest's icons resolve.
- An end-to-end test reads the page's `<link rel="icon">`, Apple icon, manifest and Open Graph
  tags and fetches each one.
- Core Web Vitals (LCP, CLS, INP) and the landing page's bytes on a production build, before and
  after, in the pull request. Icons load after the page, so nothing should move; CLS stays 0.
- Screenshots of the set beside the board.

## What I need from you

1. Approval of this brief and the board (or changes).
2. Decision 3: the red-orange favicon from the board, or ink everywhere.
3. Decision 5: yes to downloading Bricolage Grotesque ExtraBold (OFL) into the repository.
4. The domain, when chosen (not needed to merge this item).
