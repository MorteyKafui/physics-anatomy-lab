# The Anatomy kit, vendored

The isometric drawing kit every apparatus figure is built with (master plan, "Rendering tiers";
"Real apparatus, real look"). Copied unchanged from the anatomy skill pinned in `skills-lock.json`
(wheresryan22/anatomy, commit `1482e84`, MIT licence in `LICENSE`), so figures build in CI without
the skill installed.

| File                                           | Use                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `iso-kit.ts`, `iso-kit.mjs`                    | Camera, solids, parts library, SVG renderer, card and page builders    |
| `lathe.mjs`, `tube.mjs`                        | Round parts on any axis; pipes and cables                              |
| `audit.mjs`                                    | Proves the geometry: `node <figure>.build.mjs --audit` must pass       |
| `gl.mjs`, `gl-shared.mjs`, `canvas-painter.mjs` | WebGL layers inside the drawing (water, glass, light)                  |
| `react/draw.tsx`, `react/live.tsx`             | Server-safe drawing components and client hooks for React              |
| `scripts/`                                     | Inline the kit into a page; screenshots, scripted drives, line check |

Change nothing here by hand: to update, reinstall the skill (`bunx skills experimental_install
--agent claude-code`) and copy the files again in their own pull request. How to draw with it is
in the skill's `SKILL.md` and `references/`.

The one change from the skill: `scripts/inline-kit.mjs` finds the kit one folder up, because the
scripts sit inside `kit/` here.
