"""Write the fixtures in fixtures/ from the independent Python models.

pendulum.json  exact pendulum period (SciPy ellipk)        read by packages/physics
circuits.json  Ohm's law and potentiometer (NumPy MNA)    read by packages/physics
lens.json      converging lens (ray-transfer matrices)    read by packages/physics
mixtures.json  method of mixtures (SciPy brentq)          read by packages/physics
calorimetry.json  the lumped heat model (SciPy DOP853)    read by packages/physics
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

import numpy as np

from pa_validation.calorimetry import Setup, air_cooled, peak, states
from pa_validation.circuits import (
    balance_length,
    ohms_law_readings,
    random_network,
    terminal_pd_readings,
)
from pa_validation.fit import fit_line, fit_through_origin
from pa_validation.lens import image
from pa_validation.lens_exact import (
    axis_crossing,
    best_focus,
    defocus_blur,
    lens_for_focal_length,
    paraxial_image,
)
from pa_validation.lens_parallax import ARCMIN, View, no_parallax, separation
from pa_validation.mixtures import final_temperature, solid_specific_heat
from pa_validation.model_check import model_check, x_intercept
from pa_validation.outliers import critical_value, deleted_residuals, find_outlier
from pa_validation.pendulum import period_exact
from pa_validation.review import reading_error_percent, right_way
from pa_validation.sigfigs import format_sig_figs, parse_figure
from pa_validation.uncertainty import intercept_sum, quoted, worst_case, worst_lines

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
    terminal = []
    for emf, internal, resistor, wire, (ammeter, voltmeter), jockey, key in itertools.product(
        [1.5, 3.0],
        [0.5, 1.5],
        [1.0, 2.0],
        [2.0, 4.0],
        [(0.0, math.inf), (0.05, 5000.0), (0.2, 1000.0)],
        [None, 0.0, 0.4, 0.6, 0.8, 1.0],
        [True, False],
    ):
        terminal.append(
            {
                "emf": emf,
                "internalResistance": internal,
                "resistor": resistor,
                "wireResistance": wire,
                "wireLength": 1.0,
                "ammeterResistance": ammeter,
                # JSON has no infinity: null is an ideal voltmeter.
                "voltmeterResistance": None if math.isinf(voltmeter) else voltmeter,
                "jockey": jockey,
                "keyClosed": key,
                **terminal_pd_readings(
                    emf, internal, resistor, wire, 1.0, ammeter, voltmeter, jockey, key
                ),
            }
        )
    rng = np.random.default_rng(2026)
    networks = [random_network(rng) for _ in range(60)]
    return {
        "model": "DC circuits, modified nodal analysis (NumPy) and SciPy brentq",
        "units": {"emf": "V", "resistance": "ohm", "current": "A", "length": "m"},
        "ohmsLaw": ohms,
        "potentiometer": balances,
        "terminalPd": terminal,
        "networks": networks,
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


def build_lens_exact() -> dict[str, object]:
    """The approved school lens (docs/content/converging-lens-brief.md): f = 15.0 cm, n = 1.52,
    4.0 cm across, traced exactly, and the thin lens's blur on the screen."""
    lens = lens_for_focal_length(15.0, 1.52, 4.0)
    positions = [20.0, 25.0, 30.0, 35.0, 40.0, 60.0]
    return {
        "model": "biconvex spherical lens, 3-D vector Snell's law; best focus by least RMS spread",
        "units": {"distance": "cm"},
        "lens": {
            "focalLength": 15.0,
            "index": 1.52,
            "aperture": 4.0,
            "edge": 0.1,
            "radius": lens.radius,
            "thickness": lens.thickness,
        },
        "rays": [
            {"objectDistance": u, "height": h, "crossing": axis_crossing(lens, u, h)}
            for u in positions
            for h in (0.25, 0.5, 1.0, 1.5, 1.9)
        ],
        "images": [
            {
                "objectDistance": u,
                "paraxial": paraxial_image(lens, u),
                "bestFocus": best_focus(lens, u),
            }
            for u in positions
        ],
        "blur": [
            {
                "objectDistance": u,
                "focalLength": 15.0,
                "screenDistance": s,
                "aperture": 4.0,
                "diameter": defocus_blur(u, 15.0, s, 4.0),
            }
            for u in (10.0, 20.0, 30.0, 40.0)
            for s in (20.0, 24.0, 30.0, 45.0, 60.0, 80.0)
        ],
    }


def build_lens_parallax() -> dict[str, object]:
    """No parallax with two optical pins (Experiment 96, brief decisions 8 to 11): the approved
    lens, the eye 25 cm behind the image, 1 minute of arc, and the head moving 0.5 cm either side
    of the axis, as far as the lens allows, and 0.5 cm either side of a place 1.0 cm off it."""
    lens = lens_for_focal_length(15.0, 1.52, 4.0)
    xs = [20.0, 30.0, 40.0, 50.0]
    views = {
        "approved": View(25.0, 0.5, ARCMIN),
        "fullHead": View(25.0, math.inf, ARCMIN),
        "offAxis": View(25.0, 0.5, ARCMIN, centre=1.0),
    }
    angles = []
    for u in xs:
        v = paraxial_image(lens, u)
        eye = v + 25.0
        for pin in (0.98 * v, v, 1.02 * v):
            for h in (0.1, 0.3, 0.5, -0.3):
                angles.append(
                    {
                        "objectDistance": u,
                        "pin": pin,
                        "eye": eye,
                        "head": h,
                        "angle": separation(lens, u, pin, eye, h),
                    }
                )
    places = []
    for name, view in views.items():
        for u in xs:
            r = no_parallax(lens, u, view)
            places.append(
                {
                    "view": name,
                    "objectDistance": u,
                    "eyeBehind": view.eye_behind,
                    "head": view.head if math.isfinite(view.head) else None,
                    "centre": view.centre,
                    "acuity": view.acuity,
                    **{k: r[k] for k in ("at", "residual", "from", "to")},
                    "reach": r["head"],
                }
            )
    return {
        "model": "biconvex spherical lens, 3-D vector Snell's law; the ray to the eye by Brent's "
        "method, the head's travel at 401 places, SciPy's bounded minimiser",
        "units": {"distance": "cm", "angle": "rad"},
        "lens": {"focalLength": 15.0, "index": 1.52, "aperture": 4.0, "edge": 0.1},
        "angles": angles,
        "places": places,
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


def build_calorimetry() -> dict[str, object]:
    """The method of mixtures with heat lost, mixing and a lagging thermometer (Experiment 62,
    brief decisions 1 to 5): 50 g of water at 65 °C into V g of water in a 50 g copper
    calorimeter at 28 °C, lagged and covered (1% a minute), stirred (5 s), and a thermometer
    lagging 8 s; then not stirred (2 minutes), not covered (8% a minute), tap water cooler than
    the room, a thermometer with no lag, no loss at all, and the lag equal to the difference's
    decay time, where the closed form changes."""
    water, copper = 4200.0, 390.0
    k = 0.01 / 60
    times = [0.0, 1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0, 600.0]

    def case(name, v, *, room=28.0, tap=28.0, loss=k, mixing=5.0, lag=8.0):
        hot = {"mass": 0.050, "specificHeatCapacity": water, "temperature": 65.0}
        cold = [
            {"mass": v / 1000, "specificHeatCapacity": water, "temperature": tap},
            {"mass": 0.050, "specificHeatCapacity": copper, "temperature": tap},
        ]
        s = Setup(
            0.050 * water, 65.0, v / 1000 * water + 0.050 * copper, tap, room, loss, mixing, lag
        )
        return {
            "name": name,
            "hot": hot,
            "cold": cold,
            "room": room,
            "loss": loss,
            "mixing": mixing,
            "lag": lag,
            "times": times,
            "states": states(s, times),
            "peak": peak(s),
        }

    cases = [case("approved", v) for v in (40, 50, 60, 70, 80)]
    cases += [case("not stirred", v, mixing=120.0) for v in (40, 70)]
    cases += [case("not covered", v, loss=8 * k) for v in (40, 70)]
    cases += [
        case("tap cooler than the room", 50, room=30.0, tap=26.0),
        case("no lag", 50, lag=0.0),
        case("no loss", 50, loss=0.0),
        case("lag equal to the mixing decay", 50, lag=1 / (k + 1 / 5.0)),
    ]
    # Experiment 64 (decisions 6 to 10): a 100 g solid from boiling water into 50 g of water in the
    # same calorimeter, sharing its heat in 10 s stirred; carried through the air at 5% a minute.
    air = 0.05 / 60

    def solid(name, metal, c, *, transfer=0.0, film=0.0, water_g=50.0, loss=k, mixing=10.0):
        hot_t = air_cooled(100.0, 28.0, air, transfer)
        hot = [{"mass": 0.100, "specificHeatCapacity": c, "temperature": hot_t}]
        if film:
            hot.append({"mass": film / 1000, "specificHeatCapacity": water, "temperature": hot_t})
        cold = [
            {"mass": water_g / 1000, "specificHeatCapacity": water, "temperature": 28.0},
            {"mass": 0.050, "specificHeatCapacity": copper, "temperature": 28.0},
        ]
        s = Setup(
            0.100 * c + film / 1000 * water,
            hot_t,
            water_g / 1000 * water + 0.050 * copper,
            28.0,
            28.0,
            loss,
            mixing,
            8.0,
        )
        return {
            "name": name,
            "metal": metal,
            "transfer": transfer,
            "airLoss": air,
            "hot": hot,
            "cold": cold,
            "room": 28.0,
            "loss": loss,
            "mixing": mixing,
            "lag": 8.0,
            "times": times,
            "states": states(s, times),
            "peak": peak(s),
        }

    metals = {"copper": 390.0, "brass": 380.0, "iron": 450.0, "aluminium": 900.0}
    cases += [solid("solid", m, c) for m, c in metals.items()]
    cases += [
        solid("solid, slow transfer", "copper", 390.0, transfer=30.0),
        solid("solid, boiling water carried in", "copper", 390.0, film=1.0),
        solid("solid, water splashed out", "copper", 390.0, water_g=47.0),
        solid("solid, not stirred", "copper", 390.0, mixing=120.0),
        solid("solid, lid off", "copper", 390.0, loss=8 * k),
    ]
    return {"cases": cases}


def build_model_check() -> dict[str, object]:
    """The model check's verdict on synthetic readings: a line like T² against l, and a curve."""
    xs = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    k = 4.024
    line = [k * x for x in xs]
    careful = 0.012

    def noisy(
        seed: int, base: list[float], sd: float, offset: float = 0.0, scale: float = 1.0
    ) -> list[float]:
        rng = np.random.default_rng(seed)
        return [round(scale * b + offset + float(rng.normal(0, sd)), 4) for b in base]

    ts = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
    cooling = [28.0 + 12.0 * (1 - math.exp(-t / 0.4)) * math.exp(-t / 60) for t in ts]
    cases = []

    def case(
        name: str,
        x: list[float],
        y: list[float],
        model: list[float],
        careful: float,
        slope: float | None = None,
        curve: bool = False,
    ) -> None:
        entry: dict[str, object] = {
            "name": name,
            "x": x,
            "y": y,
            "model": model,
            "careful": careful,
            "curve": curve,
        }
        if slope is not None:
            entry["modelSlope"] = slope
        entry["check"] = model_check(x, y, model, careful, slope, curve)
        cases.append(entry)

    case("careful", xs, noisy(1, line, careful), line, careful, k)
    case("shifted by an end correction", xs, noisy(1, line, careful, offset=0.04), line, careful, k)
    case("tilted by a miscount", xs, noisy(1, line, careful, scale=1.05), line, careful, k)
    case("scattered by poor timing", xs, noisy(1, line, 0.06), line, careful, k)
    case(
        "smoother than care allows, a small shift",
        xs,
        noisy(1, line, 0.002, offset=0.006),
        line,
        careful,
        k,
    )
    case("no model slope", xs, noisy(1, line, careful, scale=1.05), line, careful)
    case("a curve, careful", ts, noisy(1, cooling, 0.05), cooling, 0.05, curve=True)
    case(
        "a curve, shifted down", ts, noisy(1, cooling, 0.05, offset=-0.6), cooling, 0.05, curve=True
    )
    case("a curve, scattered", ts, noisy(1, cooling, 0.3), cooling, 0.05, curve=True)
    case("too few points", xs[:2], line[:2], line[:2], careful, k)
    intercepts = [
        {"name": name, "x": x, "y": y, "xIntercept": x_intercept(x, y)}
        for name, x, y in [
            (
                "Ohm's law: I against V",
                [2.30, 2.10, 2.00, 1.90, 1.80, 1.70],
                [0.46, 0.60, 0.66, 0.72, 0.78, 0.86],
            ),
            ("a line far from its x intercept", [1.0, 2.0, 3.0, 4.0], [10.2, 11.9, 14.1, 15.8]),
            ("a falling line", [0.1, 0.2, 0.3, 0.4, 0.5], [4.9, 4.1, 2.95, 2.1, 1.0]),
        ]
    ]
    return {
        "model": "NumPy least squares, decision 5 as amended",
        "factor": 2,
        "cases": cases,
        "xIntercepts": intercepts,
    }


def build_uncertainty() -> dict[str, object]:
    """Worst-case propagation through the labs' own formulas, written both ways."""
    cases = [
        ("T from t", "t / 20", "t / 20", {"t": 31.08}, {"t": 0.05}),
        ("T squared", "T²", "T**2", {"T": 1.554}, {"T": 0.0025}),
        (
            "g from l and T",
            "4π²l / T²",
            "4*pi**2*l/T**2",
            {"l": 0.8, "T": 1.794},
            {"l": 0.0005, "T": 0.00125},
        ),
        ("a rise", "θ₂ − θ₁", "b - a", {"a": 28.0, "b": 45.5}, {"a": 0.05, "b": 0.05}),
        ("a reciprocal", "1 / u", "1/u", {"u": 30.0}, {"u": 0.05}),
        ("a product", "x * y", "x*y", {"x": 30.0, "y": 30.2}, {"x": 0.05, "y": 0.2}),
        ("a square root", "sqrt(l)", "sqrt(l)", {"l": 0.8}, {"l": 0.0005}),
        ("a logarithm", "ln(V)", "log(V)", {"V": 2.3}, {"V": 0.025}),
        (
            "the hot solid's c by the book's equation",
            "(e*k + (f - e)*w)*(h - a)/(s*(b - h))",
            "(e*k + (f - e)*w)*(h - a)/(s*(b - h))",
            {
                "s": 100.0,
                "e": 50.0,
                "f": 100.0,
                "a": 28.0,
                "h": 38.3,
                "b": 100.0,
                "k": 390.0,
                "w": 4200.0,
            },
            {"s": 0.1, "e": 0.1, "f": 0.1, "a": 0.05, "h": 0.05},
        ),
    ]
    out = []
    for name, ts, py, values, us in cases:
        # θ₂ − θ₁ in the labs' syntax; SymPy gets plain names for the same symbols.
        ts_values = {"θ₁": values["a"], "θ₂": values["b"]} if name == "a rise" else values
        ts_us = {"θ₁": us["a"], "θ₂": us["b"]} if name == "a rise" else us
        out.append(
            {
                "name": name,
                "formula": ts,
                "values": ts_values,
                "uncertainties": ts_us,
                **worst_case(py, values, us),
            }
        )
    quotes = [{"u": u, **quoted(u)} for u in (0.082, 0.0138, 1.6, 0.25, 0.0049, 12.0)]
    lines = [
        {"name": name, "x": x, "y": y, "dx": dx, "dy": dy, **worst_lines(x, y, dx, dy)}
        for name, x, y, dx, dy in [
            (
                "rising",
                [0.6, 0.7, 0.8, 0.9, 1.0],
                [2.415, 2.835, 3.218, 3.640, 4.032],
                [0.0005] * 5,
                [0.0078, 0.0025, 0.0045, 0.0153, 0.0040],
            ),
            (
                "falling",
                [1.65, 1.8, 1.9, 2.0, 2.1, 2.3],
                [0.89, 0.8, 0.72, 0.66, 0.6, 0.46],
                [0.025] * 6,
                [0.01] * 6,
            ),
        ]
    ]
    sums = [
        {"name": name, "x": x, "y": y, "sum": intercept_sum(x, y)}
        for name, x, y in [
            (
                "the lens, 1/v against 1/u",
                [0.05, 0.04, 0.0333, 0.0286, 0.025],
                [0.0174, 0.0273, 0.0339, 0.0387, 0.0424],
            ),
            ("a steep falling line", [1.0, 2.0, 3.0, 4.0], [10.1, 7.9, 6.2, 3.8]),
        ]
    ]
    return {
        "model": "SymPy partial derivatives, worst case",
        "cases": out,
        "quotes": quotes,
        "lines": lines,
        "interceptSums": sums,
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
    write("lens-exact.json", build_lens_exact())
    write("lens-parallax.json", build_lens_parallax())
    write("mixtures.json", build_mixtures())
    write("calorimetry.json", build_calorimetry())
    write("student_t.json", build_student_t())
    write("outliers.json", build_outliers())
    write("review.json", build_review())
    write("model-check.json", build_model_check())
    write("uncertainty.json", build_uncertainty())
