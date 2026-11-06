# @pa/analysis

Units, significant figures and straight-line fits: the maths behind the table, graph and
calculation checks. Harvested from Physics Bench (`docs/planning/harvest-review.md`).

- `units.ts`: quantity kinds and SI conversion for the v1 experiments, and unit-slip detection
  (a value ×10, ×100 or ×1000 out from its column). A temperature reading (`temperature`) and a
  temperature change (`temperature-difference`) are different kinds: only the reading is offset
  by 273.15.
- `sigfigs.ts`: parses a number as typed and keeps its precision, by the practical manual's rules.
- `fit.ts`: least squares with standard errors, the fit through the origin, standardised
  residuals. This is the one fit in the repository (it replaces the earlier one in
  `packages/physics`).

The tests compare every fit with SciPy (`validation/fixtures/fit.json`) and every significant-
figure case with Python's `decimal` (`validation/fixtures/sigfigs.json`), and add property tests.
The table, graph and calculation rules join in the next step.
