"""The vibrating string on a sonometer, written independently of packages/physics.

The driven response is a complex amplitude (NumPy) rather than a closed-form modulus and
phase, the mode frequencies come from the wave equation's eigenvalues found numerically
(finite differences on the string, SciPy), and the rider's resonance band is found by
root-finding (SciPy brentq) rather than from the quadratic in r².
"""

import math

import numpy as np
from scipy.linalg import eigh_tridiagonal
from scipy.optimize import brentq

STANDARD_GRAVITY = 9.80665
STEEL_DENSITY = 7850.0
INCH = 0.0254
# British Standard wire gauge (BS 3737), diameters in inches.
SWG_INCHES = {28: 0.0148, 29: 0.0136, 30: 0.0124, 31: 0.0116, 32: 0.0108}
RIDER_THRESHOLD = 0.5


def linear_density(diameter: float, density: float) -> float:
    """Mass of one metre of round wire: density × cross-section."""
    area = math.pi * (diameter / 2) ** 2
    return density * area


def tension(mass: float, g: float = STANDARD_GRAVITY, pulley_loss: float = 0.0) -> float:
    return mass * g - pulley_loss * mass * g


def wave_speed(tension_n: float, mu: float) -> float:
    return math.sqrt(tension_n / mu)


def harmonic_frequency(n: int, length: float, speed: float) -> float:
    """f = v / λ with λ = 2l / n."""
    wavelength = 2 * length / n
    return speed / wavelength


def string_eigenfrequencies(length: float, tension_n: float, mu: float, count: int) -> list[float]:
    """The lowest `count` natural frequencies of a string fixed at both ends, from the wave
    equation μ ∂²y/∂t² = T ∂²y/∂x² discretised on 4000 points. Richardson extrapolation from a
    second grid removes the O(h²) error, so the result is checked against n v / 2l to about 1e-9.
    """

    def on_grid(points: int) -> np.ndarray:
        h = length / (points + 1)
        diag = np.full(points, 2.0 / h**2)
        off = np.full(points - 1, -1.0 / h**2)
        k2 = eigh_tridiagonal(diag, off, select="i", select_range=(0, count - 1))[0]
        return np.sqrt(k2 * tension_n / mu) / (2 * math.pi)

    coarse, fine = on_grid(2000), on_grid(4000)
    # Grid spacing halves (almost exactly: (2000+1)/(4000+1)), error ∝ h².
    ratio = ((4000 + 1) / (2000 + 1)) ** 2
    return list((ratio * fine - coarse) / (ratio - 1))


def mode_displacement(
    n: int, x: float, t: float, length: float, speed: float, amplitude: float
) -> float:
    """Standing wave as two travelling waves: (A/2)[sin(kx − ωt) + sin(kx + ωt)]."""
    if x <= 0 or x >= length:
        return 0.0
    k = n * math.pi / length
    omega = k * speed
    return amplitude / 2 * (math.sin(k * x - omega * t) + math.sin(k * x + omega * t))


def complex_response(drive: float, natural: float, q: float) -> complex:
    """Steady state of ÿ + (ω₀/Q) ẏ + ω₀² y = ω₀² e^{iωt}: y = 1 / (1 − r² + i r/Q)."""
    w0 = 2 * math.pi * natural
    w = 2 * math.pi * drive
    return w0**2 / (w0**2 - w**2 + 1j * w * w0 / q)


def driven_response(drive: float, natural: float, q: float) -> float:
    return abs(complex_response(drive, natural, q))


def driven_phase(drive: float, natural: float, q: float) -> float:
    """Lag of the mode behind the drive, 0 to π."""
    return -float(np.angle(complex_response(drive, natural, q)))


def driven_displacement(
    length: float,
    speed: float,
    frequency: float,
    q: float,
    x: float,
    t: float,
    drive: float,
    modes: int = 4,
) -> float:
    if x <= 0 or x >= length:
        return 0.0
    total = 0j
    for n in range(1, modes + 1):
        fn = harmonic_frequency(n, length, speed)
        total += complex_response(frequency, fn, q) * math.sin(n * math.pi * x / length)
    return drive * float((total * np.exp(2j * math.pi * frequency * t)).real)


def rider_excitation(
    length: float,
    speed: float,
    frequency: float,
    q: float,
    rider_at: float,
    strength: float = 1.0,
    modes: int = 4,
) -> float:
    shakes = [
        driven_response(frequency, harmonic_frequency(n, length, speed), q)
        * abs(math.sin(n * math.pi * rider_at))
        for n in range(1, modes + 1)
    ]
    return strength * max(shakes) / (RIDER_THRESHOLD * q)


def resonance_band(
    frequency: float, speed: float, q: float, strength: float = 1.0, n: int = 1
) -> tuple[float, float] | None:
    """Lengths where harmonic n alone, at its antinode, just throws the rider."""
    need = RIDER_THRESHOLD * q / strength

    def excess(length: float) -> float:
        return driven_response(frequency, harmonic_frequency(n, length, speed), q) - need

    centre = n * speed / (2 * frequency)
    # The peak sits at r = √(1 − 1/2Q²), a hair below the resonant length.
    peak = centre * math.sqrt(max(1 - 1 / (2 * q * q), 0.0))
    if excess(peak) < 0:
        return None
    lo = brentq(excess, 1e-12 * centre, peak, xtol=1e-16, rtol=1e-15, maxiter=500)
    hi = brentq(excess, peak, 10 * centre, xtol=1e-16, rtol=1e-15, maxiter=500)
    return lo, hi
