/**
 * English (en-GB) messages for the landing page (design/mockups/Main.dc.html;
 * docs/content/landing-page-brief.md). Kept apart from the shared file so the lab does not
 * download them; the landing page registers them by importing "@pa/i18n/landing". Copy follows
 * AGENTS.md rule 6.
 */
export const enGBLanding = {
  "landing.skip": "Skip to the content",
  "landing.home": "Physics Anatomy, home",
  "landing.menu": "Menu",
  "landing.nav.main": "Main",
  "landing.nav.small": "Main, small screens",
  "landing.signUp": "Sign up free",

  "landing.hero.label": "Introduction",
  "landing.hero.title1": "Physics from",
  "landing.hero.title2": "first principles.",
  "landing.hero.lede":
    "Build real experiments piece by piece, take your own readings, and get coached the moment something goes wrong. A full physics lab in your browser, even offline.",
  "landing.hero.start": "Start an experiment",
  "landing.scene.twoSlits.aria":
    "Particles landing one at a time behind two slits, building interference stripes.",
  "landing.scene.detector.aria":
    "Particles landing with a which-slit detector on: one broad band, no stripes.",
  "landing.scene.oneSlit.aria":
    "Particles landing behind one slit: a wide central band with faint side bands.",
  "landing.scene.fourSlits.aria":
    "Particles landing behind four slits: narrow, sharp bright stripes.",

  "landing.nav.howItWorks": "How it works",

  "landing.timeIt.label": "Time a pendulum",
  "landing.timeIt.title": "Time it yourself.",
  "landing.timeIt.lede":
    "Pull the bob aside and let it go. The period and your value of g come from the same equations the lab runs. Now start the count at one instead of zero, and watch what happens to g.",
  "landing.timeIt.wassce":
    "A common mistake in the WASSCE pendulum practical. The coach catches it every time.",
  "landing.timeIt.figure": "Fig. 1 · Drag the bob, then let go",
  "landing.timeIt.canvas":
    "A pendulum you can pull aside and let go. With the keyboard, the left and right arrows pull it and Enter lets it go.",
  "landing.timeIt.valueText": "Swinging through {deg}°",
  "landing.timeIt.swing": "Swing",
  "landing.timeIt.period": "Period T",
  "landing.timeIt.g": "Your g",
  "landing.timeIt.countFrom": "Start the count at",
  "landing.timeIt.zero": "zero",
  "landing.timeIt.one": "one",
  "landing.timeIt.coach": "Coach:",
  "landing.timeIt.coach.fromOne":
    "You started the count at one, so you timed {timed} swings and divided by {swings}. Your g is about {percent}% too high. Start the count at zero.",
  "landing.timeIt.coach.wide":
    "That swing is {deg}°. Above about {limit}° the period grows, so g comes out low. Pull it back less.",
  "landing.timeIt.coach.good": "Good timing. Your g is within {percent}% of the accepted value.",

  "landing.anatomy.label": "Take the apparatus apart",
  "landing.anatomy.title": "Every part has a job. Learn what it is.",
  "landing.anatomy.lede":
    "Pull the apparatus apart, point at any piece, and find out what it does and how it can spoil your result. Then put it back together yourself.",
  "landing.anatomy.figure":
    "Isometric exploded view of a pendulum apparatus: base plate, retort stand rod, boss and clamp, split cork, thread, bob and stopwatch. Point at a part, or choose it in the list, to learn what it does.",
  "landing.anatomy.assembled": "Assembled",
  "landing.anatomy.apart": "Apart",
  "landing.anatomy.valueText": "{percent}% apart",
  "landing.anatomy.base": "Base plate",
  "landing.anatomy.base.note": "Heavy, so the stand cannot rock and add a swing of its own.",
  "landing.anatomy.rod": "Retort stand rod",
  "landing.anatomy.rod.note": "Holds the pivot at a fixed height above the bench.",
  "landing.anatomy.clamp": "Boss and clamp",
  "landing.anatomy.clamp.note":
    "Sets the height of the pivot. Tighten it before you measure anything.",
  "landing.anatomy.cork": "Split cork",
  "landing.anatomy.cork.note":
    "Grips the thread so the pivot cannot move. Tie the thread round the rod instead and your length is wrong.",
  "landing.anatomy.thread": "Thread",
  "landing.anatomy.thread.note":
    "Light and does not stretch. The length l runs from the cork to the centre of the bob.",
  "landing.anatomy.bob": "Bob",
  "landing.anatomy.bob.note":
    "A small, dense sphere. Its centre, not its top, is where the length ends.",
  "landing.anatomy.watch": "Stopwatch",
  "landing.anatomy.watch.note":
    "Reads to {leastCount} s, but your reaction time is about {reaction} s. That is why you time {swings} swings.",

  "landing.coach.label": "The coach",
  "landing.coach.title": "Caught the moment it happens.",
  "landing.coach.lede":
    "The coach watches every reading you take and every number you write down. It lets you make the mistake, shows you what it did to your result, and explains why, from first principles. Turn the voice on and it talks you through while your hands are busy.",
  "landing.coach.chip.voice": "Spoken steps and corrections",
  "landing.coach.chip.levels": "Auto, Check my work, On my own",
  "landing.coach.chip.exam": "Exam mode, coach off",
  "landing.coach.window": "Simple pendulum · Tabulate",
  "landing.coach.record": "Record reading",
  "landing.coach.figure":
    "A results table being filled in. The student writes a mean time of {slip} s; the coach points out that a mean takes one more decimal place than its readings, and it becomes {fixed} s.",

  "landing.nav.experiments": "Experiments",
  "landing.nav.research": "For researchers",
  "landing.cards.label": "Experiments",
  "landing.cards.title": "Four experiments, built deep.",
  "landing.cards.lede":
    "Each one runs the real equations. Point at any part to see what it does. The readings on each card come straight from the simulation.",
  "landing.cards.open": "Open the lab",
  "landing.cards.more":
    "More experiments from the WASSCE and university practical lists are on the way.",
  "landing.cards.live": "Live from the simulation",
  "landing.cards.plot": "Plot",
  "landing.cards.pendulum.topic": "Mechanics",
  "landing.cards.pendulum.title": "Simple pendulum",
  "landing.cards.pendulum.about":
    "Time 20 swings at six lengths, plot T² against l, and find g from the slope.",
  "landing.cards.pendulum.figure":
    "A 3D bar chart of the pendulum's {what} at six lengths, standing on stacked plates. Point at a bar for its values.",
  "landing.cards.circuit.topic": "Electricity",
  "landing.cards.circuit.title": "Ohm's law and the potentiometer",
  "landing.cards.circuit.about":
    "Press the jockey at {positions} points along the wire, read I and V, and find the cells' emf and internal resistance from the graph.",
  "landing.cards.circuit.figure":
    "An isometric circuit: cells, a key, a potentiometer wire, a resistor, an ammeter and a voltmeter. Point at a part to learn what it does.",
  "landing.cards.circuit.tip.cell": "Cells",
  "landing.cards.circuit.tip.cell.note":
    "Two cells in series. Part of their emf drives the current through the cells themselves.",
  "landing.cards.circuit.tip.key": "Key",
  "landing.cards.circuit.tip.key.note":
    "Open it as soon as each reading is taken, or the cells run down.",
  "landing.cards.circuit.tip.rheo": "Potentiometer wire",
  "landing.cards.circuit.tip.rheo.note": "Pressing the jockey along it changes the current I.",
  "landing.cards.circuit.tip.res": "Resistor R, {R} Ω",
  "landing.cards.circuit.tip.res.note": "It keeps the current within the ammeter's range.",
  "landing.cards.circuit.tip.amm": "Ammeter",
  "landing.cards.circuit.tip.amm.note": "In series with the cells. Reads the current I.",
  "landing.cards.circuit.tip.volt": "Voltmeter",
  "landing.cards.circuit.tip.volt.note": "Across the cells, so it reads their terminal p.d. V.",
  "landing.cards.lens.topic": "Light",
  "landing.cards.lens.title": "Converging lens",
  "landing.cards.lens.about":
    "Move the screen until the image is sharp, or line up two pins with no parallax, then find f from u and v.",
  "landing.cards.lens.figure":
    "An isometric optical bench: an illuminated object, a converging lens, a screen and a metre rule, with rays through the lens. Point at a part to learn what it does.",
  "landing.cards.lens.tip.obj": "Illuminated object",
  "landing.cards.lens.tip.obj.note": "Its distance from the lens is u.",
  "landing.cards.lens.tip.lens": "Converging lens, f = {f} cm",
  "landing.cards.lens.tip.lens.note":
    "A ray through the centre goes straight on. A ray parallel to the axis passes through F.",
  "landing.cards.lens.tip.screen": "Screen",
  "landing.cards.lens.tip.screen.note":
    "Move it until the image is sharp. Its distance from the lens is v.",
  "landing.cards.lens.tip.rule": "Metre rule",
  "landing.cards.lens.tip.rule.note": "Read u and v from the centre of the lens.",
  "landing.cards.mixtures.topic": "Heat",
  "landing.cards.mixtures.title": "Method of mixtures",
  "landing.cards.mixtures.about":
    "Mix hot water into cold and find the calorimeter's water equivalent, or drop in a hot solid and find its specific heat capacity.",
  "landing.cards.mixtures.figure":
    "An exploded calorimeter: outer can, lagging, copper calorimeter, hot and cold water, and the lid with its stirrer and thermometer. Point at a part to learn what it does.",
  "landing.cards.mixtures.tip.can": "Outer can",
  "landing.cards.mixtures.tip.can.note": "The air gap and lagging cut heat lost to the room.",
  "landing.cards.mixtures.tip.lag": "Lagging",
  "landing.cards.mixtures.tip.lag.note": "Felt or cotton wool: a poor conductor of heat.",
  "landing.cards.mixtures.tip.cal": "Copper calorimeter, {kg} kg",
  "landing.cards.mixtures.tip.cal.note":
    "It warms up too, so its heat capacity goes into the calculation.",
  "landing.cards.mixtures.tip.water": "Hot meets cold",
  "landing.cards.mixtures.tip.water.note":
    "Heat lost by the hot water = heat gained by the cold water and the calorimeter.",
  "landing.cards.mixtures.tip.lid": "Lid, stirrer, thermometer",
  "landing.cards.mixtures.tip.lid.note": "Stir, then read the highest steady temperature.",

  "landing.bento.label": "Features",
  "landing.bento.title": "Everything a real lab gives you. Plus a teacher who never gets tired.",
  "landing.bento.voice": "Hear the coach",
  "landing.bento.voice.about":
    "Every step and every correction read aloud, with the words on screen. Count along while you time 20 swings.",
  "landing.bento.offline": "Works offline",
  "landing.bento.offline.about":
    "Install it once. The lab, sounds and print sheets keep working when the network doesn't.",
  "landing.bento.online": "Online: your work syncs",
  "landing.bento.offlineNow": "Offline: your work is kept on this device",
  "landing.bento.snapshots": "Snapshots, labelled",
  "landing.bento.snapshots.about":
    "Capture any moment. Every image you export carries its figure number, caption and our mark.",
  "landing.bento.snapshots.fig": "Fig. 3",
  "landing.bento.snapshots.caption": "Set-up",
  "landing.bento.exam": "Exam mode",
  "landing.bento.exam.about":
    "The coach goes quiet, a countdown runs, and your script is marked the way practicals are marked: tabulation, graph, slope and precautions.",
  "landing.bento.exam.time": "The pendulum paper allows {minutes} minutes.",
  "landing.bento.results": "Take your results with you",
  "landing.bento.results.about":
    "Download the graph in colour or black and white, the table as CSV or Excel, and the whole report as PDF. Every file keeps its labels and units.",
  "landing.bento.results.graph":
    "{colour} graph of T² against l for six lengths, with the line of best fit and a slope triangle. Slope {slope} s² m⁻¹ gives g = {g} m s⁻².",
  "landing.bento.colours": "Graph colours",
  "landing.bento.colour": "Colour",
  "landing.bento.mono": "Black and white",

  "landing.footer.label": "Site",
  "landing.footer.tagline": "Physics from first principles.",
  "landing.footer.product": "Product",
  "landing.footer.experiments": "Start an experiment",
  "landing.footer.teachers": "For teachers",
  "landing.footer.account": "Your account",
  "landing.footer.copyright": "© {year} Physics Anatomy.",
  "landing.status.checking": "Checking the server",
  "landing.status.ok": "All systems normal",
  "landing.status.down": "Can't reach the server: the lab still works offline",
} as const;
