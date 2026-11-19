/**
 * English (en-GB) messages for the teacher's screens: classes and the live class board
 * (design/mockups/Teacher.dc.html). Kept apart from the shared file so students' devices do not
 * download them; the teacher pages register them by importing "@pa/i18n/teach". Copy follows
 * AGENTS.md rule 6.
 */
export const enGBTeach = {
  "teach.nav.app": "App",
  "teach.nav.home": "Home",
  "teach.nav.classes": "Classes",
  "teach.nav.experiments": "Experiments",

  "teach.crumb.classes": "Classes",
  "teach.live.badge": "Live, {minutes} min",
  "teach.live.code": "Class code",
  "teach.example": "Example class",
  "teach.example.note": "Example data. Nothing here is a real class.",
  "teach.lock": "Lock steps",
  "teach.locked": "Steps locked",
  "teach.broadcast": "Broadcast an instruction",
  "teach.end": "End live class",

  "teach.tile.here": "Here now",
  "teach.tile.now": "Now",
  "teach.tile.here.offline":
    "{count} joined but went offline. Their work is saved on their devices.",
  "teach.tile.here.allHere": "Everyone who joined is here.",
  "teach.tile.help": "Need help",
  "teach.tile.help.most": "Most: {mistake}. See the list on the right.",
  "teach.tile.help.none": "No one needs help now.",
  "teach.tile.measured": "Finished measuring",
  "teach.tile.measured.of": "of {count}",
  "teach.tile.left": "Lesson time left",
  "teach.tile.left.of": "of {minutes} min",
  "teach.tile.left.pace": "At this pace, about {count} of {of} will reach the graph.",
  "teach.tile.left.early": "Too early to tell the pace.",
  "teach.tile.left.over": "The lesson time is over.",

  "teach.benches": "Benches",
  "teach.benches.hint": "Needs help first. Select a bench to see it.",
  "teach.benches.show": "Show",
  "teach.benches.all": "All",
  "teach.benches.help": "Need help",
  "teach.benches.onTrack": "On track",
  "teach.benches.none": "No benches here yet. Students appear when they open the experiment.",
  "teach.bench.onTrack": "On track",
  "teach.bench.hintSent": "Hint sent",
  "teach.bench.offline": "Offline",

  "teach.mistakes": "Mistakes happening now",
  "teach.mistakes.hint": "One hint reaches everyone with the same mistake",
  "teach.mistakes.none": "No mistakes on any bench now.",
  "teach.mistakes.students": "{count} students",
  "teach.mistakes.student": "1 student",
  "teach.mistakes.sentTo": "Hint sent to {count}",
  "teach.mistakes.push": "Push hint",
  "teach.mistakes.sent": "Sent",

  "teach.where": "Where the class is",

  "teach.drawer.step": "Step {n} of 10: {step}",
  "teach.drawer.readings": "Their readings so far",
  "teach.drawer.noReadings": "No readings yet.",
  "teach.drawer.readingsCount": "{count} readings so far.",
  "teach.drawer.coach": "What the coach sees",
  "teach.drawer.coach.none": "The coach has no mistakes to show on this bench.",
  "teach.drawer.sendHint": "Send them the hint",
  "teach.drawer.sendNote": "Send a note",
  "teach.drawer.close": "Close",

  "teach.toast.hint": 'Hint sent to {count}: "{mistake}".',
  "teach.toast.hintOne": 'Hint sent to 1 student: "{mistake}".',
  "teach.toast.hintEveryone": 'Hint sent to everyone with "{mistake}".',
  "teach.toast.locked": "Steps locked. Students stay on their current step until you unlock.",
  "teach.toast.unlocked": "Steps unlocked.",
  "teach.toast.broadcast": "Instruction sent to all {count} students.",
  "teach.toast.note": "Note sent to {name}.",
  "teach.toast.undo": "Undo",
  "teach.toast.undone": "Taken back.",

  "teach.dialog.broadcast.title": "Broadcast an instruction",
  "teach.dialog.broadcast.body": "Every student in the class sees it on their bench.",
  "teach.dialog.note.title": "Send a note to {name}",
  "teach.dialog.note.body": "Only {name} sees it.",
  "teach.dialog.text": "Message",
  "teach.dialog.send": "Send",
  "teach.dialog.cancel": "Cancel",

  "teach.start.title": "No live class is running",
  "teach.start.body": "Start one when the class is ready. Students see it on their benches.",
  "teach.start.experiment": "Experiment",
  "teach.start.minutes": "Lesson length, minutes",
  "teach.start.go": "Start a live class",

  "teach.connection.waiting": "Reconnecting. The board catches up when it is back.",
  "teach.signedOut": "Sign in as a teacher to see your classes.",
  "teach.notFound": "We couldn't find that class.",
  "teach.classes": "Your classes",
  "teach.classes.none": "You have no classes yet.",
  "teach.classes.open": "Open the live board",
  "teach.classes.example": "See an example class",

  // How the board names each mistake, for the teacher. Keyed by the coach rule's id.
  "teach.mistake.pendulum-count-from-one": "Counted the first pass as one",
  "teach.mistake.pendulum-count-from-one.chip": "Counts from one",
  "teach.mistake.pendulum-count-from-one.detail":
    "Their time covers {timed} swings, not {swings}, so g comes out about {percent}% high.",
  "teach.mistake.pendulum-thread-on-clamp": "Thread tied round the clamp",
  "teach.mistake.pendulum-thread-on-clamp.chip": "Thread on the clamp",
  "teach.mistake.pendulum-thread-on-clamp.detail":
    "The thread can slip, so the point it swings from moves and l cannot be measured.",
  "teach.mistake.pendulum-stopped-early": "Stopped timing early",
  "teach.mistake.pendulum-stopped-early.chip": "Stopped early",
  "teach.mistake.pendulum-stopped-early.detail":
    "They stopped the stopwatch before {swings} swings, so T comes out wrong.",
} as const;
