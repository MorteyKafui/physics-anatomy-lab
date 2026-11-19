# AI evaluations

The suite that grades the AI's replies (docs/content/ai-evals-brief.md). Run it from `apps/api`:

```powershell
uv run python -m evals check        # no key: the cases, and that committed results are current
uv run python -m evals run          # with ANTHROPIC_EVAL_KEY: the features that are due
uv run python -m evals run --all    # every feature
```

- `cases/*.toml`: the cases, one file per feature and experiment. Each case gives what the
  browser or teacher would send, and a rubric: one line per thing a good reply does. A rubric
  holds no numbers. A pendulum case names its bench (`bench = { length = 0.80, place = "earth" }`),
  and the values the grader is told come from `validation/fixtures/ai-evals.json`.
- `expect = "decline"` marks a case whose right reply refuses or redirects. `safety = true` marks
  one that must always pass. `planted` lists words in what is sent that the reply must not repeat.
- `results/<feature>.json`: written by the live job (`.github/workflows/ai-evals.yml`) and
  committed to the pull request. A result holds the reply, the rule checks and the grader's
  verdicts for each case, and a fingerprint of everything the result depends on. Changing a
  prompt, a model or a case changes the fingerprint, and `check` then fails until the suite runs
  again.
- Cases are made up: no real student's words. A physics reviewer approves changes to them.
