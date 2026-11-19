# 0044. The lab's JavaScript budget is 160 KB on top of the shell

- Status: accepted (Mortey, 2026-11-19, in chat)
- Date: 2026-11-19
- Changes: the master plan's "Performance budgets" row "Extra JavaScript per experiment: 150 KB
  compressed or less", enforced by `e2e/tests/performance.spec.ts`

## Context

The lab (the shell and the pendulum) must open within its JavaScript budget on the benchmark
phone. The tutor (Phase 4 item 2) used most of the room that was left, though its panel, its
messages and the API client load only when the Ask tab opens. The What if button and its state
then put the lab 311 bytes over: 358,711 bytes against 358,400. Report review and Ask what if
still have to fit, and each needs a little room on the lab's first download.

## Decision

The lab may download 160 KB compressed on top of the 200 KB shell: 360 KB in all, up from 350 KB.
The shell's own budget, 200 KB, is unchanged, and so are the other budgets.

## Consequences

- `e2e/tests/performance.spec.ts` checks the lab against 360 KB.
- New AI parts keep loading their code only when they are first used, as the tutor and What if
  panels do, so the extra 10 KB is for what must be on screen when the lab opens.
- The master plan's budget row needs the new figure. The plan is a Claude Doc owned by the main
  account, so the main account changes it there and exports it here (AGENTS.md); until then this
  record is the source.
