"""The model check's verdict (data templates brief, decision 5 as amended)."""

import json
from pathlib import Path

import numpy as np
import pytest

from pa_validation.model_check import FACTOR, model_check
from scripts.make_fixtures import build_model_check
from tests.test_analysis import _assert_close

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
XS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
K = 4.024
LINE = [K * x for x in XS]


def test_committed_fixture_is_current() -> None:
    committed = json.loads((FIXTURES / "model-check.json").read_text(encoding="utf-8"))
    _assert_close(committed, json.loads(json.dumps(build_model_check())))


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("careful", (False, False, False)),
        ("shifted by an end correction", (True, False, False)),
        ("tilted by a miscount", (True, True, False)),
        ("scattered by poor timing", (False, False, True)),
        ("smoother than care allows, a small shift", (False, False, False)),
        ("no model slope", (True, None, False)),
        ("a curve, careful", (False, None, False)),
        ("a curve, shifted down", (True, None, False)),
        ("a curve, scattered", (False, None, True)),
    ],
)
def test_each_case_is_called_what_its_name_says(name: str, expected: tuple) -> None:
    case = next(c for c in build_model_check()["cases"] if c["name"] == name)  # type: ignore[index]
    check = case["check"]
    assert (
        check["shift"]["found"],
        check.get("tilt", {}).get("found"),
        check["spread"]["found"],
    ) == expected


def test_points_on_the_model_are_never_found_out() -> None:
    check = model_check(XS, LINE, LINE, 0.012, K)
    assert check is not None
    assert check["shift"]["errors"] == pytest.approx(0, abs=1e-9)
    assert not check["shift"]["found"]
    assert not check["tilt"]["found"]  # type: ignore[index]
    assert not check["spread"]["found"]


def test_too_few_points_give_no_verdict() -> None:
    assert model_check(XS[:2], LINE[:2], LINE[:2], 0.012, K) is None


def test_careful_runs_are_rarely_called_shifted_or_scattered() -> None:
    """At the careful spread, a shift is found under 1 run in 20, a scatter almost never."""
    rng = np.random.default_rng(7)
    runs = 4000
    shifted = tilted = scattered = 0
    for _ in range(runs):
        ys = [y + rng.normal(0, 0.012) for y in LINE]
        check = model_check(XS, ys, LINE, 0.012, K)
        assert check is not None
        shifted += check["shift"]["found"]
        tilted += check["tilt"]["found"]  # type: ignore[index]
        scattered += check["spread"]["found"]
    # The floor at the careful spread makes the tests a little cautious: under 1 run in 20.
    assert shifted / runs < 0.05
    assert tilted / runs < 0.05
    assert scattered / runs < 0.01
    assert FACTOR == 2
