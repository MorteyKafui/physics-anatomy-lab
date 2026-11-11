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
  "experiments.ohms-law.report.next": "The report for this experiment comes with its next part.",
  "experiments.ohms-law.bench":
    "{state}. The key is {key}. {jockey}. The ammeter reads {current} A and the voltmeter {voltage} V.",
  "experiments.ohms-law.benchWired": "The circuit has {count} leads",
  "experiments.ohms-law.keyOpen": "open",
  "experiments.ohms-law.keyClosed": "closed",
  "experiments.ohms-law.jockeyLifted": "The jockey is lifted",
  "experiments.ohms-law.jockeyPressed": "The jockey is pressed at PJ = {pj} cm",
  "experiments.ohms-law.inDevelopment": "Being built: the report comes next",
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
} as const;
