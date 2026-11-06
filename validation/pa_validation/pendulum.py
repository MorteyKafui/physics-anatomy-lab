"""Simple pendulum, written independently of packages/physics with SciPy."""

import math

from scipy.special import ellipk


def period_small_angle(length: float, g: float) -> float:
    """T = 2π √(l / g)."""
    return 2 * math.pi * math.sqrt(length / g)


def period_exact(length: float, g: float, amplitude: float) -> float:
    """T = 4 √(l / g) K(m) with parameter m = sin²(θ₀ / 2)."""
    m = math.sin(abs(amplitude) / 2) ** 2
    return 4 * math.sqrt(length / g) * float(ellipk(m))
