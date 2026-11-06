"""Straight-line fits, written independently of packages/analysis with SciPy and NumPy."""

from collections.abc import Sequence

import numpy as np
from scipy import stats


def fit_line(xs: Sequence[float], ys: Sequence[float]) -> dict[str, float]:
    """Ordinary least squares with standard errors, from scipy.stats.linregress."""
    result = stats.linregress(np.asarray(xs, dtype=float), np.asarray(ys, dtype=float))
    n = len(xs)
    residual = np.asarray(ys) - (result.slope * np.asarray(xs) + result.intercept)
    residual_sd = float(np.sqrt(np.sum(residual**2) / (n - 2))) if n > 2 else 0.0
    return {
        "slope": float(result.slope),
        "intercept": float(result.intercept),
        "slopeError": float(result.stderr) if n > 2 else 0.0,
        "interceptError": float(result.intercept_stderr) if n > 2 else 0.0,
        "r2": float(result.rvalue**2),
        "residualSd": residual_sd,
    }


def fit_through_origin(xs: Sequence[float], ys: Sequence[float]) -> dict[str, float]:
    """y = kx by NumPy least squares; the slope's standard error uses n - 1 degrees of freedom."""
    x = np.asarray(xs, dtype=float)
    y = np.asarray(ys, dtype=float)
    (k,), *_ = np.linalg.lstsq(x[:, None], y, rcond=None)
    n = len(x)
    sse = float(np.sum((y - k * x) ** 2))
    error = float(np.sqrt(sse / (n - 1) / np.sum(x**2))) if n > 1 else 0.0
    return {"slope": float(k), "slopeError": error}
