/**
 * English (en-GB) messages for Ohm's law and the potentiometer, kept apart from the shared file
 * so the other labs and the app shell do not download them. The Ohm's law lab registers them by
 * importing "@pa/i18n/ohms-law". Copy follows AGENTS.md rule 6.
 */
export const enGBOhmsLaw = {
  "findings.ohmsLaw.ammeterReversed.title": "The ammeter is the wrong way round",
  "findings.ohmsLaw.ammeterReversed.detail":
    "Current must go into the ammeter at its + terminal. Connected backwards, its needle kicks against the stop below zero and reads nothing.",
  "findings.ohmsLaw.ammeterReversed.demonstrate":
    "Follow the current from the cell's + terminal: through R, then into the ammeter's red (+) terminal and out of its black (−).",
  "findings.ohmsLaw.voltmeterReversed.title": "The voltmeter is the wrong way round",
  "findings.ohmsLaw.voltmeterReversed.detail":
    "The voltmeter's + terminal goes to the cell's + side. Backwards, its needle pins at zero.",
  "findings.ohmsLaw.voltmeterReversed.demonstrate":
    "Join red to red: the voltmeter's + to the cell's +, and its − to the cell's −.",
  "findings.ohmsLaw.metersSwapped.title": "The ammeter and voltmeter are in each other's places",
  "findings.ohmsLaw.metersSwapped.detail":
    "An ammeter goes in series, in the loop the current flows round. A voltmeter goes across what it measures, here the cell. The other way round, the voltmeter stops the current and the ammeter shorts the cell.",
  "findings.ohmsLaw.metersSwapped.demonstrate":
    "The ammeter is one link in the chain from the cell through R to the wire. The voltmeter sits beside the cell, one lead on each terminal.",
  "findings.ohmsLaw.voltmeterAcrossResistor.title": "The voltmeter is across R, not the cell",
  "findings.ohmsLaw.voltmeterAcrossResistor.detail":
    "Across R it reads I R, which rises with the current, so your graph would slope upwards and say nothing about the cell. Move its leads to the cell's terminals to read the terminal p.d.",
  "findings.ohmsLaw.voltmeterAcrossResistor.demonstrate":
    "Look at the circuit diagram: the voltmeter's two leads go either side of the cell, not either side of R.",
  "findings.ohmsLaw.jockeyToQ.title": "The jockey's lead goes to Q",
  "findings.ohmsLaw.jockeyToQ.detail":
    "From Q, the jockey cuts out the length JQ, so the current falls as you move it further from P, and the lengths in your table no longer mean what the question says. Take the lead to P.",
  "findings.ohmsLaw.jockeyToQ.demonstrate":
    "P is the end of the wire joined to the key. The jockey's lead starts there, so PJ is the length it cuts out.",
  "findings.ohmsLaw.wiringWrong.title": "The circuit does not match the diagram",
  "findings.ohmsLaw.wiringWrong.detail":
    "{terminals} terminals are joined to the wrong places. The lit terminals are the ones to check against the circuit diagram.",
  "findings.ohmsLaw.keyLeftClosed.title": "The key was closed for {seconds} s",
  "findings.ohmsLaw.keyLeftClosed.detail":
    "While current flows, the cell runs down: in that time its emf fell by about {millivolts} mV, so later readings sit below the line. Open the key as soon as each reading is taken.",
  "findings.ohmsLaw.keyLeftClosed.demonstrate":
    "Close the key, read both meters, then open it again before you move the jockey.",
  "findings.ohmsLaw.jockeySlid.title": "The jockey was slid along the wire",
  "findings.ohmsLaw.jockeySlid.detail":
    "Sliding it scraped {centimetres} cm of the wire thinner, so that stretch now has about {percent}% more resistance per centimetre and the wire is no longer uniform. Lift the jockey, move it, then press it down.",
  "findings.ohmsLaw.jockeySlid.demonstrate":
    "Lift the jockey clear of the wire, set it over the next mark, and tap it straight down.",
  "experiments.ohms-law.title": "Ohm's law and the potentiometer",
  "experiments.ohms-law.figure": "Fig. 1",
  "experiments.ohms-law.build.removeShort": "Remove",
  "experiments.ohms-law.question.title": "The terminal p.d. of a cell",
  "experiments.ohms-law.question.text":
    "Connect the circuit in the diagram. Close the key and record the ammeter reading I and the voltmeter reading V with the jockey not touching the wire. Then press the jockey on the wire at J, with PJ = 40 cm, and record I and V. Repeat with PJ = 50, 60, 70 and 80 cm. Plot I against V, and find the slope of the graph and the value of V when I = 0.",
  "experiments.ohms-law.predict.title": "What will the voltmeter do?",
  "experiments.ohms-law.predict.text":
    "Pressing the jockey further from P cuts more of the wire out of the circuit, so more current flows. As the current rises, what happens to the voltmeter reading across the cell?",
  "experiments.ohms-law.predict.rise": "It rises",
  "experiments.ohms-law.predict.fall": "It falls",
  "experiments.ohms-law.predict.same": "It stays the same",
  "experiments.ohms-law.predict.saved": "You said: {choice}. Measure and see.",
  "experiments.ohms-law.build.title": "Wire the circuit",
  "experiments.ohms-law.build.why":
    "Join two terminals with a lead: drag from one to the other, or choose one and then the other. Follow the diagram; the order you join them in does not matter.",
  "experiments.ohms-law.build.diagram":
    "Circuit diagram: the cells E, the key K, the resistor R and the ammeter A in series with the potentiometer wire PQ; the jockey J on the wire is joined to P; the voltmeter V is across the cells.",
  "experiments.ohms-law.build.joined": "{count} of {total} leads joined",
  "experiments.ohms-law.build.remove": "Remove the lead from {from} to {to}",
  "experiments.ohms-law.build.from": "Lead from {terminal}: choose where it goes",
  "experiments.ohms-law.build.connected": "Lead joined: {from} to {to}",
  "experiments.ohms-law.build.cancel": "Cancel this lead",
  "experiments.ohms-law.leads.cell+~R.1": "The cells' + to R",
  "experiments.ohms-law.leads.R.2~A+": "R to the ammeter's +",
  "experiments.ohms-law.leads.A-~wire.Q": "The ammeter's − to Q",
  "experiments.ohms-law.leads.jockey~wire.P": "The jockey's lead to P",
  "experiments.ohms-law.leads.wire.P~key.1": "P to the key",
  "experiments.ohms-law.leads.key.2~cell-": "The key to the cells' −",
  "experiments.ohms-law.leads.V+~cell+": "The voltmeter's + to the cells' +",
  "experiments.ohms-law.leads.V-~cell-": "The voltmeter's − to the cells' −",
  "experiments.ohms-law.terminals.cell+": "the cells' + terminal",
  "experiments.ohms-law.terminals.cell-": "the cells' − terminal",
  "experiments.ohms-law.terminals.key.1": "the key's left terminal",
  "experiments.ohms-law.terminals.key.2": "the key's right terminal",
  "experiments.ohms-law.terminals.R.1": "R's left terminal",
  "experiments.ohms-law.terminals.R.2": "R's right terminal",
  "experiments.ohms-law.terminals.A+": "the ammeter's + terminal",
  "experiments.ohms-law.terminals.A-": "the ammeter's − terminal",
  "experiments.ohms-law.terminals.V+": "the voltmeter's + terminal",
  "experiments.ohms-law.terminals.V-": "the voltmeter's − terminal",
  "experiments.ohms-law.terminals.wire.P": "the end P of the wire",
  "experiments.ohms-law.terminals.wire.Q": "the end Q of the wire",
  "experiments.ohms-law.terminals.jockey": "the jockey",
  "experiments.ohms-law.check.title": "Check the circuit",
  "experiments.ohms-law.check.right": "The circuit matches the diagram. Next, take the readings.",
  "experiments.ohms-law.check.fix": "Back to wiring",
  "experiments.ohms-law.measure.title": "Read I and V",
  "experiments.ohms-law.measure.why":
    "Close the key, press the jockey at the length, and read both meters with your eye square-on. Then open the key straight away, so the cell does not run down. Take a reading with the jockey lifted, then at PJ = 40, 50, 60, 70 and 80 cm; then take them all again with PJ decreasing, for the second set.",
  "experiments.ohms-law.measure.closeKey": "Close the key",
  "experiments.ohms-law.measure.openKey": "Open the key",
  "experiments.ohms-law.measure.position": "Jockey position, PJ",
  "experiments.ohms-law.measure.press": "Press the jockey",
  "experiments.ohms-law.measure.lift": "Lift the jockey",
  "experiments.ohms-law.measure.ammeter": "Ammeter, reads to 0.02 A",
  "experiments.ohms-law.measure.voltmeter": "Voltmeter, reads to 0.05 V",
  "experiments.ohms-law.measure.keyClosedFor": "Key closed for",
  "experiments.ohms-law.measure.pinnedLow": "The needle is hard against the stop below zero",
  "experiments.ohms-law.measure.pinnedHigh": "The needle is hard against full scale",
  "experiments.ohms-law.measure.take": "Take this reading",
  "experiments.ohms-law.measure.readings": "Readings so far",
  "experiments.ohms-law.measure.none":
    "None yet. Close the key and take the first with the jockey lifted.",
  "experiments.ohms-law.measure.reading": "{position}: {current} A, {voltage} V",
  "experiments.ohms-law.measure.noContact": "No contact",
  "experiments.ohms-law.tabulate.title": "Tabulate your readings",
  "experiments.ohms-law.tabulate.why":
    "Record PJ, I and V for each position, with the units in the headings and each reading to the ammeter's or voltmeter's least count.",
  "experiments.ohms-law.plot.title": "Plot I against V",
  "experiments.ohms-law.plot.why":
    "Put I on the vertical axis and V on the horizontal, both starting from zero, so the line can be carried on to meet the V axis. Then draw the best straight line and a large slope triangle.",
  "experiments.ohms-law.analyse.title": "Find E and r",
  "experiments.ohms-law.analyse.why":
    "The slope of your line is −1 ⁄ r, and the line meets the V axis at E, where no current flows.",
  "experiments.ohms-law.analyse.slopeLead": "slope = CB ⁄ AC = {rise} {yu} ⁄ {run} {xu} =",
  "experiments.ohms-law.analyse.eLead": "E = V where I = 0, read from your line =",
  "experiments.ohms-law.analyse.rLead": "r = −1 ⁄ slope = −1 ⁄ ({slope}) =",
  "experiments.ohms-law.analyse.otherGraph":
    "Your graph is {y} against {x}. E and r come from a graph of I against V.",
  "experiments.ohms-law.conclude.text":
    "From your graph, the cell's emf E is {E} and its internal resistance r is {r}. The voltmeter reads less than E whenever current flows, because part of E drives the current through the cell itself.",
  "experiments.ohms-law.report.title": "{experiment}: the emf and internal resistance of a cell",
  "experiments.ohms-law.report.aim":
    "To determine the emf E and the internal resistance r of a cell, using a potentiometer wire, an ammeter and a voltmeter.",
  "experiments.ohms-law.report.apparatus.cells": "Two {emf} V dry cells in series, in a holder (E)",
  "experiments.ohms-law.report.apparatus.resistor": "A {r} Ω resistor (R)",
  "experiments.ohms-law.report.apparatus.ammeter": "An ammeter reading 0 to {max} A (A)",
  "experiments.ohms-law.report.apparatus.voltmeter": "A voltmeter reading 0 to {max} V (V)",
  "experiments.ohms-law.report.apparatus.wire":
    "A potentiometer wire {length} m long, on a metre rule (PQ)",
  "experiments.ohms-law.report.apparatus.jockey": "A jockey (J)",
  "experiments.ohms-law.report.apparatus.key": "A plug key (K)",
  "experiments.ohms-law.report.apparatus.leads": "Connecting leads",
  "experiments.ohms-law.report.benchCaption":
    "The circuit. The cells E, the key K, the resistor R, the ammeter A and the wire PQ in series, the voltmeter V across the cells, and the jockey J on a lead from P.",
  "experiments.ohms-law.report.benchCaptionAsWired": "The circuit as it was wired.",
  "experiments.ohms-law.report.benchAlt": "{caption}: the circuit on the bench",
  "experiments.ohms-law.report.legend.E": "two dry cells",
  "experiments.ohms-law.report.legend.K": "plug key",
  "experiments.ohms-law.report.legend.R": "resistor",
  "experiments.ohms-law.report.legend.A": "ammeter",
  "experiments.ohms-law.report.legend.V": "voltmeter",
  "experiments.ohms-law.report.legend.PQ": "potentiometer wire",
  "experiments.ohms-law.report.legend.J": "jockey",
  "experiments.ohms-law.report.values.leads": "{count} leads",
  "experiments.ohms-law.report.theory":
    "A cell of emf E and internal resistance r that drives a current I has a terminal potential difference V = E − Ir. So I = (E − V) ⁄ r: a graph of I against V is a straight line of slope −1 ⁄ r, which meets the V axis, where I = 0, at V = E. Pressing the jockey on the wire at J cuts the length PJ out of the circuit, so the current rises and V falls.",
  "experiments.ohms-law.report.method.wire":
    "I connected the circuit as in Fig. 1, with the voltmeter across the cells.",
  "experiments.ohms-law.report.method.wireAsIs": "I connected the circuit as in Fig. 1.",
  "experiments.ohms-law.report.method.readings":
    "With the key closed, I read I and V with the jockey off the wire, then with it pressed on the wire at each position from PJ = {min} cm to {max} cm. I opened the key after each reading.",
  "experiments.ohms-law.report.method.repeat":
    "I took a second set of readings with PJ decreasing.",
  "experiments.ohms-law.report.method.analyse":
    "I plotted I against V, drew the best straight line, and found its slope and where it meets the V axis.",
  "experiments.ohms-law.report.method.analyseOther":
    "I plotted {y} against {x} and drew the best straight line.",
  "experiments.ohms-law.report.observations.meters":
    "The ammeter read to {amps} A and the voltmeter to {volts} V. I took {n} readings.",
  "experiments.ohms-law.report.observations.positions":
    "The jockey was pressed at {positions} positions, from PJ = {min} cm to {max} cm.",
  "experiments.ohms-law.report.observations.one":
    "The jockey was pressed at one position, PJ = {min} cm.",
  "experiments.ohms-law.report.observations.noContact":
    "One set was taken with the jockey off the wire.",
  "experiments.ohms-law.report.table":
    "Table 1 The ammeter and voltmeter readings at each position of the jockey.",
  "experiments.ohms-law.report.graph":
    "Fig. 2 {caption} The slope is found from triangle ABC, and E where the line meets the V axis.",
  "experiments.ohms-law.report.calcE": "E = V where I = 0, read from the line: {E}",
  "experiments.ohms-law.report.calcR": "r = −1 ⁄ slope = −1 ⁄ ({slope}) = {r}",
  "experiments.ohms-law.report.precaution.key":
    "I opened the key as soon as each reading was taken, so the cells did not run down.",
  "experiments.ohms-law.report.precaution.jockey":
    "I pressed the jockey on the wire and lifted it off, and did not slide it along the wire.",
  "experiments.ohms-law.report.precaution.parallax":
    "I read each scale with my eye directly above the pointer, to avoid parallax.",
  "experiments.ohms-law.report.precaution.connections":
    "I made sure every connection was clean and tight.",
  "experiments.ohms-law.report.precaution.repeat":
    "I took a second set of readings with PJ decreasing and used the mean of each pair.",
  "experiments.ohms-law.report.source.keyLeftClosed":
    "The key was left closed between readings, so the cells ran down and some readings of V were low.",
  "experiments.ohms-law.report.source.jockeySlid":
    "The jockey was slid along the wire, which scrapes it, so its resistance is no longer the same all along.",
  "experiments.ohms-law.report.source.leastCount":
    "The meters read only to {amps} A and {volts} V.",
  "experiments.ohms-law.report.source.voltmeter":
    "The voltmeter takes a small current of its own, so the line meets the V axis a little below E.",
  "experiments.ohms-law.report.source.contact":
    "The contact between the jockey and the wire has a small resistance of its own.",
  "experiments.ohms-law.report.conclusion":
    "The emf of the cells was found to be {E}, and their internal resistance {r}.",
  "experiments.ohms-law.bench":
    "{state}. The key is {key}. {jockey}. The ammeter reads {current} A and the voltmeter {voltage} V.",
  "experiments.ohms-law.benchWired": "The circuit has {count} leads",
  "experiments.ohms-law.keyOpen": "open",
  "experiments.ohms-law.keyClosed": "closed",
  "experiments.ohms-law.jockeyLifted": "The jockey is lifted",
  "experiments.ohms-law.jockeyPressed": "The jockey is pressed at PJ = {pj} cm",
  "experiments.ohms-law.sheet.drawingTitle":
    "Ohm's law and the potentiometer: how the line gives E and r",
  "experiments.ohms-law.sheet.style": "Find E and r from one graph",
  "experiments.ohms-law.sheet.question": "Why does a cell's voltage drop when it drives a current?",
  "experiments.ohms-law.sheet.lead":
    "Part of a cell's emf is spent driving the current through the cell itself. Plot I against V, and one straight line gives both the emf and the internal resistance.",
  "experiments.ohms-law.sheet.n.E": "emf, where the line meets the V axis",
  "experiments.ohms-law.sheet.n.r": "internal resistance, −1 ⁄ slope",
  "experiments.ohms-law.sheet.n.slope": "slope of I against V",
  "experiments.ohms-law.sheet.n.positions": "positions of the jockey",
  "experiments.ohms-law.sheet.n.lost": "lost inside the cells at PJ = {last} cm",
  "experiments.ohms-law.sheet.part.E":
    "Two {cellEmf} V cells in series. Part of their emf drives the current through the cells themselves.",
  "experiments.ohms-law.sheet.part.K":
    "Open it as soon as each reading is taken, or the cells run down.",
  "experiments.ohms-law.sheet.part.R": "{R} Ω. It keeps the current within the ammeter's range.",
  "experiments.ohms-law.sheet.part.A":
    "In series with the cells. Reads 0 to {ampsMax} A, to {amps} A.",
  "experiments.ohms-law.sheet.part.V":
    "Across the cells, so it reads their terminal p.d. Reads 0 to {voltsMax} V, to {volts} V.",
  "experiments.ohms-law.sheet.part.PQ":
    "{length} m of constantan, {wireOhms} Ω. Pressing the jockey at J cuts the length PJ out of the circuit.",
  "experiments.ohms-law.sheet.part.J":
    "Press it on the wire and lift it off. Sliding it scrapes the wire.",
  "experiments.ohms-law.sheet.spec.cells": "Cells",
  "experiments.ohms-law.sheet.spec.cellsValue":
    "Two {cellEmf} V dry cells: E = {emf} V, r = {cellR} Ω",
  "experiments.ohms-law.sheet.spec.resistor": "Resistor R",
  "experiments.ohms-law.sheet.spec.resistorValue": "{R} Ω",
  "experiments.ohms-law.sheet.spec.wire": "Wire PQ",
  "experiments.ohms-law.sheet.spec.wireValue": "{length} m of constantan, {wireOhms} Ω",
  "experiments.ohms-law.sheet.spec.ammeter": "Ammeter",
  "experiments.ohms-law.sheet.spec.ammeterValue": "0 to {ampsMax} A, reads to {amps} A",
  "experiments.ohms-law.sheet.spec.voltmeter": "Voltmeter",
  "experiments.ohms-law.sheet.spec.voltmeterValue": "0 to {voltsMax} V, reads to {volts} V",
  "experiments.ohms-law.sheet.spec.positions": "Jockey",
  "experiments.ohms-law.sheet.spec.positionsValue": "PJ = {list} cm",
  "experiments.ohms-law.sheet.spec.result": "From the line",
  "experiments.ohms-law.sheet.spec.resultValue": "E = {E} V, r = {r} Ω",
  "experiments.ohms-law.sheet.step.wire.title": "Wire the circuit",
  "experiments.ohms-law.sheet.step.wire.text":
    "Join the cells, the key K, the resistor R, the ammeter and the wire PQ in series, and the voltmeter across the cells. A lead from P ends in the jockey J.",
  "experiments.ohms-law.sheet.step.noContact.title": "Read with the jockey off the wire",
  "experiments.ohms-law.sheet.step.noContact.text":
    "Close the key and read both meters: I = {I0} A and V = {V0} V. Then open the key.",
  "experiments.ohms-law.sheet.step.jockey.title": "Press the jockey at PJ = {pj} cm",
  "experiments.ohms-law.sheet.step.jockey.text":
    "The length PJ is cut out of the circuit, so the current rises to {I} A and V falls to {V} V. Read both meters, then lift the jockey.",
  "experiments.ohms-law.sheet.step.positions.title": "Repeat at {count} positions",
  "experiments.ohms-law.sheet.step.positions.text":
    "Take I and V at PJ = {list} cm, opening the key after each reading so the cells do not run down. Then take them again with PJ decreasing.",
  "experiments.ohms-law.sheet.step.plot.title": "Plot I against V",
  "experiments.ohms-law.sheet.step.plot.text":
    "The line's slope is {slope} A V⁻¹, so r = −1 ⁄ slope = {r} Ω. Carried on to the V axis, where I = 0, it meets it at E = {E} V.",
  "experiments.ohms-law.sheet.why.title": "Why open the key after each reading?",
  "experiments.ohms-law.sheet.why.text":
    "While a dry cell drives a current, its emf sags a little as it polarises, and it recovers while the key is open. Leave the key closed and the later readings of V come out low, so those points fall below the line.",
  "experiments.ohms-law.sheet.motto": "Press, read, lift, open the key",
  "experiments.ohms-law.exam.question.meta":
    "Question 1 · Ohm's law and the potentiometer · {minutes} minutes",
  "experiments.ohms-law.exam.question.lead":
    "Find the emf and the internal resistance of the cells.",
  "experiments.ohms-law.exam.question.1":
    "Connect the circuit as shown in the diagram, with the voltmeter across the cells.",
  "experiments.ohms-law.exam.question.2":
    "Close the key K. Record the ammeter reading I and the voltmeter reading V with the jockey not touching the wire.",
  "experiments.ohms-law.exam.question.3":
    "Press the jockey on the wire at J, with PJ = {list} cm in turn, and record I and V at each. Open the key after each reading.",
  "experiments.ohms-law.exam.question.4":
    "Tabulate your readings. Plot a graph of I on the vertical axis against V on the horizontal axis.",
  "experiments.ohms-law.exam.question.5":
    "Find the slope s of the graph and the value of V where I = 0. Calculate r = −1 ⁄ s. State two precautions you took.",
  "experiments.ohms-law.exam.question.6":
    "Part (b): answer the questions that follow the experiment.",
  "experiments.ohms-law.exam.item.circuit": "Circuit connected as the diagram shows",
  "experiments.ohms-law.exam.item.voltmeterAcross": "Voltmeter across the cells",
  "experiments.ohms-law.exam.item.positions": "Readings at five positions of the jockey",
  "experiments.ohms-law.exam.item.noContact": "A reading with the jockey off the wire",
  "experiments.ohms-law.exam.item.decimals": "Readings to the meters' least counts",
  "experiments.ohms-law.exam.item.means": "Means of I and V worked out correctly",
  "experiments.ohms-law.exam.item.keyOpened": "Key opened between readings",
  "experiments.ohms-law.exam.item.axes": "I plotted against V, axes labelled",
  "experiments.ohms-law.exam.item.E": "E where the line meets the V axis, with its unit",
  "experiments.ohms-law.exam.item.r": "r from −1 ⁄ slope, with its unit",
  "experiments.ohms-law.exam.lost.circuit": "The circuit is not connected as the diagram shows.",
  "experiments.ohms-law.exam.lost.voltmeterAcross": "The voltmeter is not across the cells.",
  "experiments.ohms-law.exam.lost.positions": "Positions read: {n} of 5.",
  "experiments.ohms-law.exam.lost.noContact": "No reading with the jockey off the wire.",
  "experiments.ohms-law.exam.lost.meterDecimals": "Readings off the meters' least counts: {n}.",
  "experiments.ohms-law.exam.lost.noMeans": "No columns for the means of I and V.",
  "experiments.ohms-law.exam.lost.keyOpened":
    "The key was left closed between readings, so the cells ran down.",
  "experiments.ohms-law.exam.lost.axesIV": "The graph is not I against V.",
  "experiments.ohms-law.exam.q.lost-volts":
    "At PJ = {pj} cm the ammeter reads {I} A and the voltmeter {V} V. The emf of the cells is {E} V. Find the lost volts and the internal resistance r.",
  "experiments.ohms-law.exam.a.lost-volts":
    "Lost volts = E − V = {E} − {V} = {lost} V. r = lost volts ⁄ I = {lost} ⁄ {I} = {r} Ω.",
  "experiments.ohms-law.exam.q.no-contact":
    "With the jockey off the wire, the voltmeter still reads less than the emf. Why?",
  "experiments.ohms-law.exam.a.no-contact":
    "The key is closed, so the cells still drive a current through R, the ammeter and the whole wire: {I} A. Part of the emf drives that current through the cells themselves, so V = {V} V, {lost} V below E.",
  "experiments.ohms-law.exam.q.constantan":
    "Why is a potentiometer wire made of constantan and not copper?",
  "experiments.ohms-law.exam.a.constantan":
    "Constantan's resistance hardly changes as it warms, so the wire's resistance stays the same while current flows. Its resistivity is also high, so a metre of wire has a useful resistance.",
  "experiments.ohms-law.explain.title": "Why the voltmeter reading falls",
  "experiments.ohms-law.explain.text":
    "The cell's emf E drives the current round the circuit and through the cell itself. The cell has its own resistance r, which uses up part of E as the current passes, so the p.d. across its terminals is less.",
  "experiments.ohms-law.explain.graph":
    "Rearranged, I = (E − V) ⁄ r. A graph of I against V is a straight line with slope −1 ⁄ r, and it meets the V axis at E, where no current flows.",
  "experiments.ohms-law.explain.V": "terminal p.d., across the cell · V · the voltmeter",
  "experiments.ohms-law.explain.E": "emf of the cell · V · where the line meets the V axis",
  "experiments.ohms-law.explain.I": "current in the circuit · A · the ammeter",
  "experiments.ohms-law.explain.r": "internal resistance of the cell · Ω · from the slope",
  "experiments.ohms-law.tips.title": "Precautions examiners look for",
  "experiments.ohms-law.tips.1":
    "I opened the key as soon as each reading was taken, so the cell did not run down.",
  "experiments.ohms-law.tips.2": "I avoided short circuits.",
  "experiments.ohms-law.tips.3": "I made sure all connections were tight.",
  "experiments.ohms-law.tips.4": "I did not slide the jockey along the wire.",
  "experiments.ohms-law.tips.5": "I read the meters with my eye directly in front of the needle.",
  "lab.ohmsLaw.refused.same-terminal": "A lead needs two different terminals.",
  "lab.ohmsLaw.refused.lead-exists": "Those two terminals are already joined.",
  "lab.ohmsLaw.refused.no-such-lead": "There is no lead there to remove.",
  "lab.ohmsLaw.refused.key-already-closed": "The key is already closed.",
  "lab.ohmsLaw.refused.key-already-open": "The key is already open.",
  "lab.ohmsLaw.refused.off-the-wire": "The jockey must touch the wire, between P and Q.",
  "lab.ohmsLaw.refused.jockey-not-pressed": "The jockey is not on the wire.",
  "lab.ohmsLaw.refused.jockey-already-pressed":
    "Lift the jockey before you press it somewhere else.",
  "lab.ohmsLaw.unsafe.short-circuit":
    "The key will not close: a lead joins the cell's terminals directly, which would short-circuit it.",
  "lab.ohmsLaw.unsafe.ammeter-over-range":
    "The key will not close: the current would push the ammeter past its 1 A full scale.",
  "lab.ohmsLaw.unsafe.voltmeter-over-range":
    "The key will not close: the voltage would push the voltmeter past its 3 V full scale.",
  // The model check (data templates brief, decision 4).
  "experiments.ohms-law.check.note":
    "Leave PJ empty for the reading with the jockey off the wire. Read the ammeter and the voltmeter twice at each position.",
  "experiments.ohms-law.check.marked": "Marked e.m.f. of the cells E",
  "experiments.ohms-law.check.template.body":
    "Fill it in during your lab. The positions are set as the book has them, with the first row for the reading with the jockey off the wire; read I and V twice at each. Add the e.m.f. marked on your cells if you know it.",
  "experiments.ohms-law.check.table.note":
    "I and V are worked out here as the means of your two readings of each.",
  "experiments.ohms-law.check.graph.title": "Fig. 1  I against V: your readings and your line",
  "experiments.ohms-law.check.graph.label":
    "{n} readings of I against V, and your best line through them, out to where it meets the V axis.",
  "experiments.ohms-law.check.shift.on":
    "Your line meets the V axis at the e.m.f. marked on the cells, within its error.",
  "experiments.ohms-law.check.shift.unmarked":
    "Add the e.m.f. marked on your cells to compare E with it.",
  "experiments.ohms-law.check.shift.found.below":
    "Your line meets the V axis below the e.m.f. marked on the cells.",
  "experiments.ohms-law.check.shift.found.above":
    "Your line meets the V axis above the e.m.f. marked on the cells.",
  "experiments.ohms-law.check.shift.figure": "E = {E} V, marked {marked} V, {errors} errors",
  "experiments.ohms-law.check.shift.figure.unmarked": "E = {E} V",
  "experiments.ohms-law.check.spread.on":
    "Your points spread as much as the meters' least counts give, no more.",
  "experiments.ohms-law.check.spread.found":
    "Your points spread {times} times more than the meters' least counts give.",
  "experiments.ohms-law.check.spread.figure": "{value} A, {ratio} ×",
  "experiments.ohms-law.check.shift.below":
    "Your line gives E = {E} V, below the {marked} V marked on the cells. Cells that have been used a lot give less than their marking, and a voltmeter that reads low from a zero error moves the whole line to the left.",
  "experiments.ohms-law.check.shift.above":
    "Your line gives E = {E} V, above the {marked} V marked on the cells. New dry cells often give a little more than their marking, and a voltmeter that reads high from a zero error moves the whole line to the right.",
  "experiments.ohms-law.check.shift.precaution":
    "Check that both meters read zero before you connect them.",
  "experiments.ohms-law.check.spread":
    "Your points spread either side of your line by about {times} times what the meters' least counts give.",
  "experiments.ohms-law.check.spread.precaution":
    "Read the ammeter and the voltmeter square-on with their needles still, and open the key as soon as each reading is taken, so the cell does not run down.",
  "experiments.ohms-law.check.result":
    "From your line: E = {E} V and r = {r} Ω. Lab data is not marked.",
  "experiments.ohms-law.check.result.none":
    "Your line does not slope down, so it gives no E or r. Lab data is not marked.",
} as const;
