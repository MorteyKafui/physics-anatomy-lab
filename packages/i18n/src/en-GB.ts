/**
 * English (en-GB) messages: every string the lab shows or says (D10, translation-ready).
 * Placeholders are {name}; **word** marks emphasis. Twi, Ga and Ewe files will mirror these keys.
 * Copy follows AGENTS.md rule 6: plain, active, sentence case, British spelling.
 */
export const enGB = {
  "lab.loading": "Opening your attempt…",
  "lab.rail.label": "App",
  "lab.rail.home": "Home",
  "lab.rail.experiments": "Experiments",
  "lab.rail.notebook": "Notebook",
  "lab.rail.reference": "Reference",
  "lab.rail.help": "Help",
  "lab.rail.settings": "Settings",
  "lab.rail.notBuilt": "{name} is built later in Phase 1",

  "lab.header.stepOf": "Step {n} of {total} · {step}",
  "lab.header.progress": "{percent}% complete",
  "lab.header.back": "Back to experiments",

  "lab.playback.label": "Playback",
  "lab.playback.reset": "Reset the step",
  "lab.playback.labels": "Labels",
  "lab.playback.stepBack": "Step back",
  "lab.playback.pause": "Pause",
  "lab.playback.play": "Play",
  "lab.playback.speed": "Playback speed {speed}×",

  "lab.helpLevel.label": "Help level",
  "lab.helpLevel.auto": "Auto",
  "lab.helpLevel.check-my-work": "Check my work",
  "lab.helpLevel.on-my-own": "On my own",
  "lab.helpLevel.exam": "Exam: coach off",

  "lab.coach.label": "Coach",
  "lab.coach.instructions": "Instructions",
  "lab.coach.explanation": "Explanation",
  "lab.coach.tips": "Tips",
  "lab.coach.done": "Done",
  "lab.coach.showMe": "Show me",
  "lab.coach.resetTryAgain": "Reset and try again",
  "lab.coach.tryAgain": "Try again",
  "lab.coach.ask": "Check my work now",
  "lab.coach.allGood": "Nothing to fix in your timing so far.",

  "lab.steps.label": "Stages",
  "lab.steps.question": "Question",
  "lab.steps.predict": "Predict",
  "lab.steps.build": "Build",
  "lab.steps.check": "Check",
  "lab.steps.measure": "Measure",
  "lab.steps.tabulate": "Tabulate",
  "lab.steps.plot": "Plot",
  "lab.steps.analyse": "Analyse",
  "lab.steps.conclude": "Conclude",
  "lab.steps.report": "Report",
  "lab.steps.notBuilt": "This step's activity is built next in Phase 1.",
  "lab.steps.continue": "Continue to {step}",
  "lab.steps.finishMeasuring": "Finish measuring",

  "lab.readout.stopwatch": "Stopwatch, reads to {leastCount} s",
  "lab.readout.count": "Count",
  "lab.readout.of": "of {target}",
  "lab.readout.start": "Start",
  "lab.readout.stop": "Stop",
  "lab.readout.countPass": "Count a pass",
  "lab.readout.keys": "Keys: S starts and stops, Space counts a pass",
  "lab.readout.readings": "Readings: {list}",

  "experiments.simple-pendulum.title": "Simple pendulum",
  "experiments.simple-pendulum.figure": "Fig. 1",
  "experiments.simple-pendulum.figureTitle": "Simple pendulum: timing",
  "experiments.simple-pendulum.figureAlt":
    "Simple pendulum on a retort stand: the bob swings through the mark; a stopwatch on the bench",
  "experiments.simple-pendulum.callout.cork":
    "Split cork grips the thread, so the pivot cannot move",
  "experiments.simple-pendulum.conditions": "l = {length} m · θ ≈ {angle}°",
  "experiments.simple-pendulum.measure.title": "Time {swings} oscillations",
  "experiments.simple-pendulum.measure.why":
    "Timing many swings and dividing makes your reaction time a tiny part of the result.",
  "experiments.simple-pendulum.measure.pullAside": "Pull the bob aside, less than 10°",
  "experiments.simple-pendulum.measure.start":
    "Start the stopwatch as the bob passes the mark. Say **zero**.",
  "experiments.simple-pendulum.measure.stop": "Stop on the {swings}th pass in the same direction",
  "experiments.simple-pendulum.measure.record": "Record t in your table, then repeat",
  "experiments.simple-pendulum.explanation.title": "Why the period depends on length",
  "experiments.simple-pendulum.explanation.body":
    "Gravity pulls the bob back towards the middle. For small swings the pull grows in step with the distance from the middle, which is exactly the condition for a steady, repeating swing.",
  "experiments.simple-pendulum.explanation.formula": "T = 2π √( l ⁄ g )",
  "experiments.simple-pendulum.explanation.T":
    "period, the time for one full swing · s · from your table",
  "experiments.simple-pendulum.explanation.l":
    "length, pivot to the centre of the bob · m · you measure it",
  "experiments.simple-pendulum.explanation.g":
    "acceleration of free fall · m s⁻² · what you are finding",
  "experiments.simple-pendulum.explanation.graph":
    "Square both sides: T² = (4π² ⁄ g) l. A graph of T² against l is a straight line through the origin, and its slope is 4π² ⁄ g.",
  "experiments.simple-pendulum.tips.title": "Precautions examiners look for",
  "experiments.simple-pendulum.tips.angle": "I kept the angle of swing small, less than 10°.",
  "experiments.simple-pendulum.tips.mark":
    "I timed from the centre mark, where the bob moves fastest.",
  "experiments.simple-pendulum.tips.cork":
    "I clamped the thread between split corks so the length stayed fixed.",
  "experiments.simple-pendulum.tips.repeat": "I repeated each timing and used the mean.",
  "experiments.simple-pendulum.tips.plane":
    "I made sure the bob swung in a plane, not in a circle.",
  "experiments.simple-pendulum.demo.count": "{n}",

  "findings.pendulum.countFromOne.title": 'You said "one" on the first pass',
  "findings.pendulum.countFromOne.detail":
    "That pass starts the timing, so it is zero. Counting from one times {timed} swings, and your g would come out about {percent}% too high.",
  "findings.pendulum.countFromOne.demonstrate":
    "Watch the count: the bob passes the mark and the count says 0, then 1 on the next pass the same way.",
  "findings.pendulum.stoppedEarly.title": "You stopped at {count} of {target}",
  "findings.pendulum.stoppedEarly.detail":
    "Time all {target} oscillations, so your reaction time is a small part of t.",
} as const;

export type MessageKey = keyof typeof enGB;
