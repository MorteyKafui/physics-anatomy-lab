/**
 * English (en-GB) messages for signing in and joining a class (design/mockups/SignIn.dc.html and
 * Join.dc.html). Kept apart so the lab does not download them; the two screens register them by
 * importing "@pa/i18n/access". Copy follows AGENTS.md rule 6.
 */
export const enGBAccess = {
  "access.signIn.title": "Sign in to teach",
  "access.signIn.lede":
    "For teachers and lecturers. We'll email you a link: no password to remember. Students don't sign in here; they join with your class code.",
  "access.signIn.email": "Your email",
  "access.signIn.emailPlaceholder": "name@school.edu.gh",
  "access.signIn.send": "Email me a sign-in link",
  "access.signIn.sending": "Sending…",
  "access.signIn.or": "or",
  "access.signIn.google": "Continue with Google",
  "access.signIn.noAccount": "You don't need an account to use the lab",
  "access.signIn.noAccount.about":
    "Every experiment works signed out and offline. Sign in to make a class, see your students' work and run live lessons.",
  "access.signIn.badEmail": "Type the email address you use for school.",

  "access.sent.title": "Check your email",
  "access.sent.lede": "We sent a sign-in link to {email}. It works once, for 15 minutes.",
  "access.sent.thisDevice": "Open the link on this device to sign in here.",
  "access.sent.spam": "Nothing after a few minutes? Look in spam or promotions.",
  "access.sent.close": "You can close this page; the link still works.",
  "access.sent.again": "Send another link",
  "access.sent.change": "Use a different email",

  "access.link.checking": "Signing you in…",
  "access.expired.title": "This link has expired",
  "access.expired.lede":
    "Sign-in links work once, for 15 minutes. Ask for a new one and use it straight away.",
  "access.expired.send": "Email me a new link",

  "access.name.title": "You're signed in",
  "access.name.ask": "What should students call you?",
  "access.name.why":
    'Students see this when they join your class: "Set up by your teacher, Mr Mensah."',
  "access.name.label": "Your name for students",
  "access.name.placeholder": "For example, Mr Mensah",
  "access.name.continue": "Continue",
  "access.name.skip": "Skip for now",

  "access.terms.signIn":
    "By signing in you agree to the [Terms of Use](/terms). How we use your email is in the [Privacy Policy](/privacy).",

  "access.join.codeTitle": "Join your class",
  "access.join.codeLede": "Type the class code your teacher gave you.",
  "access.join.code": "Class code from your teacher",
  "access.join.codePlaceholder": "ABC-123",
  "access.join.find": "Find my class",
  "access.join.finding": "Looking…",
  "access.join.title": "You're joining {className}",
  "access.join.teacher": "Set up by your teacher, {teacher}.",
  "access.join.noTeacherName": "Set up by your teacher.",
  "access.join.plain": "Before you start, in plain words",
  "access.join.plain.noDetails": "You don't need your real name, age, email or phone number.",
  "access.join.plain.teacherSees":
    "Your teacher can see your experiments, tables, graphs and reports.",
  "access.join.plain.noMessages": "Nobody can message you here, and there are no public profiles.",
  "access.join.plain.aiOff": "AI help is **off** for this class.",
  "access.join.plain.aiOn":
    "AI help is **on** for this class. What you type to it goes to the AI provider, without your name.",
  "access.join.plain.delete": "You or your parent can ask for your work to be deleted at any time.",
  "access.join.policy": "Read how we look after your data",
  "access.join.name": "Pick a display name",
  "access.join.nameHint": "Any kind name. Don't use your full name or phone number.",
  "access.join.agree":
    "I agree to the [Terms of Use](/terms) and have read how my data is used in the [Privacy Policy](/privacy).",
  "access.join.join": "Join the class",
  "access.join.joining": "Joining…",
  "access.join.needName": "Pick a display name first.",
  "access.join.needAgree": "Tick the box to agree first.",
  "access.join.otherCode": "Use a different code",
  "access.join.noCode": "No code? Start an experiment without an account",
} as const;
