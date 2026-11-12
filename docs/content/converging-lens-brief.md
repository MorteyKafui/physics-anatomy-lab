# The converging lens: the brief

Step 1 of the experiment playbook (master plan, "Adding an experiment"). It sets what the
experiment is, before any of the lab is built, for the physics reviewer to approve.

- **Experiment id:** `converging-lens` (Phase 2, the third flagship).
- **Status:** approved by Mortey (physics reviewer) on 2026-11-11: decisions 1 to 5, then 6 and
  7 once the exact model showed the lens's aberration.

## What the student does

The WASSCE converging lens practical with a ray box and a screen, as set in the school practical
book (Experiment 95). The scans are kept private under ADR 0012.

> Mount the converging lens L vertically in the holder. Set the illuminated ray box R at a
> distance u = 20.0 cm from the lens. Adjust the position of the screen S until a sharp image of
> the illuminated wire gauze is formed on S. Determine the distance v of S from the lens. Repeat
> for u = 25.0, 30.0 and 40.0 cm. Calculate 1/u and 1/v. Tabulate your readings. Plot 1/v
> against 1/u. Determine the vertical and horizontal intercepts m₁ and m₂, and evaluate
> 2 ⁄ (m₁ + m₂). State two precautions.

**The set-up.** On an optical bench, a ray box with an illuminated wire gauze is the object, a
converging lens in a holder stands in front of it, and a white screen is moved behind the lens
until the image of the gauze is sharp. u and v are read on the bench's metre rule from the centre
mark of the lens holder.

**What the graph shows.** From 1/u + 1/v = 1/f, the graph of 1/v against 1/u is a straight line
of slope −1, meeting both axes at 1/f. So m₁ = m₂ = 1/f, and 2 ⁄ (m₁ + m₂) = f, taking the mean
of the two intercepts.

**What the student takes away.** A lens forms a real image only of an object beyond its focal
point. The image is sharp at one place only, and that place moves closer to the lens as the
object moves away.

## Where it sits

|          |                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Level    | SHS (WASSCE), and the first optics practical at university                                             |
| Syllabus | Light: refraction through lenses; real and virtual images; the lens formula; magnification             |
| Skills   | Finding the sharpest image; reading an optical bench from the centre mark; reciprocals; two intercepts |
| Exam     | Part (a) is the practical above. Part (b) asks lens properties, f from one u and v, and m = v ⁄ f − 1  |

## The other lens practicals in the book

For later, as their own pull requests or as part (b) material, from the same lens and bench:

| Experiment | Method                                                         | Graph                     |
| ---------- | -------------------------------------------------------------- | ------------------------- |
| 96         | Two optical pins: the search pin at no parallax with the image | xy against x + y, slope f |
| 97         | Lens and plane mirror to find the focal points, then pins      | b against a               |
| 98         | Magnification from the separation of two pins' images          | against u                 |
| 99         | Displacement: two sharp images for one object–screen distance  | D² − d² against D         |

Experiment 96 is where the plan's pin parallax model is used. It is proposed as the next lens
practical once this one is in.

## The model (packages/physics), proposed

`lens.ts` already has the thin-lens formula, magnification, f from one u and v, f from an
intercept and the 4f minimum object–screen distance, cross-checked against paraxial ray-transfer
matrices in `validation/pa_validation/lens.py`. This experiment adds:

- **Blur on the screen (defocus).** Rays from one point of the gauze fill the lens's aperture D
  and meet at the image distance v. On a screen at s from the lens they make a patch of diameter
  D |1 − s ⁄ v|. That is zero at s = v, grows either side, and is the whole aperture for an
  object at the focal point. The lab draws the gauze's image blurred by this patch, so the
  student finds the sharp image by looking, as on a real bench.
- **When an image looks sharp.** A student calls the image sharp when the blur is below what the
  eye can tell from sharp on the screen, about c = 0.5 mm. That gives a range of screen
  positions, v (1 ± c ⁄ D), so readings scatter as real ones do, more at large v. Its centre is
  the true image.
- **The exact lens (the plan's "paraxial plus exact").** A ray traced exactly through the lens's
  two spherical surfaces by Snell's law. Rays near the edge cross the axis a little nearer the
  lens than paraxial ones (spherical aberration), so the sharpest image sits a little short of the
  thin-lens v. It is the honest reason a careful student's f comes out a little off: about 1% for
  the proposed lens (see "What the exact model shows").
- **Cross-checks** against an independent NumPy model in `validation/`: the blur patch from
  traced rays, and the exact trace against vector Snell's law in three dimensions, with the
  paraxial limit equal to the thin-lens formula.

## The proposed bench, for the physics reviewer

| Part       | Proposed                                                                      | Why                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Lens       | Biconvex glass, f = 15.0 cm, n = 1.52, diameter 4.0 cm, radii worked from f   | f = 0.150 m is what the book's worked readings for Experiments 95 and 96 give. n and the diameter are assumed, as a typical school lens |
| Object     | Ray box with an illuminated wire gauze                                        | As the question sets it                                                                                                                 |
| Screen     | White screen on a holder                                                      |                                                                                                                                         |
| Bench rule | Metre rule, least count 0.1 cm; positions read from the holders' centre marks | The book's least count, and its precaution                                                                                              |
| Positions  | u = 20.0, 25.0, 30.0, 35.0 and 40.0 cm                                        | The question lists 20, 25, 30 and 40; the worked solution also uses 35. Five gives a graph of five points                               |
| Sharpness  | Blur below c = 0.5 mm on the screen counts as sharp                           | Assumed: about what an eye at reading distance tells from sharp. To be checked in the UEW lab                                           |
| Tolerances | f ±2% from lens to lens                                                       | Each attempt's lens differs a little, as real ones do                                                                                   |

The readings these give, worked from the proposed model (the thin-lens image distance, and the
range of screen positions a student would call sharp, v (1 ± c ⁄ D)):

| u / cm | v / cm | Sharp from / cm | to / cm |
| ------ | ------ | --------------- | ------- |
| 20.0   | 60.0   | 59.3            | 60.8    |
| 25.0   | 37.5   | 37.0            | 38.0    |
| 30.0   | 30.0   | 29.6            | 30.4    |
| 35.0   | 26.3   | 25.9            | 26.6    |
| 40.0   | 24.0   | 23.7            | 24.3    |

Every object–screen distance here is at least 4f = 60 cm (exactly 60 cm at u = 30.0 cm, where
u = v = 2f), so each position gives a real image on the screen.

## What the exact model shows

Built to the approved bench (`lensForFocalLength(15.0, 1.52, 4.0)`): R = 15.54 cm on both faces,
0.36 cm thick at the centre. f from the student's graph, 2 ⁄ (m₁ + m₂), through the five positions:

| Image taken at                                   | f from the graph / cm |
| ------------------------------------------------ | --------------------- |
| The thin-lens v                                  | 15.00                 |
| The thick lens's paraxial image, from its centre | 15.03                 |
| The sharpest image (least spread over the face)  | 14.83                 |

Spherical aberration dominates, and it grows fast with the lens's width. The sharpest image
moves nearer the lens than the thin-lens v, most at u = 20.0 cm where v is largest:

| Lens diameter / cm | Sharpest image at u = 20.0 cm, from v = 60.0 cm | f from the graph / cm |
| ------------------ | ----------------------------------------------- | --------------------- |
| 2.0                | 0.6 cm nearer                                   | 14.97                 |
| 3.0                | 1.5 cm nearer                                   | 14.91                 |
| 4.0                | 2.8 cm nearer                                   | 14.83                 |
| 5.0                | 4.3 cm nearer                                   | 14.73                 |

At 4.0 cm the shift at u = 20.0 cm is larger than the sharp range (± 0.75 cm), so where the image
looks sharp is centred on the sharpest image, not on the thin-lens v (decision 7). The brief's
table of sharp ranges above is the thin-lens one.

## The bench and the mistakes (item 2), for the physics reviewer

`packages/experiments/src/converging-lens.ts` builds each attempt's lens from its seed (f ± 2%),
shows the image on the screen sharpest at the exact lens's best focus (decision 7), and reads the
rule as the student does. Sizes it assumes, to be checked in the UEW lab:

| Part                   | Assumed                    | What it decides                                            |
| ---------------------- | -------------------------- | ---------------------------------------------------------- |
| Holder, centre to edge | 1.0 cm                     | A reading from the edge is out by this much                |
| Gauze off the axis     | More than 3 mm is noticed  | When the coach says the set-up is not coaxial              |
| Screen and gauze       | 10 cm and 2 cm high        | When an off-axis image runs off the screen                 |
| Rule read at an angle  | More than 5° off square-on | When the coach names parallax; the shift is the rule's own |

The catalogue, each with its coaching copy (`findings.lens.*`):

- reading u or v from a holder's edge, not its centre mark;
- the gauze and the lens not on one axis;
- taking a blurred image as sharp;
- an object at or inside the focal length (no image on the screen);
- reading the rule at an angle.

Plotting v against u instead of 1/v against 1/u is checked with the graph (item 5), as Ohm's law
checks I against V there.

A careful student's f, from five readings to the millimetre with every image at its sharpest,
comes out 1.0% to 1.2% short of the lens's own f over 500 lenses: the aberration the brief records.

## What comes next (one pull request each)

1. **The physics.** Blur on the screen, the sharp range and the exact trace, with the NumPy
   cross-checks, built to whatever this review decides.
2. **Instruments and mistakes.** The bench rule and the mistake catalogue, each mistake with its
   real effect and its coaching text. At least:
   - reading u or v from the edge of a holder, not its centre mark;
   - the gauze and the lens not on one axis;
   - taking a blurred image as sharp;
   - an object inside the focal length (no image on the screen);
   - reading the rule at an angle;
   - plotting v against u instead of 1/v against 1/u.
3. **The board.** The optical bench on the design canvas, for approval.
4. **The bench.** Apparatus figures with the Anatomy kit, and the image drawn with its blur.
5. **Guided flow, table and graph.**
6. **Report, print sheets and exam**, with part (b) and the rubric, for review.
7. **Usability test** with students at the target level.

## For the physics reviewer to decide

1. Experiment 95 as the first lens practical, and Experiment 96 (pins) next.
2. f = 15.0 cm, from the book's own worked readings.
3. Five positions, 20 to 40 cm, where the question lists four.
4. The blur model and its sharpness threshold c = 0.5 mm, until the UEW reference data comes.
5. Adding the exact ray trace (spherical aberration) to the model, as the plan asks.
6. Decided: the lens stays 4.0 cm across, with what the exact model shows: f from the graph
   1.1% low, and the sharp image up to 2.8 cm short of v. (Asked again once the model showed the
   effect is not small, as the brief first said; kept.)
7. Decided: the lab centres the sharp range on the exact lens's sharpest image (`bestFocus`),
   not the thin-lens v, so a student's readings carry the aberration a real lens gives. Built
   with the bench, when the lab first draws the image on the screen.

## Experiment 96: two optical pins

The second lens practical, from the same lens and bench, and the plan's pin parallax model.
Decisions 8 to 11 are approved; nothing is built yet.

### What the student does

The object is a pin P₁ standing a distance x in front of the lens. The student looks through
the lens from the far side, sees the inverted image P₁′ of the pin, and moves a second pin P₂
(the search pin) along the bench until P₂ and P₁′ stay together as the eye moves from side to
side: no parallax. The distance y of P₂ from the lens is the image distance. The book sets
x = 20, 30, 40 and 50 cm, and asks for a graph of xy against (x + y). From 1/x + 1/y = 1/f,
xy = f(x + y): a straight line through the origin of slope f.

The skill this practical adds is no parallax: if the image moves with the eye, it is further
from the eye than the pin, and the pin goes back towards the image; if it moves against the
eye, it is nearer. The rule reading, the centre marks and the lens are the screen method's.

### What the exact model shows

An exploratory trace of the approved lens (the same exact meridional trace as `lens.ts`, not
yet in the repository) gives these places for the search pin. The pin tips are on the axis,
the eye stands 25 cm behind the image, and "no parallax" means the image and the pin tip move
apart by less than 1 minute of arc, the eye's resolution, as the head moves.

| x / cm | Thin-lens y / cm | Paraxial y / cm | No parallax, head ±0.5 cm | Head as far as the lens allows |
| ------ | ---------------- | --------------- | ------------------------- | ------------------------------ |
| 20     | 60.00            | 60.61           | 59.39 to 59.46            | none: 4.7′ left at best        |
| 30     | 30.00            | 30.12           | 29.65 to 30.39            | none: 2.4′ left at best        |
| 40     | 24.00            | 24.08           | 23.67 to 24.41            | none: 2.0′ left at best        |
| 50     | 21.43            | 21.50           | 21.10 to 21.84            | none: 1.9′ left at best        |

- With a small head movement the no-parallax place is sharp: a few millimetres at most, and
  under a millimetre at x = 20 cm. That is the method's strength against the screen's
  ±0.75 cm.
- The further the head moves, the further out on the lens the rays that reach the eye pass,
  and the lens's aberration brings those rays to a focus nearer the lens. Moved as far as the
  lens allows, some parallax is left wherever the pin stands. A real student sees this as an
  image that will not quite settle.
- With the no-parallax places for a ±0.5 cm head movement, the graph of xy against (x + y) has
  slope 14.83 cm and an intercept of 12 cm², where the thin lens gives 15.0 cm and none. The
  intercept is the aberration at x = 20 cm.

### The mistakes, proposed

Each with its real effect in the model, and its coaching text, as for the screen method:

- the eye off the lens's axis, so the rays come through an outer zone and the image sits nearer
  the lens;
- the pin tips not level with the axis, so the tips cannot be brought together;
- stopping with parallax still there;
- reading x or y from the edge of a holder, not its centre mark (shared with Experiment 95);
- plotting y against x, or 1/y against 1/x, where the question asks for xy against (x + y).

### What comes next (one pull request each)

1. **The physics.** The no-parallax model in `packages/physics`, with the NumPy cross-check in
   `validation/`, built to what this review decides.
2. **The board.** The pins on the bench and an eye view, where the student moves the search pin
   and the eye and watches the two tips, on the design canvas for approval.
3. **The bench and the mistakes**, then **the guided flow, table and graph**, then **the
   report, sheets and exam**, as for Experiment 95.

### For the physics reviewer to decide, Experiment 96

Approved by Mortey on 2026-11-12, all four as proposed.

8. Experiment 96 as the book sets it: x = 20, 30, 40 and 50 cm, and a graph of xy against
   (x + y) with slope f.
9. The eye 25 cm behind the image, and no parallax as under 1 minute of arc of relative movement,
   until the UEW reference data comes.
10. How far the head moves: ±0.5 cm, which gives a clear no-parallax place, rather than as far as
    the lens allows, which leaves some parallax at every place.
11. The five mistakes above.
