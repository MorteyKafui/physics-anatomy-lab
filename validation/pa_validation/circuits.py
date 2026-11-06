"""DC circuits by modified nodal analysis (NumPy), written independently of packages/physics.

The TypeScript uses closed-form results (V = IR, k = I R_wire / L, l = E / k). This module solves
Kirchhoff's laws for the whole network instead, including the galvanometer and the test cell's
internal resistance, and finds the balance point by root-finding.
"""

import math
from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import brentq


@dataclass
class Network:
    """Nodes are integers; node 0 is ground."""

    resistors: list[tuple[int, int, float]] = field(default_factory=list)
    sources: list[tuple[int, int, float]] = field(default_factory=list)  # (minus, plus, emf)

    def resistor(self, a: int, b: int, ohms: float) -> None:
        if math.isinf(ohms):
            return
        if ohms == 0:
            self.sources.append((a, b, 0.0))  # a short circuit is a 0 V source
        else:
            self.resistors.append((a, b, ohms))

    def source(self, minus: int, plus: int, emf: float) -> None:
        self.sources.append((minus, plus, emf))

    def solve(self) -> tuple[np.ndarray, np.ndarray]:
        """Node potentials (index = node) and the current through each source, minus to plus."""
        nodes = 1 + max(
            [max(a, b) for a, b, _ in self.resistors] + [max(a, b) for a, b, _ in self.sources]
        )
        n, m = nodes - 1, len(self.sources)
        a = np.zeros((n + m, n + m))
        z = np.zeros(n + m)
        for p, q, r in self.resistors:
            g = 1 / r
            for i, j in ((p, q), (q, p)):
                if i:
                    a[i - 1, i - 1] += g
                    if j:
                        a[i - 1, j - 1] -= g
        for k, (minus, plus, emf) in enumerate(self.sources):
            row = n + k
            if plus:
                a[plus - 1, row] += 1
                a[row, plus - 1] += 1
            if minus:
                a[minus - 1, row] -= 1
                a[row, minus - 1] -= 1
            z[row] = emf
        x = np.linalg.solve(a, z)
        return np.concatenate(([0.0], x[:n])), x[n:]


def ohms_law_readings(
    emf: float, internal: float, rheostat: float, resistor: float, voltmeter: float = math.inf
) -> dict[str, float]:
    # 0 cell −, 1 ideal cell +, 2 terminal, 3 top of the resistor (ammeter is a wire).
    net = Network()
    net.source(0, 1, emf)
    net.resistor(1, 2, internal)
    net.resistor(2, 3, rheostat)
    net.resistor(3, 0, resistor)
    net.resistor(3, 0, voltmeter)
    v, i = net.solve()
    # The source current is drawn out of its plus node, so it is negative in MNA's sign convention.
    return {"current": float(-i[0]), "voltage": float(v[3])}


def _galvanometer_current(
    x: float,
    driver: dict[str, float],
    test_emf: float,
    test_internal: float,
    load: float,
    galvanometer: float,
) -> float:
    """Current through the galvanometer with the jockey a fraction x along the wire from end A."""
    w = driver["wireResistance"]
    net = Network()
    # Driver: 0 is end B of the wire, 1 the ideal driver +, 2 its terminal, 3 end A, 4 the jockey.
    net.source(0, 1, driver["driverEmf"])
    net.resistor(1, 2, driver["driverInternalResistance"])
    net.resistor(2, 3, driver["seriesResistance"])
    net.resistor(3, 4, w * x)
    net.resistor(4, 0, w * (1 - x))
    # Test cell, + to end A: 5 is its negative terminal, 6 its ideal +.
    # The galvanometer joins 5 to the jockey.
    net.source(5, 6, test_emf)
    net.resistor(6, 3, test_internal)
    net.resistor(3, 5, load)
    net.resistor(5, 4, galvanometer)
    v, _ = net.solve()
    return float((v[5] - v[4]) / galvanometer)


def balance_length(
    driver: dict[str, float],
    test_emf: float,
    test_internal: float = 1.0,
    load: float = math.inf,
    galvanometer: float = 50.0,
) -> float | None:
    """Length from end A where the galvanometer reads zero, or None if no point on the wire does."""
    args = (driver, test_emf, test_internal, load, galvanometer)
    lo, hi = _galvanometer_current(1e-9, *args), _galvanometer_current(1 - 1e-9, *args)
    if lo * hi > 0:
        return None
    x = brentq(_galvanometer_current, 1e-9, 1 - 1e-9, args=args, xtol=1e-15, rtol=1e-15)
    return float(x) * driver["wireLength"]
