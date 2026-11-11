# Ohm's law and the potentiometer: the brief

Step 1 of the experiment playbook (master plan, "Adding an experiment"). It sets what the
experiment is, before any of the lab is built, for the physics reviewer to approve.

- **Experiment id:** `ohms-law` (Phase 2, the second flagship).
- **Status:** draft, for the physics reviewer.

## What the student does

The WASSCE potentiometer, ammeter and voltmeter practical, as set in the school practical book
(Experiment 115). The scans are kept private under ADR 0012.

> Connect the circuit. Close the key. Record the ammeter reading I and the voltmeter reading V
> when the jockey is not touching the potentiometer wire. Then place the jockey on the wire at J,
> with PJ = 40 cm, and record I and V. Repeat with PJ = 50, 60, 70 and 80 cm. Tabulate your
> readings. Plot I against V, and find the slope of the graph and the value of V when I = 0.
> State two precautions.

**The circuit.** A cell, a resistor R and an ammeter are in series with the potentiometer wire PQ
and a key K. A lead from P ends in the jockey J. Touching the wire at J cuts the length PJ out of
the circuit, so the current rises. The voltmeter is across the cell. As the current rises, it
reads less: the cell's terminal potential difference V = E − I r.

**What the graph shows.** I against V is a straight line with a negative slope.

- It meets the V axis (I = 0) at the cell's emf E.
- Its slope is −1/r, where r is the cell's internal resistance.

This is the physics the student takes away. A cell does not keep its p.d. when it supplies
current, because some of its emf drives the current through the cell itself.

## Where it sits

|          |                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Level    | SHS (WASSCE), and the first circuits practical at university                                                                      |
| Syllabus | Current electricity: emf, internal resistance and terminal p.d.; Ohm's law; the potentiometer                                     |
| Skills   | Wiring from a circuit diagram; reading an ammeter and a voltmeter to their least count; a negative slope and an intercept         |
| Exam     | Part (a) is the practical above. Part (b), on resistivity, the potentiometer and the lost volts, is drafted with the exam rubric. |

## The model (packages/physics)

- **`solveNetwork`** solves whatever the student wired, by node-voltage analysis. Cells have
  internal resistance, a key is a lead of 0 Ω or an open gap, and both meters have their own
  resistance. So a voltmeter wired in series or an ammeter across the cell reads what a real one
  would. A cell shorted by leads alone is reported, so the lab can block it (master plan: unsafe
  actions are blocked).
- **`terminalPdReadings`** is the experiment's correct wiring, built on the solver.
- **`polarise`**: a cell running down. While current flows, a polarisation voltage builds towards
  k I with a time constant τ, and it dies away while the key is open. A student who leaves the
  key closed between readings sees the points fall below the line. This is why the first
  precaution is to open the key as soon as each reading is taken.
- **`heatWire`**: the wire warming when the current is high. C dθ/dt = I²R − hθ, with
  R = R₀(1 + αθ). Constantan's α is tiny, which is why potentiometer wires are made of it.
- **Cross-checks** against an independent NumPy model in `validation/pa_validation/circuits.py`:
  - 576 set-ups of this experiment, to 1 part in 10⁹: jockey positions, no contact, the key
    open, ideal and real meters;
  - 60 random networks, every node potential and every current;
  - the closed-form Ohm's law circuit already in `circuits.ts`.

## The proposed bench, for the physics reviewer

| Part               | Proposed                                            | Why                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cell               | Two 1.5 V dry cells in series: E = 3.0 V, r = 1.5 Ω | The book says "accumulator", but its worked readings imply r ≈ 1.7 Ω. A real lead-acid accumulator has r of a few hundredths of an ohm, which would make the line almost flat. Dry cells give the slope the practical expects. |
| Resistor R         | 1.0 Ω                                               | Keeps the current within the ammeter's range at PJ = 80 cm                                                                                                                                                                     |
| Potentiometer wire | 1.000 m of constantan, 4.0 Ω                        | A common school wire (about SWG 26)                                                                                                                                                                                            |
| Ammeter            | 0 to 1 A, least count 0.02 A, 0.05 Ω                | The book's meter reads to 0.10 A, which gives only four distinct readings over this range                                                                                                                                      |
| Voltmeter          | 0 to 3 V, least count 0.05 V, 5 kΩ                  | The book's reads to 0.1 V. A moving-coil voltmeter of about 1.7 kΩ per volt.                                                                                                                                                   |
| Polarisation       | k = 0.1 V A⁻¹, τ = 60 s                             | Assumed. To be replaced by the UEW lab's reference data (Phase 2).                                                                                                                                                             |

The readings these give, true values before the meters round them, from `terminalPdReadings`:

| PJ / m     | I / A | V / V |
| ---------- | ----- | ----- |
| No contact | 0.458 | 2.312 |
| 0.400      | 0.606 | 2.090 |
| 0.500      | 0.659 | 2.011 |
| 0.600      | 0.723 | 1.915 |
| 0.700      | 0.800 | 1.800 |
| 0.800      | 0.895 | 1.656 |

The best line through the five jockey readings has a slope of −0.667 A V⁻¹ (r = 1.500 Ω) and meets
the V axis at 2.999 V. That is E less the millivolt the voltmeter's own current costs.

## What comes next (one pull request each)

1. **Instruments and mistakes.** The two meters (least count, zero error, parallax, needle
   jitter, range) and the mistake catalogue. Each mistake has its real effect in the solver and
   its coaching text. The catalogue covers at least:
   - a meter connected the wrong way round;
   - a voltmeter in series, or an ammeter across the cell;
   - the key left closed;
   - the jockey slid along the wire (which scrapes it, so its resistance stops being uniform);
   - a loose connection;
   - reading a meter at an angle;
   - plotting V against I instead of I against V.
2. **The board.** The circuit bench on the design canvas, for approval: apparatus, wiring by
   drag and snap, and the meters under the magnifier.
3. **The bench.** Apparatus figures with the Anatomy kit, and wiring checked by comparing nets
   (Physics Bench's union-find check, kept in the harvest review).
4. **Guided flow, table and graph.**
5. **Report, print sheets and exam**, with the part (b) questions and the rubric, for review.
6. **Usability test** with students at the target level.

## For the physics reviewer to decide

1. Is the circuit read right? Specifically, the jockey's lead from P cuts PJ out, and the
   voltmeter is across the cell.
2. Dry cells (E = 3.0 V, r = 1.5 Ω) in place of the book's accumulator.
3. Meters reading to 0.02 A and 0.05 V, in place of the book's 0.10 A and 0.1 V.
4. The polarisation model, and its assumed k and τ until the UEW reference data comes.
