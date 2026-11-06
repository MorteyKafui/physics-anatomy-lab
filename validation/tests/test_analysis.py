import json
import math
from collections.abc import Callable
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pa_validation.fit import fit_line, fit_through_origin
from pa_validation.sigfigs import format_sig_figs, parse_figure
from scripts.make_fixtures import build_fit, build_sigfigs

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def test_exact_line_is_recovered() -> None:
    fit = fit_line([1, 2, 3, 4, 5], [5, 8, 11, 14, 17])
    assert fit["slope"] == pytest.approx(3)
    assert fit["intercept"] == pytest.approx(2)
    assert fit["r2"] == pytest.approx(1)
    assert fit["slopeError"] == pytest.approx(0, abs=1e-12)


def test_slope_error_matches_the_textbook_formula() -> None:
    xs = [1.0, 2.0, 3.0, 4.0, 5.0]
    ys = [2.1, 3.9, 6.2, 7.8, 10.1]
    fit = fit_line(xs, ys)
    mx = sum(xs) / len(xs)
    sxx = sum((x - mx) ** 2 for x in xs)
    sse = sum((y - (fit["slope"] * x + fit["intercept"])) ** 2 for x, y in zip(xs, ys, strict=True))
    assert fit["slopeError"] == pytest.approx(math.sqrt(sse / (len(xs) - 2) / sxx))


def test_through_origin_on_a_proportional_relation() -> None:
    assert fit_through_origin([1, 2, 3], [2, 4, 6])["slope"] == pytest.approx(2)


def test_pendulum_mockup_gives_g_of_9_80() -> None:
    lengths = [1.0, 0.9, 0.8, 0.7, 0.6]
    t_squared = [(t / 20) ** 2 for t in (40.1, 38.1, 35.9, 33.5, 31.1)]
    slope = fit_line(lengths, t_squared)["slope"]
    assert 4 * math.pi**2 / slope == pytest.approx(9.80, abs=0.01)


@pytest.mark.parametrize(
    ("raw", "sig_figs"),
    [("123", 3), ("1002", 4), ("2.50", 3), ("0.0045", 2), ("45.30", 4), ("3.0e8", 2)],
)
def test_manual_rules(raw: str, sig_figs: int) -> None:
    assert parse_figure(raw)["sigFigs"] == sig_figs


def test_whole_numbers_with_trailing_zeros_are_ambiguous() -> None:
    figure = parse_figure("1200")
    assert figure["ambiguousTrailingZeros"] is True
    assert figure["sigFigs"] == 2


def test_formatting_keeps_trailing_zeros() -> None:
    assert format_sig_figs(0.5, 3) == "0.500"
    assert format_sig_figs(9.996, 3) == "10.0"


@given(st.floats(min_value=0.001, max_value=999, allow_nan=False), st.integers(1, 6))
def test_formatted_numbers_have_the_asked_for_figures(value: float, n: int) -> None:
    text = format_sig_figs(value, n)
    if "e" not in text:
        assert parse_figure(text)["sigFigs"] == n or parse_figure(text)["ambiguousTrailingZeros"]


@pytest.mark.parametrize(
    ("name", "build"), [("fit.json", build_fit), ("sigfigs.json", build_sigfigs)]
)
def test_committed_fixtures_are_current(name: str, build: Callable[[], object]) -> None:
    committed = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    current = json.loads(json.dumps(build()))
    _assert_close(committed, current)


def _assert_close(old: object, new: object) -> None:
    """Equal, except floats may differ in the last digits between SciPy builds (1 part in 10¹²)."""
    if isinstance(old, float) or isinstance(new, float):
        assert old == pytest.approx(new, rel=1e-12, abs=1e-15)
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
