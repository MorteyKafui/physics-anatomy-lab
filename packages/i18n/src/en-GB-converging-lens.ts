/**
 * English (en-GB) messages for the converging lens, kept apart from the shared file so the other
 * labs and the app shell do not download them. The lens lab registers them by importing
 * "@pa/i18n/converging-lens". Copy follows AGENTS.md rule 6.
 */
export const enGBConvergingLens = {
  "experiments.converging-lens.title": "The converging lens",
  "experiments.converging-lens.question.title": "The focal length of a converging lens",
  "experiments.converging-lens.question.text":
    "Set the illuminated ray box at a distance u = 20.0 cm from the lens. Move the screen until a sharp image of the wire gauze is formed on it, and read its distance v from the lens. Repeat for u = 25.0, 30.0, 35.0 and 40.0 cm. Plot 1/v against 1/u, and find f from the two intercepts.",
  "experiments.converging-lens.predict.title": "As the object moves away, what does the image do?",
  "experiments.converging-lens.predict.text":
    "You will move the ray box further from the lens each time. Where will the sharp image be?",
  "experiments.converging-lens.predict.rise": "It moves further from the lens",
  "experiments.converging-lens.predict.fall": "It moves closer to the lens",
  "experiments.converging-lens.predict.same": "It stays in the same place",
  "experiments.converging-lens.predict.saved": "You said: {choice}. Measure and see.",
  "experiments.converging-lens.build.title": "Set up the bench",
  "experiments.converging-lens.build.why":
    "Put the lens 20.0 cm from the ray box, and set the gauze at the height of the lens's centre, so its image falls in the middle of the screen.",
  "experiments.converging-lens.build.u": "Lens 20.0 cm from the ray box",
  "experiments.converging-lens.build.coaxial": "Gauze on the lens's axis",
  "experiments.converging-lens.build.gauze": "Gauze height",
  "experiments.converging-lens.build.gauzeAt": "{mm} mm above the axis",
  "experiments.converging-lens.build.gauzeBelow": "{mm} mm below the axis",
  "experiments.converging-lens.build.gauzeOn": "On the axis",
  "experiments.converging-lens.build.raise": "Raise the gauze",
  "experiments.converging-lens.build.lower": "Lower the gauze",
  "experiments.converging-lens.check.title": "Check the set-up",
  "experiments.converging-lens.check.right":
    "The gauze, the lens and the screen are on one axis, and the lens is 20.0 cm from the ray box.",
  "experiments.converging-lens.check.u":
    "The lens is {u} cm from the ray box. Set it 20.0 cm away for the first reading.",
  "experiments.converging-lens.check.fix": "Back to the bench",
  "experiments.converging-lens.measure.title": "Find the sharpest image",
  "experiments.converging-lens.measure.why":
    "Set u, then move the screen towards the lens and away from it. The image of the gauze is sharp at one place only. Read u and v from the holders' centre marks.",
  "experiments.converging-lens.measure.lens": "Lens position",
  "experiments.converging-lens.measure.screen": "Screen position",
  "experiments.converging-lens.measure.towards": "Towards the lens",
  "experiments.converging-lens.measure.away": "Away from the lens",
  "experiments.converging-lens.measure.step":
    "Each press moves the screen 1 mm. Read the rule at the red centre mark of each holder.",
  "experiments.converging-lens.measure.onScreen": "On the screen",
  "experiments.converging-lens.measure.sharp": "Sharp",
  "experiments.converging-lens.measure.blurred": "Blurred",
  "experiments.converging-lens.measure.noImage": "No image",
  "experiments.converging-lens.measure.take": "Take this reading",
  "experiments.converging-lens.measure.readings": "Readings so far",
  "experiments.converging-lens.measure.none":
    "None yet. The question sets u = 20.0, 25.0, 30.0, 35.0 and 40.0 cm.",
  "experiments.converging-lens.measure.reading": "u = {u} cm, v = {v} cm",
  "experiments.converging-lens.measure.cannot": "There is no image on the screen to read.",
  "experiments.converging-lens.screen.sharp": "The gauze, upside down and sharp",
  "experiments.converging-lens.screen.blurred": "The gauze, upside down and blurred",
  "experiments.converging-lens.screen.none": "A faint, even patch of light: no image",
  "experiments.converging-lens.screen.offScreen":
    "The gauze's image, running off the edge of the screen",
  "experiments.converging-lens.bench":
    "The ray box at {object} cm, the lens at {lens} cm and the screen at {screen} cm. {image}",
  "experiments.converging-lens.bench.sharp": "The light from the gauze meets on the screen.",
  "experiments.converging-lens.bench.blurred":
    "The light from the gauze does not meet on the screen.",
  "experiments.converging-lens.bench.none":
    "The light leaves the lens still spreading, so no image forms.",
  "experiments.converging-lens.refused.off-the-rule": "That is off the end of the bench.",
  "experiments.converging-lens.refused.holders-cross":
    "The holders cannot pass each other on the bench.",
  "experiments.converging-lens.refused.gauze-out-of-reach": "The gauze will not go any further.",
  "experiments.converging-lens.explain.title": "Where a lens puts the image",
  "experiments.converging-lens.explain.text":
    "A converging lens bends the light from each point of the gauze so that it meets again at one place behind the lens: the image. A screen there shows it sharp; anywhere else the light is spread into a blurred patch.",
  "experiments.converging-lens.explain.u": "object distance, gauze to lens · cm · the rule",
  "experiments.converging-lens.explain.v":
    "image distance, lens to the sharp image · cm · the rule",
  "experiments.converging-lens.explain.f": "focal length of the lens · cm · from the graph",
  "experiments.converging-lens.explain.graph":
    "Plot 1/v against 1/u: a straight line of slope −1, meeting both axes at 1/f.",
  "experiments.converging-lens.tips.title": "Precautions examiners look for",
  "experiments.converging-lens.tips.1": "I made sure the wire gauze and the lens were on one axis.",
  "experiments.converging-lens.tips.2":
    "I located only sharp images, moving the screen both ways each time.",
  "experiments.converging-lens.tips.3": "I read u and v from the centre mark of each holder.",
  "experiments.converging-lens.tips.4":
    "I read the rule with my eye directly above the mark, to avoid parallax.",
  "experiments.converging-lens.tips.5":
    "I cleaned the lens with a soft cloth to get a sharp image.",
  "experiments.converging-lens.tabulate.title": "Tabulate your readings",
  "experiments.converging-lens.tabulate.why":
    "Record u and v for each object distance as you read them on the rule, and work out 1/u and 1/v in cm⁻¹.",
  "experiments.converging-lens.plot.title": "Plot 1/v against 1/u",
  "experiments.converging-lens.plot.why":
    "Start both axes from zero. Draw the best straight line through your points and carry it on until it meets both axes: f is read from where it meets them.",
  "experiments.converging-lens.analyse.title": "Find f from the two intercepts",
  "experiments.converging-lens.analyse.why":
    "Read m₁, where your line meets the 1/v axis, and m₂, where it meets the 1/u axis. Both are 1/f, so f = 2 ⁄ (m₁ + m₂), the reciprocal of their mean.",
  "experiments.converging-lens.analyse.m1Lead": "m₁, where your line meets the 1/v axis =",
  "experiments.converging-lens.analyse.m2Lead": "m₂, where your line meets the 1/u axis =",
  "experiments.converging-lens.analyse.fLead": "f = 2 ⁄ (m₁ + m₂) = 2 ⁄ ({m1} + {m2}) =",
  "experiments.converging-lens.analyse.needLine":
    "Draw your line on the graph first: m₁ and m₂ are read where it meets the axes.",
  "experiments.converging-lens.analyse.otherGraph":
    "Your graph is {y} against {x}. The question asks for 1/v against 1/u: only that line meets both axes at 1/f. Go back to Plot to change the axes.",
  "experiments.converging-lens.conclude.text":
    "The focal length of the lens is {f}. As the object moved away from the lens, the sharp image moved closer to it.",
  "experiments.converging-lens.next":
    "The report, the print sheets and the exam for the lens come with the next part of this lab. Your work is kept.",
  "experiments.converging-lens.inDevelopment": "Being built: the report comes next",
  "lab.analyse.name.m1": "m₁",
  "lab.analyse.name.m2": "m₂",
  "lab.analyse.name.f": "f",
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
  "findings.lens.wrongGraph.title": "Plot 1/v against 1/u",
  "findings.lens.wrongGraph.detail":
    "Your graph is {y} against {x}. v against u is a curve. 1/v against 1/u is a straight line of slope −1 that meets both axes at 1/f, which is how the question finds f.",
  "findings.lens.wrongGraph.demonstrate": "Choose u⁻¹ for the x axis and v⁻¹ for the y axis.",
} as const;
