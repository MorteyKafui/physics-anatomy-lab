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
