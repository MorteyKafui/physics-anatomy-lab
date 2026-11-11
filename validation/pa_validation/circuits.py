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


def _clean(x: float) -> float:
    """Round values that are zero but for rounding (|x| < 1e-12) to exactly 0.0.

    Solved on different machines, such values come out as different tiny numbers (one BLAS gives
    -4e-15 where another gives 0), and the committed fixtures must rebuild the same everywhere.
    """
    return 0.0 if abs(x) < 1e-12 else x


def terminal_pd_readings(
    emf: float,
    internal: float,
    resistor: float,
    wire: float,
    length: float,
    ammeter: float,
    voltmeter: float,
    jockey: float | None,
    key_closed: bool,
) -> dict[str, float]:
    """WASSCE's potentiometer, ammeter and voltmeter practical, by MNA.

    Cell (+) → R → ammeter → Q; the wire QP is split at the jockey J; a lead joins J to P when the
    jockey touches; the key joins P to the cell (−); the voltmeter is across the cell.
    """
    # 0 cell −, 1 ideal emf +, 2 cell +, 3 between R and the ammeter, 4 Q, 5 J, 6 P.
    x = 0.0 if jockey is None else jockey
    per_metre = wire / length
    net = Network()
    net.source(0, 1, emf)
    net.resistor(1, 2, internal)
    net.resistor(2, 3, resistor)
    ammeter_source = len(net.sources)  # used only when the ammeter is ideal (0 Ω)
    net.resistor(3, 4, ammeter)
    net.resistor(4, 5, per_metre * (length - x))
    net.resistor(5, 6, per_metre * x)
    # The jockey's lead joins J to P; at PJ = 0 they are already joined by a wire of no length,
    # and MNA cannot hold two 0 V sources side by side, so the lead is the same circuit left out.
    if jockey is not None and x > 0:
        net.resistor(5, 6, 0.0)
    net.resistor(6, 0, 0.0 if key_closed else math.inf)
    net.resistor(2, 0, voltmeter)
    v, i = net.solve()
    # An ideal ammeter is a 0 V source from node 3 (−) to 4 (+); its current from 3 to 4 is the
    # opposite of MNA's source current.
    current = -i[ammeter_source] if ammeter == 0 else (v[3] - v[4]) / ammeter
    return {"current": _clean(float(current)), "voltage": _clean(float(v[2] - v[0]))}


def random_network(rng: np.random.Generator) -> dict[str, object]:
    """A random connected network of cells, resistors, open and ideal leads, solved by MNA.

    Returns the elements in the TypeScript solver's shape, every node's potential relative to
    node "n0", and every element's current (a → b for resistors, out of + for cells).
    """
    nodes = int(rng.integers(4, 9))
    elements: list[dict[str, object]] = []
    # A spanning tree of resistors keeps it connected; then extra branches.
    for k in range(1, nodes):
        j = int(rng.integers(0, k))
        elements.append(
            {"kind": "resistor", "a": f"n{j}", "b": f"n{k}", "ohms": float(rng.uniform(0.5, 50))}
        )
    for _ in range(int(rng.integers(1, 6))):
        a, b = rng.choice(nodes, 2, replace=False)
        elements.append(
            {
                "kind": "resistor",
                "a": f"n{a}",
                "b": f"n{b}",
                "ohms": float(rng.choice([rng.uniform(0.1, 1000), math.inf])),
            }
        )
    for _ in range(int(rng.integers(1, 3))):
        a, b = rng.choice(nodes, 2, replace=False)
        elements.append(
            {
                "kind": "cell",
                "minus": f"n{a}",
                "plus": f"n{b}",
                "emf": float(rng.uniform(-3, 3)),
                "internalResistance": float(rng.uniform(0.05, 5)),
            }
        )
    # One ideal lead, between nodes that no cell spans, so nothing is shorted.
    for _ in range(20):
        a, b = (int(i) for i in rng.choice(nodes, 2, replace=False))
        spans = any(
            e["kind"] == "cell" and {e["minus"], e["plus"]} == {f"n{a}", f"n{b}"} for e in elements
        )
        if not spans:
            elements.append({"kind": "resistor", "a": f"n{a}", "b": f"n{b}", "ohms": 0.0})
            break
    for i, e in enumerate(elements):
        e["id"] = f"e{i}"

    # Solve: node index = number in the name; each cell gets an internal node for its ideal emf.
    net = Network()
    extra = nodes
    leads: list[tuple[str, int]] = []  # (element id, source index)
    cells: list[tuple[str, int, int, float]] = []  # (id, ideal-plus node, plus node, r)
    for e in elements:
        if e["kind"] == "resistor":
            a, b = int(str(e["a"])[1:]), int(str(e["b"])[1:])
            if e["ohms"] == 0:
                leads.append((str(e["id"]), len(net.sources)))
            net.resistor(a, b, float(e["ohms"]))  # type: ignore[arg-type]
        else:
            minus, plus = int(str(e["minus"])[1:]), int(str(e["plus"])[1:])
            net.source(minus, extra, float(e["emf"]))  # type: ignore[arg-type]
            net.resistor(extra, plus, float(e["internalResistance"]))  # type: ignore[arg-type]
            cells.append((str(e["id"]), extra, plus, float(e["internalResistance"])))  # type: ignore[arg-type]
            extra += 1
    v, i = net.solve()
    currents: dict[str, float] = {}
    for e in elements:
        if e["kind"] == "resistor" and e["ohms"] not in (0.0, math.inf):
            a, b = int(str(e["a"])[1:]), int(str(e["b"])[1:])
            currents[str(e["id"])] = float((v[a] - v[b]) / float(e["ohms"]))  # type: ignore[arg-type]
        elif e["kind"] == "resistor" and e["ohms"] == math.inf:
            currents[str(e["id"])] = 0.0
    for eid, k in leads:
        # MNA's source current enters the source at its + node from the circuit; a lead from a
        # (its − node) to b (its + node) carries the opposite through itself, from a to b.
        currents[eid] = float(-i[k])
    for eid, ideal, plus, r in cells:
        currents[eid] = float((v[ideal] - v[plus]) / r)
    for e in elements:
        if e["ohms"] == math.inf if e["kind"] == "resistor" else False:
            e["ohms"] = None  # JSON has no infinity: null is an open lead
    return {
        "elements": elements,
        "potentials": {f"n{k}": _clean(float(v[k] - v[0])) for k in range(nodes)},
        "currents": {k: _clean(c) for k, c in currents.items()},
    }
