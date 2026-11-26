# Lab overhaul: the first six practicals, finishable by a beginner

Draft for Mortey's approval, 26 November 2026. Nothing here is built yet.

## The aim

Someone who knows no physics opens a practical, finishes it from Question to Report on the Auto
help level, and feels they did a real experiment with real apparatus. This is the bar Physics
Bench reached ("I don't know what I was doing but the experiment was guiding me").

## What a walk-through found

1. Five of the six labs are separate copies of the lab screen (about 1,200 lines each). The
   pendulum's voice, captions, snapshots, pause and speed, and what-if never reached them.
2. The coach names a wiring mistake only after "Finish building", at the bottom of a scrolled
   panel. The bad lead is not marked on the bench, and there is no "show me" or "fix it for me".
3. "Fill the table with my readings" groups readings by length. Five swings timed at one length
   become one row, and readings past the repeat columns are dropped. Nothing tells the student to
   change the length between readings.
4. Position sliders (0 to 100 cm in 0.1 cm steps) cannot land on 20.0 cm; there is no typed value
   or fine adjustment.
5. "Continue" needs two clicks.
6. The Anatomy kit is not used. `packages/apparatus` draws parts as flat rectangles by hand, and
   the anatomy skill is not installed for this project. Parts carry only a letter (E, K, R).
7. There is no explore mode like PhET or oPhysics.

## The work, one pull request each

| # | Item | Board needed |
| --- | --- | --- |
| 0 | Install the anatomy skill (wheresryan22/anatomy) for this project | No |
| 1 | One shared lab shell: all six practicals plug into one screen with the same settings, voice, captions, snapshots, pause and speed | No |
| 2 | Apparatus library redrawn with the Anatomy kit: every part looks like the real object, with a "Labels" switch for leader-line labels and a lettered key | Yes |
| 3 | Part cards and "Meet the apparatus": tap any part for its real look, an exploded view, name, purpose, how to handle it, least count and diagram symbol. The diagram and bench highlight each other | Yes |
| 4 | Pick your apparatus from a shelf that also holds things you don't need (from Physics Bench) | Yes (with 3) |
| 5 | A coach that unsticks: next part lit, wrong action red at once with the reason beside the bench, "Show me" (an animated demonstration), "Fix it for me" after two tries; no dead ends; one-click Continue | Yes |
| 6 | Guided measuring and the table: the coach names the next reading; the table opens from the first reading; one row per value; a warning for readings all at one setting | No |
| 7 | Precise controls: typed value, ±0.1 and ±1 buttons, arrow keys, snapping to the least count | No |
| 8 | Skill drills before first use: reading a meter, a metre rule without parallax, a thermometer, a stopwatch | Yes |
| 9 | Explore mode, ungraded: live sliders; hidden physics made visible (current, rays, heat flow, energy); live graph; ideal versus real | Yes |
| 10 | Real-lab feel across all six: lab sounds, needle jitter, a working stopwatch, safe failures (a short circuit sparks and the coach explains) | No |
| 11 | Proof: an automated beginner run per practical, from Question to Report on Auto, as a CI gate; each procedure checked against the WASSCE guide and lab manual pages | No |
| 12 | Five people who know no physics complete each practical unaided (the Phase 1 item, now for all six) | No |

Items 2 to 5, 8 and 9 share one board pull request, approved before they are built. After item 1,
the six practicals' apparatus (item 2) and items 6, 7 and 9 can run as parallel sessions.

## Skills used where they fit

- anatomy: every apparatus figure, exploded views, labels, the "Show me" motion, print sheets.
- impeccable and design-critique: the boards and the finished screens.
- ux-writing and plain-language: every coach line.
- interaction-design and accessibility-audit: the coach, controls and keyboard paths.
- tdd: the table, controls and coach rules.
- run and the built-in browser: proof screenshots on every pull request.

## Open question

Real photographs make "this is what it looks like" certain. Photos taken in a UEW lab could sit
beside each Anatomy figure in the part card. Is that possible?
