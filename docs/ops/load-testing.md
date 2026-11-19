# Load testing

The k6 classroom load test checks the master plan's scale targets ("Scale, performance and
observability"): before launch, staging must sustain 10,000 concurrent students with 200 live
classes of up to 60 students. The scripts are in `loadtest/`. They sit beside `e2e/`, not in it,
because they are not Playwright, are not a Bun workspace, and target the API alone.

## What one run does

| Part       | Who                           | What it does                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `setup()`  | Teachers                      | Each one signs in by email link, creates a class and, for live classes, starts a live session with a real experiment id.                                                                                                                                                                                                             |
| `teacher`  | One per live class            | Opens the board's socket (`/live/classes/{id}/teacher`) and sends a broadcast every `BROADCAST_EVERY` seconds. Reads the snapshot once a minute, as the board does (ADR 0041).                                                                                                                                                       |
| `student`  | `STUDENTS` devices, ramped up | Joins a class with its code and a display name. Then, lesson after lesson (`LESSON` seconds each): records lab events, and every `SYNC_EVERY` seconds pushes them and pulls, as the engine's `syncAccount` does. In a live class it keeps the student socket open, says `hello`, and sends bench summaries and 25-second heartbeats. |
| `teardown` | Teachers                      | Ends the live sessions.                                                                                                                                                                                                                                                                                                              |

Each push sends every event of the changed attempt. The engine does the same: the server skips
the events it holds. The web app does not run sync on a timer yet, so `SYNC_EVERY` is an
assumption. Revisit it when the lab calls `syncAccount`.

## What is measured, and when the run fails

k6 exits with a non-zero code when any threshold is crossed (`loadtest/lib/targets.js`).

| Metric                                     | Threshold             | Source                                                                                                                                                               |
| ------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http_req_failed`                          | under 0.1%            | Plan: API availability of 99.9%. A 4xx answer counts as failed, so a rate limit tripped by mistake fails the run.                                                    |
| `live_socket_ok`                           | over 99.9%            | Plan: availability, for sockets. Fails on a socket error or a close with any code other than 1000, 1001 or 1005.                                                     |
| `live_message_ms`                          | p95 of 300 ms or less | Plan: classroom messages. Timed from just before the teacher's broadcast request to the student's socket receiving it. Messages replayed on reconnect are not timed. |
| `sync_events_lost`                         | 0                     | Plan: zero synced events lost. Every event id the API accepted in a push must come back in a pull before the lesson ends.                                            |
| `checks`                                   | over 99.9%            | Every step of each journey did what it should.                                                                                                                       |
| `http_req_duration{name:join, push, pull}` | p95 of 1 s or less    | **Proposed**, not in the plan: a budget so a slow API shows up. Mortey to confirm.                                                                                   |
| `http_req_duration{name:broadcast}`        | p95 of 500 ms or less | **Proposed**, as above.                                                                                                                                              |

It also reports, without thresholds:

- `live_teacher_echo_ms`: the broadcast arriving back on the teacher's own board. This is the same
  path as `live_message_ms`, timed on one VU's clock.
- `live_messages_received`, `sync_events_accepted`.
- k6's own `ws_*` and `http_req_*` metrics, by request name.

**Clocks.** `live_message_ms` compares the teacher VU's clock with the student VU's clock. On one
machine they share a clock. On several k6 Cloud load generators the clocks are NTP-synced, to a
few milliseconds. If the two disagree, `live_teacher_echo_ms` is the one to trust.

## Rate limits

The limits count per network address (ADR 0038, ADR 0039). The test must not trip them by
accident, and must not weaken them:

- **Students** trip nothing. Joining with a right code is not limited, because a whole class
  shares one school address. Push and pull have size caps but no rate limit. Students never send a
  wrong code. The test sends no more than 30 frames in 10 seconds on a socket.
- **Teachers' email links** are limited to 30 per address an hour and 5 per email an hour. Each
  teacher has its own email for each run. Past 30 teachers, they need addresses of their own. So,
  locally:
  - start the API with `CLIENT_IP_HEADER=x-load-test-address`;
  - run k6 with `-e ADDRESS_HEADER=x-load-test-address`.

  Each teacher then signs in from its own address (`10.x.y.z`). `CLIENT_IP_HEADER` is the
  existing setting the proxy uses, so no limit changes. Never set it to a header clients control
  in staging or production: there it is `cf-connecting-ip`, which Cloudflare overwrites.

- **Live commands** are limited to 60 per teacher a minute. One broadcast every 10 to 30 seconds
  is far under that.

## Run the smoke profile locally

About four minutes:

- 4 live classes, 100 students;
- 30 s ramp up, 2 min hold, 30 s ramp down;
- 60 s lessons, a sync every 10 s.

1. Use a database of its own. `physics_anatomy_test` is dropped and rebuilt by every `pytest`
   run, including runs from other worktrees, which breaks a load test mid-run. Once, as the
   PostgreSQL superuser:

   ```powershell
   psql -U postgres -c "CREATE DATABASE physics_anatomy_load OWNER pa_app"
   ```

   Then build its schema from `apps/api`:

   ```powershell
   $env:DATABASE_URL = "postgresql+asyncpg://pa_app:<password>@localhost:5432/physics_anatomy_load"
   uv run alembic upgrade head
   ```

2. Start the API as one process (the test-only link route reads that process's memory), from
   `apps/api` and with that `DATABASE_URL`:

   ```powershell
   $env:ENVIRONMENT = "local"; $env:EMAIL_DELIVERY = "log"; $env:CLIENT_IP_HEADER = "x-load-test-address"
   uv run fastapi run app/main.py --port 8000
   ```

3. From the repository root:

   ```powershell
   k6 run -e ADDRESS_HEADER=x-load-test-address --summary-export loadtest/results/smoke.json loadtest/classroom.js
   ```

`loadtest/results/` is git-ignored. Every value in `loadtest/lib/profiles.js` can be overridden,
for example `-e STUDENTS=300 -e SYNC_EVERY=5`.

**The test-only route.** `GET /test-only/sign-in-link?email=` hands back the latest sign-in
token from the API's in-memory outbox (`apps/api/app/routes/load_test.py`). It is mounted only
when `ENVIRONMENT` is `local` or `test`, and is left out of the OpenAPI file. Even if it were
mounted, it answers 404 in any other environment, or when email is really sent.

## Running against staging, once it exists

The full profile is the plan's target:

- 200 live classes of 50 students, 10,000 students;
- 10 min ramp up, 30 min hold, 2 min ramp down;
- 10-minute lessons, a sync every 30 s, a bench summary every 5 s, a broadcast every 30 s.

For up to 60 a class, run with `-e STUDENTS=12000`.

It is not run in CI.

Staging has no test-only route and sends real email, so teachers cannot sign in from k6 there. A
staging run needs, first:

1. **A seed step.** It creates the 200 teachers and their classes and live sessions on staging,
   and writes their session cookies and class codes to a file that `setup()` reads instead of
   signing in. It runs once, with staging's database credentials, from a machine Mortey trusts.
   It is not written yet. It is the follow-up to this test, and should come with staging.
2. **Run** with:

   ```powershell
   k6 run -e PROFILE=full -e API_URL=https://<staging API> -e WEB_ORIGIN=https://<staging web> loadtest/classroom.js
   ```

   Leave `ADDRESS_HEADER` unset.

3. **Watch the API's side:**
   - container CPU and memory;
   - PostgreSQL connections, CPU, and NOTIFY queue use (`pg_notification_queue_usage()`).
     ADR 0041 expects up to 6,000 notifications a second at peak.

### What a staging run needs, and what it costs

The prices were checked on 19 November 2026. Check them again before buying.

| Need                                                    | Option                                                                                                                                                                                            | Expected cost                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load generator for 10,200 VUs, most with an open socket | **A runner machine (recommended).** One cloud VM of about 16 vCPU and 32 GB, in the same region as staging (the 300 ms target is same-region). Run k6 there for about 1.5 hours.                  | A few dollars a run, at roughly $0.50 to $1.50 an hour, depending on the provider.                                                                |
|                                                         | **k6 Cloud (Grafana Cloud).** $0.15 a virtual-user hour, after 500 free each month, with volume discounts above 100 VUs. One full run is (10,200 VUs × 42 min) ÷ 60 = 7,140 VUh before discounts. | About $250 to $1,000 a run, depending on the discount Grafana's calculator gives. Too much to repeat often.                                       |
| Database                                                | **Neon staging branch, autoscaling 2 to 8 CU** for the run. Then size it from what the run shows. Connections go through Neon's pooler.                                                           | 8 CU × 1.5 h = 12 CU-hours: about $1.30 on Launch ($0.106/CU-hour), or $2.70 on Scale ($0.222/CU-hour). Scaling to zero afterwards costs nothing. |
| API                                                     | Enough Cloudflare Containers for the target. Start with 4 and add while watching CPU.                                                                                                             | Depends on the container plan, which is not chosen yet (`docs/ops/services.md`).                                                                  |

## Reading the results

- **The end-of-run summary.** Each threshold shows a tick or a cross, with the value measured.
  Start with any cross.
- **A cross on `http_req_failed` or `checks`.** Look at the API's log for the status codes:
  - 401 means a session was lost;
  - 429 means a rate limit was tripped;
  - 5xx means the API failed.

  The check names say which step failed.

- **A cross on `sync_events_lost`.** This is the one that matters most. Events the API answered
  200 for did not come back in a pull. Find the attempt in the database before anything else.
- **`live_message_ms` high but `live_teacher_echo_ms` fine.** Suspect the load generator's clocks
  first, then the student sockets' fan-out.
- **Both high.** The path through PostgreSQL NOTIFY is slow. Check the database's CPU, the NOTIFY
  queue, and the container's event loop.
