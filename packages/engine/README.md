# @pa/engine

The event log, the guided ten-step state machine, the rule engine, the coach, audio cues and
scoring. So far it holds the event log and the ten-step machine.

## Attempts and events

An attempt is an append-only list of events (`GLOSSARY.md`). Everything the student sees is a
**projection**, a pure fold over those events, so resuming is exact: reopening the app rebuilds
the same bench, table and step.

- `events/types.ts`: `Attempt`, `LabEvent` and the replay order. Events are ordered by seq, then
  device, then id, which depends only on the events, so any two devices holding the same events
  rebuild the same state.
- `events/store.ts`: the `EventStore` contract. `append` records this device's events; `merge`
  adds events from elsewhere (sync, attempt files), skipping ones already held.
- `events/indexeddb-store.ts`: the lab's store, in the device's IndexedDB through Dexie, so it
  works offline. Each append runs in one transaction.
- `events/memory-store.ts`: the same contract in memory, for tests and scripted students.
- `events/replay.ts`: `replay` and `resume`.
- `events/attempt-file.ts`: export and import an attempt as a file.

Events carry plain JSON only, and nothing that identifies a person: an attempt is tied to a
learner only through the account or class that holds it, on the server (AGENTS.md rule 4).

## Tests

One contract suite runs against both stores (the IndexedDB one on `fake-indexeddb`). Property
tests check that closing and reopening mid-attempt gives the same state, that two devices working
offline converge whatever order they swap events in, and that attempt files round-trip.

## The ten steps

`steps/machine.ts` holds the steps of an attempt (Question to Report, `GLOSSARY.md`) and the help
levels (Auto, Check my work, On my own). `decide` turns what the student asks for into events or
refuses with a reason (a message key under `steps.refused`); `guidedProjection` rebuilds the
state from events and skips any event that breaks a rule. The rules:

1. A student can always reach a report: back to any step at any time, forward as far as the first
   unfinished step, and every step's exit check can be met (Measure needs a reading).
2. No reading is ever lost: deleting keeps it, restorable; stepping back keeps everything.
3. Exam mode never shows a hint, and the help level cannot change.
4. The accepted value stays hidden until Analyse is done and the feedback has been read.

They are checked twice:

- `spec/GuidedSteps.tla`, by TLC, the TLA+ model checker (13,785 states, every mode and help
  level). CI runs it on every pull request.
- `test/steps.test.ts`, which walks every state the TypeScript itself can reach (6,870 in guided
  and own-data modes, 1,145 in exam) and checks each rule, including that a report is reachable
  from every state, plus 2,000 random and tampered event lists.

Run TLC locally (Java 11 or later; download `tla2tools.jar` v1.7.4 from the TLA+ releases on
GitHub, SHA-256 in `.github/workflows/ci.yml`):

```powershell
cd packages/engine/spec
java -cp path\to\tla2tools.jar tlc2.TLC -config GuidedSteps.cfg -workers auto GuidedSteps.tla
```

## The coach

`coach/coach.ts` decides which findings (from `@pa/analysis`) to show, when, and how strongly.
It escalates per skill: it watches silently, then highlights the part, then gives a written hint,
then a demonstration. It shows one problem per skill at a time, the most serious first.

| Help level    | Live, as the student works | When a step is finished | When asked      |
| ------------- | -------------------------- | ----------------------- | --------------- |
| Auto          | Escalating                 | At least a written hint | The top problem |
| Check my work | Nothing                    | At least a written hint | The top problem |
| On my own     | Nothing                    | Nothing                 | The top problem |
| Exam mode     | Nothing                    | Nothing                 | Nothing         |

Everything the coach does is an event (`coach.note` for a silent watch, `coach.hint` for anything
shown), so `coachProjection` rebuilds its memory on resume. A hint counts only if the step machine
accepted it, so exam mode stays silent even with tampered events. Findings never block a step:
procedure mistakes are let through and carried into the results (master plan, "Allowed
mistakes").
