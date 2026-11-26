"""The Helmholtz resonator as a lumped mass on a spring, independent of packages/physics.

The TypeScript uses the closed form f = (c / 2π) √(A / (V L′)). Here the flask is built from
its parts: the plug of air in the neck has mass m = ρ A L′ with ρ = p₀ M / (R T), the air in the
bulb is an adiabatic spring k = γ p₀ A² / V, and the damping b = √(k m) / Q. The resonance is
ω₀ = √(k / m); the driven response comes from the mechanical impedance Z = b + i(ω m − k / ω);
and the water's depth in the round bulb is found with SciPy's brentq on the spherical cap.
`steady_amplitude` integrates the equation of motion with SciPy's solve_ivp as a third check.
"""

import math
from dataclasses import dataclass

import numpy as np
from scipy.constants import R as GAS_CONSTANT
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

GAMMA = 1.4
MOLAR_MASS = 0.0289647  # kg/mol, dry air
P0 = 101325.0
END_CORRECTION = 0.85 + 0.61  # flanged inner end + unflanged mouth, in neck radii


@dataclass(frozen=True)
class Flask:
    bulb_volume: float  # m³
    neck_radius: float  # m
    neck_length: float  # m
    q: float
    end_correction: float = END_CORRECTION


@dataclass(frozen=True)
class Lumped:
    mass: float  # kg
    stiffness: float  # N/m
    damping: float  # N s/m
    area: float  # m²
    volume: float  # m³


def lumped(flask: Flask, water: float, temp_c: float, p0: float = P0) -> Lumped:
    t = temp_c + 273.15
    rho = p0 * MOLAR_MASS / (GAS_CONSTANT * t)
    area = math.pi * flask.neck_radius**2
    length = flask.neck_length + flask.end_correction * flask.neck_radius
    volume = flask.bulb_volume - water
    mass = rho * area * length
    stiffness = GAMMA * p0 * area**2 / volume
    damping = math.sqrt(stiffness * mass) / flask.q
    return Lumped(mass, stiffness, damping, area, volume)


def resonant_frequency(flask: Flask, water: float, temp_c: float) -> float:
    s = lumped(flask, water, temp_c)
    return math.sqrt(s.stiffness / s.mass) / (2 * math.pi)


def _velocity_amplitude(s: Lumped, f: float, drive: float) -> complex:
    w = 2 * math.pi * f
    z = complex(s.damping, w * s.mass - s.stiffness / w)
    return s.area * drive / z


def loudness(flask: Flask, water: float, temp_c: float, f: float) -> float:
    """The plug's velocity relative to its velocity at resonance."""
    s = lumped(flask, water, temp_c)
    f0 = resonant_frequency(flask, water, temp_c)
    return abs(_velocity_amplitude(s, f, 1.0)) / abs(_velocity_amplitude(s, f0, 1.0))


def plug(flask: Flask, water: float, temp_c: float, f: float, drive: float) -> dict[str, float]:
    """Displacement amplitude (m), bulb pressure amplitude (Pa) and lag (rad) behind the drive."""
    s = lumped(flask, water, temp_c)
    w = 2 * math.pi * f
    xi = _velocity_amplitude(s, f, drive) / complex(0, w)  # complex displacement, drive phase 0
    return {
        "displacementAmplitude": abs(xi),
        "pressureAmplitude": abs(xi) * s.stiffness / s.area,
        "lag": float(-np.angle(xi)),
    }


def water_depth(flask: Flask, water: float) -> float:
    r = (3 * flask.bulb_volume / (4 * math.pi)) ** (1 / 3)
    if water <= 0:
        return 0.0
    if water >= flask.bulb_volume:
        return 2 * r
    return brentq(
        lambda h: math.pi * h * h * (3 * r - h) / 3 - water, 0, 2 * r, xtol=1e-16, rtol=1e-15
    )


def steady_amplitude(flask: Flask, water: float, temp_c: float, f: float, drive: float) -> float:
    """Displacement amplitude by integrating m ξ'' + b ξ' + k ξ = A p cos ωt to steady state."""
    s = lumped(flask, water, temp_c)
    w = 2 * math.pi * f
    f0 = resonant_frequency(flask, water, temp_c)
    settle = 12 * flask.q / f0  # the transient decays as exp(-π f₀ t / Q)
    period = 1 / f

    def rhs(t: float, y: np.ndarray) -> list[float]:
        return [
            y[1],
            (s.area * drive * math.cos(w * t) - s.damping * y[1] - s.stiffness * y[0]) / s.mass,
        ]

    sol = solve_ivp(
        rhs,
        (0, settle + 3 * period),
        [0.0, 0.0],
        method="DOP853",
        rtol=1e-11,
        atol=1e-16,
        dense_output=True,
    )
    t = np.linspace(settle, settle + 3 * period, 6001)
    return float(np.max(np.abs(sol.sol(t)[0])))


FLASKS = {
    "500 ml round-bottom": Flask(550e-6, 0.012, 0.075, 18),
    "250 ml round-bottom": Flask(280e-6, 0.0105, 0.065, 14),
    "1 l round-bottom": Flask(1080e-6, 0.0135, 0.085, 22),
}


def build_fixture() -> dict[str, object]:
    """Read by packages/physics/test/helmholtz.test.ts."""
    cases = []
    for name, flask in FLASKS.items():
        for temp in (0.0, 20.0, 28.0, 35.0):
            for frac in (0.0, 0.1, 0.25, 0.4, 0.55, 0.7):
                water = round(frac * flask.bulb_volume * 1e6) * 1e-6
                f0 = resonant_frequency(flask, water, temp)
                cases.append(
                    {
                        "flask": name,
                        "bulbVolume": flask.bulb_volume,
                        "neckRadius": flask.neck_radius,
                        "neckLength": flask.neck_length,
                        "q": flask.q,
                        "temperatureC": temp,
                        "waterVolume": water,
                        "frequency": f0,
                        "waterDepth": water_depth(flask, water),
                        "drive": [
                            {"frequency": f, "loudness": loudness(flask, water, temp, f)}
                            | plug(flask, water, temp, f, 0.5)
                            for f in (0.5 * f0, 0.95 * f0, f0, 1.04 * f0, 2.0 * f0)
                        ],
                    }
                )
    return {
        "model": "lumped mass on an adiabatic air spring, impedance response, brentq water depth",
        "units": {
            "volume": "m^3",
            "length": "m",
            "frequency": "Hz",
            "temperature": "degC",
            "drivePressure": "Pa (0.5)",
            "pressureAmplitude": "Pa",
            "lag": "rad",
        },
        "cases": cases,
    }
