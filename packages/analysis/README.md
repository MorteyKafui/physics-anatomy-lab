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

- `findings.ts`: the finding shape and `runRules`, which puts the most serious first and keeps
  going when a rule cannot judge the data.
- `table.ts` and `table-rules.ts`: the table view the table builder will produce (cells exactly as
  typed) and the table checks: enough readings, readable cells, consistent decimal places,
  precision against the instrument's least count, means with one more decimal place than their
  readings (WASSCE; ADR 0035), unit slips, the student's own arithmetic, the range of lengths, and
  readings worth repeating.
- `student-t.ts` and `outliers.ts`: Student's t and the Bonferroni outlier test on deleted
  (externally studentised) residuals, which works on 5 to 8 readings, where a fixed cut-off on
  standardised residuals never fires. Cross-checked against SciPy and the hat-matrix formula.

Graph and calculation checks come with the graph sheet.
