# @pa/physics

Physics models in TypeScript: pure, deterministic and tested. They run in the browser, so the
lab works offline. Every model has tests against its analytic results, an independent Python
model in `validation/` whose fixtures it must match, and scripted students who make the usual
mistakes. A physics reviewer approves every change (AGENTS.md rule 1).

| Model              | File          | Cross-checked against (validation/)                      |
| ------------------ | ------------- | -------------------------------------------------------- |
| Simple pendulum    | `pendulum.ts` | SciPy's complete elliptic integral                       |
| Ohm's law          | `circuits.ts` | NumPy modified nodal analysis                            |
| Potentiometer      | `circuits.ts` | Nodal analysis with the galvanometer, SciPy root-finding |
| Converging lens    | `lens.ts`     | Paraxial ray-transfer matrices                           |
| Method of mixtures | `mixtures.ts` | SciPy root-finding on the energy balance                 |

Conventions: SI units, except the lens, which takes any one length unit (the lab uses cm), and
mixtures, which take °C because only temperature differences appear. The lens uses the
real-is-positive convention, so a virtual image has a negative image distance. Inputs outside
the physical range throw a `RangeError` rather than return a number that looks valid.

Model assumptions to know: ideal ammeter and wires; a uniform potentiometer wire; a thin lens
and paraxial rays; no heat lost to the room in the method of mixtures, and water's specific heat
capacity taken as 4200 J kg⁻¹ K⁻¹.
