# 0034. Type: Geist, Geist Mono and Bricolage Grotesque

- Status: accepted
- Date: 2026-11-06
- Decision log entry: D34 in `docs/planning/00-decisions.md`

## Decision

The interface uses Geist, every number, unit and code uses Geist Mono with tabular figures, and
display headlines use Bricolage Grotesque.

## Details and consequences

The master plan named these three as candidates and asked for a side-by-side prototype in
Phase 0. The approved mockups already use them, and the type specimen in the design system
catalogue (`/design-system` in the admin app) showed them with real lab text and numbers from
the physics package. Mortey confirmed them on 6 November 2026, so no further prototype is made.

All three are open-licensed (SIL Open Font License) and load through `next/font`, which
self-hosts them, so no request goes to Google at run time and the lab keeps working offline.
`packages/ui/src/styles.css` maps them to `font-sans`, `font-mono` and `font-display`.
