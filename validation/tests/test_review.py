import json
import math
from pathlib import Path

import pytest

from pa_validation.pendulum import period_small_angle
from pa_validation.review import reading_error_percent, right_way
from scripts.make_fixtures import build_review

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "review.json"


def test_counting_from_one_raises_g_by_about_eleven_percent() -> None:
    assert reading_error_percent(20, True) == pytest.approx(((20 / 19) ** 2 - 1) * 100)
    assert round(reading_error_percent(20, True)) == 11
    assert reading_error_percent(20, False) == 0


def test_the_right_way_tends_to_g_as_the_swing_gets_small() -> None:
    result = right_way(9.81, 1e-6, [0.6, 0.8, 1.0])
    assert result["g"] == pytest.approx(9.81, rel=1e-9)
    # At 8° the exact periods are longer by the same factor at every length.
    eight = right_way(9.81, math.radians(8), [0.6, 0.8, 1.0])
    assert eight["g"] < 9.81
    assert eight["g"] == pytest.approx(4 * math.pi**2 / eight["slope"], rel=1e-12)
    assert eight["slope"] > period_small_angle(1, 9.81) ** 2


def test_committed_fixtures_are_current() -> None:
    committed = json.loads(FIXTURES.read_text(encoding="utf-8"))
    current = json.loads(json.dumps(build_review()))
    assert len(committed["errors"]) == len(current["errors"])
    for old, new in zip(committed["errors"], current["errors"], strict=True):
        assert {k: old[k] for k in ("count", "countedFromOne")} == {
            k: new[k] for k in ("count", "countedFromOne")
        }
        assert old["percent"] == pytest.approx(new["percent"], rel=1e-12)
    for old, new in zip(committed["runs"], current["runs"], strict=True):
        assert old["lengths"] == new["lengths"] and old["roomG"] == new["roomG"]
        assert old["g"] == pytest.approx(new["g"], rel=1e-12)
        assert old["slope"] == pytest.approx(new["slope"], rel=1e-12)
