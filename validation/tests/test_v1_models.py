import json
import math
from collections.abc import Callable
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pa_validation.circuits import balance_length, ohms_law_readings
from pa_validation.lens import image
from pa_validation.mixtures import final_temperature, solid_specific_heat
from scripts.make_fixtures import build_circuits, build_lens, build_lens_exact, build_mixtures

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
DRIVER = {
    "driverEmf": 2.0,
    "driverInternalResistance": 0.0,
    "seriesResistance": 0.0,
    "wireResistance": 4.0,
    "wireLength": 1.0,
}


def test_ohms_law_with_an_ideal_voltmeter_gives_r() -> None:
    reading = ohms_law_readings(3.0, 1.0, 4.0, 10.0)
    assert reading["current"] == pytest.approx(0.2)
    assert reading["voltage"] / reading["current"] == pytest.approx(10.0)


def test_a_real_voltmeter_makes_v_over_i_read_low() -> None:
    reading = ohms_law_readings(3.0, 1.0, 4.0, 10.0, 1000.0)
    assert reading["voltage"] / reading["current"] == pytest.approx(10.0 * 1000 / 1010)


@given(emf=st.floats(0.5, 1.9), internal=st.floats(0.1, 5), galvanometer=st.floats(1, 500))
def test_balance_does_not_depend_on_the_galvanometer_or_internal_resistance(
    emf: float, internal: float, galvanometer: float
) -> None:
    length = balance_length(DRIVER, emf, internal, math.inf, galvanometer)
    assert length == pytest.approx(emf / 2.0, rel=1e-12)


def test_internal_resistance_from_two_balance_lengths() -> None:
    open_circuit = balance_length(DRIVER, 1.5, 0.8)
    loaded = balance_length(DRIVER, 1.5, 0.8, 5.0)
    assert open_circuit is not None and loaded is not None
    assert 5.0 * (open_circuit / loaded - 1) == pytest.approx(0.8, rel=1e-10)


def test_no_balance_beyond_the_wire() -> None:
    assert balance_length(DRIVER, 2.5) is None


def test_lens_at_2f_makes_an_equal_inverted_image() -> None:
    result = image(20.0, 10.0)
    assert result["imageDistance"] == pytest.approx(20.0)
    assert result["magnification"] == pytest.approx(1.0)


def test_lens_inside_f_makes_a_virtual_magnified_image() -> None:
    result = image(5.0, 10.0)
    assert result["imageDistance"] == pytest.approx(-10.0)
    assert result["magnification"] == pytest.approx(-2.0)


@given(st.floats(10.5, 500), st.floats(1, 10))
def test_lens_formula_holds_for_every_real_image(u: float, f: float) -> None:
    v = image(u, f)["imageDistance"]
    assert 1 / u + 1 / v == pytest.approx(1 / f, rel=1e-9)


def test_mixture_conserves_energy_and_recovers_c() -> None:
    final = final_temperature([(0.1, 390.0, 100.0), (0.2, 4200.0, 27.0), (0.05, 390.0, 27.0)])
    assert 27 < final < 100
    recovered = solid_specific_heat(0.1, 100.0, 0.2, 0.05, 390.0, 27.0, final)
    assert recovered == pytest.approx(390.0, rel=1e-10)


@pytest.mark.parametrize(
    ("name", "build"),
    [
        ("circuits.json", build_circuits),
        ("lens.json", build_lens),
        ("lens-exact.json", build_lens_exact),
        ("mixtures.json", build_mixtures),
    ],
)
def test_committed_fixtures_are_current(name: str, build: Callable[[], object]) -> None:
    committed = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    current = json.loads(json.dumps(build()))
    _assert_close(committed, current)


def _assert_close(old: object, new: object) -> None:
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
