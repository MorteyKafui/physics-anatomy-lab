# 0042. Consent records, data export and deletion

- Status: accepted (Mortey, 2026-11-19)
- Date: 2026-11-19
- Builds on: [0011](./0011-accounts-optional.md), [0025](./0025-legal-pack.md),
  [0038](./0038-sign-in-sessions-and-class-codes.md), [0039](./0039-event-sync-and-adoption.md),
  [0040](./0040-admin-access-audit-aggregates.md), [0041](./0041-live-classes.md), and the master
  plan's "Security, privacy and minors" section

## Context

The plan promises self-service export and deletion, analytics only after consent, and consent
records with 30 days' notice of material changes (D25). Students are often children. They hold a
display name in one class and nothing else (ADR 0011), so the only way to reach a student or a
parent is through their teacher. The lab works offline, so every device holds its own copy of the
work. This record fixes what is recorded, what an export holds, and what deleting means.

## Decision

### Consent records

- Each consent is one row in `consents`: who (a teacher's `users` row or a student's
  `class_members` row, never both), the purpose (`terms`, `privacy` or `analytics`), the version
  of the document, whether it was granted, how it was given (`sign-in`, `join` or `choice`), and
  when. Nothing else is stored: no IP address, no browser details, and nothing more about a
  student.
- **Append-only by use.** A new decision is a new row; the latest row for a person and purpose
  counts. The history is the record.
- **When it is recorded.** A student agrees at join, with the tick box on the join screen
  (`Join.dc.html`). A teacher agrees at sign-in, as the sign-in screen says ("By signing in you
  agree…", `SignIn.dc.html`). A row is added only when the person has not yet agreed to the
  current version, so signing in again adds nothing.
- **Versions** are kept in `app/legal.py`, each with the date it takes effect. A material change
  is a new version dated at least **30 days ahead**. Until that date the old version stays in
  force, and `GET /consents` reports the new one as `upcoming`, so the web app can give notice.
  From that date `needs_agreement` is true until the person agrees again (`POST /consents`). The
  only versions now are the drafted Legal and Policy Pack (`2026-11-06 draft`). They are set to
  the reviewed text before launch.
- **Terms and privacy are required.** They can be agreed to but not withdrawn. To stop agreeing,
  a person deletes their account, or a student asks their teacher.
- **Analytics is optional and only for teachers.** It is off until a teacher chooses it, and they
  can withdraw at any time. Students are never asked, and a check constraint keeps it so: a child
  cannot consent to analytics alone, and the few product events the plan needs do not justify
  asking parents. A signed-out visitor's choice stays on their device: there is no one to record
  it against, and recording it would mean identifying them.
- **AI** stays the class's setting, which is off by default (ADR 0008). The AI and Acceptable Use
  agreement joins these purposes when AI is built (Phase 4).
- **Research data** for the UEW pilot is a separate opt-in record. It needs ethics approval,
  school permission, parental consent and learner assent, so it is not built until those exist.
  It will not reuse this table's required purposes.

### Export

- `GET /export` returns everything the server holds about the signed-in person, as JSON
  (`physics-anatomy/export`, version 1):
  - for a teacher: profile, consent history and classes (settings, code and the number of
    students);
  - for a student: display name, class, teacher's name, date joined and consent history.
- `GET /export/attempts` gives the person's attempts in pages, each attempt as the lab's own
  **attempt file** (`physics-anatomy/attempt`, the shape `packages/engine` writes and imports).
  A page holds up to 20 attempts and stops early at about 2 MB of event data. An attempt is never
  split, so one larger attempt is a page on its own. The size is summed before any event is
  loaded.
- **Paged, not streamed.** A page can be fetched again after a dropped connection on a slow
  network. No database connection is held open for a whole download. It works like the sync
  pull (ADR 0039). The web app joins the pages into one file.
- **No one else's data.**
  - A teacher's export lists their classes without the students' names or work.
  - A student's export holds only their own attempts.
  - Live-class messages are left out: they are kept for 30 days after a lesson (ADR 0041), and
    notes are about a student.
- **For a parent's request**, a teacher exports one student of their own class:
  `GET /classes/{class}/members/{member}/export` and `…/export/attempts`, in the same shapes. A
  student of another class is simply not found.
- Each export is logged as a structured event with ids only.

### Deletion: immediate and permanent, with no grace period

- **A teacher deletes their account** with `POST /account/delete`:
  - They type their email to confirm.
  - They must have signed in within the last hour, so a session left open on a shared computer
    for days cannot delete a whole class's work.
  - The account goes, and with it, by cascade: their classes, students, attempts, events,
    consents, sessions, re-join codes and live sessions. The email is also removed from what is
    held outside the account: unused sign-in links and their rate-limit counter.
  - Every device of the teacher and of their students is signed out at once, because sessions
    are checked on every request (ADR 0038). Open live sockets close within 5 minutes
    (ADR 0041).
- **A teacher removes a student** with `DELETE /classes/{class}/members/{member}`:
  - Their attempts, events, consents, sessions, re-join codes and live benches go.
  - Notes written to that student alone are deleted.
  - Group hints keep their wording but lose the student's id.
- **A student or parent asks through the teacher**, who removes the student. Students cannot
  delete from their own device. The teacher is the person the school and the parent know, and
  a student cannot lose work they handed in by tapping the wrong thing.
- **Hard delete.** There is no soft-delete flag and no grace period. A grace period means
  keeping a child's data after someone asked for it to go. It would also need a scheduled job,
  and there is no job queue yet. Mistakes are guarded against before the delete instead:
  - the typed email and the recent sign-in;
  - an export offered first on the delete page;
  - a confirmation step on the screen.

  The dashboards' undo toasts do not apply to removing a student.

- **What deletion does not reach:**
  - Copies on devices. The lab is offline first, so a device keeps the attempts it holds, and
    signing out leaves them there (ADR 0039).
  - The admin audit log (ADR 0040). It keeps the ids of a deleted class or student, never their
    names.
  - Database backups. Deleted rows leave the backups as the backups age out. The privacy policy
    must state how long that is.

## Consequences

- A person can see and take away everything the server holds about them, in a format the lab
  itself reads back.
- Consent rows grow by two per person, plus one per later version or analytics choice. That is
  small.
- Deleting an account is one transaction. For a teacher with many classes, the cascade touches
  every event of every student. At pilot scale that is fast; a teacher with hundreds of thousands
  of events would hold locks for longer. **When to change this:** if an account deletion takes
  more than 5 seconds, move it to the job queue (with a new record).
- Teachers' deletions are logged as structured events. They are not written to `admin_audit`,
  which records staff actions.
- The screens need approved boards first: `design/mockups/Privacy.dc.html` is the draft.

## Alternatives considered

- **Soft delete with a 30-day grace period.** Common, and kind to accidents. Rejected: it keeps
  children's data after someone asked for it to go, and every query would have to skip deleted
  rows.
- **A streamed single-file export.** Simpler for the browser. Rejected: on a dropped connection
  it starts again from nothing, and it holds a database connection for the whole download.
- **Analytics consent for students, with a parent's agreement.** It would need a way to reach
  parents, which we deliberately do not have.
- **Students deleting their own work.** Possible later if Mortey and the schools want it. The
  endpoint would be the same delete, run for the student themselves.
