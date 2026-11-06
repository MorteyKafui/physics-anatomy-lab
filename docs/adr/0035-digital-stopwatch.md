# 0035. The stopwatch is digital and reads to 0.01 s

- Status: accepted
- Date: 2026-11-06
- Decision log entry: D35 in `docs/planning/00-decisions.md`

## Decision

The lab's stopwatch is a digital one with a least count of 0.01 s, the kind the schools use.

## Details and consequences

- Timings are recorded to two decimal places (40.12 s) and, by the WASSCE tabulation rule that a
  mean carries one more decimal place than its readings, their means to three (35.915 s).
- The hand still sets the real uncertainty: reaction-time spread is far larger than 0.01 s, so the
  coach keeps teaching students to time 20 oscillations (`packages/instruments/src/timing.ts`).
- `STOPWATCH` in `packages/instruments/src/catalogue.ts` already reads to 0.01 s, and
  `GLOSSARY.md` now says so.
- **This overrides the approved mockups where they say 0.1 s.** When these screens are built,
  they use 0.01 s and two-decimal timings, and the pull request lists the change:
  - `design/mockups/Lab.dc.html`: the instrument label "Stopwatch, reads to 0.1 s".
  - `design/mockups/Main.dc.html`: the coach demo ("Your stopwatch reads to 0.1 s, so the mean
    takes one more decimal place: 35.90") and the stopwatch tooltip in the exploded apparatus.
  - `design/mockups/Table.dc.html`: the coach note and the example readings (40.2, 40.0, mean
    40.10), which become two-decimal readings with three-decimal means.
- The mockup files stay byte for byte as exported from the design canvas; the canvas can be
  updated separately.
