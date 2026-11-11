/**
 * A direct-current network solver (master plan, "Simulation": "Circuit solver (nodal analysis)
 * over cells with internal resistance, resistors, rheostat, potentiometer wire, real meters,
 * key"). It solves whatever the student wired, right or wrong, so a meter in the wrong place
 * reads what a real one would.
 *
 * Volts, amperes and ohms. Every part is a two-terminal element between two named nodes:
 *
 * - a resistor (a resistor, a rheostat's setting, a length of potentiometer wire, a meter's own
 *   resistance, a lead): R > 0, or 0 for an ideal lead or a closed key, or Infinity for an open
 *   key or a broken lead;
 * - a cell: an ideal emf in series with its internal resistance.
 *
 * Method: leads of zero resistance first merge the nodes they join (union-find); then the
 * node-voltage equations G v = i are solved by Gaussian elimination with partial pivoting, one
 * reference node per connected piece of the circuit. Cells enter as their Norton equivalent, so
 * a cell must have some internal resistance; a cell whose two terminals are joined by leads alone
 * is a short circuit, which the solver reports rather than solves (the lab blocks it).
 *
 * Cross-checked against an independent modified-nodal-analysis model in NumPy
 * (validation/pa_validation/circuits.py).
 */

export type Element =
  | { kind: "resistor"; id: string; a: string; b: string; ohms: number }
  | {
      kind: "cell";
      id: string;
      /** The negative terminal. */
      minus: string;
      /** The positive terminal. */
      plus: string;
      emf: number;
      internalResistance: number;
    };

export interface Solution {
  /** Each node's potential, V, relative to the reference of its piece of the circuit. */
  potential(node: string): number;
  /**
   * The current through an element, A. For a resistor, from `a` to `b`; for a cell, out of its
   * positive terminal (through the external circuit).
   */
  current(id: string): number;
  /** The potential of node `p` minus that of node `q`, V (0 if they are not connected at all). */
  pd(p: string, q: string): number;
}

export type Solved =
  | { ok: true; solution: Solution }
  | {
      ok: false;
      /** A cell's terminals are joined by leads alone, with nothing to limit the current. */
      reason: "short-circuit";
      cells: string[];
    };

function check(e: Element): void {
  const bad = (name: string, v: number) => {
    throw new RangeError(`${e.id}: ${name} must be a number of ohms ≥ 0 or Infinity, got ${v}`);
  };
  if (e.kind === "resistor") {
    if (!(e.ohms >= 0) || Number.isNaN(e.ohms)) bad("ohms", e.ohms);
  } else {
    if (!Number.isFinite(e.emf)) throw new RangeError(`${e.id}: emf must be finite, got ${e.emf}`);
    if (!(e.internalResistance > 0) || !Number.isFinite(e.internalResistance)) {
      throw new RangeError(
        `${e.id}: a cell needs a positive, finite internal resistance, got ${e.internalResistance}`,
      );
    }
  }
}

/** Solve the network. Throws a RangeError for an element no real part could have. */
export function solveNetwork(elements: readonly Element[]): Solved {
  const ids = new Set<string>();
  for (const e of elements) {
    check(e);
    if (ids.has(e.id)) throw new RangeError(`two elements are called ${e.id}`);
    ids.add(e.id);
  }

  // Merge the nodes joined by ideal leads.
  const parent = new Map<string, string>();
  const find = (n: string): string => {
    if (!parent.has(n)) parent.set(n, n);
    let root = n;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(n) !== root) {
      const next = parent.get(n)!;
      parent.set(n, root);
      n = next;
    }
    return root;
  };
  const join = (p: string, q: string) => {
    const a = find(p);
    const b = find(q);
    if (a !== b) parent.set(a, b);
  };
  for (const e of elements) {
    if (e.kind === "resistor") {
      find(e.a);
      find(e.b);
      if (e.ohms === 0) join(e.a, e.b);
    } else {
      find(e.minus);
      find(e.plus);
    }
  }

  const shorted = elements
    .filter((e) => e.kind === "cell" && find(e.minus) === find(e.plus))
    .map((e) => e.id);
  if (shorted.length) return { ok: false, reason: "short-circuit", cells: shorted };

  // Conductances between merged nodes: finite, non-zero resistors and cells' internal resistances.
  type Branch = { p: string; q: string; g: number; source: number };
  const branches: Branch[] = [];
  for (const e of elements) {
    if (e.kind === "resistor") {
      if (e.ohms > 0 && Number.isFinite(e.ohms))
        branches.push({ p: find(e.a), q: find(e.b), g: 1 / e.ohms, source: 0 });
    } else {
      // Norton: a current E/r pushed from minus to plus inside the cell, with g = 1/r across it.
      const g = 1 / e.internalResistance;
      branches.push({ p: find(e.minus), q: find(e.plus), g, source: e.emf * g });
    }
  }

  // The connected pieces, each with its own reference (its first node).
  const roots = [...new Set([...parent.keys()].map(find))];
  const piece = new Map<string, string>(roots.map((r) => [r, r]));
  const pieceOf = (n: string): string => {
    let p = n;
    while (piece.get(p) !== p) p = piece.get(p)!;
    return p;
  };
  for (const b of branches) {
    const x = pieceOf(b.p);
    const y = pieceOf(b.q);
    if (x !== y) piece.set(x, y);
  }
  const references = new Set(roots.map((r) => pieceOf(r)));
  const unknowns = roots.filter((r) => !references.has(r));
  const index = new Map(unknowns.map((n, i) => [n, i]));

  // G v = i, with the reference nodes at 0 V.
  const n = unknowns.length;
  const G = Array.from({ length: n }, () => new Float64Array(n));
  const I = new Float64Array(n);
  for (const b of branches) {
    const i = index.get(b.p);
    const j = index.get(b.q);
    if (i !== undefined) {
      G[i]![i]! += b.g;
      I[i]! -= b.source;
    }
    if (j !== undefined) {
      G[j]![j]! += b.g;
      I[j]! += b.source;
    }
    if (i !== undefined && j !== undefined) {
      G[i]![j]! -= b.g;
      G[j]![i]! -= b.g;
    }
  }
  const v = gaussian(G, I);
  const voltage = new Map<string, number>(roots.map((r) => [r, 0]));
  unknowns.forEach((u, k) => voltage.set(u, v[k]!));

  const byId = new Map(elements.map((e) => [e.id, e]));
  const at = (node: string) => {
    if (!parent.has(node)) throw new RangeError(`no node called ${node}`);
    return voltage.get(find(node))!;
  };
  const solution: Solution = {
    potential: at,
    pd(p, q) {
      if (pieceOf(find(p)) !== pieceOf(find(q))) return 0;
      return at(p) - at(q);
    },
    current(id) {
      const e = byId.get(id);
      if (!e) throw new RangeError(`no element called ${id}`);
      if (e.kind === "cell") {
        // Out of the plus terminal: (E − (V₊ − V₋)) / r.
        return (e.emf - (at(e.plus) - at(e.minus))) / e.internalResistance;
      }
      if (!(e.ohms > 0) || !Number.isFinite(e.ohms)) {
        if (e.ohms === Infinity) return 0;
        // An ideal lead: the current it carries is what its merged node passes on. Found from
        // the currents leaving node `b` through every other element (Kirchhoff's current law).
        return leadCurrent(e, elements, solution);
      }
      const i = (at(e.a) - at(e.b)) / e.ohms;
      return i === 0 ? 0 : i;
    },
  };
  return { ok: true, solution };
}

/** The current through an ideal lead from a to b, from the current balance at the b end. */
function leadCurrent(
  lead: Extract<Element, { kind: "resistor" }>,
  elements: readonly Element[],
  s: Solution,
): number {
  // Treat the leads of one merged node as a tree: the lead's current is the net current leaving
  // through finite elements on b's side. With a single lead into a node (the usual case: a meter
  // lead, a closed key) that side is just node b.
  const side = new Set<string>([lead.b]);
  const leads = elements.filter(
    (e): e is Extract<Element, { kind: "resistor" }> =>
      e.kind === "resistor" && e.ohms === 0 && e.id !== lead.id,
  );
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of leads) {
      if (side.has(l.a) !== side.has(l.b)) {
        side.add(l.a);
        side.add(l.b);
        grew = true;
      }
    }
  }
  if (side.has(lead.a)) {
    throw new RangeError(`${lead.id} is in a loop of ideal leads; its current is undetermined`);
  }
  let out = 0;
  for (const e of elements) {
    if (e.kind === "resistor") {
      if (e.ohms === 0 || e.ohms === Infinity) continue;
      if (side.has(e.a) && !side.has(e.b)) out += s.current(e.id);
      if (side.has(e.b) && !side.has(e.a)) out -= s.current(e.id);
    } else {
      if (side.has(e.plus) && !side.has(e.minus)) out -= s.current(e.id);
      if (side.has(e.minus) && !side.has(e.plus)) out += s.current(e.id);
    }
  }
  return out;
}

/**
 * Solve A x = b by Gaussian elimination with partial pivoting. With one reference node in every
 * connected piece, A is never singular for a real circuit; a near-zero pivot is a bug.
 */
function gaussian(A: Float64Array[], b: Float64Array): Float64Array {
  const n = b.length;
  const M = A.map((row) => Float64Array.from(row));
  const x = Float64Array.from(b);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[pivot]![c]!)) pivot = r;
    if (Math.abs(M[pivot]![c]!) < 1e-300) {
      throw new RangeError("the network equations are singular");
    }
    [M[c], M[pivot]] = [M[pivot]!, M[c]!];
    [x[c], x[pivot]] = [x[pivot]!, x[c]!];
    for (let r = c + 1; r < n; r++) {
      const f = M[r]![c]! / M[c]![c]!;
      if (f === 0) continue;
      for (let k = c; k < n; k++) M[r]![k]! -= f * M[c]![k]!;
      x[r]! -= f * x[c]!;
    }
  }
  for (let c = n - 1; c >= 0; c--) {
    let s = x[c]!;
    for (let k = c + 1; k < n; k++) s -= M[c]![k]! * x[k]!;
    x[c] = s / M[c]![c]!;
  }
  return x;
}
