"""Write the fixtures in fixtures/ from the independent Python models.

pendulum.json  exact pendulum period (SciPy ellipk)        read by packages/physics
fit.json       straight-line fits (SciPy linregress)       read by packages/analysis
sigfigs.json   significant figures (Python decimal)        read by packages/analysis
"""

import json
import math
from pathlib import Path

from pa_validation.fit import fit_line, fit_through_origin
from pa_validation.pendulum import period_exact
from pa_validation.sigfigs import format_sig_figs, parse_figure

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

LENGTHS = [0.25, 0.5, 0.8, 1.0, 2.0]
GRAVITY = [9.78, 9.81, 1.62]
AMPLITUDES_DEG = [0, 2, 5, 10, 30, 60, 90, 150, 179]


def build() -> dict[str, object]:
    cases = [
        {
            "length": length,
            "g": g,
            "amplitude": math.radians(a),
            "period": period_exact(length, g, math.radians(a)),
        }
        for length in LENGTHS
        for g in GRAVITY
        for a in AMPLITUDES_DEG
    ]
    return {
        "model": "simple pendulum, exact period, SciPy ellipk",
        "units": {"length": "m", "g": "m s^-2", "amplitude": "rad", "period": "s"},
        "cases": cases,
    }


# Datasets shaped like the v1 experiments' graphs. Values are written out, not generated, so the
# fixture never depends on a random-number library's version.
FIT_DATASETS: list[dict[str, object]] = [
    {
        "name": "pendulum: T² against l (the table mockup's readings)",
        "x": [1.0, 0.9, 0.8, 0.7, 0.6],
        "y": [(t / 20) ** 2 for t in (40.1, 38.1, 35.9, 33.5, 31.1)],
        "throughOrigin": True,
    },
    {
        "name": "Ohm's law: V against I",
        "x": [0.10, 0.20, 0.30, 0.40, 0.50, 0.60],
        "y": [0.52, 1.01, 1.49, 2.03, 2.48, 3.02],
        "throughOrigin": True,
    },
    {
        "name": "converging lens: 1/v against 1/u (cm⁻¹)",
        "x": [1 / u for u in (20.0, 25.0, 30.0, 40.0, 50.0)],
        "y": [1 / v for v in (60.2, 37.4, 30.1, 26.8, 25.0)],
        "throughOrigin": False,
    },
    {
        "name": "cooling: θ against t",
        "x": [0, 60, 120, 180, 240, 300, 360],
        "y": [80.0, 76.9, 74.1, 71.0, 68.2, 65.1, 62.3],
        "throughOrigin": False,
    },
    {"name": "exact line y = 3x + 2", "x": [1, 2, 3, 4, 5], "y": [5, 8, 11, 14, 17]},
    {"name": "two points", "x": [1, 3], "y": [2, 8]},
]


def build_fit() -> dict[str, object]:
    cases = []
    for data in FIT_DATASETS:
        xs = [float(v) for v in data["x"]]  # type: ignore[union-attr]
        ys = [float(v) for v in data["y"]]  # type: ignore[union-attr]
        case: dict[str, object] = {
            "name": data["name"],
            "x": xs,
            "y": ys,
            "line": fit_line(xs, ys),
        }
        if data.get("throughOrigin"):
            case["throughOrigin"] = fit_through_origin(xs, ys)
        cases.append(case)
    return {"model": "least squares, SciPy linregress and NumPy lstsq", "cases": cases}


SIGFIG_INPUTS = [
    "123", "1002", "2.50", "0.0045", "45.30", "0.500", "3.0e8", "1200", "10", "0", "0.00",
    "100.", "5.", ".5", "-0.0045", "1,200", "54.30", "54", "7.000", "0.010", "1.0E-3",
    "300.0", "6.02e23", "2500.", "0.1", "90",
]  # fmt: skip

# (value, figures), kept to magnitudes where both apps write plain decimals and away from exact
# ties, where binary rounding could legitimately go either way.
FORMAT_CASES = [
    (0.5, 3), (228.64, 3), (9.996, 3), (0.0045678, 3), (3.14159, 4), (2.71828, 2),
    (0.06667, 2), (980.665, 3), (0.00123, 2), (1.0, 3), (0.4183, 2),
]  # fmt: skip


def build_sigfigs() -> dict[str, object]:
    return {
        "model": "significant figures, Python decimal and format(…, '#.ng')",
        "parse": [{"raw": raw, **parse_figure(raw)} for raw in SIGFIG_INPUTS],
        "format": [{"value": v, "n": n, "text": format_sig_figs(v, n)} for v, n in FORMAT_CASES],
    }


def write(name: str, data: dict[str, object]) -> None:
    out = FIXTURES / name
    out.parent.mkdir(exist_ok=True)
    out.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )
    print(f"wrote {out}")


if __name__ == "__main__":
    write("pendulum.json", build())
    write("fit.json", build_fit())
    write("sigfigs.json", build_sigfigs())
