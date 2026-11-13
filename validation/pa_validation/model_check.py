"""The model check's verdict, written independently of packages/analysis with NumPy.

A student's own lab readings set against the model's line in three parts (data templates brief,
decision 5 as amended on 2026-11-13): shifted, tilted and scattered. Each part is found when its
figure is more than FACTOR standard errors (or FACTOR times a careful student's spread) out.
"""

from collections.abc import Sequence

import numpy as np

FACTOR = 2.0
MIN_POINTS = 3


def model_check(
    xs: Sequence[float],
    ys: Sequence[float],
    model: Sequence[float],
    careful: float,
    model_slope: float | None = None,
    curve: bool = False,
) -> dict[str, object] | None:
    x = np.asarray(xs, dtype=float)
    y = np.asarray(ys, dtype=float)
    m = np.asarray(model, dtype=float)
    n = len(x)
    if n < MIN_POINTS or len(m) != n:
        return None

    d = y - m
    shift = float(np.mean(d))
    if curve:
        spread = float(np.std(d, ddof=1))
        slope = None
    else:
        slope, intercept = np.polyfit(x, y, 1)
        spread = float(np.sqrt(np.sum((y - (slope * x + intercept)) ** 2) / (n - 2)))

    sd = max(spread, careful)
    shift_error = sd / np.sqrt(n)
    out: dict[str, object] = {
        "n": n,
        "shift": {
            "value": shift,
            "error": float(shift_error),
            "errors": float(shift / shift_error),
            "found": bool(abs(shift / shift_error) > FACTOR),
        },
        "spread": {
            "value": spread,
            "careful": careful,
            "ratio": spread / careful,
            "found": bool(spread / careful > FACTOR),
        },
    }
    if slope is not None and model_slope is not None:
        error = sd / np.sqrt(np.sum((x - np.mean(x)) ** 2))
        errors = (float(slope) - model_slope) / error
        out["tilt"] = {
            "value": float(slope),
            "model": model_slope,
            "error": float(error),
            "errors": float(errors),
            "found": bool(abs(errors) > FACTOR),
        }
    return out
