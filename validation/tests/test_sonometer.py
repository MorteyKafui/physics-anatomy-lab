import json
import math
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pa_validation import sonometer as s
from scripts.make_fixtures import build_sonometer

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "sonometer.json"


def test_eigenfrequencies_are_whole_multiples() -> None:
    t = s.tension(2.5)
    mu = s.linear_density(0.0124 * s.INCH, s.STEEL_DENSITY)
    freqs = s.string_eigenfrequencies(0.4, t, mu, 4)
    v = s.wave_speed(t, mu)
    for n, f in enumerate(freqs, start=1):
        assert f == pytest.approx(n * v / 0.8, rel=1e-9)


def test_thirty_swg_steel_weighs_about_0_61_g_per_metre() -> None:
    mu = s.linear_density(0.0124 * s.INCH, s.STEEL_DENSITY)
    assert mu * 1000 == pytest.approx(0.6118, abs=5e-4)


def test_the_standing_wave_has_nodes_where_expected() -> None:
    for k in range(4):
        assert s.mode_displacement(3, k * 0.2, 0.0007, 0.6, 200, 0.002) == pytest.approx(
            0, abs=1e-15
        )


def test_response_peaks_at_q_with_a_quarter_turn_lag() -> None:
    assert s.driven_response(256, 256, 170) == pytest.approx(170, rel=1e-12)
    assert s.driven_phase(256, 256, 170) == pytest.approx(math.pi / 2, abs=1e-12)


def test_band_edges_just_throw_a_centred_rider() -> None:
    lo, hi = s.resonance_band(256, 200, 150)
    for edge in (lo, hi):
        assert s.rider_excitation(edge, 200, 256, 150, 0.5) == pytest.approx(1, rel=1e-9)
    assert lo < 200 / 512 < hi


def test_a_weak_strike_throws_nothing() -> None:
    assert s.resonance_band(256, 200, 170, 0.4) is None


@given(
    load=st.floats(min_value=0.1, max_value=10),
    length=st.floats(min_value=0.05, max_value=1),
)
def test_quadrupling_the_load_doubles_the_frequency(load: float, length: float) -> None:
    mu = 6e-4
    f1 = s.harmonic_frequency(1, length, s.wave_speed(s.tension(load), mu))
    f4 = s.harmonic_frequency(1, length, s.wave_speed(s.tension(4 * load), mu))
    assert f4 / f1 == pytest.approx(2, rel=1e-12)


def test_committed_fixture_is_current() -> None:
    # Inputs must match exactly; results to 1e-12, as SciPy builds differ in the last digit.
    committed = json.loads(FIXTURES.read_text(encoding="utf-8"))
    current = json.loads(json.dumps(build_sonometer()))
    assert committed.keys() == current.keys()
    _close(committed, current)


def _close(a: object, b: object) -> None:
    if isinstance(a, dict) and isinstance(b, dict):
        assert a.keys() == b.keys()
        for key in a:
            _close(a[key], b[key])
    elif isinstance(a, list) and isinstance(b, list):
        assert len(a) == len(b)
        for x, y in zip(a, b, strict=True):
            _close(x, y)
    elif isinstance(a, float) and isinstance(b, float):
        assert a == pytest.approx(b, rel=1e-12, abs=1e-300)
    else:
        assert a == b
