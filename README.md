# Physics Anatomy

**Physics from first principles.** A virtual physics lab where students build real experiments
from their parts, take readings with realistic instruments, and get coached step by step until
their table, graph and report are right. For SHS (WASSCE) to university students, teachers,
lecturers and researchers. Free, offline-capable, and built at the University of Education,
Winneba.

Version 1 ships the full platform with four deep experiments: the simple pendulum, Ohm's law
with a potentiometer, the converging lens, and the method of mixtures.

## Layout

| Path | Holds |
|---|---|
| `apps/web` | Next.js 16: the public site, the lab, teacher and lecturer dashboards |
| `apps/admin` | Next.js admin portal, behind Cloudflare Access |
| `apps/api` | FastAPI on PostgreSQL: accounts, sync, live classes, AI, exports |
| `packages/physics` | Physics models: pure, deterministic, tested |
| `packages/instruments` | Least count, zero error, human factors, seeded noise |
| `packages/engine` | Event log, guided steps, rule engine, coach, scoring |
| `packages/experiments` | One folder per experiment |
| `packages/apparatus` | The Anatomy kit and every apparatus figure |
| `packages/analysis` | Units, significant figures, fits, table and graph checks |
| `packages/ui` | The design system: tokens and components |
| `packages/api-client` | TypeScript client generated from the API schema |
| `packages/i18n` | Message files for text and spoken lines |
| `validation` | Independent Python models that cross-check the TypeScript ones |
| `design` | The approved mockups: the specification for every screen |
| `docs` | Guides, reference, decision records, runbooks |

## Getting started on Windows

You need Bun, Git, uv and your local PostgreSQL 18 (no Docker). The full guide is
[`docs/how-to/local-setup-windows.md`](docs/how-to/local-setup-windows.md).

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
bun run dev
```

## How we work

Read [`AGENTS.md`](AGENTS.md) (it applies to people too), the
[contributor guide](docs/how-to/contribute.md) and the [decision records](docs/adr/).
