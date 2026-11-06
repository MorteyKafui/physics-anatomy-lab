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
- **Accepted value.** The reference value an experiment should recover, such as g at Winneba.

## The lab

- **Experiment.** One practical, such as the simple pendulum. Defined in `packages/experiments`.
- **Attempt.** One student's run of one experiment, from Question to Report.
- **Step (stage).** One of the ten steps of an attempt: Question, Predict, Build, Check, Measure,
  Tabulate, Plot, Analyse, Conclude, Report.
- **Bench.** The area where the apparatus is built and readings are taken.
- **Event.** One thing that happened in an attempt (a part placed, a reading taken). An attempt is
  an append-only list of events; everything else is rebuilt from it.
- **Attempt file.** An attempt saved to a file with every one of its events, to move it to another
  device without an account or to hand it in. Importing it twice changes nothing.
- **Projection.** In code, one view of an attempt (the bench, the table, the current step) rebuilt
  by replaying its events in order. The same events always give the same state.
- **Coach.** The guidance panel that explains each step and responds to mistakes, in text and,
  if voice is on, aloud.
- **Help level (assist level).** How much the coach steps in: Auto, Check my work, On my own.
  Exam mode turns the coach off.
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
