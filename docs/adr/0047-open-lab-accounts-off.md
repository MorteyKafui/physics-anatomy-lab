# 0047. An open lab: accounts are switched off

- Status: accepted (Mortey, 2026-11-26, in chat)
- Date: 2026-11-26
- Supersedes, while the switch is off: the account parts of [0011](./0011-accounts-optional.md),
  and the student and teacher flows of [0038](./0038-sign-in-sessions-and-class-codes.md),
  [0039](./0039-event-sync-and-adoption.md), [0041](./0041-live-classes.md) and
  [0042](./0042-consent-export-and-deletion.md)

## Context

The lab already works signed out (ADR 0011). Accounts add teacher sign-in, class codes, live
classes, sync between devices and AI help. Before going live, Mortey is presenting Physics
Anatomy locally and wants it open to anyone, the way PhET and oPhysics are: open a page, do the
experiment, no sign-in, no sign-up, no class code.

The account code is built, reviewed and tested. Deleting it would throw that work away, and
classes may come back for a school pilot.

## Decision

- One setting, `ACCOUNTS_ENABLED`, read by the web app, the admin portal and the API. It is
  **off** by default in every environment.
- With it off, the web app shows no sign-in, sign-up, join, account, teacher or AI-help link
  anywhere: header, landing page, footer, lab, report, experiment pages and the 404 page.
- The routes `/sign-in`, `/sign-in/link`, `/join`, `/account/*` and `/teach/*` redirect to `/`
  with a 307, so old links and bookmarks land somewhere useful. They are also removed from the
  sitemap and disallowed in `robots.txt`.
- The API answers `404` on the auth, class, live, sync, privacy-export and AI routes. The admin
  API and the new usage route (ADR 0048) stay on.
- AI help is off for everyone, because it was only ever on for signed-in users in classes
  (ADR 0008).
- Work stays on the device, as it does today for signed-out students. Snapshots, tables, graphs
  and report exports are unchanged.
- The Terms and Privacy pages drop the sections about accounts, classes and teachers while the
  switch is off, and say plainly that nothing is stored about a visitor except the anonymous
  counts in ADR 0048.
- Tests for the account flows keep running with the switch on, so the code does not rot. One
  end-to-end test checks the switched-off site has no account link.

## Consequences

- Nobody gives a name, an email or a class code, so the site holds no personal data about
  children at all.
- Teachers can't see their students' work. A teacher can still set an experiment by sending its
  link, and students can hand in the exported PDF.
- A student who changes device starts again on the new one. Exporting and importing an attempt
  file (ADR 0021) covers the cases that matter.
- Turning accounts back on is one setting plus a review of the Terms and Privacy pages, recorded
  in a new decision record.
- The master plan's Phase 3 items stay ticked: they are built, only switched off. The plan is a
  Claude Doc owned by the main account, so the main account notes the switch there.

## Alternatives considered

- **Delete the account code.** Rejected: it throws away reviewed work that a pilot may need.
- **Keep teacher sign-in at a hidden link.** Rejected for now: a hidden route is still an attack
  surface and still collects emails, for no use before the presentation.
