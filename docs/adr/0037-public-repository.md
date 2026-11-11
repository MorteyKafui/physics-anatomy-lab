# 0037. The repository is public

- Status: accepted (Mortey, 2026-11-11)
- Date: 2026-11-11
- Decision log entry: D37 in `docs/planning/00-decisions.md`
- Supersedes: [0009](./0009-private-repository.md), "Private repository for now"

## Decision

The GitHub repository `MorteyKafui/physics-anatomy-lab` is public. Mortey changed its visibility
on 2026-11-11.

## Why

CI on pull request #41 stayed queued and would not start. Public repositories get GitHub Actions
without the private plan's limits, and GitHub can enforce branch protection on them.

## What stays private

Making the code public changes nothing in these:

- **Source scans** stay out of the repository (ADR 0012). `research/` is git-ignored, and the
  copyrighted practical book scans are kept outside it. Nothing quoted or copied from them is
  committed.
- **Children's data** is never in the repository (ADR 0011). Example data carries a visible label
  (ADR 0029).
- **Secrets** are never committed. CI's secret scan runs on every pull request.
- **The master plan and the design canvas** stay Claude artifacts owned by Mortey's account. The
  repository has the exported copies (`docs/planning/`, `design/mockups/`), which are now public
  too.

## Consequences

- Anything committed, including the history before this change, can be read by anyone.
- GitHub can now enforce branch protection on `main`. Until a rule is set there, the guard is
  still `.githooks/pre-push`, which refuses pushes to `main`.
- The repository has no licence file, so its contents stay all rights reserved. Choosing a licence
  is a separate decision.
- AGENTS.md says the repository is public, and how `main` is guarded.
