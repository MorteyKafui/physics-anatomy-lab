# The logo set

The pendulum P (D27, ADR 0027) as files, as approved on `design/mockups/LogoSet.dc.html`. The
brief is `docs/content/logo-set-brief.md`.

| File                 | Use it for                             |
| -------------------- | -------------------------------------- |
| `mark.svg`           | Light pages and colour print           |
| `mark-on-dark.svg`   | The lab, admin and dark slides         |
| `mark-black.svg`     | Black-and-white print                  |
| `mark-white.svg`     | One-colour print on a dark ground      |
| `lockup.svg`         | The mark and the name, on light        |
| `lockup-on-dark.svg` | The mark and the name, on ink          |
| `lockup-black.svg`   | The mark and the name, black-and-white |

Rules: keep clear space all round at least as wide as the P's stem. The mark is never smaller
than 16 px, and the lockup never narrower than 120 px. Never recolour, stretch or outline it, and
the bob is the only red-orange part.

## Do not edit these files

`bun run brand` in `packages/ui` draws every file here, plus the tab icons
(`apps/web/src/app/icon.svg`, `apps/admin/src/app/icon.svg` and both `favicon.ico`), from
`src/logo-paths.ts`. `test/brand.test.ts` fails when a committed file differs from what the
script draws. To change the mark, change `logo-paths.ts` and run the script.

## Fonts

`fonts/BricolageGrotesque-ExtraBold.ttf` draws the name in the lockups as outlines and sets it on
the social card (`apps/web/src/app/social-card.tsx`). It is never sent to browsers; the site
loads Bricolage Grotesque through `next/font`.

- Source: github.com/ateliertriay/bricolage, `fonts/ttf/` at commit `84745e5` (November 2026).
  This is the type designer's repository. Google Fonts carries only the variable font, and image
  rendering needs a static ExtraBold.
- Licence: SIL Open Font License 1.1, in `fonts/OFL.txt`. © 2022 The Bricolage Grotesque Project
  Authors.
