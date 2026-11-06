# @pa/engine

The event log, the guided ten-step state machine, the rule engine, the coach, audio cues and
scoring. So far it holds the event log.

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
