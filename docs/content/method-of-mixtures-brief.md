# The method of mixtures: content brief

The fourth flagship (master plan, Phase 2: "Method of mixtures: heat model, thermometer lag, heat
loss"), proposed for review before anything is built. As with the converging lens, two practicals
from the school practical book, built one after the other (decided by Mortey, 2026-11-12):
Experiment 62 first, then Experiment 64. The scans are kept private under ADR 0012; this brief
paraphrases them and quotes nothing.

- **Experiment id:** `method-of-mixtures` (Phase 2, the fourth flagship).
- **Status:** approved by Mortey (physics reviewer) on 2026-11-12: decisions 1 to 5, as proposed.

## What the student does (Experiment 62)

**Water at two temperatures.** A measured 50 cm³ of tap water is heated in a beaker to 65 °C.
Meanwhile a volume V of tap water is put into a lagged, covered calorimeter and its temperature
read. The hot water is poured in quickly, the mixture stirred, and the highest temperature it
reaches read; the rise T is that minus the starting temperature. The book sets V = 40, 50, 60 and
70 cm³ (its worked table also has 80 cm³), and asks for a table of V, T and 1/T, a graph of V
against 1/T, its slope, and the value of V where 1/T = 0.

**What the graph shows.** With room temperature θ₀ and the calorimeter's water equivalent W (the
volume of water with the same heat capacity), the heat the hot water gives up is what the cold
water and the calorimeter take:

50 (65 − θ₀ − T) = (V + W) T, so V = 50 (65 − θ₀) ⁄ T − (50 + W).

A graph of V against 1/T is a straight line of slope 50 (65 − θ₀), meeting the V axis, where
1/T = 0, at −(50 + W): the intercept gives the calorimeter's water equivalent.

**What the student takes away.** Heat lost by the hot water equals heat gained by the cold water
and its container, if none is lost to the room. The more cold water, the smaller the rise. The
container takes heat too, and the graph finds how much.

## Where it sits

|          |                                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Level    | SHS (WASSCE), and the first calorimetry practical at university                                                              |
| Syllabus | Heat: specific heat capacity, the method of mixtures, heat capacity, heat losses                                             |
| Skills   | Reading a thermometer at its peak; stirring; reciprocals; a graph's slope and intercept                                      |
| Exam     | Part (a) is the practical. Part (b) asks the vacuum flask, the clinical thermometer, and a final temperature from one mixing |

## The other mixtures practicals in the book

| Experiment | Method                                                           | Graph                |
| ---------- | ---------------------------------------------------------------- | -------------------- |
| 60         | Ice added to warm water: the specific latent heat of fusion      | none                 |
| 61         | Water and kerosene cooled in the same calorimeter                | cooling curves       |
| 62         | Water at two temperatures (this brief)                           | V against 1/T        |
| 64         | A hot solid metal into water: the solid's specific heat capacity | none (a calculation) |

Experiment 64 comes second (decided). Its minute-by-minute readings to the peak are the same
heat model as 62's, so it reuses it.

## The model (packages/physics), proposed

`packages/physics/src/mixtures.ts` already has the ideal mixing (`finalTemperature`,
`specificHeatCapacityFromMixture`), cross-checked against SciPy. The plan asks for a lumped heat
model on top of it: water, calorimeter, stirrer and thermometer, losing heat to the room.

- **The bodies:** the hot water, the cold water and the calorimeter with its stirrer, each a
  lumped heat capacity m c.
- **Mixing:** the poured water and the water already there share heat with a mixing time:
  seconds when stirred, minutes when not, so the water by the thermometer lags the mean.
- **Loss to the room:** Newton's law of cooling on the mixture's mean temperature, with a
  constant for the lagged, covered calorimeter, and a larger one if it is left uncovered.
- **The thermometer:** a first-order lag on the water around its bulb, so its reading rises to a
  peak and then falls slowly as the mixture loses heat; the peak is what the student reads.
- **Readings:** the thermometer to 0.1 °C (the book's least count), the measuring cylinder to
  1 cm³, with parallax for a reading at an angle.

To be checked with an independent SciPy ODE model in `validation/`, as the lens was.

## What an exploratory model shows

From a scratch run of that model (not in the repository): a 50 g copper calorimeter (water
equivalent W = 50 × 390 ⁄ 4200 = 4.6 cm³), room and tap water at 28 °C, a loss constant of 1% per
minute of the excess over the room, mixing 5 s when stirred, and a thermometer lag of 8 s.

| V / cm³ | Ideal rise / °C | Peak the thermometer shows / °C | Read too early, at 30 s / °C | Not stirred, at 5 min / °C |
| ------- | --------------- | ------------------------------- | ---------------------------- | -------------------------- |
| 40      | 19.55           | 19.35, about 1 minute in        | 18.33                        | 16.9                       |
| 70      | 14.84           | 14.69                           | 13.92                        | 12.8                       |

- Done carefully, each peak is 0.15 to 0.2 °C below the ideal rise, from heat lost while the
  thermometer catches up.
- On the graph, that loss makes the slope about 1% low (1831 against 1850 cm³ °C) but leaves the
  intercept at −(50 + W) = −54.6 cm³, so the water equivalent survives a careful run.
- Reading too early, before the peak, is about 1 °C low; not stirring, 2.6 °C low even after five
  minutes; an uncovered calorimeter (eight times the loss), about 0.9 °C low. Each shows on the
  graph as points off the line.

## The mistakes, proposed

Each with its real effect in the model, and coaching text:

- reading the thermometer before it reaches its peak;
- not stirring, so the water by the bulb is not yet mixed;
- the calorimeter not lagged or covered, so more heat goes to the room;
- delay in pouring, so the hot water cools in the beaker first;
- reading the thermometer or the measuring cylinder at an angle (parallax);
- plotting V against T where the question asks for V against 1/T.

## The bench and the mistakes (item 2), for the physics reviewer

`packages/experiments/src/method-of-mixtures.ts` builds the bench from the attempt's events:
the cold and hot water measured in the cylinder, the lid, the stirrer, the pour (and how long the
hot water waited), and emptying the calorimeter for the next volume. The calorimeter, the room and
the model's constants are the approved ones; the heat model (`calorimetry.ts`) gives every
temperature.

Done carefully at 40 to 70 cm³ the rises are 19.4, 17.5, 16.0 and 14.7 °C, each at its peak about
61 s after the pour. Each mistake, with its real effect in the model (at 40 cm³, then 70 cm³):

| Mistake                                 | Caught when                                | Effect                                       |
| --------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| Reading before the peak                 | read while still more than 0.1 °C below it | at 30 s: 1.0 and 0.8 °C short                |
| Not stirring                            | not stirred                                | peak at 8 minutes, 1.6 and 1.2 °C lower      |
| The lid off                             | not covered                                | 0.9 and 0.7 °C lower                         |
| Delay in pouring                        | poured more than 10 s after 65 °C          | at 30 s: in at 63.5 °C, 0.8 and 0.6 °C lower |
| The thermometer read at an angle        | more than 5° off square-on                 | 0.2 °C at 20°                                |
| The measuring cylinder read at an angle | more than 5° from level                    | 0.4 cm³ at 20°                               |

Plotting V against T, the sixth, is checked with the graph, as for the lens.

Three assumptions until the UEW reference data, approved by Mortey (physics reviewer) on
2026-11-12:

1. The open beaker loses heat as fast as the calorimeter without its lid, 8% a minute, so no new
   constant is needed; and a pour more than 10 s after the water reaches 65 °C is slow.
2. The thermometer's mercury sits behind its scale by the width of 0.5 °C, so read at an angle θ
   it is out by 0.5 °C × tan θ.
3. The water's surface meets the cylinder's glass behind its marks by the width of 1 cm³, so read
   from above or below it is out by 1 cm³ × tan θ.

## What comes next (one pull request each)

1. **The physics.** The lumped model in `packages/physics`, with the SciPy cross-check, built to
   what this review decides.
2. **The bench and the mistakes**, then **the board** on the design canvas, then **the lab**,
   **the guided flow, table and graph**, and **the report, sheets and exam**, as for the lens.
3. **Experiment 64** on the same model.
4. **The usability test** with students at the target level.

## For the physics reviewer to decide

Approved by Mortey on 2026-11-12, all five as proposed: the four volumes the book's question
sets (40 to 70 cm³, without the worked table's 80 cm³), and the room and tap water at a fixed
28 °C. Either can be changed later with a new decision here.

1. Experiment 62 as the book sets it: 50 cm³ at 65 °C into V = 40, 50, 60 and 70 cm³ (and 80 cm³,
   as the worked table has?), and a graph of V against 1/T.
2. The apparatus: a 50 g copper calorimeter with its stirrer (W ≈ 4.6 cm³), room and tap water at
   28 °C (or varied a little each attempt, as the lens's f is).
3. The model's constants until the UEW reference data: loss 1% per minute of the excess, lagged
   and covered (eight times that uncovered); mixing 5 s stirred, 2 minutes not; thermometer lag 8 s.
4. The thermometer to 0.1 °C and the measuring cylinder to 1 cm³, as the book's least counts.
5. The six mistakes above.

## Experiment 64: a hot solid into water, proposed

Experiment 62 is built (#52 to #58). This section proposes the second practical, on the same
heat model, for review before anything is built.

### What the student does

The student weighs a solid metal on a balance, then the calorimeter with its stirrer, empty and
again about half full of water at room temperature, so finding the water's mass. They read the
water's temperature T₀. The solid hangs in a beaker of boiling water until it has been steady for
some time, at T_s. It is moved quickly but gently into the lagged calorimeter, the lid goes on,
and the water is stirred and read every minute until it is steady. The highest reading is T.
The solid's specific heat capacity follows from the heat it gives up and the heat the water and
calorimeter take in:

m_s c_s (T_s − T) = (m_c c_c + m_w c_w)(T − T₀).

The book's worked answer comes out near 400 J kg⁻¹ K⁻¹, and it names the solid as copper. It
has no graph.

### What the model shows

The same lumped model (`calorimetry.ts`), with the solid as the hot body and the time the solid
takes to share its heat with the stirred water in place of the waters' mixing time. Taking a
100 g solid from boiling water (100 °C) into 50 g of water at 28 °C in the approved 50 g copper
calorimeter, lagged and covered, stirred, with the thermometer 8 s behind:

| Solid     | c, J kg⁻¹ K⁻¹ | T with no loss, °C | Highest T, °C | c worked from it |
| --------- | ------------- | ------------------ | ------------- | ---------------- |
| Copper    | 390           | 38.46              | 38.32         | 384              |
| Brass     | 380           | 38.23              | 38.09         | 374              |
| Iron      | 450           | 39.80              | 39.65         | 443              |
| Aluminium | 900           | 48.28              | 48.01         | 883              |

The highest comes about 79 s after the solid goes in, so the readings every minute show it at 1
and 2 minutes, then falling slowly. Done carefully, c comes out 1 to 2% low. The rise is only
about 10 °C for copper, so a 0.1 °C least count is worth about 1% of c.

Each mistake's effect on c for copper:

| Mistake                                            | c worked out | Off by |
| -------------------------------------------------- | ------------ | ------ |
| Transfer taking 30 s, the solid cooling in the air | 373          | −4%    |
| 1 g of boiling water carried in on the solid       | 425          | +9%    |
| 3 g of water splashed out as the solid goes in     | 406          | +4%    |
| Not stirred (2 minutes to share the heat)          | 348          | −11%   |
| The lid off                                        | 356          | −9%    |

Not stirred, the highest comes at about 8 minutes, so readings stopped at 5 minutes miss it.

### For the physics reviewer to decide, Experiment 64

6. Experiment 64 as the book sets it: a 100 g solid from boiling water (100 °C) into about 50 g
   of water at room temperature, in the same 50 g copper calorimeter at 28 °C as Experiment 62;
   readings every minute until steady; c_s worked out from the equation, with c_c = 390 and
   c_w = 4200 J kg⁻¹ K⁻¹ given. Masses on a balance read to 0.1 g (a new instrument).
7. Decided (Mortey, 2026-11-13): the solid is one of copper, brass, iron and aluminium, chosen
   for each attempt and named only when the student has found c, so the answer cannot be known
   before it is measured.
8. Two new constants until the UEW data: the solid shares its heat with the stirred water in
   10 s (2 minutes unstirred, as for Experiment 62's water), and in the air between the beaker
   and the calorimeter it cools at 5% of its excess a minute.
9. The steps: as Experiment 62's, with Plot showing T against time from the minute readings, to
   find the highest; Analyse works c_s from the equation (the book's calculation, with no
   graph to find a slope from).
10. Five mistakes, from the table above: a slow transfer, boiling water carried in, water
    splashed out, not stirring, and the lid off; and, as for Experiment 62, reading before the
    highest and reading a scale at an angle.

Then, one pull request each: the physics (the solid's transfer and the carried water), the bench
and the mistakes, the board, the lab, the table, graph and analysis, and the report, sheets and
exam.
