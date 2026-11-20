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
  "landing.hero.behind": "Behind this text: {scene}, one particle at a time",
  "landing.scene.twoSlits": "two slits",
  "landing.scene.detector": "two slits with a detector watching which slit",
  "landing.scene.oneSlit": "a single slit",
  "landing.scene.fourSlits": "four slits",
  "landing.scene.twoSlits.aria":
    "Particles landing one at a time behind two slits, building interference stripes.",
  "landing.scene.detector.aria":
    "Particles landing with a which-slit detector on: one broad band, no stripes.",
  "landing.scene.oneSlit.aria":
    "Particles landing behind one slit: a wide central band with faint side bands.",
  "landing.scene.fourSlits.aria":
    "Particles landing behind four slits: narrow, sharp bright stripes.",

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
