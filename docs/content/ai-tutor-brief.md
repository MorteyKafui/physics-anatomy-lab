# The tutor, what-if scenarios and report review: brief

The second Phase 4 item (master plan, "Tutor (text and voice), what-if scenarios, report
review"), written for review before anything is built. It builds on item 1's plumbing (ADR 0043):
the rule for who may use AI, the typed context, the stream and the log. The plan says:

| Feature           | What Claude does                                                                                              | Guardrail                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tutor             | Answers "why" and "I'm stuck" for the current step, asking a guiding question first                           | Sees the experiment, step and recent events, never personal data; physics and maths only                                                                                             |
| What-if generator | Turns a question ("what if the string stretches?") into a scenario: parameter changes and assumption switches | Output is JSON checked against a schema of what the model supports; the app runs the real model; anything outside the model's limits is declined, with the nearest supported variant |
| Report review     | Comments on the conclusion, precautions and sources of error                                                  | Quotes the rule it relies on; never rewrites the report itself                                                                                                                       |

And elsewhere: "a help button on every step offers a hint first, then the AI tutor (online)";
the AI voice tutor is "online only, with the same quotas as the text tutor"; no recording of
users' voices in v1 (D19); "Curious adult: to ask 'what if' and see it happen, without signing
up".

- **Status:** approved by Mortey on 2026-11-19: decisions 1 to 9 as proposed, with the browser's voice for replies and what-if scenarios opening on the bench.

## The decisions

### 1. AI stays off in production until item 4

Item 2's pull requests merge with `AI_ENABLED` off on every deployed server. AI is turned on only
after item 4 adds quotas per person and per address, answer caching and the admin portal's
off switch, so no student can run up a bill before the limits exist. Locally and in tests it
runs against the fake Claude, or against the real one with Mortey's key on his machine.

### 2. Where the tutor lives

- A fourth tab in the coach panel, **Ask**, after Instructions, Explanation and Tips. It is shown
  only when `GET /ai/status` says the tutor is available. Otherwise the tab is not there, and the
  help button's menu says why in one line ("Your teacher has not turned AI on for this class").
- **The help button** (the "?" in the lab header, already on the Lab board) opens a short menu
  in the plan's order: a hint from the coach (offline), Ask the tutor (online), Report a problem.
- **Off in exam mode**, like the rest of the coach. At every help level, including On my own: the
  student asked, so the tutor answers.
- **A guiding question first.** The first reply to a new question is a question back, unless the
  student has already tried (the system prompt says so). The tutor never gives the final value
  the student is working towards (g, f, c and so on) before Analyse is done.
- **Short threads, not saved.** A thread is up to six exchanges about the current step. It lives
  in memory only. It is not an event, so it is never synced, saved with the attempt or seen by
  the teacher, and it is gone when the step changes or the page closes. Each request sends the
  thread so far, which is at most six exchanges.

### 3. What the tutor is sent

Item 1's context, filled in by the device from the attempt:

- the experiment, its version, the step and the help level;
- up to 40 recent events, summarised (a reading taken, a part placed, a finding the coach raised,
  by rule id);
- the quantities **the student can already see at that step**, worked out by `packages/physics`
  and the analysis code: their readings, their table's worked values, their slope. Not the
  accepted value, and not the bench's hidden settings, so the tutor cannot give the answer away;
- the student's question and the thread so far.

Never a display name, class, code or anything typed into the report.

### 4. Numbers in replies

The tutor's reply is checked on the server when it ends: every number in it must be one of the
context's quantities (to the precision shown), a count from the step's instructions (20
oscillations, 10°), or a small whole number in plain counting. If a reply contains any other
number, the stream ends with `refused` and the message "That answer used a number that is not
from your bench, so it has been hidden. Try asking again." The text already shown is removed, as
ADR 0043 says for `refused`. Each such reply is counted in the log (a new outcome, `held`), so
the evaluation suite in item 5 can find prompts that need work.

### 5. The voice

- **Spoken replies through the browser's own voice**, the same speech engine the spoken coach
  uses (`packages/audio`), at the student's speed and volume, with the text as the caption. It
  costs nothing and needs no new provider.
- **No voice input.** Nothing records the student's voice (D19). Typing, or the phone's own
  dictation in the keyboard, is the way to ask.
- **Choose:** keep the browser's voice for tutor replies (free), or plan a cloud voice later
  (about $300 a month at 100,000 students, by the cost model). Proposed: the browser's voice now;
  the voice provider spike in Phase 1's audio item decides the scripted lines separately.

### 6. What-if scenarios

Two parts, so the plan's "curious adult without signing up" is served too:

- **The scenario editor (no AI, offline, signed out too).** A What if panel on each experiment
  lists the changes its model supports, as sliders and switches with their limits. For the
  pendulum: the length; the strength of gravity (here, the Moon, Mars, Jupiter, as stated facts in
  `packages/physics` with their source); the amplitude, with the small-angle formula switched off
  above 10° so the exact period is used; the bob's mass (no effect, which is the point). The panel
  shows what the model predicts against the experiment as set, with the graph line for both.
- **Ask what if (AI).** The student types a question. Claude answers with a scenario as JSON
  (structured outputs), checked against the experiment's scenario schema: only listed changes,
  only within their limits. The editor is filled in from it and the real model runs. A change
  the model does not support ("the string stretches") is declined in one sentence, with the
  nearest supported variant ("a longer string, 0.85 m"), which the student can open.
- **Choose:** whether a scenario can also **open on the bench** as an unmarked attempt (a new
  mode, `what-if`: no marks, no report, kept like other attempts). Proposed: yes, for the
  pendulum first, as its own pull request after the panel.
- The scenario schemas and limits are physics content, so the physics reviewer approves them,
  and the predictions are tested against the analytic result and the Python models in
  `validation/`, as rule 1 requires.

### 7. Report review

- **Ask for a review** in the report screen, under the sections it reads: Conclusion,
  Precautions and Sources of error, and Discussion in the university format. It is never sent
  the Date and title, Aim or any other section.
- Claude answers with comments as JSON: the section, the student's words it is about (quoted
  exactly), the comment, and **the rule it relies on, by id, from a list the app sends** (the
  report rules the offline checks already use, such as "a precaution says what you did, in the
  first person" or "a source of error is not a mistake you made"). A comment that quotes words not
  in the report, or names a rule not in the list, is dropped.
- Comments appear as notes beside the section, each with its rule. Claude never rewrites the
  report: nothing it sends changes the student's text, and there is no "apply" button.
- Model: Claude Sonnet 5.5, as approved in item 1.

### 8. One new event type in the stream

What-if scenarios and review comments are structured, not prose. ADR 0043's stream gains one
event, `item` (`{"item": {...}}`), each item checked against its schema on the server before it
is sent. The tutor still streams `text`. ADR 0043 is amended in the same pull request.

### 9. The teacher's switch, and what students are told

- The teacher's class page gains the **AI for this class** switch (the API already accepts it),
  off by default, with one line on what it means and a link to the AI policy.
- The Your data page gains the line item 1 deferred: what AI is sent, that questions and replies
  are not kept, and that a usage count is kept for 90 days without them.

## The board

The tutor, the help menu, the what-if panel, report review and the teacher's switch are new
screens or parts of screens, so a board is drafted first, `design/mockups/AI.dc.html`, in the
dark lab theme and at phone width: the Ask tab (empty, a guiding question, a streamed reply, a
held reply, offline, AI off for the class), the help menu, the What if panel (editor, an AI
scenario, a declined question with its nearest variant), report review notes, the teacher's
switch and the Your data line. It comes as its own pull request for approval before the screens
are built.

## The pull requests, in order

1. This brief.
2. The board, for approval.
3. The tutor: the Ask tab, the help menu, the context from the attempt, the number check, and the
   tests (Playwright against a mocked API stream).
4. The tutor's voice.
5. Scenario schemas and the What if panel for the pendulum, with its physics tests; then Ask what
   if; then opening on the bench, if chosen.
6. Scenario schemas for Ohm's law, the converging lens and the method of mixtures, one each.
7. Report review.
8. The teacher's switch and the Your data line (or with 3, if the board puts them together).

## What Mortey needs to provide

Nothing new for this item beyond item 1's list: the Anthropic key and `AI_LOG_KEY` before AI runs
anywhere but tests, and the monthly AI budget before item 4 turns it on. A cloud voice would add a
provider and a bill, and is not proposed now.

## Not in this item

- Quotas, answer caching and per-feature switches (item 4), the evaluation suite (item 5),
  question drafting (item 3), voice input, saving tutor threads, and a teacher reading them.

## Opening a what-if scenario on the bench: design

Decision 6 approved opening a scenario on the bench as an unmarked attempt. How it works, for
approval before it is built:

1. **A new attempt mode, `what-if`.** "Open on the bench" in the What if panel starts a new
   attempt with the scenario saved as its first event (`scenario.set`: length, place, amplitude,
   mass). The lab opens it from then on, like an exam; the student's practice run is kept, and
   a bar at the top says "What if: the pendulum on the Moon · not marked", with **Back to my
   practice**.
2. **The bench runs the scenario.** The period, the bob's swing and the stopwatch follow the
   scenario's g, length and amplitude (`packages/physics`), so a student can time the pendulum on
   the Moon and work out g there. The bench is built already; the attempt starts at Measure.
3. **Not marked, no report.** The coach still helps (counting from zero, timing many swings), but
   Analyse compares the result with the scenario's own g, Review and Report are not offered,
   and Conclude and Report stay closed. A teacher's dashboard leaves what-if attempts out of its
   counts and mistakes.
4. **Where it changes code beyond the lab:** the mode is added to the step machine's TLA+ model
   (it behaves as guided, so its properties still hold and are rechecked in CI), to sync's schema,
   and to the database's check on modes (migration 0008). What-if attempts sync like any other.
5. **Pendulum first.** The other experiments follow when their scenario models are reviewed.
