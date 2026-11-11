# Working on Physics Anatomy

Physics Anatomy is a virtual physics lab for SHS (WASSCE) to university students, teachers and
researchers: students build real experiments, take readings, and get coached until their table,
graph and report are right. Tagline: "Physics from first principles."

Read these before changing anything:

- `design/README.md`: the approved mockups are the specification. Rebuild screens exactly;
  list and justify any difference in the pull request.
- `docs/adr/`: the decision records. Do not reverse a decision without a new record.
- `GLOSSARY.md`: use these words for these things, in code and in copy.

## Rules

1. **Physics is never typed in.** Every number a student or visitor sees comes from
   `packages/physics` (or the API). Physics changes need tests against the analytic result and
   the independent Python model in `validation/`, and a physics reviewer's approval.
2. **No dummy content.** No fake counters, testimonials, version numbers, partner logos, real
   school names or unplanned experiments. Example data in dashboards carries a visible label.
3. **Design rules** (square corners, pendulum P logo, sentence case, one dashboard pattern,
   colour or black-and-white graphs) are in `design/README.md`. Use tokens from `packages/ui`;
   never hard-code a colour or radius in an app.
4. **Children's data.** Students give a display name and class code only: no email, age or
   phone number. AI is off for signed-out users and off by default for classes. Read
   `docs/adr/0008-ai-from-the-api.md` and `docs/adr/0011-accounts-optional.md` before touching
   accounts, analytics or AI.
5. **Offline first.** The lab, tables, graphs and reports work with no connection; the server
   only syncs. Do not add a network call to the lab's critical path.
6. **Copy** is plain, active, sentence case, British spelling (en-GB).

## Commands (Windows, from the repository root)

```powershell
bun install                      # TypeScript workspaces
bun run dev                      # web on :3000, admin on :3001
bun run check                    # typecheck, lint and test everything
bun run build; bun run e2e       # end to end, accessibility and performance (Playwright)
cd apps/api; uv sync; uv run fastapi dev app/main.py   # API on :8000
cd validation; uv sync; uv run pytest                   # independent physics models
```

## Git

- `main` is protected and always deployable. Work on short-lived branches:
  `feat/…`, `fix/…`, `exp/<experiment-id>`, `docs/…`, `chore/…`.
- GitHub does not enforce branch protection on this private repository on its current plan.
  The guard is `.githooks/pre-push`, which refuses pushes to `main`; `bun install` turns it on.
  Never skip it with `--no-verify`.
- Conventional Commits. Pull requests are squash-merged and use the template
  (problem, change, proof, risk). A human always presses merge.

## The plan, and working from more than one Claude account

The master plan and the design canvas are Claude artifacts owned by Mortey's main account. A
session signed in to another account (for example Claude Code in VS Code) cannot open or edit
them, so the repository carries everything a session needs to carry on exactly as planned:

- `docs/planning/master-plan.md` (and `master-plan-gap-fixes.md`): the master plan, exported
  from the Claude Doc. Work from it. Its roadmap is the to-do list: Phase 1 items are built in
  order, one pull request each.
- `design/mockups/`: the approved boards, exported from the design canvas. A new screen needs a
  board approved first; a session without the canvas drafts the board as a `.dc.html` in a pull
  request for Mortey to approve, and the main account adds it to the canvas.
- `docs/adr/` and `docs/planning/00-decisions.md`: the decisions.

The working loop for each plan item: build it on a branch, commit, push, open the pull request
(problem, change, proof, risk), wait for CI and for Mortey's approval in chat, squash-merge,
update `main`, then tick the item and offer the next one.

**Ticking an item.** Tick its box in `docs/planning/master-plan.md` in the pull request that
finishes it. A session that can reach the Claude Doc ticks it there too; one that cannot says so
in the pull request, and the main account ticks the doc after the merge, so both copies agree.
The doc stays the master for the plan's wording: rewording is done in the doc and exported here
again, never edited only in this copy.

**Starting a session.** Mortey switches accounts when one reaches its usage limit, so a session
may begin where another stopped mid-task, and neither remembers the other's chat. Before
anything else, find where the work stands, from the repository and GitHub, not from memory:

1. `git fetch origin`, then `git status`, the current branch and `git log -5 origin/main`:
   unfinished edits, and what the other account has merged since.
2. Open pull requests on GitHub and their CI: a pull request waiting for approval or a fix comes
   first.
3. The first unticked item in Phase 1 (or the current phase) of `docs/planning/master-plan.md`.
4. On the main account only: compare the ticks in `docs/planning/master-plan.md` on
   `origin/main` with the doc, and tick in the doc any item the repository has ticked but the
   doc has not.

Then say in one or two lines where things stand and what comes next, and carry on.

**While working.** A usage limit can end a session without warning, so never leave the work only
in the chat. Commit and push to the item's branch at each working step (a draft pull request is
fine), and keep the pull request's description current with what is done and what is left. For the main account, the doc is `DNiNxasKLhQYdB6jMJ5fuN`,
its plan tab is node `e229a1f4-51c2`, and the Phase 1 checklist is list `mar1qxf07ng.68587`.
