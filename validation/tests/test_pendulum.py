import json
import math
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pa_validation.pendulum import period_exact, period_small_angle
from scripts.make_fixtures import build

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "pendulum.json"


def test_small_angle_limit() -> None:
    for degrees in (0, 1, 2, 5):
        exact = period_exact(0.8, 9.81, math.radians(degrees))
        assert exact == pytest.approx(period_small_angle(0.8, 9.81), rel=1e-3)


def test_thirty_degrees_matches_the_textbook_ratio() -> None:
    ratio = period_exact(1.0, 9.81, math.radians(30)) / period_small_angle(1.0, 9.81)
    assert ratio == pytest.approx(1.0174088, abs=1e-7)


def test_committed_fixtures_are_current() -> None:
    # The inputs must match exactly. The periods are compared at a relative tolerance of 1e-12,
    # because SciPy builds on different platforms can differ in the last binary digit.
    committed = json.loads(FIXTURES.read_text(encoding="utf-8"))
    current = json.loads(json.dumps(build()))
    assert _without(committed, "cases") == _without(current, "cases")
    assert len(committed["cases"]) == len(current["cases"])
    for old, new in zip(committed["cases"], current["cases"], strict=True):
        assert _without(old, "period") == _without(new, "period")
        assert old["period"] == pytest.approx(new["period"], rel=1e-12)


def _without(record: dict[str, object], key: str) -> dict[str, object]:
    return {k: v for k, v in record.items() if k != key}


@given(
    length=st.floats(min_value=0.05, max_value=5),
    g=st.floats(min_value=1, max_value=25),
    a=st.floats(min_value=0, max_value=3),
    b=st.floats(min_value=0, max_value=3),
)
def test_larger_swing_never_shorter(length: float, g: float, a: float, b: float) -> None:
    lo, hi = sorted((a, b))
    assert period_exact(length, g, hi) >= period_exact(length, g, lo) * (1 - 1e-12)
