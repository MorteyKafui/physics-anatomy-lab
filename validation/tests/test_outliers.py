import json
from collections.abc import Callable
from pathlib import Path

import numpy as np
import pytest

from pa_validation.outliers import critical_value, deleted_residuals, find_outlier
from scripts.make_fixtures import build_outliers, build_student_t

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def _refit_residual(xs: list[float], ys: list[float], i: int) -> float:
    """Brute force: fit without reading i and compare it with the prediction interval."""
    x = np.delete(np.asarray(xs), i)
    y = np.delete(np.asarray(ys), i)
    slope, intercept = np.polyfit(x, y, 1)
    s = np.sqrt(np.sum((y - (slope * x + intercept)) ** 2) / (len(x) - 2))
    se = s * np.sqrt(1 + 1 / len(x) + (xs[i] - x.mean()) ** 2 / np.sum((x - x.mean()) ** 2))
    return float((ys[i] - (slope * xs[i] + intercept)) / se)


def test_hat_matrix_formula_equals_refitting() -> None:
    xs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    ys = [0.52, 1.01, 1.49, 2.03, 2.48, 3.02]
    for i, t in enumerate(deleted_residuals(xs, ys)):
        assert t == pytest.approx(_refit_residual(xs, ys, i), rel=1e-9)


def test_critical_values_match_tables() -> None:
    # Two-sided 5% shared across n readings: t at 1 - 0.025/n with n - 3 degrees of freedom.
    assert critical_value(5) == pytest.approx(9.924843, rel=1e-6)
    assert critical_value(10) == pytest.approx(4.029337, rel=1e-5)


def test_a_slip_among_six_readings_is_found() -> None:
    assert find_outlier([0.1, 0.2, 0.3, 0.4, 0.5, 0.6], [0.52, 1.01, 14.9, 2.03, 2.48, 3.02]) == 2


def test_clean_readings_are_left_alone() -> None:
    assert (
        find_outlier([0.1, 0.2, 0.3, 0.4, 0.5, 0.6], [0.52, 1.01, 1.49, 2.03, 2.48, 3.02]) is None
    )


@pytest.mark.parametrize(
    ("name", "build"),
    [("student_t.json", build_student_t), ("outliers.json", build_outliers)],
)
def test_committed_fixtures_are_current(name: str, build: Callable[[], object]) -> None:
    committed = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    current = json.loads(json.dumps(build()))
    _assert_close(committed, current)


def _assert_close(old: object, new: object) -> None:
    if isinstance(old, float) or isinstance(new, float):
        assert old == pytest.approx(new, rel=1e-10, abs=1e-12)
    elif isinstance(old, dict) and isinstance(new, dict):
        assert old.keys() == new.keys()
        for key in old:
            _assert_close(old[key], new[key])
    elif isinstance(old, list) and isinstance(new, list):
        assert len(old) == len(new)
        for a, b in zip(old, new, strict=True):
            _assert_close(a, b)
    else:
        assert old == new
