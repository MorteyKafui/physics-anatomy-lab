/**
 * English (en-GB) messages for the experiment pages (/experiments and /experiments/<id>;
 * docs/content/experiment-pages-brief.md and design/mockups/ExperimentPage.dc.html). Kept apart
 * so the lab does not download them; the pages register them by importing "@pa/i18n/catalogue".
 * The model cards are physics statements and need a physics reviewer's approval (AGENTS.md
 * rule 1). Copy follows AGENTS.md rule 6.
 */
export const enGBCatalogue = {
  "catalogue.title": "Practicals",
  "catalogue.lede":
    "Six labs from the WASSCE and university practical lists, each running the real equations. Open one and start: no sign-up.",
  "catalogue.label": "Every experiment",
  "catalogue.breadcrumb": "Breadcrumb",
  "catalogue.version": "version {version}",
  "catalogue.open": "Open the lab",
  "catalogue.check": "Check your own lab data",
  "catalogue.sheets": "Print sheets",
  "catalogue.exam": "Exam mode",
  "catalogue.free": "Free, no sign-up. Works offline once opened.",
  "catalogue.apparatus": "Apparatus",
  "catalogue.catches": "What the coach catches",
  "catalogue.physics": "The physics",
  "catalogue.finds": "You find {quantity}.",
  "catalogue.model": "Model card",
  "catalogue.model.how": "How it is worked out:",
  "catalogue.model.assumes": "It assumes:",
  "catalogue.model.limits": "Its limits:",
  "catalogue.model.validated": "How it is checked:",
  "catalogue.cite": "Cite this experiment",
  "catalogue.cite.copy": "Copy the citation",
  "catalogue.cite.copied": "Copied",
  "catalogue.sibling": "The other method:",
  "catalogue.more": "More experiments",
  "catalogue.figure": "An isometric drawing of the {experiment} apparatus.",

  "catalogue.topic.mechanics": "Mechanics",
  "catalogue.topic.electricity": "Electricity",
  "catalogue.topic.light": "Light",
  "catalogue.topic.heat": "Heat",
  "catalogue.topic.waves": "Waves and sound",
  "catalogue.topic.measurement": "Measurement",
  "catalogue.topic.modern": "Modern physics",

  "catalogue.teaches.simple-pendulum": "g, the acceleration due to gravity",
  "catalogue.teaches.ohms-law": "the emf E and the internal resistance r of a cell",
  "catalogue.teaches.converging-lens": "the focal length f of a converging lens",
  "catalogue.teaches.converging-lens-pins": "the focal length f of a converging lens",
  "catalogue.teaches.method-of-mixtures": "the water equivalent of a calorimeter",
  "catalogue.teaches.method-of-mixtures-solid": "the specific heat capacity of a metal",

  "catalogue.rule.pendulum-count-from-one": "Counting the first pass as one",
  "catalogue.rule.pendulum-stopped-early": "Stopping the stopwatch early",
  "catalogue.rule.pendulum-thread-on-clamp":
    "The thread tied round the clamp, not held in the cork",
  "catalogue.rule.ohms-law-key-left-closed": "Leaving the key closed, so the cells run down",
  "catalogue.rule.ohms-law-jockey-slid": "Sliding the jockey along the wire",
  "catalogue.rule.lens-read-from-edge": "Reading a holder from its edge, not its centre mark",
  "catalogue.rule.lens-not-coaxial": "The object and the lens not on one axis",
  "catalogue.rule.lens-blurred-image": "Taking a blurred image as sharp",
  "catalogue.rule.lens-inside-focal-length": "An object inside the focal length",
  "catalogue.rule.lens-scale-at-angle": "Reading the rule at an angle",
  "catalogue.rule.pins-eye-off-axis": "Looking from off the axis",
  "catalogue.rule.pins-tips-off-axis": "Pin tips not level with the centre of the lens",
  "catalogue.rule.pins-parallax-left": "Stopping before the parallax has gone",
  "catalogue.rule.pins-read-from-edge": "Reading a holder from its edge, not its centre mark",
  "catalogue.rule.mixtures-read-before-peak": "Reading before the temperature stops rising",
  "catalogue.rule.mixtures-not-stirred": "Not stirring",
  "catalogue.rule.mixtures-not-covered": "Leaving the lid off",
  "catalogue.rule.mixtures-slow-pour": "Waiting too long before pouring",
  "catalogue.rule.mixtures-thermometer-at-angle": "Reading the thermometer at an angle",
  "catalogue.rule.mixtures-cylinder-at-angle": "Reading the measuring cylinder at an angle",
  "catalogue.rule.solid-read-before-peak": "Stopping before the highest temperature",
  "catalogue.rule.solid-slow-transfer": "Moving the solid across too slowly",
  "catalogue.rule.solid-water-carried": "Carrying boiling water across with the solid",
  "catalogue.rule.solid-splashed": "Splashing water out as the solid goes in",
  "catalogue.rule.solid-not-stirred": "Not stirring",
  "catalogue.rule.solid-not-covered": "Leaving the lid off",
  "catalogue.rule.solid-thermometer-at-angle": "Reading the thermometer at an angle",

  "catalogue.model.simple-pendulum.how":
    "The period is worked out exactly for the swing the bench is given, with the arithmetic–geometric mean, not with the small-angle formula.",
  "catalogue.model.simple-pendulum.assumes":
    "A simple pendulum: the bob's mass at its centre, a thread that neither stretches nor weighs anything, a fixed pivot and no air resistance.",
  "catalogue.model.simple-pendulum.limits":
    "The bench swings through {deg}°, where the exact period is {percent}% longer than 2π √(l ⁄ g). The bob's swing on screen is drawn as the small-angle motion, with the exact period.",
  "catalogue.model.simple-pendulum.validated":
    "On every change, against an independent Python model that uses SciPy's complete elliptic integral.",

  "catalogue.model.ohms-law.how":
    "Whatever is wired on the bench is solved as a direct-current network by nodal analysis: the cells with their internal resistance, the resistor, the potentiometer wire, the meters' own resistances and the key.",
  "catalogue.model.ohms-law.assumes":
    "Ideal leads and a uniform wire. Each bench's cells, resistor and wire differ a little from their marked values, as real ones do, and the cells polarise while the key is closed.",
  "catalogue.model.ohms-law.limits":
    "How fast the cells polarise is an assumed value until reference measurements from a UEW laboratory replace it.",
  "catalogue.model.ohms-law.validated":
    "On every change, against an independent Python model that solves the same circuits by modified nodal analysis with NumPy.",

  "catalogue.model.converging-lens.how":
    "The lens is traced ray by ray with Snell's law, so the image forms where the rays really cross, with the blur a real lens has. The thin-lens formula is used only to check the answer.",
  "catalogue.model.converging-lens.assumes":
    "A biconvex glass lens of refractive index {index}, {aperture} cm across, of focal length near {f} cm: each bench's lens differs a little, as real ones do.",
  "catalogue.model.converging-lens.limits":
    "How small a blur still looks sharp to the eye is an assumed value until reference measurements from a UEW laboratory replace it.",
  "catalogue.model.converging-lens.validated":
    "On every change, against independent Python models: paraxial ray-transfer matrices, and a three-dimensional ray trace with Snell's law.",

  "catalogue.model.converging-lens-pins.how":
    "The parallax between the search pin and the image is worked out by tracing the ray from the object pin through the real lens to the eye, as the eye moves from side to side.",
  "catalogue.model.converging-lens-pins.assumes":
    "The eye {eye} cm behind the image, the head moving {head} cm either side, and two points seen apart when they are more than {arcmin} minute of arc apart. The lens is the screen method's lens.",
  "catalogue.model.converging-lens-pins.limits":
    "How far the head moves and how finely the eye sees are assumed values until reference measurements from a UEW laboratory replace them.",
  "catalogue.model.converging-lens-pins.validated":
    "On every change, against an independent Python model that finds the ray to the eye in three dimensions with Snell's law.",

  "catalogue.model.method-of-mixtures.how":
    "A lumped heat model: the poured water, the cold water with the calorimeter, and the thermometer each have one temperature. Heat flows between the waters as they mix, to the room by Newton's law of cooling, and into the thermometer with a lag.",
  "catalogue.model.method-of-mixtures.assumes":
    "The room and the tap water at {room} °C, the hot water heated to {hot} °C, and the copper calorimeter and stirrer always at the temperature of the water around them.",
  "catalogue.model.method-of-mixtures.limits":
    "How fast heat is lost, how fast the waters mix and how slowly the thermometer follows are assumed values until reference measurements from a UEW laboratory replace them.",
  "catalogue.model.method-of-mixtures.validated":
    "On every change, against an independent Python model that integrates the same heat flows with SciPy.",

  "catalogue.model.method-of-mixtures-solid.how":
    "The same lumped heat model, with a hot solid in place of the hot water: the solid, and the film of boiling water it carries in with it, give heat to the water and the calorimeter.",
  "catalogue.model.method-of-mixtures-solid.assumes":
    "Each attempt's solid is one of {metals} metals, named only once the student has found c. It comes out of boiling water, and the calorimeter and stirrer are always at the temperature of the water around them.",
  "catalogue.model.method-of-mixtures-solid.limits":
    "How fast heat is lost, how fast the water mixes and how slowly the thermometer follows are assumed values until reference measurements from a UEW laboratory replace them.",
  "catalogue.model.method-of-mixtures-solid.validated":
    "On every change, against an independent Python model that integrates the same heat flows with SciPy.",

  // The practicals page (/experiments; design/mockups/Practicals.dc.html). Each badge is filled
  // with a reading the lab's own model gives (AGENTS.md rule 1).
  "practicals.lede":
    "The first six practicals from the WASSCE and university lists. Each one is the real apparatus, running the real equations. Open one and start: no sign-up.",
  "practicals.filter": "Filter by topic",
  "practicals.all": "All",
  "practicals.label": "Every practical",
  "practicals.apparatus": "Apparatus:",
  "practicals.open": "Open the lab",
  "practicals.about": "About this practical",
  "practicals.teachers":
    "Teachers: every practical has its own link. Send it to your class or put it on the projector.",
  "practicals.badge.simple-pendulum": "T = {value} s",
  "practicals.badge.ohms-law": "E = {value} V",
  "practicals.badge.converging-lens": "v = {value} cm",
  "practicals.badge.converging-lens-pins": "f = {value} cm",
  "practicals.badge.method-of-mixtures": "θ = {value} °C",
  "practicals.badge.method-of-mixtures-solid": "θ = {value} °C",
  "practicals.figure.simple-pendulum":
    "A pendulum on its retort stand: base plate, rod, boss and clamp, split cork, thread, bob and stopwatch.",
  "practicals.figure.ohms-law":
    "A circuit board with a cell, key, rheostat, ammeter, voltmeter and a resistor, with current flowing along the wires.",
  "practicals.figure.converging-lens":
    "An optical bench with an illuminated object, a converging lens and a screen, with rays forming an inverted image.",
  "practicals.figure.converging-lens-pins":
    "An object pin, a converging lens and a search pin on a metre rule, the search pin's tip at the tip of the inverted image.",
  "practicals.figure.method-of-mixtures":
    "A calorimeter taken apart: outer can, lagging, copper calorimeter, hot water, and a lid with stirrer and thermometer.",
  "practicals.figure.method-of-mixtures-solid":
    "A solid on a thread lifted from a beaker of boiling water on a tripod, on its way to a lagged calorimeter with a thermometer and stirrer.",
  "practicals.nav.main": "Main",
  "practicals.nav.practicals": "Practicals",
  "practicals.nav.howItWorks": "How it works",
  "practicals.nav.about": "About",
  "practicals.footer.made": "© {year} Physics Anatomy. Made in Winneba, Ghana.",
} as const;
