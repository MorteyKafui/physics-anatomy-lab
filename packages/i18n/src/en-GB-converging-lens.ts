/**
 * English (en-GB) messages for the converging lens, kept apart from the shared file so the other
 * labs and the app shell do not download them. The lens lab registers them by importing
 * "@pa/i18n/converging-lens". Copy follows AGENTS.md rule 6.
 */
export const enGBConvergingLens = {
  "experiments.converging-lens.title": "The converging lens",
  "findings.lens.readFromEdge.title": "Readings taken from the edge of a holder",
  "findings.lens.readFromEdge.detail":
    "{count} of your distances were read from a holder's edge, which puts each about {cm} cm out. Read u and v from the centre mark of each holder.",
  "findings.lens.readFromEdge.demonstrate":
    "Look for the line on the base of each holder: the lens, the ray box and the screen all sit on it. Read the rule where that line meets it.",
  "findings.lens.notCoaxial.title": "The gauze and the lens are not on one axis",
  "findings.lens.notCoaxial.detail":
    "The gauze's centre sits {mm} mm off the lens's axis, so its image moves off the centre of the screen and can run off its edge. Set the gauze and the lens at the same height, on one line.",
  "findings.lens.notCoaxial.demonstrate":
    "Look along the bench from behind the ray box: the gauze's centre, the lens's centre and the screen's centre should line up.",
  "findings.lens.blurredImage.title": "A blurred image taken as sharp",
  "findings.lens.blurredImage.detail":
    "{count} of your readings were taken with the image still blurred, up to {cm} cm from where it is sharpest. Move the screen both ways until the image is at its sharpest before you read v.",
  "findings.lens.blurredImage.demonstrate":
    "Move the screen slowly towards the lens until the gauze's lines start to blur, then back the other way until they blur again. The sharpest image is halfway between.",
  "findings.lens.insideFocalLength.title": "No image on the screen",
  "findings.lens.insideFocalLength.detail":
    "With the object {u} cm from the lens, it is inside the focal length, so the lens makes no real image to catch on a screen. Move the ray box further from the lens.",
  "findings.lens.insideFocalLength.demonstrate":
    "Look through the lens from the screen's side: you see an upright, magnified image. It is virtual, behind the lens, so no screen can show it.",
  "findings.lens.scaleAtAngle.title": "The rule read at an angle",
  "findings.lens.scaleAtAngle.detail":
    "You read the rule about {angle}° off square-on, which shifts each reading by about {mm} mm. Read it with your eye directly above the mark.",
  "findings.lens.scaleAtAngle.demonstrate":
    "Bend down until your eye is level with the holder's mark and directly over the rule, then read it.",
} as const;
