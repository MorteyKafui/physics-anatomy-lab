# @pa/usage

Anonymous usage counts from the lab (ADR 0048). The device queues six product events and sends
them, a batch at a time, to `POST /usage/events`.

- **What goes:** the event name, the experiment id, the step (`stage_completed`), the mode
  (guided, exam or own data), the export format (`report_exported`), a device class from the
  screen width, the app version and the day's id. Nothing else: no readings, names, text, user
  agent, referrer or URL.
- **The day's id:** 128 random bits kept in `localStorage` with the device's local date, and
  replaced on a new day. No cookie.
- **The queue:** at most 200 events (the oldest go first); events not sent within three days are
  dropped.
- **Sending:** `navigator.sendBeacon`, at most 50 events a time, when the device is online: when
  the page is hidden, when the connection comes back, when 50 are waiting, and a little after the
  last event. A failed send stays queued.
- **Do Not Track or Global Privacy Control:** nothing is queued or sent.
- **Never in the way:** every call returns at once and nothing here can throw into the lab
  (AGENTS.md rule 5).

Why a package of its own, not part of `@pa/engine`: the engine is the lab's pure event log and
step machine, with no browser or network code, so it replays the same way everywhere. This is
browser transport, and the admin portal and the API share its list of names.

```ts
import { startUsage, trackUsage } from "@pa/usage";

startUsage({ endpoint: "/api/usage/events", appVersion: "1.2.0" });
trackUsage({ name: "experiment_viewed", experimentId: "simple-pendulum", mode: "guided" });
```
