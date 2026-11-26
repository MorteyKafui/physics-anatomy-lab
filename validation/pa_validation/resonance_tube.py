"""The resonance tube, written independently of packages/physics with NumPy and SciPy.

The TypeScript uses closed forms: v = √(γRT/M), L = (2n − 1)λ/4 − e, a closed-form oscillator
response and sin/cos standing waves. Here:

- the speed of sound is the slope dp/dρ of the adiabatic p(ρ) of an ideal gas, by a central
  difference, square-rooted;
- the air column's pressure p(x), measured up from the water, is integrated as the wave equation
  p'' = −k²p from the water (a pressure antinode, p = 1, p' = 0) with SciPy's DOP853, and the
  resonance lengths are the roots, found by brentq, where p vanishes at the end-corrected mouth;
- each mode's response to the fork is the steady state of a driven, damped oscillator found by
  solving its 2 × 2 linear system with NumPy;
- the air's displacement is −p'/k from the same integration.
"""

import math

import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

GAMMA = 1.4
R = 8.314462618
M = 0.0289647
P0 = 101_325.0
END_CORRECTION_FACTOR = 0.6
MAX_MODE = 40


def speed_of_sound(temperature_c: float) -> float:
    """√(dp/dρ) along the adiabat p = p₀ (ρ/ρ₀)^γ through the room's air."""
    t = temperature_c + 273.15
    rho0 = P0 * M / (R * t)
    h = rho0 * 1e-5

    def p(rho: float) -> float:
        return P0 * (rho / rho0) ** GAMMA

    return math.sqrt((p(rho0 + h) - p(rho0 - h)) / (2 * h))


def _pressure_along(k: float, height: float) -> tuple[float, float]:
    """p and p' at a height above the water, for p(0) = 1, p'(0) = 0."""
    if height == 0:
        return 1.0, 0.0
    sol = solve_ivp(
        lambda _x, y: [y[1], -k * k * y[0]],
        (0.0, height),
        [1.0, 0.0],
        method="DOP853",
        rtol=1e-12,
        atol=1e-14,
    )
    return float(sol.y[0, -1]), float(sol.y[1, -1])


def resonance_lengths(
    tube_length: float, radius: float, temperature_c: float, frequency: float
) -> list[float]:
    """The air column lengths L (mouth to water) at which p vanishes at height L + e."""
    e = END_CORRECTION_FACTOR * radius
    k = 2 * math.pi * frequency / speed_of_sound(temperature_c)
    sol = solve_ivp(
        lambda _x, y: [y[1], -k * k * y[0]],
        (0.0, tube_length + e),
        [1.0, 0.0],
        method="DOP853",
        rtol=1e-13,
        atol=1e-14,
        dense_output=True,
    )

    def p(h: float) -> float:
        return float(sol.sol(h)[0])

    grid = np.linspace(0.0, tube_length + e, 2001)
    values = [p(h) for h in grid]
    roots = []
    for a, b, fa, fb in zip(grid[:-1], grid[1:], values[:-1], values[1:], strict=True):
        if fa * fb < 0:
            roots.append(brentq(p, a, b, xtol=1e-15, rtol=1e-15) - e)
    return [r for r in roots if 0 < r <= tube_length]


def loudness(
    radius: float, temperature_c: float, q: float, air_column: float, frequency: float
) -> float:
    """The loudest mode's steady amplitude, x'' + (ωₙ/Q) x' + ωₙ² x = ωₙ² cos ωt, over Q."""
    e = END_CORRECTION_FACTOR * radius
    v = speed_of_sound(temperature_c)
    w = 2 * math.pi * frequency
    best = 0.0
    for n in range(1, MAX_MODE + 1):
        wn = 2 * math.pi * (2 * n - 1) * v / (4 * (air_column + e))
        # x = a cos ωt + b sin ωt.
        system = np.array([[wn**2 - w**2, w * wn / q], [-w * wn / q, wn**2 - w**2]])
        a, b = np.linalg.solve(system, np.array([wn**2, 0.0]))
        best = max(best, math.hypot(a, b))
    return best / q


def air_at(
    radius: float, temperature_c: float, air_column: float, frequency: float, depth: float
) -> tuple[float, float]:
    """The air's displacement (upwards) and pressure change at a depth below the mouth, at the
    phase where both are largest, scaled by the loudness."""
    k = 2 * math.pi * frequency / speed_of_sound(temperature_c)
    p, dp = _pressure_along(k, air_column - depth)
    amp = loudness(radius, temperature_c, 30.0, air_column, frequency)
    return amp * (-dp / k), amp * p
