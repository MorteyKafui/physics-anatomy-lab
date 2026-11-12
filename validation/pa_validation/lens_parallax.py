"""No parallax between a search pin and the image of an object pin (Experiment 96), independent
of packages/physics.

The TypeScript finds the ray that reaches the eye by bisection over meridional rays it traces in
a plane, samples the head's travel at 65 places, and finds the best pin place by golden-section
search. Here the rays are the 3-D vector-Snell rays of lens_exact.trace, the ray to the eye is
found by Brent's method, the head's travel is sampled at 401 places, and the best place and the
edges of the no-parallax stretch are found with SciPy's bounded minimiser and root-finder.
Lengths in cm; distances from the lens's centre, real-is-positive.
"""

import contextlib
from dataclasses import dataclass

import numpy as np
from scipy.optimize import brentq, minimize_scalar

from .lens_exact import Lens, paraxial_image, trace

ARCMIN = np.pi / (180 * 60)


@dataclass(frozen=True)
class View:
    eye_behind: float
    head: float
    acuity: float
    centre: float = 0.0


def _passes(lens: Lens, u: float, y: float) -> bool:
    try:
        trace(lens, u, 0.0, y)
    except ValueError:
        return False
    return True


def outermost(lens: Lens, u: float) -> float:
    """The largest front-surface height whose ray gets through the lens."""
    rim = lens.aperture / 2
    if _passes(lens, u, rim):
        return rim
    return float(brentq(lambda y: 1.0 if _passes(lens, u, y) else -1.0, 1e-9, rim, xtol=1e-14))


def _arrives(lens: Lens, u: float, eye: float, y: float) -> tuple[float, float]:
    """The ray through front height y (taken below the axis, so it reaches the eye above it):
    the height it reaches at the eye, and its slope there."""
    p, d = trace(lens, u, 0.0, -y)
    k = d[1] / d[2]
    return float(p[1] + k * (eye - p[2])), float(k)


def reach(lens: Lens, u: float, eye: float) -> float:
    """How far off the axis the eye can be and still see the image through the lens."""
    return max(0.0, _arrives(lens, u, eye, outermost(lens, u))[0])


def separation(lens: Lens, u: float, pin: float, eye: float, h: float) -> float | None:
    """The apparent angle between the image and the pin's tip for the eye h above the axis."""
    if h == 0:
        return 0.0
    a = abs(h)
    top = outermost(lens, u)
    if _arrives(lens, u, eye, top)[0] < a:
        return None
    y = brentq(lambda y: _arrives(lens, u, eye, y)[0] - a, 1e-9, top, xtol=1e-15, rtol=1e-15)
    slope = _arrives(lens, u, eye, y)[1]
    angle = np.arctan(slope) - np.arctan(a / (eye - pin))
    return float(np.sign(h) * angle)


def no_parallax(lens: Lens, u: float, view: View) -> dict[str, float | None]:
    v = paraxial_image(lens, u)
    eye = v + view.eye_behind
    r = reach(lens, u, eye)
    half = min(view.head, r + abs(view.centre))
    heads = [h for h in np.linspace(view.centre - half, view.centre + half, 401) if abs(h) <= r]
    # The ray to the eye at each head does not depend on the pin: find each once.
    top = outermost(lens, u)
    rays = []
    for h in heads:
        if h == 0:
            continue
        a = abs(h)

        def miss(y: float, a: float = a) -> float:
            return _arrives(lens, u, eye, y)[0] - a

        with contextlib.suppress(ValueError):
            y = brentq(miss, 1e-9, top, xtol=1e-15)
            rays.append((h, _arrives(lens, u, eye, y)[1]))
    hs = np.array([h for h, _ in rays])
    slopes = np.array([k for _, k in rays])

    def worst(s: float) -> float:
        angles = np.sign(hs) * (np.arctan(slopes) - np.arctan(np.abs(hs) / (eye - s)))
        return float(np.max(np.abs(angles))) if angles.size else 0.0

    hi = min(1.2 * v, eye - 1e-6 * eye)
    best = minimize_scalar(worst, bounds=(0.5 * v, hi), method="bounded", options={"xatol": 1e-10})
    at, residual = float(best.x), float(best.fun)
    out: dict[str, float | None] = {
        "at": at,
        "residual": residual,
        "head": min(view.head, r),
        "from": None,
        "to": None,
    }
    if residual <= view.acuity:
        f = lambda s: worst(s) - view.acuity  # noqa: E731
        out["from"] = float(brentq(f, 0.5 * v, at, xtol=1e-12))
        out["to"] = float(brentq(f, at, hi, xtol=1e-12))
    return out
