# Architecture in one page

- **Local first.** Experiments, tables, graphs, snapshots and reports run in the browser and save
  to the device (IndexedDB). The lab works offline as an installable app.
- **One backend.** A FastAPI service on PostgreSQL handles accounts, sync, live classes, AI, the
  admin API and research exports. PostgreSQL also carries live-class messages (LISTEN/NOTIFY),
  the job queue and rate-limit counters, so there is one thing to run.
- **Sync.** An attempt is an append-only list of events with unique ids. Syncing sends the events
  the server lacks and fetches those the device lacks; two devices can never conflict.
- **Live classes.** The API opens a WebSocket channel per class session; LISTEN/NOTIFY relays
  messages between API containers.
- **Hosting.** The web app runs on Cloudflare Workers through OpenNext; the API runs as a
  container on Cloudflare Containers; the database is Neon (PostgreSQL 18). The same container can
  run on a UEW server later.
- **Physics.** Models live in `packages/physics` and are cross-checked by independent Python
  models in `validation/` on every pull request.

The full design is in the master plan (docs/README.md has the link).
