import math

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pa_validation.diffraction import intensity, which_slit

NM, UM = 1e-9, 1e-6


def test_centre_is_one() -> None:
    for n in (1, 2, 4):
        assert intensity(n, 2 * UM, 8 * UM, 500 * NM, 0.0) == pytest.approx(1.0, rel=1e-12)
        assert which_slit(n, 2 * UM, 8 * UM, 500 * NM, 0.0) == pytest.approx(1.0, rel=1e-12)


def test_single_slit_minima_where_a_sin_theta_is_a_whole_wavelength() -> None:
    a, lam = 5 * UM, 500 * NM
    for m in (1, 2, 3):
        assert intensity(1, a, a, lam, m * lam / a) == pytest.approx(0.0, abs=1e-12)


def test_two_slit_dark_fringe_halfway_between_orders() -> None:
    d, lam = 10 * UM, 500 * NM
    assert intensity(2, 1 * UM, d, lam, 0.5 * lam / d) == pytest.approx(0.0, abs=1e-12)


def test_detector_removes_the_fringes() -> None:
    d, lam = 10 * UM, 500 * NM
    s = 0.5 * lam / d
    assert which_slit(2, 1 * UM, d, lam, s) == pytest.approx(intensity(1, 1 * UM, 1 * UM, lam, s))


@given(st.floats(min_value=-0.3, max_value=0.3))
def test_never_negative_and_never_above_the_centre(s: float) -> None:
    v = intensity(3, 1 * UM, 4 * UM, 500 * NM, s)
    assert -1e-12 <= v <= 1 + 1e-9
    assert not math.isnan(v)
