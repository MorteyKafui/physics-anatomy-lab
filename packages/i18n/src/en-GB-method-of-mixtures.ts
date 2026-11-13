/**
 * English (en-GB) messages for the method of mixtures, kept apart from the shared file so the
 * other labs and the app shell do not download them. The mixtures lab registers them by importing
 * "@pa/i18n/method-of-mixtures". Copy follows AGENTS.md rule 6.
 */
export const enGBMethodOfMixtures = {
  "experiments.method-of-mixtures.title": "The method of mixtures",
  "experiments.method-of-mixtures.question.title":
    "The water equivalent of a calorimeter, by the method of mixtures",
  "experiments.method-of-mixtures.question.text":
    "Heat 50 cm³ of water in a beaker to 65 °C. Meanwhile put V = 40 cm³ of cold water in the lagged calorimeter and read its temperature. Pour the hot water in quickly, stir, and read the highest temperature the mixture reaches; the rise T is that minus the starting temperature. Repeat for V = 50, 60 and 70 cm³. Plot V against 1/T, find its slope, and find V where 1/T = 0.",
  "experiments.method-of-mixtures.predict.title": "As V gets larger, what happens to the rise T?",
  "experiments.method-of-mixtures.predict.text":
    "The same 50 cm³ of hot water goes into more cold water each time. Choose what you expect, then measure and see.",
  "experiments.method-of-mixtures.predict.rise": "It gets larger",
  "experiments.method-of-mixtures.predict.fall": "It gets smaller",
  "experiments.method-of-mixtures.predict.same": "It stays the same",
  "experiments.method-of-mixtures.predict.saved": "You said: {choice}. Measure and see.",
  "experiments.method-of-mixtures.build.title": "Set up the calorimeter",
  "experiments.method-of-mixtures.build.why":
    "Measure 40 cm³ of cold water into the calorimeter and 50 cm³ of water into the beaker, with your eye level with the water in the measuring cylinder. Put the lid on, so the mixture keeps its heat.",
  "experiments.method-of-mixtures.build.cold": "40 cm³ of cold water in the calorimeter",
  "experiments.method-of-mixtures.build.hot": "50 cm³ of water in the beaker",
  "experiments.method-of-mixtures.build.lid": "The lid on the calorimeter",
  "experiments.method-of-mixtures.cylinder.title": "Measuring cylinder",
  "experiments.method-of-mixtures.cylinder.down10": "10 cm³ less",
  "experiments.method-of-mixtures.cylinder.down1": "1 cm³ less",
  "experiments.method-of-mixtures.cylinder.up1": "1 cm³ more",
  "experiments.method-of-mixtures.cylinder.up10": "10 cm³ more",
  "experiments.method-of-mixtures.cylinder.eye": "Your eye",
  "experiments.method-of-mixtures.cylinder.toCalorimeter": "Pour into the calorimeter",
  "experiments.method-of-mixtures.cylinder.toBeaker": "Pour into the beaker",
  "experiments.method-of-mixtures.eye.above": "Above",
  "experiments.method-of-mixtures.eye.level": "Level",
  "experiments.method-of-mixtures.eye.below": "Below",
  "experiments.method-of-mixtures.lid.on": "Lid on",
  "experiments.method-of-mixtures.lid.off": "Put the lid on",
  "experiments.method-of-mixtures.check.title": "Check the set-up",
  "experiments.method-of-mixtures.check.right":
    "The calorimeter holds 40 cm³ of cold water and the beaker 50 cm³, both measured with your eye level with the water, and the lid is on.",
  "experiments.method-of-mixtures.check.cold":
    "The calorimeter holds {v} cm³ by the cylinder; the question starts with 40 cm³.",
  "experiments.method-of-mixtures.check.hot":
    "The beaker holds {v} cm³ by the cylinder; the question pours in 50 cm³.",
  "experiments.method-of-mixtures.check.empty":
    "Measure the cold water into the calorimeter and the hot water into the beaker first.",
  "experiments.method-of-mixtures.check.fix": "Back to the bench",
  "experiments.method-of-mixtures.measure.title": "Read the highest temperature",
  "experiments.method-of-mixtures.measure.why":
    "Heat the beaker to 65 °C and pour it in at once. Stir all the time and watch the thermometer: it rises quickly, stops, then falls slowly as the mixture loses heat to the room. Read it when it stops rising.",
  "experiments.method-of-mixtures.measure.heat": "Heat the beaker to 65 °C",
  "experiments.method-of-mixtures.measure.heated":
    "The water in the beaker is at 65 °C. Pour it in now: it cools while it waits.",
  "experiments.method-of-mixtures.measure.pour": "Pour the hot water in",
  "experiments.method-of-mixtures.measure.stir": "Stir",
  "experiments.method-of-mixtures.measure.stirring": "Stirring",
  "experiments.method-of-mixtures.measure.take": "Take this reading",
  "experiments.method-of-mixtures.measure.empty": "Empty the calorimeter for the next volume",
  "experiments.method-of-mixtures.measure.readings": "Readings so far",
  "experiments.method-of-mixtures.measure.none":
    "None yet. The question sets V = 40, 50, 60 and 70 cm³.",
  "experiments.method-of-mixtures.measure.reading":
    "V = {v} cm³: {start} °C to {highest} °C, a rise of {rise} °C",
  "experiments.method-of-mixtures.measure.cannot": "Pour the hot water in first.",
  "experiments.method-of-mixtures.measure.thermometer": "Thermometer",
  "experiments.method-of-mixtures.measure.since": "Since you poured",
  "experiments.method-of-mixtures.measure.trace": "The thermometer since you poured",
  "experiments.method-of-mixtures.measure.traceLabel":
    "The thermometer against time since pouring, up to {t} s: {reading} °C now",
  "experiments.method-of-mixtures.measure.rising": "Still rising",
  "experiments.method-of-mixtures.measure.stopped": "Stopped rising",
  "experiments.method-of-mixtures.measure.eyeLevel":
    "Read with your eye level with the top of the mercury. The thermometer reads to 0.1 °C.",
  "experiments.method-of-mixtures.measure.rise": "The rise T is {highest} − {start} = {rise} °C.",
  "experiments.method-of-mixtures.measure.stillRising.title": "It is still rising",
  "experiments.method-of-mixtures.measure.stillRising.detail":
    "The thermometer rose {celsius} °C in the last 10 s. Keep stirring and keep watching: read it when it stops rising, just before it starts to fall.",
  "experiments.method-of-mixtures.measure.atHighest":
    "The thermometer has stopped rising at {reading} °C, {t} s after you poured. That is the highest temperature the mixture reaches: write it down.",
  "experiments.method-of-mixtures.measure.unstirred.title": "The mixture is not being stirred",
  "experiments.method-of-mixtures.measure.unstirred.detail":
    "The hot water is staying near the top, so the water by the bulb is warming slowly: {reading} °C after {t} s. Left like this, the thermometer would not reach its highest for {minutes} minutes, and then {celsius} °C lower than stirred, because heat goes to the room while it waits.",
  "experiments.method-of-mixtures.measure.unstirred.demonstrate":
    "Stir gently all the time from the moment you pour, so the hot and cold water mix in seconds. Empty the calorimeter and try this volume again.",
  "experiments.method-of-mixtures.measure.watch": "Watch the thermometer rise",
  "experiments.method-of-mixtures.measure.watchText":
    "Stir gently all the time, and watch the thermometer. It rises quickly, then stops, then falls slowly as the mixture loses heat to the room.",
  "experiments.method-of-mixtures.measure.stirTitle": "Stir the mixture",
  "experiments.method-of-mixtures.measure.step1":
    "{v} cm³ of cold water in the calorimeter, at {start} °C",
  "experiments.method-of-mixtures.measure.step2":
    "Pour in the {hot} cm³ of hot water at 65.0 °C, and stir",
  "experiments.method-of-mixtures.measure.step3":
    "Read the highest temperature the thermometer reaches",
  "experiments.method-of-mixtures.measure.V": "V",
  "experiments.method-of-mixtures.measure.starting": "Starting",
  "experiments.method-of-mixtures.measure.now": "Now",
  "experiments.method-of-mixtures.tabulate.title": "Tabulate your readings",
  "experiments.method-of-mixtures.tabulate.why":
    "Record V and the rise T for each volume, and work out 1/T in °C⁻¹.",
  "experiments.method-of-mixtures.plot.title": "Plot V against 1/T",
  "experiments.method-of-mixtures.plot.why":
    "Put 1/T along the bottom and V up the side, with room below zero for V: the line goes on to meet the V axis there. Draw the best straight line through your points, carry it back to the V axis, and draw a large triangle on it to find its slope.",
  "experiments.method-of-mixtures.analyse.title": "Find W from where the line meets the V axis",
  "experiments.method-of-mixtures.analyse.why":
    "V = 50 (65 − θ₀) ⁄ T − (50 + W). Where 1/T = 0, V = −(50 + W), so the calorimeter's water equivalent W is minus the intercept, less the 50 cm³ of hot water.",
  "experiments.method-of-mixtures.analyse.slopeLead":
    "slope = CB ⁄ AC = {rise} {yu} ⁄ {run} {xu} =",
  "experiments.method-of-mixtures.analyse.interceptLead":
    "V where your line meets the V axis, 1/T = 0, =",
  "experiments.method-of-mixtures.analyse.wLead":
    "W = −(intercept) − 50 cm³ = −({intercept}) − 50 cm³ =",
  "experiments.method-of-mixtures.analyse.needLine":
    "Draw your best straight line on the graph and carry it back to the V axis, then read where it meets it.",
  "experiments.method-of-mixtures.analyse.otherGraph":
    "Your graph is {y} against {x}. The question asks for V against 1/T: only that line meets the V axis at −(50 + W). Go back to Plot to change the axes.",
  "experiments.method-of-mixtures.conclude.text":
    "The water equivalent of the calorimeter is {W}: it takes in as much heat as that much water would. The more cold water there was, the smaller the rise.",
  "experiments.method-of-mixtures.axes.time": "t / s",
  "experiments.method-of-mixtures.axes.temperature": "θ / °C",
  "experiments.method-of-mixtures.fig.label": "Fig. 1",
  "experiments.method-of-mixtures.fig.setup": "Setting up the calorimeter",
  "experiments.method-of-mixtures.fig.mixing": "Mixing hot and cold water",
  "experiments.method-of-mixtures.fig.unstirred": "Not stirred: the hot water stays on top",
  "experiments.method-of-mixtures.bench":
    "A copper calorimeter in its lagging, {lid}, holding {cold} cm³ of water, with the thermometer and the stirrer in it. The beaker holds {hot} cm³. The thermometer reads {reading} °C.",
  "experiments.method-of-mixtures.bench.covered": "with its lid on",
  "experiments.method-of-mixtures.bench.uncovered": "with its lid off",
  "experiments.method-of-mixtures.explain.title": "Heat lost equals heat gained",
  "experiments.method-of-mixtures.explain.text":
    "The hot water cools and the cold water and the calorimeter warm, until they share one temperature. If no heat goes to the room, the heat the hot water gives up is the heat the rest take in.",
  "experiments.method-of-mixtures.explain.V": "volume of cold water · cm³ · the measuring cylinder",
  "experiments.method-of-mixtures.explain.T": "the rise in temperature · °C · the thermometer",
  "experiments.method-of-mixtures.explain.W":
    "the calorimeter's water equivalent · cm³ · from the graph",
  "experiments.method-of-mixtures.explain.graph":
    "With the room at θ₀, 50 (65 − θ₀ − T) = (V + W) T, so V = 50 (65 − θ₀) ⁄ T − (50 + W). V against 1/T is a straight line, and where it meets the V axis, V = −(50 + W).",
  "experiments.method-of-mixtures.tips.title": "Precautions examiners look for",
  "experiments.method-of-mixtures.tips.1":
    "I read the measuring cylinder with my eye level with the bottom of the meniscus.",
  "experiments.method-of-mixtures.tips.2":
    "I poured the hot water in quickly, as soon as it reached 65 °C.",
  "experiments.method-of-mixtures.tips.3": "I stirred the mixture all the time.",
  "experiments.method-of-mixtures.tips.4":
    "I read the highest temperature, when the thermometer stopped rising.",
  "experiments.method-of-mixtures.tips.5":
    "I kept the lid on the lagged calorimeter to reduce heat lost to the room.",
  "experiments.method-of-mixtures.next":
    "The report, the print sheets and the exam for the method of mixtures come with the next part of this lab. Your work is kept.",
  "experiments.method-of-mixtures.inDevelopment": "Being built: the report comes next",
  "experiments.method-of-mixtures.refused.cylinder-holds":
    "The measuring cylinder holds up to 100 cm³.",
  "experiments.method-of-mixtures.refused.already-poured":
    "The hot water is already in. Empty the calorimeter to start the next mixture.",
  "experiments.method-of-mixtures.refused.fill-both":
    "Measure the cold water into the calorimeter and the hot water into the beaker first.",
  "experiments.method-of-mixtures.refused.not-a-number": "That is not something the bench can do.",
  "lab.analyse.name.intercept": "the intercept",
  "lab.analyse.name.W": "W",
  "findings.mixtures.wrongGraph.title": "Plot V against 1/T",
  "findings.mixtures.wrongGraph.detail":
    "Your graph is {y} against {x}. V against T is a curve. V against 1/T is a straight line, and where it meets the V axis, V = −(50 + W): that is how the question finds the calorimeter's water equivalent.",
  "findings.mixtures.wrongGraph.demonstrate":
    "Choose 1/T for the axis along the bottom and V for the axis up the side.",
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
