"""The advanced uncertainty layer: worst-case propagation and the graphical worst lines."""

import json
from pathlib import Path

import pytest

from pa_validation.uncertainty import quoted, worst_case, worst_lines
from scripts.make_fixtures import build_uncertainty
from tests.test_analysis import _assert_close

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def test_committed_fixture_is_current() -> None:
    committed = json.loads((FIXTURES / "uncertainty.json").read_text(encoding="utf-8"))
    _assert_close(committed, json.loads(json.dumps(build_uncertainty())))


def test_the_manuals_rules_fall_out_of_the_partial_derivatives() -> None:
    # Sums and differences: absolute uncertainties add.
    assert worst_case("b - a", {"a": 28, "b": 45.5}, {"a": 0.05, "b": 0.05})["uncertainty"] == (
        pytest.approx(0.1)
    )
    # Products: percentages add.
    got = worst_case("x*y", {"x": 30, "y": 30.2}, {"x": 0.05, "y": 0.2})
    assert got["uncertainty"] / got["value"] == pytest.approx(0.05 / 30 + 0.2 / 30.2)
    # A power multiplies the percentage; a reciprocal keeps it.
    sq = worst_case("T**2", {"T": 1.554}, {"T": 0.0025})
    assert sq["uncertainty"] / sq["value"] == pytest.approx(2 * 0.0025 / 1.554)
    inv = worst_case("1/u", {"u": 30}, {"u": 0.05})
    assert inv["uncertainty"] / inv["value"] == pytest.approx(0.05 / 30)


def test_quoted_uncertainties_round_halves_up() -> None:
    assert quoted(0.25)["value"] == pytest.approx(0.3)
    assert quoted(0.15)["figures"] == 2


def test_worst_lines_bracket_the_least_squares_slope() -> None:
    xs, ys = [0.6, 0.7, 0.8, 0.9, 1.0], [2.415, 2.835, 3.218, 3.640, 4.032]
    got = worst_lines(xs, ys, [0.0005] * 5, [0.008] * 5)
    assert got["leastSteep"] < 4.04 < got["steepest"]


def test_intercept_sum_of_an_exact_line() -> None:
    from pa_validation.uncertainty import intercept_sum

    # y = 0.0674 - x, as an exact lens line: m1 = m2 = 0.0674, so the sum is twice it, no error.
    xs = [0.025, 0.03, 0.035, 0.04, 0.05]
    got = intercept_sum(xs, [0.0674 - x for x in xs])
    assert got["value"] == pytest.approx(2 * 0.0674)
    assert got["error"] == pytest.approx(0, abs=1e-9)
