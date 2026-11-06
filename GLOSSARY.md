# Glossary

Use these words for these things, in code, copy and conversation. Add a term in the same pull
request that introduces it.

## Physics and measurement

- **Amplitude (θ₀).** The largest angle a pendulum swings from the vertical. Kept below 10° in
  the practical so the period does not depend on it.
- **Least count.** The smallest division an instrument can read: 0.01 s for the digital stopwatch,
  1 mm for the metre rule. It sets how many decimal places a reading carries.
- **Zero error.** The reading an instrument shows when it should read zero.
- **Oscillation (swing).** One full to-and-fro movement back to the starting position, moving the
  same way.
- **Period (T).** The time for one oscillation, in seconds.
- **Mean.** The average of repeated readings. It carries one more decimal place than the readings
  when the WASSCE tabulation rules ask for it.
- **Parallax.** A reading error from looking at a scale at an angle instead of straight on.
- **Slope triangle.** The large right-angled triangle drawn on the best-fit line to find its
  slope, with corners away from plotted points (A, B, C on the graph sheet).
- **Graph sheet.** WAEC 2 mm graph paper at its real size, 20 cm across and 24 cm up, on which the
  student plots in the Plot step. It downloads in colour or in black and white.
- **Scale.** What 2 cm on an axis stands for. The guide accepts only 1, 2 or 5 times a power of
  ten, and a scale should use at least half of each axis.
- **Best-fit line.** The one straight line a student draws through their points: through the mean
  point, with the points balanced on each side. It is checked against the least-squares line.
- **Calculator.** The Analyse step's calculation line, which works with units ("4π² / (4.03 s²
  m⁻¹)" gives 9.80 m s⁻²) and says how many significant figures the measured values allow.
- **Error carried forward.** Marking a later answer against the student's own earlier one, so one
  slip loses one mark: g is checked against the slope the student wrote.
- **Accepted value.** The reference value an experiment should recover, such as g at Winneba.

## The lab

- **Experiment.** One practical, such as the simple pendulum. Defined in `packages/experiments`.
- **Attempt.** One student's run of one experiment, from Question to Report.
- **Step (stage).** One of the ten steps of an attempt: Question, Predict, Build, Check, Measure,
  Tabulate, Plot, Analyse, Conclude, Report.
- **Bench.** The area where the apparatus is built and readings are taken.
- **Parts tray.** The parts of an experiment's apparatus, waiting to go on the bench in the Build
  step. A part goes on by dragging it, or by selecting it and then choosing where it goes.
- **Slot.** A place a part can go. A slot exists only once the part that carries it is on the
  bench (the clamp jaw comes with the boss and clamp). Taking a part off takes everything resting
  on it back to the tray.
- **Magnifier.** A lens laid over the bench that shows the part under it larger, for small parts
  and fine scales. M turns it on and off.
- **Event.** One thing that happened in an attempt (a part placed, a reading taken). An attempt is
  an append-only list of events; everything else is rebuilt from it.
- **Attempt file.** An attempt saved to a file with every one of its events, to move it to another
  device without an account or to hand it in. Importing it twice changes nothing.
- **Projection.** In code, one view of an attempt (the bench, the table, the current step) rebuilt
  by replaying its events in order. The same events always give the same state.
- **Results table.** The table of readings in the Tabulate step. The student starts from the
  standard table, a template, or draws their own; every column has a quantity, a unit and a role
  (setting, reading, repeat, mean, worked out by a formula, or notes), so the checks can mark any
  layout.
- **Repeat.** One of several readings of the same thing at one setting (t₁, t₂ …). Repeats are
  joined by their mean, which carries one more decimal place than they do.
- **Formula column (derived column).** A column worked out from the others by a formula the
  student writes in their columns' symbols, such as T = t / 20.
- **Coach.** The guidance panel that explains each step and responds to mistakes, in text and,
  if voice is on, aloud.
- **Finding.** What a check says about the student's work: the rule, how serious it is (error,
  warning, tip or good), the skill it is about and the rows it points at. The coach decides which
  findings to show.
- **Help level (assist level).** How much the coach steps in: Auto, Check my work, On my own.
  It can be set for each skill (setting up, measuring, tables, graphs, calculations); a skill not
  set on its own follows the overall level. Exam mode turns the coach off.
- **Symbol card.** What opens when a symbol is tapped: its name, meaning, SI unit, typical size
  and where it comes from. The card for g gives no value until feedback is read.
- **Formula card.** A formula typeset as the book prints it, with a legend of its symbols.
- **Dimension check.** Working a formula's units through, to warn when they do not balance with
  its heading, as T = t / 20 headed in m would not.
- **Mistake catalogue.** The list of known mistakes for an experiment, each with its effect on the
  result and its coaching text.
- **Snapshot.** A labelled capture of the bench, table or graph that also stores the exact lab
  state, so it can be reopened later. Auto snapshots are taken when a step is finished.
- **Notebook.** The timeline of an attempt's snapshots.
- **Labelled export.** Any downloaded figure, table or report: it carries its figure number,
  caption, legend and the Physics Anatomy mark.

## People and classes

- **Student.** Anyone doing experiments. In a class, known only by a display name and class code.
- **Teacher (lecturer).** Runs classes, sees benches live, pushes hints.
- **Class code.** The short code a teacher shares so students can join, such as 7KQ-42M.
- **Live class.** A teaching session where the teacher sees every bench in real time.
- **Hint push.** One hint sent to every student who is making the same mistake.
- **Physics reviewer.** The person who approves changes to physics models and experiment content.

## Design

- **Lyra.** The shadcn style we build on: square corners everywhere.
- **Pendulum P.** The logo: a letter P whose bowl holds a pendulum; the bob is the only
  red-orange part.
- **Example data.** Numbers shown in a dashboard mockup or demo, always under a visible label.
