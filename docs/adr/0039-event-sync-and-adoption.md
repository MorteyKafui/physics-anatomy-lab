# 0039. Event sync, and adopting signed-out work

- Status: proposed (waiting for Mortey's approval)
- Date: 2026-11-18
- Builds on: [0011](./0011-accounts-optional.md), [0038](./0038-sign-in-sessions-and-class-codes.md),
  and the master plan's "Sync" paragraph and AGENTS.md rule 5 (offline first)

## Context

An attempt is an append-only list of events with ids unique across devices (`packages/engine`).
The plan says syncing means sending the events the server lacks and fetching the ones the device
lacks, that two devices can never conflict because nobody edits an old event, and that signed-out
work stays on the device and is adopted by the account at first sign-in. The lab must never wait
for the server.

## Decision

### What the server keeps

- `attempts`: one row per attempt **per owner**. The owner is a teacher (`users`) or a class
  member (`class_members`), never both. The device's attempt id is unique per owner, not across
  owners, so a student who imports a classmate's attempt file gets their own copy and can never
  write into the classmate's.
- `attempt_events`: the events, unique by (attempt, event id), with the event's `data` as JSONB.
  Each row also gets a server position from one sequence, used as the pull cursor.
- The attempt's header (experiment, mode, seed, format version) is fixed when it is first sent.
  A later push with a different header for the same id is refused, as that is a bug or tampering.

### The protocol

- **Push** (`POST /sync/push`): up to 20 attempts and 2,000 events per request. Events the server
  already has are skipped, so sending the same batch twice changes nothing and a retry after a
  dropped connection is always safe. The reply says how many events were new for each attempt.
- **Pull** (`GET /sync/pull?after=<cursor>`): the owner's events with a server position after the
  cursor, oldest first, up to 2,000 at a time, with the headers of their attempts and the next
  cursor. The device merges them (its `merge` skips what it holds) and keeps the cursor.
- A device always pushes before it pulls, so its own events come back at most once.
- Pushes for one owner take a transaction-level advisory lock on that owner, so server positions
  are handed out in commit order for each owner and a pull can never skip an event that commits
  late.
- **Limits:** an event's `kind` is at most 200 characters and its `data` at most 16 KB as JSON;
  ids are at most 200 characters. A request past a limit is refused whole (422) and the device
  tries again with smaller batches.
- Sync runs in the background when the device is online and signed in. Nothing in the lab waits
  for it (AGENTS.md rule 5).

### Adopting signed-out work

- Work done signed out belongs to the device, not to anyone. The device keeps a small table of
  which account holds which attempt, apart from the event store.
- At sign-in or on joining a class, the device lists the attempts no account holds yet, and the
  **person chooses** which to add to their account. Nothing is adopted without asking, because
  school computers are shared and the last pupil's work must not land in the next pupil's class.
- Adopted attempts are pushed like any others. An attempt held by one account is never offered to
  another on the same device.
- Signing out leaves the attempts on the device under their account; they sync again the next
  time that account signs in on that device.

## Consequences

- Sync is idempotent end to end: the server skips known events, the device's `merge` skips known
  events, and the cursor only moves forward.
- One copy per owner means the same events can be stored twice when an attempt file is shared.
  That is rare and small.
- Teachers will read class members' attempts through the dashboards (the next Phase 3 item),
  which query these tables by class; that item adds its own access rules.
- The adopt screen needs a board approved before it is built.
- Deleting a class member or a teacher deletes their attempts (cascade). Data export and deletion
  (a later Phase 3 item) builds on that.

## Alternatives considered

- **Comparing whole event-id sets on every sync.** Simple, but the request grows with the
  attempt's whole history; a cursor costs the same however long the attempt is.
- **Attempt ids unique across all owners.** Rejected: one shared attempt file would let a second
  account claim, or collide with, a classmate's attempt.
- **Adopting every signed-out attempt automatically at first sign-in**, as the plan's sentence
  reads. Rejected for shared school computers; the person chooses instead.
