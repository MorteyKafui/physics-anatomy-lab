"""Write the fixtures in fixtures/ from the independent Python models.

pendulum.json  exact pendulum period (SciPy ellipk)        read by packages/physics
circuits.json  Ohm's law and potentiometer (NumPy MNA)    read by packages/physics
lens.json      converging lens (ray-transfer matrices)    read by packages/physics
mixtures.json  method of mixtures (SciPy brentq)          read by packages/physics
fit.json       straight-line fits (SciPy linregress)       read by packages/analysis
sigfigs.json   significant figures (Python decimal)        read by packages/analysis
student_t.json Student's t CDF and quantiles (SciPy)      read by packages/analysis
outliers.json  Bonferroni outlier test (hat matrix)       read by packages/analysis
review.json    the review's effects and the right way     read by packages/experiments
"""

import itertools
import json
import math
from pathlib import Path

from pa_validation.circuits import balance_length, ohms_law_readings
from pa_validation.fit import fit_line, fit_through_origin
from pa_validation.lens import image
from pa_validation.mixtures import final_temperature, solid_specific_heat
from pa_validation.outliers import critical_value, deleted_residuals, find_outlier
from pa_validation.pendulum import period_exact
from pa_validation.review import reading_error_percent, right_way
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


def build_circuits() -> dict[str, object]:
    """Ohm's law readings, and potentiometer balance lengths with the galvanometer in circuit."""
    ohms = []
    for emf, internal, rheostat, resistor, voltmeter in itertools.product(
        [1.5, 3.0], [0.5, 1.0], [0.0, 5.0, 20.0], [2.2, 10.0], [math.inf, 1000.0, 20000.0]
    ):
        ohms.append(
            {
                "emf": emf,
                "internalResistance": internal,
                "rheostat": rheostat,
                "resistor": resistor,
                # JSON has no infinity: null is an ideal voltmeter.
                "voltmeterResistance": None if math.isinf(voltmeter) else voltmeter,
                **ohms_law_readings(emf, internal, rheostat, resistor, voltmeter),
            }
        )

    drivers = [
        {
            "driverEmf": 2.0,
            "driverInternalResistance": 0.05,
            "seriesResistance": 0.0,
            "wireResistance": 4.0,
            "wireLength": 1.0,
        },
        {
            "driverEmf": 2.0,
            "driverInternalResistance": 0.1,
            "seriesResistance": 2.0,
            "wireResistance": 4.0,
            "wireLength": 1.0,
        },
        {
            "driverEmf": 2.2,
            "driverInternalResistance": 0.05,
            "seriesResistance": 1.0,
            "wireResistance": 3.0,
            "wireLength": 1.0,
        },
    ]
    balances = []
    for driver, emf, internal, load in itertools.product(
        drivers, [1.02, 1.08, 1.5, 1.8], [0.5, 2.0], [math.inf, 2.0, 5.0, 10.0]
    ):
        balances.append(
            {
                "driver": driver,
                "testEmf": emf,
                "testInternalResistance": internal,
                "load": None if math.isinf(load) else load,
                "galvanometerResistance": 50.0,
                "balanceLength": balance_length(driver, emf, internal, load, 50.0),
            }
        )
    return {
        "model": "DC circuits, modified nodal analysis (NumPy) and SciPy brentq",
        "units": {"emf": "V", "resistance": "ohm", "current": "A", "length": "m"},
        "ohmsLaw": ohms,
        "potentiometer": balances,
    }


def build_lens() -> dict[str, object]:
    cases = []
    for f in (10.0, 15.0, 20.0):
        for u in (5.0, 8.0, 12.0, 15.0, 20.0, 25.0, 30.0, 40.0, 60.0, 100.0):
            if u != f:
                cases.append({"objectDistance": u, "focalLength": f, **image(u, f)})
    return {
        "model": "thin converging lens, paraxial ray-transfer matrices, real-is-positive",
        "units": {"distance": "cm"},
        "cases": cases,
    }


SOLIDS = {"copper": 390.0, "aluminium": 900.0, "iron": 450.0, "brass": 380.0}


def build_mixtures() -> dict[str, object]:
    cases = []
    for (name, c), solid_mass, water_mass, cold, calorimeter_mass in itertools.product(
        SOLIDS.items(), [0.05, 0.1], [0.1, 0.2], [25.0, 30.0], [0.0, 0.05]
    ):
        bodies = [(solid_mass, c, 100.0), (water_mass, 4200.0, cold)]
        if calorimeter_mass:
            bodies.append((calorimeter_mass, 390.0, cold))
        final = final_temperature(bodies)
        cases.append(
            {
                "solid": name,
                "solidMass": solid_mass,
                "solidSpecificHeatCapacity": c,
                "solidTemperature": 100.0,
                "waterMass": water_mass,
                "calorimeterMass": calorimeter_mass,
                "calorimeterSpecificHeatCapacity": 390.0,
                "initialTemperature": cold,
                "finalTemperature": final,
                "recoveredSpecificHeatCapacity": solid_specific_heat(
                    solid_mass, 100.0, water_mass, calorimeter_mass, 390.0, cold, final
                ),
            }
        )
    return {
        "model": "method of mixtures, energy balance solved with SciPy brentq",
        "units": {"mass": "kg", "specificHeatCapacity": "J kg^-1 K^-1", "temperature": "degC"},
        "waterSpecificHeatCapacity": 4200.0,
        "cases": cases,
    }


def build_student_t() -> dict[str, object]:
    from scipy import stats

    dfs = [1, 2, 3, 4, 5, 7, 10, 20, 50]
    ps = [0.9, 0.95, 0.975, 0.99, 0.995, 0.999, 0.9999]
    ts = [-3.0, -1.0, 0.0, 0.5, 1.0, 2.0, 4.0, 10.0]
    return {
        "model": "Student's t, scipy.stats.t",
        "quantiles": [{"p": p, "df": df, "t": float(stats.t.ppf(p, df))} for df in dfs for p in ps],
        "cdf": [{"t": t, "df": df, "p": float(stats.t.cdf(t, df))} for df in dfs for t in ts],
    }


OUTLIER_DATASETS: list[dict[str, object]] = [
    {
        "name": "pendulum: T² against l, clean (the table mockup)",
        "x": [1.0, 0.9, 0.8, 0.7, 0.6],
        "y": [(t / 20) ** 2 for t in (40.1, 38.1, 35.9, 33.5, 31.1)],
    },
    {
        "name": "8 readings, one 3 units off",
        "x": [1, 2, 3, 4, 5, 6, 7, 8],
        "y": [2 * x + (3 if x == 5 else 0.05 * (x % 2)) for x in range(1, 9)],
    },
    {
        "name": "Ohm's law, one reading 10× (a unit slip)",
        "x": [0.10, 0.20, 0.30, 0.40, 0.50, 0.60],
        "y": [0.52, 1.01, 14.9, 2.03, 2.48, 3.02],
    },
    {
        "name": "Ohm's law, clean",
        "x": [0.10, 0.20, 0.30, 0.40, 0.50, 0.60],
        "y": [0.52, 1.01, 1.49, 2.03, 2.48, 3.02],
    },
    {
        "name": "cooling, one misread",
        "x": [0, 60, 120, 180, 240, 300, 360],
        "y": [80.0, 76.9, 74.1, 61.0, 68.2, 65.1, 62.3],
    },
    {
        "name": "10 readings, mild scatter, no outlier",
        "x": list(range(1, 11)),
        "y": [1.02, 1.98, 3.05, 3.97, 5.01, 6.04, 6.95, 8.02, 8.99, 10.03],
    },
]


def build_outliers() -> dict[str, object]:
    cases = []
    for data in OUTLIER_DATASETS:
        xs = [float(v) for v in data["x"]]  # type: ignore[union-attr]
        ys = [float(v) for v in data["y"]]  # type: ignore[union-attr]
        cases.append(
            {
                "name": data["name"],
                "x": xs,
                "y": ys,
                "deletedResiduals": deleted_residuals(xs, ys),
                "critical": critical_value(len(xs)),
                "outlier": find_outlier(xs, ys),
            }
        )
    return {
        "model": "Bonferroni outlier test, hat matrix and scipy.stats.t",
        "alpha": 0.05,
        "cases": cases,
    }


def build_review() -> dict[str, object]:
    """The bench swings through 8°; lengths are the ones a run might time."""
    amplitude = math.radians(8)
    errors = [
        {
            "count": count,
            "countedFromOne": from_one,
            "percent": reading_error_percent(count, from_one),
        }
        for count in [10, 15, 19, 20]
        for from_one in [False, True]
    ]
    runs = []
    for g in GRAVITY:
        for lengths in [[0.8], [0.8, 0.85], [0.6, 0.7, 0.8, 0.9, 1.0]]:
            runs.append({"roomG": g, "lengths": lengths, **right_way(g, amplitude, lengths)})
    return {
        "model": "review: timing errors and the right way (SciPy ellipk and linregress)",
        "amplitudeDeg": 8,
        "errors": errors,
        "runs": runs,
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
    write("circuits.json", build_circuits())
    write("lens.json", build_lens())
    write("mixtures.json", build_mixtures())
    write("student_t.json", build_student_t())
    write("outliers.json", build_outliers())
    write("review.json", build_review())
