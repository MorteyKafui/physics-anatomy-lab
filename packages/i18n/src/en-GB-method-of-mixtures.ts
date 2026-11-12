/**
 * English (en-GB) messages for the method of mixtures, kept apart from the shared file so the
 * other labs and the app shell do not download them. The mixtures lab registers them by importing
 * "@pa/i18n/method-of-mixtures". Copy follows AGENTS.md rule 6.
 */
export const enGBMethodOfMixtures = {
  "experiments.method-of-mixtures.title": "The method of mixtures",
  "experiments.method-of-mixtures.refused.cylinder-holds":
    "The measuring cylinder holds up to 100 cm³.",
  "experiments.method-of-mixtures.refused.already-poured":
    "The hot water is already in. Empty the calorimeter to start the next mixture.",
  "experiments.method-of-mixtures.refused.fill-both":
    "Measure the cold water into the calorimeter and the hot water into the beaker first.",
  "experiments.method-of-mixtures.refused.not-a-number": "That is not something the bench can do.",
  "findings.mixtures.readBeforePeak.title": "You read the thermometer before it stopped rising",
  "findings.mixtures.readBeforePeak.detail":
    "In {count} reading(s) the thermometer was still rising. You read it {seconds} s after pouring; it went on rising for {peakSeconds} s and reached {celsius} °C more.",
  "findings.mixtures.readBeforePeak.demonstrate":
    "Keep stirring and keep watching the thermometer. Read it when it stops rising, just before it starts to fall.",
  "findings.mixtures.notStirred.title": "The mixture was not stirred",
  "findings.mixtures.notStirred.detail":
    "In {count} reading(s) the hot water stayed near the top, and the water by the bulb warmed slowly while heat went to the room. The highest reading is {celsius} °C lower than with stirring.",
  "findings.mixtures.notStirred.demonstrate":
    "Stir gently all the time from the moment you pour, so the hot and cold water mix in seconds.",
  "findings.mixtures.notCovered.title": "The calorimeter was not covered",
  "findings.mixtures.notCovered.detail":
    "In {count} reading(s) the lid was off, so the mixture lost heat to the room eight times as fast. The highest reading is {celsius} °C lower than with the lid on.",
  "findings.mixtures.notCovered.demonstrate":
    "Put the lid on as soon as the hot water is in, and stir through the hole in it.",
  "findings.mixtures.slowPour.title": "The hot water waited before it was poured",
  "findings.mixtures.slowPour.detail":
    "In {count} reading(s) the hot water stood in the beaker for up to {seconds} s, so it went in at {hot} °C, not 65 °C. The highest reading is {celsius} °C lower than with the water poured at once.",
  "findings.mixtures.slowPour.demonstrate":
    "Have the calorimeter ready, then pour the hot water in quickly the moment it reaches 65 °C.",
  "findings.mixtures.thermometerAtAngle.title": "The thermometer was read at an angle",
  "findings.mixtures.thermometerAtAngle.detail":
    "You read the thermometer {angle}° off square-on. The mercury sits behind the scale, so the reading is out by {celsius} °C.",
  "findings.mixtures.thermometerAtAngle.demonstrate":
    "Bring your eye level with the top of the mercury, so the scale's mark is straight in front of it.",
  "findings.mixtures.cylinderAtAngle.title": "The measuring cylinder was read at an angle",
  "findings.mixtures.cylinderAtAngle.detail":
    "You read the measuring cylinder {angle}° from level, so the water you measured is out by {cm3} cm³ from what you wrote down.",
  "findings.mixtures.cylinderAtAngle.demonstrate":
    "Stand the cylinder on the bench and read the bottom of the curved surface with your eye level with it.",
} as const;
