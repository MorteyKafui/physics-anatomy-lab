# Physics Anatomy — Master Plan

Nov 5, 2026 · @Kafui Mortey · Draft for approval

## Summary

Physics Anatomy is a virtual physics laboratory where students build an experiment from its parts, take real readings with realistic instruments, and get coached step by step until their table, graph and report are right. Version 1 ships the full platform with four deep experiments: simple pendulum, Ohm's law with a potentiometer, converging lens, and method of mixtures. The platform includes guided coaching, an exam mode, tables, graphs, lab reports, offline use, live classrooms and AI help.

The working name stays **Physics Anatomy**. It matches the Anatomy drawing kit behind every apparatus figure, and "the anatomy of an experiment" says what the app does: it takes physics apart to first principles. One risk: searches for "anatomy and physiology" could bury it, so the tagline ("Physics from first principles") carries the meaning on every page.

**Decisions already made** (full log in the project's decision record):

| Area | Decision |
| --- | --- |
| v1 scope | Platform + 4 flagship experiments, then add experiments steadily |
| Prior work | Ideas and proven modules from Wavelab and Physics Bench, reviewed and rewritten, never imported as they are |
| Frontend hosting | Cloudflare: Next.js on Workers via OpenNext, R2 for files, WAF and Turnstile in front |
| Backend | FastAPI + PostgreSQL in a Docker container on Cloudflare Containers; portable to a UEW server |
| Look | Dark lab and light site, signature red-orange, plus a colour per physics topic |
| UI kit | Our own design system on shadcn and Base UI (Lyra style), Lucide icons |
| Coaching | Guided state machine, spoken coach with captions, lab sounds, AI voice tutor online |
| Tables | Generated standard table or the student's own design, with any number of repeats |
| Exports | Every image, PDF and snapshot carries the logo, name, figure number, caption and labelled parts |
| AI | Claude, called from the FastAPI backend, online only |
| Accounts | Optional; students under 18 join classes by teacher code |
| Dashboards | Teacher and lecturer dashboards inside the app; admin portal as a separate app |
| Languages | Translation-ready from day one; English first, Twi, Ga, Ewe later |
| Mockups | Claude Design canvas, approved before building |
| Code | Private repo until UEW agrees a licence |
| Engineering | pstack principles, tstack PR flow, Matt Pocock domain modelling and TDD |
| Print | Anatomy print pipeline: poster, drawing and explainer PDFs per experiment |
| Rejected | REA: it decompiles closed binaries; PhET is open source and Brilliant's terms forbid it. TanStack DS: TanStack's own v0 brand kit for docs sites, not an app system |

Read sections 2 to 4 for what we build and why. Read 5 to 9 for how the product works. Read 10 to 15 for how it is engineered. Read 16 for the order of work.

## Landscape and gaps

No existing tool takes a student from an empty bench to a marked lab report. PhET explores concepts, Brilliant teaches reasoning, and neither teaches the practical skills that exams mark: reading instruments, tabulating, plotting and writing precautions. That gap is the product.

| Tool | What it does well | What it lacks for this audience |
| --- | --- | --- |
| [PhET](https://phet.colorado.edu/) | Free, research-based concept sims; huge reach; translated widely | Exploration only: no procedure, no instrument least count or zero error, no tables or graph marking, no report, little feedback on what the student did wrong |
| [Brilliant](https://brilliant.org/) | Short interactive lessons, strong feedback loop, streaks and progress | Paid, online only, puzzles rather than experiments, no lab practice or data handling |
| Labster | Polished 3D virtual labs for universities | Expensive licences, heavy downloads, weak on low-cost devices, little West African curriculum |
| Algodoo, oPhysics, Walter Fendt | Free sandboxes and applets | No guidance, no assessment, dated or fragmented |
| Pivot Interactives, Vernier | Real video and sensor data | Need paid licences or hardware |
| Tracker | Real video analysis | Expert tool; steep for SHS students |

**What Physics Anatomy adds**

1. **The bench, not just the concept.** Students set up apparatus part by part, and each part matters to the result.
2. **Honest instruments.** Every reading carries least count, zero error, parallax and reaction time, so a careless student gets a believably wrong answer.
3. **The practical report as the goal.** Tabulation and graph rules (worth about 20 of 24 WASSCE marks) are coached and checked live.
4. **A coach that watches and speaks.** Guided mode notices when a student drifts off track and steps in, in text and in voice, the way Mavis Beacon corrected typing.
5. **Try it wrong, then try it right.** A student can repeat a run and compare it with the correct procedure, mistake by mistake.
6. **Exam rehearsal.** Timed papers in the WASSCE format, with likely follow-up questions.
7. **Physics for someone who knows none.** Every formula, symbol and unit explained where it appears; calculations auto-filled with the working shown until the student is ready to do them alone.
8. **Your table, your way.** A generated standard table, or one the student designs, with as many repeats as they want.
9. **Every moment captured.** Snapshots through the experiment, and every exported figure labelled, captioned and branded, ready for a report or a thesis.
10. **What-if experiments.** Change a condition, break an assumption and watch the physics respond; AI drafts new scenarios inside the validated model.
11. **Research grade.** Seeded, reproducible runs, model cards, data with metadata, parameter sweeps and a citation.
12. **Works where schools are.** Offline, on low-cost Android phones, on a shared projector, with no account needed.
13. **One classroom, many benches.** A teacher runs a live class where every student's bench and readings are visible.

## What we carry over from Wavelab and Physics Bench

Both earlier projects are harvested, not imported. Each idea below is reviewed, re-specified against the new domain model, rewritten with tests, and improved where the table says so. Physics Bench (Desktop/lvl-200-pp-sem-1) is the stronger base for the lab; Wavelab is the stronger base for apparatus drawing and wave physics.

| From | What it does well | What changes here |
| --- | --- | --- |
| Physics Bench | Experiment plugin contract: one definition drives the bench, table, graph, feedback, comparison and report | Kept as the core idea; extended with a mistake catalogue, coach scripts, audio and exam rubric per experiment |
| Physics Bench | Hidden world built from a seed with real tolerances (fork ±0.4%, wire density range), room conditions (temperature, g, mains frequency) | Kept; the same seed gives a whole class identical apparatus |
| Physics Bench | Action log driving technique feedback, session replay and the report's Method written from what really happened | Becomes the event log behind resume, live classrooms, snapshots and analytics |
| Physics Bench | Feedback rules for setup, table, graph, calculation and writing; unit-slip (×10, ×100) and transcription-slip detection; parallax model | Kept, but fired live by the coach instead of only after the student finishes |
| Physics Bench | Compare stays locked until the student has analysed their own data and read their feedback | Kept as a rule in the TLA+-checked state machine |
| Physics Bench | Bring-your-own-data mode; cells stored exactly as typed so precision is never lost | Kept; joined by the flexible table builder |
| Physics Bench | 15-section report with a template editor, DOCX export, KaTeX formulas | Kept; WASSCE format added beside the university format |
| Physics Bench | Synthesised lab sounds (struck fork, resonance swell, mains hum) that work offline | Grows into the audio mode |
| Physics Bench | React Three Fiber benches, significant-figures trainer, Anatomy figures with SVG, PNG and PDF downloads | 3D becomes opt-in for capable phones; the trainer becomes a skills drill; downloads gain branded frames |
| Physics Bench | AI critique using the student's own API key | Replaced: a metered key on our backend, so no student needs a key |
| Wavelab | Anatomy isometric kit and the turnable colour-figure engine | Kept as the apparatus drawing layer |
| Wavelab | Model notes listing every assumption; invalid input withholds results instead of showing NaN | Kept as a rule for every model |
| Wavelab | Ripple tank, wave bench, Doppler and string-wave physics with tests | Kept for the waves topic after v1 |
| Both | Offline service worker, small-screen notice, reduced motion, Playwright tests | Kept, and extended with performance budgets and accessibility gates |

What neither has, and this plan adds: live coaching during the experiment, exam mode, flexible tables, an audio coach, snapshots, branded exports, a backend with accounts and classrooms, an admin portal, and the WASSCE secondary-school syllabus.

## Users and core journeys

SHS students preparing for WASSCE are the first users; every other role reuses the same bench, data tools and reports.

| User | Journey in v1 | Success looks like |
| --- | --- | --- |
| SHS student (solo) | Picks the recommended first experiment, runs guided mode, fixes coached mistakes, exports a report | A complete report with a correct table and graph, and the student can say why each precaution matters |
| Exam candidate | Opens exam mode, gets a WASSCE-style question, works to the clock, sees a marked script and likely follow-up questions | Score rises across attempts; weak areas named |
| Teacher | Creates a class, shares a join code, runs a live session ("everyone measure the wire diameter"), sees every bench, pushes hints, reviews submissions | The class finishes on time; the teacher sees who is stuck and why |
| Lecturer | Uses the advanced level: uncertainty propagation, error bars, least-squares fit, model limits | Students quote results with uncertainties |
| Researcher or self-learner | Opens sandbox mode, changes any parameter, imports real data, compares it with the model | A real data set checked against theory |
| Curious learner | Asks "what if the string stretches?" and gets a generated variant of the experiment | Sees the physics respond, within honest model limits |

**Journeys every user shares**

- **Start:** no sign-in needed. A first-visit picker asks level and goal, then recommends a starting experiment.
- **Resume:** any unfinished attempt reopens at the exact step and readings, on or offline.
- **Ask for help:** a help button on every step offers a hint first, then the AI tutor (online), then a report-a-problem form that reaches the team.
- **Small screen:** phones get a dismissible notice recommending a larger screen; everything still works.

## What each user would need, and whether this plan delivers it

I put myself in each seat and asked what a complete virtual lab would have to give me to replace a real one. The answer was mostly yes, with gaps in five places, and the gaps are now in the plan.

| If I were a… | I would need | Where the plan delivers it |
| --- | --- | --- |
| Student who knows no physics | To never wonder what to do next; every symbol explained where it appears; calculations done with me, not for me, until I can do them | Coach panel with a single next action, hover cards for every symbol and unit, three assist levels (section on data tools), spoken coach |
| Student preparing for WASSCE | Practice under exam conditions; to see exactly where marks were lost; likely questions on the experiment I just did | Exam mode with the WAEC time split, marked script, follow-up questions |
| Student who learns by doing it wrong | Freedom to make mistakes and see their real effect, then a fair second attempt | Allowed mistakes, review, redo from any stage, side-by-side runs |
| Teacher | To run a lesson for 40 students on shared or weak devices, see who is stuck, and get worksheets and marks without extra work | Live classroom, projector theme, class heatmap of mistakes, print sheets, auto-marked tables and graphs |
| Lecturer | Uncertainty, error propagation, least squares, model limits; to set my own variants of an experiment | Advanced layer, scenario editor, assignments with my own parameters |
| Researcher | Reproducible runs, clear model assumptions, raw data with metadata, figures I can publish, and a way to cite the tool | Seeded runs, a model card per experiment, CSV and JSON with metadata, branded figures, versioned experiments with a citation |
| Curious adult | To ask "what if" and see it happen, without signing up | Sandbox and what-if scenarios, no account needed |

**Gaps found and closed in this revision:**

1. A complete beginner still needed formulas, symbols and units spelled out at the point of use.
2. Tables were too rigid for students who repeat readings their own way.
3. There was no way to capture the experiment as it happened.
4. Researchers needed model cards and citable versions.
5. Audio coaching, for students who learn by listening and for screen-reader users.

## Feature map

Every feature in your spec has a place; v1 delivers all of them for the four flagship experiments, and later releases widen coverage rather than add new surfaces.

| Spec feature | v1 | Later |
| --- | --- | --- |
| PhET and Brilliant features plus what they lack | Guided, sandbox and exam modes; streaks and progress; hints | Spaced review, mastery map across topics |
| Responsive UI | Desktop first, phone usable, small-screen notice | Tablet-specific layouts |
| Offline access | Installable PWA; experiments, sheets, audio and reports offline | Downloadable school packs for no-internet labs |
| Save work | Auto-save every step on device; sync when signed in | Version history per attempt |
| Download or export work | CSV, XLSX and JSON of readings; labelled PNG, SVG and PDF figures | Shareable read-only links |
| Snapshots | Capture any moment, timeline in the notebook, ZIP download | Annotate snapshots |
| Anatomy paper downloads | Poster, technical drawing and explainer PDFs per experiment | Teacher-edited worksheets |
| Draw graph | WASSCE-style plot with scale picker, best-fit line, slope triangle | More non-linear fits |
| Perform calculations | Calculator with units and significant figures; Auto, Check my work and On my own levels | Symbolic rearrangement help |
| Own table of values | Standard, template or draw-your-own tables with any number of repeats | Teacher-shared templates |
| Import data and compare | Download a template, fill it with lab readings, import, compare with the model | Import from Tracker and sensor CSVs |
| Complete lab report | WASSCE and 15-section formats, generated from the attempt; PDF and DOCX | Teacher rubrics and marking |
| Detailed insights | Rule-based review offline; Claude review online | Class-wide insight dashboards |
| Audio coaching | Spoken coach with captions, count-along, lab sounds; AI voice tutor online | Voice answers from the student |
| Fast and performant | Budgets enforced in CI |  |
| Immersive 3D | Anatomy figures everywhere; turnable 3D bench for the pendulum | 3D bench for every experiment |
| Mavis Beacon coaching | Guided state machine, off-track detection, allowed mistakes, retry and compare | Adaptive difficulty |
| Same experiment, many users | Live classrooms with a join code | Multi-school events |
| Recommend a first experiment | Level-and-goal picker | Recommendation from history |
| Resume | Exact-step resume |  |
| Exam practice | WASSCE timed mode for the four experiments | Full question bank |
| Research use | Model cards, seeded runs, data with metadata, parameter sweeps, citation | Python notebook export |
| Generate experiments on the fly | Claude-drafted variants inside a validated model | Community-shared variants |
| Help when stuck | Hints, AI tutor, report a problem | Live help from teachers |
| Monitoring and feedback | Admin portal, PostHog events, feedback widget, error tracking | Research data export with consent |
| Contributors, sponsors, partners | Pages and docs for each, credits in the app | Partner portal |
| Logo | Logo and brand set, chosen in Phase 0 | Motion logo |
| Security | Section on security and privacy | External penetration test before scale-up |

## Domain model and glossary

The model rests on one rule: **the truth and the observation are kept apart.** A physics model computes what really happens; an instrument turns that into what a student can read, with its least count, zero error and the student's own handling. Every mistake lives in that gap, so feedback can always name its cause.

| Term | What it is | Key fields |
| --- | --- | --- |
| Experiment | One authored practical, written as typed code plus Markdown text | id, level, topic, aim, theory, model, apparatus, variables, procedure, table and graph spec, analysis, precautions, questions, sources |
| Physics model | A pure, deterministic function from parameters and time to true values | inputs with units, outputs, assumptions, validity limits |
| Apparatus part | A physical object on the bench | properties (length, mass), states (clamped, connected), the Anatomy figure that draws it |
| Instrument | A part that produces readings | range, least count, zero error, reading style (vernier, needle, digital), uncertainty model |
| Variable | A quantity the procedure controls or records | role (independent, dependent, controlled), symbol, unit, suggested values |
| Setup | The student's arrangement of parts | positions, connections; checked by setup rules |
| Reading | One observed value | instrument, what was displayed, what the student recorded, unit, conditions; the true value stays hidden |
| Trial | Readings for one value of the independent variable | repeats (increasing, decreasing, mean), derived columns |
| Results table | The student's table | headings, units, decimal places; checked against the tabulation rules |
| Graph | The student's plot | axes, scale, points, best-fit line, slope triangle, intercepts |
| Analysis | What the graph yields | slope, intercept, derived quantity with uncertainty, comparison with the accepted value |
| Mistake | A known way to go wrong in this experiment | trigger, effect on results, coaching text, severity |
| Attempt | One run by one user in one mode | an append-only list of events; setup, readings, table, graph, analysis and mistakes are rebuilt from it |
| Scenario | A what-if variant of an experiment | changed parameters or assumptions, validated against the model's limits; made by a user or drafted by AI |
| Report | A document rendered from an attempt | sections, format (PDF, DOCX) |
| Class and session | A teacher-led group and one live lesson | join code, roster (pseudonymous), live state |

Attempts are **event-sourced**: every action (clamped bob, set length to 0.800 m, started stopwatch) is an event. The same event list drives resume, live classrooms, insights, analytics and the replay a student sees when comparing a wrong run with a right one. The glossary is kept as `GLOSSARY.md` in the repo, maintained with the domain-modeling skill, and every term above appears in code under the same name.

## Guided mode: the coaching engine

Guided mode is a state machine over ten stages, with a rule engine that watches every event and a coach that steps in only as much as the student needs. It is built around the five reasons the WASSCE guide gives for failing practicals: apparatus handling, tabulation, graph plotting, concept and exposure. Each one is a skill the app tracks and coaches.

**Stages.** Every stage has an entry check and an exit check, and a student can step back at any time:

1. Question: what are we finding out?
2. Predict: sketch the expected graph or value.
3. Build the setup from the parts tray.
4. Check the setup: the coach reviews it before measuring.
5. Measure: trials, repeats and readings.
6. Tabulate.
7. Plot.
8. Analyse: slope, intercept, the derived quantity.
9. Conclude, with precautions and sources of error.
10. Report.

**Off-track detection.** Each experiment ships a catalogue of known mistakes as rules over events. Examples for the pendulum:

| Skill | Rule fires when | Coach says |
| --- | --- | --- |
| Apparatus | Thread tied round the clamp instead of held in a split cork | The pivot moves, so the length is not what you measured |
| Apparatus | Release angle above 10 degrees | Large swings make the period longer; keep it small |
| Measurement | Counting starts at "one" | You timed 19 oscillations, not 20; start at zero |
| Measurement | Length measured to the top of the bob, not its centre | Measure to the centre of the bob |
| Tabulation | Heading reads `T2` with no unit | Write it as `T²/s²` |
| Tabulation | Mean recorded with fewer places than the readings | Means take one more decimal place than the readings |
| Graph | Scale fills less than half the sheet | Choose a scale that uses at least half of each axis |
| Graph | Slope triangle uses plotted points or is small | Use a large triangle with vertices off the plotted points |
| Analysis | Slope given to 2 significant figures without a unit | Three significant figures, with the unit |

**Coaching levels.** The coach escalates per skill: watch silently, then highlight the part, then a written hint, then a demonstration. Students choose Guided, Light or Off; exam mode is always Off.

**Allowed mistakes.** Unsafe or impossible actions are blocked, such as a short circuit or a reading beyond an instrument's range. Procedure mistakes are let through, and the simulation carries their effect into the readings, so a student who counts from one really does get g near 10.9 m/s² instead of 9.8, because 19 swings were divided by 20. That honest error is what makes the report worth writing.

**Review, retry and compare.** At the end, the review lists every mistake with its effect on the result: "counting from one raised g by 11%". The student can redo from any stage, keeping earlier work, and see both runs side by side.

**Exam mode.** The WASSCE hour per question, with the guide's time split: 5 min reading, 5 diagram, 5 setup, 15 performing, 5 tabulation, 10 graph, 10 part (b), 5 calculations and precautions. The coach is off. Afterwards the script is marked against a WAEC-style rubric (tabulation about 10 to 12 marks, graph about 8) and the likely follow-up questions are offered.

**Proven, not hoped.** The stage machine is written as a TLA+ model with the pstack statechart skill and checked for three rules: a student can always reach a report, no reading is ever lost, and exam mode never shows a hint. The diagram below shows the stages and where the coach can send a student back.

## Audio mode: the coach you can hear

Mavis Beacon worked because it talked to you while your hands were busy. The audio mode does the same: a narrator walks the student through the practical, notices mistakes and says so, and the lab itself sounds real. Captions are always on, so it works in a silent classroom too.

**What the student hears.**

| Layer | What it does | Offline? |
| --- | --- | --- |
| Spoken coach | Reads each step, explains why, and speaks every correction the coach raises ("you started counting at one; start at zero"). Tone escalates with the coaching level, from a quiet nudge to a full walkthrough | Yes: scripted lines are generated as audio at build time with a neural voice and cached |
| Count-along | A soft beat while timing oscillations, so the student hears 0, 1, 2… 20 and never loses count | Yes |
| Lab sounds | Stopwatch clicks, a pendulum's swish, tuning forks and resonance, a rheostat's scrape, a switch, water bubbling, a thermometer settling; all synthesised in the browser | Yes |
| Listen mode | Theory explained as a short audio lesson, from first principles, while the student watches the apparatus move | Yes |
| AI voice tutor | Spoken answers to the student's own questions | No: online only, with the same quotas as the text tutor |

**Controls.** Coach voice on or off, speed (0.75× to 1.5×), how much it talks (only mistakes, steps and mistakes, everything), voice choice, and volume per layer. Classrooms start with voice muted unless the teacher turns it on.

**Accessibility.** For a blind or low-vision student, the narrator also describes the bench ("the bob hangs 80.0 cm below the split cork; the stopwatch reads 0.0 s"), and every action has a keyboard shortcut announced aloud.

**Languages.** Every spoken line comes from the same message files as the text, so a Twi or Ewe translation produces Twi or Ewe audio when those languages arrive.

**Built on.** Physics Bench's synthesised sounds (Web Audio), a neural text-to-speech service at build time for scripted lines, the browser's own speech engine as an offline fallback for dynamic text, and a streaming voice for the online tutor. The provider is chosen in a Phase 1 spike on voice quality for Ghanaian English and cost.

## Simulation, measurement and rendering

Each experiment has three layers: a physics model that computes the truth, a measurement layer that turns truth into readings, and a renderer that draws the bench. Only the renderer differs between a phone and a laptop.

**Physics models (pure TypeScript, SI units, no shortcuts).** Each model goes beyond the textbook formula so that real effects appear when a student causes them.

| Experiment | Model | Real effects it reproduces |
| --- | --- | --- |
| Simple pendulum | Full non-linear equation of motion, integrated with a fixed-step RK4; air damping; bob as a finite sphere | Period grows at large amplitude; length must be measured to the bob's centre; a loose pivot adds length |
| Ohm's law and potentiometer | Circuit solver (nodal analysis) over cells with internal resistance, resistors, rheostat, potentiometer wire, real meters, key | Meter resistance disturbs readings; a cell left switched on runs down; wire heats if current is high |
| Converging lens | Ray tracing (paraxial plus exact), blur from defocus on the screen, parallax for pin methods | Image sharpness shows where the image is; parallax shows when pins coincide |
| Method of mixtures | Lumped heat model: water, calorimeter, stirrer, thermometer lag, Newton cooling to the room | Heat lost to the room, unstirred layers, a thermometer read too early |

**Measurement layer.** Every instrument rounds to its least count, applies its zero error and adds human factors: reaction time on a stopwatch (start and stop), parallax when reading a scale at an angle, needle jitter on meters. Noise comes from a seeded generator, so an attempt replays exactly and a teacher can give a whole class the same apparatus.

**Rendering tiers.**

1. **Anatomy figures (default, all devices).** Isometric SVG apparatus from the Anatomy kit, with drag-and-snap assembly, keyboard equivalents for every action, and a magnifier for reading verniers, micrometers and meters.
2. **Effects inside the figure.** WebGL layers for water, light and heat glow, following the kit's rules (world space, nothing pops, SVG still reads without them).
3. **Turnable 3D bench (capable devices, opt-in).** Anatomy's 3D mode is still beta, so Phase 1 runs a spike comparing it with React Three Fiber on the pendulum before choosing.
4. **Print sheets.** The Anatomy print pipeline renders the poster, drawing and explainer PDFs from the same figure.

**Time and performance.** Pause, slow motion and single-step on every experiment. Heavy models run in a Web Worker. Animation stops when off screen or when the tab is hidden, and reduced-motion settings get still frames with stepping.

## Data tools

The table, graph and calculator follow the WASSCE marking rules exactly, because those rules carry about 20 of the 24 marks. Each tool both does the work and checks the student's version of it.

**Results table: generated or your own** (TanStack Table underneath).

Every student chooses how their table looks, because real experimenters repeat readings their own way. The checker judges what the table *means*, not whether it matches our layout.

| Option | What the student gets |
| --- | --- |
| Standard table | Generated from the experiment: the right columns, units and repeat layout for WASSCE or the university format |
| Template | Pick a layout (increasing, decreasing, mean; loading, unloading, mean; single reading) and adjust it |
| Draw your own | Start blank: add, rename, reorder or delete columns; set each column's quantity and unit from a picker; add as many repeat columns as you like (t₁, t₂, t₃…) and a mean appears; add derived columns by formula; add a notes column |
| Saved table | Reuse any table you or your teacher designed before |

- Each column knows its quantity, unit and kind (measured, given, repeat, mean, derived). That's how the checker can mark a student's own design and how the graph can plot any column against any other.
- Readings can be typed, or sent from the instrument with one click ("Record") into the selected cell; the coach can require typing in training mode, because writing the reading is the skill.
- Headings are checked as quantity over unit: `T²/s²`, `log(T/s)`, `l/m`, angles as `i/°`.
- Decimal places are checked against the instrument's least count; means carry one extra place.
- Cells keep exactly what was typed, so 0.80 and 0.8 stay different.

**Assist levels: how much the app does for you.** The student, teacher or exam mode picks one, per skill:

| Level | Calculations and derived columns | Who it suits |
| --- | --- | --- |
| Auto | Filled in automatically, with the working shown line by line | A first-timer who knows no physics |
| Check my work | The student fills them in; each cell is ticked or flagged with the reason | Students practising |
| On my own | Nothing filled, nothing checked until the end | Exam mode, confident students |

**Formulas, symbols and units, everywhere they appear.**

- Every formula is shown typeset (KaTeX) with a legend underneath: each symbol, its name, its unit, and where its value comes from ("l: length of the pendulum, m, from your table").
- Hovering or tapping any symbol, on the bench, in the table, on the graph or in the text, opens a card: name, meaning, SI unit, typical size, and a first-principles line on where it comes from.
- Every number on screen carries its unit; a unit picker converts to SI and shows the conversion (80.0 cm = 0.800 m).
- A dimension check warns when a formula's units don't balance.

**Graph sheet** (custom SVG, not a chart library).

- Draws the WAEC 2 mm graph paper at its real proportions (20 cm by 24 cm).
- Offers only the scales the guide accepts: 2 cm to 1, 2 or 5 times a power of ten.
- The student plots points and draws the best-fit line by hand. The app checks the line against least squares and against the guide's rule: through the mean point, with points balanced on both sides.
- Slope triangle: large, with vertices off the plotted points, lettered. Intercepts are read directly, or found by similar triangles when the axes do not start at zero.
- TanStack Charts is used for dashboards and insights only, after an evaluation spike, since it carries no stability label yet.

**Calculator.** A unit-aware expression engine that tracks significant figures and shows each substitution the way the book does: formula, values with units, result to 3 significant figures. It accepts the student's own answer and checks value, unit and significant figures separately.

**Uncertainty (advanced level).** Absolute and percentage error, propagation through products and powers, error bars, and a least-squares fit with the uncertainty on the slope. This follows the lab manual's error-analysis chapter.

**Import, compare and export.**

- Each experiment offers a blank template (CSV and XLSX) with the right columns and units.
- A student fills it in a real lab, imports it, and sees their points over the model's curve.
- A verdict separates **systematic** error (the whole line shifted: zero error, end correction) from **random** scatter (timing), and says which precaution would have helped.
- Export of readings as CSV, XLSX or JSON, and graphs as PNG, SVG or PDF, in colour or in black and white.

## Reports, insights and AI

Reports and insights work offline from the attempt's own events. Claude adds a second opinion when online, but it never computes physics: every number comes from the validated models.

**Lab report.** Generated from the attempt in the WASSCE format: aim, apparatus (with labels as recorded), a set-up diagram (the Anatomy figure in its light theme, lettered with a key, as the guide requires), observations with least counts, the table, the graph sheet, calculations, precautions in the first person, sources of error, and answers to part (b). The student edits every section. PDF and DOCX are generated in the browser, so export works offline.

**Insights (offline, rule-based).** From the mistake catalogue: what was done right, what went wrong, the effect of each mistake on the final result, and a score per skill (apparatus, measurement, tabulation, graph, analysis, precautions). Scores feed the recommended next experiment.

**AI features (online, Claude called from the FastAPI backend, streamed to the browser).**

| Feature | What Claude does | Guardrail |
| --- | --- | --- |
| Tutor | Answers "why" and "I'm stuck" for the current step, asking a guiding question first | Sees the experiment, step and recent events, never personal data; physics and maths only |
| What-if generator | Turns a question ("what if the string stretches?") into a scenario: parameter changes and assumption switches | Output is JSON checked against a schema of what the model supports; the app runs the real model; anything outside the model's limits is declined, with the nearest supported variant |
| Report review | Comments on the conclusion, precautions and sources of error | Quotes the rule it relies on; never rewrites the report itself |
| Question drafting | Drafts follow-up questions for exam mode | A teacher or Dr Acquah approves each question before it enters the bank |

**Cost and safety controls.**

- The API key lives only on the server; every call is metered per user and per IP, with a daily quota. AI features need a signed-in adult or a class whose teacher has turned AI on; signed-out users do not get them (see the Children and Schools policy).
- Small model for hints, larger model for report review; prompt caching; answers cached by experiment, step and mistake.
- Inputs and outputs filtered for age-appropriate content; no names or emails in prompts; logs pseudonymous with a fixed retention.
- An evaluation suite per experiment (correct physics, right tone, refusals) runs in CI whenever a prompt changes.
- A feature flag switches any AI feature off instantly.

## Snapshots, labelled exports and research use

Anything a student or researcher takes out of the app arrives as a finished, labelled figure that names its source, so it can go straight into a report, a thesis or a slide.

**Snapshots.** A camera button (and the S key) captures the moment: the bench, the table, the graph, or all three. Each stage completion also takes one automatically. Every snapshot stores both an image and the exact state, so it can be reopened in the lab later. Snapshots line up on a timeline in the attempt's notebook. The student can caption, reorder or delete them, then download them one at a time or as a single ZIP with the report.

**How every exported figure is labelled.** It follows the Anatomy kit's figure card:

| Position | Content |
| --- | --- |
| Top left | Figure number ("Fig 3") |
| Top right | A short title ("Simple pendulum: set-up") |
| The drawing | Parts keyed by letter, as the WASSCE guide asks for diagrams; no floating words |
| Under the drawing | The legend (A: retort stand, B: split cork, C: thread, D: bob…) and a one-line caption with the live values (l = 0.800 m, T = 1.79 s) |
| Footer | Physics Anatomy logo and name, the experiment and its version, date and time, and the attempt's seed so the run can be reproduced; an optional display name |

Exports come in PNG (2× resolution), SVG and PDF, in the light print theme by default. Tables and graphs get the same frame. A school or university can add its own logo beside ours for class handouts.

**Colour graphs.** Every graph can be downloaded in colour as well as in the black-and-white WAEC print style. The colour version uses the experiment's topic hue for the plotted points, the accent red-orange #F0482A for the line of best fit, a distinct colour for the slope triangle and its readings, a different hue for each series when more than one is plotted (for example loading and unloading), and the green #6CC25A graph-paper ruling. It keeps the full labels (title, axes with quantities and units, scales, figure number, legend and the Physics Anatomy mark), and every colour pair is checked for contrast and colour-blind safety, with marker shapes as well as colour telling the series apart. The student picks Colour or Black and white in the export dialog; the choice is remembered, and teachers can set the default for a class.

**Report formats.** Two templates, both editable: the WASSCE format, and the 15-section university format from the level-200 lab manual (date, title, aim, apparatus, diagram, theory, method, observations, graph, calculation, discussion, precautions, sources of error, conclusion, references).

**For research.**

- **Model card per experiment:** its equations, assumptions, limits and validation results.
- **Versioned experiments**, with a changelog and a suggested citation.
- **Data export** as CSV with a JSON sidecar: seed, model version, instrument specs and conditions.
- **Parameter sweeps** that run an experiment across a range and export the results.
- **A notebook export** (Python) that reloads the data for analysis.

## System architecture

The app is local-first: experiments, tables, graphs, snapshots and reports run in the browser and save to the device. Our own backend, a FastAPI service on PostgreSQL, handles accounts, sync, live classrooms, AI, the admin portal and research exports. It ships as a Docker image, so it runs on Cloudflare Containers today and on a UEW server later without code changes. The heavy computing happens on each student's own device, which keeps server load small.

**Repository layout** (one repository: a Bun workspace with Turborepo for TypeScript, uv for Python):

| Path | Holds |
| --- | --- |
| `apps/web` | Next.js 16 app: marketing site, lab, teacher and lecturer dashboards; deployed to Cloudflare Workers with OpenNext |
| `apps/admin` | Next.js admin portal for the team, on its own subdomain behind Cloudflare Access |
| `apps/api` | FastAPI service (Python): auth, sync, classrooms over WebSockets, AI, exports, admin API, background tasks |
| `packages/physics` | Physics models in TypeScript: pure, deterministic, tested; they run in the browser for offline use |
| `packages/instruments` | Measurement layer: least count, zero error, human factors, seeded noise |
| `packages/engine` | Event log, guided state machine, rule engine, coach, audio cues, scoring |
| `packages/experiments` | One folder per experiment: definition, mistakes, coach script, content text, print sheets, tests |
| `packages/apparatus` | Anatomy kit and the figure for every part |
| `packages/analysis` | Units, significant figures, fits, uncertainty, table and graph checks |
| `packages/ui` | The design system: tokens, components, lab parts, Lucide icons |
| `packages/api-client` | TypeScript client generated from the API's OpenAPI schema, so both languages share one contract |
| `packages/i18n` | Message files for text and spoken lines |
| `validation/` | Independent Python (NumPy, SciPy) versions of each model that cross-check the TypeScript ones in CI |
| `docs/` | Decision records, guides, the experiment playbook |

**Stack.**

| Concern | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript strict, Bun | Your choice; both earlier projects run on it |
| UI | Tailwind 4, our design system on shadcn and Base UI (Lyra), Lucide icons | Owned, accessible, lab-specific parts |
| Motion | Motion for the interface, GSAP for the landing story | Each where it is strongest |
| Forms, tables, server state, shortcuts | TanStack Form, Table, Query, Hotkeys | Type-safe and headless |
| Device storage | IndexedDB via Dexie | Proven in Physics Bench; holds the event log offline |
| Backend | FastAPI on PostgreSQL; the full list is in the next section | Your choice; typed, fast, documents itself as OpenAPI |
| One database for everything | PostgreSQL also carries live-class messages (LISTEN/NOTIFY), the job queue and rate-limit counters | One service to run, locally and in production; Redis can be added later if scale demands it |
| AI | Anthropic Python SDK in the API, streamed to the browser | The key never leaves the server |
| Files | Cloudflare R2 | Snapshots, reports, exports, audio |
| Hosting | Next on Cloudflare Workers; the API as a container on Cloudflare Containers (generally available since April 2026) | One provider now; the same container runs on a UEW server later |
| Offline | Serwist service worker; installable PWA | Proven in Physics Bench |
| Errors and analytics | Sentry (browser and API), PostHog with consent, Cloudflare Web Analytics | Replaces Vercel Analytics |

**Sync.** An attempt is an append-only list of events with unique ids. Syncing means sending the events the server lacks and fetching those the device lacks; two devices can never conflict, because nobody edits an old event. Signed-out work stays on the device and is adopted by the account at first sign-in.

**Live classrooms.** A teacher starts a session and the API opens a WebSocket channel for it. PostgreSQL's LISTEN/NOTIFY relays messages between API containers, so a class works no matter which container each student reaches. Each student's bench sends a throttled stream of events. The teacher sees every bench, pushes hints, locks steps or broadcasts an instruction (spoken, if voice is on). A student who drops offline keeps working, and their events catch up from the database on reconnect.

## Backend: stack, local setup and deployment

The API is one Python service on one PostgreSQL database. On your machine it runs directly against your installed PostgreSQL, with no Docker. Docker appears only in CI, to package the API for deployment, and is never needed on your computer. Exact versions are pinned in `uv.lock` once the Phase 0 spike confirms they work together.

**Backend stack.**

| Layer | Library or tool | Role |
| --- | --- | --- |
| Language and packaging | Python 3.14 (fallback 3.13), uv | uv installs Python, creates the environment and locks every dependency |
| Web framework | FastAPI, served by Uvicorn | HTTP routes, WebSockets, automatic OpenAPI schema |
| Data validation and settings | Pydantic v2, pydantic-settings | Request and response schemas; configuration from environment variables |
| Database access | SQLAlchemy 2.0 (async), asyncpg driver | Typed models and queries |
| Migrations | Alembic | Versioned schema changes, reviewed like code |
| Auth | Authlib (Google sign-in), itsdangerous (signed email links), server-side sessions in PostgreSQL | No passwords stored; HttpOnly cookies |
| Live classrooms | FastAPI WebSockets + broadcaster on PostgreSQL LISTEN/NOTIFY | Messages reach every API container |
| Background jobs | Procrastinate (PostgreSQL-backed queue) | Exports, emails, retention cleanup, AI batch work, scheduled backups |
| Rate limiting | Cloudflare WAF at the edge; SlowAPI in the API | Two layers against abuse |
| AI | anthropic SDK, sse-starlette for streaming | Tutor, scenarios, report review |
| Files | aioboto3 against Cloudflare R2 (S3 API), presigned URLs | Uploads and downloads go straight to R2 |
| Data exports | Polars, openpyxl, PyArrow | CSV, XLSX and Parquet for research |
| Email | Cloudflare Email Service or Resend (chosen in Phase 0) | Sign-in links, class invitations, notices |
| Physics cross-check | NumPy, SciPy, Pint, Hypothesis | Independent models and property tests |
| Testing | pytest, pytest-asyncio, HTTPX test client, coverage | Runs against a local test database |
| Code quality | Ruff (lint, format, security rules), pyright strict, pre-commit hooks | Same strictness as the TypeScript side |
| Supply chain | pip-audit and osv-scanner, Renovate | Known vulnerabilities fail CI |
| Observability | sentry-sdk, structlog (JSON logs), OpenTelemetry tracing, PostHog Python SDK | Errors, logs, traces, server-side events |
| Contract | OpenAPI schema → TypeScript client and TanStack Query hooks (@hey-api/openapi-ts) | CI fails if the API changes without regenerating the client |

**Local development on Windows (no Docker).**

1. Prerequisites: your installed PostgreSQL 18, Bun, Git, and uv (which installs Python itself).
2. Create a role `pa_app` and two databases: `physics_anatomy_dev` and `physics_anatomy_test`, with the `citext` and `pg_trgm` extensions. A script in `apps/api/scripts/` does this with one command.
3. Copy `.env.example` to `.env` (git-ignored) and set `DATABASE_URL=postgresql+asyncpg://pa_app:<password>@localhost:5432/physics_anatomy_dev`.
4. `uv sync`, then `uv run alembic upgrade head`, then `uv run python -m app.seed` for sample classes and attempts.
5. `uv run fastapi dev` serves the API on port 8000; `bun run dev` serves the web app on port 3000, which forwards `/api` to the API.
6. `uv run pytest` uses the test database and rolls every test back, so the dev database is never touched.

The Linux shell I work in cannot reach your Windows PostgreSQL on `localhost`. So database commands are run by you locally, and CI runs the full suite against its own PostgreSQL. The step-by-step guide lives in `docs/dev/local-setup-windows.md`.

**Environments.**

| Environment | Web app | API | Database | Deployed when |
| --- | --- | --- | --- | --- |
| Local | localhost:3000 | localhost:8000 | Your PostgreSQL | You run it |
| Preview | A URL per pull request | A preview container | A Neon branch copied from staging | Every push to a pull request |
| Staging | staging subdomain | staging container | Neon staging | Every merge to `main` |
| Production | Main domain | api subdomain | Neon production | A version tag, after manual approval |

**Deployment.** GitHub Actions builds both apps. The web app deploys to Workers with Wrangler. The API image is built, scanned and pushed, then rolled out on Cloudflare Containers behind a small Worker that routes `api.` traffic to it. Alembic migrations run as a release step before traffic moves, and every migration must be reversible. A rollback redeploys the previous tag. For a UEW handover, the same image runs on a university server behind Caddy, with PostgreSQL alongside it; `docs/ops/self-hosting.md` covers that.

**Services inventory** (documented in `docs/ops/services.md` with owner, account, plan, secrets and what fails if it is down):

| Service | Used for |
| --- | --- |
| GitHub | Code, pull requests, Actions CI/CD, issue tracker |
| Cloudflare | DNS and domain, Workers (web), Containers (API), R2 (files), WAF, Turnstile, Access (admin portal), Web Analytics, Email Service |
| Neon | Managed PostgreSQL with point-in-time recovery and a branch per preview; production runs the same major version as your local PostgreSQL 18, confirmed in the Phase 0 spike |
| Anthropic | Claude for the tutor, scenarios, report review and question drafting |
| Text-to-speech provider | Neural voice for the spoken coach (chosen in the Phase 1 spike) |
| Sentry | Errors and performance, web and API |
| PostHog | Product analytics, feature flags, consented session insight |
| Uptime monitor and status page (such as Better Stack) | Alerts when the site or API is down; a public status page |
| Renovate | Dependency updates as pull requests |

**Backups and recovery.** Neon keeps point-in-time recovery. A nightly job also writes an encrypted dump to R2, kept for 30 days, and a restore is rehearsed every month (`docs/ops/runbooks/restore.md`).

## Design system, brand and landing page

One token set serves two surfaces: a dark, instrument-like lab and a warm, light marketing site, joined by one red-orange accent and shared type. It is our own design system, built on shadcn's Lyra style (square corners, hairline borders, monospace numbers) over Base UI, with Lucide icons for the interface and Anatomy figures for apparatus.

**Design rules agreed in the mockup round (6 November 2026).** These apply to every screen, component and export, not only the mockups where they were first decided:

- **Square corners everywhere (Lyra).** Buttons, inputs, cards, chips, menus, dialogs, toasts and tooltips have zero radius. Only things that are round in reality stay round: status dots, the bob, progress rings, the stopwatch.
- **Logo: the pendulum P.** The bob is the only red-orange part. It appears in the site header and footer, the lab and teacher rail, the admin sidebar, on every exported figure and on printed sheets.
- **No dummy content.** Every number on the public site is computed from the physics or is a stated fact. No fake counters, version numbers, testimonials, partner links, real school names or experiments that aren't planned. Dashboards may show example data only with a visible "Example data" or "Example class" label.
- **Live physics instead of decoration.** Moving visuals run the real equations: the double-slit hero (particles build interference stripes; watching which slit removes them), the draggable pendulum, the experiment cards whose readings come from the simulation, and the exploded isometric apparatus with a tooltip on every part.
- **One dashboard pattern for teacher and admin.** Dark surface; headline tiles with a small bar or chart and a "View…" link; hatched bar charts; a needs-attention list with chips; a detail drawer with one main action; a confirmation toast with Undo; search on / and ⌘K; collapsible navigation groups.
- **Labels in sentence case.** No all-caps labels or monospace eyebrow text; monospace is kept for numbers, units and codes.
- **Graphs download in colour or black and white.** See Colour graphs below.
- **Public site layout.** A sticky header that becomes a floating bar on scroll, a centred hero with an outlined second line, live experiment cards in the isometric style, teacher sign-up beside the student class-code join, and a large-type footer with a live status light.

**Tokens (starting values, tuned in Phase 0).**

| Token | Lab (dark) | Bench paper (light lab) | Site (light) |
| --- | --- | --- | --- |
| Background | #0D0D0D | #F4EFE6 (warm paper, as in your Backcountry and ESP32 references) | #FBFBF6 |
| Surface | #161616 | #FBF8F2 | #FFFFFF |
| Raised and border | #1E1D1D | #E6DFD2 | #ECEBE4 |
| Text | #F0F0F0 | #1F1D1A | #141414 |
| Muted text | #808080 | #6E685E | #6B6B66 |
| Signature accent | #F0482A | #E2401F | #F0482A (darkened for text where contrast needs it) |
| Good, warning, critical | green, amber, red, each with an icon or word too | same | same |

**A colour for each topic.** Inspired by the spectrum of cards in your hero video, each area of physics owns one hue. It appears on topic chips, experiment cards, the landing page, illustrations and the glow on that topic's apparatus, never on body text. Starting values, checked for contrast and colour-blind safety in Phase 0:

| Topic | Hue |
| --- | --- |
| Mechanics | Amber #F5A524 |
| Heat | Ember orange #FF7A3D |
| Light and optics | Violet #8B7CF6 |
| Waves and sound | Teal #2EC4B6 |
| Electricity and magnetism | Electric blue #3B82F6 |
| Measurement and instruments | Graph-paper green #6CC25A |
| Modern physics (later) | Magenta #E64980 |

The graph sheet keeps the classic green ruling on paper, so it looks like the WAEC sheet students know.

**The lab screen.** Its layout follows your Backcountry 101 and Learn ESP32 references, because their structure answers "what do I do now?" without a word:

- **Centre: the bench.** The isometric apparatus, with short labels pinned to parts when they matter ("split cork: grip the thread here"), and the part to touch next gently lit.
- **Right: the coach panel.** Three tabs: **Instructions** (the current step, its sub-steps as a checklist with small icons, one highlighted next action), **Explanation** (the physics from first principles, with formula cards) and **Tips** (precautions and common mistakes). It expands to full screen for reading.
- **Top: progress and time.** A card showing the experiment and step ("Simple pendulum · 3/10"), and playback controls: reset, rotate view, layers, step back, pause, speed.
- **Bottom: the step strip.** Every stage as a thumbnail with its name; done stages ticked, the current one outlined in the accent, Compare shown locked until earned.
- **Left: a slim icon rail.** Home, experiments, notebook (snapshots, table, graph), reference, settings.
- **On a phone,** the coach panel becomes a bottom sheet and the step strip scrolls sideways; the bench stays on screen.

The lab also gets a **projector theme**: light and high contrast, because the proposal targets shared projectors in bright classrooms, where dark screens wash out.

**Type.** A neutral grotesque for the interface, a monospace with tabular figures for every number, unit and label, and a characterful display face for marketing headlines. The candidates are Geist Sans and Geist Mono, with Wavelab's Bricolage Grotesque for display; all three are open-licensed. A side-by-side prototype decides in Phase 0.

**Rules.**

- Colour carries meaning only in data and status, and never on its own: every status also has a shape or a word.
- Motion in the lab is functional and short (150 to 250 ms). Storytelling motion belongs to the landing page.
- Apparatus figures follow the Anatomy kit's tones, with one lit part per figure: the one the student should watch.
- WCAG 2.2 AA throughout: keyboard access for every lab action, touch targets of at least 44 px, readable labels, a text description of the bench's state for screen readers, and reduced-motion support.

**Logo.** Three directions, drawn with anatomy-asset and shown side by side for you to choose:

1. An isometric bench block with a pendulum hanging inside it: the experiment as an object.
2. An exploded view: one apparatus with its parts lifted apart, the literal "anatomy".
3. A monogram: a pendulum's arc forming the P, with the bob as the A's crossbar.

The chosen mark is delivered as SVG, favicon, PWA icons and a social card.

**Landing page** (warm light theme, GSAP for story, stageshow for product shots):

1. **The hero is a working lab.** Behind the headline, a physics shader draws a live field of interfering waves, spectral in the topic colours. In front of it hangs a pendulum the visitor can pull and release. The page times it, and computes g from their swing in front of them.
2. **"Make a mistake."** The visitor is invited to count the swings themselves. If they start at one, g comes out 11% wrong, and the coach explains why in one line, with its voice if sound is on. In twenty seconds the visitor has felt the whole product.
3. **The anatomy of an experiment.** As the page scrolls, an apparatus assembles part by part (GSAP), each part labelled the way the lab labels it. Then three isometric cards follow, Build, Measure and Report, in the style of your section video.
4. **The coach in action:** stageshow cursor demos of a table flagged, a graph scale fixed, a report exported with labelled figures.
5. **A topic constellation:** every experiment as a glowing node in its topic colour, "coming soon" ones dimmed, so the breadth shows at a glance.
6. **For teachers:** a live classroom demo, with a mistakes heatmap filling in as students work.
7. **Works anywhere:** a toggle that turns the network off, and the lab keeps working.
8. **For researchers:** a model card, a parameter sweep and a citation.
9. **The people:** Dr Isaac Kwesi Acquah and Mortey Kafui, UEW, partners and sponsors, and how to contribute or donate.
10. **One call to action, repeated:** "Start your first experiment, no sign-up."

Every experiment also gets its own server-rendered page with structured data (`LearningResource`) and a social image, so search engines can find it.

## Security, privacy and minors

The safest data is data we never collect, so the default student has no account, no email and no name on our servers. Where data is kept, OWASP ASVS Level 2 is the checklist, and every feature gets a short threat model before it is built.

**Application controls.**

| Area | Control |
| --- | --- |
| Transport and headers | HTTPS only with HSTS; a strict Content Security Policy with nonces; `frame-ancestors 'none'`; a tight Permissions-Policy |
| Sessions | API sessions in HttpOnly, Secure, SameSite cookies; rotation on sign-in; CSRF protection on every mutation |
| Access | Every request checks ownership or class membership; tests try to read another user's attempt and must fail |
| Abuse | Cloudflare WAF and rate limits; Turnstile on sign-up, help and feedback forms; AI quotas (section 9) |
| Input | Zod at every boundary; imports parsed in the browser with size limits; uploads to R2 by signed URL with type and size checks |
| AI | Student text is treated as data, never instructions; AI calls have no tools; output must match a schema |
| Secrets | Cloudflare and container secret stores only; gitleaks in a pre-commit hook and in CI; least-privilege API tokens |
| Supply chain | Lockfile committed; Renovate for updates; osv-scanner in CI; GitHub Actions pinned by commit SHA |
| Recovery | PostgreSQL point-in-time recovery plus a nightly encrypted dump to R2; an audit log of teacher and admin actions |

**Privacy and minors.**

- **Students:** join a class with a teacher's code and a display name of their choice. No email, no phone, no date of birth.
- **Teachers and lecturers:** sign in with an email link or Google.
- **Children under 13:** use the app only signed out, or through a school class. No direct accounts.
- **Research data** for the UEW pilot is a separate, opt-in record. It requires ethics approval, school permission, parental consent and learner assent, as the proposal states. Records are pseudonymous, access is restricted, and retention periods are fixed.
- **Analytics** load only after consent.
- **Self-service** export and deletion of a user's data.
- **Law:** the privacy policy and terms follow Ghana's Data Protection Act, 2012 (Act 843), and GDPR principles for users abroad. UEW's legal and ethics offices review them before launch.

Before wider rollout, an external penetration test is commissioned.

## Scale, performance and observability

The benchmark device is a low-cost Android phone (2 GB of RAM, a budget processor) on a slow 4G connection, as used in Ghanaian schools. If the app is fast there, it is fast everywhere. Budgets are enforced in CI, so a change that breaks one fails its pull request.

**Performance budgets.**

| Measure | Budget |
| --- | --- |
| JavaScript to open the lab shell | 200 KB compressed or less |
| Extra JavaScript per experiment | 150 KB compressed or less |
| Largest Contentful Paint, landing page, slow 4G | 2.5 s or less |
| Interaction to Next Paint | 200 ms or less |
| Simulation frame rate | 60 fps on mid-range, 30 fps or more on the benchmark phone |
| Memory in a running experiment | 150 MB or less |
| Offline pack per experiment | 3 MB or less |

**Scale targets.** Static files are served from Cloudflare's network, the API scales by adding containers, and PostgreSQL relays each live class across them, so no single class or container becomes a bottleneck. Before launch, a k6 load test on staging must sustain 10,000 concurrent students with 200 live classes of up to 60 students. The targets for that test:

- API availability of 99.9%.
- Classroom messages delivered in 300 ms or less (p95, same region).
- Zero synced events lost.

**Observability.**

- **Errors:** Sentry for browser and Worker errors, tagged by release; Workers Logs for request traces.
- **Product events** (PostHog), named in one shared list: `experiment_viewed`, `attempt_started`, `stage_completed`, `mistake_detected`, `hint_shown`, `ai_requested`, `report_exported`, `attempt_completed`, `classroom_joined`.
- **Dashboards:**
  - most-used experiments
  - time spent per stage
  - where students drop out
  - the most common mistakes
  - AI use and cost
  - help requests
- **Feedback:** a feedback button on every screen, and help requests that open a ticket on the team's board, with the attempt attached if the student agrees.
- **Alerts:** error spikes, AI spend above the daily budget, failed syncs, and classroom latency.

## Dashboards and the admin portal

Teacher and lecturer dashboards live inside the main app, because they are features for users. The team's admin portal is a separate app (`apps/admin`) on its own subdomain. Only staff can reach it, signing in through Cloudflare Access with two-factor authentication. It never ships to students' devices and is released on its own schedule. It shares the design system and talks to the same API through admin-only endpoints.

**Inside the main app.**

- **Teacher:** classes and join codes, live sessions, assignments with due dates, a mistakes heatmap per class, submissions and marks, printable worksheets.
- **Lecturer:** everything a teacher has, plus custom experiment variants, uncertainty-level marking, and exports of a class's data.

**In the admin portal.**

| Area | What the team can see and do |
| --- | --- |
| Overview | Active students now, attempts today, experiments completed, error rate, AI spend against budget |
| Usage | Most-used experiments, time per stage, where students drop out, devices and connection speeds, offline vs online use |
| Learning | The commonest mistakes per experiment, how often hints are needed, score trends per skill, exam-mode results |
| Content | Each experiment's status (draft, review, pilot, live), its version and changelog, feature flags and gradual rollout |
| Question bank | AI-drafted questions waiting for review; approve, edit or reject |
| AI | Requests, cost per feature, cache hit rate, evaluation results, flagged replies, the off switch |
| Support | Help requests and feedback with the attempt attached (when allowed), replies, status |
| People | Teachers, schools and classes (students stay pseudonymous); bulk class setup for schools |
| Research | Consent records, pilot cohorts, approved anonymised exports for the UEW study |
| Community | Contributors, reviewers, partners and sponsors shown on the site; announcements to users |
| Translation | Progress per language, missing strings, audio lines still to generate |
| System | Error trends from Sentry, sync failures, classroom latency, release versions, recent deploys |
| Audit | Every admin action, who did it and when |

The portal uses read-only database replicas and aggregated views for its charts, so heavy analytics queries never slow down students.

## Software factory

Every change, from a typo to a new experiment, travels the same road: a short-lived branch, a pull request with proof, automated gates, a human review, and a merge that deploys itself. Nothing reaches students that a machine has not checked and a person has not approved.

**Branches and environments.**

- `main` is protected and always deployable; each merge deploys to **staging** automatically.
- **Production** deploys from a version tag after a manual approval, and rolls back by redeploying the previous tag.
- Work happens on short-lived branches: `feat/…`, `fix/…`, `exp/<experiment-id>`, `docs/…`, `chore/…`. Every pull request gets its own preview URL.
- Commits follow Conventional Commits; pull requests are squash-merged and lead with the problem, the change, the proof and the risk (tstack's file-pr format).
- CODEOWNERS: anything under `packages/physics` or `packages/experiments` needs a physics reviewer's approval (Dr Acquah until more reviewers join).

**Gates on every pull request.**

| Gate | Fails when |
| --- | --- |
| Types and lint | Any type error or lint error |
| Unit and property tests | A test fails; physics functions are fuzzed with fast-check |
| Physics validation | A model disagrees with its analytic result or textbook value beyond tolerance |
| End to end | A Playwright journey fails on desktop or phone size |
| Accessibility | axe finds a serious issue |
| Performance | A budget from section 13 is exceeded |
| Figures | The Anatomy audit or line check fails for a changed figure |
| Security | gitleaks finds a secret, or osv-scanner finds a known vulnerability |
| AI | The evaluation suite drops below its bar when prompts change |
| Translation | A string is missing from the message files |

**Definition of done.** A feature is done when it has: tests; proof from the verification skill driving the real app (screenshots attached to the pull request); keyboard and screen-reader checks; message keys; analytics events; updated docs and glossary; and a decision record if it made a lasting choice.

**Adding an experiment (the playbook).**

1. Brief: curriculum mapping, aim, level, sources.
2. Physics model with validation tests against the textbooks.
3. Instruments and the mistake catalogue, each mistake with its effect and coaching text.
4. Apparatus figures with the Anatomy kit, plus the three print sheets.
5. Guided flow and written content.
6. Table and graph spec, exam question and rubric.
7. Scientific review and sign-off by a physics reviewer.
8. Usability test with a few students at the target level.
9. Release behind a feature flag to a pilot class.
10. Watch the analytics, fix, then open to everyone.

**Docs** live in `docs/`, organised as tutorials, how-to guides, reference and explanation (the technical-writing skill's standard). They include the contributor guide, the experiment authoring guide, architecture, decision records (`docs/adr/`) and runbooks for incidents, rollback and database restore.

**People joining later.**

- **Lecturers and professors:** join as physics reviewers or content authors through an onboarding guide. Their CODEOWNERS entries and credits are added in one pull request.
- **Contributors:** listed in `CONTRIBUTORS.yml`, which generates the credits page.
- **Sponsors, donors and partners:** follow `docs/partners.md`. It covers tiers, how logos are added (a data file and a review), the donation route (agreed with UEW), and two firm rules: no ads shown to students, and no sponsor influence over content.

**Agents in the factory.**

- Rigorous work runs in pstack's poteto-mode.
- Pull requests are filed and shepherded with tstack's file-pr, babysit-pr and full-stop.
- A human always presses merge.

## Scientific validation and content

The app's promise is that a careful student gets the accepted value and a careless student gets a believably wrong one. Each experiment proves both, in code, at four levels before it ships.

| Level | What is checked | Pendulum example |
| --- | --- | --- |
| 1. Model vs analysis | The model matches exact solutions where they exist | At small angles the period matches 2π√(l/g) within 0.1%; at 30° it matches the elliptic-integral result |
| 2. Model vs references | Constants and outcomes match the textbooks and data tables | g for Accra, about 9.78 m/s²; heat capacities and resistivities from Cutnell & Johnson and Giancoli |
| 3. Scripted students | A "careful student" script recovers the accepted value within its stated uncertainty; a "careless student" script shows each catalogued error | Counting from one raises g by about 11% |
| 4. Physical comparison | Simulated results are compared with real measurements taken in a UEW lab, as the proposal requires | A reference data set kept with the experiment |

Levels 1 and 2 run twice: once against the TypeScript model the app uses, and once against an independent Python version written with NumPy and SciPy (for example SciPy's elliptic integrals for the large-angle pendulum). Two implementations that agree are far more convincing than one that passes its own tests.

**Corrections log.** Every error found in the source book is recorded in `docs/content/corrections.md`, with the corrected working, so teachers can see what changed and why. The first two entries are already known:

- **Helical spring:** the book prints 12.5 N/m. The correct value is 0.490 ÷ 0.039 = 12.6 N/m to 3 significant figures.
- **"Total stretch of 20 cm":** the book solves this as the spring's final length. The wording should say "total length".

**Content pipeline.**

- Each experiment's text is written in MDX inside its own folder, with typed front matter.
- Every number in the prose comes from the model through a typed units helper, so text and simulation can never disagree.
- Nothing is copied from the WASSCE book or the lab manual: procedures are written fresh, and syllabus topics are referenced by name.
- Each experiment has an SHS core and an advanced layer for university users (uncertainty, model limits).
- Primary and JHS variants follow the proposal's 12 after v1.

**Reviews.**

- A physics reviewer signs off on the model, the numbers and the mistake catalogue.
- A practising teacher signs off on the wording, the steps and the timing.
- Both sign-offs are recorded on the pull request.

## Roadmap

Seven phases lead to v1, and each ends at a gate that must be passed before the next phase relies on it. Calendar dates are set at the end of Phase 0, once the real pace of work has been measured; the proposal's research timeline (pilot in months 13 to 18) sets the outer limit.

&#91;embedded content: roadmap · 7 phases, 7 gates, then v1\]

Phase 5 runs alongside Phases 3 and 4. Everything else runs in order, because each phase builds on the one before.

### Phase 0: Foundations

- [x] Mockups on a Claude Design canvas for your approval: landing page, lab screen (desktop and phone), table builder, graph sheet, report, teacher dashboard, admin portal
- [x] Logo: three directions drawn for you to choose
- [x] Create `physics-anatomy` on your Desktop: Bun workspace, Turborepo, uv for the API, `.gitattributes`, `.gitignore` (scans excluded), branches
- [x] Harvest review of Wavelab and Physics Bench: each module marked keep, rewrite or drop, with a reason
- [ ] Install the selected skills and the pstack plugin; generate the verification skill
- [ ] CI with every gate from the software factory section, for TypeScript and Python
- [ ] Hosting spike: Next 16 on Workers via OpenNext; FastAPI with PostgreSQL on Cloudflare Containers; a WebSocket round trip; the service worker
- [x] Design system package: tokens, topic colours, Lyra components, Lucide icons, type prototype, projector theme, component catalogue
- [x] Docs skeleton, `GLOSSARY.md`, decision records from the decision log
- [ ] Connect a private GitHub repo and a Cloudflare account (needs you)

* [ ] Local setup on your PostgreSQL, documented in `docs/dev/local-setup-windows.md`
* [ ] Services inventory, deployment and self-hosting docs
* [ ] Trademark check on the name; licences inventory
* [ ] Running-cost model at 1,000, 10,000 and 100,000 students

### Phase 1: Core engine and the pendulum

- [x] Physics, instruments and analysis packages with validation tests and the Python cross-check
- [x] Event store on the device; attempts and exact resume
- [x] Guided state machine (checked in TLA+), rule engine, coach levels
- [x] Lab screen: bench, coach panel with three tabs, step strip, progress and playback controls
- [x] Parts tray, drag-and-snap assembly, magnifier, keyboard actions
- [x] Flexible table builder (standard, template, draw your own), graph sheet, calculator
- [x] Assist levels, formula cards, symbol and unit cards everywhere
- [ ] Spoken coach with captions, count-along, synthesised lab sounds; voice provider spike
- [x] Snapshots, labelled exports (PNG, SVG, PDF) and the ZIP bundle
- [x] Review, retry and compare
- [x] Report in WASSCE and 15-section formats, as PDF and DOCX; print sheets from the Anatomy pipeline
- [x] Exam mode for the pendulum
- [ ] Offline PWA; run on the benchmark phone
- [x] 3D bench spike: Anatomy 3D against React Three Fiber
- [ ] Five people who know no physics complete the pendulum unaided

### Phase 2: Three more flagships

- [x] Ohm's law and potentiometer: circuit solver, real meters, mistake catalogue
- [x] Converging lens: ray tracing, screen, pin parallax
- [x] Method of mixtures: heat model, thermometer lag, heat loss
- [x] Data templates, import and compare
- [x] Advanced uncertainty layer
- [ ] Physical reference data collected in a UEW lab

### Phase 3: Accounts, sync and classrooms

- [ ] FastAPI auth: email link and Google for teachers; class codes for students
- [ ] Event sync and adoption of signed-out work
- [ ] Teacher and lecturer dashboards; live sessions over WebSockets
- [ ] Admin portal: overview, usage, learning, content, support, people, system, audit
- [ ] Consent, data export and deletion
- [ ] k6 load test against the targets

### Phase 4: AI features

- [ ] Claude through the Anthropic Python SDK in the API, streamed to the browser
- [ ] Tutor (text and voice), what-if scenarios, report review
- [ ] Question drafting with reviewer approval in the admin portal
- [ ] Quotas, caching, feature flags
- [ ] Evaluation suite in CI

### Phase 5: Brand and landing page

- [ ] Final logo set: SVG, favicon, PWA icons, social card
- [ ] Landing page: shader hero, isometric cards, product demos
- [ ] Experiment pages with structured data
- [ ] Team, partners, contributors and donate pages

### Phase 6: Hardening and pilot

- [ ] ASVS Level 2 review and external penetration test
- [ ] Accessibility audit and translation readiness check
- [ ] All four experiments on the benchmark phone
- [ ] Usability tests with students; privacy documents reviewed by UEW
- [ ] Pilot class behind feature flags, then the launch checklist

## Also needed: gaps found in the final review

A last pass over the plan, reading it as a student, a school, a lawyer and an on-call engineer, found fourteen things a launch needs that no section owned yet. Each now has a home.

Specs and status for every item: Gap fixes. The legal documents are drafted in the separate Legal and Policy Pack.

| Item | Why it matters | Lands in |
| --- | --- | --- |
| Experiment versioning for saved work | A fix to an experiment must not break or silently change an attempt saved under the old version; each attempt pins its version, and old versions stay loadable | Phase 1 |
| First-run onboarding | A short guided tour of the lab screen, skippable, replayable from Help | Phase 1 |
| Lite mode | Lower-detail figures, no 3D, no shader, smaller downloads for the weakest phones and data plans | Phase 1 |
| Print stylesheets | Reports, tables and graphs that print cleanly from the browser in black and white | Phase 1 |
| Search | Find an experiment, a symbol, a formula or a glossary term from anywhere (Ctrl+K) | Phase 2 |
| Student account recovery | Students have no email, so a teacher can reset a student's code and move their work | Phase 3 |
| Email and notifications | Sign-in links, class invitations, assignment reminders for teachers, with an unsubscribe for each type | Phase 3 |
| Content editing without code | Reviewers and teachers suggest text changes in the admin portal; changes become pull requests, so review still applies | Phase 3 |
| Legal documents | Terms of use, privacy policy, cookie notice, child safeguarding policy, accessibility statement, reviewed by UEW | Phase 6 |
| Name and brand check | A trademark search on "Physics Anatomy" before buying the domain and printing anything | Phase 0 |
| Licences of everything we ship | Fonts, synthesised and recorded sounds, the TTS voice's licence, the Anatomy kit (MIT), every npm and PyPI package; a generated notices page | Phase 0 and every release |
| Real-device testing | Emulators miss real phones; test on a shelf of three low-cost Android phones and a school projector, plus a cloud device lab | Phases 1 and 6 |
| Support and incident process | Who answers help requests and how fast; on-call steps for an outage; a status page | Phase 6 |
| Running costs and funding | A monthly cost model (Cloudflare, Neon, Anthropic, TTS, Sentry, PostHog) at 1,000, 10,000 and 100,000 students, matched to the grant budget | Phase 0, reviewed each phase |

## Risks, open questions and next step

The biggest risk is breadth: the vision covers every topic and every level, and trying all of it at once would ship none of it well. The plan's answer is one experiment proven end to end before the next three, and four before forty.

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Scope grows faster than delivery | Nothing ships | v1 fixed at four experiments; the pendulum goes end to end first; new ideas go to a backlog with a decision record |
| One main developer | Work stalls if Mortey is unavailable | Docs, decision records and the factory let new people and agents pick up work; recruit reviewers early |
| Next.js on Cloudflare through OpenNext has gaps | Some Next features may not run on Workers; the API is a separate container either way | A Phase 0 spike deploys auth, D1 and a Durable Object before anything is built on it; fallback is TanStack Start on Workers |
| Low-cost phones struggle | Students give up | Budgets enforced in CI; SVG by default; 3D opt-in |
| Physics credibility | Teachers stop trusting it | Four validation levels; reviewer sign-off; public corrections log |
| AI cost, abuse or unsafe answers to minors | Bills or harm | Quotas, small models for hints, evaluations, instant off switch |
| Beta libraries (TanStack Hotkeys, Anatomy 3D, TanStack Charts) | Breaking changes | Wrapped behind our own interfaces; spikes before adoption |
| Copyright in source materials | Legal exposure | All content written fresh; scans stay private |
| Student data protection | Legal and trust damage | Minimal data, class codes, legal review before launch |
| Windows and Linux mixed development | Broken line endings or binaries | `.gitattributes`; dependencies installed on Windows |

**Open questions (none block Phase 0).**

- [ ] Logo direction: choose from three drafts in Phase 0.
- [ ] Domain name.
- [ ] Monthly AI budget ceiling.
- [ ] Donation route, agreed with UEW.
- [ ] Pilot schools and dates, aligned with the proposal's months 1 to 4.

**Next step.** On your approval, Phase 0 begins. It sets up the repository on your Desktop with git and branches, imports Wavelab's engines, installs the selected skills, prepares CI, and runs the Cloudflare and type prototypes.
