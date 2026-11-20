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
