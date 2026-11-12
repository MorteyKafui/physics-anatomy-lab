/**
 * The thin converging lens, in the real-is-positive convention used for WASSCE:
 *
 *   1/f = 1/u + 1/v
 *
 * u is the object distance, v the image distance, f the focal length, all measured from the lens
 * and positive when real. A virtual image (object inside the focal length) has a negative v.
 * Any consistent length unit works; the lab uses cm, as on the optical bench.
 *
 * Cross-checked against paraxial ray-transfer matrices in validation/pa_validation/lens.py.
 */

function positive(value: number, name: string): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
  return value;
}

/**
 * Image distance v = u f / (u − f). Positive for a real image (u > f), negative for a virtual
 * one (u < f). An object at the focal point forms no image: the rays leave parallel.
 */
export function imageDistance(objectDistance: number, focalLength: number): number {
  const u = positive(objectDistance, "objectDistance");
  const f = positive(focalLength, "focalLength");
  if (u === f) throw new RangeError("an object at the focal point forms no image");
  return (u * f) / (u - f);
}

/**
 * Linear magnification m = v / u: the image's size over the object's. Positive for a real,
 * inverted image in this convention; negative for a virtual, upright one.
 */
export function magnification(objectDistance: number, focalLength: number): number {
  return imageDistance(objectDistance, focalLength) / objectDistance;
}

/** Focal length from one pair of real distances: f = u v / (u + v). */
export function focalLengthFromDistances(
  objectDistance: number,
  imageDistanceReal: number,
): number {
  const u = positive(objectDistance, "objectDistance");
  const v = positive(imageDistanceReal, "imageDistance");
  return (u * v) / (u + v);
}

/**
 * Focal length from the graph of 1/v against 1/u, which is a straight line of slope −1 cutting
 * both axes at 1/f. Pass the intercept on either axis.
 */
export function focalLengthFromIntercept(intercept: number): number {
  return 1 / positive(intercept, "intercept");
}

/**
 * A real image falls on a screen only when the screen is at least 4f from the object: u + v is
 * smallest, at 4f, when u = v = 2f.
 */
export function minimumObjectScreenDistance(focalLength: number): number {
  return 4 * positive(focalLength, "focalLength");
}

// --- On the screen: defocus and when an image looks sharp ------------------------------------

/**
 * The diameter of the patch of light one object point makes on a screen at s from the lens.
 * Rays from the point fill the lens's aperture D and head for the image at v, so on the screen
 * they cover D |1 − s ⁄ v|: zero at s = v, the whole aperture for an object at the focal point,
 * and more than the aperture for a virtual image (the rays spread from the start). Same units
 * for every length.
 */
export function defocusBlur(
  objectDistance: number,
  focalLength: number,
  screenDistance: number,
  aperture: number,
): number {
  const u = positive(objectDistance, "objectDistance");
  const f = positive(focalLength, "focalLength");
  const s = positive(screenDistance, "screenDistance");
  const D = positive(aperture, "aperture");
  if (u === f) return D;
  return D * Math.abs(1 - s / imageDistance(u, f));
}

/**
 * The screen positions where the image looks sharp: where the blur patch is no wider than c, the
 * blur the eye cannot tell from sharp. From D |1 − s ⁄ v| ≤ c, that is v (1 − c ⁄ D) to
 * v (1 + c ⁄ D). Undefined when there is no real image to catch (object at or inside f).
 */
export function sharpRange(
  objectDistance: number,
  focalLength: number,
  aperture: number,
  threshold: number,
): { from: number; to: number } | undefined {
  const u = positive(objectDistance, "objectDistance");
  const f = positive(focalLength, "focalLength");
  const D = positive(aperture, "aperture");
  const c = positive(threshold, "threshold");
  if (u <= f) return undefined;
  const v = imageDistance(u, f);
  return { from: v * Math.max(0, 1 - c / D), to: v * (1 + c / D) };
}

// --- The exact lens: rays traced through two spherical surfaces --------------------------------

/**
 * A symmetric biconvex lens of glass in air: both surfaces of radius R, centre thickness t,
 * refractive index n and aperture (diameter) D. Distances are measured from the lens's centre,
 * real-is-positive, as on the bench.
 */
export interface SphericalLens {
  radius: number;
  thickness: number;
  index: number;
  aperture: number;
}

/** The paraxial focal length of a symmetric biconvex thick lens: 1/f = (n−1)(2/R − (n−1)t ⁄ (nR²)). */
export function thickLensFocalLength(lens: SphericalLens): number {
  const { radius: R, thickness: t, index: n } = lens;
  return 1 / ((n - 1) * (2 / R - ((n - 1) * t) / (n * R * R)));
}

/**
 * The lens for a focal length: the radius whose paraxial focal length is f, with the centre as
 * thick as the two surfaces' sag over the aperture plus a thin edge. Found by fixed-point
 * iteration from the thin-lens radius 2(n−1)f, which settles in a few steps for school lenses.
 */
export function lensForFocalLength(
  focalLength: number,
  index: number,
  aperture: number,
  edge = 0.1,
): SphericalLens {
  const f = positive(focalLength, "focalLength");
  const n = index;
  if (!(n > 1)) throw new RangeError(`index must be above 1, got ${n}`);
  const D = positive(aperture, "aperture");
  let R = 2 * (n - 1) * f;
  let t = edge;
  for (let i = 0; i < 60; i += 1) {
    if (R <= D / 2) throw new RangeError("the aperture is too wide for this focal length");
    t = 2 * (R - Math.sqrt(R * R - (D / 2) ** 2)) + edge;
    // (n−1)(2x − (n−1)t x² ⁄ n) = 1/f, with x = 1/R and t held: the smaller root.
    const a = ((n - 1) ** 2 * t) / n;
    const b = 2 * (n - 1);
    const next = 1 / ((b - Math.sqrt(b * b - (4 * a) / f)) / (2 * a));
    const settled = Math.abs(next - R) < 1e-14 * R;
    R = next;
    if (settled) break;
  }
  return {
    radius: R,
    thickness: 2 * (R - Math.sqrt(R * R - (D / 2) ** 2)) + edge,
    index: n,
    aperture: D,
  };
}

type Vec = { z: number; y: number };

/** Refract a unit direction d at a surface with unit normal m pointing back towards d's side. */
function refract(d: Vec, m: Vec, from: number, to: number): Vec | undefined {
  const cosI = -(d.z * m.z + d.y * m.y);
  const k = from / to;
  const sin2T = k * k * (1 - cosI * cosI);
  if (sin2T > 1) return undefined; // total internal reflection: the ray does not get through
  const cosT = Math.sqrt(1 - sin2T);
  return { z: k * d.z + (k * cosI - cosT) * m.z, y: k * d.y + (k * cosI - cosT) * m.y };
}

/**
 * Trace one ray, exactly by Snell's law, from an object point on the axis at u in front of the
 * lens's centre, through the lens at height h on its front surface (0 < h ≤ D/2). Gives where it
 * crosses the axis behind the lens's centre, and the ray as it leaves the back surface. Undefined
 * if the ray misses the back surface or is turned back.
 */
export function traceAxialRay(
  lens: SphericalLens,
  objectDistance: number,
  height: number,
): { crossing: number; point: Vec; direction: Vec } | undefined {
  const { radius: R, thickness: t, index: n, aperture: D } = lens;
  const u = positive(objectDistance, "objectDistance");
  if (!(height > 0) || height > D / 2) throw new RangeError("height must be within the aperture");
  // Front surface: centre of curvature at −t/2 + R, the glass on its −z side.
  const c1 = -t / 2 + R;
  const hit1: Vec = { z: c1 - Math.sqrt(R * R - height * height), y: height };
  const len0 = Math.hypot(hit1.z + u, hit1.y);
  const d0: Vec = { z: (hit1.z + u) / len0, y: hit1.y / len0 };
  const m1: Vec = { z: (hit1.z - c1) / R, y: hit1.y / R }; // towards the object
  const d1 = refract(d0, m1, 1, n);
  if (!d1) return undefined;
  // Back surface: centre of curvature at t/2 − R, the glass on its +z side.
  const c2 = t / 2 - R;
  const oz = hit1.z - c2;
  const b = oz * d1.z + hit1.y * d1.y;
  const disc = b * b - (oz * oz + hit1.y * hit1.y - R * R);
  if (disc < 0) return undefined;
  const s = -b + Math.sqrt(disc);
  const hit2: Vec = { z: hit1.z + s * d1.z, y: hit1.y + s * d1.y };
  if (Math.abs(hit2.y) > D / 2) return undefined;
  const m2: Vec = { z: -(hit2.z - c2) / R, y: -hit2.y / R }; // towards the glass
  const d2 = refract(d1, m2, n, 1);
  if (!d2 || d2.y === 0) return undefined;
  return { crossing: hit2.z - (hit2.y * d2.z) / d2.y, point: hit2, direction: d2 };
}

/**
 * The paraxial image distance of the thick lens from its centre, by ray-transfer matrices: the
 * limit of the traced rays as h → 0.
 */
export function paraxialImageDistance(lens: SphericalLens, objectDistance: number): number {
  const { radius: R, thickness: t, index: n } = lens;
  const u = positive(objectDistance, "objectDistance");
  type M = readonly [number, number, number, number];
  const mul = (a: M, b: M): M => [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
  // Heights and reduced angles (n θ): travel in glass divides by n; a surface bends by its power.
  const travel = (d: number, idx = 1): M => [1, d / idx, 0, 1];
  const surface = (r: number, n1: number, n2: number): M => [1, 0, -(n2 - n1) / r, 1];
  let m = travel(u - t / 2);
  m = mul(surface(R, 1, n), m);
  m = mul(travel(t, n), m);
  m = mul(surface(-R, n, 1), m);
  // A ray from the axial point reaches height m[1]·θ₀ with reduced angle m[3]·θ₀ at the back
  // vertex; it is back on the axis a further −m[1] ⁄ m[3] on.
  return t / 2 - m[1] / m[3];
}

/**
 * The best screen position for an object at u, from the lens's centre: where the patch of light
 * from the whole aperture is smallest (root-mean-square spread, each ray weighted by the ring of
 * the lens it stands for). With spherical aberration this is a little nearer the lens than the
 * paraxial image.
 */
export function bestFocus(lens: SphericalLens, objectDistance: number, rings = 64): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < rings; i += 1) {
    const h = ((i + 0.5) / rings) * (lens.aperture / 2);
    const r = traceAxialRay(lens, objectDistance, h);
    if (!r) continue;
    // On a screen at z this ray is at y₀ + k z; Σ h (y₀ + k z)² is least where its derivative is zero.
    const k = r.direction.y / r.direction.z;
    const y0 = r.point.y - r.point.z * k;
    num += h * y0 * k;
    den += h * k * k;
  }
  if (den === 0) throw new RangeError("no ray gets through the lens");
  return -num / den;
}

/**
 * How the student looks for no parallax (Experiment 96): the eye stands `eyeBehind` beyond the
 * paraxial image, moves its head up to `head` either side of `centre` (0 is on the lens's axis),
 * and sees two things apart when they are further apart than `acuity` radians. Lengths in the
 * lens's units.
 */
export interface ParallaxView {
  eyeBehind: number;
  head: number;
  acuity: number;
  centre?: number;
}

/**
 * The ray from the axial object point at u that reaches an eye at distance `eye` behind the
 * lens's centre and height h above the axis, and the angle it arrives at. A ray through height y
 * of the front surface crosses the axis and reaches the far side, so the eye above the axis sees
 * the ray through −y; by symmetry that is the ray through y, reflected. Found by bisection on y.
 * Undefined if no ray through the lens reaches the eye there.
 */
function rayToEye(
  lens: SphericalLens,
  objectDistance: number,
  eye: number,
  h: number,
): { height: number; slope: number } | undefined {
  // How high, on the eye's side of the axis, the ray through front height y arrives.
  const arrives = (y: number) => {
    const r = traceAxialRay(lens, objectDistance, y);
    if (!r) return undefined;
    const k = r.direction.y / r.direction.z;
    return { at: -(r.point.y + k * (eye - r.point.z)), slope: -k };
  };
  const rim = outermostRay(lens, objectDistance);
  const top = arrives(rim);
  if (!top || h > top.at) return undefined;
  let lo = 1e-9 * lens.aperture;
  let hi = rim;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    const a = arrives(mid);
    if (!a) return undefined;
    if (a.at < h) lo = mid;
    else hi = mid;
  }
  const a = arrives((lo + hi) / 2)!;
  return { height: (lo + hi) / 2, slope: a.slope };
}

/**
 * The apparent angle between the image of an axial object pin at u and the tip of a search pin
 * at s on the axis (both from the lens's centre), for an eye at distance `eye` behind the lens's
 * centre, h off the axis. Positive when the image moves against the head (it is nearer the eye
 * than the pin's tip), negative when it moves with it (it is further away). 0 for the eye on the
 * axis. Undefined where the eye cannot see the image through the lens.
 */
export function parallaxAngle(
  lens: SphericalLens,
  objectDistance: number,
  pin: number,
  eye: number,
  h: number,
): number | undefined {
  if (h === 0) return 0;
  const ray = rayToEye(lens, objectDistance, eye, Math.abs(h));
  if (!ray) return undefined;
  const angle = Math.atan(ray.slope) - Math.atan(Math.abs(h) / (eye - pin));
  return Math.sign(h) * angle;
}

/**
 * The eye and the rays that reach it over the head's travel, found once, and the largest apparent
 * separation of the image and a pin's tip at s over that travel. The ray to the eye at each head
 * does not depend on the pin.
 */
function parallaxSpread(lens: SphericalLens, objectDistance: number, view: ParallaxView) {
  const u = positive(objectDistance, "objectDistance");
  const v = paraxialImageDistance(lens, u);
  const eye = v + view.eyeBehind;
  const centre = view.centre ?? 0;
  // Heads the eye can see the image from, sampled over the travel: no further off the axis than
  // the rays through the rim of the lens reach.
  const reach = edgeReach(lens, u, eye);
  const half = Math.min(view.head, reach + Math.abs(centre));
  const rays: { h: number; slope: number }[] = [];
  for (let i = 0; i <= 200; i += 1) {
    const h = centre - half + (2 * half * i) / 200;
    if (h === 0 || Math.abs(h) > reach) continue;
    const ray = rayToEye(lens, u, eye, Math.abs(h));
    if (ray) rays.push({ h, slope: ray.slope });
  }
  const worst = (s: number) =>
    rays.reduce(
      (m, r) => Math.max(m, Math.abs(Math.atan(r.slope) - Math.atan(Math.abs(r.h) / (eye - s)))),
      0,
    );
  return { v, eye, reach, worst };
}

/**
 * The parallax left with the search pin at s (from the lens's centre): the largest apparent
 * separation of its tip and the image's over the head's travel, in radians. Within the eye's
 * acuity, the student sees no parallax there.
 */
export function parallaxLeft(
  lens: SphericalLens,
  objectDistance: number,
  pin: number,
  view: ParallaxView,
): number {
  return parallaxSpread(lens, objectDistance, view).worst(pin);
}

/**
 * Where the search pin shows no parallax with the image of an axial object pin at u: the place
 * where the image and the pin's tip move apart least as the head moves (`at`, the least of the
 * largest apparent separation over the head's travel, `residual`, in radians), and the stretch of
 * the bench where that separation stays within the eye's acuity (`from` to `to`; undefined when
 * some parallax is left everywhere). The head's travel is cut to what the lens lets the eye see
 * through (`head`). For a lens without aberration `at` is the image distance and `residual` 0.
 */
export function noParallax(
  lens: SphericalLens,
  objectDistance: number,
  view: ParallaxView,
): { at: number; residual: number; from?: number; to?: number; head: number } {
  const { v, eye, reach, worst } = parallaxSpread(lens, objectDistance, view);
  // The largest separation falls and then rises as the pin passes the image: golden-section search.
  let a = 0.5 * v;
  let b = Math.min(1.2 * v, eye - 1e-6 * eye);
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  for (let i = 0; i < 200 && b - a > 1e-12 * v; i += 1) {
    if (worst(c) < worst(d)) b = d;
    else a = c;
    c = b - g * (b - a);
    d = a + g * (b - a);
  }
  const at = (a + b) / 2;
  const residual = worst(at);
  const out: { at: number; residual: number; from?: number; to?: number; head: number } = {
    at,
    residual,
    head: Math.min(view.head, reach),
  };
  if (residual > view.acuity) return out;
  // Each edge of the no-parallax stretch, by bisection from the best place outwards.
  const edge = (outside: number) => {
    let inside = at;
    let out2 = outside;
    for (let i = 0; i < 200; i += 1) {
      const mid = (inside + out2) / 2;
      if (worst(mid) <= view.acuity) inside = mid;
      else out2 = mid;
    }
    return (inside + out2) / 2;
  };
  out.from = edge(0.5 * v);
  out.to = edge(Math.min(1.2 * v, eye - 1e-6 * eye));
  return out;
}

/**
 * The largest height on the front surface whose ray gets through the lens: the rim, unless rays
 * from a near object spread so far inside the glass that they leave past the back surface's rim.
 */
function outermostRay(lens: SphericalLens, objectDistance: number): number {
  const rim = lens.aperture / 2;
  if (traceAxialRay(lens, objectDistance, rim)) return rim;
  let lo = 0;
  let hi = rim;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    if (traceAxialRay(lens, objectDistance, mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The furthest the eye's head can be off the axis and still see the image through the lens. */
function edgeReach(lens: SphericalLens, objectDistance: number, eye: number): number {
  const r = traceAxialRay(lens, objectDistance, outermostRay(lens, objectDistance));
  if (!r) return 0;
  const k = r.direction.y / r.direction.z;
  return Math.max(0, -(r.point.y + k * (eye - r.point.z)));
}
