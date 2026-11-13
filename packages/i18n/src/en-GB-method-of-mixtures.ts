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
    "{caption}. The points lie on a straight line, carried back to meet the V axis below zero.",
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
  "experiments.method-of-mixtures.exam.question.meta": "Practical, {minutes} minutes",
  "experiments.method-of-mixtures.exam.question.lead":
    "You are provided with a lagged calorimeter with a stirrer and a lid, a thermometer, a measuring cylinder, a beaker and a heater.",
  "experiments.method-of-mixtures.exam.question.1":
    "Heat {hot} cm³ of water in the beaker to {hotT} °C.",
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
} as const;
