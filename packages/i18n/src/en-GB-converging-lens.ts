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
  "experiments.converging-lens.report.title": "{experiment}: the focal length of a converging lens",
  "experiments.converging-lens.report.aim":
    "To determine the focal length f of a converging lens by finding the image of an illuminated object on a screen.",
  "experiments.converging-lens.report.apparatus.rayBox":
    "A ray box with an illuminated wire gauze (R)",
  "experiments.converging-lens.report.apparatus.lens":
    "A converging lens {d} cm across, in a holder (L)",
  "experiments.converging-lens.report.apparatus.screen": "A white screen in a holder (S)",
  "experiments.converging-lens.report.apparatus.bench": "An optical bench with a {length} cm rule",
  "experiments.converging-lens.report.benchCaption":
    "The ray box R, the lens L and the screen S on the optical bench, with a sharp image of the gauze on the screen.",
  "experiments.converging-lens.report.benchCaptionAsLeft":
    "The ray box R, the lens L and the screen S on the optical bench, as they were left.",
  "experiments.converging-lens.report.benchAlt": "{caption}: the optical bench",
  "experiments.converging-lens.report.legend.R": "ray box with wire gauze",
  "experiments.converging-lens.report.legend.L": "converging lens",
  "experiments.converging-lens.report.legend.S": "screen",
  "experiments.converging-lens.report.values.bench": "u = {u} cm, screen {s} cm from the lens",
  "experiments.converging-lens.report.theory":
    "A thin converging lens of focal length f forms a real image of an object a distance u from it at a distance v on the other side, with 1/u + 1/v = 1/f. So 1/v = −1/u + 1/f: a graph of 1/v against 1/u is a straight line of slope −1, which meets both axes at 1/f. The vertical intercept m₁ and the horizontal intercept m₂ are each 1/f, so f = 2 ⁄ (m₁ + m₂), the reciprocal of their mean.",
  "experiments.converging-lens.report.method.setUp":
    "I set the lens and the gauze on one axis, so the image fell in the middle of the screen.",
  "experiments.converging-lens.report.method.readings":
    "For each object distance from u = {min} cm to {max} cm, I moved the screen towards the lens and away from it until the image of the gauze was sharp, and read v from the centre marks of the holders.",
  "experiments.converging-lens.report.method.repeat":
    "At some object distances I found the sharp image twice, bringing the screen in from each side, and used the mean of v.",
  "experiments.converging-lens.report.method.analyse":
    "I plotted 1/v against 1/u, drew the best straight line, and read where it meets each axis.",
  "experiments.converging-lens.report.method.analyseOther":
    "I plotted {y} against {x} and drew the best straight line.",
  "experiments.converging-lens.report.observations.readings":
    "I took {n} readings. The rule read to {cm} cm.",
  "experiments.converging-lens.report.observations.one":
    "I took one reading. The rule read to {cm} cm.",
  "experiments.converging-lens.report.observations.trend":
    "As u increased from {umin} cm to {umax} cm, v decreased from {vmax} cm to {vmin} cm.",
  "experiments.converging-lens.report.observations.image":
    "Each image was real and upside down, and sharp at one place only.",
  "experiments.converging-lens.report.observations.noImage":
    "With the lens {u} cm from the ray box, no image formed on the screen.",
  "experiments.converging-lens.report.table":
    "Table 1 The object and image distances, and their reciprocals.",
  "experiments.converging-lens.report.graph":
    "Fig. 2 {caption} m₁ and m₂ are read where the line meets the 1/v and 1/u axes.",
  "experiments.converging-lens.report.calcM1": "m₁ = 1/v where the line meets the 1/v axis: {m1}",
  "experiments.converging-lens.report.calcM2": "m₂ = 1/u where the line meets the 1/u axis: {m2}",
  "experiments.converging-lens.report.calcF": "f = 2 ⁄ (m₁ + m₂) = 2 ⁄ ({m1} + {m2}) = {f}",
  "experiments.converging-lens.report.precaution.coaxial":
    "I made sure the wire gauze and the lens were on one axis.",
  "experiments.converging-lens.report.precaution.sharp":
    "I located only sharp images, moving the screen both ways each time.",
  "experiments.converging-lens.report.precaution.centre":
    "I read u and v from the centre mark of each holder.",
  "experiments.converging-lens.report.precaution.parallax":
    "I read the rule with my eye directly above the mark, to avoid parallax.",
  "experiments.converging-lens.report.precaution.clean":
    "I cleaned the lens with a soft cloth to get a sharp image.",
  "experiments.converging-lens.report.precaution.repeat":
    "I found the sharp image from each side and used the mean of v.",
  "experiments.converging-lens.report.source.notCoaxial":
    "The gauze was off the lens's axis, so the image was off the centre of the screen and harder to judge.",
  "experiments.converging-lens.report.source.blurred":
    "A blurred image was taken as sharp, so some readings of v were off the sharpest place.",
  "experiments.converging-lens.report.source.fromEdge":
    "Some readings were taken from the edge of a holder, not its centre mark, so they are out by about {cm} cm.",
  "experiments.converging-lens.report.source.atAngle":
    "The rule was read at an angle, so some readings were shifted by parallax.",
  "experiments.converging-lens.report.source.leastCount": "The rule reads only to {cm} cm.",
  "experiments.converging-lens.report.source.sharpRange":
    "The image looks sharp over about {range} cm of the screen's travel at u = {u} cm, so the sharpest place has to be judged.",
  "experiments.converging-lens.report.source.aberration":
    "A real lens bends the light through its edge a little more than through its centre, so the sharpest image is a little nearer the lens than the thin-lens formula gives.",
  "experiments.converging-lens.report.conclusion":
    "The focal length of the lens was found to be {f}.",
  "lab.analyse.name.m1": "m₁",
  "lab.analyse.name.m2": "m₂",
  "lab.analyse.name.f": "f",
  "experiments.converging-lens.sheet.drawingTitle": "The converging lens: how the graph gives f",
  "experiments.converging-lens.sheet.style": "Find f from two intercepts",
  "experiments.converging-lens.sheet.question":
    "Where does a lens put the image, and how far is its focal point?",
  "experiments.converging-lens.sheet.lead":
    "A converging lens brings the light from each point of an object together again at one place behind it. Find that place for five object distances, plot 1/v against 1/u, and one straight line gives the focal length twice over.",
  "experiments.converging-lens.sheet.n.f": "focal length, 2 ⁄ (m₁ + m₂)",
  "experiments.converging-lens.sheet.n.m1": "m₁, where the line meets the 1/v axis",
  "experiments.converging-lens.sheet.n.m2": "m₂, where the line meets the 1/u axis",
  "experiments.converging-lens.sheet.n.v": "sharpest image at u = {u} cm",
  "experiments.converging-lens.sheet.n.shift":
    "nearer the lens than 1/u + 1/v = 1/f gives, at u = {u} cm",
  "experiments.converging-lens.sheet.part.R":
    "A lamp behind a wire gauze. The gauze is the object; its centre sits on the lens's axis.",
  "experiments.converging-lens.sheet.part.L":
    "Biconvex glass, {d} cm across, f = {f} cm. It brings the light from the gauze together again behind it.",
  "experiments.converging-lens.sheet.part.S":
    "A white screen. Move it until the image of the gauze is sharp, then read v from its centre mark.",
  "experiments.converging-lens.sheet.spec.lens": "Lens L",
  "experiments.converging-lens.sheet.spec.lensValue":
    "Biconvex glass, n = {n}, {d} cm across, f = {f} cm",
  "experiments.converging-lens.sheet.spec.distances": "Object distances",
  "experiments.converging-lens.sheet.spec.distancesValue": "u = {list} cm",
  "experiments.converging-lens.sheet.spec.rule": "Optical bench",
  "experiments.converging-lens.sheet.spec.ruleValue": "1 m rule, reads to {rule} cm",
  "experiments.converging-lens.sheet.spec.sharp": "Sharp image",
  "experiments.converging-lens.sheet.spec.sharpValue":
    "Over about {range} cm of the screen's travel at u = {u} cm",
  "experiments.converging-lens.sheet.spec.result": "From the line",
  "experiments.converging-lens.sheet.spec.resultValue":
    "m₁ = {m1} cm⁻¹, m₂ = {m2} cm⁻¹, f = {fGraph} cm",
  "experiments.converging-lens.sheet.step.setUp.title": "Set the gauze on the lens's axis",
  "experiments.converging-lens.sheet.step.setUp.text":
    "Raise or lower the gauze until its centre is level with the centre of the lens, so the image falls in the middle of the screen.",
  "experiments.converging-lens.sheet.step.distance.title": "Set u = {u} cm",
  "experiments.converging-lens.sheet.step.distance.text":
    "Put the lens {u} cm from the ray box, read between the holders' centre marks. With the screen short of the image, the image is a blurred patch.",
  "experiments.converging-lens.sheet.step.sharp.title": "Move the screen until the image is sharp",
  "experiments.converging-lens.sheet.step.sharp.text":
    "Bring the screen in from each side until the image of the gauze is sharp: here at v = {v} cm. It looks sharp over about {range} cm, so judge the middle.",
  "experiments.converging-lens.sheet.step.repeat.title": "Repeat at {count} object distances",
  "experiments.converging-lens.sheet.step.repeat.text":
    "Find v for u = {list} cm. As the object moves away from the lens, the sharp image moves closer to it.",
  "experiments.converging-lens.sheet.step.plot.title": "Plot 1/v against 1/u",
  "experiments.converging-lens.sheet.step.plot.text":
    "The line has slope −1 and meets the axes at m₁ = {m1} cm⁻¹ and m₂ = {m2} cm⁻¹. So f = 2 ⁄ (m₁ + m₂) = {fGraph} cm.",
  "experiments.converging-lens.sheet.why.title": "Why is f from the graph a little short?",
  "experiments.converging-lens.sheet.why.text":
    "A real lens bends the light through its edge a little more than through its centre, so the sharpest image forms a little nearer the lens than the thin-lens formula gives: {shift} cm nearer at u = {u} cm. That carries through the graph, and this lens's f comes out {short}% short of {f} cm.",
  "experiments.converging-lens.sheet.motto": "Sharp from both sides, read from the centre",
  "experiments.converging-lens.exam.question.meta":
    "Question 1 · The converging lens · {minutes} minutes",
  "experiments.converging-lens.exam.question.lead": "Find the focal length of the converging lens.",
  "experiments.converging-lens.exam.question.1":
    "Mount the lens L in its holder, and set the wire gauze of the ray box R on the lens's axis.",
  "experiments.converging-lens.exam.question.2":
    "Set the ray box at a distance u = {first} cm from the lens. Move the screen S until a sharp image of the gauze is formed on it, and measure its distance v from the lens.",
  "experiments.converging-lens.exam.question.3":
    "Repeat for u = {list} cm. Read u and v from the centre marks of the holders.",
  "experiments.converging-lens.exam.question.4":
    "Tabulate your readings, with 1/u and 1/v. Plot a graph of 1/v on the vertical axis against 1/u on the horizontal axis.",
  "experiments.converging-lens.exam.question.5":
    "Determine the vertical and horizontal intercepts m₁ and m₂, and evaluate f = 2 ⁄ (m₁ + m₂). State two precautions you took.",
  "experiments.converging-lens.exam.question.6":
    "Part (b): answer the questions that follow the experiment.",
  "experiments.converging-lens.exam.item.coaxial": "Gauze and lens set on one axis",
  "experiments.converging-lens.exam.item.centreMarks":
    "u and v read from the holders' centre marks",
  "experiments.converging-lens.exam.item.distances": "Readings at five object distances",
  "experiments.converging-lens.exam.item.sharp": "Each v taken at a sharp image",
  "experiments.converging-lens.exam.item.decimals": "u and v to the rule's least count",
  "experiments.converging-lens.exam.item.reciprocals": "1/u and 1/v worked out correctly",
  "experiments.converging-lens.exam.item.axes": "1/v plotted against 1/u, axes labelled",
  "experiments.converging-lens.exam.item.intercepts": "The line carried on to meet both axes",
  "experiments.converging-lens.exam.item.m1": "m₁ where the line meets the 1/v axis, with its unit",
  "experiments.converging-lens.exam.item.m2": "m₂ where the line meets the 1/u axis, with its unit",
  "experiments.converging-lens.exam.item.f": "f from 2 ⁄ (m₁ + m₂), with its unit",
  "experiments.converging-lens.exam.lost.coaxial":
    "Readings were taken with the gauze off the lens's axis.",
  "experiments.converging-lens.exam.lost.centreMarks":
    "Readings were taken from the edge of a holder.",
  "experiments.converging-lens.exam.lost.distances": "Object distances read: {n} of 5.",
  "experiments.converging-lens.exam.lost.blurred":
    "Readings taken with the image still blurred: {n}.",
  "experiments.converging-lens.exam.lost.ruleDecimals": "Readings off the rule's least count: {n}.",
  "experiments.converging-lens.exam.lost.noReciprocals": "No columns for 1/u and 1/v.",
  "experiments.converging-lens.exam.lost.axesLens": "The graph is not 1/v against 1/u.",
  "experiments.converging-lens.exam.lost.intercepts": "Intercepts on the sheet: {n} of 2.",
  "experiments.converging-lens.exam.q.one-reading":
    "A student finds a sharp image {v} cm from the lens with the object {u} cm from it. Find the focal length of the lens.",
  "experiments.converging-lens.exam.a.one-reading":
    "1/f = 1/u + 1/v = 1/{u} + 1/{v}, so f = {f} cm.",
  "experiments.converging-lens.exam.q.magnification":
    "Show that the magnification of the image is m = v ⁄ f − 1, and find m when u = {u} cm, given f = {f} cm.",
  "experiments.converging-lens.exam.a.magnification":
    "m = v ⁄ u. From 1/u + 1/v = 1/f, multiplying by v gives v ⁄ u + 1 = v ⁄ f, so m = v ⁄ f − 1. At u = {u} cm, v = {v} cm, so m = {v} ⁄ {f} − 1 = {m}.",
  "experiments.converging-lens.exam.q.no-image":
    "Why can no image be found on the screen when the object is nearer the lens than {f} cm?",
  "experiments.converging-lens.exam.a.no-image":
    "Inside the focal length the light leaves the lens still spreading, so it never meets again. The image is virtual, on the same side as the object, and cannot be caught on a screen.",
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
  "experiments.converging-lens-pins.title": "The converging lens: two pins",
  "experiments.converging-lens-pins.question.title":
    "The focal length of a converging lens, with two pins",
  "experiments.converging-lens-pins.question.text":
    "Set the object pin P₁ at a distance x = 20.0 cm from the lens. Look through the lens from the other side, and move the search pin P₂ until it and the image of P₁ show no parallax. Read the distance y of P₂ from the lens. Repeat for x = 30.0, 40.0 and 50.0 cm. Plot xy against (x + y), and find f from the slope.",
  "experiments.converging-lens-pins.predict.title":
    "As the object pin moves away, where will the image be?",
  "experiments.converging-lens-pins.predict.text":
    "You will move the object pin further from the lens each time. Where will the search pin show no parallax?",
  "experiments.converging-lens-pins.predict.rise": "Further from the lens",
  "experiments.converging-lens-pins.predict.fall": "Closer to the lens",
  "experiments.converging-lens-pins.predict.same": "In the same place",
  "experiments.converging-lens-pins.predict.saved": "You said: {choice}. Measure and see.",
  "experiments.converging-lens-pins.build.title": "Set up the bench",
  "experiments.converging-lens-pins.build.why":
    "Put the lens 20.0 cm from the object pin, and set both pins' tips level with the centre of the lens, so the tip of the image can meet the tip of the search pin.",
  "experiments.converging-lens-pins.build.x": "Lens 20.0 cm from the object pin",
  "experiments.converging-lens-pins.build.level": "Both tips level with the lens's centre",
  "experiments.converging-lens-pins.build.objectTip": "Object pin's tip",
  "experiments.converging-lens-pins.build.searchTip": "Search pin's tip",
  "experiments.converging-lens-pins.build.tipAbove": "{mm} mm above the axis",
  "experiments.converging-lens-pins.build.tipBelow": "{mm} mm below the axis",
  "experiments.converging-lens-pins.build.tipOn": "On the axis",
  "experiments.converging-lens-pins.build.raise.object": "Raise the object pin",
  "experiments.converging-lens-pins.build.lower.object": "Lower the object pin",
  "experiments.converging-lens-pins.build.raise.search": "Raise the search pin",
  "experiments.converging-lens-pins.build.lower.search": "Lower the search pin",
  "experiments.converging-lens-pins.check.title": "Check the set-up",
  "experiments.converging-lens-pins.check.right":
    "Both tips are level with the lens's centre, and the lens is 20.0 cm from the object pin.",
  "experiments.converging-lens-pins.check.x":
    "The lens is {x} cm from the object pin. Set it 20.0 cm away for the first reading.",
  "experiments.converging-lens-pins.check.fix": "Back to the bench",
  "experiments.converging-lens-pins.measure.title": "Find where there is no parallax",
  "experiments.converging-lens-pins.measure.why":
    "Look through the lens at the image of the object pin. Move your head from side to side, and move the search pin until its tip and the image's tip stay together.",
  "experiments.converging-lens-pins.measure.lens": "Lens position",
  "experiments.converging-lens-pins.measure.pin": "Search pin position",
  "experiments.converging-lens-pins.measure.towards": "Towards the lens",
  "experiments.converging-lens-pins.measure.away": "Away from the lens",
  "experiments.converging-lens-pins.measure.left": "Look from the left",
  "experiments.converging-lens-pins.measure.right": "Look from the right",
  "experiments.converging-lens-pins.measure.step":
    "Each press moves the pin 1 mm. Move your head from side to side: where the tips stay together, there is no parallax.",
  "experiments.converging-lens-pins.measure.through": "Through the lens, as you move your head",
  "experiments.converging-lens-pins.measure.clear": "No parallax",
  "experiments.converging-lens-pins.measure.parallax": "Parallax",
  "experiments.converging-lens-pins.measure.noImage": "No image",
  "experiments.converging-lens-pins.measure.take": "Take this reading",
  "experiments.converging-lens-pins.measure.readings": "Readings so far",
  "experiments.converging-lens-pins.measure.none":
    "None yet. The question sets x = 20.0, 30.0, 40.0 and 50.0 cm.",
  "experiments.converging-lens-pins.measure.reading": "x = {x} cm, y = {y} cm",
  "experiments.converging-lens-pins.measure.cannot":
    "There is no real image behind the lens to find.",
  "experiments.converging-lens-pins.eye.left": "Left",
  "experiments.converging-lens-pins.eye.centre": "Centre",
  "experiments.converging-lens-pins.eye.right": "Right",
  "experiments.converging-lens-pins.eye.together":
    "{where}: the image's tip and the search pin's tip together",
  "experiments.converging-lens-pins.eye.toLeft":
    "{where}: the image's tip to the left of the search pin's",
  "experiments.converging-lens-pins.eye.toRight":
    "{where}: the image's tip to the right of the search pin's",
  "experiments.converging-lens-pins.eye.none": "{where}: no image to see",
  "experiments.converging-lens-pins.bench":
    "The object pin at {object} cm, the lens at {lens} cm and the search pin at {pin} cm. {image}",
  "experiments.converging-lens-pins.bench.clear":
    "The image of the object pin is at the search pin: no parallax.",
  "experiments.converging-lens-pins.bench.parallax":
    "The image of the object pin and the search pin are not at the same place.",
  "experiments.converging-lens-pins.bench.none":
    "The object pin is inside the focal length: there is no real image behind the lens.",
  "experiments.converging-lens-pins.explain.title": "No parallax",
  "experiments.converging-lens-pins.explain.text":
    "Two things at the same place stay together as you move your head. If the image moves against your head, it is nearer you than the pin; if it moves with your head, it is further away. Where they stay together, the search pin is at the image.",
  "experiments.converging-lens-pins.explain.x":
    "object distance, object pin to lens · cm · the rule",
  "experiments.converging-lens-pins.explain.y":
    "image distance, lens to the search pin · cm · the rule",
  "experiments.converging-lens-pins.explain.f":
    "focal length of the lens · cm · the slope of the graph",
  "experiments.converging-lens-pins.explain.graph":
    "From 1/x + 1/y = 1/f, xy = f (x + y): plot xy against (x + y), and the slope of the straight line is f.",
  "experiments.converging-lens-pins.tips.title": "Precautions examiners look for",
  "experiments.converging-lens-pins.tips.1":
    "I set the tips of the object and search pins level with the axis of the lens.",
  "experiments.converging-lens-pins.tips.2":
    "I kept my eye along the axis of the lens in locating the image of P₁.",
  "experiments.converging-lens-pins.tips.3":
    "I moved the search pin until there was no parallax between it and the image.",
  "experiments.converging-lens-pins.tips.4": "I read x and y from the centre mark of each holder.",
  "experiments.converging-lens-pins.tips.5":
    "I cleaned the lens with a soft cloth to see the image clearly.",
  "experiments.converging-lens-pins.next":
    "Tabulating, plotting and the analysis come with the next part of this lab. Your readings are kept.",
  "experiments.converging-lens-pins.inDevelopment": "Being built: the table and graph come next",
  "experiments.converging-lens-pins.refused.off-the-rule": "That is off the end of the bench.",
  "experiments.converging-lens-pins.refused.holders-cross":
    "The holders cannot pass each other on the bench.",
  "experiments.converging-lens-pins.refused.out-of-reach": "It will not go any further.",
  "findings.pins.eyeOffAxis.title": "Your eye was off the lens's axis",
  "findings.pins.eyeOffAxis.detail":
    "Your eye was {mm} mm off the axis, so the light reached you through the outer part of the lens, which brings it to a focus nearer the lens. The place you found is {cm} cm short of where it is with your eye on the axis.",
  "findings.pins.eyeOffAxis.demonstrate":
    "Bring your eye level with the tips of the pins, and look along the lens's axis as you move your head from side to side.",
  "findings.pins.tipsOffAxis.title": "The tips are not level",
  "findings.pins.tipsOffAxis.detail":
    "The image's tip and the search pin's tip are {mm} mm apart in height, so they cannot be brought together however you move the pin.",
  "findings.pins.tipsOffAxis.demonstrate":
    "Raise or lower each pin until its tip is level with the centre of the lens. The image is upside down, so its tip then meets the search pin's from above.",
  "findings.pins.parallaxLeft.title": "There was still parallax",
  "findings.pins.parallaxLeft.detail":
    "In {count} reading(s) the image's tip and the search pin's tip still moved apart as you moved your head, by up to {arcmin} minutes of arc. The search pin was {cm} cm from the place of no parallax.",
  "findings.pins.parallaxLeft.demonstrate":
    "If the image moves against your head, it is nearer you than the pin: move the pin away from the lens. If it moves with your head, it is further away: move the pin towards the lens. Stop when the tips stay together.",
  "findings.pins.readFromEdge.title": "Readings taken from the edge of a holder",
  "findings.pins.readFromEdge.detail":
    "{count} reading(s) were read at the edge of a holder, not its centre mark, so x or y is out by {cm} cm.",
  "findings.pins.readFromEdge.demonstrate": "Read the rule at the red centre mark of each holder.",
} as const;
