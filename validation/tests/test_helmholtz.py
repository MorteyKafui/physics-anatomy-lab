import json
import math
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pa_validation.helmholtz import (
    FLASKS,
    build_fixture,
    loudness,
    lumped,
    plug,
    resonant_frequency,
    steady_amplitude,
    water_depth,
)

FLASK = FLASKS["500 ml round-bottom"]
FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "helmholtz.json"


def test_matches_the_textbook_formula() -> None:
    t = 25.0
    c = math.sqrt(1.4 * 8.314462618 * (t + 273.15) / 0.0289647)
    area = math.pi * FLASK.neck_radius**2
    length = FLASK.neck_length + 1.46 * FLASK.neck_radius
    for water in (0.0, 100e-6, 300e-6):
        expected = c / (2 * math.pi) * math.sqrt(area / ((FLASK.bulb_volume - water) * length))
        assert resonant_frequency(FLASK, water, t) == pytest.approx(expected, rel=1e-9)


def test_inverse_square_is_linear_in_the_water() -> None:
    waters = [0.0, 50e-6, 150e-6, 300e-6, 450e-6]
    y = [1 / resonant_frequency(FLASK, w, 20.0) ** 2 for w in waters]
    slope = (y[-1] - y[0]) / (waters[-1] - waters[0])
    for w, v in zip(waters, y, strict=True):
        assert v == pytest.approx(y[0] + slope * w, rel=1e-12)
    assert -y[0] / slope == pytest.approx(FLASK.bulb_volume, rel=1e-12)


def test_loudness_peaks_at_one_on_resonance() -> None:
    f0 = resonant_frequency(FLASK, 200e-6, 28.0)
    assert loudness(FLASK, 200e-6, 28.0, f0) == pytest.approx(1.0, rel=1e-12)
    for f in (0.9 * f0, 0.99 * f0, 1.01 * f0, 1.1 * f0):
        assert loudness(FLASK, 200e-6, 28.0, f) < 1.0


def test_bulb_pressure_is_q_times_the_drive_on_resonance() -> None:
    f0 = resonant_frequency(FLASK, 0.0, 20.0)
    p = plug(FLASK, 0.0, 20.0, f0, 0.5)
    assert p["pressureAmplitude"] == pytest.approx(0.5 * FLASK.q, rel=1e-12)
    assert p["lag"] == pytest.approx(math.pi / 2, abs=1e-12)


def test_impedance_amplitude_agrees_with_integrating_the_motion() -> None:
    f0 = resonant_frequency(FLASK, 150e-6, 28.0)
    for f in (0.8 * f0, f0, 1.05 * f0):
        expected = plug(FLASK, 150e-6, 28.0, f, 0.5)["displacementAmplitude"]
        assert steady_amplitude(FLASK, 150e-6, 28.0, f, 0.5) == pytest.approx(expected, rel=1e-5)


def test_water_depth_of_a_half_full_sphere_is_its_radius() -> None:
    r = (3 * FLASK.bulb_volume / (4 * math.pi)) ** (1 / 3)
    assert water_depth(FLASK, FLASK.bulb_volume / 2) == pytest.approx(r, rel=1e-12)
    assert water_depth(FLASK, 0.0) == 0.0


@given(st.floats(min_value=0.0, max_value=500e-6), st.floats(min_value=-10.0, max_value=45.0))
def test_frequency_rises_with_water_and_never_nan(water: float, temp: float) -> None:
    f = resonant_frequency(FLASK, water, temp)
    assert not math.isnan(f)
    assert f > resonant_frequency(FLASK, 0.0, temp) - 1e-9
    assert lumped(FLASK, water, temp).volume > 0


def test_fixture_is_current() -> None:
    current = json.loads(json.dumps(build_fixture()))
    assert json.loads(FIXTURE.read_text(encoding="utf-8")) == current
