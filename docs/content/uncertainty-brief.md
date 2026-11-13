# The advanced uncertainty layer: brief

The next Phase 2 item (master plan, "Advanced uncertainty layer"), proposed for review before
anything is built. The plan says:

- **Uncertainty (advanced level):** absolute and percentage error, propagation through products and
  powers, error bars, and a least-squares fit with the uncertainty on the slope, following the lab
  manual's error-analysis chapter;
- **the lecturer** uses the advanced level (uncertainty propagation, error bars, least squares,
  model limits), so that students quote results with uncertainties;
- **each experiment** has an SHS core and an advanced layer for university users.

Model limits (where a formula stops holding, such as the small-angle approximation) are a separate
part of the advanced layer and are not in this item. The scanned lab manual is private (ADR 0012);
this brief paraphrases what school error analysis teaches and quotes nothing.

- **Status:** approved by Mortey (physics reviewer) on 2026-11-13: decisions 1 to 9, as proposed.

## Who it is for

- **The university student** who must quote g = 9.79 ± 0.05 m s⁻², not 9.79 m s⁻².
- **The lecturer** who marks the uncertainty as well as the value.
- **The strong SHS student** who wants to go past the WASSCE core. WASSCE marks no uncertainties,
  so the SHS core stays exactly as it is.

## The decisions

### 1. Where it is turned on

The layer is off by default and changes nothing until it is turned on:

- a switch, "Uncertainties", in the lab's header beside the help level, remembered on the device;
- on by default in the university report format, and off in the WASSCE format;
- a teacher can set it for a class later (the teacher dashboard's work, not this item).

With it off, every screen is as it is today. With it on, the table, the graph, Analyse and the
report gain what decisions 2 to 7 describe.

### 2. The uncertainty in one reading

As school error analysis teaches it, from the instrument's own least count (the instruments already
carry it, `packages/instruments`):

- **One reading on a scale** (a rule, a needle, a thermometer): ± half the least count.
- **A digital display** (the stopwatch, the balance): ± the last digit.
- **Repeated readings of the same thing:** ± half their range, or the single-reading uncertainty
  if that is larger. Two repeats that agree are not more certain than the instrument.
- **Hand timing:** the stopwatch's last digit is far smaller than the reaction time, so a timing's
  uncertainty is the larger of the last digit and half the range of the repeats. With one timing
  only, it is the reaction-time spread the lab already uses (`ANTICIPATED_EVENT`), rounded up to one
  significant figure: ± 0.1 s.

### 3. Propagation

The rules the manual teaches, as worst cases (the uncertainties added, not combined in quadrature):

- **Sums and differences:** absolute uncertainties add. (T = θ₂ − θ₁: ± 0.05 + 0.05 = ± 0.1 °C.)
- **Products and quotients:** percentage uncertainties add.
- **Powers:** the percentage uncertainty is multiplied by the power. (T²: twice T's.)
- **Reciprocals:** the percentage uncertainty is the same. (1/u: u's.)

The university report states the rule used. Combining in quadrature is the statistician's rule for
independent errors and gives smaller uncertainties; it is noted as the alternative, not used,
because the course teaches the worst case.

### 4. The table

With the layer on, each column gains its uncertainty under its heading (Δl = ± 0.05 cm), and each
worked value its own (T² = 3.24 ± 0.07 s²), worked out with the rules above, so the student sees
where each one comes from. The student does not type the uncertainties of the readings; they type
the result's (decision 6), which the checks mark.

### 5. The graph

- **Error bars** on each point, vertical for y and horizontal for x where x has an uncertainty,
  drawn on the WAEC graph paper in colour or black and white.
- **The slope's uncertainty** from the least-squares fit (`fitLine`'s standard error), shown with
  the slope: 4.03 ± 0.04 s² m⁻¹.
- **The steepest and least steep lines** that still pass through the error bars, the graphical
  method the manual teaches, as an option the student can draw. Half their difference in slope is
  the graphical uncertainty.

### 6. The result

In Analyse, the student quotes the result with its uncertainty: g = 9.79 ± 0.10 m s⁻² and as a
percentage, ± 1.0 %. The checks:

- the value, as today;
- the uncertainty, within a factor of two of the one worked from the slope's uncertainty;
- the uncertainty to one significant figure (two if it starts with 1), and the value to the same
  decimal place;
- agreement with the accepted value: within its uncertainty, or how many uncertainties away.

### 7. The report

The university format's Calculation section gains the uncertainty working, and Discussion gains the
agreement with the accepted value and which error dominates (the largest percentage). The WASSCE
format is unchanged.

### 8. Which experiments, and in what order

All six, one pull request each after the shared parts, in the order they were built: the simple
pendulum, Ohm's law, the converging lens, the two pins, the method of mixtures and the hot solid.

### 9. Physics checks and a board

- **Checks:** the propagation rules and the result's uncertainty are checked against an independent
  Python model in `validation/`, as the verdict was: worst-case propagation done with partial
  derivatives (SymPy), and the slope's error against `scipy.stats.linregress`.
- **A board:** the table, graph and Analyse screens change, so a board is drafted and approved
  first: the pendulum with the layer on, the switch, the table's uncertainties, the error bars and
  worst lines, and the result with its uncertainty, in both themes and at phone width.

## The pull requests, in order

1. This brief.
2. The board, for approval.
3. The shared parts: the switch, reading uncertainties, the propagation rules and their Python
   check, error bars and worst lines on the graph sheet, and the result's checks.
4. The pendulum's layer, its report and its tests.
5. to 9. Ohm's law, the converging lens, the two pins, the method of mixtures and the hot solid.

## Not in this item

- Model limits (the advanced layer's other half), the teacher's class setting, and uncertainty in
  the model check's lab data.
