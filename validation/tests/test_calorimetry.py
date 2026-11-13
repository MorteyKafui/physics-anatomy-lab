import math

import pytest

from pa_validation.calorimetry import Setup, peak, states
from pa_validation.mixtures import final_temperature

WATER, COPPER = 4200.0, 390.0
K = 0.01 / 60


def setup(v: float = 50.0, **kw: float) -> Setup:
    base = dict(room=28.0, loss=K, mixing=5.0, lag=8.0)
    base.update(kw)
    return Setup(0.05 * WATER, 65.0, v / 1000 * WATER + 0.05 * COPPER, 28.0, **base)


def test_with_no_loss_the_water_settles_at_the_ideal_mixture() -> None:
    s = setup(loss=0.0)
    ideal = final_temperature([(0.05, WATER, 65.0), (0.05, WATER, 28.0), (0.05, COPPER, 28.0)])
    end = states(s, [0.0, 600.0])[-1]
    assert end["hot"] == pytest.approx(ideal, abs=1e-9)
    assert end["thermometer"] == pytest.approx(ideal, abs=1e-9)
    assert peak(s) is None


def test_the_mean_cools_by_newtons_law() -> None:
    s = setup()
    for t, row in zip([0.0, 60.0, 600.0], states(s, [0.0, 60.0, 600.0]), strict=True):
        start = (s.hot_capacity * 65.0 + s.cold_capacity * 28.0) / (
            s.hot_capacity + s.cold_capacity
        )
        assert row["mean"] == pytest.approx(28.0 + (start - 28.0) * math.exp(-K * t), rel=1e-11)


def test_the_peak_is_a_little_below_the_ideal_rise_and_the_graph_keeps_its_intercept() -> None:
    xs, ys = [], []
    for v in (40.0, 50.0, 60.0, 70.0):
        p = peak(setup(v))
        assert p is not None
        rise = p["temperature"] - 28.0
        ideal = 0.05 * WATER * 37.0 / (0.05 * WATER + v / 1000 * WATER + 0.05 * COPPER)
        assert 0.1 < ideal - rise < 0.25
        xs.append(1 / rise)
        ys.append(v)
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys, strict=True)) / sum(
        (x - mx) ** 2 for x in xs
    )
    intercept = my - slope * mx
    w = 50 * COPPER / WATER
    assert intercept == pytest.approx(-(50 + w), abs=0.5)
    assert slope == pytest.approx(50 * 37, rel=0.02)


@pytest.mark.parametrize("c", [390.0, 380.0, 450.0, 900.0])
def test_a_hot_solid_with_no_loss_settles_where_its_specific_heat_is_recovered(c: float) -> None:
    from pa_validation.mixtures import solid_specific_heat

    s = Setup(0.1 * c, 100.0, 0.05 * WATER + 0.05 * COPPER, 28.0, 28.0, 0.0, 10.0, 8.0)
    end = states(s, [0.0, 600.0])[-1]
    final = final_temperature([(0.1, c, 100.0), (0.05, WATER, 28.0), (0.05, COPPER, 28.0)])
    assert end["thermometer"] == pytest.approx(final, abs=1e-9)
    assert solid_specific_heat(0.1, 100.0, 0.05, 0.05, COPPER, 28.0, final) == pytest.approx(
        c, rel=1e-9
    )


def test_the_solid_cools_in_the_air_by_newtons_law() -> None:
    from pa_validation.calorimetry import air_cooled

    k = 0.05 / 60
    for t in (0.0, 10.0, 30.0, 120.0):
        assert air_cooled(100.0, 28.0, k, t) == pytest.approx(
            28.0 + 72.0 * math.exp(-k * t), rel=1e-12
        )
