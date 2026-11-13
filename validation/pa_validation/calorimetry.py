"""The lumped heat model of the method of mixtures (Experiment 62), independent of
packages/physics.

The TypeScript solves the equations in closed form and finds the peak by bisection. Here they are
written as heat flows between bodies and integrated numerically with SciPy's DOP853, and the
peak is found by solve_ivp's event location where the thermometer stops rising.

  the poured water and the cold water (with the calorimeter) exchange G (θ_h − θ_c), with
  G = C_h C_c / ((C_h + C_c) τ_mix); each loses k C (θ − θ₀) to the room; the thermometer
  follows the cold water with a first-order lag τ.

Temperatures in °C, times in s, heat capacities in J/K, k in 1/s.
"""

from dataclasses import dataclass

import numpy as np
from scipy.integrate import solve_ivp

TOL = dict(rtol=1e-13, atol=1e-13, method="DOP853")


@dataclass(frozen=True)
class Setup:
    hot_capacity: float
    hot_temperature: float
    cold_capacity: float
    cold_temperature: float
    room: float
    loss: float
    mixing: float
    lag: float


def _flows(s: Setup):
    g = s.hot_capacity * s.cold_capacity / ((s.hot_capacity + s.cold_capacity) * s.mixing)

    def water(th: float, tc: float) -> tuple[float, float]:
        between = g * (th - tc)
        dh = (-between - s.loss * s.hot_capacity * (th - s.room)) / s.hot_capacity
        dc = (between - s.loss * s.cold_capacity * (tc - s.room)) / s.cold_capacity
        return dh, dc

    return water


def _system(s: Setup):
    water = _flows(s)
    if s.lag == 0:
        return lambda t, y: list(water(y[0], y[1]))

    def rhs(t: float, y: np.ndarray) -> list[float]:
        dh, dc = water(y[0], y[1])
        return [dh, dc, (y[1] - y[2]) / s.lag]

    return rhs


def _start(s: Setup) -> list[float]:
    y = [s.hot_temperature, s.cold_temperature]
    return y if s.lag == 0 else [*y, s.cold_temperature]


def states(s: Setup, times: list[float]) -> list[dict[str, float]]:
    """hot, cold, mean and thermometer at each time."""
    sol = solve_ivp(_system(s), [0.0, max(times)], _start(s), t_eval=times, **TOL)
    assert sol.success, sol.message
    total = s.hot_capacity + s.cold_capacity
    out = []
    for i in range(len(times)):
        th, tc = float(sol.y[0, i]), float(sol.y[1, i])
        meter = tc if s.lag == 0 else float(sol.y[2, i])
        mean = (s.hot_capacity * th + s.cold_capacity * tc) / total
        out.append({"hot": th, "cold": tc, "mean": mean, "thermometer": meter})
    return out


def peak(s: Setup, t_end: float = 86_400.0) -> dict[str, float] | None:
    """When the thermometer stops rising, and what it reads then. With no heat lost it creeps up
    to the ideal mixture for ever and never stops: past a few minutes the gap between the water
    and the thermometer is below rounding, so the event would only find noise."""
    if s.loss == 0:
        return None
    water = _flows(s)
    rhs = _system(s)

    def stops(t: float, y: np.ndarray) -> float:
        if s.lag == 0:
            return water(y[0], y[1])[1]
        return y[1] - y[2]

    stops.terminal = True
    stops.direction = -1
    sol = solve_ivp(rhs, [0.0, t_end], _start(s), events=stops, **TOL)
    if not sol.t_events[0].size:
        return None
    t = float(sol.t_events[0][0])
    y = sol.y_events[0][0]
    return {"at": t, "temperature": float(y[1] if s.lag == 0 else y[2])}


def air_cooled(start: float, room: float, loss: float, seconds: float) -> float:
    """A hot solid carried through the air for `seconds`, cooling by Newton's law, integrated."""
    if seconds == 0:
        return start
    sol = solve_ivp(
        lambda t, y: [-loss * (y[0] - room)], [0.0, seconds], [start], t_eval=[seconds], **TOL
    )
    assert sol.success, sol.message
    return float(sol.y[0, -1])
