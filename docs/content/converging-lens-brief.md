# The converging lens: the brief

Step 1 of the experiment playbook (master plan, "Adding an experiment"). It sets what the
experiment is, before any of the lab is built, for the physics reviewer to approve.

- **Experiment id:** `converging-lens` (Phase 2, the third flagship).
- **Status:** a draft for the physics reviewer.

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
  thin-lens v. The effect is small for a school lens, and it is the honest reason a careful
  student's f comes out slightly off.
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
