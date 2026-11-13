# Data templates, import and check against the model: brief

The next Phase 2 item (master plan, "Data templates, import and compare"), proposed for review
before anything is built. The plan says:

- every experiment offers a blank template, CSV and XLSX, with the right columns and units;
- a student fills it in during a real lab, imports it, and sees their points over the model's
  curve;
- a verdict separates systematic error (the whole line shifted: zero error, end correction) from
  random scatter (timing), and says which precaution would have helped;
- readings export as CSV, XLSX or JSON, and graphs as PNG, SVG or PDF, in colour or black and
  white.

Importing from Tracker and sensor CSVs is a later feature (feature table) and is not in this item.
The advanced uncertainty layer is the next item and is not in this one either.

- **Status:** approved by Mortey (physics reviewer) on 2026-11-13: decisions 1 to 9, as proposed;
  decision 5 amended the same day, before anything was built (below).

## Who it is for

- **The SHS student** who did the practical on a real bench at school, with the school's
  apparatus, and wants to know whether their readings are good before the exam.
- **The teacher** who wants a class's real readings checked against the physics without marking
  each graph by hand.
- **The researcher or self-learner** (sandbox persona) who takes their own data and wants it
  compared with the model.

## Words

"Compare" already means two runs side by side in Review (GLOSSARY.md), and "template" already
means a starting layout for the results table. To keep them apart, this item adds three words:

- **Data template.** A blank CSV or XLSX file for one experiment, with its columns, units and the
  settings the book uses, to fill in during a real lab.
- **Lab data.** Readings a student took in a real lab and imported. Lab data is never an attempt:
  it has no events, no steps and no marks.
- **Model check.** The screen that draws lab data over the model's line and gives the verdict.

## The decisions

### 1. Which experiments

All six labs get a data template and a model check, in this order, one pull request each after
the shared parts: the simple pendulum, Ohm's law, the converging lens (screen), the converging
lens (pins), the method of mixtures, the method of mixtures with a hot solid.

The pendulum goes first because its model has nothing the student must enter (T² = 4π²l ⁄ g at
the local g) and its two errors are the plan's own examples: an end correction shifts the line,
timing scatters it.

### 2. What the data template holds

Only what is read in the lab: the settings and the readings, never the worked columns (T, T², 1/u,
1/T and so on), which the model check works out with the same formulas as the lab's table. Each
heading carries its unit the way the lab's table does (`l / m`, `t / s`); the number of swings timed is stated above the table, from the lab. The settings column is
filled in with the book's values (the pendulum's lengths, the jockey positions, the volumes), and
the student may change them or add rows.

| Experiment         | Columns in the template                      | Filled in      |
| ------------------ | -------------------------------------------- | -------------- |
| Simple pendulum    | l / m, t / s (the time for the lab's swings) | l              |
| Ohm's law          | PJ / cm, I / A, V / V                        | PJ             |
| Converging lens    | u / cm, v / cm                               | u              |
| Lens and pins      | x / cm, y / cm                               | x              |
| Method of mixtures | V / cm³, θ₁ / °C, θ₂ / °C                    | V              |
| Hot solid          | t / min, θ / °C                              | t (0 to 4 min) |

Above the table, a few named cells hold the apparatus values the model needs (decision 4), and a
line saying which experiment and template version the file is. The XLSX is made by the report's
existing `tableXlsx`; the CSV by `csvText`. Both are made in the browser from
`packages/experiments`, so a template works offline and its columns can never drift from the
lab's table.

### 3. How a file is read

In the browser, with no network call and nothing sent to the server (AGENTS.md rules 4 and 5; the
plan's security line). The limits:

- CSV or XLSX only; `.xlsm` and other formats are refused. XLSX is read with `fflate` (already in
  the app) and a small reader for the first sheet's cell values; formulas are not run, only their
  saved values are used.
- At most 1 MB and 200 rows; every value is checked with Zod before it is used.
- A heading's unit is checked against its column's quantity, and converted where the lab accepts
  it (cm for m, ms for s). A file in another layout is matched by its headings, not by position.
- Any problem is shown on the cell it is in ("Row 4, t₁: not a number"), and the rest is kept.

Lab data is kept on the device like an attempt, and synced only for a signed-in student. A data
template from the model check can also be filled in on the screen instead of a file, for a
student without a spreadsheet app.

### 4. The model's line

Each model check draws the student's points, their best line, and the model's line, computed from
`packages/physics` with the values the student's own apparatus had. The model never takes the
values from the lab's simulated bench, because the student's real lab is not that bench.

| Experiment         | Graph           | The model's line                                         | The student enters                         |
| ------------------ | --------------- | -------------------------------------------------------- | ------------------------------------------ |
| Simple pendulum    | T² against l    | T² from the exact period at the lab's swing, local g     | Nothing                                    |
| Ohm's law          | I against V     | The line through E and r fitted to their points          | The cells' marked e.m.f. (optional)        |
| Converging lens    | 1/v against 1/u | Slope −1, both intercepts 1/f                            | The lens's marked f                        |
| Lens and pins      | xy against x+y  | Slope f, through the origin                              | The lens's marked f                        |
| Method of mixtures | V against 1/T   | Slope V₀(θₕ − θ₀), intercept −(V₀ + W)                   | Hot volume V₀, hot θₕ, room θ₀; W optional |
| Hot solid          | θ against t     | The heat model's curve for their masses and temperatures | Masses, boiling and room θ, the metal      |

Ohm's law has no fixed model value for a real bench (every pair of cells differs), so its check
judges whether the points lie on one straight line and how far they scatter, and states the E and
r the line gives; with a marked e.m.f. entered it also compares E with it.

### 5. The verdict

The student's points are fitted with `fitLine` (`@pa/analysis`). The verdict has three separate
parts, each true or false, so a run can have any of them or none:

- **Shifted: the points sit off the model's line.** The mean of the points' differences from the
  model's line is more than twice its standard error (their spread over √n). For the hot solid,
  whose graph is a curve, the differences are from the model's curve, in the same way.
- **Tilted: the slope is not the model's.** The fitted slope differs from the model's by more than
  twice its standard error. Ohm's law, with no model slope for a real bench, has no tilt part.
- **Scattered: the points spread more than care allows.** The spread of the points about their own
  line (`residualSd`) is more than twice what a careful student's readings give: the least count
  over √12, combined with the experiment's known human spread where it has one (the reaction time
  in hand timing, `ANTICIPATED_EVENT` in `packages/instruments`), both carried through the plotted
  quantity.

**Amended on 2026-11-13** (Mortey, before the board): the first rule judged a shift by the fitted
intercept and the scatter by the least count alone. On the pendulum's own numbers that called
every careful run scattered (the stopwatch's least count spreads T² by 0.0005 s², careful hand
timing by about 0.012 s²), and missed a 1 cm end correction about half the time (it moves T² by
0.04 s², and the fitted intercept's error with six points is 0.024 to 0.034 s²). Judged against
the model's line, the same correction stands 5 to 11 errors clear. The model's line for the
pendulum uses the exact period at the lab's swing, as its right way does, so a careful run does
not read as shifted by the small-angle approximation.

Each part names its cause and the precaution, written per experiment, for example:

- **Pendulum, shifted:** points above the model's line mean every length was short, measured to
  the top of the bob instead of its centre. Precaution: measure from the point of suspension to the centre of the bob.
- **Pendulum, scattered:** scatter in T² comes from starting and stopping the stopwatch. Precaution:
  time more swings, and start and stop as the bob passes the centre.
- **Method of mixtures, tilted:** a slope lower than the model's means heat was lost while
  pouring, or the highest temperature was missed. Precaution: pour quickly, stir, and read the
  highest temperature.

The full list, the causes for each part for each experiment, is written in the pull request that
builds that experiment's model check, for Mortey's approval as physics reviewer. With neither part
true the verdict says the readings agree with the model within their scatter. The verdict never
gives a mark: lab data is not an attempt.

Factor 2 means a run with no real error is called shifted or tilted about one time in twenty
each. The tests check that over many seeds: readings from the model with careful hand timing are
called none of the three, the same with a 1 cm end correction are called shifted, and with poor
timing are called scattered.

### 6. Physics checks

The model's lines are the formulas the labs already use, which are tested against the analytic
result and the Python models in `validation/`. What is new is the verdict's statistics, so the
first pull request adds a Python check that `fitLine`'s slope and intercept errors agree with
`scipy.stats.linregress` on the same data, and the hot solid's curve for a student's values is
checked against the SciPy heat model as the lab's bench already is.

### 7. Export

What already exists: the notebook exports the results table as CSV and the attempt as JSON; the
report exports Table 1 as CSV and XLSX; the graph exports as PNG, SVG and PDF from a snapshot.
This item fills the gaps with one export menu, the same on the model check and the report:

- readings as CSV, XLSX or JSON;
- the graph as PNG, SVG or PDF, each in colour or black and white (the graph sheet's existing
  black-and-white mode, design rule "colour or black-and-white graphs").

The JSON of lab data is its own small format with the experiment, template version, apparatus
values and readings; it is not an attempt file and cannot be imported as one.

### 8. Where it is reached

- From each experiment's lab start, "Check your own lab readings", next to "Start the experiment".
- From the experiment's report and print sheets, "Download a data template".
- At `/lab/<experiment>/check`, which works signed out (no AI is used anywhere in it).

### 9. The board

The model check is a new screen, so a board is drafted and approved first (design rule): one
board for the shared screen (the template download, the import, the table of lab data with its
problems, the graph with both lines, the verdict and the export menu), shown with the pendulum,
in the light and dark themes and at phone width. The other experiments reuse it and need no board
of their own.

## The pull requests, in order

1. This brief.
2. The board, for approval.
3. The shared parts: the data template writer, the CSV and XLSX reader with its limits, the
   verdict and its tests, the Python check of the fit errors, and the export menu.
4. The pendulum's model check (route, screen, precautions, end-to-end and accessibility tests).
5. to 9. Ohm's law, the converging lens, the lens and pins, the method of mixtures and the hot
   solid, one each, each with its causes and precautions for approval.

## Not in this item

- Tracker files and sensor CSVs (a later feature).
- Uncertainty bars, the uncertainty in the slope shown on the graph, and propagated results (the
  advanced uncertainty layer, the next item).
- Class-wide views of lab data for teachers (the teacher dashboard's later work).
