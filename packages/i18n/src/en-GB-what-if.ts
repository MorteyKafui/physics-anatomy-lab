/**
 * English (en-GB) messages for the What if panel (design/mockups/AI.dc.html, "What if").
 * Registered by importing "@pa/i18n/what-if" in the panel, which loads only when it is opened.
 * Copy follows AGENTS.md rule 6.
 */
export const enGBWhatIf = {
  "lab.whatIf.title": "What if",
  "lab.whatIf.close": "Close",
  "lab.whatIf.intro": "Change one thing at a time and see what the model predicts. Works offline.",
  "lab.whatIf.length": "Length",
  "lab.whatIf.gravity": "Gravity",
  "lab.whatIf.amplitude": "Amplitude",
  "lab.whatIf.mass": "Mass of the bob",
  "lab.whatIf.place.earth": "Earth",
  "lab.whatIf.place.moon": "The Moon",
  "lab.whatIf.place.mars": "Mars",
  "lab.whatIf.place.jupiter": "Jupiter",
  "lab.whatIf.gravitySource": "g = {g} m s⁻² ({source}).",
  "lab.whatIf.predicts": "What the model predicts",
  "lab.whatIf.asSet": "As you set it",
  "lab.whatIf.yours": "Your what if",
  "lab.whatIf.period": "T = {t} s",
  "lab.whatIf.smallAngle": "At this swing the small-angle formula, T = 2π√(l/g), holds.",
  "lab.whatIf.exact":
    "Above 10° the small-angle formula no longer holds. The exact period is {percent} % longer than 2π√(l/g).",
  "lab.whatIf.mass.none": "The mass of the bob has no effect on the period.",
  "lab.whatIf.earthNote":
    "The Earth here is standard gravity, not your bench's: your bench's g is what you are measuring.",
  "lab.whatIf.model":
    "The model treats the string as light and not stretching, and the bob as a point, swinging in one plane.",
} as const;
