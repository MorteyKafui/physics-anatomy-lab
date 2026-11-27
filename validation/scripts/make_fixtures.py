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
diffraction.json  N-slit far field (SciPy quad over openings)  read by packages/physics
resonance-tube.json  resonance tube (shooting the wave equation)  read by packages/physics
sonometer.json  vibrating string (SciPy eigenvalues, brentq)  read by packages/physics
"""

import itertools
import json
import math
from pathlib import Path

import numpy as np

from pa_validation import sonometer as sono
from pa_validation.calorimetry import Setup, air_cooled, peak, states
from pa_validation.circuits import (
    balance_length,
    ohms_law_readings,
    random_network,
    terminal_pd_readings,
)
from pa_validation.diffraction import intensity, which_slit
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
from pa_validation.pendulum import period_exact, period_small_angle
from pa_validation.resonance_tube import air_at, resonance_lengths, speed_of_sound
from pa_validation.resonance_tube import loudness as tube_loudness
from pa_validation.review import reading_error_percent, right_way
from pa_validation.sigfigs import format_sig_figs, parse_figure
from pa_validation.uncertainty import intercept_sum, quoted, worst_case, worst_lines

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

LENGTHS = [0.25, 0.5, 0.8, 1.0, 2.0]
# The lab's g and 9.81; standard gravity and the what-if places (packages/physics gravity.ts).
GRAVITY = [9.78, 9.81, 1.62, 9.80665, 3.71, 24.79]
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


# The AI evaluation suite (docs/content/ai-evals-brief.md, decision 3): every pendulum bench a
# case may name, with what the physics says about it. The grader is told these values; no case
# file holds one. The places' g are the stated facts in packages/physics gravity.ts.
AI_EVAL_PLACES = {"earth": 9.80665, "moon": 1.62, "mars": 3.71, "jupiter": 24.79}
AI_EVAL_LENGTHS = [round(0.40 + 0.05 * i, 2) for i in range(13)]  # 0.40 m to 1.00 m, the lab's
AI_EVAL_AMPLITUDE_DEG = 5  # the lab's amplitude, below 10°


def build_ai_evals() -> dict[str, object]:
    benches = [
        {
            "length": length,
            "place": place,
            "g": g,
            "period_small_angle": period_small_angle(length, g),
            "period": period_exact(length, g, math.radians(AI_EVAL_AMPLITUDE_DEG)),
        }
        for place, g in AI_EVAL_PLACES.items()
        for length in AI_EVAL_LENGTHS
    ]
    return {
        "model": "simple pendulum, exact period at the lab's amplitude, SciPy ellipk",
        "units": {"length": "m", "g": "m s^-2", "period": "s"},
        "amplitude_deg": AI_EVAL_AMPLITUDE_DEG,
        "benches": benches,
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


def build_diffraction() -> dict[str, object]:
    """The landing page's four hero scenes (docs/content/landing-page-brief.md, decision 1) and
    three more geometries, from sin θ = -0.2 to 0.2 in steps of 0.005."""
    nm, um = 1e-9, 1e-6
    geometries = [
        {"name": "two slits (hero)", "count": 2, "width": 2 * um, "spacing": 11.25 * um},
        {"name": "one slit (hero)", "count": 1, "width": 6.5 * um, "spacing": 6.5 * um},
        {"name": "four slits (hero)", "count": 4, "width": 2 * um, "spacing": 5.625 * um},
        {"name": "three slits", "count": 3, "width": 1 * um, "spacing": 4 * um},
        {"name": "six close slits", "count": 6, "width": 3 * um, "spacing": 3.5 * um},
        {"name": "touching slits", "count": 2, "width": 2 * um, "spacing": 2 * um},
    ]
    points = [round(-0.2 + 0.005 * i, 3) for i in range(81)]
    cases = []
    for g in geometries:
        args = (g["count"], g["width"], g["spacing"], 500 * nm)
        cases.append(
            {
                **g,
                "wavelength": 500 * nm,
                "points": [
                    {
                        "sinTheta": s,
                        "intensity": intensity(*args, s),
                        "whichSlit": which_slit(*args, s),
                    }
                    for s in points
                ],
            }
        )
    return {
        "model": "Fraunhofer N-slit, SciPy quad over each opening, phasors added (or intensities)",
        "cases": cases,
    }


def build_resonance_tube() -> dict[str, object]:
    """The school forks in a 1 m tube at four room temperatures and two bores; the loudness near
    and between resonances; and the air along the column at the first two resonances."""
    forks = [256, 288, 320, 341.3, 384, 426.7, 480, 512]
    temperatures = [0.0, 20.0, 28.0, 35.0]
    speed = [{"temperatureC": t, "speed": speed_of_sound(t)} for t in [-10.0, *temperatures, 50.0]]
    resonances = [
        {
            "length": 1.0,
            "radius": r,
            "temperatureC": t,
            "frequency": f,
            "lengths": resonance_lengths(1.0, r, t, f),
        }
        for t in (20.0, 30.0)
        for r in (0.0175, 0.0225)
        for f in forks
    ]
    loud = []
    for q in (25.0, 30.0, 35.0):
        for f in (256, 384, 512):
            for i in range(25):
                air = round(0.05 + 0.0375 * i, 4)
                loud.append(
                    {
                        "radius": 0.02,
                        "temperatureC": 28.0,
                        "q": q,
                        "frequency": f,
                        "airColumn": air,
                        "loudness": tube_loudness(0.02, 28.0, q, air, f),
                    }
                )
    standing = []
    for f, n in ((512, 1), (512, 2), (320, 1), (320, 2)):
        air = resonance_lengths(1.0, 0.02, 20.0, f)[n - 1]
        depths = [-0.012 + (air + 0.012) * j / 20 for j in range(21)]
        points = []
        for d in depths:
            disp, pres = air_at(0.02, 20.0, air, f, d)
            points.append({"depth": d, "displacement": disp, "pressure": pres})
        standing.append(
            {
                "radius": 0.02,
                "temperatureC": 20.0,
                "frequency": f,
                "airColumn": air,
                "points": points,
            }
        )
    return {
        "model": "adiabatic ideal gas; p'' = -k^2 p shot with DOP853 and brentq; 2x2 driven modes",
        "speed": speed,
        "resonances": resonances,
        "loudness": loud,
        "standingWave": standing,
    }


def build_sonometer() -> dict[str, object]:
    """Steel wires of 28 to 32 SWG on a school sonometer: loads of 0.5 to 4 kg over a pulley that
    loses 0.5 % of the load, vibrating lengths of 0.15 to 0.9 m, harmonics 1 to 4. Mode
    frequencies come from the string's eigenvalues, not from n v / 2l."""
    loss = 0.005
    wires = [
        {
            "swg": swg,
            "diameter": inches * sono.INCH,
            "density": sono.STEEL_DENSITY,
            "mu": sono.linear_density(inches * sono.INCH, sono.STEEL_DENSITY),
        }
        for swg, inches in sono.SWG_INCHES.items()
    ]
    setups = []
    for wire in wires[::2]:
        for load in (0.5, 1.0, 2.5, 4.0):
            for length in (0.15, 0.4, 0.9):
                t = sono.tension(load, sono.STANDARD_GRAVITY, loss)
                v = sono.wave_speed(t, wire["mu"])
                freqs = sono.string_eigenfrequencies(length, t, wire["mu"], 4)
                setups.append(
                    {
                        "swg": wire["swg"],
                        "mu": wire["mu"],
                        "load": load,
                        "g": sono.STANDARD_GRAVITY,
                        "pulleyLoss": loss,
                        "length": length,
                        "tension": t,
                        "speed": v,
                        "harmonics": [
                            {"n": n, "frequency": f, "wavelength": 2 * length / n}
                            for n, f in enumerate(freqs, start=1)
                        ],
                    }
                )
    responses = [
        {
            "drive": drive,
            "natural": 256.0,
            "q": q,
            "response": sono.driven_response(drive, 256.0, q),
            "phase": sono.driven_phase(drive, 256.0, q),
        }
        for q in (20.0, 170.0)
        for drive in (64.0, 200.0, 250.0, 255.0, 256.0, 257.0, 262.0, 320.0, 1024.0)
    ]
    # One driven wire: 30 SWG, 2.5 kg, 0.4 m, Q = 170, driven near its fundamental and second.
    v = sono.wave_speed(sono.tension(2.5, sono.STANDARD_GRAVITY, loss), wires[2]["mu"])
    driven = []
    for frequency in (sono.harmonic_frequency(1, 0.4, v) * 1.002, 400.0, 2 * v / 0.8):
        for x in (0.05, 0.1, 0.2, 0.31):
            for t in (0.0, 0.00073, 0.0021):
                driven.append(
                    {
                        "length": 0.4,
                        "speed": v,
                        "frequency": frequency,
                        "q": 170.0,
                        "x": x,
                        "t": t,
                        "drive": 1e-5,
                        "displacement": sono.driven_displacement(
                            0.4, v, frequency, 170.0, x, t, 1e-5
                        ),
                    }
                )
    modes = [
        {
            "n": n,
            "x": x,
            "t": t,
            "length": 0.6,
            "speed": 200.0,
            "amplitude": 0.002,
            "displacement": sono.mode_displacement(n, x, t, 0.6, 200.0, 0.002),
        }
        for n in (1, 2, 3)
        for x in (0.07, 0.15, 0.3, 0.52)
        for t in (0.0, 0.0004, 0.00125)
    ]
    riders = [
        {
            "length": length,
            "speed": v,
            "frequency": 256.0,
            "q": 170.0,
            "riderAt": s,
            "strength": a,
            "excitation": sono.rider_excitation(length, v, 256.0, 170.0, s, a),
        }
        for length in (v / 512 * 0.99, v / 512, v / 512 * 1.004, v / 256)
        for s in (0.5, 0.25, 0.1)
        for a in (1.0, 0.6)
    ]
    bands = []
    for frequency in (256.0, 384.0, 512.0):
        for q in (140.0, 200.0):
            for a in (1.0, 0.7, 0.4):
                for n in (1, 2):
                    band = sono.resonance_band(frequency, v, q, a, n)
                    bands.append(
                        {
                            "frequency": frequency,
                            "speed": v,
                            "q": q,
                            "strength": a,
                            "n": n,
                            "band": list(band) if band else None,
                        }
                    )
    return {
        "model": "sonometer: string eigenvalues (SciPy), complex driven response, brentq bands",
        "units": {
            "diameter": "m",
            "density": "kg m^-3",
            "mu": "kg m^-1",
            "load": "kg",
            "length": "m",
            "tension": "N",
            "speed": "m s^-1",
            "frequency": "Hz",
            "phase": "rad",
        },
        "wires": wires,
        "setups": setups,
        "responses": responses,
        "driven": driven,
        "modes": modes,
        "riders": riders,
        "bands": bands,
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
    write("ai-evals.json", build_ai_evals())
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
    write("diffraction.json", build_diffraction())
    write("resonance-tube.json", build_resonance_tube())
    write("sonometer.json", build_sonometer())
