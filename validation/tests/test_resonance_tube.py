import json
import math
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from pa_validation.resonance_tube import air_at, loudness, resonance_lengths, speed_of_sound
from scripts.make_fixtures import build_resonance_tube

FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "resonance-tube.json"


def test_speed_of_sound_at_0_and_20_degrees() -> None:
    assert speed_of_sound(0.0) == pytest.approx(331.3, abs=0.05)
    assert speed_of_sound(20.0) == pytest.approx(343.2, abs=0.05)


@given(st.floats(min_value=-40, max_value=60))
def test_speed_goes_as_the_root_of_the_absolute_temperature(t: float) -> None:
    ratio = speed_of_sound(t) / speed_of_sound(0.0)
    assert ratio == pytest.approx(math.sqrt((t + 273.15) / 273.15), rel=1e-9)


def test_resonances_are_odd_quarter_wavelengths_less_the_end_correction() -> None:
    lam = speed_of_sound(20.0) / 512
    found = resonance_lengths(1.0, 0.02, 20.0, 512)
    assert found == pytest.approx([(2 * n - 1) * lam / 4 - 0.012 for n in (1, 2, 3)], abs=1e-10)


@settings(max_examples=15, deadline=None)
@given(st.sampled_from([320, 384, 512]), st.floats(min_value=0.0, max_value=35.0))
def test_successive_resonances_are_half_a_wavelength_apart(f: float, t: float) -> None:
    first, second = resonance_lengths(1.0, 0.02, t, f)[:2]
    assert second - first == pytest.approx(speed_of_sound(t) / f / 2, rel=1e-10)


def test_loudness_is_one_at_resonance_and_small_between() -> None:
    first = resonance_lengths(1.0, 0.02, 20.0, 512)[0]
    assert loudness(0.02, 20.0, 30.0, first, 512) == pytest.approx(1.0, rel=1e-12)
    assert loudness(0.02, 20.0, 30.0, first + 0.17, 512) < 0.08


def test_the_water_is_a_displacement_node_and_the_top_an_antinode() -> None:
    first = resonance_lengths(1.0, 0.02, 20.0, 384)[0]
    disp, pres = air_at(0.02, 20.0, first, 384, first)
    assert disp == pytest.approx(0.0, abs=1e-12)
    assert pres == pytest.approx(1.0, rel=1e-10)
    disp, pres = air_at(0.02, 20.0, first, 384, -0.012)
    assert disp == pytest.approx(1.0, rel=1e-9)
    assert pres == pytest.approx(0.0, abs=1e-9)


def _close(old: object, new: object) -> None:
    """Equal, except that floats may differ in the last binary digits between SciPy builds."""
    if isinstance(old, float) or isinstance(new, float):
        assert old == pytest.approx(new, rel=1e-11, abs=1e-9)
    elif isinstance(old, dict) and isinstance(new, dict):
        assert old.keys() == new.keys()
        for key in old:
            _close(old[key], new[key])
    elif isinstance(old, list) and isinstance(new, list):
        assert len(old) == len(new)
        for a, b in zip(old, new, strict=True):
            _close(a, b)
    else:
        assert old == new


def test_committed_fixture_is_current() -> None:
    committed = json.loads(FIXTURE.read_text(encoding="utf-8"))
    _close(committed, json.loads(json.dumps(build_resonance_tube())))
