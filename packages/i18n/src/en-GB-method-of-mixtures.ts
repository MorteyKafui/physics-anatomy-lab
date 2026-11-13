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
  "experiments.method-of-mixtures.report.title":
    "{experiment}: the water equivalent of a calorimeter by the method of mixtures",
  "experiments.method-of-mixtures.report.aim":
    "To find the water equivalent of a calorimeter by mixing hot and cold water in it, from a graph of V against 1/T.",
  "experiments.method-of-mixtures.report.apparatus.calorimeter":
    "A {g} g copper calorimeter with its stirrer, in a lagging jacket with a lid",
  "experiments.method-of-mixtures.report.apparatus.thermometer":
    "A thermometer reading to {celsius} °C",
  "experiments.method-of-mixtures.report.apparatus.cylinder":
    "A {capacity} cm³ measuring cylinder reading to {cm3} cm³",
  "experiments.method-of-mixtures.report.apparatus.beaker": "A beaker, a heater and tap water",
  "experiments.method-of-mixtures.report.benchCaption":
    "The calorimeter C in its lagging L, with the thermometer T and the stirrer S through its lid",
  "experiments.method-of-mixtures.report.benchAlt":
    "{caption}: a copper can of water inside a lagged jacket, with a thermometer and a stirrer through the lid.",
  "experiments.method-of-mixtures.report.letter.C": "C",
  "experiments.method-of-mixtures.report.letter.L": "L",
  "experiments.method-of-mixtures.report.letter.T": "T",
  "experiments.method-of-mixtures.report.letter.S": "S",
  "experiments.method-of-mixtures.report.legend.C": "Copper calorimeter",
  "experiments.method-of-mixtures.report.legend.L": "Lagging",
  "experiments.method-of-mixtures.report.legend.T": "Thermometer",
  "experiments.method-of-mixtures.report.legend.S": "Stirrer",
  "experiments.method-of-mixtures.report.values.bench":
    "Last mixture: {v} cm³ of cold water and {hot} cm³ of hot water, highest {highest} °C",
  "experiments.method-of-mixtures.report.theory":
    "The heat the hot water gives up is taken in by the cold water and the calorimeter. With the room at θ₀ and the calorimeter's water equivalent W, 50 (65 − θ₀ − T) = (V + W) T, so V = 50 (65 − θ₀) ⁄ T − (50 + W). A graph of V against 1/T is a straight line meeting the V axis at −(50 + W).",
  "experiments.method-of-mixtures.report.method.setUp":
    "I measured the cold water into the lagged calorimeter and the hot water into a beaker with the measuring cylinder, and put the lid on.",
  "experiments.method-of-mixtures.report.method.readings":
    "I heated the beaker to 65 °C, poured it in at once, stirred, and read the highest temperature the mixture reached, for V from {min} to {max} cm³.",
  "experiments.method-of-mixtures.report.method.repeat": "I mixed some volumes more than once.",
  "experiments.method-of-mixtures.report.method.analyse":
    "I tabulated V, T and 1/T, plotted V against 1/T, carried the line back to the V axis, and found W from where it met it.",
  "experiments.method-of-mixtures.report.method.analyseOther":
    "I tabulated my readings and plotted {y} against {x}.",
  "experiments.method-of-mixtures.report.observations.readings":
    "I took {n} readings, each temperature to {celsius} °C.",
  "experiments.method-of-mixtures.report.observations.one":
    "I took one reading, each temperature to {celsius} °C.",
  "experiments.method-of-mixtures.report.observations.trend":
    "As V rose from {vmin} to {vmax} cm³, the rise T fell from {tmax} to {tmin} °C.",
  "experiments.method-of-mixtures.report.observations.peak":
    "Each time the thermometer rose quickly, stopped about a minute after pouring, then fell slowly.",
  "experiments.method-of-mixtures.report.table": "The table shows V, T and 1/T for each mixture.",
  "experiments.method-of-mixtures.report.graph":
    "Fig. 2 {caption} The points lie on a straight line, carried back to meet the V axis below zero; the slope is found from triangle ABC.",
  "experiments.method-of-mixtures.report.calcSlope":
    "slope = CB ⁄ AC = {rise} {yu} ⁄ {run} {xu} = {slope}",
  "experiments.method-of-mixtures.report.calcIntercept":
    "V where the line meets the V axis = {intercept}",
  "experiments.method-of-mixtures.report.calcW":
    "W = −(intercept) − 50 cm³ = −({intercept}) − 50 cm³ = {W}",
  "experiments.method-of-mixtures.report.precaution.lid":
    "I kept the lid on the lagged calorimeter to reduce heat lost to the room.",
  "experiments.method-of-mixtures.report.precaution.stir": "I stirred the mixture all the time.",
  "experiments.method-of-mixtures.report.precaution.quick":
    "I poured the hot water in quickly, as soon as it reached 65 °C.",
  "experiments.method-of-mixtures.report.precaution.highest":
    "I read the highest temperature, when the thermometer stopped rising.",
  "experiments.method-of-mixtures.report.precaution.thermometerEye":
    "I read the thermometer with my eye level with the top of the mercury.",
  "experiments.method-of-mixtures.report.precaution.cylinderEye":
    "I read the measuring cylinder with my eye level with the bottom of the meniscus.",
  "experiments.method-of-mixtures.report.precaution.repeat":
    "I repeated some mixtures and checked they agreed.",
  "experiments.method-of-mixtures.report.source.early":
    "Some readings were taken before the thermometer had stopped rising, so T is too small.",
  "experiments.method-of-mixtures.report.source.unstirred":
    "Some mixtures were not stirred, so they reached their highest late and low.",
  "experiments.method-of-mixtures.report.source.uncovered":
    "Some mixtures were left without the lid, so more heat went to the room.",
  "experiments.method-of-mixtures.report.source.slow":
    "Some hot water waited before it was poured, so it went in below 65 °C.",
  "experiments.method-of-mixtures.report.source.thermometerAngle":
    "Some temperatures were read at an angle, so they are shifted by parallax.",
  "experiments.method-of-mixtures.report.source.cylinderAngle":
    "Some volumes were read at an angle, so the water measured is not what was written down.",
  "experiments.method-of-mixtures.report.source.leastCount":
    "The thermometer reads to {celsius} °C and the measuring cylinder to {cm3} cm³.",
  "experiments.method-of-mixtures.report.source.loss":
    "Even with the lid on, heat goes to the room while the thermometer catches up: at {v} cm³ the highest is about {celsius} °C below the rise with no loss.",
  "experiments.method-of-mixtures.report.conclusion":
    "The water equivalent of the calorimeter is {W}.",
  "experiments.method-of-mixtures.sheet.drawingTitle": "The calorimeter, explained",
  "experiments.method-of-mixtures.sheet.style": "A copper calorimeter in its lagging",
  "experiments.method-of-mixtures.sheet.question": "How much water is a calorimeter worth?",
  "experiments.method-of-mixtures.sheet.lead":
    "Hot water poured into cold shares its heat with the cold water and the can that holds it. A graph of V against 1/T finds how much water the can is worth.",
  "experiments.method-of-mixtures.sheet.n.W":
    "cm³: the water equivalent of the {g} g copper calorimeter",
  "experiments.method-of-mixtures.sheet.n.intercept":
    "cm³: where V against 1/T meets the V axis, −(50 + W)",
  "experiments.method-of-mixtures.sheet.n.rise":
    "°C: the highest rise with {v} cm³ of cold water, {lost} °C below the rise with no loss",
  "experiments.method-of-mixtures.sheet.n.at": "s after pouring, when the thermometer stops rising",
  "experiments.method-of-mixtures.sheet.n.count": "volumes the question sets",
  "experiments.method-of-mixtures.sheet.part.C":
    "The copper can that holds the water. It warms with the water, so it takes heat too: {W} cm³ of water's worth.",
  "experiments.method-of-mixtures.sheet.part.L":
    "The lagging and the lid keep the heat in, so little goes to the room.",
  "experiments.method-of-mixtures.sheet.part.T":
    "Reads to {thermometer} °C. It lags a few seconds behind the water, so wait for it to stop rising.",
  "experiments.method-of-mixtures.sheet.part.S":
    "Mixes the hot and cold water in seconds, so the bulb sits in mixed water.",
  "experiments.method-of-mixtures.sheet.spec.calorimeter": "Calorimeter",
  "experiments.method-of-mixtures.sheet.spec.calorimeterValue":
    "{g} g of copper, c = {c} J kg⁻¹ K⁻¹, in a lagging jacket with a lid",
  "experiments.method-of-mixtures.sheet.spec.volumes": "Volumes",
  "experiments.method-of-mixtures.sheet.spec.volumesValue":
    "{hot} cm³ at {hotT} °C into V = {list} cm³ at {room} °C",
  "experiments.method-of-mixtures.sheet.spec.scales": "Scales",
  "experiments.method-of-mixtures.sheet.spec.scalesValue":
    "Thermometer to {thermometer} °C, measuring cylinder to {cylinder} cm³",
  "experiments.method-of-mixtures.sheet.spec.model": "Heat loss",
  "experiments.method-of-mixtures.sheet.spec.modelValue":
    "{loss}% of the excess a minute with the lid on; mixed in {mixing} s; the thermometer {lag} s behind",
  "experiments.method-of-mixtures.sheet.spec.result": "Result",
  "experiments.method-of-mixtures.sheet.spec.resultValue":
    "W = {W} cm³; the line meets the V axis at {intercept} cm³",
  "experiments.method-of-mixtures.sheet.step.measure.title": "Measure the water",
  "experiments.method-of-mixtures.sheet.step.measure.text":
    "{v} cm³ of cold water into the calorimeter, {hot} cm³ into the beaker, eye level with the water in the cylinder.",
  "experiments.method-of-mixtures.sheet.step.pour.title": "Heat and pour",
  "experiments.method-of-mixtures.sheet.step.pour.text":
    "Heat the beaker to {hotT} °C and pour it in at once, so it has no time to cool.",
  "experiments.method-of-mixtures.sheet.step.stir.title": "Lid on, and stir",
  "experiments.method-of-mixtures.sheet.step.stir.text":
    "Stir all the time through the lid, so the water by the bulb is mixed.",
  "experiments.method-of-mixtures.sheet.step.read.title": "Read the highest",
  "experiments.method-of-mixtures.sheet.step.read.text":
    "The thermometer stops rising about {at} s after pouring, at a rise of {rise} °C for {v} cm³. Read it then.",
  "experiments.method-of-mixtures.sheet.step.plot.title": "Plot V against 1/T",
  "experiments.method-of-mixtures.sheet.step.plot.text":
    "A straight line. Carry it back to the V axis: it meets it at −(50 + W), here {intercept} cm³.",
  "experiments.method-of-mixtures.sheet.why.title": "Why V against 1/T?",
  "experiments.method-of-mixtures.sheet.why.text":
    "Heat lost by the hot water is heat gained by the cold water and the can: 50 (65 − θ₀ − T) = (V + W) T. So V = 50 (65 − θ₀) ⁄ T − (50 + W), a straight line in 1/T. Its slope here is {slope} cm³ °C, and where 1/T = 0, V = −(50 + W).",
  "experiments.method-of-mixtures.sheet.motto": "The can takes heat too.",
  "experiments.method-of-mixtures.exam.question.meta":
    "Question 1 · The method of mixtures · {minutes} minutes",
  "experiments.method-of-mixtures.exam.question.lead":
    "Find the water equivalent of the calorimeter by the method of mixtures.",
  "experiments.method-of-mixtures.exam.question.1":
    "You are given a lagged calorimeter with a stirrer and a lid, a thermometer, a measuring cylinder, a beaker and a heater. Heat {hot} cm³ of water in the beaker to {hotT} °C.",
  "experiments.method-of-mixtures.exam.question.2":
    "Measure V = {first} cm³ of cold water into the calorimeter and read its temperature θ₁.",
  "experiments.method-of-mixtures.exam.question.3":
    "Pour the hot water in quickly, stir, and read the highest temperature θ₂ the mixture reaches. Find the rise T = θ₂ − θ₁.",
  "experiments.method-of-mixtures.exam.question.4":
    "Repeat for V = {list} cm³. Tabulate V, T and 1/T.",
  "experiments.method-of-mixtures.exam.question.5":
    "Plot V against 1/T. Find its slope, and V where 1/T = 0. Hence find the water equivalent W of the calorimeter.",
  "experiments.method-of-mixtures.exam.question.6": "State two precautions you took.",
  "experiments.method-of-mixtures.exam.item.covered":
    "Lid on the lagged calorimeter for every mixture",
  "experiments.method-of-mixtures.exam.item.stirred": "Every mixture stirred",
  "experiments.method-of-mixtures.exam.item.volumes": "Four volumes mixed",
  "experiments.method-of-mixtures.exam.item.highest":
    "Each highest temperature read when the thermometer stopped rising",
  "experiments.method-of-mixtures.exam.item.decimals":
    "Temperatures to the thermometer's least count",
  "experiments.method-of-mixtures.exam.item.inverse": "1/T worked out correctly",
  "experiments.method-of-mixtures.exam.item.axes": "V plotted against 1/T, axes labelled",
  "experiments.method-of-mixtures.exam.item.intercept":
    "V where the line meets the V axis, with its unit",
  "experiments.method-of-mixtures.exam.item.W": "W = −(intercept) − 50 cm³, with its unit",
  "experiments.method-of-mixtures.exam.lost.covered": "A mixture was left without the lid.",
  "experiments.method-of-mixtures.exam.lost.stirred": "A mixture was not stirred.",
  "experiments.method-of-mixtures.exam.lost.volumes": "Volumes mixed: {n} of 4.",
  "experiments.method-of-mixtures.exam.lost.early": "Readings taken before the highest: {n}.",
  "experiments.method-of-mixtures.exam.lost.thermometerDecimals":
    "Temperatures off the thermometer's least count: {n}.",
  "experiments.method-of-mixtures.exam.lost.noInverse": "No 1/T column worked out.",
  "experiments.method-of-mixtures.exam.lost.axesMixtures": "The graph is not V against 1/T.",
  "experiments.method-of-mixtures.exam.q.one-mixing":
    "{hot} g of water at {hotT} °C is poured into {cold} g of water at {coldT} °C in a calorimeter whose water equivalent is {W} g. If no heat is lost, find the final temperature.",
  "experiments.method-of-mixtures.exam.a.one-mixing":
    "Heat lost = heat gained: {hot} (65 − θ) = ({cold} + {W}) (θ − 28). So θ = ({hot} × 65 + {coldW} × 28) ⁄ {total} = {final} °C.",
  "experiments.method-of-mixtures.exam.q.flask":
    "Explain how a vacuum flask keeps a hot drink hot.",
  "experiments.method-of-mixtures.exam.a.flask":
    "The vacuum between the double walls stops heat passing by conduction and convection. The silvered walls reflect heat back, so little goes by radiation. The stopper stops heat leaving by convection and evaporation at the top.",
  "experiments.method-of-mixtures.exam.q.clinical":
    "Why does a clinical thermometer have a constriction in its bore and a short range?",
  "experiments.method-of-mixtures.exam.a.clinical":
    "The constriction stops the mercury running back when the thermometer leaves the body, so it keeps the highest reading until it is shaken down. A short range, about 35 to 42 °C, gives a long scale for each degree, so it can be read to 0.1 °C.",
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
  "experiments.method-of-mixtures-solid.title": "The method of mixtures: a hot solid",
  "experiments.method-of-mixtures-solid.question.title":
    "The specific heat capacity of a solid, by the method of mixtures",
  "experiments.method-of-mixtures-solid.question.text":
    "Weigh the solid, then the calorimeter with its stirrer, empty and again about half full of water at room temperature, and read the water's temperature. Heat the solid in boiling water until it has been steady for some time. Move it quickly but gently into the lagged calorimeter, cover it, stir, and read the temperature every minute until it is steady. The highest reading is the final temperature. Find the solid's specific heat capacity, given those of the calorimeter and of water.",
  "experiments.method-of-mixtures-solid.predict.title":
    "Which changes more: the solid's temperature or the water's?",
  "experiments.method-of-mixtures-solid.predict.text":
    "The solid comes out of boiling water and goes into water at room temperature, until they share one temperature. Choose what you expect, then measure and see.",
  "experiments.method-of-mixtures-solid.predict.solid": "The solid's temperature falls more",
  "experiments.method-of-mixtures-solid.predict.water": "The water's temperature rises more",
  "experiments.method-of-mixtures-solid.predict.same": "They change by about the same",
  "experiments.method-of-mixtures-solid.predict.saved": "You said: {choice}. Measure and see.",
  "experiments.method-of-mixtures-solid.build.title": "Weigh everything first",
  "experiments.method-of-mixtures-solid.build.why":
    "Weigh the solid, then the calorimeter with its stirrer while it is empty. Fill it about half full of water from the tap and weigh it again: the difference is the water. Put the lid on, so the mixture keeps its heat.",
  "experiments.method-of-mixtures-solid.build.solid": "The solid weighed",
  "experiments.method-of-mixtures-solid.build.empty": "The calorimeter weighed empty",
  "experiments.method-of-mixtures-solid.build.filled": "The calorimeter weighed with its water",
  "experiments.method-of-mixtures-solid.build.lid": "The lid on the calorimeter",
  "experiments.method-of-mixtures-solid.balance.title": "Balance",
  "experiments.method-of-mixtures-solid.balance.note":
    "The balance reads to 0.1 g. Weigh the calorimeter empty before you fill it.",
  "experiments.method-of-mixtures-solid.weigh.solid": "Weigh the solid",
  "experiments.method-of-mixtures-solid.weigh.empty": "Weigh the calorimeter empty",
  "experiments.method-of-mixtures-solid.weigh.filled": "Weigh it with the water",
  "experiments.method-of-mixtures-solid.fill": "Fill it half full with water",
  "experiments.method-of-mixtures-solid.empty": "Empty the calorimeter",
  "experiments.method-of-mixtures-solid.mass.solid": "Solid S",
  "experiments.method-of-mixtures-solid.mass.empty": "Calorimeter",
  "experiments.method-of-mixtures-solid.mass.filled": "With water",
  "experiments.method-of-mixtures-solid.mass.start": "Water at",
  "experiments.method-of-mixtures-solid.check.title": "Check the set-up",
  "experiments.method-of-mixtures-solid.check.weigh":
    "Weigh the solid, the calorimeter empty, and the calorimeter with its water first.",
  "experiments.method-of-mixtures-solid.check.right":
    "The solid and the calorimeter are weighed, with {water} g of water in it, and the lid is on.",
  "experiments.method-of-mixtures-solid.check.fix": "Back to the bench",
  "experiments.method-of-mixtures-solid.measure.moveTitle": "Move it across quickly",
  "experiments.method-of-mixtures-solid.measure.moveText":
    "The solid has been in the boiling water long enough to be at 100 °C. Lift it out, shake it, carry it across in a few seconds, and lower it in.",
  "experiments.method-of-mixtures-solid.measure.readTitle": "Read the highest",
  "experiments.method-of-mixtures-solid.measure.wetTitle": "Boiling water went in",
  "experiments.method-of-mixtures-solid.measure.readText":
    "Stir all the time and read the thermometer every minute. It rises to its highest within two minutes, then falls slowly.",
  "experiments.method-of-mixtures-solid.measure.step1":
    "Weigh the solid, the calorimeter, and the calorimeter with water",
  "experiments.method-of-mixtures-solid.measure.step2":
    "Move the solid from the boiling water into the calorimeter, quickly",
  "experiments.method-of-mixtures-solid.measure.step3":
    "Stir, and read the thermometer every minute until it falls",
  "experiments.method-of-mixtures-solid.measure.fallen.title": "It has started to fall",
  "experiments.method-of-mixtures-solid.measure.fallen.detail":
    "The highest you read is {highest} °C: that is T. Take this reading.",
  "experiments.method-of-mixtures-solid.measure.wet.title": "Boiling water went in with the solid",
  "experiments.method-of-mixtures-solid.measure.wet.detail":
    "About {grams} g of boiling water clung to the solid and went in too. Its heat counts as the solid's, so c will come out about {percent}% too large.",
  "experiments.method-of-mixtures-solid.measure.wet.demonstrate":
    "Lift the solid out and give it a quick shake over the beaker before moving it across. Empty the calorimeter and try again.",
  "experiments.method-of-mixtures-solid.measure.take": "Take this reading",
  "experiments.method-of-mixtures-solid.measure.weighFirst":
    "Weigh the solid, the calorimeter empty and with its water first.",
  "experiments.method-of-mixtures-solid.measure.again": "Empty the calorimeter for another run",
  "experiments.method-of-mixtures-solid.measure.runs": "Runs so far",
  "experiments.method-of-mixtures-solid.measure.run": "Run {n}: from {start} °C to {highest} °C",
  "experiments.method-of-mixtures-solid.measure.none":
    "None yet. The solid's metal is named when you have found c.",
  "experiments.method-of-mixtures-solid.move.title": "Moving it across",
  "experiments.method-of-mixtures-solid.move.lift": "Lift it out of the boiling water",
  "experiments.method-of-mixtures-solid.move.inAir": "In the air",
  "experiments.method-of-mixtures-solid.move.shake": "Shake it",
  "experiments.method-of-mixtures-solid.move.shaken": "Shaken",
  "experiments.method-of-mixtures-solid.move.lower": "Lower it in",
  "experiments.method-of-mixtures-solid.move.putIn": "Put it in the calorimeter",
  "experiments.method-of-mixtures-solid.move.note":
    "Shake it over the beaker so no boiling water goes in with it, and lower it in gently on its thread.",
  "experiments.method-of-mixtures-solid.minutes.title": "Every minute since it went in",
  "experiments.method-of-mixtures-solid.minutes.read": "Read it now",
  "experiments.method-of-mixtures-solid.thermometer": "Thermometer",
  "experiments.method-of-mixtures-solid.since": "Since it went in",
  "experiments.method-of-mixtures-solid.clock": "{m} min {s} s",
  "experiments.method-of-mixtures-solid.stir": "Stir",
  "experiments.method-of-mixtures-solid.stirring": "Stirring",
  "experiments.method-of-mixtures-solid.lid.on": "Lid on",
  "experiments.method-of-mixtures-solid.lid.off": "Put the lid on",
  "experiments.method-of-mixtures-solid.eye": "Your eye",
  "experiments.method-of-mixtures-solid.eye.above": "Above",
  "experiments.method-of-mixtures-solid.eye.level": "Level",
  "experiments.method-of-mixtures-solid.eye.below": "Below",
  "experiments.method-of-mixtures-solid.eyeLevel":
    "Read with your eye level with the top of the mercury. The thermometer reads to 0.1 °C.",
  "experiments.method-of-mixtures-solid.fig.label": "Fig. 1",
  "experiments.method-of-mixtures-solid.fig.beaker": "The solid in the boiling water",
  "experiments.method-of-mixtures-solid.fig.air": "Moving the solid across",
  "experiments.method-of-mixtures-solid.fig.calorimeter": "The solid in the water",
  "experiments.method-of-mixtures-solid.bench":
    "A balance showing {balance} g; a beaker of boiling water on a tripod over a heater; the solid S on a thread {where}; the lagged calorimeter holding {water} g of water. The thermometer reads {reading} °C.",
  "experiments.method-of-mixtures-solid.bench.beaker": "in the boiling water",
  "experiments.method-of-mixtures-solid.bench.air":
    "in the air between the beaker and the calorimeter",
  "experiments.method-of-mixtures-solid.bench.calorimeter": "in the water in the calorimeter",
  "experiments.method-of-mixtures-solid.explain.title": "Heat lost equals heat gained",
  "experiments.method-of-mixtures-solid.explain.text":
    "The solid cools from the boiling water's temperature T_s and the water and the calorimeter warm from T₀, until they share one temperature T. If no heat goes to the room, the heat the solid gives up is the heat the rest take in.",
  "experiments.method-of-mixtures-solid.explain.given":
    "The specific heat capacities of the calorimeter, 390 J kg⁻¹ K⁻¹, and of water, 4200 J kg⁻¹ K⁻¹, are given.",
  "experiments.method-of-mixtures-solid.tips.title": "Precautions examiners look for",
  "experiments.method-of-mixtures-solid.tips.1":
    "I moved the solid into the calorimeter quickly, to reduce heat lost on the way.",
  "experiments.method-of-mixtures-solid.tips.2":
    "I shook the solid before moving it, so no boiling water went in with it.",
  "experiments.method-of-mixtures-solid.tips.3":
    "I lowered the solid in gently, so no water splashed out.",
  "experiments.method-of-mixtures-solid.tips.4":
    "I stirred the water all the time and read the highest temperature.",
  "experiments.method-of-mixtures-solid.tips.5":
    "I kept the lid on the lagged calorimeter to reduce heat lost to the room.",
  "experiments.method-of-mixtures-solid.tabulate.title": "Tabulate your readings",
  "experiments.method-of-mixtures-solid.tabulate.why":
    "Record the time t since the solid went in and the temperature θ read then, every minute, from the start.",
  "experiments.method-of-mixtures-solid.plot.title": "Plot θ against t",
  "experiments.method-of-mixtures-solid.plot.why":
    "Put t along the bottom and θ up the side, and plot your readings. The graph rises to its highest, then falls slowly: the highest point is T. There is no straight line to draw.",
  "experiments.method-of-mixtures-solid.analyse.title": "Find c from the heat given and taken",
  "experiments.method-of-mixtures-solid.analyse.why":
    "The heat the solid gives up cooling from 100 °C to T is the heat the water and calorimeter take in warming from T₀ to T: m_s c_s (100 − T) = (m_c c_c + m_w c_w)(T − T₀).",
  "experiments.method-of-mixtures-solid.analyse.tLead":
    "T, the highest temperature on your graph =",
  "experiments.method-of-mixtures-solid.analyse.cLead":
    "c_s = (m_c c_c + m_w c_w)(T − T₀) ⁄ (m_s (100 − T)) = ({mc} × {cc} + {mw} × {cw})({t} − {t0}) ⁄ ({ms} × (100 − {t})) =",
  "experiments.method-of-mixtures-solid.analyse.otherGraph":
    "Your graph is {y} against {x}. The question reads T from θ against t. Go back to Plot to change the axes.",
  "experiments.method-of-mixtures-solid.conclude.text":
    "The specific heat capacity of the solid is {c}. The solid S is {metal}, whose specific heat capacity is {true} J kg⁻¹ K⁻¹. The solid's temperature fell much more than the water's rose.",
  "lab.analyse.name.T": "T",
  "lab.analyse.name.c": "c",
  "findings.mixturesSolid.wrongGraph.title": "Plot θ against t",
  "findings.mixturesSolid.wrongGraph.detail":
    "Your graph is {y} against {x}. θ against t shows the temperature rising to its highest and then falling, which is how the question finds T.",
  "findings.mixturesSolid.wrongGraph.demonstrate":
    "Choose t for the axis along the bottom and θ for the axis up the side.",
  "experiments.method-of-mixtures-solid.report.title":
    "{experiment}: the specific heat capacity of a solid by the method of mixtures",
  "experiments.method-of-mixtures-solid.report.aim":
    "To find the specific heat capacity of a solid by putting it, hot from boiling water, into water in a lagged calorimeter.",
  "experiments.method-of-mixtures-solid.report.apparatus.solid":
    "A solid S of about {grams} g on a thread",
  "experiments.method-of-mixtures-solid.report.apparatus.balance": "A balance reading to {grams} g",
  "experiments.method-of-mixtures-solid.report.apparatus.calorimeter":
    "A {grams} g copper calorimeter with its stirrer, in a lagging jacket with a lid",
  "experiments.method-of-mixtures-solid.report.apparatus.thermometer":
    "A thermometer reading to {celsius} °C",
  "experiments.method-of-mixtures-solid.report.apparatus.heater":
    "A beaker of boiling water on a tripod over a heater",
  "experiments.method-of-mixtures-solid.report.benchCaption":
    "The solid S in the water in the calorimeter C, with the thermometer T, beside the balance B",
  "experiments.method-of-mixtures-solid.report.benchAlt":
    "{caption}: a balance, a beaker of boiling water over a heater, and a lagged copper calorimeter with the solid on a thread in its water.",
  "experiments.method-of-mixtures-solid.report.letter.B": "B",
  "experiments.method-of-mixtures-solid.report.letter.S": "S",
  "experiments.method-of-mixtures-solid.report.letter.C": "C",
  "experiments.method-of-mixtures-solid.report.letter.T": "T",
  "experiments.method-of-mixtures-solid.report.legend.B": "Balance",
  "experiments.method-of-mixtures-solid.report.legend.S": "Solid",
  "experiments.method-of-mixtures-solid.report.legend.C": "Lagged calorimeter",
  "experiments.method-of-mixtures-solid.report.legend.T": "Thermometer",
  "experiments.method-of-mixtures-solid.report.values.bench":
    "Solid {solid} g into {water} g of water; highest {highest} °C",
  "experiments.method-of-mixtures-solid.report.theory":
    "The heat the solid gives up cooling from the boiling water's temperature T_s to T is the heat the water and the calorimeter take in warming from T₀ to T: m_s c_s (T_s − T) = (m_c c_c + m_w c_w)(T − T₀), if no heat goes to the room.",
  "experiments.method-of-mixtures-solid.report.method.weigh":
    "I weighed the solid, then the calorimeter with its stirrer, empty and with water about half full, and put the lid on.",
  "experiments.method-of-mixtures-solid.report.method.transfer":
    "I heated the solid in boiling water, moved it quickly into the calorimeter, stirred, and read the temperature every minute until it fell.",
  "experiments.method-of-mixtures-solid.report.method.analyse":
    "I tabulated t and θ, plotted θ against t, read the highest temperature T from the graph, and worked out c from the equation.",
  "experiments.method-of-mixtures-solid.report.method.analyseOther":
    "I tabulated my readings and plotted {y} against {x}.",
  "experiments.method-of-mixtures-solid.report.observations.readings": "I took {n} runs.",
  "experiments.method-of-mixtures-solid.report.observations.one": "I took one run.",
  "experiments.method-of-mixtures-solid.report.observations.change":
    "The water rose from {t0} °C to {T} °C, by {rise} °C, while the solid fell from 100 °C to {T} °C, by {fall} °C.",
  "experiments.method-of-mixtures-solid.report.observations.peak":
    "The thermometer rose quickly, was highest within two minutes, then fell slowly.",
  "experiments.method-of-mixtures-solid.report.table":
    "The table shows the temperature every minute after the solid went in.",
  "experiments.method-of-mixtures-solid.report.graph":
    "Fig. 2 {caption} The temperature rises to its highest, T, then falls slowly.",
  "experiments.method-of-mixtures-solid.report.calcT":
    "T, the highest temperature on the graph = {T}",
  "experiments.method-of-mixtures-solid.report.calcC":
    "c_s = (m_c c_c + m_w c_w)(T − T₀) ⁄ (m_s (100 − T)) = ({mc} × {cc} + {mw} × {cw})({t} − {t0}) ⁄ ({ms} × (100 − {t})) = {c}",
  "experiments.method-of-mixtures-solid.report.calcMetal":
    "The solid is {metal}, whose specific heat capacity is {true} J kg⁻¹ K⁻¹.",
  "experiments.method-of-mixtures-solid.report.precaution.quick":
    "I moved the solid into the calorimeter quickly, to reduce heat lost on the way.",
  "experiments.method-of-mixtures-solid.report.precaution.shake":
    "I shook the solid before moving it, so no boiling water went in with it.",
  "experiments.method-of-mixtures-solid.report.precaution.gently":
    "I lowered the solid in gently, so no water splashed out.",
  "experiments.method-of-mixtures-solid.report.precaution.stir":
    "I stirred the water all the time.",
  "experiments.method-of-mixtures-solid.report.precaution.lid":
    "I kept the lid on the lagged calorimeter to reduce heat lost to the room.",
  "experiments.method-of-mixtures-solid.report.precaution.highest":
    "I read the temperature every minute until it fell, and took the highest.",
  "experiments.method-of-mixtures-solid.report.precaution.eye":
    "I read the thermometer with my eye level with the top of the mercury.",
  "experiments.method-of-mixtures-solid.report.source.early":
    "Some readings stopped before the temperature had reached its highest, so T is too small.",
  "experiments.method-of-mixtures-solid.report.source.slow":
    "The solid took too long to move across, so it went in below 100 °C.",
  "experiments.method-of-mixtures-solid.report.source.carried":
    "Boiling water went in with the solid, so its heat was counted as the solid's.",
  "experiments.method-of-mixtures-solid.report.source.splashed":
    "Water splashed out as the solid went in, so less water took the heat than was weighed.",
  "experiments.method-of-mixtures-solid.report.source.unstirred":
    "The water was not stirred, so the solid shared its heat slowly and more went to the room.",
  "experiments.method-of-mixtures-solid.report.source.uncovered":
    "The lid was off, so more heat went to the room.",
  "experiments.method-of-mixtures-solid.report.source.angle":
    "Some temperatures were read at an angle, so they are shifted by parallax.",
  "experiments.method-of-mixtures-solid.report.source.leastCount":
    "The balance reads to {grams} g and the thermometer to {celsius} °C.",
  "experiments.method-of-mixtures-solid.report.source.air":
    "In the {seconds} s the solid was in the air, it cooled to about {entry} °C before it went in.",
  "experiments.method-of-mixtures-solid.report.source.minutes":
    "Read every minute, the highest reading can miss the true highest, which falls between two minutes, by about {celsius} °C.",
  "experiments.method-of-mixtures-solid.report.conclusion":
    "The specific heat capacity of the solid S is {c}.",
  "experiments.method-of-mixtures-solid.report.conclusionNamed":
    "The specific heat capacity of the solid S is {c}. The solid is {metal}, whose specific heat capacity is {true} J kg⁻¹ K⁻¹.",
  "experiments.method-of-mixtures-solid.sheet.drawingTitle": "The hot solid, explained",
  "experiments.method-of-mixtures-solid.sheet.style":
    "A metal from boiling water into a lagged calorimeter",
  "experiments.method-of-mixtures-solid.sheet.question": "How much heat does a metal hold?",
  "experiments.method-of-mixtures-solid.sheet.lead":
    "A solid from boiling water gives its heat to cooler water. Weigh everything, read the highest temperature, and the heat given equals the heat taken tells you the metal's specific heat capacity.",
  "experiments.method-of-mixtures-solid.sheet.n.c":
    "J kg⁻¹ K⁻¹: c for copper, read every minute (true {cTrue})",
  "experiments.method-of-mixtures-solid.sheet.n.T":
    "°C: the highest reading for copper, from {room} °C",
  "experiments.method-of-mixtures-solid.sheet.n.at":
    "s after the solid goes in, when the temperature is highest",
  "experiments.method-of-mixtures-solid.sheet.n.al":
    "J kg⁻¹ K⁻¹: c for aluminium, with a highest of {alT} °C",
  "experiments.method-of-mixtures-solid.sheet.n.count": "metals the solid may be: {list}",
  "experiments.method-of-mixtures-solid.sheet.part.B":
    "Weighs to {balance} g: the solid, the calorimeter empty, and with its water.",
  "experiments.method-of-mixtures-solid.sheet.part.S":
    "Heated in boiling water at {boiling} °C. In the air it cools at about {air}% of its excess a minute, so move it quickly.",
  "experiments.method-of-mixtures-solid.sheet.part.C":
    "Copper, lagged and covered. Its heat capacity counts too, with c = {cc} J kg⁻¹ K⁻¹ given.",
  "experiments.method-of-mixtures-solid.sheet.part.T":
    "Reads to {thermometer} °C. Read it every minute until it falls.",
  "experiments.method-of-mixtures-solid.sheet.spec.solid": "Solid",
  "experiments.method-of-mixtures-solid.sheet.spec.solidValue":
    "{solid} g of copper, brass, iron or aluminium, named when c is found",
  "experiments.method-of-mixtures-solid.sheet.spec.masses": "Masses",
  "experiments.method-of-mixtures-solid.sheet.spec.massesValue":
    "Calorimeter {calorimeter} g; water {water} g, at {room} °C",
  "experiments.method-of-mixtures-solid.sheet.spec.scales": "Scales",
  "experiments.method-of-mixtures-solid.sheet.spec.scalesValue":
    "Balance to {balance} g, thermometer to {thermometer} °C",
  "experiments.method-of-mixtures-solid.sheet.spec.model": "Heat sharing",
  "experiments.method-of-mixtures-solid.sheet.spec.modelValue":
    "The solid shares its heat with the stirred water in {sharing} s; it cools {air}% a minute in the air",
  "experiments.method-of-mixtures-solid.sheet.spec.result": "Result",
  "experiments.method-of-mixtures-solid.sheet.spec.resultValue":
    "Copper read every minute: T = {T} °C, c = {c} J kg⁻¹ K⁻¹",
  "experiments.method-of-mixtures-solid.sheet.step.weigh.title": "Weigh everything",
  "experiments.method-of-mixtures-solid.sheet.step.weigh.text":
    "The solid, the calorimeter empty, then with {water} g of water.",
  "experiments.method-of-mixtures-solid.sheet.step.heat.title": "Heat the solid",
  "experiments.method-of-mixtures-solid.sheet.step.heat.text":
    "In boiling water at {boiling} °C, until it has been steady for some time.",
  "experiments.method-of-mixtures-solid.sheet.step.move.title": "Move it across",
  "experiments.method-of-mixtures-solid.sheet.step.move.text":
    "Shake it, carry it across in a few seconds, and lower it in. Lid on.",
  "experiments.method-of-mixtures-solid.sheet.step.read.title": "Read every minute",
  "experiments.method-of-mixtures-solid.sheet.step.read.text":
    "Stir, and read the temperature every minute until it falls. The highest is T: {T} °C for copper.",
  "experiments.method-of-mixtures-solid.sheet.step.plot.title": "Plot θ against t",
  "experiments.method-of-mixtures-solid.sheet.step.plot.text":
    "The curve rises to its highest, T, then falls slowly. No line to draw.",
  "experiments.method-of-mixtures-solid.sheet.why.title": "Why the heat balances",
  "experiments.method-of-mixtures-solid.sheet.why.text":
    "The solid gives up m_s c_s (100 − T); the water and calorimeter take in (m_c c_c + m_w c_w)(T − T₀). Set them equal and c_s is the only unknown: {c} J kg⁻¹ K⁻¹ for copper read every minute, against {cTrue}.",
  "experiments.method-of-mixtures-solid.sheet.motto": "Heat given is heat taken.",
  "experiments.method-of-mixtures-solid.exam.question.meta":
    "Question 1 · The method of mixtures: a hot solid · {minutes} minutes",
  "experiments.method-of-mixtures-solid.exam.question.lead":
    "Find the specific heat capacity of the solid S by the method of mixtures.",
  "experiments.method-of-mixtures-solid.exam.question.1":
    "Weigh the solid S, and the calorimeter with its stirrer, empty.",
  "experiments.method-of-mixtures-solid.exam.question.2":
    "Fill the calorimeter about half full of water at room temperature, weigh it again, and read the water's temperature T₀.",
  "experiments.method-of-mixtures-solid.exam.question.3":
    "Heat S in boiling water until it has been steady for some time. Record the boiling water's temperature T_s.",
  "experiments.method-of-mixtures-solid.exam.question.4":
    "Move S quickly but gently into the lagged calorimeter, cover it, stir, and read the temperature every minute until it is steady. Tabulate your readings.",
  "experiments.method-of-mixtures-solid.exam.question.5":
    "Plot the temperature against time, and find the highest temperature T. Given c_c = {cc} and c_w = {cw} J kg⁻¹ K⁻¹, find the specific heat capacity of S.",
  "experiments.method-of-mixtures-solid.exam.question.6": "State two precautions you took.",
  "experiments.method-of-mixtures-solid.exam.item.covered": "Lid on the lagged calorimeter",
  "experiments.method-of-mixtures-solid.exam.item.stirred": "Water stirred",
  "experiments.method-of-mixtures-solid.exam.item.weighed":
    "The solid and the calorimeter, empty and with water, weighed",
  "experiments.method-of-mixtures-solid.exam.item.transfer":
    "The solid moved quickly, shaken and lowered in",
  "experiments.method-of-mixtures-solid.exam.item.minutes":
    "Read every minute until the temperature fell",
  "experiments.method-of-mixtures-solid.exam.item.decimals":
    "Temperatures to the thermometer's least count",
  "experiments.method-of-mixtures-solid.exam.item.axes": "θ plotted against t, axes labelled",
  "experiments.method-of-mixtures-solid.exam.item.T": "T, the highest temperature, with its unit",
  "experiments.method-of-mixtures-solid.exam.item.c":
    "c from the equation, to 3 significant figures, with its unit",
  "experiments.method-of-mixtures-solid.exam.lost.covered": "The lid was off.",
  "experiments.method-of-mixtures-solid.exam.lost.stirred": "The water was not stirred.",
  "experiments.method-of-mixtures-solid.exam.lost.weighed": "Weighings done: {n} of 3.",
  "experiments.method-of-mixtures-solid.exam.lost.transfer":
    "Slips in moving the solid across: {n}.",
  "experiments.method-of-mixtures-solid.exam.lost.minutes": "Readings after the start: {n}.",
  "experiments.method-of-mixtures-solid.exam.lost.stoppedEarly":
    "The readings stopped before the highest temperature.",
  "experiments.method-of-mixtures-solid.exam.lost.thermometerDecimals":
    "Temperatures off the thermometer's least count: {n}.",
  "experiments.method-of-mixtures-solid.exam.lost.noRun": "No run was made.",
  "experiments.method-of-mixtures-solid.exam.lost.axesSolid": "The graph is not θ against t.",
  "experiments.method-of-mixtures-solid.exam.q.heat-capacity":
    "What is meant by the heat capacity of a body?",
  "experiments.method-of-mixtures-solid.exam.a.heat-capacity":
    "The heat energy needed to raise the temperature of the whole body by 1 K. It is its mass times its specific heat capacity, m c.",
  "experiments.method-of-mixtures-solid.exam.q.meaning":
    "The specific heat capacity of copper is {c} J kg⁻¹ K⁻¹. What does this mean?",
  "experiments.method-of-mixtures-solid.exam.a.meaning":
    "It takes {c} J of heat energy to raise the temperature of 1 kg of copper by 1 K.",
  "experiments.method-of-mixtures-solid.exam.q.aluminium":
    "How much heat energy is taken in when a piece of aluminium of mass {m} kg, specific heat capacity {c} J kg⁻¹ K⁻¹, is warmed from {from} °C to {to} °C?",
  "experiments.method-of-mixtures-solid.exam.a.aluminium":
    "Q = m c (θ₂ − θ₁) = {m} × {c} × {rise} = {q} J.",
  "experiments.method-of-mixtures-solid.metal.copper": "copper",
  "experiments.method-of-mixtures-solid.metal.brass": "brass",
  "experiments.method-of-mixtures-solid.metal.iron": "iron",
  "experiments.method-of-mixtures-solid.metal.aluminium": "aluminium",
  "experiments.method-of-mixtures-solid.refused.already-in":
    "The solid is already in. Empty the calorimeter to start again.",
  "experiments.method-of-mixtures-solid.refused.fill-first":
    "Put the water in the calorimeter first.",
  "experiments.method-of-mixtures-solid.refused.not-on-the-balance":
    "That is not on the balance as the bench stands.",
  "experiments.method-of-mixtures-solid.refused.not-a-number":
    "That is not something the bench can do.",
  "findings.mixturesSolid.readBeforePeak.title":
    "You read the thermometer before it stopped rising",
  "findings.mixturesSolid.readBeforePeak.detail":
    "In {count} run(s) the thermometer was still rising. You took the highest {seconds} s after the solid went in; it went on rising for {peakSeconds} s and reached {celsius} °C more.",
  "findings.mixturesSolid.readBeforePeak.demonstrate":
    "Keep stirring and reading every minute until the reading stops rising and starts to fall. The highest is the one before it falls.",
  "findings.mixturesSolid.slowTransfer.title": "The solid took too long to move across",
  "findings.mixturesSolid.slowTransfer.detail":
    "In {count} run(s) the solid was in the air for up to {seconds} s, so it went in at {entry} °C, not 100 °C. That makes c {percent}% off.",
  "findings.mixturesSolid.slowTransfer.demonstrate":
    "Have the calorimeter ready beside the beaker, and move the solid across in a few seconds.",
  "findings.mixturesSolid.waterCarried.title": "Boiling water went in with the solid",
  "findings.mixturesSolid.waterCarried.detail":
    "In {count} run(s) about {grams} g of boiling water clung to the solid and went in too. Its heat counts as the solid's, so c comes out {percent}% too large.",
  "findings.mixturesSolid.waterCarried.demonstrate":
    "Lift the solid out and give it a quick shake over the beaker before moving it across.",
  "findings.mixturesSolid.splashed.title": "Water splashed out of the calorimeter",
  "findings.mixturesSolid.splashed.detail":
    "In {count} run(s) the solid was dropped in and about {grams} g of water splashed out. Less water took the heat than you weighed, so c comes out {percent}% off.",
  "findings.mixturesSolid.splashed.demonstrate":
    "Lower the solid in gently on its thread, so no water splashes out.",
  "findings.mixturesSolid.notStirred.title": "The water was not stirred",
  "findings.mixturesSolid.notStirred.detail":
    "In {count} run(s) the solid shared its heat slowly, the highest came after about {minutes} minutes, and heat went to the room meanwhile. That makes c {percent}% off.",
  "findings.mixturesSolid.notStirred.demonstrate":
    "Stir gently all the time from the moment the solid goes in.",
  "findings.mixturesSolid.notCovered.title": "The calorimeter was not covered",
  "findings.mixturesSolid.notCovered.detail":
    "In {count} run(s) the lid was off, so the mixture lost heat to the room eight times as fast. That makes c {percent}% off.",
  "findings.mixturesSolid.notCovered.demonstrate":
    "Put the lid on as soon as the solid is in, and stir through the hole in it.",
  "findings.mixturesSolid.thermometerAtAngle.title": "The thermometer was read at an angle",
  "findings.mixturesSolid.thermometerAtAngle.detail":
    "You read the thermometer {angle}° off square-on. The mercury sits behind the scale, so the reading is out by {celsius} °C.",
  "findings.mixturesSolid.thermometerAtAngle.demonstrate":
    "Bring your eye level with the top of the mercury, so the scale's mark is straight in front of it.",
  // The model check (data templates brief, decision 4).
  "experiments.method-of-mixtures.check.note":
    "Read θ₁ just before you pour and θ₂ at the highest. Change the hot water's volume and temperature if yours differ.",
  "experiments.method-of-mixtures.check.hotVolume": "Hot water volume V₀",
  "experiments.method-of-mixtures.check.hotTemperature": "Hot water temperature θₕ",
  "experiments.method-of-mixtures.check.W": "Water equivalent of the calorimeter W",
  "experiments.method-of-mixtures.check.needs":
    "Give the hot water's volume and temperature to check your readings against the model.",
  "experiments.method-of-mixtures.check.template.body":
    "Fill it in during your lab. The volumes are set as the book has them, and the hot water as 50 cm³ at 65 °C; change those if yours differ. Read θ₁ just before you pour and θ₂ at the highest. Add the calorimeter's water equivalent W if you know it.",
  "experiments.method-of-mixtures.check.table.note":
    "T = θ₂ − θ₁ and 1/T are worked out here, as in the lab.",
  "experiments.method-of-mixtures.check.graph.title":
    "Fig. 1  V against 1/T: your readings and the model",
  "experiments.method-of-mixtures.check.graph.label":
    "{n} readings of V against 1/T, your best line through them, and the model's dashed line.",
  "experiments.method-of-mixtures.check.legend.model": "The model, V₀ (θₕ − θ₁) ⁄ T − (V₀ + W)",
  "experiments.method-of-mixtures.check.shift.unmarked":
    "Add the calorimeter's water equivalent W to compare where your line meets the V axis.",
  "experiments.method-of-mixtures.check.shift.on":
    "Your line meets the V axis at −(V₀ + W), within its error.",
  "experiments.method-of-mixtures.check.shift.found":
    "Your line meets the V axis away from −(V₀ + W).",
  "experiments.method-of-mixtures.check.shift.figure": "W = {W} cm³",
  "experiments.method-of-mixtures.check.tilt.on":
    "Your slope is V₀ (θₕ − θ₁), within its error and what even a careful run loses.",
  "experiments.method-of-mixtures.check.tilt.found.lower": "Your slope is lower than V₀ (θₕ − θ₁).",
  "experiments.method-of-mixtures.check.tilt.found.higher":
    "Your slope is higher than V₀ (θₕ − θ₁).",
  "experiments.method-of-mixtures.check.tilt.figure": "{value} cm³ °C, {errors} errors",
  "experiments.method-of-mixtures.check.spread.on":
    "Your points spread as much as the cylinder and the thermometer allow, no more.",
  "experiments.method-of-mixtures.check.spread.found":
    "Your points spread {times} times more than the cylinder and the thermometer allow.",
  "experiments.method-of-mixtures.check.spread.figure": "{value} cm³, {ratio} ×",
  "experiments.method-of-mixtures.check.tilt.lower":
    "Your slope is {percent}% lower than the hot water could give: heat was lost before the highest temperature was read, so every T came out low. Heat leaves while the hot water waits to be poured, with the lid off, and while the water is not stirred.",
  "experiments.method-of-mixtures.check.tilt.lower.precaution":
    "Pour as soon as the hot water reaches its temperature, keep the lid on, and stir until you have read the highest temperature.",
  "experiments.method-of-mixtures.check.tilt.higher":
    "Your slope is {percent}% higher than the hot water could give. The hot water may have been hotter, or more of it, than you entered.",
  "experiments.method-of-mixtures.check.tilt.higher.precaution":
    "Read the hot water's temperature just before you pour, and measure its volume square-on in the cylinder.",
  "experiments.method-of-mixtures.check.shift":
    "Your line gives W = {W} cm³, not the {given} cm³ you entered.",
  "experiments.method-of-mixtures.check.shift.precaution":
    "Check the W you entered, and keep the lid on and stir, so that heat lost does not move the line.",
  "experiments.method-of-mixtures.check.spread":
    "Your points spread either side of your line by about {times} times what the cylinder and the thermometer allow.",
  "experiments.method-of-mixtures.check.spread.precaution":
    "Read the cylinder at the bottom of the meniscus and the thermometer square-on, at the highest temperature each time.",
  "experiments.method-of-mixtures.check.result":
    "From your line: slope {slope} cm³ °C, meeting the V axis at {intercept} cm³, so W = {W} cm³. Lab data is not marked.",
  // The hot solid's model check (data templates brief, decision 4).
  "experiments.method-of-mixtures-solid.check.note":
    "Read the water's temperature as the solid goes in (t = 0), then every minute. Change the masses and the boiling water's temperature if yours differ.",
  "experiments.method-of-mixtures-solid.check.solid": "Mass of the solid",
  "experiments.method-of-mixtures-solid.check.empty": "Mass of the calorimeter, empty",
  "experiments.method-of-mixtures-solid.check.filled": "Mass of the calorimeter with water",
  "experiments.method-of-mixtures-solid.check.boiling": "Temperature of the boiling water",
  "experiments.method-of-mixtures-solid.check.c": "Specific heat capacity of the metal c",
  "experiments.method-of-mixtures-solid.check.needs":
    "Give the masses and the boiling water's temperature to check your readings against the model.",
  "experiments.method-of-mixtures-solid.check.template.body":
    "Fill it in during your lab. The masses are set as the book has them; weigh yours and change them. Read the water's temperature as the solid goes in, then every minute until it has turned. Add the metal's specific heat capacity if you know which metal it is.",
  "experiments.method-of-mixtures-solid.check.table.note":
    "The first reading, at t = 0, is the water's temperature as the solid goes in.",
  "experiments.method-of-mixtures-solid.check.graph.title":
    "Fig. 1  θ against t: your readings and the model",
  "experiments.method-of-mixtures-solid.check.graph.label":
    "{n} readings of θ against t, and the model's dashed curve for your masses.",
  "experiments.method-of-mixtures-solid.check.legend.model": "The model, for your masses",
  "experiments.method-of-mixtures-solid.check.shift.unmarked":
    "Add the metal's specific heat capacity to compare your readings' level with the model's.",
  "experiments.method-of-mixtures-solid.check.shift.on":
    "Your readings sit on the model's curve, within their error.",
  "experiments.method-of-mixtures-solid.check.shift.found.below":
    "Your readings sit below the model's curve.",
  "experiments.method-of-mixtures-solid.check.shift.found.above":
    "Your readings sit above the model's curve.",
  "experiments.method-of-mixtures-solid.check.shift.figure": "{value} °C, {errors} errors",
  "experiments.method-of-mixtures-solid.check.tilt.on":
    "Your readings rise and fall as the model's do.",
  "experiments.method-of-mixtures-solid.check.tilt.found.falls":
    "Your readings fall away faster than the model's.",
  "experiments.method-of-mixtures-solid.check.tilt.found.late":
    "Your readings reach their highest later than the model's.",
  "experiments.method-of-mixtures-solid.check.tilt.figure": "{value} °C a minute, {errors} errors",
  "experiments.method-of-mixtures-solid.check.spread.on":
    "Your readings spread as much as the thermometer's least count gives, no more.",
  "experiments.method-of-mixtures-solid.check.spread.found":
    "Your readings spread {times} times more than the thermometer's least count gives.",
  "experiments.method-of-mixtures-solid.check.spread.figure": "{value} °C, {ratio} ×",
  "experiments.method-of-mixtures-solid.check.shift.below":
    "Your readings sit {by} °C below the model's curve for c = {given} J kg⁻¹ K⁻¹, so c from your highest reading, {c}, comes out low. Heat was lost on the way: a solid moved across slowly cools in the air.",
  "experiments.method-of-mixtures-solid.check.shift.below.precaution":
    "Move the solid from the boiling water into the calorimeter in a few seconds.",
  "experiments.method-of-mixtures-solid.check.shift.above":
    "Your readings sit {by} °C above the model's curve for c = {given} J kg⁻¹ K⁻¹, so c from your highest reading, {c}, comes out high. Boiling water carried in on the solid adds heat, and water splashed out leaves less to warm.",
  "experiments.method-of-mixtures-solid.check.shift.above.precaution":
    "Shake the solid before you move it, and lower it in gently.",
  "experiments.method-of-mixtures-solid.check.tilt.falls":
    "Your readings fall away by about {rate} °C a minute more than the model's: heat is leaving the calorimeter, as it does with the lid off.",
  "experiments.method-of-mixtures-solid.check.tilt.falls.precaution":
    "Keep the lid on from the moment the solid is in.",
  "experiments.method-of-mixtures-solid.check.tilt.late":
    "Your readings reach their highest later than the model's: the solid shared its heat slowly, as it does when the water is not stirred.",
  "experiments.method-of-mixtures-solid.check.tilt.late.precaution":
    "Stir all the time until you have read the highest temperature.",
  "experiments.method-of-mixtures-solid.check.spread":
    "Your readings spread either side of the model's curve by about {times} times what the thermometer's least count gives.",
  "experiments.method-of-mixtures-solid.check.spread.precaution":
    "Read the thermometer square-on, on the minute, each time.",
  "experiments.method-of-mixtures-solid.check.result":
    "From your highest reading, {highest} °C: c = {c} J kg⁻¹ K⁻¹ by the book's equation. Lab data is not marked.",
} as const;
