"""The Bonferroni outlier test, independent of packages/analysis.

The TypeScript refits the line without each reading. Here the externally studentised residual
comes from the hat matrix instead:

    t_i = e_i / (s_(i) √(1 − h_ii)),   s_(i)² = ((n − 2) s² − e_i² / (1 − h_ii)) / (n − 3)

and the critical value from scipy.stats.t. The two must agree.
"""

from collections.abc import Sequence

import numpy as np
from scipy import stats


def deleted_residuals(xs: Sequence[float], ys: Sequence[float]) -> list[float]:
    x = np.asarray(xs, dtype=float)
    y = np.asarray(ys, dtype=float)
    n = len(x)
    design = np.column_stack([np.ones(n), x])
    hat = design @ np.linalg.inv(design.T @ design) @ design.T
    leverage = np.diag(hat)
    residual = y - hat @ y
    s2 = float(residual @ residual) / (n - 2)
    s2_without = ((n - 2) * s2 - residual**2 / (1 - leverage)) / (n - 3)
    return [float(v) for v in residual / np.sqrt(s2_without * (1 - leverage))]


def critical_value(n: int, alpha: float = 0.05) -> float:
    return float(stats.t.ppf(1 - alpha / (2 * n), n - 3))


def find_outlier(xs: Sequence[float], ys: Sequence[float], alpha: float = 0.05) -> int | None:
    if len(xs) < 5:
        return None
    t = deleted_residuals(xs, ys)
    worst = int(np.argmax(np.abs(t)))
    return worst if abs(t[worst]) > critical_value(len(xs), alpha) else None
