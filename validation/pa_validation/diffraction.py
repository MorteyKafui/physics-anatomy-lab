"""Far-field diffraction by N slits, by numerical integration, independent of packages/physics.

The TypeScript uses the closed form (sin β / β)² (sin Nα / N sin α)². Here each opening's complex
amplitude, the integral of exp(i k x sin θ) across it, is integrated numerically with SciPy's quad
and the openings are added as phasors. With a which-slit detector the openings' intensities are
added instead. Both are divided by the on-axis value, so the centre of the pattern is 1.
"""

import math

import numpy as np
from scipy.integrate import quad


def _openings(count: int, width: float, spacing: float) -> list[tuple[float, float]]:
    centres = [(j - (count - 1) / 2) * spacing for j in range(count)]
    return [(c - width / 2, c + width / 2) for c in centres]


def _amplitude(lo: float, hi: float, k_sin: float) -> complex:
    re, _ = quad(lambda x: math.cos(k_sin * x), lo, hi, epsabs=1e-16, epsrel=1e-13, limit=200)
    im, _ = quad(lambda x: math.sin(k_sin * x), lo, hi, epsabs=1e-16, epsrel=1e-13, limit=200)
    return complex(re, im)


def intensity(
    count: int, width: float, spacing: float, wavelength: float, sin_theta: float
) -> float:
    """The N-slit pattern relative to its centre."""
    k_sin = 2 * math.pi / wavelength * sin_theta
    total = sum(_amplitude(lo, hi, k_sin) for lo, hi in _openings(count, width, spacing))
    return float(np.abs(total) ** 2 / (count * width) ** 2)


def which_slit(
    count: int, width: float, spacing: float, wavelength: float, sin_theta: float
) -> float:
    """With a which-slit detector: the openings' intensities add, with no interference."""
    k_sin = 2 * math.pi / wavelength * sin_theta
    total = sum(abs(_amplitude(lo, hi, k_sin)) ** 2 for lo, hi in _openings(count, width, spacing))
    return float(total / (count * width**2))
