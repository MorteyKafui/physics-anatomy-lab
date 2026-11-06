# Physics validation

Independent Python versions of each physics model, written with NumPy and SciPy rather than
ported from the TypeScript. CI runs both and they must agree (master plan, "Scientific
validation", levels 1 and 2).

- `pa_validation/pendulum.py` uses SciPy's complete elliptic integral for the exact period.
- `pa_validation/circuits.py` solves the Ohm's law and potentiometer circuits by modified
  nodal analysis with NumPy, galvanometer included, and finds balance points with SciPy.
- `pa_validation/lens.py` images with paraxial ray-transfer matrices.
- `pa_validation/mixtures.py` solves the energy balance by root-finding with SciPy.
- `pa_validation/fit.py` fits straight lines with SciPy's `linregress` and NumPy's least squares.
- `pa_validation/sigfigs.py` counts significant figures with Python's `decimal` module.
- `scripts/make_fixtures.py` writes the fixtures: `pendulum.json`, `circuits.json`, `lens.json`,
  `mixtures.json`, `fit.json` and `sigfigs.json`. The
  TypeScript tests in `packages/physics` and `packages/analysis` read them and must match to 1
  part in 10¹² (pendulum) and 10¹⁰ (fits); significant figures must match exactly.
- `tests/` checks the Python model on its own and that the committed fixtures are current.

```powershell
uv sync
uv run pytest
uv run python -m scripts.make_fixtures   # after changing a model
```
