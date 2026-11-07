"""The review's numbers, written independently of packages/experiments with SciPy."""

import math
from collections.abc import Sequence

from pa_validation.fit import fit_line
from pa_validation.pendulum import period_exact


def reading_error_percent(count: int, counted_from_one: bool, swings: int = 20) -> float:
    """How far g comes out high when a timing covers fewer swings than it is divided by.

    The student divides t by `swings`; the stopwatch ran for `timed` periods, so the recorded
    period is T·timed/swings and g, which goes as 1/T², is (swings/timed)² times too big.
    """
    timed = count - (1 if counted_from_one else 0)
    return ((swings / timed) ** 2 - 1) * 100


def right_way(g: float, amplitude: float, lengths: Sequence[float]) -> dict[str, float]:
    """Slope of T² against l from exact periods, and g = 4π² / slope."""
    ls = sorted(set(lengths))
    squares = [period_exact(length, g, amplitude) ** 2 for length in ls]
    slope = fit_line(ls, squares)["slope"] if len(ls) >= 2 else squares[0] / ls[0]
    return {"slope": slope, "g": 4 * math.pi**2 / slope}
