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
- Conventional Commits. Pull requests are squash-merged and use the template
  (problem, change, proof, risk). A human always presses merge.
