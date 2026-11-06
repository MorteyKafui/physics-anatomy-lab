# Physics validation

Independent Python versions of each physics model, written with NumPy and SciPy rather than
ported from the TypeScript. CI runs both and they must agree (master plan, "Scientific
validation", levels 1 and 2).

- `pa_validation/pendulum.py` uses SciPy's complete elliptic integral for the exact period.
- `scripts/make_fixtures.py` writes `fixtures/pendulum.json`; the TypeScript tests in
  `packages/physics` read it and must match to 1 part in 10¹².
- `tests/` checks the Python model on its own and that the committed fixtures are current.

```powershell
uv sync
uv run pytest
uv run python -m scripts.make_fixtures   # after changing a model
```
