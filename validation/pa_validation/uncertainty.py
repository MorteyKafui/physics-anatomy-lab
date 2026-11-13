"""The advanced uncertainty layer, written independently of packages/analysis with SymPy.

Worst-case propagation (docs/content/uncertainty-brief.md, decision 3): each input's uncertainty
times the magnitude of the formula's exact partial derivative, all added. The steepest and least
steep lines through the first and last points' error boxes (decision 5), and an uncertainty
rounded as it is quoted (decision 6).
"""

from collections.abc import Mapping, Sequence
from decimal import ROUND_HALF_UP, Decimal

import numpy as np
import sympy as sp


def worst_case(
    formula: str, values: Mapping[str, float], uncertainties: Mapping[str, float]
) -> dict[str, float]:
    names = {name: sp.Symbol(name) for name in values}
    expr = sp.sympify(formula, locals=names)
    at = {names[k]: v for k, v in values.items()}
    total = 0.0
    for name, u in uncertainties.items():
        total += abs(float(sp.diff(expr, names[name]).subs(at))) * u
    return {"value": float(expr.subs(at)), "uncertainty": total}


def quoted(u: float) -> dict[str, float]:
    """One significant figure, or two if it starts with a 1."""
    exponent = int(np.floor(np.log10(u)))
    figures = 2 if str(Decimal(repr(u)).scaleb(-exponent))[0] == "1" else 1
    # Halves round up, as schools round them: 0.25 to one figure is 0.3.
    step = Decimal(1).scaleb(exponent - figures + 1)
    rounded = float(Decimal(repr(u)).quantize(step, rounding=ROUND_HALF_UP))
    return {"value": rounded, "figures": figures, "decimals": max(0, figures - 1 - exponent)}


def worst_lines(
    xs: Sequence[float], ys: Sequence[float], dxs: Sequence[float], dys: Sequence[float]
) -> dict[str, float]:
    order = np.argsort(xs)
    x = np.asarray(xs, dtype=float)[order]
    y = np.asarray(ys, dtype=float)[order]
    dx = np.asarray(dxs, dtype=float)[order]
    dy = np.asarray(dys, dtype=float)[order]
    up = 1.0 if np.polyfit(x, y, 1)[0] >= 0 else -1.0

    def slope(x1: float, y1: float, x2: float, y2: float) -> float:
        return (y2 - y1) / (x2 - x1)

    steep = slope(x[0] + dx[0], y[0] - up * dy[0], x[-1] - dx[-1], y[-1] + up * dy[-1])
    least = slope(x[0] - dx[0], y[0] + up * dy[0], x[-1] + dx[-1], y[-1] - up * dy[-1])
    return {"steepest": steep, "leastSteep": least, "half": abs(steep - least) / 2}


def intercept_sum(xs: Sequence[float], ys: Sequence[float]) -> dict[str, float]:
    """m1 + m2, where the least-squares line meets the y and x axes, with its error from NumPy's
    covariance matrix of the slope and intercept."""
    x = np.asarray(xs, dtype=float)
    y = np.asarray(ys, dtype=float)
    (b, a), cov = np.polyfit(x, y, 1, cov="unscaled")
    n = len(x)
    s2 = float(np.sum((y - (b * x + a)) ** 2) / (n - 2))
    cov = cov * s2
    value = a - a / b
    # The gradient of a - a/b with respect to (b, a).
    grad = np.array([a / b**2, 1 - 1 / b])
    return {"value": float(value), "error": float(np.sqrt(grad @ cov @ grad))}
