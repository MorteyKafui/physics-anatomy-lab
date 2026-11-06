# Contribute a change

1. Start from an up-to-date `main` and make a short-lived branch:
   `feat/…`, `fix/…`, `exp/<experiment-id>`, `docs/…` or `chore/…`.
2. Make the change with tests. Physics changes also update `validation/` and its fixtures.
3. Run `bun run check` and `bun run format:check`. If you changed a screen, also run
   `bun run build; bun run e2e`. If you touched Python, run `uv run pytest` in `apps/api` or `validation`.
4. Commit with Conventional Commits, for example `feat(physics): exact pendulum period`.
5. Open a pull request with the template: problem, change, proof, risk. Screens include a
   screenshot next to the mockup from `design/mockups/screens/`.
6. A human reviews and presses merge (squash). Physics and experiment content needs a physics
   reviewer.
