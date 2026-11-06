"""The thin converging lens by paraxial ray-transfer matrices, independent of packages/physics.

The TypeScript uses the lens formula directly. Here a ray travels u to the lens, is bent by it,
and travels v further; the image plane is where the system matrix's B element is zero (every ray
from one object point meets at one image point). Distances are positive when real, as in the
WASSCE convention; a virtual image comes out with negative v.
"""

import numpy as np


def _travel(d: float) -> np.ndarray:
    return np.array([[1.0, d], [0.0, 1.0]])


def _lens(f: float) -> np.ndarray:
    return np.array([[1.0, 0.0], [-1.0 / f, 1.0]])


def _system(u: float, v: float, f: float) -> np.ndarray:
    return _travel(v) @ _lens(f) @ _travel(u)


def image(u: float, f: float) -> dict[str, float]:
    """Image distance and magnification (image size over object size, positive when inverted)."""
    # B is affine in v, so two evaluations fix it exactly.
    b0 = _system(u, 0.0, f)[0, 1]
    b1 = _system(u, 1.0, f)[0, 1]
    v = -b0 / (b1 - b0)
    a = _system(u, v, f)[0, 0]  # ray height at the image over height at the object
    return {"imageDistance": float(v), "magnification": float(-a)}
