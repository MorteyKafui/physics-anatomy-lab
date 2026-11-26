# 0048. Anonymous usage counts, with an id that changes every day

- Status: accepted (Mortey, 2026-11-26, in chat)
- Date: 2026-11-26
- Builds on: [0040](./0040-admin-access-audit-aggregates.md), [0047](./0047-open-lab-accounts-off.md),
  and the master plan's list of product events
- Changes: the admin portal's Usage area, which until now counted only synced attempts

## Context

With accounts off (ADR 0047), the admin portal's usage numbers come from synced attempts, and
there are none. Mortey still wants to see how many people use the lab and which experiments they
use most. Cloudflare Web Analytics will count page views once the site is live, but it can't see
inside the lab (steps reached, reports finished) and isn't there for a local presentation.

Most visitors are children. The count must not identify anyone, follow anyone across days, or
need a consent banner.

## Decision

### What the device sends

- The product events from the master plan's shared list, and nothing else: `experiment_viewed`,
  `attempt_started`, `stage_completed`, `hint_shown`, `report_exported` and `attempt_completed`.
- Each event carries only: the event name, the experiment id, the step id (for
  `stage_completed`), the mode (guided, exam or own data), the export format (for
  `report_exported`), a device class (phone, tablet or desktop, from the screen width, never the
  user agent), the app version, and the day's id below.
- **No** readings, names, free text, IP-derived location, user agent, referrer or full URL.

### The day's id

- The device makes a random 128-bit id and keeps it in `localStorage` with the date. On a new
  day (the device's local date) it makes a new one and forgets the old.
- So the admin portal can count distinct visitors per day, but nothing links Monday's visitor to
  Tuesday's. No cookie is set.

### How it travels

- Events wait in a small queue on the device (at most 200; the oldest go first when it is full)
  and are sent with `navigator.sendBeacon` to `POST /usage/events` when the device is online,
  in batches of up to 50, and when the page is hidden.
- The lab never waits for this and never fails because of it (AGENTS.md rule 5). If sending
  fails, the batch stays queued; after three days unsent events are dropped.
- Browsers with Do Not Track or Global Privacy Control set send nothing.

### What the server keeps

- `usage_events`: one row per event with the fields above and the server's received time. No IP
  address is stored; the route reads it only for its rate limit (600 events per address per hour,
  counted as in ADR 0038) and then forgets it.
- Rows are kept for 13 months, so a year can be compared with the one before, then deleted by a
  scheduled job.
- The route needs no sign-in, accepts only the known event names and fields, and refuses a body
  over 32 KB.

### What the admin portal shows

The Usage area keeps the one dashboard pattern (ADR 0030) and reads `usage_events` with the
read-only, time-limited queries of ADR 0040:

- visitors per day (distinct day ids) and experiments opened, for the chosen range;
- experiments ranked by opens, with how many reached the report and how many were completed;
- where people stop: the share reaching each step, per experiment;
- exports by format, and devices by class.

The page says in one line how the numbers are counted: "Anonymous counts. A visitor gets a new
id every day, so returning visitors are counted again."

## Consequences

- No personal data and no cookie, so no consent banner. The Privacy page describes the counts in
  plain words.
- Visitors are overcounted across days and undercounted when Do Not Track is on. That is the
  price of not tracking anyone, and the page says so.
- PostHog (master plan) stays for later, behind consent, and would use the same event names.

## Alternatives considered

- **An id that lasts.** Rejected: it would show returning learners, but it is a persistent
  identifier for children and would need consent.
- **No id at all.** Rejected: admin couldn't tell ten visitors from one visitor opening ten
  experiments.
- **Cloudflare Web Analytics only.** Kept alongside once live, but it sees pages, not the lab.
