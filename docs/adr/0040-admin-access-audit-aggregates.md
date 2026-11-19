# 0040. The admin API: Cloudflare Access checked by the API, an append-only audit, live aggregates

- Status: proposed (waiting for Mortey's approval)
- Date: 2026-11-18
- Builds on: [0017](./0017-dashboards.md) (admin portal separate, behind Cloudflare Access),
  [0030](./0030-admin-portal-dark-dashboard-pattern.md) (the dashboard pattern),
  [0029](./0029-no-dummy-content.md), [0011](./0011-accounts-optional.md) and the master plan's
  "Dashboards and the admin portal" section

## Context

The admin portal (`apps/admin`) is for staff only and sits behind Cloudflare Access with two-step
verification (D17). It needs numbers the API holds (classes, attempts, synced events) and a few
changes staff must be able to make (turn AI off for a class, replace a display name that looks
like contact details). Three things had to be settled: how the API knows a call is from staff,
how staff actions are kept on record, and how the charts are worked out without slowing students
down.

## Decision

### Who is calling: the Access token, checked by the API

- Every admin call carries the token Cloudflare Access issues after sign-in, in the
  `Cf-Access-Jwt-Assertion` header. Access adds it to each request that reaches the admin
  portal; the portal's server passes it to the API unchanged. The browser never calls the admin
  API, and the portal has no session of its own.
- The API checks the token on every call (`app/admin/access.py`): the RS256 signature against the
  team's public keys at `https://<team>/cdn-cgi/access/certs` (kept for an hour, fetched again at
  most once a minute when a token names a key it does not have), the issuer `https://<team>`, the
  audience (the admin application's tag), the expiry with 30 seconds' leeway, and an `email`
  claim. Service tokens carry no email and are refused, so every action names a person.
- The team domain and the audience tag are settings (`CF_ACCESS_TEAM_DOMAIN`,
  `CF_ACCESS_AUDIENCE`), never committed. `ADMIN_STAFF_EMAILS`, if set, is a second check behind
  the Access policy, for a policy set wider than meant.
- **Fails closed.** With Access not configured the admin routes answer 503 to everyone. The
  router carries the check, so a new admin route cannot forget it.
- **Local development** uses `ADMIN_DEV_BYPASS_EMAIL`: every admin call counts as that person,
  marked `dev-bypass` in the audit log. Settings refuse it outside `local` and `test`, so a
  deployed server cannot start with it.
- The web app's sessions (teachers, class members) open nothing under `/admin`.

### The record: `admin_audit`, append-only, two years

- One row per staff action: when, who (the Access email and how they were identified), the
  action (`class.ai.set`, `member.display-name.replace`, `export.create`), what it was done to
  (type and id), and a small JSON detail.
- Written in the same transaction as the change, so a change and its entry commit together or
  not at all. Exports are recorded too, because data leaves the system. Reads are not: Access
  logs each sign-in, and recording every page view would bury the actions.
- **Never a child's data in the record.** Replacing a display name records that it was replaced
  and why, never the old or the new name: an old name flagged as contact details must not be
  kept anywhere.
- **Append-only, enforced by the database.** A trigger refuses every update, and refuses deletes
  of entries younger than two years. Entries older than two years may be deleted by a scheduled
  job (not built yet). No foreign keys, so a deleted class or student keeps its history.

### The numbers: worked out per request, read-only, time-limited

- Each chart is one aggregate SQL query over the live tables (`app/admin/queries.py`), run when
  the page loads. At pilot scale (thousands of attempts) these take milliseconds; a cache or a
  rollup table would only add a second copy that can be wrong.
- Every read runs in a **read-only transaction with a statement timeout**
  (`ADMIN_STATEMENT_TIMEOUT_MS`, 5 s), so a mistake in a query cannot change data and a heavy one
  is stopped before it holds up students.
- `ADMIN_DATABASE_URL` points the reads at a read replica when there is one, as the plan asks;
  until then they read the primary, still read-only. One partial index,
  `attempt_events (kind, at_ms)` for step completions and hints only, serves the event charts.
- **When to change this:** when any admin query takes more than 500 ms at the 95th percentile,
  add a replica first, then nightly rollup tables for that chart (with a new record).
- Counts come from synced events as recorded. A student who works signed out is not counted (the
  lab works without an account), and the portal says so. Times are the device's clock.
- Students appear as counts, or by display name inside a class, never with contact data.
  Teachers' emails are shown to staff, for support.

### What the portal does not show yet

Areas whose data does not exist (AI spend, Sentry errors and latency, PostHog device data,
deploys, sync failures, the running-cost model, support requests, the question bank, research,
translation) show a plain "not recorded yet" with what will fill them, never invented numbers
(D29).

## Consequences

- Setting up the portal needs a Cloudflare Access application for the admin hostname, its
  audience tag and the team domain in the API's settings, and `ADMIN_API_URL` in the portal's.
- A stolen Access token works until it expires (24 hours by default in Access). Keep the Access
  session short for the admin application; a revoked staff member loses access when their Access
  session ends.
- Live aggregates mean an admin page load costs a few queries on the primary until a replica
  exists; the timeout bounds the worst case.
