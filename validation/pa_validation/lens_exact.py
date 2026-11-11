"""The real converging lens, independent of packages/physics: defocus, and rays traced exactly.

The TypeScript traces meridional rays in a plane with its own 2-D refraction. Here each ray is
a 3-D vector refracted by the vector form of Snell's law at spherical surfaces, the radius for a
focal length is found by root-finding on the thick-lens power, and the best focus is found by
minimising the spread of rays sampled over the whole face of the lens, not ring by ring.
Lengths in cm; distances from the lens's centre, real-is-positive.
"""

import contextlib
from dataclasses import dataclass

import numpy as np
from scipy.optimize import brentq, minimize_scalar


@dataclass(frozen=True)
class Lens:
    radius: float
    thickness: float
    index: float
    aperture: float


def thick_power(radius: float, thickness: float, index: float) -> float:
    n, r, t = index, radius, thickness
    return (n - 1) * (2 / r - (n - 1) * t / (n * r * r))


def lens_for_focal_length(f: float, index: float, aperture: float, edge: float = 0.1) -> Lens:
    """The radius whose thick-lens focal length is f: centre as thick as the sag plus edge."""

    def thickness(r: float) -> float:
        return 2 * (r - np.sqrt(r * r - (aperture / 2) ** 2)) + edge

    def error(r: float) -> float:
        return thick_power(r, thickness(r), index) - 1 / f

    r = brentq(error, aperture / 2 + 1e-9, 10 * f, xtol=1e-15, rtol=1e-15, maxiter=500)
    return Lens(float(r), float(thickness(r)), index, aperture)


def _refract(d: np.ndarray, normal: np.ndarray, n1: float, n2: float) -> np.ndarray:
    """Vector Snell's law. normal is a unit vector on the side the ray comes from."""
    cos_i = -float(np.dot(normal, d))
    k = n1 / n2
    sin2_t = k * k * (1 - cos_i * cos_i)
    if sin2_t > 1:
        raise ValueError("total internal reflection")
    return k * d + (k * cos_i - np.sqrt(1 - sin2_t)) * normal


def _hit_sphere(
    p: np.ndarray, d: np.ndarray, centre: np.ndarray, r: float, far: bool
) -> np.ndarray:
    oc = p - centre
    b = float(np.dot(oc, d))
    disc = b * b - (float(np.dot(oc, oc)) - r * r)
    if disc < 0:
        raise ValueError("misses the surface")
    s = -b + np.sqrt(disc) if far else -b - np.sqrt(disc)
    return p + s * d


def trace(lens: Lens, u: float, x: float, y: float) -> tuple[np.ndarray, np.ndarray]:
    """A ray from the axial object point at z = −u to the point (x, y) of the lens's front
    surface, traced through both surfaces. Gives the exit point and the unit exit direction."""
    r, t, n = lens.radius, lens.thickness, lens.index
    c1 = np.array([0.0, 0.0, -t / 2 + r])
    c2 = np.array([0.0, 0.0, t / 2 - r])
    start = np.array([0.0, 0.0, -u])
    # The front surface point with these x, y.
    z1 = c1[2] - np.sqrt(r * r - x * x - y * y)
    p1 = np.array([x, y, z1])
    d0 = (p1 - start) / np.linalg.norm(p1 - start)
    d1 = _refract(d0, (p1 - c1) / r, 1.0, n)
    p2 = _hit_sphere(p1, d1, c2, r, far=True)
    if np.hypot(p2[0], p2[1]) > lens.aperture / 2:
        raise ValueError("leaves past the rim")
    d2 = _refract(d1, -(p2 - c2) / r, n, 1.0)
    return p2, d2


def axis_crossing(lens: Lens, u: float, h: float) -> float:
    """Where a ray through height h of the front surface crosses the axis behind the lens."""
    p, d = trace(lens, u, 0.0, h)
    return float(p[2] - p[1] * d[2] / d[1])


def paraxial_image(lens: Lens, u: float) -> float:
    """The thick lens's paraxial image by the limit of real rays: crossings at small heights,
    extrapolated to h = 0 (the crossing is even in h, so a fit in h² removes the h² term)."""
    hs = np.array([1e-3, 2e-3, 3e-3])
    zs = np.array([axis_crossing(lens, u, float(h)) for h in hs])
    coeffs = np.polyfit(hs**2, zs, 1)
    return float(coeffs[1])


def best_focus(lens: Lens, u: float, samples: int = 160) -> float:
    """The screen distance with the least root-mean-square spread of rays sampled evenly over
    the whole face of the lens (a square grid inside the aperture)."""
    a = lens.aperture / 2
    grid = np.linspace(-a, a, samples)
    rays = []
    for x in grid:
        for y in grid:
            # A ray the rim stops is left out, as the TypeScript leaves it out.
            if 0 < x * x + y * y <= a * a:
                with contextlib.suppress(ValueError):
                    rays.append(trace(lens, u, float(x), float(y)))
    ps = np.array([p for p, _ in rays])
    ds = np.array([d for _, d in rays])

    def spread(z: float) -> float:
        s = (z - ps[:, 2]) / ds[:, 2]
        at = ps[:, :2] + s[:, None] * ds[:, :2]
        return float(np.mean(np.sum(at * at, axis=1)))

    guess = paraxial_image(lens, u)
    out = minimize_scalar(
        spread, bounds=(0.8 * guess, 1.05 * guess), method="bounded", options={"xatol": 1e-9}
    )
    return float(out.x)


def defocus_blur(u: float, f: float, s: float, aperture: float) -> float:
    """The blur patch of a thin lens on a screen at s, from the edge ray's height by matrices."""
    travel = lambda d: np.array([[1.0, d], [0.0, 1.0]])  # noqa: E731
    thin = np.array([[1.0, 0.0], [-1.0 / f, 1.0]])
    # The edge ray: from the axial point to height D/2 at the lens.
    ray = np.array([0.0, (aperture / 2) / u])
    at = travel(s) @ thin @ travel(u) @ ray
    return float(2 * abs(at[0]))
