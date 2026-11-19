/**
 * English (en-GB) messages for consent, Your data and deleting
 * (design/mockups/Privacy.dc.html, ADR 0042). Registered by importing "@pa/i18n/privacy" on those
 * pages only. Copy follows AGENTS.md rule 6.
 */
export const enGBPrivacy = {
  "privacy.title": "Your data",
  "privacy.intro": "Everything we keep about you, and what you've agreed to.",
  "privacy.signedOut": "Sign in to see your data. Work you do signed out stays on this device.",
  "privacy.back": "Back",

  "privacy.download.title": "Download your data",
  "privacy.download.body":
    "One file with your account and every attempt. You can open each attempt in the lab on any device.",
  "privacy.download.button": "Download",
  "privacy.download.busy": "Getting your data…",

  "privacy.agreed.title": "What you've agreed to",
  "privacy.agreed.body":
    "Terms of Use and Privacy Policy, version {version}, when you first signed in.",
  "privacy.agreed.bodyStudent":
    "Terms of Use and Privacy Policy, version {version}, when you joined your class.",
  "privacy.analytics.label": "Count my visits to help improve the site",
  "privacy.analytics.note": "Teachers only. Students are never counted.",

  "privacy.delete.title": "Delete your account",
  "privacy.delete.body":
    "Deletes your classes, your students and all their work. This can't be undone.",
  "privacy.delete.link": "Delete your account…",
  "privacy.leave.title": "Delete your work",
  "privacy.leave.body":
    "Deletes all your work and takes you out of the class. This can't be undone.",
  "privacy.leave.link": "Delete your work…",

  "privacy.choice.title": "Help us improve Physics Anatomy?",
  "privacy.choice.body":
    "We'd like to count a few things you do, such as which pages you open, to see what to fix. We never count anything your students do.",
  "privacy.choice.body2":
    "It's off unless you turn it on, and you can change your mind in Your data at any time.",
  "privacy.choice.yes": "Yes, count my visits",
  "privacy.choice.no": "No thanks",

  "privacy.notice.title": "We're changing our terms",
  "privacy.notice.titleNow": "Our terms have changed",
  "privacy.notice.body": "A new version of the {document} applies from **{date}**.",
  "privacy.notice.bodyNow": "A new version of the {document} applies now. Please agree to it.",
  "privacy.notice.agree": "I agree to the new {document}",
  "privacy.notice.carryOn": "Carry on",
  "privacy.notice.later": "You can close this and carry on until the date.",
  "privacy.notice.close": "Not now",

  "privacy.deleteAccount.title": "Delete your account?",
  "privacy.deleteAccount.lead": "This deletes, straight away and for good:",
  "privacy.deleteAccount.own": "your account and your own attempts",
  "privacy.deleteAccount.classes":
    "your **{classes}** and the **{students}** in them, with all their work",
  "privacy.deleteAccount.signedOut":
    "Your students will be signed out. Work already on their devices stays there.",
  "privacy.deleteAccount.downloadFirst": "Download your data first",
  "privacy.deleteAccount.confirm": "Type your email to confirm",
  "privacy.deleteAccount.recent":
    "If you signed in more than an hour ago, we'll ask you to sign in again first.",
  "privacy.deleteAccount.go": "Delete my account",
  "privacy.deleteAccount.keep": "Keep my account",
  "privacy.deleteAccount.done": "Your account has been deleted.",

  "privacy.count.classes.one": "{count} class",
  "privacy.count.classes.other": "{count} classes",
  "privacy.count.students.one": "{count} student",
  "privacy.count.students.other": "{count} students",

  "privacy.leaveClass.inClass": "You're in **{className}** as **{name}**",
  "privacy.leaveClass.title": "Delete your work?",
  "privacy.leaveClass.body":
    "This deletes all your work from your account and takes you out of the class, straight away and for good. Your teacher won't see it any more.",
  "privacy.leaveClass.body2":
    "Work already on this device stays on it. You can join the class again with its code, starting fresh.",
  "privacy.leaveClass.downloadFirst": "Download your work first",
  "privacy.leaveClass.confirm": "Type your display name to confirm",
  "privacy.leaveClass.go": "Delete my work",
  "privacy.leaveClass.keep": "Keep my work",
  "privacy.leaveClass.done": "Your work has been deleted and you've left the class.",

  "privacy.student.title": "{name}'s data",
  "privacy.student.for": "For when the student or their parent asks.",
  "privacy.student.download.title": "Download their work",
  "privacy.student.download.body":
    "One file with their display name, class and every attempt. Give it only to the student or their parent.",
  "privacy.student.remove.title": "Remove from the class",
  "privacy.student.remove.body":
    "Deletes their work for good and signs them out. They can join again with the class code, starting fresh.",
  "privacy.student.remove.link": "Remove {name}…",
  "privacy.student.remove.ask": "Remove {name} and delete their work?",
  "privacy.student.remove.warn": "This can't be undone. Download their work first if it's needed.",
  "privacy.student.remove.go": "Remove",
  "privacy.student.remove.cancel": "Cancel",
  "privacy.student.removed": "{name} has been removed and their work deleted.",
  "privacy.students.title": "Students",
  "privacy.students.none": "No one has joined this class yet.",
  "privacy.students.open": "Their data",

  "privacy.deleteClass.title": "Delete {className}?",
  "privacy.deleteClass.body":
    "This deletes, straight away and for good, the class and the **{students}** in it, with all their work. They'll be signed out. Your other classes stay.",
  "privacy.deleteClass.downloadFirst": "Download each student's work first",
  "privacy.deleteClass.confirm": "Type the class's name to confirm",
  "privacy.deleteClass.go": "Delete the class",
  "privacy.deleteClass.keep": "Keep the class",
  "privacy.deleteClass.done": "{className} has been deleted.",
  "privacy.deleteClass.link": "Delete class",
  "privacy.done.home": "Go to the lab",
  "privacy.done.classes": "Back to your classes",
  "privacy.done.students": "Back to the students",
  "privacy.notFound": "We couldn't find that. It may have been deleted already.",
} as const;
