/**
 * English (en-GB) messages for the tutor's Ask tab (design/mockups/AI.dc.html, ADR 0043).
 * Registered by importing "@pa/i18n/tutor" in the tutor panel, which loads only when the Ask
 * tab opens, so the lab does not download them. Copy follows AGENTS.md rule 6.
 */
export const enGBTutor = {
  "lab.tutor.title": "Ask about this step",
  "lab.tutor.intro":
    "The tutor helps with the {step} step. It asks you a question first, and it uses only the numbers on your bench.",
  "lab.tutor.private": "Your questions are not saved, and your teacher does not see them.",
  "lab.tutor.label": "Your question",
  "lab.tutor.placeholder": "Ask about this step",
  "lab.tutor.send": "Send",
  "lab.tutor.stop": "Stop",
  "lab.tutor.writing": "Writing…",
  "lab.tutor.readAloud": "Read aloud",
  "lab.tutor.captions": "Captions are the text above.",
  "lab.tutor.left": "{n} of {total} questions left on this step",
  "lab.tutor.none": "No questions left on this step. The coach's hints still work.",
  "lab.tutor.noReply": "No reply",
  "lab.tutor.hidden": "Answer hidden",
  "lab.tutor.tryAgain": "Try again",
  "lab.tutor.cutShort": "The reply was cut short.",
  "lab.tutor.you": "You",
  "lab.tutor.tutor": "Tutor",
} as const;
