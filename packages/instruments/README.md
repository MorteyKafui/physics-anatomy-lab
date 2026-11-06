# @pa/instruments

The measurement layer: how the hidden world turns into what a student sees and records.
Harvested from Physics Bench (`docs/planning/harvest-review.md`).

- `random.ts`: seeded mulberry32 streams, named substreams, tolerances. The same seed gives a
  whole class identical apparatus.
- `conditions.ts`: the room (27 °C, g = 9.81 N kg⁻¹, 50 Hz mains by default) and how it drifts
  during an attempt.
- `reading.ts`: least count, zero error, noise and parallax; rounding to the nearest division;
  naming a transcription slip (transposed digits, one division out, misread).
- `timing.ts`: hand timing with a stopwatch. Start and stop reaction delays cancel on average and
  add √2 × one delay's spread. The default delays are model assumptions awaiting a physics
  reviewer and classroom data.
- `catalogue.ts`: the metre rule, stopwatch and thermometer the v1 experiments use.

`bun test` runs unit and property tests (fast-check), including statistical checks of the
Gaussian and of hand timing.
