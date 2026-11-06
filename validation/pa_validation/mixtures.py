"""The method of mixtures by root-finding on the energy balance (SciPy), independent of the
closed forms in packages/physics: the final temperature is where the net heat flow is zero, and a
solid's specific heat capacity is the value that balances the heat gained and lost."""

from collections.abc import Sequence

from scipy.optimize import brentq

WATER = 4200.0


def final_temperature(bodies: Sequence[tuple[float, float, float]]) -> float:
    """bodies: (mass kg, specific heat capacity J/(kg K), temperature °C)."""

    def net_heat(theta: float) -> float:
        return sum(m * c * (theta - t) for m, c, t in bodies)

    temps = [t for _, _, t in bodies]
    return float(brentq(net_heat, min(temps), max(temps), xtol=1e-14, rtol=1e-15))


def solid_specific_heat(
    solid_mass: float,
    solid_temperature: float,
    water_mass: float,
    calorimeter_mass: float,
    calorimeter_c: float,
    initial: float,
    final: float,
    water_c: float = WATER,
) -> float:
    gained = (water_mass * water_c + calorimeter_mass * calorimeter_c) * (final - initial)

    def imbalance(c: float) -> float:
        return solid_mass * c * (solid_temperature - final) - gained

    return float(brentq(imbalance, 1e-6, 1e7, xtol=1e-12, rtol=1e-15))
