"""Write fixtures/pendulum.json from the independent SciPy model."""

import json
import math
from pathlib import Path

from pa_validation.pendulum import period_exact

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


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "fixtures" / "pendulum.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(build(), indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {out}")
