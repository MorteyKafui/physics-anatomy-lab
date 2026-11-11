"""The Python circuit models on their own, before they are trusted to check the TypeScript."""

import math

import numpy as np

from pa_validation.circuits import random_network, terminal_pd_readings


def test_terminal_pd_lies_on_v_equals_e_minus_ir_with_ideal_meters():
    for jockey in (None, 0.0, 0.3, 0.7, 1.0):
        r = terminal_pd_readings(3.0, 1.5, 1.0, 4.0, 1.0, 0.0, math.inf, jockey, True)
        assert math.isclose(r["voltage"], 3.0 - r["current"] * 1.5, rel_tol=1e-12)


def test_terminal_pd_by_hand():
    # Jockey at 0.5 m: wire 2 Ω left in circuit; ideal meters: I = 3 / (1.5 + 1 + 2).
    r = terminal_pd_readings(3.0, 1.5, 1.0, 4.0, 1.0, 0.0, math.inf, 0.5, True)
    assert math.isclose(r["current"], 3.0 / 4.5, rel_tol=1e-12)


def test_open_key_stops_the_current():
    r = terminal_pd_readings(3.0, 1.5, 1.0, 4.0, 1.0, 0.05, 5000.0, 0.5, False)
    assert r["current"] == 0.0
    assert math.isclose(r["voltage"], 3.0 * 5000.0 / 5001.5, rel_tol=1e-12)


def test_random_networks_obey_kirchhoffs_current_law():
    rng = np.random.default_rng(7)
    for _ in range(20):
        net = random_network(rng)
        totals: dict[str, float] = {}
        for e in net["elements"]:
            i = net["currents"].get(e["id"], 0.0)
            if e["kind"] == "resistor":
                totals[e["a"]] = totals.get(e["a"], 0.0) - i
                totals[e["b"]] = totals.get(e["b"], 0.0) + i
            else:
                totals[e["plus"]] = totals.get(e["plus"], 0.0) + i
                totals[e["minus"]] = totals.get(e["minus"], 0.0) - i
        assert all(abs(t) < 1e-9 for t in totals.values())
