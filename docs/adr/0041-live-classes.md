# 0041. Live classes, and what teachers can read

- Status: proposed (waiting for Mortey's approval)
- Date: 2026-11-18
- Builds on: [0011](./0011-accounts-optional.md), [0016](./0016-own-backend-fastapi-postgresql.md),
  [0017](./0017-dashboards.md), [0030](./0030-admin-portal-dark-dashboard-pattern.md),
  [0038](./0038-sign-in-sessions-and-class-codes.md), [0039](./0039-event-sync-and-adoption.md),
  and the master plan's "Live classrooms" paragraph and scale targets

## Context

A teacher runs a live class: they see every bench as it changes, push one hint to everyone with
the same mistake, lock steps and broadcast an instruction (GLOSSARY.md). The plan fixes the
shape: a WebSocket channel per live class, relayed between API containers by PostgreSQL
LISTEN/NOTIFY (no Redis, ADR 0016). Each bench sends a throttled stream. A student who drops
offline keeps working and catches up from the database on reconnect. The k6 target is 200 live
classes of up to 60 students, with messages delivered in 300 ms or less (p95).

The constraints:

- **Offline first** (AGENTS.md rule 5). The lab never waits on the channel.
- **Children's data** (rule 4). Students are display names in a class, nothing more.
- **The device is the authority.** The step machine and the coach run on the device, and the
  attempt syncs through `/sync` (ADR 0039).

## Decision

### Teacher read access

- A teacher reads only classes they own. Every read starts from `owned_class` (404 for anyone
  else's class) and reaches attempts through `class_members` of that class. So no attempt id in
  the URL can reach another class's work, and a teacher's own attempts never appear. Students get
  403 and signed-out visitors 401. The IDOR tests cover each route.
- The routes:
  - `GET /classes/{id}/attempts`: the members' attempts, with the step each is on.
  - `GET /classes/{id}/attempts/{attempt}/events?after=`: one attempt's events, in pages of up to
    500, by the same cursor as sync.
  - `GET /classes/{id}/mistakes`: the coach's findings (`coach.hint` and `coach.note` events),
    counted by student and by time.
  - `GET /classes/{id}/progress?experiment_id=`: each student's latest attempt, counted by step.
- On the server, "the step an attempt is on" is the step of its latest valid `step.go-to` in
  replay order (seq, device, id). The device's projection stays the authority. This reading of
  the same events is for lists and counts only.

### What a live session stores

- `live_sessions`: one row per lesson, with the class, the experiment, the lesson length (5 to
  240 minutes, default 40), whether steps are locked, and the start and end times. A class has at
  most one open session (a partial unique index). Starting again returns the open one, so a
  double click starts one.
- `live_benches`: one row per student per session. It holds the latest summary their device
  sent: attempt id, step, completed steps, current mistakes (rule, message key, skill; at most
  10), the number of readings, and the times they joined, were last updated, were last seen and
  finished measuring. It is a view of the attempt, never the record; the attempt itself syncs as
  before. Added 2026-11-26 (ASVS review, finding H): a mistake's rule is a plain slug, and its
  message key must be one the lab words. `packages/i18n` exports the keys to
  `apps/api/app/live/finding_keys.json`. Any other mistake is left out of the bench, and a hint
  push must name a known key.
- `live_messages`: what the teacher sent (`hint`, `broadcast` or `note`), as an append-only list.
  Each message has its recipients, fixed when it was sent (NULL for everyone), its data (at most
  2 KB) and an undo time. Its identity id is the catch-up cursor.
- Nothing new identifies a student. Benches and messages refer to class members by id. Display
  names are joined in only for the teacher.

### Retention

Benches and messages are deleted with their session **30 days after it ends**. Until the job
queue exists, the deletion runs each time a teacher starts a session. Deleting a class or a
student cascades to their live rows. A message's recipient list is an array of member ids, not a
foreign key, so a removed student's id can stay in a message until the 30 days are up. That id
leads nowhere.

### Commands over HTTP, changes over the socket

- The teacher's commands are ordinary requests, each in one transaction, behind the Origin guard
  and a limit of 60 per teacher per minute:
  - start;
  - end;
  - lock or unlock steps (`PUT …/live/lock`);
  - push a hint;
  - broadcast;
  - send a note to one student;
  - undo.
- **Hint push.** A hint goes to every student whose bench shows that mistake now. The server
  works out the recipients from `live_benches` when the hint is sent. Pushing the same mistake
  again, while the first hint is not undone, returns the first hint. A hint carries only the rule
  and the message key. Each device words it with its own finding, so the numbers in it are that
  student's.
- **One transaction, then NOTIFY.** Every change is written and announced with `pg_notify` in the
  same transaction. So a socket hears of a change only once it is stored, whichever container the
  socket is on.
- **The relay.** Each API container keeps one LISTEN connection (asyncpg) on the channel
  `pa_live` and fans each notification out to its own sockets for that class. Every payload is
  under 7,000 bytes (PostgreSQL refuses 8,000). If a payload would be larger, the sockets are sent
  `resync` instead.

### The sockets

- **Endpoints.** `/live/classes/{id}/teacher` is the teacher's board, and it only listens.
  `/live/student` is a student's device. Both use the session cookie (ADR 0038).
- **The handshake.** It must carry the web app's `Origin`; any other origin, or none, fails the
  handshake. This stops cross-site WebSocket hijacking, since the cookie rides along from any
  site.
- **Who may connect.** A wrong principal is accepted and then closed with an application code, so
  the client knows not to retry:
  - 4401: signed out;
  - 4403: the wrong kind of account;
  - 4404: not your class.
- **Signing out.** Every 5 minutes an open socket checks that its session is still good, and
  closes with 4401 if it is not. Added 2026-11-26 (ASVS review, finding F): when a sign-in
  ends, the sockets it concerns check at once, on every container. This covers signing out, a
  student being removed, and a class or account being deleted. A teacher's board for a class
  that no longer exists closes with 4404.
- **Bad frames.** Only text frames are accepted, each at most 8 KB. A socket that sends more than
  30 frames in 10 seconds is closed (4429). A malformed frame closes the socket (1007).
- **Slow sockets.** A socket that falls 256 messages behind is closed (4408). Its client
  reconnects and catches up.

### The message protocol (JSON text frames)

A student sends:

| Frame                                                                             | When                                    |
| --------------------------------------------------------------------------------- | --------------------------------------- |
| `{type: "hello", after}`                                                          | On every connect: the last message seen |
| `{type: "bench", attempt_id, experiment_id, step, completed, mistakes, readings}` | When the bench changes, throttled       |
| `{type: "ping"}`                                                                  | Every 25 s (browsers cannot send pings) |

A student receives:

- `state`: the session (or null), with the lock and the cursor;
- `message`: a hint, broadcast or note, without its recipient list;
- `undone`: a message taken back;
- `lock`;
- `started` and `ended`;
- `resync`;
- `pong`.

The teacher receives:

- `bench`;
- `presence`: here or not;
- `message`, with its recipients;
- `undone`;
- `lock`;
- `started` and `ended`;
- `resync`;
- `pong`.

The board first reads `GET /classes/{id}/live` (the snapshot) and then applies the frames. It
reads the snapshot again on `resync`, on every reconnect, and once a minute, which corrects who
is here if a container went away without saying so. The TypeScript mirror of the frames is
`packages/api-client/src/live.ts`.

### Throttle and presence

- **Bench summaries.** A bench sends at most one every **2 seconds**, on the device and again on
  the server. A newer summary inside the window replaces the waiting one and is sent when the
  window ends, so the teacher always ends up with the latest state. A bench is written only while
  its class has an open session for that experiment.
- **Presence.** A student is "here" if heard from in the last **60 seconds**. Heartbeats move
  `last_seen_at` forward at most every **20 seconds**. Joining and leaving are announced to the
  teacher.
- **Reconnecting.** A device waits before each reconnect: from 1 s, doubling up to 30 s, with
  jitter, so a whole class does not reconnect at once. It stops after 4401, 4403 or 4404.
- **Catch-up.** On reconnect the device says `hello` with its cursor. It gets the session's state
  and at most the 100 newest messages for it that are not undone. It resends its latest bench.
- **Locking.** The device enforces a lock. The server only records it and tells devices, because
  the lab runs offline.

### The lab and the student screen

The student's side is `StudentLive` in `packages/api-client`. It is built and tested here, but
not yet wired into the lab. How a hint, a lock or a broadcast looks on the bench needs a board
approved first, and students cannot sign in from the web app until the sign-in and join screens
are built. Wiring it in must keep the lab independent of the socket: the lab starts, records and
saves with no connection.

## Consequences

### What becomes easier

- Any number of API containers serve one class. A class needs no sticky sessions and no Redis,
  and a restart loses nothing, because every message is in PostgreSQL first.
- Undo, catch-up after a dropped connection and an audit of what was sent all come from the same
  `live_messages` table.
- Commands are plain HTTP, so they reuse the Origin guard, rate limits, transactions and tests.

### What becomes harder

- Every API container holds one extra PostgreSQL connection for LISTEN, and every notification
  reaches every container. At the k6 target (200 classes of 60, a bench every 2 s at most), that
  is up to 6,000 notifications a second at peak. Most benches change far less often. The load
  test (Phase 3) checks this.
- Each bench write is one upsert plus one NOTIFY. Heartbeats write at most every 20 s.
- The board's step and mistake summary is computed on the device. A device on an old version
  sends what that version knows.

### Technical debt accepted

- Ended sessions are cleaned up when a teacher starts a session, not by a scheduled job. This
  moves to Procrastinate when it arrives.
- The server's reading of "the step" from events ignores the step machine's refusals. A damaged
  log could show a step the device would not.
- A student with two tabs open shows as gone when one tab closes, until the next heartbeat or the
  board's minute refresh.

## Alternatives considered

- **Redis pub/sub or a managed broker.** Rejected by ADR 0016: one more service to run and pay
  for, when PostgreSQL already holds the data and can relay it.
- **Teacher commands over the socket.** This would mean one connection instead of two kinds. It
  was rejected because commands then need their own CSRF, rate-limit and retry rules, and their
  own idempotency, which HTTP already has.
- **Sticky sessions (a class pinned to one container) with in-memory fan-out.** Simpler at first.
  But a class dies with its container, and it needs routing the hosting (Cloudflare Containers)
  does not guarantee.
- **Polling the snapshot every few seconds.** No sockets at all. But it costs far more queries at
  60 students a class, and a teacher's hint would arrive seconds late. The plan asks for 300 ms.
- **Streaming raw events to the teacher and projecting them in the browser.** This is exact. But
  it sends every event of 60 students to the board, and the board then holds 60 projections in
  memory. The summary is small and the device already has it.
- **Doing nothing.** There would be no live class, the plan's thirteenth goal ("one classroom,
  many benches").

## Review triggers

- The k6 load test misses 300 ms p95 for classroom messages, or NOTIFY throughput becomes the
  bottleneck. Then consider one channel per class, or a dedicated relay.
- More than 20 API containers. Every container receiving every notification starts to cost.
- The job queue arrives. Move the 30-day cleanup to it.
- The student board is approved. Wire `StudentLive` into the lab, and revisit the throttle with
  real classes.
- Review after the first pilot term (Phase 6) in any case.
